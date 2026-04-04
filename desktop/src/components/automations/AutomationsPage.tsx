import { useMemo, useState } from "react";
import { ExternalLink, Instagram } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAutomations,
  listAutomationTypes,
  startInstagramOAuth,
  updateAutomation,
} from "@automia/api";
import type { InstagramOAuthFailureReason } from "@automia/api";
import type { AutomationItem, AutomationTypeItem } from "@automia/api";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageProvider";
import { toast } from "@/components/ui/sonner";

function findAutomationForType(
  automations: AutomationItem[],
  typeId: string,
): AutomationItem | undefined {
  return automations.find((a) => a.automation_type_id === typeId);
}

type AutomationsTab = "all" | "connected";

export function AutomationsPage() {
  const { tx } = useLanguage();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AutomationsTab>("all");

  const { data: typesData, isLoading: loadingTypes } = useQuery({
    queryKey: ["automation-types"],
    queryFn: () => listAutomationTypes(),
  });
  const { data: automationsData, isLoading: loadingAuto } = useQuery({
    queryKey: ["automations"],
    queryFn: () => listAutomations(),
  });

  const types = typesData?.types ?? [];
  const automations = automationsData?.automations ?? [];

  const visibleTypes = useMemo(() => {
    if (tab !== "connected") return types;
    return types.filter((t) => findAutomationForType(automations, t.id));
  }, [tab, types, automations]);

  const tabs: { key: AutomationsTab; label: string }[] = [
    { key: "all", label: tx("All", "Todas") },
    { key: "connected", label: tx("Connected", "Conectadas") },
  ];

  const instagramOAuthMessage = (reason: InstagramOAuthFailureReason): string => {
    const m: Record<InstagramOAuthFailureReason, [string, string]> = {
      no_token: ["Sign in again to connect Instagram.", "Inicia sesión de nuevo para conectar Instagram."],
      fetch_failed: ["Could not reach the server. Check your connection.", "No se pudo conectar al servidor."],
      not_json: ["Unexpected response from the server. Try again later.", "Respuesta inesperada del servidor."],
      no_authorize_url: ["Could not get the Instagram login link.", "No se obtuvo el enlace de inicio de sesión de Instagram."],
      redirect_no_location: ["OAuth redirect failed (missing Location). Contact support.", "La redirección OAuth falló. Contacta soporte."],
      opaque_redirect: ["OAuth redirect failed (browser limitation). The API should return JSON with authorize_url.", "Fallo de redirección OAuth. El servidor debe devolver JSON con authorize_url."],
      http_error: ["The server rejected the request. Try again or contact support.", "El servidor rechazó la solicitud."],
    };
    const pair = m[reason];
    return tx(pair[0], pair[1]);
  };

  const connectInstagram = async () => {
    try {
      const result = await startInstagramOAuth();
      if (result.ok === false) {
        toast.error(instagramOAuthMessage(result.reason));
      }
    } catch {
      toast.error(tx("Could not start Instagram connection", "No se pudo conectar Instagram"));
    }
  };

  const toggleAutomation = async (row: AutomationItem) => {
    const next = row.status === "active" ? "paused" : "active";
    try {
      await updateAutomation(row.id, { status: next });
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
    } catch {
      toast.error(tx("Update failed", "Error al actualizar"));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 text-foreground">
      <div className="flex items-center gap-0 border-b border-border shrink-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              tab === t.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {tab === t.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {loadingTypes || loadingAuto ? (
          <p className="text-sm text-muted-foreground">{tx("Loading…", "Cargando…")}</p>
        ) : visibleTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8">
            {tab === "connected"
              ? tx("No connected automations yet.", "Aun no hay automatizaciones conectadas.")
              : tx("No automations available.", "No hay automatizaciones disponibles.")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 pb-4">
            {visibleTypes.map((t: AutomationTypeItem) => {
              const conn = findAutomationForType(automations, t.id);
              const isIg = t.platform === "instagram";
              const isActive = Boolean(conn && conn.status === "active");
              return (
                <div
                  key={t.id}
                  className="h-[186px] rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex h-full flex-col">
                    <div className="mb-3 flex items-center justify-between pr-1">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background">
                        {isIg ? (
                          <Instagram className="h-4 w-4 text-[#E1306C]" />
                        ) : (
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {t.description ?? t.code}
                      </p>
                    </div>
                    <div className="mt-auto flex h-8 items-center justify-between pr-1">
                      {isIg ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full px-4"
                          onClick={() => void connectInstagram()}
                          disabled={!t.is_active}
                          title={
                            !t.is_active
                              ? tx(
                                  "This automation is not available yet.",
                                  "Esta automatización aún no está disponible.",
                                )
                              : undefined
                          }
                        >
                          {conn ? tx("Reconnect", "Reconectar") : tx("Connect", "Conectar")}
                        </Button>
                      ) : (
                        <Button type="button" variant="outline" size="sm" className="h-8 rounded-full px-4" disabled>
                          {tx("Soon", "Pronto")}
                        </Button>
                      )}
                      {conn ? (
                        <button
                          type="button"
                          aria-label={isActive ? tx("Active", "Activo") : tx("Paused", "Pausado")}
                          onClick={() => void toggleAutomation(conn)}
                          className={`relative h-6 w-10 shrink-0 overflow-hidden rounded-full transition-colors ${
                            isActive ? "bg-primary" : "bg-muted"
                          }`}
                        >
                          <span
                            className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                              isActive ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
