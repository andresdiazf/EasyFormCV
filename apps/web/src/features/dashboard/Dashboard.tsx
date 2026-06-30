import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProfile, getMapping, listRuns } from "../../lib/api.js";
import { useI18n } from "../../lib/i18n.js";

function completionPercent(profile: {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
}) {
  const values = [
    profile.fullName,
    profile.email,
    profile.phone,
    profile.location,
    profile.summary,
  ];
  const completed = values.filter((v) => (v ?? "").trim().length > 0).length;
  return Math.round((completed / values.length) * 100);
}

export default function Dashboard() {
  const { t } = useI18n();

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const { data: mapping } = useQuery({ queryKey: ["mapping"], queryFn: getMapping });
  const { data: runs = [] } = useQuery({
    queryKey: ["runs"],
    queryFn: listRuns,
    refetchInterval: 5000,
  });

  const stats = useMemo(() => {
    const p = profile ?? { fullName: "", email: "", phone: "", location: "", summary: "" };
    const mapCount = mapping?.mappings?.length ?? 0;
    const lastRun = runs[0];
    return {
      profileCompletion: completionPercent(p),
      mappingCount: mapCount,
      totalRuns: runs.length,
      lastRunStatus: lastRun?.status ?? "-",
      lastRunAt: lastRun?.createdAt ?? "-",
    };
  }, [profile, mapping, runs]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">{t("dashboardTitle")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("dashboardDescription")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">{t("dashboardProfileCompletion")}</p>
          <p className="mt-2 text-3xl font-semibold text-blue-400">{stats.profileCompletion}%</p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">{t("dashboardMappings")}</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-400">{stats.mappingCount}</p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">{t("dashboardRuns")}</p>
          <p className="mt-2 text-3xl font-semibold text-amber-400">{stats.totalRuns}</p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">{t("dashboardLastRun")}</p>
          <p className="mt-2 text-base font-semibold text-slate-200">{stats.lastRunStatus}</p>
          <p className="mt-1 text-xs text-slate-500">{stats.lastRunAt}</p>
        </div>
      </div>
    </div>
  );
}
