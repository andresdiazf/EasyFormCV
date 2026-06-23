import type { FormField, CandidateProfile, FieldMappingEntry } from "@easyformcv/shared-schemas";
/** Payload for the /detect endpoint of the browser-automation service. */
export interface DetectPayload {
    /** Target URL to analyze. Omit when using a fixture. */
    url?: string;
    /** When `true`, the service analyzes the bundled HTML fixture instead of a live URL. */
    fixture?: boolean;
}
/** Payload for the /run endpoint of the browser-automation service. */
export interface RunPayload {
    /** The URL of the form to fill. */
    url: string;
    /** Field-to-profile-key mapping entries that tell the filler which value goes where. */
    mappings: FieldMappingEntry[];
    /** The candidate profile whose values are injected into the form. */
    profile: CandidateProfile;
    /** UUID that identifies this run in the database; used to correlate screenshots and logs. */
    run_id: string;
}
/** Result returned by the /run endpoint after a form-filling attempt. */
export interface RunResult {
    /** Overall outcome: `"completed"` | `"failed"`. */
    status: string;
    /** IDs of form fields that were filled successfully. */
    filled: string[];
    /** IDs of form fields that could not be filled. */
    failed: string[];
    /** Absolute path of the screenshot taken after filling (optional). */
    screenshot_path?: string;
    /** Human-readable error message when `status === "failed"` (optional). */
    error?: string;
}
/**
 * Calls the browser-automation microservice to detect fillable fields on a page.
 *
 * @param payload - Either a live `url` or `fixture: true` to use the sample HTML fixture.
 * @returns An array of detected {@link FormField} objects, each with an id, label, type
 *          and confidence score.
 * @throws {Error} When the HTTP request to the browser-automation service fails.
 *
 * @example
 * ```ts
 * const fields = await detectFields({ url: "https://example.com/apply" });
 * // [{ id: "first-name", label: "First Name", type: "text", confidence: 0.95 }, ...]
 * ```
 */
export declare function detectFields(payload: DetectPayload): Promise<FormField[]>;
/**
 * Calls the browser-automation microservice to execute a form-filling run.
 *
 * The run is identified by `payload.run_id` which should match an existing `Run`
 * record in the database so that progress can be tracked.
 *
 * @param payload - URL, field-to-profile mappings, candidate profile data and the run UUID.
 * @returns A {@link RunResult} describing which fields were filled, which failed, and
 *          where the screenshot was saved.
 * @throws {Error} When the HTTP request to the browser-automation service fails.
 *
 * @example
 * ```ts
 * const result = await runAutomation({
 *   url: "https://example.com/apply",
 *   mappings: [{ fieldId: "email", profileKey: "email" }],
 *   profile: { fullName: "Jane Doe", email: "jane@example.com", ... },
 *   run_id: "550e8400-e29b-41d4-a716-446655440000",
 * });
 * // { status: "completed", filled: ["email"], failed: [], screenshotPath: "/data/..." }
 * ```
 */
export declare function runAutomation(payload: RunPayload): Promise<RunResult>;
//# sourceMappingURL=browser-automation.d.ts.map