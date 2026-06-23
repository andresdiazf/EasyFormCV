import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, saveProfile } from "../../lib/api.js";
import { useI18n } from "../../lib/i18n.js";
import type { CandidateProfile } from "@easyformcv/shared-schemas";

const EMPTY: CandidateProfile = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  summary: "",
};

export default function ProfileEditor() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const [form, setForm] = useState<CandidateProfile>(EMPTY);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (p: CandidateProfile) => saveProfile(p),
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile"], updated);
    },
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  if (isLoading) {
    return <p className="text-sm text-slate-400">{t("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">{t("profileTitle")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("profileDescription")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {(
          [
            { name: "fullName" as const, labelKey: "fieldFullName" as const },
            { name: "email" as const,    labelKey: "fieldEmail" as const },
            { name: "phone" as const,    labelKey: "fieldPhone" as const },
            { name: "location" as const, labelKey: "fieldLocation" as const },
          ]
        ).map(({ name, labelKey }) => (
          <div key={name}>
            <label className="mb-1 block text-sm text-slate-400">{t(labelKey)}</label>
            <input
              name={name}
              value={form[name] ?? ""}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ))}

        <div>
          <label className="mb-1 block text-sm text-slate-400">{t("fieldSummary")}</label>
          <textarea
            name="summary"
            value={form.summary ?? ""}
            onChange={handleChange}
            rows={4}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {mutation.isError && (
          <div className="rounded-md bg-red-900/30 px-4 py-3 text-sm text-red-400">
            {(mutation.error as Error).message}
          </div>
        )}

        {mutation.isSuccess && (
          <div className="rounded-md bg-green-900/30 px-4 py-3 text-sm text-green-400">
            {t("profileSaved")}
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {mutation.isPending ? t("saving") : t("saveProfile")}
        </button>
      </form>
    </div>
  );
}
