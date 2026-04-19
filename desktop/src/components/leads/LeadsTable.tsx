import { useState, useMemo, useEffect, useRef, useCallback, Fragment } from "react";
import {
  Link2,
  Pencil,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Search,
  GripVertical,
  X,
} from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Lead, LeadStatus, Car } from "@/types/leads";
import { LeadEditDialog } from "./LeadEditDialog";
import { TableSearchToolbar } from "@/components/table/TableSearchToolbar";
import { ManageTableFiltersDialog } from "@/components/table/ManageTableFiltersDialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { matchesFuzzy } from "@/lib/fuzzyMatch";
import {
  buildLeadSearchHaystackForColumns,
  defaultLeadSearchColumns,
  LEAD_SEARCH_COLUMN_IDS,
  LEAD_SEARCH_COLUMN_LABELS,
  reconcileColumnOrder,
  summarizeBuyerCriteria,
  type LeadSearchColumnId,
} from "@/lib/tableSearchHaystack";
import { cn } from "@/lib/utils";
import { StatusActivityChart, type StatusActivityRange } from "@/components/StatusActivityChart";
import { statusActivityKey } from "@/lib/statusActivityKeys";
import { isCreatedWithinActivityRange } from "@/lib/statusActivityDateRange";
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
  /** Increment to request opening a newly generated draft lead in this table context. */
  generateLeadSignal?: number;
}

const PAGE_SIZE = 9;

const tableCheckboxClassName =
  "border-border bg-transparent shadow-none ring-offset-transparent data-[state=unchecked]:bg-transparent data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground";

const stickyCheckboxHead =
  "w-10 sticky left-0 z-10 bg-card transition-colors duration-150 ease-linear group-hover:bg-surface-hover";
const stickyCheckboxCell =
  "sticky left-0 z-10 bg-card transition-colors duration-150 ease-linear group-hover:bg-surface-hover";

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

type TxFn = (en: string, es: string) => string;

function renderLeadColumnHead(colId: LeadSearchColumnId, tx: TxFn) {
  switch (colId) {
    case "name":
      return <TableHead className="min-w-[120px]">{tx("Name", "Nombre")}</TableHead>;
    case "instagram":
      return <TableHead className="min-w-[100px]">Instagram</TableHead>;
    case "phone":
      return <TableHead className="min-w-[100px]">{tx("Phone", "Teléfono")}</TableHead>;
    case "leadType":
      return <TableHead className="min-w-[88px]">{tx("Lead type", "Tipo de lead")}</TableHead>;
    case "car":
      return <TableHead className="min-w-[160px]">{tx("Car", "Auto")}</TableHead>;
    case "buyerCriteria":
      return <TableHead className="min-w-[220px]">{tx("Buyer criteria", "Criterios del comprador")}</TableHead>;
    case "status":
      return <TableHead className="min-w-[100px]">{tx("Status", "Estado")}</TableHead>;
    case "source":
      return <TableHead className="min-w-[88px]">{tx("Source", "Origen")}</TableHead>;
    case "notes":
      return <TableHead className="min-w-[140px]">{tx("Notes", "Notas")}</TableHead>;
    case "created":
      return <TableHead className="min-w-[100px]">{tx("Created", "Creado")}</TableHead>;
    case "updated":
      return <TableHead className="min-w-[100px]">{tx("Updated", "Actualizado")}</TableHead>;
    default: {
      const _e: never = colId;
      return _e;
    }
  }
}

function renderLeadColumnCell(
  colId: LeadSearchColumnId,
  ctx: {
    lead: Lead;
    status: LeadStatus | undefined;
    carLine: string;
    locale: string;
    tx: TxFn;
    truncateText: (s: string | null, max: number) => string;
    formatShortDate: (s: string | null, loc: string) => string;
    statusStyleFn: (status: LeadStatus | undefined) => { color?: string } | { bg: string; text: string };
  },
) {
  const { lead, status, carLine, locale, tx, truncateText, formatShortDate, statusStyleFn } = ctx;
  switch (colId) {
    case "name":
      return <TableCell className="font-medium">{lead.name || "—"}</TableCell>;
    case "instagram":
      return <TableCell>{lead.instagram_handle || "—"}</TableCell>;
    case "phone":
      return <TableCell>{lead.phone || "—"}</TableCell>;
    case "leadType":
      return (
        <TableCell className="capitalize">
          {lead.lead_type === "buyer"
            ? tx("buyer", "comprador")
            : lead.lead_type === "seller"
              ? tx("seller", "vendedor")
              : tx("pending", "pendiente")}
        </TableCell>
      );
    case "car":
      return <TableCell>{carLine}</TableCell>;
    case "buyerCriteria":
      return (
        <TableCell className="max-w-[280px] text-sm text-muted-foreground">
          {summarizeBuyerCriteria(lead)}
        </TableCell>
      );
    case "status": {
      const s = statusStyleFn(status);
      const color = (s as { color?: string }).color || "#6B7280";
      return (
        <TableCell>
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {status ? translateStatusName(status.name, tx) : tx("Unassigned", "Sin asignar")}
          </span>
        </TableCell>
      );
    }
    case "source":
      return <TableCell className="capitalize">{lead.source}</TableCell>;
    case "notes":
      return (
        <TableCell className="max-w-[160px] text-sm" title={lead.notes ?? undefined}>
          {truncateText(lead.notes, 48)}
        </TableCell>
      );
    case "created":
      return <TableCell>{formatShortDate(lead.created_at, locale)}</TableCell>;
    case "updated":
      return <TableCell>{formatShortDate(lead.updated_at, locale)}</TableCell>;
    default: {
      const _e: never = colId;
      return _e;
    }
  }
}

export function LeadsTable({
  leads,
  statuses,
  cars,
  onUpdateLead,
  onNotesDocumentAutosave,
  onDeleteLead,
  onAddLead,
  generateLeadSignal = 0,
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
      } catch {
        /* ignore */
      }
    })();
  };
  const [matchLead, setMatchLead] = useState<Lead | null>(null);
  const [carsToMatch, setCarsToMatch] = useState<Set<string>>(new Set());
  const [bulkMatchLead, setBulkMatchLead] = useState<Lead | null>(null);
  const [unmatchCarsOpen, setUnmatchCarsOpen] = useState(false);
  const [pendingDeleteLeadIds, setPendingDeleteLeadIds] = useState<string[] | null>(null);
  const [carToUnmatchId, setCarToUnmatchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activityRange, setActivityRange] = useState<StatusActivityRange>("All time");
  /** Table/search section expanded below the chart (hero view vs full list). */
  const [tableDetailOpen, setTableDetailOpen] = useState(false);
  /** Empty = no filter; otherwise lead rows must match a selected status-activity key (see StatusActivityChart). */
  const [statusActivitySelectedKeys, setStatusActivitySelectedKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [filterMode, setFilterMode] = useState<"drop" | "filter">("drop");
  const [statusFilterIds, setStatusFilterIds] = useState<Set<string>>(() => new Set());
  const [leadTypeFilters, setLeadTypeFilters] = useState<Set<Lead["lead_type"]>>(() => new Set());
  const [searchColumns, setSearchColumns] = useState<Set<LeadSearchColumnId>>(
    () => defaultLeadSearchColumns(),
  );
  const [leadColumnOrder, setLeadColumnOrder] = useState<LeadSearchColumnId[]>(() =>
    reconcileColumnOrder(LEAD_SEARCH_COLUMN_IDS, defaultLeadSearchColumns(), []),
  );
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [draftFilterMode, setDraftFilterMode] = useState<"drop" | "filter">("drop");
  const [draftSearchColumns, setDraftSearchColumns] = useState<Set<LeadSearchColumnId>>(
    () => new Set(),
  );
  const [draftColumnOrder, setDraftColumnOrder] = useState<LeadSearchColumnId[]>([]);
  const [draftStatusFilterIds, setDraftStatusFilterIds] = useState<Set<string>>(() => new Set());
  const [draftLeadTypeFilters, setDraftLeadTypeFilters] = useState<Set<Lead["lead_type"]>>(
    () => new Set(),
  );
  const [draftColumnSearchLeft, setDraftColumnSearchLeft] = useState("");
  const [draftColumnSearchRight, setDraftColumnSearchRight] = useState("");
  const lastHandledGenerateSignalRef = useRef(0);

  const getStatus = (id: string | null) => statuses.find((s) => s.id === id);
  const getCar = (id: string | null) => cars.find((c) => c.id === id);

  const dateFilteredLeads = useMemo(
    () =>
      leads.filter((lead) => isCreatedWithinActivityRange(lead.created_at, activityRange)),
    [leads, activityRange],
  );

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim();
    const cols =
      searchColumns.size === 0 ? defaultLeadSearchColumns() : searchColumns;
    return dateFilteredLeads.filter((lead) => {
      if (statusFilterIds.size > 0) {
        const sid = lead.status_id;
        if (!sid || !statusFilterIds.has(sid)) return false;
      }
      if (leadTypeFilters.size > 0 && !leadTypeFilters.has(lead.lead_type)) return false;
      if (statusActivitySelectedKeys.size > 0) {
        const st = lead.status_id ? statuses.find((s) => s.id === lead.status_id) : null;
        const statusName = st
          ? translateStatusName(st.name, tx)
          : tx("Unassigned", "Sin asignar");
        const key = statusActivityKey(statusName, st?.color ?? null);
        if (!statusActivitySelectedKeys.has(key)) return false;
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
  }, [dateFilteredLeads, statusFilterIds, leadTypeFilters, statusActivitySelectedKeys, searchQuery, statuses, cars, searchColumns, tx]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilterIds, leadTypeFilters, statusActivitySelectedKeys, searchColumns, activityRange]);

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

  const clearFilters = () => {
    const def = defaultLeadSearchColumns();
    setStatusFilterIds(new Set());
    setLeadTypeFilters(new Set());
    setStatusActivitySelectedKeys(new Set());
    setActivityRange("All time");
    setSearchQuery("");
    setSearchColumns(def);
    setLeadColumnOrder(reconcileColumnOrder(LEAD_SEARCH_COLUMN_IDS, def, []));
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

  const syncFilterDraftFromCommitted = useCallback(() => {
    setDraftFilterMode(filterMode);
    setDraftSearchColumns(new Set(searchColumns));
    setDraftColumnOrder(reconcileColumnOrder(LEAD_SEARCH_COLUMN_IDS, searchColumns, leadColumnOrder));
    setDraftStatusFilterIds(new Set(statusFilterIds));
    setDraftLeadTypeFilters(new Set(leadTypeFilters));
  }, [filterMode, searchColumns, leadColumnOrder, statusFilterIds, leadTypeFilters]);

  useEffect(() => {
    if (!filterDialogOpen) return;
    syncFilterDraftFromCommitted();
    setDraftColumnSearchLeft("");
    setDraftColumnSearchRight("");
  }, [filterDialogOpen, syncFilterDraftFromCommitted]);

  const commitFilterDialog = () => {
    setFilterMode(draftFilterMode);
    setSearchColumns(new Set(draftSearchColumns));
    setLeadColumnOrder([...draftColumnOrder]);
    setStatusFilterIds(new Set(draftStatusFilterIds));
    setLeadTypeFilters(new Set(draftLeadTypeFilters));
  };

  const resetFilterDraft = () => {
    const def = defaultLeadSearchColumns();
    setDraftFilterMode("drop");
    setDraftSearchColumns(new Set(def));
    setDraftColumnOrder(reconcileColumnOrder(LEAD_SEARCH_COLUMN_IDS, def, []));
    setDraftStatusFilterIds(new Set());
    setDraftLeadTypeFilters(new Set());
  };

  const draftAddColumn = (id: LeadSearchColumnId) => {
    setDraftSearchColumns((prev) => {
      const next = new Set(prev);
      next.add(id);
      setDraftColumnOrder((order) => reconcileColumnOrder(LEAD_SEARCH_COLUMN_IDS, next, order));
      return next;
    });
  };

  const draftRemoveColumn = (id: LeadSearchColumnId) => {
    setDraftSearchColumns((prev) => {
      const next = new Set(prev);
      if (next.size <= 1) return prev;
      next.delete(id);
      setDraftColumnOrder((order) => order.filter((x) => x !== id));
      return next;
    });
  };

  const draftMoveColumn = (index: number, dir: -1 | 1) => {
    setDraftColumnOrder((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const draftToggleStatusFilterId = (statusId: string) => {
    setDraftStatusFilterIds((prev) => {
      const n = new Set(prev);
      if (n.has(statusId)) n.delete(statusId);
      else n.add(statusId);
      return n;
    });
  };

  const draftToggleLeadTypeFilter = (leadType: Lead["lead_type"]) => {
    setDraftLeadTypeFilters((prev) => {
      const n = new Set(prev);
      if (n.has(leadType)) n.delete(leadType);
      else n.add(leadType);
      return n;
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

  const statusActivityItems = useMemo(
    () =>
      dateFilteredLeads.map((lead) => {
        const st = lead.status_id ? statuses.find((s) => s.id === lead.status_id) : null;
        const statusName = st
          ? translateStatusName(st.name, tx)
          : tx("Unassigned", "Sin asignar");
        return {
          id: lead.id,
          label: lead.name?.trim() || tx("Unnamed", "Sin nombre"),
          statusName,
          color: st?.color ?? undefined,
        };
      }),
    [dateFilteredLeads, statuses, tx],
  );

  const hasActiveFilters =
    !allLeadColumnsSelected(searchColumns) ||
    statusFilterIds.size > 0 ||
    leadTypeFilters.size > 0 ||
    statusActivitySelectedKeys.size > 0 ||
    searchQuery.trim().length > 0 ||
    activityRange !== "All time";

  const visibleColumnIds = leadColumnOrder;

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

  useEffect(() => {
    if (generateLeadSignal <= 0) return;
    if (lastHandledGenerateSignalRef.current === generateLeadSignal) return;
    lastHandledGenerateSignalRef.current = generateLeadSignal;
    void Promise.resolve(onAddLead()).then((created) => {
      beginEditLead(created);
    });
  }, [generateLeadSignal, onAddLead]);

  return (
    <div className="flex h-full min-h-0 max-w-full flex-1 flex-col gap-0">
      <div
        className={cn(
          "shrink-0 overflow-hidden transition-[max-height] duration-300 ease-out",
          tableDetailOpen && "max-h-[min(300px,36vh)] overflow-y-auto overscroll-y-contain",
        )}
      >
        <StatusActivityChart
          entity="lead"
          items={statusActivityItems}
          range={activityRange}
          onRangeChange={setActivityRange}
          selectedKeys={statusActivitySelectedKeys}
          onSelectedKeysChange={setStatusActivitySelectedKeys}
          onItemClick={(itemId) => {
            const lead = leads.find((l) => String(l.id) === String(itemId));
            if (lead) beginEditLead(lead);
          }}
        />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col rounded-t-xl border border-b-0 border-border bg-card shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.08)]">
        {tableDetailOpen && (
          <div className="flex shrink-0 justify-center border-b border-border bg-card py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setTableDetailOpen(false)}
            >
              <ChevronUp className="h-4 w-4" />
              {tx("Back to chart", "Volver al gráfico")}
            </Button>
          </div>
        )}

        <div
          className={cn(
            "relative flex min-h-0 flex-1 flex-col",
            tableDetailOpen
              ? "overflow-y-auto overflow-x-hidden overscroll-y-contain"
              : "overflow-hidden",
          )}
        >
          {!tableDetailOpen && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/40 backdrop-blur-[2px]">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-14 w-14 rounded-full shadow-lg"
                onClick={() => setTableDetailOpen(true)}
                aria-label={tx("Expand table", "Expandir tabla")}
              >
                <ChevronDown className="h-8 w-8" />
              </Button>
            </div>
          )}

          <div
            className={cn(
              "flex w-full min-w-0 flex-col gap-4 px-1",
              tableDetailOpen ? "pb-8 pt-2" : "max-h-[min(260px,40vh)] overflow-hidden blur-sm",
            )}
          >
      <TableSearchToolbar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={tx("Search leads (name, car, notes, status…)", "Buscar leads (nombre, auto, notas, estado...)")}
        onOpenFilters={() => setFilterDialogOpen(true)}
        filterActive={hasActiveFilters}
      />

      <ManageTableFiltersDialog
        open={filterDialogOpen}
        onOpenChange={setFilterDialogOpen}
        title={tx("Manage filters", "Gestionar filtros")}
        description={tx(
          "Select columns to show and optional filters. Save to apply.",
          "Selecciona columnas y filtros opcionales. Guarda para aplicar.",
        )}
        onSave={commitFilterDialog}
        onReset={resetFilterDraft}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 rounded-md border border-border p-1">
            <button
              type="button"
              className={cn(
                "rounded-sm px-2 py-1.5 text-sm font-medium capitalize transition-colors",
                draftFilterMode === "drop" ? "bg-primary/15 text-foreground" : "text-muted-foreground",
              )}
              onClick={() => setDraftFilterMode("drop")}
            >
              {tx("Columns", "Columnas")}
            </button>
            <button
              type="button"
              className={cn(
                "rounded-sm px-2 py-1.5 text-sm font-medium capitalize transition-colors",
                draftFilterMode === "filter" ? "bg-primary/15 text-foreground" : "text-muted-foreground",
              )}
              onClick={() => setDraftFilterMode("filter")}
            >
              {tx("Filter", "Filtrar")}
            </button>
          </div>

          {draftFilterMode === "drop" ? (
            <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-start">
              <div className="flex min-h-[280px] flex-col rounded-lg border border-border bg-muted/20">
                <div className="border-b border-border px-3 py-2 text-sm font-medium">
                  {tx("Column options", "Opciones de columnas")}
                </div>
                <div className="relative border-b border-border px-2 py-2">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={draftColumnSearchLeft}
                    onChange={(e) => setDraftColumnSearchLeft(e.target.value)}
                    placeholder={tx("Search properties", "Buscar propiedades")}
                    className="h-9 pl-9"
                  />
                </div>
                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                  {LEAD_SEARCH_COLUMN_IDS.filter((colId) => {
                    if (draftSearchColumns.has(colId)) return false;
                    const label = tx(LEAD_SEARCH_COLUMN_LABELS[colId], translateLeadColumn(LEAD_SEARCH_COLUMN_LABELS[colId]));
                    const q = draftColumnSearchLeft.trim();
                    if (!q) return true;
                    return matchesFuzzy(q, label);
                  }).map((colId) => (
                    <button
                      key={colId}
                      type="button"
                      className="flex w-full items-center justify-between rounded-md border border-transparent bg-background px-2 py-2 text-left text-sm transition-colors hover:bg-muted/60"
                      onClick={() => draftAddColumn(colId)}
                    >
                      <span className="font-medium">{tx(LEAD_SEARCH_COLUMN_LABELS[colId], translateLeadColumn(LEAD_SEARCH_COLUMN_LABELS[colId]))}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="hidden items-center justify-center pt-10 md:flex" aria-hidden>
                <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
              </div>

              <div className="flex min-h-[280px] flex-col rounded-lg border border-border bg-muted/20">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="text-sm font-medium">{tx("Selected columns", "Columnas seleccionadas")}</span>
                  <Badge variant="secondary" className="tabular-nums">
                    {draftColumnOrder.length}
                  </Badge>
                </div>
                <div className="relative border-b border-border px-2 py-2">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={draftColumnSearchRight}
                    onChange={(e) => setDraftColumnSearchRight(e.target.value)}
                    placeholder={tx("Search column", "Buscar columna")}
                    className="h-9 pl-9"
                  />
                </div>
                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                  {draftColumnOrder.map((colId, index) => {
                    const label = tx(LEAD_SEARCH_COLUMN_LABELS[colId], translateLeadColumn(LEAD_SEARCH_COLUMN_LABELS[colId]));
                    const q = draftColumnSearchRight.trim();
                    if (q && !matchesFuzzy(q, label)) return null;
                    return (
                      <div
                        key={colId}
                        className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-2 text-sm"
                      >
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0 flex-1 font-medium">{label}</span>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={index === 0}
                            onClick={() => draftMoveColumn(index, -1)}
                            aria-label={tx("Move up", "Subir")}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={index >= draftColumnOrder.length - 1}
                            onClick={() => draftMoveColumn(index, 1)}
                            aria-label={tx("Move down", "Bajar")}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => draftRemoveColumn(colId)}
                            disabled={draftColumnOrder.length <= 1}
                            aria-label={tx("Remove column", "Quitar columna")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-lg border border-border p-3">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">{tx("Status", "Estado")}</p>
                <div className="flex flex-wrap gap-2">
                  {sortedStatuses.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => draftToggleStatusFilterId(s.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm transition-colors",
                        draftStatusFilterIds.has(s.id)
                          ? "border-primary/50 bg-primary/15 text-foreground"
                          : "border-border bg-muted/50 text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {translateStatusName(s.name, tx)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">{tx("Lead type", "Tipo de lead")}</p>
                <div className="flex flex-wrap gap-2">
                  {(["buyer", "seller", "pending"] as const).map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => draftToggleLeadTypeFilter(type)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm capitalize transition-colors",
                        draftLeadTypeFilters.has(type)
                          ? "border-primary/50 bg-primary/15 text-foreground"
                          : "border-border bg-muted/50 text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {type === "buyer" ? tx("buyer", "comprador") : type === "seller" ? tx("seller", "vendedor") : tx("pending", "pendiente")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </ManageTableFiltersDialog>

      <div className="rounded-lg border border-border overflow-x-scroll overscroll-x-none">
        <Table scrollWrapper={false}>
          <TableHeader>
            <TableRow className="group border-b-2 border-primary transition-colors duration-150 ease-linear hover:bg-surface-hover">
              <TableHead className={stickyCheckboxHead}>
                <Checkbox
                  className={tableCheckboxClassName}
                  checked={selected.size === paged.length && paged.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              {visibleColumnIds.map((colId) => (
                <Fragment key={colId}>{renderLeadColumnHead(colId, tx)}</Fragment>
              ))}
              <TableHead className="min-w-[100px]">{tx("Actions", "Acciones")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((lead) => {
              const status = getStatus(lead.status_id);
              const carIds = getAllCarIdsForLead(lead);
              let carLine = "—";
              if (carIds.length > 0) {
                const first = cars.find((c) => c.id === carIds[0]);
                const label = first ? `${first.year} ${first.brand} ${first.model}` : "—";
                carLine = carIds.length > 1 ? `${label} (+${carIds.length - 1})` : label;
              }
              return (
                <TableRow
                  key={lead.id}
                  className="group cursor-pointer transition-colors duration-150 ease-linear hover:bg-surface-hover"
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
                  {visibleColumnIds.map((colId) => (
                    <Fragment key={colId}>
                      {renderLeadColumnCell(
                        colId,
                        {
                          lead,
                          status,
                          carLine,
                          locale,
                          tx,
                          truncateText,
                          formatShortDate,
                          statusStyleFn: statusStyle,
                        },
                      )}
                    </Fragment>
                  ))}
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
        </div>
      </div>
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
