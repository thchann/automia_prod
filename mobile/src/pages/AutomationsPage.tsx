import { ExternalLink, Instagram } from "lucide-react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  createAutomation,
  listAutomations,
  listAutomationTypes,
  startInstagramOAuth,
  updateAutomation,
} from "@automia/api";
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

function accountIdentitySubtitle(
  conn: AutomationItem | undefined,
  tx: (en: string, es: string) => string,
): string {
  if (!conn) return tx("Instagram account", "Cuenta de Instagram");
  const displayName = conn.platform_display_name?.trim();
  if (displayName) return displayName;
  const username = conn.platform_username?.trim();
  if (username) return username.startsWith("@") ? username : `@${username}`;
  return tx("Instagram account", "Cuenta de Instagram");
}

const AutomationsPage = () => {
  const { tx } = useLanguage();
  const queryClient = useQueryClient();
  const [hasConnectedInstagramInSession, setHasConnectedInstagramInSession] = useState(false);

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

  const hasConnectedInstagram = hasConnectedInstagramInSession || automations.some((a) => {
    const type = types.find((t) => t.id === a.automation_type_id);
    return type?.platform === "instagram";
  });

  const connectInstagram = async () => {
    try {
      const result = await startInstagramOAuth();
      if (result.status === "success") {
        setHasConnectedInstagramInSession(true);
      } else if (result.status === "error") {
        toast.error(result.message || tx("Could not connect Instagram.", "No se pudo conectar Instagram."));
      }
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
    } catch {
      toast.error(tx("Could not start Instagram connection", "No se pudo conectar Instagram"));
    }
  };

  const createAutomationForType = async (automationTypeId: string) => {
    try {
      await createAutomation({ automation_type_id: automationTypeId });
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        toast.error(tx("Connect Instagram first.", "Conecta Instagram primero."));
        return;
      }
      if (e instanceof ApiError && e.status === 409) {
        toast.error(
          tx(
            "This automation is already connected.",
            "Esta automatizacion ya esta conectada.",
          ),
        );
        return;
      }
      toast.error(tx("Could not create automation.", "No se pudo crear la automatizacion."));
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
    <div className="px-5 pt-8 pb-24 max-w-[430px] mx-auto animate-fade-in">
      <h1 className="text-3xl font-extrabold tracking-tight mb-1">{tx("Automations", "Automatizaciones")}</h1>
      <p className="text-sm text-muted-foreground mb-4">
        {tx("Connect bots and workflows", "Conecta bots y flujos de trabajo")}
      </p>

      <div className="space-y-4 pt-2 pr-1">
        {loadingTypes || loadingAuto ? (
          <p className="text-sm text-muted-foreground">{tx("Loading…", "Cargando…")}</p>
        ) : (
          types.map((t: AutomationTypeItem) => {
            const conn = findAutomationForType(automations, t.id);
            const isIg = t.platform === "instagram";
            const isConnected = Boolean(conn && conn.status === "active");
            return (
              <div key={t.id} className="h-[186px] rounded-xl border border-border bg-card p-4">
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
                    <p className="text-sm text-muted-foreground line-clamp-2">{t.description ?? t.code}</p>
                    {conn ? (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                        {accountIdentitySubtitle(conn, tx)}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-auto flex h-8 items-center justify-between pr-1">
                    {isIg ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full px-4"
                        onClick={() => {
                          if (conn) {
                            void connectInstagram();
                            return;
                          }
                          if (!hasConnectedInstagram) {
                            void connectInstagram();
                            return;
                          }
                          void createAutomationForType(t.id);
                        }}
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
                        {conn
                          ? tx("Manage connection", "Gestionar conexion")
                          : hasConnectedInstagram
                            ? tx("Create", "Crear")
                            : tx("Connect Instagram", "Conectar Instagram")}
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" size="sm" className="h-8 rounded-full px-4" disabled>
                        {tx("Soon", "Pronto")}
                      </Button>
                    )}
                    {conn ? (
                      <button
                        type="button"
                        aria-label={isConnected ? "Connected" : "Paused"}
                        onClick={() => void toggleAutomation(conn)}
                        className={`relative h-6 w-10 overflow-hidden rounded-full transition-colors ${
                          isConnected ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                            isConnected ? "translate-x-4" : "translate-x-0"
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
          })
        )}
      </div>
    </div>
  );
};

export default AutomationsPage;
