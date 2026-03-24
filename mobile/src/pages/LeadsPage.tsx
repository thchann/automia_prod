import { useState, useMemo } from "react";
import { mockLeads as initialLeads, mockStatuses, mockCars } from "@/data/mock";
import type { Lead, LeadStatus, LeadType } from "@/types/models";
import DetailSheet, { DetailRow } from "@/components/DetailSheet";
import AddLeadSheet from "@/components/AddLeadSheet";
import { TableSearchToolbar } from "@/components/table/TableSearchToolbar";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { matchesFuzzy } from "@/lib/fuzzyMatch";
import {
  buildLeadSearchHaystackForColumns,
  defaultLeadSearchColumns,
  LEAD_SEARCH_COLUMN_IDS,
  LEAD_SEARCH_COLUMN_LABELS,
  allLeadColumnsSelected,
  type LeadSearchColumnId,
} from "@/lib/searchHaystack";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";

const tableCheckboxClassName =
  "border-border bg-transparent shadow-none ring-offset-transparent data-[state=unchecked]:bg-transparent data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground";

const LeadsPage = () => {
  const { tx, locale } = useLanguage();
  const fmt = (n: number | null) => (n != null ? `$${n.toLocaleString(locale)}` : "—");
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [statuses, setStatuses] = useState<LeadStatus[]>(mockStatuses);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"drop" | "filter">("drop");
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
        const car = mockCars.find((c) => c.id === lead.car_id);
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
  }, [leads, statusFilterIds, leadTypeFilters, searchQuery, searchColumns, statuses]);

  const toggleLeadColumn = (id: LeadSearchColumnId) => {
    setSearchColumns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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

  return (
    <div className="px-5 pt-14 pb-24 max-w-[430px] mx-auto animate-fade-in">
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
              <div className="grid grid-cols-2 rounded-md border border-border p-1">
                <button
                  type="button"
                  className={cn(
                    "rounded-sm px-2 py-1.5 text-sm font-medium capitalize transition-colors",
                    filterMode === "drop" ? "bg-primary/15 text-foreground" : "text-muted-foreground",
                  )}
                  onClick={() => setFilterMode("drop")}
                >
                  {tx("Drop", "Ocultar")}
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-sm px-2 py-1.5 text-sm font-medium capitalize transition-colors",
                    filterMode === "filter" ? "bg-primary/15 text-foreground" : "text-muted-foreground",
                  )}
                  onClick={() => setFilterMode("filter")}
                >
                  {tx("Filter", "Filtrar")}
                </button>
              </div>
              {filterMode === "drop" ? (
                <div className="max-h-[min(50vh,18rem)] space-y-1 overflow-y-auto pr-1">
                  {LEAD_SEARCH_COLUMN_IDS.map((colId) => {
                    const active = searchColumns.has(colId);
                    return (
                      <div
                        key={colId}
                        className={cn(
                          "flex items-center gap-1 rounded-md border px-2 py-2 text-sm transition-colors",
                          active
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-transparent bg-muted/70 text-muted-foreground",
                        )}
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left font-medium"
                          onClick={() => toggleLeadColumn(colId)}
                        >
                          {translateLeadColumn(LEAD_SEARCH_COLUMN_LABELS[colId], tx)}
                          {!active ? (
                            <span className="ml-1 text-[10px] uppercase text-muted-foreground">
                              off
                            </span>
                          ) : null}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
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
              )}
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

      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
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
        onClose={() => setSelected(null)}
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
            <DetailRow label={tx("Phone", "Telefono")} value={selected.phone} />
            <DetailRow label={tx("Notes", "Notas")} value={selected.notes} />
            {selected.lead_type === "buyer" && (
              <>
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
                  label={tx("Max Mileage", "Kilometraje maximo")}
                  value={selected.desired_mileage_max?.toLocaleString(locale) || null}
                />
                <DetailRow
                  label={tx("Year Range", "Rango de ano")}
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
        onSave={(lead) => {
          setLeads((prev) => {
            const exists = prev.some((l) => l.id === lead.id);
            if (exists) return prev.map((l) => (l.id === lead.id ? lead : l));
            return [lead, ...prev];
          });
        }}
        statuses={statuses}
        initialLead={editingLead}
        onAddStatus={(name) => {
          const next: LeadStatus = {
            id: `s_${Date.now()}`,
            name,
            display_order: statuses.length,
            color: null,
            is_default: false,
          };
          setStatuses((prev) => [...prev, next]);
          return next;
        }}
      />
    </div>
  );
};

export default LeadsPage;

function translateLeadColumn(label: string, tx: (enText: string, esText: string) => string) {
  switch (label) {
    case "Name":
      return tx("Name", "Nombre");
    case "Phone":
      return tx("Phone", "Telefono");
    case "Lead type":
      return tx("Lead type", "Tipo de lead");
    case "Car":
      return tx("Car", "Auto");
    case "Buyer criteria":
      return tx("Buyer criteria", "Criterios del comprador");
    case "Status":
      return tx("Status", "Estado");
    case "Source":
      return tx("Source", "Origen");
    case "Notes":
      return tx("Notes", "Notas");
    case "Created":
      return tx("Created", "Creado");
    case "Updated":
      return tx("Updated", "Actualizado");
    default:
      return label;
  }
}

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
