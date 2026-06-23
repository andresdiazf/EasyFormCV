import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startRun, listRuns, getRun, getProfile, getMapping } from "../../lib/api.js";
import { useI18n } from "../../lib/i18n.js";
import type { AutomationRun } from "@easyformcv/shared-schemas";

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const colors: Record<string, string> = {
    pending:   "bg-yellow-900/40 text-yellow-400",
    running:   "bg-blue-900/40 text-blue-400",
    completed: "bg-green-900/40 text-green-400",
    failed:    "bg-red-900/40 text-red-400",
  };
  const labels: Record<string, string> = {
    pending:   t("statusPending"),
    running:   t("statusRunning"),
    completed: t("statusCompleted"),
    failed:    t("statusFailed"),
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-slate-700 text-slate-300"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export default function AutomationRuns() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: listRuns,
    refetchInterval: 5000,
  });

  const { data: selectedRun, refetch: refetchSelected } = useQuery({
    queryKey: ["run", selectedId],
    queryFn: () => getRun(selectedId!),
    enabled: !!selectedId,
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const [profile, mapping] = await Promise.all([getProfile(), getMapping()]);
      return startRun({
        url: mapping.url ?? "",
        mappings: mapping.mappings ?? [],
        profile,
      });
    },
    onSuccess: (data) => {
      setSelectedId(data.id);
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">{t("runsTitle")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("runsDescription")}</p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-4 py-3">
        <span className="text-sm text-slate-400">{t("serviceStatus")}</span>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["runs"] })}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          {t("refreshStatus")}
        </button>
      </div>

      <button
        onClick={() => startMutation.mutate()}
        disabled={startMutation.isPending}
        className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
      >
        {startMutation.isPending ? t("starting") : t("run")}
      </button>

      {startMutation.isError && (
        <div className="rounded-md bg-red-900/30 px-4 py-3 text-sm text-red-400">
          {(startMutation.error as Error).message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Run list */}
        <div className="rounded-lg border border-slate-700 bg-slate-900">
          <div className="border-b border-slate-700 px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            {t("runsListHeader")}
          </div>
          {runsLoading && (
            <p className="px-4 py-3 text-sm text-slate-400">{t("loading")}</p>
          )}
          {!runsLoading && runs.length === 0 && (
            <p className="px-4 py-4 text-sm text-slate-500">{t("noRunsYet")}</p>
          )}
          <ul className="divide-y divide-slate-800">
            {runs.map((run: AutomationRun) => (
              <li key={run.id}>
                <button
                  onClick={() => setSelectedId(run.id)}
                  className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-slate-800 ${selectedId === run.id ? "bg-slate-800" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-xs text-slate-400">
                      {run.id.slice(0, 8)}…
                    </span>
                    <StatusBadge status={run.status} />
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    {run.createdAt}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Run report */}
        <div className="rounded-lg border border-slate-700 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {t("runReport")}
            </span>
            {selectedId && (
              <button
                onClick={() => refetchSelected()}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {t("refreshStatus")}
              </button>
            )}
          </div>

          {!selectedRun && (
            <p className="px-4 py-4 text-sm text-slate-500">{t("noRunSelected")}</p>
          )}

          {selectedRun && (
            <div className="space-y-4 p-4 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-slate-400">{t("statusLabel")}</span>
                <StatusBadge status={selectedRun.status} />
              </div>

              {selectedRun.url && (
                <div>
                  <span className="text-slate-400">{t("urlLabel")}</span>
                  <p className="mt-1 truncate text-slate-200">{selectedRun.url}</p>
                </div>
              )}

              {selectedRun.filled.length > 0 && (
                <div>
                  <span className="text-slate-400">{t("filledFields")}</span>
                  <ul className="mt-1 space-y-0.5">
                    {selectedRun.filled.map((f) => (
                      <li key={f} className="text-green-400">✓ {f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedRun.failed.length > 0 && (
                <div>
                  <span className="text-slate-400">{t("failedFields")}</span>
                  <ul className="mt-1 space-y-0.5">
                    {selectedRun.failed.map((f) => (
                      <li key={f} className="text-red-400">✗ {f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedRun.error && (
                <div className="rounded bg-red-900/30 px-3 py-2 text-red-400">
                  {selectedRun.error}
                </div>
              )}

              {selectedRun.screenshotPath && (
                <div>
                  <span className="text-slate-400">{t("screenshot")}</span>
                  <p className="mt-1 font-mono text-xs text-slate-400">
                    {selectedRun.screenshotPath}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
