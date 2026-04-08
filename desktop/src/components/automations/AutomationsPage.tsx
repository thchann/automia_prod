import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Instagram, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAutomations,
  listAutomationTypes,
  startInstagramOAuth,
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

/** Product flag: hide connect for comment bot until the backend is ready. */
const COMMENT_BOT_CONNECT_ENABLED = false;

/**
 * Map API automation types to catalog buckets.
 * Comment must be explicit on `code` only — matching "comment" in `name` false-positives
 * (e.g. marketing copy) was counting DM connections on the Comment Bot card.
 */
function classifyInstagramType(t: AutomationTypeItem): "dm" | "comment" {
  const code = t.code.toLowerCase();
  const name = t.name.toLowerCase();
  if (code === "instagram_comment" || code === "instagram_comments") {
    return "comment";
  }
  if (code === "instagram_dm" || /\bdm\b/.test(code) || /\bdm\b/.test(name)) {
    return "dm";
  }
  // Single legacy "Instagram" type: DM inventory only, never comment.
  return "dm";
}

function typeIdsForCatalogKey(types: AutomationTypeItem[], key: BotCatalogKey): Set<string> {
  const ids = new Set<string>();
  for (const t of types) {
    if (t.platform !== "instagram") continue;
    const bucket = classifyInstagramType(t);
    if (key === "instagram_comment" && bucket === "comment") ids.add(t.id);
    if (key === "instagram_dm" && bucket === "dm") ids.add(t.id);
  }
  return ids;
}

function countAutomationsForCatalog(
  automations: AutomationItem[],
  types: AutomationTypeItem[],
  key: BotCatalogKey,
): number {
  if (key === "instagram_comment" && !COMMENT_BOT_CONNECT_ENABLED) {
    return 0;
  }
  const ids = typeIdsForCatalogKey(types, key);
  if (ids.size === 0) return 0;
  return automations.filter((a) => ids.has(a.automation_type_id)).length;
}

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
      ig.find((t) => classifyInstagramType(t) === "dm" && (t.code === "instagram_dm" || /\bdm\b/i.test(t.code))) ??
      ig.find((t) => classifyInstagramType(t) === "dm") ??
      ig[0]
    );
  }
  return (
    ig.find((t) => classifyInstagramType(t) === "comment" && (t.code === "instagram_comment" || t.code === "instagram_comments")) ??
    ig.find((t) => classifyInstagramType(t) === "comment") ??
    undefined
  );
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
    if (key === "instagram_comment" && !COMMENT_BOT_CONNECT_ENABLED) {
      return;
    }
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

  /** Do not surface `platform_page_id` in the UI. */
  const accountSubtitle = () => tx("Instagram account", "Cuenta de Instagram");

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 text-foreground">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">
          {tx("All Automations", "Todas las automatizaciones")}
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" className="shrink-0 gap-1.5">
              <Plus className="h-4 w-4" aria-hidden />
              {tx("Connect bot", "Conectar bot")}
              <ChevronDown className="h-4 w-4 opacity-80" aria-hidden />
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
              className={COMMENT_BOT_CONNECT_ENABLED ? "cursor-pointer" : "cursor-not-allowed opacity-50"}
              disabled={!COMMENT_BOT_CONNECT_ENABLED}
              onClick={() => connectBotFromCatalog("instagram_comment")}
            >
              {tx("Instagram Comment Bot", "Bot de comentarios de Instagram")}
              {!COMMENT_BOT_CONNECT_ENABLED ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  {tx("(coming soon)", "(pronto)")}
                </span>
              ) : null}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex shrink-0 items-center gap-0 border-b border-border">
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

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {loadingTypes || loadingAuto ? (
          <p className="text-sm text-muted-foreground">{tx("Loading…", "Cargando…")}</p>
        ) : tab === "all" ? (
          <div className="grid grid-cols-1 gap-4 pb-4 md:grid-cols-2 xl:grid-cols-3">
            {BOT_ORDER.map((botKey) => {
              const { title, description } = botCatalogMeta(botKey, tx);
              const hasConnected = countAutomationsForCatalog(automations, types, botKey) > 0;
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
                    <div className="mt-auto flex h-8 flex-wrap items-center justify-end gap-2 pr-1">
                      {hasConnected ? (
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
            {tx("No connected automations yet.", "Aún no hay automatizaciones conectadas.")}
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
                      <p className="text-sm text-muted-foreground line-clamp-2">{accountSubtitle()}</p>
                    </div>
                    <div className="mt-auto flex h-8 items-center pr-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full px-4"
                        onClick={() => setManageTarget({ type: typeItem, automation: conn })}
                      >
                        {tx("Manage", "Gestionar")}
                      </Button>
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
