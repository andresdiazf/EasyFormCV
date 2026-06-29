/**
 * @file api.ts
 * @description Typed HTTP client for the EasyFormCV REST API.
 *
 * All network calls in the frontend should go through this module, which:
 * - Centralizes the base URL (`/api/v1`) so it's easy to change.
 * - Throws descriptive `Error` objects for non-2xx responses.
 * - Provides type-safe request/response signatures via `@easyformcv/shared-schemas`.
 *
 * ### Offline Support
 * The `request()` helper caches the last successful response for each URL
 * in `sessionStorage`. When a subsequent fetch fails (network error or 5xx),
 * the cached value is returned and a console warning is emitted. This keeps
 * the UI functional when the API is temporarily unreachable.
 *
 * @module lib/api
 */

import type {
  CandidateProfile,
  FormField,
  FieldMappingEntry,
  FormMapping,
  AutomationRun,
} from "@easyformcv/shared-schemas";

const API_ORIGIN = ((import.meta as any).env?.VITE_API_URL as string | undefined)
  ?.replace(/\/$/, "") ?? "";
const BASE = `${API_ORIGIN}/api/v1`;

// ── Offline Cache ─────────────────────────────────────────────────────────────

/**
 * Internal cache key prefix stored in `sessionStorage`.
 * Entries are keyed by `"easyformcv:cache:" + absoluteUrl`.
 */
const CACHE_PREFIX = "easyformcv:cache:";

/**
 * Persists a successful response payload in `sessionStorage`.
 * Silently swips `QuotaExceededError` — cache is best-effort.
 *
 * @param url     - The request URL used as the cache key.
 * @param payload - The serialisable response value to store.
 */
function writeCache(url: string, payload: unknown): void {
  try {
    sessionStorage.setItem(CACHE_PREFIX + url, JSON.stringify(payload));
  } catch {
    // QuotaExceededError or SSR environment — ignore
  }
}

/**
 * Reads a previously cached response payload from `sessionStorage`.
 *
 * @param url - The request URL used as the cache key.
 * @returns The cached value, or `null` if nothing is cached.
 */
function readCache<T>(url: string): T | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + url);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

// ── Generic fetch helper ──────────────────────────────────────────────────────

/**
 * Generic HTTP request helper with automatic offline fallback.
 *
 * For `GET` requests the last successful response is cached in `sessionStorage`.
 * If the network request fails, the cache is returned so the UI remains usable
 * without a connection.
 *
 * @template T - The expected shape of the JSON response body.
 * @param url  - Path relative to `/api/v1` (e.g. `"/profile"`).
 * @param init - Optional `RequestInit` options (method, headers, body…).
 * @returns The JSON-parsed response body typed as `T`.
 * @throws {Error} When the request fails AND no cached response is available.
 *
 * @example
 * ```ts
 * const profile = await request<CandidateProfile>("/profile");
 * ```
 */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const fullUrl = `${BASE}${url}`;
  const isGet = !init?.method || init.method.toUpperCase() === "GET";

  try {
    const res = await fetch(fullUrl, {
      headers: { "Content-Type": "application/json", ...init?.headers },
      ...init,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as T;

    // Cache successful GET responses for offline fallback
    if (isGet) writeCache(fullUrl, data);

    return data;
  } catch (err) {
    if (isGet) {
      const cached = readCache<T>(fullUrl);
      if (cached !== null) {
        console.warn(`[api] Offline fallback — returning cached response for ${fullUrl}`, err);
        return cached;
      }
    }
    throw err;
  }
}

// ── CV ────────────────────────────────────────────────────────────────────────

/**
 * Uploads a PDF CV file to the API and triggers server-side extraction.
 *
 * @param file - The PDF `File` object selected by the user.
 * @returns An object containing the extracted `profile`, the server-side `filePath`,
 *          and an optional `warning` when the pdf-parser service was unreachable.
 * @throws {Error} On network failure or non-2xx response.
 *
 * @example
 * ```ts
 * const { profile, warning } = await uploadCv(fileInputRef.current.files[0]);
 * if (warning) console.warn(warning);
 * ```
 */
export async function uploadCv(file: File): Promise<{ profile: CandidateProfile; filePath: string; warning?: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/cv/upload`, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Profile ───────────────────────────────────────────────────────────────────

/**
 * Fetches the most recently updated candidate profile from the database.
 * Returns an empty profile object when no profile exists yet.
 *
 * Uses offline caching — the last successful response is served when the API is
 * unreachable.
 *
 * @returns The current {@link CandidateProfile}.
 * @throws {Error} On network failure with no cached data available.
 *
 * @example
 * ```ts
 * const profile = await getProfile();
 * console.log(profile.fullName); // "Jane Doe"
 * ```
 */
export function getProfile(): Promise<CandidateProfile> {
  return request<CandidateProfile>("/profile");
}

/**
 * Creates or updates the candidate profile in the database.
 *
 * @param profile - Partial or complete profile data to persist.
 * @returns The saved {@link CandidateProfile} with server-generated timestamps.
 * @throws {Error} On network failure or validation error.
 *
 * @example
 * ```ts
 * const saved = await saveProfile({ fullName: "Jane Doe", email: "jane@example.com" });
 * ```
 */
export function saveProfile(profile: Partial<CandidateProfile>): Promise<CandidateProfile> {
  return request<CandidateProfile>("/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}

// ── Forms ─────────────────────────────────────────────────────────────────────

/**
 * Asks the browser-automation service to detect fillable fields on a URL or
 * the bundled HTML fixture.
 *
 * @param payload - `{ url?: string; fixture?: boolean }` — supply one or the other.
 * @returns A list of detected {@link FormField} objects plus an optional `warning`
 *          when the browser-automation service is unreachable.
 * @throws {Error} On network failure.
 *
 * @example
 * ```ts
 * const { fields } = await detectFields({ url: "https://company.com/apply" });
 * ```
 */
export function detectFields(payload: {
  url?: string;
  fixture?: boolean;
}): Promise<{ fields: FormField[]; warning?: string }> {
  return request("/forms/detect", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Fetches the currently saved form mapping (URL + field definitions + field→profile
 * key assignments) from the database.
 *
 * @returns The current {@link FormMapping}, or an empty mapping when none exists.
 * @throws {Error} On network failure with no cached data available.
 *
 * @example
 * ```ts
 * const mapping = await getMapping();
 * console.log(mapping.url); // "https://company.com/apply"
 * ```
 */
export function getMapping(): Promise<FormMapping> {
  return request<FormMapping>("/forms/mapping");
}

/**
 * Saves a form mapping (URL, detected fields, and field→profile-key assignments).
 *
 * @param mapping - Object with optional `url`, `fields` and `mappings` arrays.
 * @returns The saved {@link FormMapping} with server-generated timestamps.
 * @throws {Error} On network failure or validation error.
 *
 * @example
 * ```ts
 * await saveMapping({
 *   url: "https://company.com/apply",
 *   fields: detectedFields,
 *   mappings: [{ fieldId: "email", profileKey: "email" }],
 * });
 * ```
 */
export function saveMapping(mapping: {
  url?: string;
  fields?: FormField[];
  mappings?: FieldMappingEntry[];
}): Promise<FormMapping> {
  return request<FormMapping>("/forms/mapping", {
    method: "POST",
    body: JSON.stringify(mapping),
  });
}

// ── Runs ──────────────────────────────────────────────────────────────────────

/**
 * Enqueues a new form-filling automation run.
 *
 * The API responds immediately with a `202 Accepted` containing the new `runId`
 * while the actual browser automation executes in the background. Poll
 * {@link getRun} to track progress.
 *
 * @param payload - Target URL, field mappings and the candidate profile to inject.
 * @returns An object with the new `id` (UUID) and initial `status` (`"pending"`).
 * @throws {Error} When the payload is invalid or the API is unreachable.
 *
 * @example
 * ```ts
 * const { id } = await startRun({ url, mappings, profile });
 * // Poll:
 * const run = await getRun(id);
 * ```
 */
export function startRun(payload: {
  url: string;
  mappings: FieldMappingEntry[];
  profile: CandidateProfile;
}): Promise<{ id: string; status: string }> {
  return request("/runs", { method: "POST", body: JSON.stringify(payload) });
}

/**
 * Fetches the current state of a single automation run.
 *
 * @param id - The UUID of the run returned by {@link startRun}.
 * @returns The full {@link AutomationRun} record including filled/failed fields.
 * @throws {Error} When the run does not exist (`404`) or the network is unavailable.
 *
 * @example
 * ```ts
 * const run = await getRun("550e8400-e29b-41d4-a716-446655440000");
 * console.log(run.status); // "completed"
 * ```
 */
export function getRun(id: string): Promise<AutomationRun> {
  return request<AutomationRun>(`/runs/${id}`);
}

/**
 * Lists the 50 most recent automation runs ordered by creation date.
 *
 * Uses offline caching — the last successful list is served when the API is
 * unreachable.
 *
 * @returns An array of {@link AutomationRun} records (newest first).
 * @throws {Error} On network failure with no cached data available.
 *
 * @example
 * ```ts
 * const runs = await listRuns();
 * const latest = runs[0];
 * ```
 */
export function listRuns(): Promise<AutomationRun[]> {
  return request<AutomationRun[]>("/runs");
}
