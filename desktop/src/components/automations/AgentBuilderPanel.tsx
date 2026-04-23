import { useEffect, useMemo, useState } from "react";
import { Instagram } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageProvider";

export type DeploymentRecord = {
  id: string;
  name: string;
  source: string;
  updatedAt: string;
  domain: string;
  region: string;
  replica: string;
  status: "active" | "offline";
  statusLabel: string;
  config: Record<string, unknown> | null;
};

export type AgentBuilderCard = {
  id: string;
  title: string;
  description: string;
  footer: string;
  service: string;
  region: string;
  replica: string;
  kind: "database" | "service";
  status: "online" | "offline";
  infrastructureLabel?: string;
  deployments: DeploymentRecord[];
};

type AgentBuilderPanelProps = {
  card: AgentBuilderCard | null;
  onClose: () => void;
  onCreateDeployment: () => void;
  onViewDeployment: (deployment: DeploymentRecord) => void;
  onToggleDeploymentStatus: (deployment: DeploymentRecord, nextStatus: "active" | "paused") => void;
};

function InstagramCardIcon() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal text-signal-foreground">
      <Instagram className="h-5 w-5" />
    </div>
  );
}

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="19" r="1.8" fill="currentColor" />
    </svg>
  );
}

function StatusCheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12.5 9 17l11-11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AgentBuilderPanel({
  card,
  onClose,
  onCreateDeployment,
  onViewDeployment,
  onToggleDeploymentStatus,
}: AgentBuilderPanelProps) {
  const { tx } = useLanguage();
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  useEffect(() => {
    setSelectedDeploymentId(card?.deployments[0]?.id ?? null);
    setActionMenuOpen(false);
  }, [card]);

  const selectedDeployment = useMemo(
    () => card?.deployments.find((deployment) => deployment.id === selectedDeploymentId) ?? card?.deployments[0] ?? null,
    [card, selectedDeploymentId],
  );

  if (!card) {
    return null;
  }

  return (
    <div className="flex h-full flex-col rounded-[1.25rem] border border-border bg-panel text-panel-foreground shadow-builder-panel">
      <div className="border-b border-border px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="text-panel-foreground">
              <InstagramCardIcon />
            </div>
            <div>
              <h2 className="text-[1.85rem] font-semibold tracking-tight text-panel-foreground sm:text-[2rem]">{card.service}</h2>
              <p className="mt-2 text-[0.98rem] text-muted-foreground">{card.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={tx("Close panel", "Cerrar panel")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-8 border-b border-border/80 pb-5 text-[1.05rem] text-panel-foreground">
          {tx("Deployments", "Implementaciones")}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
        <div className="space-y-8">
          {card.deployments.length > 0 ? (
            <>
              <section>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className="text-[1.15rem] font-medium text-panel-foreground">
                    {tx("All deployments", "Todas las implementaciones")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {tx("Select a deployment to inspect it", "Selecciona una implementacion para inspeccionarla")}
                  </p>
                </div>

                <div className="grid gap-3">
                  {card.deployments.map((deployment) => {
                    const isSelected = selectedDeployment?.id === deployment.id;

                    return (
                      <button
                        key={deployment.id}
                        type="button"
                        onClick={() => {
                          setSelectedDeploymentId(deployment.id);
                          setActionMenuOpen(false);
                        }}
                        className={cn(
                          "rounded-2xl border border-border bg-card/35 px-5 py-4 text-left transition hover:border-selection hover:bg-accent/25",
                          isSelected && "border-selection bg-accent/30 ring-1 ring-selection/35",
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="truncate text-[1rem] font-medium text-panel-foreground">{deployment.name}</p>
                            <p className="mt-1 truncate text-sm text-muted-foreground">{deployment.source}</p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex min-w-[88px] items-center justify-center rounded-full px-3 py-1 text-sm font-medium",
                              deployment.status === "active"
                                ? "bg-success-surface text-success"
                                : "bg-destructive/15 text-destructive",
                            )}
                          >
                            {deployment.status === "active" ? tx("ACTIVE", "ACTIVA") : tx("DEACTIVATED", "DESACTIVADA")}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {selectedDeployment ? (
                <>
                  <section className="rounded-[1.35rem] border border-success/30 bg-success-surface/45">
                    <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5 sm:px-6">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-card text-panel-foreground shadow-builder-card">
                          <Instagram className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-3 py-1 text-sm font-medium",
                                selectedDeployment.status === "active"
                                  ? "bg-success-surface text-success"
                                  : "bg-destructive/15 text-destructive",
                              )}
                            >
                              {selectedDeployment.status === "active" ? tx("ACTIVE", "ACTIVA") : tx("DEACTIVATED", "DESACTIVADA")}
                            </span>
                            <h3 className="text-[1.2rem] font-medium text-panel-foreground">{selectedDeployment.name}</h3>
                          </div>
                          <p className="mt-2 truncate text-[1.05rem] text-panel-foreground">{selectedDeployment.source}</p>
                          <p className="mt-1 text-[0.98rem] text-muted-foreground">{selectedDeployment.updatedAt}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onViewDeployment(selectedDeployment)}
                          className="rounded-xl border border-border bg-card/70 px-4 py-2 text-[1rem] text-panel-foreground transition hover:bg-accent/35"
                        >
                          {tx("View deployment", "Ver implementacion")}
                        </button>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActionMenuOpen((open) => !open)}
                            className="rounded-xl border border-border bg-card/70 p-2.5 text-muted-foreground transition hover:bg-accent/35 hover:text-panel-foreground"
                            aria-label={tx("Open deployment actions", "Abrir acciones de implementacion")}
                          >
                            <MoreIcon />
                          </button>

                          {actionMenuOpen ? (
                            <div className="absolute right-0 top-[calc(100%+0.75rem)] z-10 min-w-[220px] rounded-2xl border border-border bg-panel p-2 shadow-builder-panel">
                              {[
                                selectedDeployment.status === "active"
                                  ? { key: "deactivate" as const, label: tx("Deactivate automation", "Desactivar automatizacion"), tone: "destructive" as const }
                                  : { key: "reactivate" as const, label: tx("Reactivate automation", "Reactivar automatizacion"), tone: "success" as const },
                              ].map((item) => (
                                <button
                                  key={item.label}
                                  type="button"
                                  onClick={() => {
                                    if (item.key === "deactivate") {
                                      onToggleDeploymentStatus(selectedDeployment, "paused");
                                    }
                                    if (item.key === "reactivate") {
                                      onToggleDeploymentStatus(selectedDeployment, "active");
                                    }
                                    setActionMenuOpen(false);
                                  }}
                                  className={cn(
                                    "flex w-full items-center rounded-xl px-4 py-3 text-left text-[1rem] transition hover:bg-accent/35",
                                    item.tone === "destructive"
                                      ? "text-destructive"
                                      : item.tone === "success"
                                        ? "text-success"
                                        : "text-panel-foreground",
                                  )}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-success/20 px-5 py-4 sm:px-6">
                      <div className="inline-flex items-center gap-3 text-[1.05rem] text-success">
                        <StatusCheckIcon />
                        <span>{selectedDeployment.statusLabel}</span>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[1.35rem] border border-dashed border-border px-8 py-10 text-center">
                    <p className="text-[1.35rem] text-muted-foreground">
                      {selectedDeployment.status === "active"
                        ? tx(
                            "Create additional deployments for this service.",
                            "Crea implementaciones adicionales para este servicio.",
                          )
                        : tx(
                            "There is no active deployment for this service.",
                            "No hay implementaciones activas para este servicio.",
                          )}
                    </p>
                    <button
                      type="button"
                      onClick={onCreateDeployment}
                      className="mt-4 inline-flex items-center justify-center text-[1.1rem] text-panel-foreground underline underline-offset-4 transition hover:text-foreground"
                    >
                      {selectedDeployment.status === "active"
                        ? tx("Create more deployments ->", "Crear mas implementaciones ->")
                        : tx("Make a deployment to get started ->", "Crea una implementacion para comenzar ->")}
                    </button>
                  </section>
                </>
              ) : null}
            </>
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-border px-8 py-10 text-center">
              <p className="text-[1.35rem] text-muted-foreground">
                {tx("There are no deployments for this service yet.", "Aun no hay implementaciones para este servicio.")}
              </p>
              <button
                type="button"
                onClick={onCreateDeployment}
                className="mt-4 inline-flex items-center justify-center text-[1.05rem] text-panel-foreground underline underline-offset-4 transition hover:text-foreground"
              >
                {tx("Make a deployment to get started ->", "Crea una implementacion para comenzar ->")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
