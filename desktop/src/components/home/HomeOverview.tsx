import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Car as CarIcon, Clock3, Users } from "lucide-react";
import { ApiError, listCars, listLeadStatuses, listLeads, updateCar, updateLead } from "@automia/api";
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
  carToUpdatePayload,
  leadToUpdatePayload,
} from "@/lib/apiMappers";

const listItemBaseClass =
  "grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted/70";

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

export function HomeOverview() {
  const now = new Date();
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

  const statuses = useMemo(
    () => statusesData?.statuses.map(mapStatusFromApi) ?? [],
    [statusesData],
  );

  const cars = useMemo(() => carsData?.cars.map(mapCarFromApi) ?? [], [carsData]);
  const leads = useMemo(() => {
    if (!leadsData?.leads) return [];
    return leadsData.leads.map((r) => mapLeadFromApi(r, statuses));
  }, [leadsData, statuses]);

  const today = now.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const displayName = user?.name?.trim() || tx("there", "Usuario");

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

  return (
    <section className="space-y-8 pb-6">
      <div className="rounded-xl border border-border bg-gradient-to-r from-primary/15 via-primary/10 to-transparent px-5 py-4">
        <p className="text-xl font-semibold text-foreground">
          {tx("Welcome back", "Bienvenido de nuevo")}, {displayName}
        </p>
        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{today}</p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-base font-semibold text-foreground">
            {tx("Recent leads", "Leads recientes")}
          </p>
        </div>

        <div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{tx("No activity yet.", "Sin actividad aun.")}</p>
          ) : (
            recentActivity.map((entry) =>
              entry.type === "car" ? (
                <button
                  key={`car-${entry.id}`}
                  type="button"
                  className={`${listItemBaseClass} border-b border-border/70 first:border-t first:border-border/70 last:border-b-0`}
                  onClick={() => setEditCar(entry.item)}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {entry.item.year} {entry.item.brand} {entry.item.model}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.item.car_type ?? tx("Unknown type", "Tipo desconocido")} ·{" "}
                      {entry.item.owner_type === "owned"
                        ? tx("owned", "propio")
                        : entry.item.owner_type === "client"
                          ? tx("client", "cliente")
                          : tx("advisor", "asesor")}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    {displayDate(entry.at, locale, tx("No date", "Sin fecha"))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <CarIcon className="h-3 w-3" />
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        entry.item.status === "available"
                          ? "bg-stat-positive/15 text-stat-positive"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {entry.item.status === "available"
                        ? tx("available", "disponible")
                        : tx("sold", "vendido")}
                    </span>
                  </div>
                </button>
              ) : (
                <button
                  key={`lead-${entry.id}`}
                  type="button"
                  className={`${listItemBaseClass} border-b border-border/70 first:border-t first:border-border/70 last:border-b-0`}
                  onClick={() => setEditLead(entry.item)}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {entry.item.name ?? tx("Unknown lead", "Lead desconocido")}
                    </p>
                    <p className="text-xs text-muted-foreground">{entry.item.source}</p>
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    {displayDate(entry.at, locale, tx("No date", "Sin fecha"))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Users className="h-3 w-3" />
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
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
                  </div>
                </button>
              ),
            )
          )}
        </div>

        <div className="pt-1">
          <button
            type="button"
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
          >
            {tx("See more", "Ver mas")}
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
          await updateCar(updated.id, carToUpdatePayload(updated));
          await queryClient.invalidateQueries({ queryKey: ["cars"] });
          setEditCar(null);
        }}
        onNotesDocumentAutosave={async (carId, document) => {
          await updateCar(carId, { notes_document: document });
          await queryClient.invalidateQueries({ queryKey: ["cars"] });
        }}
      />
      <LeadEditDialog
        lead={editLead}
        open={!!editLead}
        onOpenChange={(open) => {
          if (!open) setEditLead(null);
        }}
        onSave={async (updated) => {
          await updateLead(updated.id, leadToUpdatePayload(updated));
          await queryClient.invalidateQueries({ queryKey: ["leads"] });
          setEditLead(null);
        }}
        onNotesDocumentAutosave={async (leadId, document) => {
          await updateLead(leadId, { notes_document: document });
          await queryClient.invalidateQueries({ queryKey: ["leads"] });
        }}
        statuses={statuses}
        cars={cars}
      />
    </section>
  );
}
