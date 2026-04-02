import { ExternalLink, Instagram } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getInstagramAuthorizeUrl,
  listAutomations,
  listAutomationTypes,
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

const AutomationsPage = () => {
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
      const { url } = await getInstagramAuthorizeUrl();
      window.location.href = url;
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
          })
        )}
      </div>
    </div>
  );
};

export default AutomationsPage;
