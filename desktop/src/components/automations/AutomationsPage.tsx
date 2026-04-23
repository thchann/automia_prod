import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  createAutomation,
  listAutomations,
  listAutomationTypes,
  startInstagramOAuth,
  updateAutomation,
  updateAutomationConfig,
} from "@automia/api";
import type { AutomationItem, AutomationTypeItem } from "@automia/api";
import { ChevronDown, Instagram } from "lucide-react";

import {
  AgentBuilderPanel,
  type AgentBuilderCard,
  type DeploymentRecord,
} from "@/components/automations/AgentBuilderPanel";
import { DeploymentConfigModal } from "@/components/automations/DeploymentConfigModal";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { useLanguage } from "@/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

type BotKind = "dm" | "comment";

const COMMENT_BOT_TYPE_CODES = new Set(["comments_bot", "instagram_comment", "instagram_comments"]);

function classifyInstagramType(t: AutomationTypeItem): BotKind {
  const code = t.code.toLowerCase();
  const name = t.name.toLowerCase();
  if (COMMENT_BOT_TYPE_CODES.has(code)) {
    return "comment";
  }
  if (code === "instagram_dm" || /\bdm\b/.test(code) || /\bdm\b/.test(name)) {
    return "dm";
  }
  return "dm";
}

function resolveTypeForBot(types: AutomationTypeItem[], key: BotKind): AutomationTypeItem | undefined {
  const igTypes = types.filter((t) => t.platform === "instagram");
  if (key === "dm") {
    return (
      igTypes.find((t) => classifyInstagramType(t) === "dm" && (t.code === "instagram_dm" || /\bdm\b/i.test(t.code))) ??
      igTypes.find((t) => classifyInstagramType(t) === "dm")
    );
  }
  return (
    igTypes.find((t) => classifyInstagramType(t) === "comment" && COMMENT_BOT_TYPE_CODES.has(t.code.toLowerCase())) ??
    igTypes.find((t) => classifyInstagramType(t) === "comment")
  );
}

function labelForBot(kind: BotKind, tx: (enText: string, esText: string) => string): string {
  return kind === "dm"
    ? tx("Instagram - DM Bot", "Instagram - Bot de MD")
    : tx("Instagram - Comment Bot", "Instagram - Bot de Comentarios");
}

function mapAutomationToDeployment(
  a: AutomationItem,
  kind: BotKind,
  tx: (enText: string, esText: string) => string,
  locale: string,
): AgentBuilderCard["deployments"][number] {
  const username = a.platform_username?.trim();
  const displayName = a.platform_display_name?.trim();
  const name =
    displayName || (username ? (username.startsWith("@") ? username : `@${username}`) : labelForBot(kind, tx));
  const isActive = a.status === "active";
  return {
    id: a.id,
    name,
    source: labelForBot(kind, tx),
    updatedAt: tx("Updated ", "Actualizado ") + new Date(a.updated_at ?? a.created_at).toLocaleString(locale),
    domain: a.platform_page_id || tx("No public endpoint", "Sin endpoint publico"),
    region: "instagram",
    replica: tx("1 Replica", "1 Replica"),
    status: isActive ? "active" : "offline",
    statusLabel: isActive
      ? tx("Deployment active", "Implementacion activa")
      : tx("Deployment inactive", "Implementacion inactiva"),
    config: a.config,
  };
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function DatabaseCardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="5.25" rx="6.5" ry="2.75" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 5.5v5c0 1.5 2.9 2.75 6.5 2.75s6.5-1.25 6.5-2.75v-5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 10.5v5c0 1.5 2.9 2.75 6.5 2.75s6.5-1.25 6.5-2.75v-5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function AutomationsPage() {
  const { tx, locale } = useLanguage();
  const queryClient = useQueryClient();
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [editingDeployment, setEditingDeployment] = useState<DeploymentRecord | null>(null);
  const [editingBotKind, setEditingBotKind] = useState<BotKind | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [pendingDeactivate, setPendingDeactivate] = useState<DeploymentRecord | null>(null);
  const createMenuRef = useRef<HTMLDivElement | null>(null);

  const { data: typesData } = useQuery({
    queryKey: ["automation-types"],
    queryFn: () => listAutomationTypes(),
  });
  const { data: automationsData } = useQuery({
    queryKey: ["automations"],
    queryFn: () => listAutomations(),
  });

  const types = typesData?.types ?? [];
  const automations = automationsData?.automations ?? [];

  const cards = useMemo<AgentBuilderCard[]>(() => {
    const buildCard = (kind: BotKind): AgentBuilderCard => {
      const type = resolveTypeForBot(types, kind);
      const deployments = type
        ? automations
            .filter((a) => a.automation_type_id === type.id)
            .map((a) => mapAutomationToDeployment(a, kind, tx, locale))
        : [];
      const hasActive = deployments.some((d) => d.status === "active");
      return {
        id: kind,
        title: labelForBot(kind, tx),
        description:
          kind === "dm"
            ? tx(
                "Automates replies to Instagram direct messages.",
                "Automatiza respuestas a mensajes directos de Instagram.",
              )
            : tx(
                "Automatically replies to matching Instagram comments.",
                "Responde automaticamente a comentarios de Instagram que coinciden.",
              ),
        footer: tx("Automation", "Automatizacion"),
        service: labelForBot(kind, tx),
        region: "instagram",
        replica: tx("1 Replica", "1 Replica"),
        kind: kind === "comment" ? "database" : "service",
        status: hasActive ? "online" : "offline",
        deployments,
      };
    };

    const comingSoonCard = (id: string): AgentBuilderCard => ({
      id,
      title: tx("Coming soon", "Proximamente"),
      description: "",
      footer: tx("Automation", "Automatizacion"),
      service: tx("Coming soon", "Proximamente"),
      region: "instagram",
      replica: tx("1 Replica", "1 Replica"),
      kind: "database",
      status: "offline",
      deployments: [],
    });

    return [
      buildCard("dm"),
      buildCard("comment"),
      comingSoonCard("coming-soon-1"),
      comingSoonCard("coming-soon-2"),
    ];
  }, [types, automations, tx, locale]);

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedCardId) ?? null,
    [cards, selectedCardId],
  );

  const createDeploymentForBot = async (kind: BotKind) => {
    const type = resolveTypeForBot(types, kind);
    if (!type) {
      toast.error(tx("This automation type is unavailable.", "Este tipo de automatizacion no esta disponible."));
      return;
    }
    try {
      await createAutomation({ automation_type_id: type.id });
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
      setShowCreateMenu(false);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 400 || e.status === 422)) {
        try {
          await startInstagramOAuth();
          await queryClient.invalidateQueries({ queryKey: ["automations"] });
        } catch {
          const detail =
            typeof e.detail === "string"
              ? e.detail
              : e && typeof e === "object" && "message" in e
                ? String((e as { message: unknown }).message)
                : e.message;
          toast.error(detail || tx("Connect Instagram first.", "Conecta Instagram primero."));
        }
        return;
      }
      if (e instanceof ApiError && e.status === 409) {
        toast.error(tx("This deployment already exists.", "Esta implementacion ya existe."));
        return;
      }
      if (e instanceof ApiError) {
        const detail =
          typeof e.detail === "string"
            ? e.detail
            : e && typeof e === "object" && "message" in e
              ? String((e as { message: unknown }).message)
              : e.message;
        toast.error(detail || tx("Could not create deployment.", "No se pudo crear la implementacion."));
        return;
      }
      toast.error(tx("Could not create deployment.", "No se pudo crear la implementacion."));
    }
  };

  useEffect(() => {
    if (!showCreateMenu) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (createMenuRef.current?.contains(target)) return;
      setShowCreateMenu(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [showCreateMenu]);

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-4 overflow-hidden bg-card text-foreground">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">{tx("All Automations", "Todas las automatizaciones")}</h1>
      </div>

      <section className="flex min-h-0 flex-1 flex-col bg-card">

        <div className="mx-auto mt-8 mb-8 flex w-full max-w-[760px] flex-col items-center px-4 pb-2 pt-2 text-center sm:mt-12 sm:mb-12 sm:pb-3">
          <h2 className="text-balance text-xl font-semibold tracking-tight text-foreground">
            {tx("Create an automation", "Crear una automatizacion")}
          </h2>
          <p className="mt-3 max-w-[780px] text-balance text-lg font-medium tracking-tight text-muted-foreground">
            {tx(
              "Build an automation workflow with custom logic",
              "Crea un flujo de automatizacion con logica personalizada",
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {tx(
              "Use Create to add a DM bot or Comment bot deployment.",
              "Usa Crear para agregar una implementacion de bot de MD o de Comentarios.",
            )}
          </p>
          <div ref={createMenuRef} className="relative mt-3 mb-3">
            <Button
              variant="builder"
              size="builder"
              className="h-10 min-w-[108px] rounded-full px-3 text-[0.8rem]"
              onClick={() => setShowCreateMenu((v) => !v)}
            >
              <PlusIcon />
              {tx("Create", "Crear")}
              <ChevronDown className="h-4 w-4" />
            </Button>
            {showCreateMenu ? (
              <div className="absolute left-1/2 top-full z-30 mt-2 w-60 -translate-x-1/2 rounded-lg border border-border bg-popover py-1 shadow-lg">
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-accent"
                  onClick={() => void createDeploymentForBot("dm")}
                >
                  {tx("Create DM Bot deployment", "Crear implementacion de Bot de MD")}
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-accent"
                  onClick={() => void createDeploymentForBot("comment")}
                >
                  {tx("Create Comment Bot deployment", "Crear implementacion de Bot de Comentarios")}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="pb-4 pt-3">
          <div className="grid w-full grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
            const isSelected = selectedCard?.id === card.id;
            const isComingSoon = card.id.startsWith("coming-soon-");
            const isComingSoonDatabase = isComingSoon && card.kind === "database";
            const cardClass =
              "flex min-h-[188px] flex-col rounded-[1.75rem] border border-border bg-card p-7 text-left transition duration-200 ease-out hover:-translate-y-0.5 hover:border-accent hover:bg-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => !isComingSoon && setSelectedCardId(card.id)}
                disabled={isComingSoon}
                aria-disabled={isComingSoon}
                className={cn(
                  cardClass,
                  isSelected && "border-selection bg-accent/30 ring-1 ring-selection/40",
                  isComingSoon && "cursor-not-allowed opacity-70 hover:translate-y-0 hover:border-border hover:bg-card",
                )}
              >
                <div className="flex h-full min-w-0 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center">
                      {isComingSoonDatabase ? (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background text-muted-foreground">
                          <DatabaseCardIcon />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal text-signal-foreground">
                          <Instagram className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 min-w-0">
                    <h3 className="truncate text-sm font-medium text-card-foreground">
                      {card.title}
                    </h3>
                    {card.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{card.description}</p>
                    ) : null}
                  </div>

                  {!isComingSoon ? (
                    <div className="my-3 min-w-0">
                      <div className="inline-flex items-center gap-3 text-sm text-muted-foreground">
                        <span
                          className={cn(
                            "h-3 w-3 rounded-full border border-border",
                            card.status === "online"
                              ? "bg-success shadow-[0_0_0_4px_hsl(var(--success-surface))]"
                              : "bg-muted-foreground/40",
                          )}
                        />
                        <span>{card.status === "online" ? tx("Online", "En linea") : tx("Service is offline", "El servicio esta inactivo")}</span>
                      </div>
                    </div>
                  ) : null}

                  {card.infrastructureLabel ? (
                    <div className="pt-3 min-w-0">
                      <div className="truncate rounded-t-xl border-t border-border/80 pt-4 text-[0.98rem] text-muted-foreground">
                        {card.infrastructureLabel}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-auto pt-1">
                    <p className="text-xs text-muted-foreground">{card.footer}</p>
                  </div>
                </div>
              </button>
            );
          })}
          </div>
        </div>
      </section>

      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-20 transition-opacity duration-300",
          selectedCard ? "opacity-100" : "opacity-0",
        )}
        aria-hidden={!selectedCard}
      >
        <div
          className={cn(
            "absolute inset-0 bg-background/10 backdrop-blur-[1px] transition-opacity duration-300",
            selectedCard ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setSelectedCardId(null)}
        />
        <aside
          className={cn(
            "absolute left-1/2 top-1/2 h-[min(88vh,860px)] w-[min(92vw,1120px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.25rem] border border-border bg-builder-grid transition-all duration-300 ease-out",
            selectedCard ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
          )}
        >
          <AgentBuilderPanel
            card={selectedCard}
            onClose={() => setSelectedCardId(null)}
            onCreateDeployment={() => {
              if (selectedCard?.id === "dm" || selectedCard?.id === "comment") {
                void createDeploymentForBot(selectedCard.id);
              }
            }}
            onViewDeployment={(deployment) => {
              setEditingDeployment(deployment);
              if (selectedCard?.id === "dm" || selectedCard?.id === "comment") {
                setEditingBotKind(selectedCard.id);
              } else {
                setEditingBotKind(null);
              }
            }}
            onToggleDeploymentStatus={(deployment, nextStatus) => {
              if (nextStatus === "paused") {
                setPendingDeactivate(deployment);
                return;
              }
              void (async () => {
                try {
                  await updateAutomation(deployment.id, { status: "active" });
                  await queryClient.invalidateQueries({ queryKey: ["automations"] });
                  toast.success(tx("Automation reactivated.", "Automatizacion reactivada."));
                } catch (e) {
                  if (e instanceof ApiError) {
                    const detail =
                      typeof e.detail === "string"
                        ? e.detail
                        : e.message;
                    toast.error(detail || tx("Could not reactivate automation.", "No se pudo reactivar la automatizacion."));
                    return;
                  }
                  toast.error(tx("Could not reactivate automation.", "No se pudo reactivar la automatizacion."));
                }
              })();
            }}
          />
        </aside>
      </div>

      <DeploymentConfigModal
        open={!!editingDeployment}
        deploymentName={editingDeployment?.name ?? tx("deployment", "implementacion")}
        botKind={editingBotKind === "comment" ? "comment" : "dm"}
        initialConfig={editingDeployment?.config ?? null}
        saving={savingConfig}
        onClose={() => {
          setEditingDeployment(null);
          setEditingBotKind(null);
        }}
        onSave={async (nextConfig) => {
          if (!editingDeployment) return;
          try {
            setSavingConfig(true);
            await updateAutomationConfig(editingDeployment.id, { config: nextConfig });
            await queryClient.invalidateQueries({ queryKey: ["automations"] });
            setEditingDeployment(null);
            setEditingBotKind(null);
            toast.success(tx("Deployment config updated.", "Configuracion de implementacion actualizada."));
          } catch {
            toast.error(tx("Could not update deployment config.", "No se pudo actualizar la configuracion de implementacion."));
          } finally {
            setSavingConfig(false);
          }
        }}
      />

      <AlertDialog open={!!pendingDeactivate} onOpenChange={(open) => !open && setPendingDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tx("Deactivate automation?", "¿Desactivar automatizacion?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tx("This will stop responses for ", "Esto detendra las respuestas de ")}
              {pendingDeactivate?.name ?? tx("this deployment", "esta implementacion")}
              {tx(" until you reactivate it.", " hasta que la reactives.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tx("Cancel", "Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingDeactivate) return;
                void (async () => {
                  try {
                    await updateAutomation(pendingDeactivate.id, { status: "paused" });
                    await queryClient.invalidateQueries({ queryKey: ["automations"] });
                    toast.success(tx("Automation deactivated.", "Automatizacion desactivada."));
                  } catch (e) {
                    if (e instanceof ApiError) {
                      const detail = typeof e.detail === "string" ? e.detail : e.message;
                      toast.error(detail || tx("Could not deactivate automation.", "No se pudo desactivar la automatizacion."));
                    } else {
                      toast.error(tx("Could not deactivate automation.", "No se pudo desactivar la automatizacion."));
                    }
                  } finally {
                    setPendingDeactivate(null);
                  }
                })();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tx("Deactivate", "Desactivar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
