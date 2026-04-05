import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Instagram, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAutomations,
  listAutomationTypes,
  startInstagramOAuth,
  updateAutomation,
} from "@automia/api";
import type { AutomationItem, AutomationTypeItem } from "@automia/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/i18n/LanguageProvider";
import { toast } from "@/components/ui/sonner";
import { AutomationManageDialog } from "./AutomationManageDialog";

type AutomationsTab = "all" | "connected";

/** Catalog keys we expose in the UI; server may map via type id or code query params. */
type BotCatalogKey = "instagram_dm" | "instagram_comment";

const BOT_ORDER: BotCatalogKey[] = ["instagram_dm", "instagram_comment"];

function botCatalogMeta(
  key: BotCatalogKey,
  tx: (en: string, es: string) => string,
): { title: string; description: string } {
  const meta: Record<BotCatalogKey, { title: [string, string]; description: [string, string] }> = {
    instagram_dm: {
      title: ["Instagram DM Bot", "Bot de DM de Instagram"],
      description: [
        "Automate replies and workflows for Instagram direct messages.",
        "Automatiza respuestas y flujos para mensajes directos de Instagram.",
      ],
    },
    instagram_comment: {
      title: ["Instagram Comment Bot", "Bot de comentarios de Instagram"],
      description: [
        "Automate engagement on comments under your Instagram posts.",
        "Automatiza la interacción con comentarios en tus publicaciones de Instagram.",
      ],
    },
  };
  const m = meta[key];
  return { title: tx(m.title[0], m.title[1]), description: tx(m.description[0], m.description[1]) };
}

function resolveTypeForBot(types: AutomationTypeItem[], key: BotCatalogKey): AutomationTypeItem | undefined {
  const ig = types.filter((t) => t.platform === "instagram");
  if (key === "instagram_dm") {
    return (
      ig.find((t) => t.code === "instagram_dm") ??
      ig.find((t) => /\bdm\b/i.test(t.code) || /\bdm\b/i.test(t.name)) ??
      ig[0]
    );
  }
  return (
    ig.find((t) => t.code === "instagram_comment" || t.code === "instagram_comments") ??
    ig.find((t) => /\bcomment/i.test(t.code) || /\bcomment/i.test(t.name)) ??
    ig[1] ??
    ig[0]
  );
}

function automationsForType(automations: AutomationItem[], typeId: string): AutomationItem[] {
  return automations.filter((a) => a.automation_type_id === typeId);
}

export function AutomationsPage() {
  const { tx } = useLanguage();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AutomationsTab>("all");
  const [manageTarget, setManageTarget] = useState<{
    type: AutomationTypeItem;
    automation: AutomationItem;
  } | null>(null);

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

  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t] as const)), [types]);

  const sortedAutomations = useMemo(() => {
    return [...automations].sort((a, b) => {
      const tb = Date.parse(b.updated_at ?? b.created_at);
      const ta = Date.parse(a.updated_at ?? a.created_at);
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
  }, [automations]);

  const tabs: { key: AutomationsTab; label: string }[] = [
    { key: "all", label: tx("All", "Todas") },
    { key: "connected", label: tx("Connected", "Conectadas") },
  ];

  const runInstagramOAuth = async (opts?: { automationTypeId?: string; automationTypeCode?: BotCatalogKey }) => {
    try {
      await startInstagramOAuth({
        automationTypeId: opts?.automationTypeId,
        automationTypeCode: opts?.automationTypeCode,
      });
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
    } catch {
      toast.error(tx("Could not start Instagram connection", "No se pudo conectar Instagram"));
    }
  };

  const connectBotFromCatalog = (key: BotCatalogKey) => {
    const resolved = resolveTypeForBot(types, key);
    if (resolved && !resolved.is_active) {
      toast.error(
        tx("This bot is not available yet.", "Este bot aún no está disponible."),
      );
      return;
    }
    void runInstagramOAuth({
      automationTypeId: resolved?.id,
      automationTypeCode: resolved?.id ? undefined : key,
    });
  };

  const refreshInstagramForType = (typeItem: AutomationTypeItem) => {
    void runInstagramOAuth({ automationTypeId: typeItem.id });
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

  const accountLabel = (row: AutomationItem) => {
    const raw = row.platform_page_id?.trim();
    if (!raw) return tx("Instagram account", "Cuenta de Instagram");
    return raw.length > 28 ? `${raw.slice(0, 26)}…` : raw;
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 text-foreground">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border">
        <div className="flex items-center gap-0">
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 rounded-md px-3">
              <Plus className="h-4 w-4" aria-hidden />
              {tx("Connect bot", "Conectar bot")}
              <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[14rem]">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => connectBotFromCatalog("instagram_dm")}
            >
              {tx("Instagram DM Bot", "Bot de DM de Instagram")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => connectBotFromCatalog("instagram_comment")}
            >
              {tx("Instagram Comment Bot", "Bot de comentarios de Instagram")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {loadingTypes || loadingAuto ? (
          <p className="text-sm text-muted-foreground">{tx("Loading…", "Cargando…")}</p>
        ) : tab === "all" ? (
          <div className="grid grid-cols-1 gap-4 pb-4 md:grid-cols-2 xl:grid-cols-3">
            {BOT_ORDER.map((botKey) => {
              const resolved = resolveTypeForBot(types, botKey);
              const { title, description } = botCatalogMeta(botKey, tx);
              const conns = resolved ? automationsForType(automations, resolved.id) : [];
              const count = conns.length;
              const isIg = true;

              return (
                <div
                  key={botKey}
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
                      <div className="font-semibold">{title}</div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
                    </div>
                    <div className="mt-auto flex h-8 flex-wrap items-center justify-between gap-2 pr-1">
                      <span className="text-xs text-muted-foreground">
                        {count === 0
                          ? tx("No accounts connected", "Sin cuentas conectadas")
                          : count === 1
                            ? tx("1 account connected", "1 cuenta conectada")
                            : tx(`${count} accounts connected`, `${count} cuentas conectadas`)}
                      </span>
                      {count > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-full px-3 text-xs"
                          onClick={() => setTab("connected")}
                        >
                          {tx("View connected", "Ver conectadas")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : sortedAutomations.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">
            {tx("No connected automations yet.", "Aun no hay automatizaciones conectadas.")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 pb-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedAutomations.map((conn) => {
              const t = typeById.get(conn.automation_type_id);
              const typeItem =
                t ??
                ({
                  id: conn.automation_type_id,
                  platform: "instagram",
                  code: "unknown",
                  name: tx("Automation", "Automatizacion"),
                  description: null,
                  icon_url: null,
                  required_scopes: null,
                  is_active: true,
                  display_order: 0,
                } satisfies AutomationTypeItem);
              const isIg = typeItem.platform === "instagram";
              const isActive = conn.status === "active";

              return (
                <div
                  key={conn.id}
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
                      <div className="font-semibold">{typeItem.name}</div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{accountLabel(conn)}</p>
                    </div>
                    <div className="mt-auto flex h-8 items-center justify-between pr-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full px-4"
                        onClick={() => setManageTarget({ type: typeItem, automation: conn })}
                      >
                        {tx("Manage", "Gestionar")}
                      </Button>
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {manageTarget ? (
        <AutomationManageDialog
          open
          onOpenChange={(open) => !open && setManageTarget(null)}
          typeItem={manageTarget.type}
          automation={manageTarget.automation}
          onRefreshInstagramAccess={() => refreshInstagramForType(manageTarget.type)}
        />
      ) : null}
    </div>
  );
}
