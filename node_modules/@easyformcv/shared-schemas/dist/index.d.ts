import { z } from "zod";
export declare const CandidateProfileSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    fullName: z.ZodDefault<z.ZodString>;
    email: z.ZodDefault<z.ZodString>;
    phone: z.ZodDefault<z.ZodString>;
    location: z.ZodDefault<z.ZodString>;
    summary: z.ZodDefault<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
    id?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}, {
    id?: string | undefined;
    fullName?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    location?: string | undefined;
    summary?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}>;
export type CandidateProfile = z.infer<typeof CandidateProfileSchema>;
export declare const FormFieldSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    type: z.ZodDefault<z.ZodString>;
    confidence: z.ZodDefault<z.ZodNumber>;
    selector: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: string;
    label: string;
    confidence: number;
    selector?: string | undefined;
}, {
    id: string;
    label: string;
    type?: string | undefined;
    confidence?: number | undefined;
    selector?: string | undefined;
}>;
export type FormField = z.infer<typeof FormFieldSchema>;
export declare const FieldMappingEntrySchema: z.ZodObject<{
    fieldId: z.ZodString;
    profileKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    fieldId: string;
    profileKey: string;
}, {
    fieldId: string;
    profileKey: string;
}>;
export declare const FormMappingSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    url: z.ZodDefault<z.ZodString>;
    fields: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        type: z.ZodDefault<z.ZodString>;
        confidence: z.ZodDefault<z.ZodNumber>;
        selector: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        type: string;
        label: string;
        confidence: number;
        selector?: string | undefined;
    }, {
        id: string;
        label: string;
        type?: string | undefined;
        confidence?: number | undefined;
        selector?: string | undefined;
    }>, "many">>;
    mappings: z.ZodDefault<z.ZodArray<z.ZodObject<{
        fieldId: z.ZodString;
        profileKey: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        fieldId: string;
        profileKey: string;
    }, {
        fieldId: string;
        profileKey: string;
    }>, "many">>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    url: string;
    fields: {
        id: string;
        type: string;
        label: string;
        confidence: number;
        selector?: string | undefined;
    }[];
    mappings: {
        fieldId: string;
        profileKey: string;
    }[];
    id?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}, {
    id?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    url?: string | undefined;
    fields?: {
        id: string;
        label: string;
        type?: string | undefined;
        confidence?: number | undefined;
        selector?: string | undefined;
    }[] | undefined;
    mappings?: {
        fieldId: string;
        profileKey: string;
    }[] | undefined;
}>;
export type FormMapping = z.infer<typeof FormMappingSchema>;
export type FieldMappingEntry = z.infer<typeof FieldMappingEntrySchema>;
export declare const RunStatusSchema: z.ZodEnum<["pending", "running", "completed", "failed"]>;
export declare const AutomationRunSchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["pending", "running", "completed", "failed"]>>;
    url: z.ZodDefault<z.ZodString>;
    profileSnapshot: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        fullName: z.ZodDefault<z.ZodString>;
        email: z.ZodDefault<z.ZodString>;
        phone: z.ZodDefault<z.ZodString>;
        location: z.ZodDefault<z.ZodString>;
        summary: z.ZodDefault<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        fullName: string;
        email: string;
        phone: string;
        location: string;
        summary: string;
        id?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
    }, {
        id?: string | undefined;
        fullName?: string | undefined;
        email?: string | undefined;
        phone?: string | undefined;
        location?: string | undefined;
        summary?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
    }>>;
    filled: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    failed: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    screenshotPath: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "pending" | "running" | "completed" | "failed";
    url: string;
    failed: string[];
    filled: string[];
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    profileSnapshot?: {
        fullName: string;
        email: string;
        phone: string;
        location: string;
        summary: string;
        id?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
    } | undefined;
    screenshotPath?: string | undefined;
    error?: string | undefined;
}, {
    id: string;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    status?: "pending" | "running" | "completed" | "failed" | undefined;
    url?: string | undefined;
    failed?: string[] | undefined;
    profileSnapshot?: {
        id?: string | undefined;
        fullName?: string | undefined;
        email?: string | undefined;
        phone?: string | undefined;
        location?: string | undefined;
        summary?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
    } | undefined;
    filled?: string[] | undefined;
    screenshotPath?: string | undefined;
    error?: string | undefined;
}>;
export type AutomationRun = z.infer<typeof AutomationRunSchema>;
export type RunStatus = z.infer<typeof RunStatusSchema>;
//# sourceMappingURL=index.d.ts.map