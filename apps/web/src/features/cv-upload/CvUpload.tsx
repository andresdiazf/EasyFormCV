import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadCv } from "../../lib/api.js";
import { useI18n } from "../../lib/i18n.js";
import type { CandidateProfile } from "@easyformcv/shared-schemas";

export default function CvUpload() {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (file: File) => uploadCv(file),
    onSuccess: (data) => {
      setProfile(data.profile);
      setWarning(data.warning ?? null);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) mutation.mutate(file);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">{t("uploadTitle")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("uploadDescription")}</p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-700 bg-slate-900 px-6 py-12 transition-colors hover:border-blue-500 hover:bg-slate-800/50"
      >
        <svg
          className="mb-3 h-10 w-10 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-sm text-slate-400">
          {mutation.isPending ? t("uploading") : t("uploadClickPrompt")}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {mutation.isError && (
        <div className="rounded-md bg-red-900/30 px-4 py-3 text-sm text-red-400">
          {(mutation.error as Error).message}
        </div>
      )}

      {warning && (
        <div className="rounded-md bg-yellow-900/30 px-4 py-3 text-sm text-yellow-400">
          {warning}
        </div>
      )}

      {profile && (
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
          <h3 className="mb-4 text-sm font-medium text-slate-300">
            {t("parsedFields")}
          </h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {(
              [
                [t("fieldFullName"), profile.fullName],
                [t("fieldEmail"), profile.email],
                [t("fieldPhone"), profile.phone],
                [t("fieldLocation"), profile.location],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-slate-200">{value || "—"}</dd>
              </div>
            ))}
            <div className="col-span-2">
              <dt className="text-slate-500">{t("fieldSummary")}</dt>
              <dd className="mt-1 text-slate-200">{profile.summary || "—"}</dd>
            </div>
          </dl>
        </div>
      )}

      {!profile && !mutation.isPending && (
        <p className="text-center text-sm text-slate-500">{t("noProfileLoaded")}</p>
      )}
    </div>
  );
}
