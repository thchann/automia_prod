/**
 * Dashboard widget content — wire this to your middleware / edge function later.
 * Call `loadDashboardWidgetContent(widgetId)` when you want to hydrate a card; until then UI shows placeholders.
 */

export type DashboardWidgetId = "pipeline_summary" | "response_metrics" | "integrations_pulse";

export type DashboardNavTarget = "Leads" | "Cars";

export const DASHBOARD_PLACEHOLDER_WIDGETS: {
  id: DashboardWidgetId;
  titleEn: string;
  titleEs: string;
  descriptionEn: string;
  descriptionEs: string;
}[] = [
  {
    id: "pipeline_summary",
    titleEn: "Pipeline summary",
    titleEs: "Resumen del embudo",
    descriptionEn: "Funnel stats and conversion — connect your data source when ready.",
    descriptionEs: "Estadisticas del embudo — conecta tu fuente de datos cuando este listo.",
  },
  {
    id: "response_metrics",
    titleEn: "Response metrics",
    titleEs: "Metricas de respuesta",
    descriptionEn: "Reply times and touchpoints — placeholder until middleware is hooked up.",
    descriptionEs: "Tiempos de respuesta — marcador de posicion hasta conectar el middleware.",
  },
  {
    id: "integrations_pulse",
    titleEn: "Integrations",
    titleEs: "Integraciones",
    descriptionEn: "OAuth and webhook health — this card will render live status from your backend.",
    descriptionEs: "Estado de OAuth y webhooks — esta tarjeta mostrara datos en vivo desde tu backend.",
  },
];

/**
 * Replace with a real fetch (middleware, tRPC, etc.). Returning `null` keeps the placeholder UI.
 */
export async function loadDashboardWidgetContent(_widgetId: DashboardWidgetId): Promise<unknown> {
  return null;
}
