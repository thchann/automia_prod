export type Language = "en" | "es";

export const translations: Record<Language, Record<string, string>> = {
  en: {
    "settings.tab.account": "Account",
    "settings.tab.languages": "Languages",
    "settings.tab.sharing": "Sharing",
    "settings.tab.updateSchedule": "Update schedule",
    "settings.tab.billing": "Billing",
    "settings.tab.questions": "Questions",
  },
  es: {
    "settings.tab.account": "Cuenta",
    "settings.tab.languages": "Idiomas",
    "settings.tab.sharing": "Compartir",
    "settings.tab.updateSchedule": "Horario de actualizaciones",
    "settings.tab.billing": "Facturacion",
    "settings.tab.questions": "Preguntas",
  },
};
