import { describe, it, expect, vi } from "vitest";
import { getProfile, saveProfile, uploadCv, detectFields, getMapping } from "../../src/lib/api.js";

// ── Helpers ────────────────────────────────────────────────────────────────────

function mockFetch(body: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

// ── getProfile ─────────────────────────────────────────────────────────────────

describe("getProfile", () => {
  it("returns the profile from the API", async () => {
    const expected = { fullName: "Jane Doe", email: "jane@example.com", phone: "", location: "", summary: "" };
    mockFetch(expected);
    const result = await getProfile();
    expect(result.fullName).toBe("Jane Doe");
    expect(result.email).toBe("jane@example.com");
  });

  it("returns cached profile when offline", async () => {
    const cached = { fullName: "Cached User", email: "cached@example.com", phone: "", location: "", summary: "" };
    sessionStorage.setItem("easyformcv:cache:/api/v1/profile", JSON.stringify(cached));
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
    const result = await getProfile();
    expect(result.fullName).toBe("Cached User");
    sessionStorage.clear();
  });

  it("throws when offline and no cache", async () => {
    sessionStorage.clear();
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
    await expect(getProfile()).rejects.toThrow("Network error");
  });
});

// ── saveProfile ────────────────────────────────────────────────────────────────

describe("saveProfile", () => {
  it("sends a PUT request and returns the saved profile", async () => {
    const saved = { id: "123", fullName: "John", email: "j@j.com", phone: "", location: "", summary: "" };
    const spy = mockFetch(saved);
    const result = await saveProfile({ fullName: "John", email: "j@j.com" });
    expect(spy).toHaveBeenCalledWith(
      "/api/v1/profile",
      expect.objectContaining({ method: "PUT" })
    );
    expect(result.id).toBe("123");
  });

  it("throws when API returns 400", async () => {
    mockFetch({ error: "Bad request" }, 400);
    await expect(saveProfile({})).rejects.toThrow("API error 400");
  });
});

// ── detectFields ──────────────────────────────────────────────────────────────

describe("detectFields", () => {
  it("sends a POST and returns fields with warning", async () => {
    mockFetch({ fields: [{ id: "email", label: "Email", type: "email", confidence: 0.9 }], warning: undefined });
    const result = await detectFields({ url: "https://example.com/form" });
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].id).toBe("email");
  });

  it("returns empty fields with warning when service is offline", async () => {
    mockFetch({ fields: [], warning: "browser-automation service unavailable" });
    const result = await detectFields({ fixture: true });
    expect(result.fields).toHaveLength(0);
    expect(result.warning).toContain("unavailable");
  });
});
