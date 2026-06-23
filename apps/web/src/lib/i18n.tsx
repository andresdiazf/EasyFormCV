import { createContext, useContext, useState, type ReactNode } from "react";

export type Locale = "en" | "es";

const translations = {
  en: {
    // App shell
    appTitle: "EasyFormCV",
    tabUploadCv: "Upload CV",
    tabProfileEditor: "Profile Editor",
    tabFormMapping: "Form Mapping",
    tabAutomationRun: "Automation Run",

    // CV Upload
    uploadTitle: "Upload CV",
    uploadDescription: "Upload a PDF resume to extract candidate information automatically.",
    uploadClickPrompt: "Click to select a PDF file",
    uploading: "Uploading…",
    parsedFields: "Parsed fields",
    noProfileLoaded: "No profile loaded",
    uploadFailed: "Upload failed",

    // Profile Editor
    profileTitle: "Profile Editor",
    profileDescription: "Review and edit the candidate profile before running form automation.",
    fieldFullName: "Full Name",
    fieldEmail: "Email",
    fieldPhone: "Phone",
    fieldLocation: "Location",
    fieldSummary: "Summary",
    saveProfile: "Save profile",
    saving: "Saving…",
    profileSaved: "Profile saved.",
    loading: "Loading…",

    // Form Mapping
    mappingTitle: "Form Mapping",
    mappingDescription: "Detect form fields on a web page and map them to profile keys.",
    targetUrl: "Target URL",
    targetUrlPlaceholder: "https://example.com/apply",
    useFixture: "Use local HTML fixture",
    formUrl: "Form URL",
    formUrlNone: "(none)",
    detectFields: "Detect Form Fields",
    detecting: "Detecting…",
    colFieldId: "Field ID",
    colLabel: "Label",
    colConfidence: "Confidence",
    colMapTo: "Map to profile key",
    skipField: "— skip —",
    noFieldsDetected: 'No fields detected yet. Enter a URL and click "Detect Form Fields".',
    saveMapping: "Save mapping",
    mappingSaved: "Mapping saved.",

    // Automation Runs
    runsTitle: "Automation Run",
    runsDescription: "Trigger a browser automation run using the saved profile and form mapping.",
    serviceStatus: "Service Status",
    refreshStatus: "Refresh status",
    run: "Run",
    starting: "Starting…",
    runsListHeader: "Runs",
    noRunsYet: "No runs yet.",
    runReport: "Run Report",
    noRunSelected: "No run selected",
    statusLabel: "Status",
    urlLabel: "URL",
    filledFields: "Filled fields",
    failedFields: "Failed fields",
    screenshot: "Screenshot",

    // Status badges
    statusPending: "pending",
    statusRunning: "running",
    statusCompleted: "completed",
    statusFailed: "failed",

    // Errors
    requestFailed: "Request failed",
  },
  es: {
    // App shell
    appTitle: "EasyFormCV",
    tabUploadCv: "Subir CV",
    tabProfileEditor: "Editor de Perfil",
    tabFormMapping: "Mapeo de Formulario",
    tabAutomationRun: "Ejecución",

    // CV Upload
    uploadTitle: "Subir CV",
    uploadDescription: "Subí un PDF de tu currículum para extraer la información automáticamente.",
    uploadClickPrompt: "Hacé clic para seleccionar un PDF",
    uploading: "Subiendo…",
    parsedFields: "Campos extraídos",
    noProfileLoaded: "No hay perfil cargado",
    uploadFailed: "Error al subir",

    // Profile Editor
    profileTitle: "Editor de Perfil",
    profileDescription: "Revisá y editá el perfil del candidato antes de ejecutar la automatización.",
    fieldFullName: "Nombre completo",
    fieldEmail: "Email",
    fieldPhone: "Teléfono",
    fieldLocation: "Ubicación",
    fieldSummary: "Resumen",
    saveProfile: "Guardar perfil",
    saving: "Guardando…",
    profileSaved: "Perfil guardado.",
    loading: "Cargando…",

    // Form Mapping
    mappingTitle: "Mapeo de Formulario",
    mappingDescription: "Detectá campos en una página web y mapeálos a claves del perfil.",
    targetUrl: "URL destino",
    targetUrlPlaceholder: "https://ejemplo.com/postulacion",
    useFixture: "Usar HTML local de prueba",
    formUrl: "URL del formulario",
    formUrlNone: "(ninguna)",
    detectFields: "Detectar Campos",
    detecting: "Detectando…",
    colFieldId: "ID del campo",
    colLabel: "Etiqueta",
    colConfidence: "Confianza",
    colMapTo: "Mapear a clave de perfil",
    skipField: "— omitir —",
    noFieldsDetected: 'Sin campos detectados. Ingresá una URL y hacé clic en "Detectar Campos".',
    saveMapping: "Guardar mapeo",
    mappingSaved: "Mapeo guardado.",

    // Automation Runs
    runsTitle: "Ejecución",
    runsDescription: "Iniciá una ejecución de automatización usando el perfil y el mapeo guardados.",
    serviceStatus: "Estado del servicio",
    refreshStatus: "Actualizar estado",
    run: "Ejecutar",
    starting: "Iniciando…",
    runsListHeader: "Ejecuciones",
    noRunsYet: "Sin ejecuciones aún.",
    runReport: "Reporte",
    noRunSelected: "Ninguna ejecución seleccionada",
    statusLabel: "Estado",
    urlLabel: "URL",
    filledFields: "Campos completados",
    failedFields: "Campos fallidos",
    screenshot: "Captura de pantalla",

    // Status badges
    statusPending: "pendiente",
    statusRunning: "en curso",
    statusCompleted: "completado",
    statusFailed: "fallido",

    // Errors
    requestFailed: "Error en la solicitud",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

type I18nContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const stored = (localStorage.getItem("locale") ?? "en") as Locale;
  const [locale, setLocaleState] = useState<Locale>(
    stored === "es" ? "es" : "en",
  );

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem("locale", l);
  }

  function t(key: TranslationKey): string {
    return translations[locale][key];
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
