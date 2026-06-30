import { useState } from "react";
import { useI18n, type Locale } from "../lib/i18n.js";
import CvUpload from "../features/cv-upload/CvUpload.js";
import ProfileEditor from "../features/profile-editor/ProfileEditor.js";
import FormMapping from "../features/form-mapping/FormMapping.js";
import AutomationRuns from "../features/automation-runs/AutomationRuns.js";
import Dashboard from "../features/dashboard/Dashboard.js";

type TabId = "dashboard" | "cv-upload" | "profile-editor" | "form-mapping" | "automation-runs";

function LocaleSwitcher() {
  const { locale, setLocale } = useI18n();
  const options: { value: Locale; label: string }[] = [
    { value: "en", label: "EN" },
    { value: "es", label: "ES" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-md border border-slate-700 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => setLocale(o.value)}
          className={[
            "rounded px-2.5 py-1 text-xs font-semibold transition-colors",
            locale === o.value
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-slate-200",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  const TABS: { id: TabId; label: string }[] = [
    { id: "dashboard", label: t("tabDashboard") },
    { id: "cv-upload", label: t("tabUploadCv") },
    { id: "profile-editor", label: t("tabProfileEditor") },
    { id: "form-mapping", label: t("tabFormMapping") },
    { id: "automation-runs", label: t("tabAutomationRun") },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            {t("appTitle")}
          </h1>
          <LocaleSwitcher />
        </div>
      </header>

      {/* Tab bar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 px-6">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                "px-4 py-3 text-sm font-medium transition-colors focus:outline-none",
                activeTab === tab.id
                  ? "border-b-2 border-blue-500 text-blue-400"
                  : "text-slate-400 hover:text-slate-200",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "cv-upload" && <CvUpload />}
        {activeTab === "profile-editor" && <ProfileEditor />}
        {activeTab === "form-mapping" && <FormMapping />}
        {activeTab === "automation-runs" && <AutomationRuns />}
      </main>
    </div>
  );
}
