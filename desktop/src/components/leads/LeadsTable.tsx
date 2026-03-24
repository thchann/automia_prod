import { useState, useMemo, useEffect } from "react";
import { Link2, Pencil, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Lead, LeadStatus, Car } from "@/types/leads";
import { LeadEditDialog } from "./LeadEditDialog";
import { TableSearchToolbar } from "@/components/table/TableSearchToolbar";
import { matchesFuzzy } from "@/lib/fuzzyMatch";
import {
  buildLeadSearchHaystackForColumns,
  defaultLeadSearchColumns,
  LEAD_SEARCH_COLUMN_IDS,
  LEAD_SEARCH_COLUMN_LABELS,
  summarizeBuyerCriteria,
  type LeadSearchColumnId,
} from "@/lib/tableSearchHaystack";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { matchLeadToCars } from "@/lib/matchLeadToCars";
import { useLanguage } from "@/i18n/LanguageProvider";

interface LeadsTableProps {
  leads: Lead[];
  statuses: LeadStatus[];
  cars: Car[];
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onAddLead: () => Lead;
}

const PAGE_SIZE = 9;

const tableCheckboxClassName =
  "border-border bg-transparent shadow-none ring-offset-transparent data-[state=unchecked]:bg-transparent data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground";

const stickyCheckboxHead =
  "w-10 sticky left-0 z-10 border-r border-border bg-background shadow-sm";
const stickyCheckboxCell =
  "sticky left-0 z-10 border-r border-border bg-background shadow-sm group-hover:bg-surface-hover";

function formatShortDate(s: string | null, locale: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function truncateText(s: string | null, max: number) {
  if (!s) return "—";
  const t = s.trim();
  if (!t) return "—";
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function allLeadColumnsSelected(s: Set<LeadSearchColumnId>) {
  return (
    s.size === LEAD_SEARCH_COLUMN_IDS.length &&
    LEAD_SEARCH_COLUMN_IDS.every((id) => s.has(id))
  );
}

export function LeadsTable({ leads, statuses, cars, onUpdateLead, onDeleteLead, onAddLead }: LeadsTableProps) {
  const { tx, locale } = useLanguage();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [matchLead, setMatchLead] = useState<Lead | null>(null);
  const [showGenerateMenu, setShowGenerateMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cardFilter, setCardFilter] = useState<"total" | "new" | "contacted" | "qualified" | null>(null);
  const [filterMode, setFilterMode] = useState<"drop" | "filter">("drop");
  const [statusFilterIds, setStatusFilterIds] = useState<Set<string>>(() => new Set());
  const [leadTypeFilters, setLeadTypeFilters] = useState<Set<Lead["lead_type"]>>(() => new Set());
  const [searchColumns, setSearchColumns] = useState<Set<LeadSearchColumnId>>(
    () => defaultLeadSearchColumns(),
  );

  const getStatus = (id: string | null) => statuses.find((s) => s.id === id);
  const getCar = (id: string | null) => cars.find((c) => c.id === id);

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
      if (cardFilter != null && cardFilter !== "total") {
        const statusName = statuses.find((s) => s.id === lead.status_id)?.name?.toLowerCase() ?? "";
        if (cardFilter === "new" && statusName !== "new") return false;
        if (cardFilter === "contacted" && statusName !== "contacted") return false;
        if (cardFilter === "qualified" && statusName !== "qualified") return false;
      }
      if (q) {
        const st = statuses.find((s) => s.id === lead.status_id);
        const statusName = st?.name ?? "";
        const car = cars.find((c) => c.id === lead.car_id);
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
  }, [leads, statusFilterIds, leadTypeFilters, cardFilter, searchQuery, statuses, cars, searchColumns]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilterIds, leadTypeFilters, cardFilter, searchColumns]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const paged = filteredLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map((l) => l.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

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
    setCardFilter(null);
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

  const toggleLeadTypeFilter = (leadType: Lead["lead_type"]) => {
    setLeadTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(leadType)) next.delete(leadType);
      else next.add(leadType);
      return next;
    });
  };

  const statusStyle = (status: LeadStatus | undefined) => {
    if (!status) return { bg: "bg-muted", text: "text-muted-foreground" };
    const color = status.color || "#6B7280";
    return { color };
  };

  const totalLeads = filteredLeads.length;
  const newLeads = filteredLeads.filter((l) => getStatus(l.status_id)?.name === "New").length;
  const contactedLeads = filteredLeads.filter((l) => getStatus(l.status_id)?.name === "Contacted").length;
  const qualifiedLeads = filteredLeads.filter((l) => getStatus(l.status_id)?.name === "Qualified").length;

  const hasActiveFilters =
    !allLeadColumnsSelected(searchColumns) ||
    statusFilterIds.size > 0 ||
    leadTypeFilters.size > 0 ||
    cardFilter !== null ||
    searchQuery.trim().length > 0;

  const visibleColumns = useMemo(
    () => LEAD_SEARCH_COLUMN_IDS.filter((id) => searchColumns.has(id)),
    [searchColumns],
  );

  const matchResults = useMemo(
    () => (matchLead ? matchLeadToCars(matchLead, cars).slice(0, 6) : []),
    [matchLead, cars],
  );

  return (
    <div className="flex max-w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{tx("All Leads", "Todos los leads")}</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button size="sm" onClick={() => setShowGenerateMenu(!showGenerateMenu)}>
              + {tx("Generate Lead", "Generar lead")} <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
            {showGenerateMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm hover:bg-surface-hover transition-colors"
                  onClick={() => {
                    const created = onAddLead();
                    setEditLead(created);
                    setShowGenerateMenu(false);
                  }}
                >
                  {tx("Manual entry", "Entrada manual")}
                </button>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm text-muted-foreground cursor-not-allowed"
                  disabled
                >
                  {tx("Import CSV", "Importar CSV")}
                </button>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm text-muted-foreground cursor-not-allowed"
                  disabled
                >
                  {tx("From Instagram", "Desde Instagram")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { id: "total", label: tx("Total Leads", "Total de leads"), value: totalLeads, color: "bg-blue-500" },
          { id: "new", label: tx("New Leads", "Leads nuevos"), value: newLeads, color: "bg-amber-500" },
          { id: "contacted", label: tx("Contacted", "Contactado"), value: contactedLeads, color: "bg-emerald-500" },
          { id: "qualified", label: tx("Qualified", "Calificado"), value: qualifiedLeads, color: "bg-red-500" },
        ].map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={() =>
              setCardFilter((prev) => {
                const next = stat.id as "total" | "new" | "contacted" | "qualified";
                return prev === next ? null : next;
              })
            }
            className={cn(
              "rounded-lg border p-4 text-left transition-colors",
              cardFilter === stat.id
                ? "border-primary bg-primary/10"
                : "border-border hover:bg-surface-hover",
            )}
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${stat.color}`} />
              {stat.label}
            </div>
            <div className="text-2xl font-semibold text-foreground mt-1">{stat.value}</div>
          </button>
        ))}
      </div>

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
                        {tx(LEAD_SEARCH_COLUMN_LABELS[colId], translateLeadColumn(LEAD_SEARCH_COLUMN_LABELS[colId]))}
                        {!active ? (
                          <span className="ml-1 text-[10px] uppercase text-muted-foreground">
                            {tx("off", "off")}
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

      <div className="rounded-lg border border-border overflow-x-auto overscroll-x-contain">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-primary">
              <TableHead className={stickyCheckboxHead}>
                <Checkbox
                  className={tableCheckboxClassName}
                  checked={selected.size === paged.length && paged.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              {visibleColumns.includes("name") && <TableHead className="min-w-[120px]">{tx("Name", "Nombre")}</TableHead>}
              {visibleColumns.includes("instagram") && <TableHead className="min-w-[100px]">Instagram</TableHead>}
              {visibleColumns.includes("phone") && <TableHead className="min-w-[100px]">{tx("Phone", "Telefono")}</TableHead>}
              {visibleColumns.includes("leadType") && <TableHead className="min-w-[88px]">{tx("Lead type", "Tipo de lead")}</TableHead>}
              {visibleColumns.includes("car") && <TableHead className="min-w-[160px]">{tx("Car", "Auto")}</TableHead>}
              {visibleColumns.includes("buyerCriteria") && <TableHead className="min-w-[220px]">{tx("Buyer criteria", "Criterios del comprador")}</TableHead>}
              {visibleColumns.includes("status") && <TableHead className="min-w-[100px]">{tx("Status", "Estado")}</TableHead>}
              {visibleColumns.includes("source") && <TableHead className="min-w-[88px]">{tx("Source", "Origen")}</TableHead>}
              {visibleColumns.includes("notes") && <TableHead className="min-w-[140px]">{tx("Notes", "Notas")}</TableHead>}
              {visibleColumns.includes("created") && <TableHead className="min-w-[100px]">{tx("Created", "Creado")}</TableHead>}
              {visibleColumns.includes("updated") && <TableHead className="min-w-[100px]">{tx("Updated", "Actualizado")}</TableHead>}
              <TableHead className="min-w-[100px]">{tx("Actions", "Acciones")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((lead) => {
              const status = getStatus(lead.status_id);
              const car = getCar(lead.car_id);
              return (
                <TableRow
                  key={lead.id}
                  className="group cursor-pointer hover:bg-surface-hover"
                  onClick={() => setEditLead(lead)}
                >
                  <TableCell
                    className={stickyCheckboxCell}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      className={tableCheckboxClassName}
                      checked={selected.has(lead.id)}
                      onCheckedChange={() => toggleOne(lead.id)}
                    />
                  </TableCell>
                  {visibleColumns.includes("name") && <TableCell className="font-medium">{lead.name || "—"}</TableCell>}
                  {visibleColumns.includes("instagram") && <TableCell>{lead.instagram_handle || "—"}</TableCell>}
                  {visibleColumns.includes("phone") && <TableCell>{lead.phone || "—"}</TableCell>}
                  {visibleColumns.includes("leadType") && <TableCell className="capitalize">{lead.lead_type === "buyer" ? tx("buyer", "comprador") : lead.lead_type === "seller" ? tx("seller", "vendedor") : tx("pending", "pendiente")}</TableCell>}
                  {visibleColumns.includes("car") && <TableCell>{car ? `${car.year} ${car.brand} ${car.model}` : "—"}</TableCell>}
                  {visibleColumns.includes("buyerCriteria") && (
                    <TableCell className="text-sm text-muted-foreground max-w-[280px]">
                      {summarizeBuyerCriteria(lead)}
                    </TableCell>
                  )}
                  {visibleColumns.includes("status") && <TableCell>
                    {(() => {
                      const s = statusStyle(status);
                      const color = (s as { color?: string }).color || "#6B7280";
                      return (
                        <span
                          className="text-xs px-3 py-1 rounded-full font-medium"
                          style={{ backgroundColor: `${color}15`, color }}
                        >
                          {status ? translateStatusName(status.name, tx) : tx("Unassigned", "Sin asignar")}
                        </span>
                      );
                    })()}
                  </TableCell>}
                  {visibleColumns.includes("source") && <TableCell className="capitalize">{lead.source}</TableCell>}
                  {visibleColumns.includes("notes") && <TableCell className="text-sm max-w-[160px]" title={lead.notes ?? undefined}>
                    {truncateText(lead.notes, 48)}
                  </TableCell>}
                  {visibleColumns.includes("created") && <TableCell>{formatShortDate(lead.created_at, locale)}</TableCell>}
                  {visibleColumns.includes("updated") && <TableCell>{formatShortDate(lead.updated_at, locale)}</TableCell>}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {lead.lead_type === "buyer" ? (
                        <button type="button" className="p-1 hover:text-foreground text-muted-foreground" onClick={() => setMatchLead(lead)}>
                          <Link2 className="h-4 w-4" />
                        </button>
                      ) : null}
                      <button type="button" className="p-1 hover:text-foreground text-muted-foreground" onClick={() => setEditLead(lead)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" className="p-1 hover:text-destructive text-muted-foreground" onClick={() => onDeleteLead(lead.id)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button type="button" className="p-1 hover:text-foreground text-muted-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {tx("Showing", "Mostrando")} {filteredLeads.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
          -
          {Math.min(page * PAGE_SIZE, filteredLeads.length)} {tx("of", "de")} {filteredLeads.length} {tx("entries", "registros")}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" /> {tx("Previous", "Anterior")}
          </Button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="w-8 h-8 p-0"
              onClick={() => setPage(p)}
            >
              {p}
            </Button>
          ))}
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            {tx("Next", "Siguiente")} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-xl shadow-xl px-6 py-3 flex items-center gap-4 z-50">
          <span className="text-sm font-medium">{selected.size} {tx("Selected", "Seleccionados")}</span>
          <Button variant="outline" size="sm">{tx("Duplicate", "Duplicar")}</Button>
          <Button variant="outline" size="sm">{tx("Print", "Imprimir")}</Button>
          <Button variant="destructive" size="sm">{tx("Delete", "Eliminar")}</Button>
          <button type="button" onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground ml-2">✕</button>
        </div>
      )}

      <LeadEditDialog
        lead={editLead}
        open={!!editLead}
        onOpenChange={(open) => !open && setEditLead(null)}
        onSave={onUpdateLead}
        statuses={statuses}
        cars={cars}
      />

      <Dialog open={!!matchLead} onOpenChange={(open) => !open && setMatchLead(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>
              {tx("Match cars for", "Buscar autos para")} {matchLead?.name || tx("buyer lead", "lead comprador")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {matchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tx("No inventory matches yet.", "Todavia no hay coincidencias de inventario.")}</p>
            ) : (
              matchResults.map((m) => (
                <button
                  key={m.car.id}
                  type="button"
                  className="w-full rounded-md border border-border p-3 text-left transition-colors hover:bg-surface-hover"
                  onClick={() => {
                    if (!matchLead) return;
                    onUpdateLead({ ...matchLead, car_id: m.car.id, updated_at: new Date().toISOString() });
                    setMatchLead(null);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{m.car.year} {m.car.brand} {m.car.model}</p>
                    <span className="text-xs text-muted-foreground">{tx("Score", "Puntaje")} {m.score}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.reasons.slice(0, 2).map((r) => translateMatchReason(r, tx)).join(" · ")}
                  </p>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function translateLeadColumn(label: string) {
  switch (label) {
    case "Name":
      return "Nombre";
    case "Phone":
      return "Telefono";
    case "Lead type":
      return "Tipo de lead";
    case "Car":
      return "Auto";
    case "Buyer criteria":
      return "Criterios del comprador";
    case "Status":
      return "Estado";
    case "Source":
      return "Origen";
    case "Notes":
      return "Notas";
    case "Created":
      return "Creado";
    case "Updated":
      return "Actualizado";
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

function translateMatchReason(reason: string, tx: (enText: string, esText: string) => string) {
  return reason
    .replace("Price in budget", tx("Price in budget", "Precio dentro del presupuesto"))
    .replace("Price above min", tx("Price above min", "Precio por encima del minimo"))
    .replace("Price below max", tx("Price below max", "Precio por debajo del maximo"))
    .replace("Year match", tx("Year match", "Ano coincide"))
    .replace("Mileage within max", tx("Mileage within max", "Kilometraje dentro del maximo"))
    .replace("Make match", tx("Make match", "Marca coincide"))
    .replace("Model match", tx("Model match", "Modelo coincide"))
    .replace("Type match", tx("Type match", "Tipo coincide"))
    .replace("No strong criteria match", tx("No strong criteria match", "Sin coincidencia fuerte de criterios"));
}
