import { ExternalLink, Instagram } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
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

export function AutomationsPage() {
  const { tx } = useLanguage();
  const queryClient = useQueryClient();

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

  const connectInstagram = async () => {
    try {
      await startInstagramOAuth();
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
    <div className="flex h-full min-h-0 flex-col text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-3 text-[20px] font-semibold leading-8">
        <span className="text-foreground">{tx("Automations", "Automatizaciones")}</span>
      </header>

      <div className="flex-1 min-h-0 px-6 pt-8 pb-5">
        <div className="h-[calc(100vh-190px)] overflow-y-scroll pr-1">
          {loadingTypes || loadingAuto ? (
            <p className="text-sm text-muted-foreground">{tx("Loading…", "Cargando…")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {types.map((t: AutomationTypeItem) => {
                const conn = findAutomationForType(automations, t.id);
                const isIg = t.platform === "instagram";
                const isConnected = Boolean(conn && conn.status === "active");
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
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
