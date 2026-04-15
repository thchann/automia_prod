import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Car as CarIcon, Clock, Layers, Plug, TrendingUp, Users, Zap } from "lucide-react";
import {
  ApiError,
  createCar,
  createLead,
  getCar,
  getLead,
  listCars,
  listLeadStatuses,
  listLeads,
  listAutomations,
  getLead,
  updateCar,
  updateLead,
  removeLeadCarLink,
  type AutomationItem,
  type LeadsListResponse,
} from "@automia/api";
import { Car as CarType, Lead } from "@/types/leads";
import { CarEditDialog } from "@/components/cars/CarEditDialog";
import { LeadEditDialog } from "@/components/leads/LeadEditDialog";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import {
  mapCarFromApi,
  mapLeadFromApi,
  mapStatusFromApi,
  hydrateLeadResponseCarLinks,
  mergeLeadResponseWithClientCarLinks,
  patchLeadRowWithJunctionCars,
  patchLeadsListCache,
  carToCreatePayload,
  carToUpdatePayload,
  leadToCreatePayload,
  leadToUpdatePayload,
  leadToUpdatePayloadOmitCarLinks,
  syncLeadCarJunctionLinks,
} from "@/lib/apiMappers";
import { getAllCarIdsForLead } from "@/lib/leadCarLinks";
import { isDraftRecordId } from "@/lib/draftIds";
import {
  DASHBOARD_PLACEHOLDER_WIDGETS,
  type DashboardNavTarget,
  type DashboardWidgetId,
} from "@/lib/dashboardWidgetContent";

function displayDate(value: string | null, locale: string, missingLabel: string) {
  if (!value) return missingLabel;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return missingLabel;
  return d.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

function asTimestamp(value: string | null) {
  if (!value) return 0;
  const n = new Date(value).getTime();
  return Number.isNaN(n) ? 0 : n;
}

const placeholderIcon = {
  pipeline_summary: BarChart3,
  response_metrics: Layers,
  integrations_pulse: Plug,
} as const;

function isActiveAutomation(a: AutomationItem): boolean {
  const s = (a.status || "").toLowerCase();
  if (!s) return true;
  return !["disabled", "inactive", "error", "disconnected", "revoked"].includes(s);
}

function DashboardWidgetPlaceholderBody({
  id,
  tx,
}: {
  id: DashboardWidgetId;
  tx: (en: string, es: string) => string;
}) {
  if (id === "pipeline_summary") {
    return (
      <div className="mt-4 space-y-2.5">
        {[
          { label: "New", labelEs: "Nuevo", w: 0.38 },
          { label: "Qualified", labelEs: "Calif.", w: 0.22 },
          { label: "Won", labelEs: "Ganado", w: 0.12 },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-2">
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary/35" style={{ width: `${row.w * 100}%` }} />
            </div>
            <span className="w-16 shrink-0 text-right text-[10px] text-muted-foreground">
              {tx(row.label, row.labelEs)}
            </span>
          </div>
        ))}
        <p className="pt-1 text-[10px] text-muted-foreground">
          {tx("Sample layout — not live data.", "Diseño de ejemplo — sin datos en vivo.")}
        </p>
      </div>
    );
  }
  if (id === "response_metrics") {
    return (
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
          <span className="text-muted-foreground">{tx("Avg. reply time", "Tiempo prom. de resp.")}</span>
          <span className="font-mono text-muted-foreground">—</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
          <span className="text-muted-foreground">{tx("First touch", "Primer contacto")}</span>
          <span className="font-mono text-muted-foreground">—</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">{tx("Touchpoints", "Puntos de contacto")}</span>
          <span className="font-mono text-muted-foreground">—</span>
        </div>
        <div className="mt-3 h-8 overflow-hidden rounded-md bg-muted/30">
          <div className="flex h-full items-end gap-px px-1 pb-1">
            {[40, 65, 55, 80, 45, 70, 50].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm bg-primary/25" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground/90">OAuth</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-amber-500/90" />
          {tx("Pending", "Pendiente")}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground/90">{tx("Webhooks", "Webhooks")}</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          {tx("Not checked", "Sin verificar")}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground">{tx("Last checked —", "Última verificación —")}</p>
    </div>
  );
}

export interface HomeOverviewProps {
  /** Optional: mobile dashboard navigates to Leads/Cars when stat cards are tapped. */
  onNavigate?: (target: DashboardNavTarget) => void;
}

export function HomeOverview({ onNavigate }: HomeOverviewProps) {
  const { tx, locale } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editCar, setEditCar] = useState<CarType | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);

  const { data: carsData } = useQuery({
    queryKey: ["cars"],
    queryFn: async () => {
      try {
        return await listCars();
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return { cars: [] };
        throw e;
      }
    },
  });
  const { data: leadsData } = useQuery({
    queryKey: ["leads"],
    queryFn: () => listLeads({ limit: 200 }),
  });
  const { data: statusesData } = useQuery({
    queryKey: ["lead-statuses"],
    queryFn: () => listLeadStatuses(),
  });
  const { data: automationsData } = useQuery({
    queryKey: ["automations"],
    queryFn: listAutomations,
  });

  const statuses = useMemo(
    () => statusesData?.statuses.map(mapStatusFromApi) ?? [],
    [statusesData],
  );

  const cars = useMemo(() => carsData?.cars.map(mapCarFromApi) ?? [], [carsData]);
  const leads = useMemo(() => {
    if (!leadsData?.leads) return [];
    return leadsData.leads.map((r) => mapLeadFromApi(r, statuses));
  }, [leadsData, statuses]);

  const beginEditLead = (l: Lead) => {
    if (isDraftRecordId(l.id)) {
      setEditLead(l);
      return;
    }
    void (async () => {
      try {
        const r = await getLead(l.id);
        const merged = await hydrateLeadResponseCarLinks(l.id, r);
        setEditLead(mapLeadFromApi(merged, statuses));
      } catch {
        setEditLead(l);
      }
    })();
  };

  const beginEditCar = (c: CarType) => {
    if (isDraftRecordId(c.id)) {
      setEditCar(c);
      return;
    }
    void (async () => {
      try {
        const r = await getCar(c.id);
        setEditCar(mapCarFromApi(r));
      } catch {
        setEditCar(c);
      }
    })();
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? tx("Good morning", "Buenos días")
      : hour < 18
        ? tx("Good afternoon", "Buenas tardes")
        : tx("Good evening", "Buenas noches");

  const today = new Date().toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const displayName = user?.name?.trim() || tx("there", "Usuario");

  const totalLeads = leads.length;
  const pendingLeads = leads.filter((l) => l.lead_type === "pending").length;
  const buyers = leads.filter((l) => l.lead_type === "buyer").length;
  const sellers = leads.filter((l) => l.lead_type === "seller").length;
  const availableCars = cars.filter((c) => c.status === "available").length;
  const soldCars = cars.filter((c) => c.status === "sold").length;
  const carTotal = Math.max(cars.length, 1);

  const activeAutomationsCount = useMemo(() => {
    const list = automationsData?.automations ?? [];
    return list.filter(isActiveAutomation).length;
  }, [automationsData]);

  const recentActivity = useMemo(() => {
    const carEntries = cars.map((car) => ({
      id: car.id,
      type: "car" as const,
      at: car.updated_at ?? car.listed_at ?? car.created_at,
      item: car,
    }));
    const leadEntries = leads.map((lead) => ({
      id: lead.id,
      type: "lead" as const,
      at: lead.updated_at ?? lead.created_at,
      item: lead,
    }));
    return [...carEntries, ...leadEntries]
      .sort((a, b) => asTimestamp(b.at) - asTimestamp(a.at))
      .slice(0, 10);
  }, [cars, leads]);

  const cardBase = "rounded-md border border-border bg-card text-left transition-colors";
  const statCardInteractive =
    onNavigate != null ? "cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : "";

  return (
    <section className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-foreground">
          {greeting},
          <br />
          {displayName}
        </h1>
        <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{today}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onNavigate?.("Leads")}
          className={cn("w-full p-4", cardBase, statCardInteractive)}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">{tx("Active leads", "Leads activos")}</p>
            <Users size={14} className="text-muted-foreground" aria-hidden />
          </div>
          <p className="text-2xl font-extrabold tabular-nums text-foreground">{totalLeads}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-badge-pending/15 px-2 py-0.5 text-xs font-medium text-badge-pending">
              {pendingLeads} {tx("pending", "pendientes")}
            </span>
            <span className="rounded-full bg-badge-buyer/15 px-2 py-0.5 text-xs font-medium text-badge-buyer">
              {buyers} {tx("buyers", "compradores")}
            </span>
            <span className="rounded-full bg-badge-seller/15 px-2 py-0.5 text-xs font-medium text-badge-seller">
              {sellers} {tx("sellers", "vendedores")}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.("Automations")}
          className={cn("w-full p-4", cardBase, statCardInteractive)}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {tx("Active automations", "Automatizaciones activas")}
            </p>
            <Zap size={14} className="text-muted-foreground" aria-hidden />
          </div>
          <p className="text-2xl font-extrabold tabular-nums text-foreground">{activeAutomationsCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {tx("Connected integrations", "Integraciones conectadas")}
          </p>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onNavigate?.("Cars")}
          className={cn("p-4", cardBase, statCardInteractive)}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">{tx("Inventory", "Inventario")}</p>
            <CarIcon size={14} className="text-muted-foreground" aria-hidden />
          </div>
          <p className="text-2xl font-extrabold tabular-nums text-foreground">{availableCars}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tx("available", "disponibles")}</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${(availableCars / carTotal) * 100}%` }}
            />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.("Cars")}
          className={cn("p-4", cardBase, statCardInteractive)}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">{tx("Sold", "Vendidos")}</p>
            <TrendingUp size={14} className="text-stat-positive" aria-hidden />
          </div>
          <p className="text-2xl font-extrabold tabular-nums text-foreground">{soldCars}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tx("this period", "este periodo")}</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-stat-positive transition-[width]"
              style={{ width: `${(soldCars / carTotal) * 100}%` }}
            />
          </div>
        </button>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">
          {tx("Dashboard widgets", "Widgets del panel")}
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {DASHBOARD_PLACEHOLDER_WIDGETS.map((w) => {
            const Icon = placeholderIcon[w.id];
            return (
              <div key={w.id} className={cn("flex flex-col p-5", cardBase)}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-muted-foreground">{tx(w.titleEn, w.titleEs)}</p>
                  <Icon size={16} className="shrink-0 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm text-foreground/90">{tx(w.descriptionEn, w.descriptionEs)}</p>
                <DashboardWidgetPlaceholderBody id={w.id} tx={tx} />
                <p className="mt-3 font-mono text-[10px] text-muted-foreground/70">{w.id}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className={cn("p-5", cardBase)}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{tx("Recent activity", "Actividad reciente")}</p>
          <Clock size={14} className="text-muted-foreground" aria-hidden />
        </div>
        {recentActivity.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{tx("No activity yet.", "Sin actividad aún.")}</p>
        ) : (
          recentActivity.map((entry) =>
            entry.type === "car" ? (
              <button
                key={`car-${entry.id}`}
                type="button"
                onClick={() => beginEditCar(entry.item)}
                className="flex w-full items-center justify-between border-b border-border py-2.5 text-left last:border-b-0 hover:bg-muted/30"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
                    {entry.item.brand.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {entry.item.year} {entry.item.brand} {entry.item.model}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {tx("Car", "Auto")} · {displayDate(entry.at, locale, tx("No date", "Sin fecha"))}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    entry.item.status === "available"
                      ? "bg-stat-positive/15 text-stat-positive"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {entry.item.status === "available"
                    ? tx("available", "disponible")
                    : tx("sold", "vendido")}
                </span>
              </button>
            ) : (
              <button
                key={`lead-${entry.id}`}
                type="button"
                onClick={() => beginEditLead(entry.item)}
                className="flex w-full items-center justify-between border-b border-border py-2.5 text-left last:border-b-0 hover:bg-muted/30"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
                    {entry.item.name?.charAt(0) || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {entry.item.name ?? tx("Unknown lead", "Lead desconocido")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {tx("Lead", "Lead")} · {displayDate(entry.at, locale, tx("No date", "Sin fecha"))}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    entry.item.lead_type === "buyer"
                      ? "bg-badge-buyer/15 text-badge-buyer"
                      : entry.item.lead_type === "seller"
                        ? "bg-badge-seller/15 text-badge-seller"
                        : "bg-badge-pending/15 text-badge-pending",
                  )}
                >
                  {entry.item.lead_type === "buyer"
                    ? tx("buyer", "comprador")
                    : entry.item.lead_type === "seller"
                      ? tx("seller", "vendedor")
                      : tx("pending", "pendiente")}
                </span>
              </button>
            ),
          )
        )}
        <div className="pt-3">
          <button
            type="button"
            onClick={() => onNavigate?.("Leads")}
            className={cn(
              "w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/60",
            )}
          >
            {tx("See more", "Ver más")}
          </button>
        </div>
      </div>

      <CarEditDialog
        car={editCar}
        open={!!editCar}
        onOpenChange={(open) => {
          if (!open) setEditCar(null);
        }}
        onSave={async (updated) => {
          if (isDraftRecordId(updated.id)) {
            await createCar(carToCreatePayload(updated));
          } else {
            await updateCar(updated.id, carToUpdatePayload(updated));
          }
          await queryClient.invalidateQueries({ queryKey: ["cars"] });
          setEditCar(null);
        }}
        onNotesDocumentAutosave={async (carId, document) => {
          if (isDraftRecordId(carId)) return;
          await updateCar(carId, { notes_document: document });
          await queryClient.invalidateQueries({ queryKey: ["cars"] });
        }}
        leads={leads}
        onOpenLinkedLead={(lead) => {
          setEditCar(null);
          beginEditLead(lead);
        }}
        onUnlinkLeadFromCar={async (leadId, carId) => {
          const lead = leads.find((l) => l.id === leadId);
          if (!lead || isDraftRecordId(lead.id)) return;
          await removeLeadCarLink(leadId, carId);
          try {
            const row = await getLead(leadId);
            await patchLeadRowWithJunctionCars(queryClient, leadId, row);
          } catch {
            await queryClient.invalidateQueries({ queryKey: ["leads"] });
          }
          await queryClient.invalidateQueries({ queryKey: ["cars"] });
          await queryClient.invalidateQueries({ queryKey: ["leads-for-car"] });
        }}
      />
      <LeadEditDialog
        lead={editLead}
        open={!!editLead}
        onOpenChange={(open) => {
          if (!open) setEditLead(null);
        }}
        onSave={async (updated) => {
          if (isDraftRecordId(updated.id)) {
            const created = await createLead(leadToCreatePayload(updated));
            const mapped = mapLeadFromApi(created, statuses);
            const extra = leadToUpdatePayload(updated);
            if (extra.attachments !== undefined) {
              await updateLead(mapped.id, { attachments: extra.attachments });
            }
            await queryClient.invalidateQueries({ queryKey: ["leads"] });
          } else {
            const raw = queryClient.getQueryData<LeadsListResponse>(["leads"]);
            const prevRow = raw?.leads.find((l) => l.id === updated.id);
            const previousLead = prevRow ? mapLeadFromApi(prevRow, statuses) : null;
            const prevIds = previousLead ? getAllCarIdsForLead(previousLead) : [];
            const nextIds = getAllCarIdsForLead(updated);

            await syncLeadCarJunctionLinks(updated.id, prevIds, nextIds);
            const data = await updateLead(updated.id, leadToUpdatePayloadOmitCarLinks(updated));
            try {
              await patchLeadRowWithJunctionCars(queryClient, updated.id, data);
            } catch {
              await queryClient.invalidateQueries({ queryKey: ["leads"] });
            }
            await queryClient.invalidateQueries({ queryKey: ["cars"] });
            await queryClient.invalidateQueries({ queryKey: ["leads-for-car"] });
          }
          setEditLead(null);
        }}
        onNotesDocumentAutosave={async (leadId, document) => {
          if (isDraftRecordId(leadId)) return;
          const raw = queryClient.getQueryData<LeadsListResponse>(["leads"]);
          const existing = raw?.leads.find((l) => l.id === leadId);
          const data = await updateLead(leadId, { notes_document: document });
          if (existing) {
            patchLeadsListCache(queryClient, mergeLeadResponseWithClientCarLinks(data, existing));
          } else {
            await queryClient.invalidateQueries({ queryKey: ["leads"] });
          }
        }}
        statuses={statuses}
        cars={cars}
      />
    </section>
  );
}
