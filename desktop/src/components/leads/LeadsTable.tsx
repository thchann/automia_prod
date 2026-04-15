import { useState, useMemo, useEffect } from "react";
import {
  Link2,
  Pencil,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
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
import { matchLeadToCars } from "@/lib/matchLeadToCars";
import { useLanguage } from "@/i18n/LanguageProvider";
import { getLead } from "@automia/api";
import { hydrateLeadResponseCarLinks, mapLeadFromApi } from "@/lib/apiMappers";
import { isDraftRecordId } from "@/lib/draftIds";
import { getAllCarIdsForLead, getLeadsForCar, mergeCarIdsIntoLead } from "@/lib/leadCarLinks";

interface LeadsTableProps {
  leads: Lead[];
  statuses: LeadStatus[];
  cars: Car[];
  onUpdateLead: (lead: Lead) => void | Promise<void>;
  onNotesDocumentAutosave?: (leadId: string, document: Record<string, unknown>) => void | Promise<void>;
  onDeleteLead: (id: string) => void | Promise<void>;
  onAddLead: () => Lead | Promise<Lead>;
}

const PAGE_SIZE = 9;

/** Card filter key for leads with `status_id == null`. */
const UNASSIGNED_STATUS_KEY = "__unassigned__";

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

export function LeadsTable({
  leads,
  statuses,
  cars,
  onUpdateLead,
  onNotesDocumentAutosave,
  onDeleteLead,
  onAddLead,
}: LeadsTableProps) {
  const { tx, locale } = useLanguage();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [editLead, setEditLead] = useState<Lead | null>(null);

  const beginEditLead = (l: Lead) => {
    setEditLead(l);
    if (isDraftRecordId(l.id)) {
      return;
    }
    void (async () => {
      try {
        const r = await getLead(l.id);
        const merged = await hydrateLeadResponseCarLinks(l.id, r);
        setEditLead(mapLeadFromApi(merged, statuses));
      } catch {}
    })();
  };
  const [matchLead, setMatchLead] = useState<Lead | null>(null);
  const [carsToMatch, setCarsToMatch] = useState<Set<string>>(new Set());
  const [bulkMatchLead, setBulkMatchLead] = useState<Lead | null>(null);
  const [unmatchCarsOpen, setUnmatchCarsOpen] = useState(false);
  const [pendingDeleteLeadIds, setPendingDeleteLeadIds] = useState<string[] | null>(null);
  const [carToUnmatchId, setCarToUnmatchId] = useState<string | null>(null);
  const [showGenerateMenu, setShowGenerateMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  /** Selected pipeline status id, or `__unassigned__` for leads with no status; `null` = no card filter. */
  const [cardFilter, setCardFilter] = useState<string | null>(null);
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
      if (cardFilter != null) {
        if (cardFilter === UNASSIGNED_STATUS_KEY) {
          if (lead.status_id != null) return false;
        } else if (lead.status_id !== cardFilter) {
          return false;
        }
      }
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

  const sortedStatuses = useMemo(
    () => [...statuses].sort((a, b) => a.display_order - b.display_order),
    [statuses],
  );
  const unassignedCount = leads.filter((l) => l.status_id == null).length;

  const leadStatusCardCount = sortedStatuses.length + (unassignedCount > 0 ? 1 : 0);
  /** One row: cards share width when the row fits the viewport; scroll horizontally when there are many. */
  const leadStatusRowMinWidth = `max(100%, ${Math.max(leadStatusCardCount, 1) * 280}px)`;

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
    () => (matchLead ? matchLeadToCars(matchLead, cars) : []),
    [matchLead, cars],
  );

  const selectedLead =
    selected.size === 1 ? leads.find((lead) => lead.id === Array.from(selected)[0]) ?? null : null;

  /** Link one or more cars to a lead in a single update (required when linking multiple cars — sequential updates read stale `leads`). */
  const assignCarsToLead = (leadId: string, carIds: string[]) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || carIds.length === 0) return;
    const merged = mergeCarIdsIntoLead(lead, carIds);
    onUpdateLead({
      ...lead,
      ...merged,
      updated_at: new Date().toISOString(),
    });
  };

  const assignLeadToCar = (leadId: string, carId: string) => {
    assignCarsToLead(leadId, [carId]);
  };

  const translateLeadType = (leadType: Lead["lead_type"]) => (
    leadType === "buyer"
      ? tx("buyer", "comprador")
      : leadType === "seller"
      ? tx("seller", "vendedor")
      : tx("pending", "pendiente")
  );

  const requestAssignLeadToCar = (targetLeadId: string, carId: string, mode: "single" | "bulk") => {
    assignLeadToCar(targetLeadId, carId);
    if (mode === "single") {
      setMatchLead(null);
      setCarsToMatch(new Set());
    } else {
      setBulkMatchLead(null);
      setSelected(new Set());
    }
  };

  const confirmDeleteLeads = () => {
    const ids = pendingDeleteLeadIds;
    if (!ids?.length) return;
    for (const leadId of ids) void onDeleteLead(leadId);
    setPendingDeleteLeadIds(null);
    setSelected(new Set());
  };

  const selectedLeadForUnmatch = useMemo(() => {
    if (selected.size !== 1) return null;
    const id = Array.from(selected)[0];
    return leads.find((l) => l.id === id) ?? null;
  }, [selected, leads]);

  const connectedCarsFromSelectedLead = useMemo(() => {
    if (!selectedLeadForUnmatch) return [];
    const ids = getAllCarIdsForLead(selectedLeadForUnmatch);
    return ids.map((id) => getCar(id)).filter(Boolean) as Car[];
  }, [selectedLeadForUnmatch, cars]); // eslint-disable-line react-hooks/exhaustive-deps

  const openUnmatchDialog = () => {
    if (!selectedLeadForUnmatch) return;
    const ids = getAllCarIdsForLead(selectedLeadForUnmatch);
    setCarToUnmatchId(ids[0] ?? null);
    setUnmatchCarsOpen(true);
  };

  const confirmUnmatch = () => {
    const now = new Date().toISOString();
    if (selectedLeadForUnmatch && carToUnmatchId) {
      const nextIds = getAllCarIdsForLead(selectedLeadForUnmatch).filter((id) => id !== carToUnmatchId);
      onUpdateLead({
        ...selectedLeadForUnmatch,
        car_id: nextIds[0] ?? null,
        car_ids: nextIds.length ? nextIds : null,
        updated_at: now,
      });
    }

    setUnmatchCarsOpen(false);
    setCarToUnmatchId(null);
    setSelected(new Set());
  };

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
                    void Promise.resolve(onAddLead()).then((created) => {
                      beginEditLead(created);
                      setShowGenerateMenu(false);
                    });
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

      <div className="-mx-1 snap-x snap-proximity overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1">
        <div
          className="flex min-w-0 flex-nowrap gap-4 px-1"
          style={{ minWidth: leadStatusRowMinWidth }}
        >
          {sortedStatuses.map((s) => {
            const count = leads.filter((l) => l.status_id === s.id).length;
            const label = translateStatusName(s.name, tx);
            const active = cardFilter === s.id;
            const dotColor = s.color?.trim() || null;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  setCardFilter((prev) => (prev === s.id ? null : s.id))
                }
                className={cn(
                  "min-w-[200px] flex-1 basis-0 snap-start rounded-lg border p-4 text-left transition-colors",
                  active ? "border-primary bg-primary/10" : "border-border hover:bg-surface-hover",
                )}
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/80"
                    style={dotColor ? { backgroundColor: dotColor } : undefined}
                  />
                  <span className="line-clamp-2">{label}</span>
                </div>
                <div className="mt-1 text-2xl font-semibold text-foreground">{count}</div>
              </button>
            );
          })}
          {unassignedCount > 0 ? (
            <button
              type="button"
              onClick={() =>
                setCardFilter((prev) =>
                  prev === UNASSIGNED_STATUS_KEY ? null : UNASSIGNED_STATUS_KEY,
                )
              }
              className={cn(
                "min-w-[200px] flex-1 basis-0 snap-start rounded-lg border p-4 text-left transition-colors",
                cardFilter === UNASSIGNED_STATUS_KEY
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-surface-hover",
              )}
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/60" />
                <span className="line-clamp-2">{tx("Unassigned", "Sin asignar")}</span>
              </div>
              <div className="mt-1 text-2xl font-semibold text-foreground">{unassignedCount}</div>
            </button>
          ) : null}
        </div>
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
              {visibleColumns.includes("phone") && <TableHead className="min-w-[100px]">{tx("Phone", "Teléfono")}</TableHead>}
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
              const carIds = getAllCarIdsForLead(lead);
              const car =
                (carIds.length ? getCar(carIds[0]) : null) ?? getCar(lead.car_id);
              return (
                <TableRow
                  key={lead.id}
                  className="group cursor-pointer hover:bg-surface-hover"
                  onClick={() => beginEditLead(lead)}
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
                  {visibleColumns.includes("car") && (
                    <TableCell>
                      {(() => {
                        const ids = getAllCarIdsForLead(lead);
                        if (ids.length === 0) return "—";
                        const first = cars.find((c) => c.id === ids[0]);
                        const label = first ? `${first.year} ${first.brand} ${first.model}` : "—";
                        return ids.length > 1 ? `${label} (+${ids.length - 1})` : label;
                      })()}
                    </TableCell>
                  )}
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
                      <button type="button" className="p-1 hover:text-foreground text-muted-foreground" onClick={() => beginEditLead(lead)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="p-1 hover:text-destructive text-muted-foreground"
                        onClick={() => setPendingDeleteLeadIds([lead.id])}
                      >
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
          {selected.size === 1 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedLead) setBulkMatchLead(selectedLead);
                }}
              >
                {tx("Match", "Vincular")}
              </Button>

              {selectedLeadForUnmatch?.car_id || (selectedLeadForUnmatch?.car_ids?.length ?? 0) > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openUnmatchDialog}
                >
                  {tx("Unmatch", "Desvincular")}
                </Button>
              ) : null}
            </>
          ) : null}
          <Button variant="destructive" size="sm" onClick={() => setPendingDeleteLeadIds(Array.from(selected))}>
            {tx("Delete", "Eliminar")}
          </Button>
          <button type="button" onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground ml-2">✕</button>
        </div>
      )}

      <LeadEditDialog
        lead={editLead}
        open={!!editLead}
        onOpenChange={(open) => !open && setEditLead(null)}
        onSave={onUpdateLead}
        onNotesDocumentAutosave={onNotesDocumentAutosave}
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
              matchResults.map((m) => {
                const leadsForCar = getLeadsForCar(m.car.id, leads);
                const primary = leadsForCar[0];
                const moreCount = Math.max(0, leadsForCar.length - 1);
                return (
                  <div
                    key={m.car.id}
                    className="w-full rounded-md border border-border p-3 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          checked={carsToMatch.has(m.car.id)}
                          onCheckedChange={() => {
                            setCarsToMatch((prev) => {
                              const next = new Set(prev);
                              if (next.has(m.car.id)) next.delete(m.car.id);
                              else next.add(m.car.id);
                              return next;
                            });
                          }}
                        />
                        <p className="font-medium truncate">{m.car.year} {m.car.brand} {m.car.model}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{tx("Score", "Puntaje")} {m.score}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {m.reasons.slice(0, 2).map((r) => translateMatchReason(r, tx)).join(" · ")}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
                        {primary ? translateLeadType(primary.lead_type) : tx("Unassigned", "Sin asignar")}
                      </span>
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
                        {primary
                          ? `${primary.name || tx("Unnamed", "Sin nombre")}${moreCount > 0 ? ` (+${moreCount})` : ""}`
                          : tx("No match", "Sin vincular")}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setCarsToMatch(new Set());
                setMatchLead(null);
              }}
            >
              {tx("Cancel", "Cancelar")}
            </Button>
            <Button
              disabled={!matchLead || carsToMatch.size === 0}
              onClick={() => {
                if (!matchLead || carsToMatch.size === 0) return;
                assignCarsToLead(matchLead.id, Array.from(carsToMatch));
                setCarsToMatch(new Set());
                setMatchLead(null);
              }}
            >
              {tx("Match selected", "Vincular seleccionados")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!bulkMatchLead} onOpenChange={(open) => !open && setBulkMatchLead(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>
              {tx("Match car for", "Vincular auto para")} {bulkMatchLead?.name || tx("lead", "lead")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {cars.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tx("No cars available.", "No hay autos disponibles.")}</p>
            ) : (
              cars.map((car) => (
                <button
                  key={car.id}
                  type="button"
                  className="w-full rounded-md border border-border p-3 text-left transition-colors hover:bg-surface-hover"
                  onClick={() => {
                    if (!bulkMatchLead) return;
                    requestAssignLeadToCar(bulkMatchLead.id, car.id, "bulk");
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{car.year} {car.brand} {car.model}</p>
                    <span className="text-xs text-muted-foreground capitalize">
                      {car.status === "available" ? tx("available", "disponible") : tx("sold", "vendido")}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {(() => {
                      const leadsForCar = getLeadsForCar(car.id, leads);
                      const primary = leadsForCar[0];
                      const moreCount = Math.max(0, leadsForCar.length - 1);
                      return (
                        <>
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
                            {primary ? translateLeadType(primary.lead_type) : tx("Unassigned", "Sin asignar")}
                          </span>
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
                            {primary
                              ? `${primary.name || tx("Unnamed", "Sin nombre")}${moreCount > 0 ? ` (+${moreCount})` : ""}`
                              : tx("No match", "Sin vincular")}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={unmatchCarsOpen} onOpenChange={(open) => !open && setUnmatchCarsOpen(false)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>
              {tx("Unmatch cars", "Desvincular autos")}
              {selectedLeadForUnmatch?.name ? ` · ${selectedLeadForUnmatch.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {connectedCarsFromSelectedLead.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {tx("No connected cars found.", "No se encontraron autos conectados.")}
              </p>
            ) : (
              <div className="space-y-2">
                {connectedCarsFromSelectedLead.map((car) => {
                  const orderedIds = selectedLeadForUnmatch
                    ? getAllCarIdsForLead(selectedLeadForUnmatch)
                    : [];
                  const idx = orderedIds.indexOf(car.id);
                  const reorderDisabled = true;
                  return (
                    <div
                      key={car.id}
                      className="flex items-start gap-3 rounded-md border border-border p-3"
                    >
                      <div className="pt-0.5">
                        <Checkbox
                          checked={carToUnmatchId === car.id}
                          onCheckedChange={() => setCarToUnmatchId(car.id)}
                        />
                      </div>
                      <div className="flex flex-col gap-0.5 pt-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          disabled={reorderDisabled}
                          title={tx(
                            "Order is fixed by link time (reorder API not available).",
                            "El orden sigue la fecha del vínculo (reordenar no disponible).",
                          )}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          disabled={reorderDisabled}
                          title={tx(
                            "Order is fixed by link time (reorder API not available).",
                            "El orden sigue la fecha del vínculo (reordenar no disponible).",
                          )}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {car.year} {car.brand} {car.model}
                          </p>
                          {idx === 0 ? (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                              {tx("Primary", "Principal")}
                            </span>
                          ) : null}
                        </div>

                        {selectedLeadForUnmatch ? (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {translateLeadType(selectedLeadForUnmatch.lead_type)}
                            </span>
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {selectedLeadForUnmatch.name || tx("Unnamed", "Sin nombre")}
                            </span>
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {tx("Unassigned", "Sin asignar")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setUnmatchCarsOpen(false);
                  setCarToUnmatchId(null);
                }}
              >
                {tx("Cancel", "Cancelar")}
              </Button>
              <Button
                onClick={confirmUnmatch}
                disabled={!carToUnmatchId}
              >
                {tx("Unmatch selected", "Desvincular seleccionados")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDeleteLeadIds != null && pendingDeleteLeadIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteLeadIds(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tx("Delete lead(s)?", "¿Eliminar lead(s)?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteLeadIds && pendingDeleteLeadIds.length === 1
                ? tx("This lead will be permanently removed.", "Este lead se eliminará de forma permanente.")
                : tx("These leads will be permanently removed.", "Estos leads se eliminarán de forma permanente.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tx("Cancel", "Cancelar")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDeleteLeads}>
              {tx("Delete", "Eliminar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function translateLeadColumn(label: string) {
  switch (label) {
    case "Name":
      return "Nombre";
    case "Phone":
      return "Teléfono";
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
    .replace("Price above min", tx("Price above min", "Precio por encima del mínimo"))
    .replace("Price below max", tx("Price below max", "Precio por debajo del máximo"))
    .replace("Year match", tx("Year match", "Año coincide"))
    .replace("Mileage within max", tx("Mileage within max", "Kilometraje dentro del máximo"))
    .replace("Make match", tx("Make match", "Marca coincide"))
    .replace("Model match", tx("Model match", "Modelo coincide"))
    .replace("Type match", tx("Type match", "Tipo coincide"))
    .replace("No strong criteria match", tx("No strong criteria match", "Sin coincidencia fuerte de criterios"));
}
