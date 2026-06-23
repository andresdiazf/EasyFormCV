import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { detectFields, getMapping, saveMapping } from "../../lib/api.js";
import { useI18n } from "../../lib/i18n.js";
import type { FormField, FieldMappingEntry } from "@easyformcv/shared-schemas";

const PROFILE_KEYS = ["fullName", "email", "phone", "location", "summary"];

export default function FormMapping() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [targetUrl, setTargetUrl] = useState("");
  const [useFixture, setUseFixture] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [mappings, setMappings] = useState<FieldMappingEntry[]>([]);
  const [detectWarning, setDetectWarning] = useState<string | null>(null);

  useQuery({
    queryKey: ["mapping"],
    queryFn: getMapping,
    select: (data) => {
      setTargetUrl(data.url ?? "");
      setFields(data.fields ?? []);
      setMappings(data.mappings ?? []);
      return data;
    },
  });

  const detectMutation = useMutation({
    mutationFn: () => detectFields({ url: useFixture ? undefined : targetUrl, fixture: useFixture }),
    onSuccess: (data) => {
      setFields(data.fields);
      setDetectWarning(data.warning ?? null);
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => saveMapping({ url: targetUrl, fields, mappings }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mapping"] }),
  });

  function handleMappingChange(fieldId: string, profileKey: string) {
    setMappings((prev) => {
      const without = prev.filter((m) => m.fieldId !== fieldId);
      if (!profileKey) return without;
      return [...without, { fieldId, profileKey }];
    });
  }

  function getMappedKey(fieldId: string): string {
    return mappings.find((m) => m.fieldId === fieldId)?.profileKey ?? "";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">{t("mappingTitle")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("mappingDescription")}</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-slate-400">{t("targetUrl")}</label>
        <input
          type="url"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder={t("targetUrlPlaceholder")}
          disabled={useFixture}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40"
        />

        <label className="flex items-center gap-2 text-sm text-slate-400">
          <input
            type="checkbox"
            checked={useFixture}
            onChange={(e) => setUseFixture(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-blue-500"
          />
          {t("useFixture")}
        </label>
      </div>

      <div className="text-xs text-slate-500">
        {t("formUrl")}:{" "}
        <span className="text-slate-400">{targetUrl || t("formUrlNone")}</span>
      </div>

      <button
        onClick={() => detectMutation.mutate()}
        disabled={detectMutation.isPending || (!targetUrl && !useFixture)}
        className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
      >
        {detectMutation.isPending ? t("detecting") : t("detectFields")}
      </button>

      {detectMutation.isError && (
        <div className="rounded-md bg-red-900/30 px-4 py-3 text-sm text-red-400">
          {(detectMutation.error as Error).message}
        </div>
      )}

      {detectWarning && (
        <div className="rounded-md bg-yellow-900/30 px-4 py-3 text-sm text-yellow-400">
          {detectWarning}
        </div>
      )}

      {fields.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-left text-slate-400">
              <tr>
                <th className="px-4 py-2">{t("colFieldId")}</th>
                <th className="px-4 py-2">{t("colLabel")}</th>
                <th className="px-4 py-2">{t("colConfidence")}</th>
                <th className="px-4 py-2">{t("colMapTo")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {fields.map((f) => (
                <tr key={f.id} className="bg-slate-900 hover:bg-slate-800/60">
                  <td className="px-4 py-2 font-mono text-slate-300">{f.id}</td>
                  <td className="px-4 py-2 text-slate-200">{f.label}</td>
                  <td className="px-4 py-2 text-slate-400">
                    {(f.confidence * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={getMappedKey(f.id)}
                      onChange={(e) => handleMappingChange(f.id, e.target.value)}
                      className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">{t("skipField")}</option>
                      {PROFILE_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {fields.length === 0 && !detectMutation.isPending && (
        <p className="text-sm text-slate-500">{t("noFieldsDetected")}</p>
      )}

      {fields.length > 0 && (
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="rounded-md bg-slate-700 px-5 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600 disabled:opacity-50"
        >
          {saveMutation.isPending ? t("saving") : t("saveMapping")}
        </button>
      )}

      {saveMutation.isSuccess && (
        <p className="text-sm text-green-400">{t("mappingSaved")}</p>
      )}
    </div>
  );
}
