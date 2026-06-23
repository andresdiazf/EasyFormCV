import { z } from "zod";
// ── Candidate Profile ─────────────────────────────────────────────────────────
export const CandidateProfileSchema = z.object({
    id: z.string().optional(),
    fullName: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    location: z.string().default(""),
    summary: z.string().default(""),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
});
// ── Form Field ────────────────────────────────────────────────────────────────
export const FormFieldSchema = z.object({
    id: z.string(),
    label: z.string(),
    type: z.string().default("text"),
    confidence: z.number().min(0).max(1).default(0),
    selector: z.string().optional(),
});
// ── Form Mapping ──────────────────────────────────────────────────────────────
export const FieldMappingEntrySchema = z.object({
    fieldId: z.string(),
    profileKey: z.string(),
});
export const FormMappingSchema = z.object({
    id: z.string().optional(),
    url: z.string().default(""),
    fields: z.array(FormFieldSchema).default([]),
    mappings: z.array(FieldMappingEntrySchema).default([]),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
});
// ── Automation Run ────────────────────────────────────────────────────────────
export const RunStatusSchema = z.enum(["pending", "running", "completed", "failed"]);
export const AutomationRunSchema = z.object({
    id: z.string(),
    status: RunStatusSchema.default("pending"),
    url: z.string().default(""),
    profileSnapshot: CandidateProfileSchema.optional(),
    filled: z.array(z.string()).default([]),
    failed: z.array(z.string()).default([]),
    screenshotPath: z.string().optional(),
    error: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
});
//# sourceMappingURL=index.js.map