import { env } from "../lib/env.js";
import type { CandidateProfile } from "@easyformcv/shared-schemas";

const BASE_URL = env.PDF_PARSER_URL;

/**
 * Sends a PDF file buffer to the Python pdf-parser microservice and returns a
 * structured {@link CandidateProfile} extracted from the document.
 *
 * The file is transmitted as `multipart/form-data` so no shared filesystem is
 * needed — the function works identically in local development and on the cloud.
 *
 * @param fileBuffer - The raw binary content of the PDF file (Node.js `Buffer`).
 * @param filename   - The original filename (e.g. `"resume.pdf"`); used by the
 *                     parser service for logging and as a MIME-type hint.
 * @returns A {@link CandidateProfile} object with fields extracted from the CV
 *          (`fullName`, `email`, `phone`, `location`, `summary`).
 * @throws {Error} When the pdf-parser service is unreachable or returns a non-2xx
 *                 status, including when the uploaded file is not a valid PDF.
 *
 * @example
 * ```ts
 * import fs from "node:fs/promises";
 * import { parsePdf } from "./services/pdf-parser.js";
 *
 * const buffer = await fs.readFile("./resume.pdf");
 * const profile = await parsePdf(buffer, "resume.pdf");
 * // { fullName: "Jane Doe", email: "jane@example.com", phone: "+1 555 0100", ... }
 * ```
 */
export async function parsePdf(fileBuffer: Buffer, filename: string): Promise<CandidateProfile> {
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: "application/pdf" });
  formData.append("file", blob, filename);

  const response = await fetch(`${BASE_URL}/parse`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`pdf-parser error ${response.status}: ${text}`);
  }

  return response.json() as Promise<CandidateProfile>;
}
