import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, createLeadStatus, listCars, listLeadStatuses, listLeads } from "@automia/api";
import type { Lead, LeadStatus, LeadType } from "@/types/models";
import DetailSheet, { DetailRow } from "@/components/DetailSheet";
import AddLeadSheet from "@/components/AddLeadSheet";
import { TableSearchToolbar } from "@/components/table/TableSearchToolbar";
import { Button } from "@/components/ui/button";
import { matchesFuzzy } from "@/lib/fuzzyMatch";
import { matchLeadToCars } from "@/lib/matchLeadToCars";
import {
  buildLeadSearchHaystackForColumns,
  defaultLeadSearchColumns,
  allLeadColumnsSelected,
  type LeadSearchColumnId,
} from "@/lib/searchHaystack";
import { cn } from "@/lib/utils";
import { ChevronRight, Plus } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { mapCarFromApi, mapLeadFromApi, mapStatusFromApi } from "@/lib/apiMappers";
import { getAllCarIdsForLead, getLeadsForCar } from "@/lib/leadCarLinks";

const LeadsPage = () => {
  const { tx, locale } = useLanguage();
  const queryClient = useQueryClient();
  const fmt = (n: number | null) => (n != null ? `$${n.toLocaleString(locale)}` : "—");

  const { data: leadsData } = useQuery({
    queryKey: ["leads"],
    queryFn: () => listLeads({ limit: 200 }),
  });
  const { data: statusesData } = useQuery({
    queryKey: ["lead-statuses"],
    queryFn: () => listLeadStatuses(),
  });
  const { data: carsData } = useQuery({
    queryKey: ["cars"],
    queryFn: async () => {
      try {
        return await listCars();
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          return { cars: [] };
        }
        throw e;
      }
    },
  });

  const statuses = useMemo(
    () => statusesData?.statuses.map(mapStatusFromApi) ?? [],
    [statusesData],
  );
  const leads = useMemo(() => {
    if (!leadsData?.leads) return [];
    return leadsData.leads.map((r) => mapLeadFromApi(r, statuses));
  }, [leadsData, statuses]);
  const cars = useMemo(() => carsData?.cars.map(mapCarFromApi) ?? [], [carsData]);

  const [selected, setSelected] = useState<Lead | null>(null);
  const [showMatches, setShowMatches] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilterIds, setStatusFilterIds] = useState<Set<string>>(() => new Set());
  const [leadTypeFilters, setLeadTypeFilters] = useState<Set<LeadType>>(() => new Set());
  const [searchColumns, setSearchColumns] = useState<Set<LeadSearchColumnId>>(
    () => defaultLeadSearchColumns(),
  );

  const getStatusName = (id: string | null) => {
    const s = statuses.find((st) => st.id === id);
    if (!s) return "—";
    return translateStatusName(s.name, tx);
  };

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim();
    const cols =
      searchColumns.size === 0 ? defaultLeadSearchColumns() : searchColumns;
    return leads.filter((lead) => {
      if (statusFilterIds.size > 0) {
        const sid = lead.status_id;
        if (!sid || !statusFilterIds.has(sid)) return false;
      }
      if (leadTypeFilters.size > 0 && !leadTypeFilters.has(lead.lead_type)) return false;
      if (q) {
        const st = statuses.find((s) => s.id === lead.status_id);
        const statusName = st?.name ?? "";
        const carIds = getAllCarIdsForLead(lead);
        const car =
          (carIds.length ? cars.find((c) => c.id === carIds[0]) : null) ??
          cars.find((c) => c.id === lead.car_id);
        const hay = buildLeadSearchHaystackForColumns(
          lead,
          car,
          statusName,
          cols,
        );
        if (!matchesFuzzy(q, hay)) return false;
      }
      return true;
    });
  }, [leads, statusFilterIds, leadTypeFilters, searchQuery, searchColumns, statuses, cars]);

  const clearFilters = () => {
    setStatusFilterIds(new Set());
    setLeadTypeFilters(new Set());
    setSearchQuery("");
    setSearchColumns(defaultLeadSearchColumns());
  };

  const toggleStatusFilter = (statusId: string) => {
    setStatusFilterIds((prev) => {
      const next = new Set(prev);
      if (next.has(statusId)) next.delete(statusId);
      else next.add(statusId);
      return next;
    });
  };

  const toggleLeadTypeFilter = (leadType: LeadType) => {
    setLeadTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(leadType)) next.delete(leadType);
      else next.add(leadType);
      return next;
    });
  };

  const hasActiveFilters =
    !allLeadColumnsSelected(searchColumns) ||
    statusFilterIds.size > 0 ||
    leadTypeFilters.size > 0 ||
    searchQuery.trim().length > 0;

  const toInstagramProfileUrl = (handle: string) => {
    const normalized = handle.trim().replace(/^@+/, "");
    return `https://instagram.com/${normalized}`;
  };
  const matchedCars = useMemo(
    () => (selected && selected.lead_type === "buyer" ? matchLeadToCars(selected, cars) : []),
    [selected, cars],
  );

  return (
    <div className="px-5 pt-12 pb-24 max-w-[430px] mx-auto animate-fade-in">
      <div className="flex items-end justify-between mb-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Leads</h1>
        <button
          type="button"
          onClick={() => {
            setEditingLead(null);
            setShowAdd(true);
          }}
          className="w-9 h-9 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-transform shadow-md"
        >
          <Plus size={20} className="text-primary-foreground" />
        </button>
      </div>

      <div className="mt-3 mb-3 w-full">
        <TableSearchToolbar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={tx("Search leads (name, car, notes, status…)", "Buscar leads (nombre, auto, notas, estado...)")}
          filterContent={(
            <div className="space-y-1 p-3">
              <div className="space-y-3 pt-2">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">{tx("Status", "Estado")}</p>
                  <div className="space-y-1">
                    {statuses.map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => toggleStatusFilter(s.id)}
                        className={cn(
                          "flex w-full items-center rounded-md border px-2 py-2 text-left text-sm transition-colors",
                          statusFilterIds.has(s.id)
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-transparent bg-muted/70 text-muted-foreground",
                        )}
                      >
                        <span>{translateStatusName(s.name, tx)}</span>
                      </button>
                    ))}
                  </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">{tx("Lead type", "Tipo de lead")}</p>
                  <div className="space-y-1">
                    {(["buyer", "seller", "pending"] as const).map((type) => (
                      <button
                        type="button"
                        key={type}
                        onClick={() => toggleLeadTypeFilter(type)}
                        className={cn(
                          "flex w-full items-center rounded-md border px-2 py-2 text-left text-sm capitalize transition-colors",
                          leadTypeFilters.has(type)
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-transparent bg-muted/70 text-muted-foreground",
                        )}
                      >
                        <span>{type === "buyer" ? tx("buyer", "comprador") : type === "seller" ? tx("seller", "vendedor") : tx("pending", "pendiente")}</span>
                      </button>
                    ))}
                  </div>
                  </div>
                </div>
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={clearFilters}
                >
                  {tx("Clear search & filters", "Limpiar busqueda y filtros")}
                </Button>
              ) : null}
            </div>
          )}
        />
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        {filteredLeads.length} {tx("total", "total")}
      </p>

      <div className="overflow-hidden rounded-md border border-border bg-card">
        {filteredLeads.map((lead, i) => (
          <button
            key={lead.id}
            type="button"
            onClick={() => setSelected(lead)}
            className={`w-full flex items-center justify-between px-4 py-3.5 text-left active:scale-[0.98] active:bg-muted/50 transition-all ${
              i < filteredLeads.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                {lead.name?.charAt(0) || "?"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{lead.name || tx("Unknown", "Desconocido")}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {lead.source} · {getStatusName(lead.status_id)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  lead.lead_type === "buyer"
                    ? "bg-badge-buyer/15 text-badge-buyer"
                    : lead.lead_type === "seller"
                      ? "bg-badge-seller/15 text-badge-seller"
                      : "bg-badge-pending/15 text-badge-pending"
                }`}
              >
                {lead.lead_type === "buyer" ? tx("buyer", "comprador") : lead.lead_type === "seller" ? tx("seller", "vendedor") : tx("pending", "pendiente")}
              </span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>

      <DetailSheet
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setShowMatches(false);
        }}
        title={selected?.name || tx("Unknown Lead", "Lead desconocido")}
        subtitle={selected ? `${selected.lead_type === "buyer" ? tx("buyer", "comprador") : selected.lead_type === "seller" ? tx("seller", "vendedor") : tx("pending", "pendiente")} · ${selected.source}` : undefined}
        onEdit={() => {
          if (!selected) return;
          setEditingLead(selected);
          setSelected(null);
          setShowAdd(true);
        }}
      >
        {selected && (
          <>
            <DetailRow label={tx("Name", "Nombre")} value={selected.name} />
            <DetailRow label={tx("Type", "Tipo")} value={selected.lead_type === "buyer" ? tx("buyer", "comprador") : selected.lead_type === "seller" ? tx("seller", "vendedor") : tx("pending", "pendiente")} />
            <DetailRow label={tx("Source", "Origen")} value={selected.source} />
            <DetailRow label={tx("Status", "Estado")} value={getStatusName(selected.status_id)} />
            {selected.instagram_handle ? (
              <div className="py-3 border-b border-border">
                <p className="text-xs text-muted-foreground mb-0.5">Instagram</p>
                <a
                  href={toInstagramProfileUrl(selected.instagram_handle)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-primary underline underline-offset-2"
                >
                  {selected.instagram_handle}
                </a>
              </div>
            ) : (
              <DetailRow label="Instagram" value={selected.instagram_handle} />
            )}
            <DetailRow label={tx("Phone", "Teléfono")} value={selected.phone} />
            <DetailRow label={tx("Notes", "Notas")} value={selected.notes} />
            {selected.lead_type === "buyer" && (
              <>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => setShowMatches((prev) => !prev)}
                    className="w-full rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-foreground"
                  >
                    {showMatches ? tx("Hide matched cars", "Ocultar autos coincidentes") : tx("Match cars", "Buscar autos")}
                  </button>
                </div>
                {showMatches ? (
                  <div className="mt-3 space-y-2">
                    {matchedCars.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{tx("No matches found", "No se encontraron coincidencias")}</p>
                    ) : (
                      matchedCars.map((m) => (
                        <div key={m.car.id} className="rounded-md border border-border bg-muted/40 px-3 py-2">
                          <p className="text-sm font-semibold">
                            {m.car.year} {m.car.brand} {m.car.model}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {tx("Score", "Puntaje")}: {m.score} · {m.reasons.slice(0, 2).join(" · ")}
                          </p>

                          {(() => {
                            const leadsForCar = getLeadsForCar(m.car.id, leads);
                            const primary = leadsForCar[0];
                            const moreCount = Math.max(0, leadsForCar.length - 1);
                            const matchedLeadTypeLabel = primary
                              ? primary.lead_type === "buyer"
                                ? tx("buyer", "comprador")
                                : primary.lead_type === "seller"
                                  ? tx("seller", "vendedor")
                                  : tx("pending", "pendiente")
                              : tx("Unassigned", "Sin asignar");
                            const matchedLeadName = primary
                              ? `${primary.name || tx("Unnamed", "Sin nombre")}${moreCount > 0 ? ` (+${moreCount})` : ""}`
                              : tx("No match", "Sin vincular");

                            return (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="text-[11px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md">
                                  {matchedLeadTypeLabel}
                                </span>
                                <span className="text-[11px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md">
                                  {matchedLeadName}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
                <div className="mt-4 mb-2">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">
                    {tx("Buyer preferences", "Preferencias del comprador")}
                  </p>
                </div>
                <DetailRow
                  label={tx("Budget", "Presupuesto")}
                  value={
                    selected.desired_budget_min || selected.desired_budget_max
                      ? `${fmt(selected.desired_budget_min)} – ${fmt(selected.desired_budget_max)}`
                      : null
                  }
                />
                <DetailRow
                  label={tx("Max Mileage", "Kilometraje máximo")}
                  value={selected.desired_mileage_max?.toLocaleString(locale) || null}
                />
                <DetailRow
                  label={tx("Year Range", "Rango de año")}
                  value={
                    selected.desired_year_min || selected.desired_year_max
                      ? `${selected.desired_year_min || "?"} – ${selected.desired_year_max || "?"}`
                      : null
                  }
                />
                <DetailRow label={tx("Preferred Make", "Marca preferida")} value={selected.desired_make} />
                <DetailRow label={tx("Preferred Model", "Modelo preferido")} value={selected.desired_model} />
                <DetailRow label={tx("Preferred Type", "Tipo preferido")} value={selected.desired_car_type} />
              </>
            )}
            <DetailRow
              label={tx("Created", "Creado")}
              value={new Date(selected.created_at).toLocaleDateString(locale)}
            />
          </>
        )}
      </DetailSheet>

      <AddLeadSheet
        open={showAdd}
        onClose={() => {
          setShowAdd(false);
          setEditingLead(null);
        }}
        onSaved={async () => {
          await queryClient.invalidateQueries({ queryKey: ["leads"] });
        }}
        statuses={statuses}
        initialLead={editingLead}
        onAddStatus={async (name) => {
          const created = await createLeadStatus({
            name,
            display_order: statuses.length,
          });
          await queryClient.invalidateQueries({ queryKey: ["lead-statuses"] });
          return mapStatusFromApi(created);
        }}
      />
    </div>
  );
};

export default LeadsPage;

function translateStatusName(name: string, tx: (enText: string, esText: string) => string) {
  switch (name.toLowerCase()) {
    case "new":
      return tx("New", "Nuevo");
    case "contacted":
      return tx("Contacted", "Contactado");
    case "qualified":
      return tx("Qualified", "Calificado");
    case "closed":
      return tx("Closed", "Cerrado");
    default:
      return name;
  }
}
