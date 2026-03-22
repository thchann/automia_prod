import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { Pencil, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
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

interface LeadsTableProps {
  leads: Lead[];
  statuses: LeadStatus[];
  cars: Car[];
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onAddLead: () => void;
}

const PAGE_SIZE = 9;

const tableCheckboxClassName =
  "border-border bg-transparent shadow-none ring-offset-transparent data-[state=unchecked]:bg-transparent data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground";

const stickyCheckboxHead =
  "w-10 sticky left-0 z-10 border-r border-border bg-background shadow-sm";
const stickyCheckboxCell =
  "sticky left-0 z-10 border-r border-border bg-background shadow-sm group-hover:bg-surface-hover";

function formatShortDate(s: string | null) {
  if (!s) return "—";
  try {
    return format(new Date(s), "dd MMM yyyy");
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

function truncateId(id: string, max = 14) {
  if (id.length <= max) return id;
  return `${id.slice(0, max - 1)}…`;
}

function allLeadColumnsSelected(s: Set<LeadSearchColumnId>) {
  return (
    s.size === LEAD_SEARCH_COLUMN_IDS.length &&
    LEAD_SEARCH_COLUMN_IDS.every((id) => s.has(id))
  );
}

export function LeadsTable({ leads, statuses, cars, onUpdateLead, onDeleteLead, onAddLead }: LeadsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [showGenerateMenu, setShowGenerateMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  /** Which status values to keep when Status column is active; empty = any status. */
  const [statusFilterIds, setStatusFilterIds] = useState<Set<string>>(() => new Set());
  const [searchColumns, setSearchColumns] = useState<Set<LeadSearchColumnId>>(
    () => defaultLeadSearchColumns(),
  );
  const [statusSubOpen, setStatusSubOpen] = useState(false);

  const getStatus = (id: string | null) => statuses.find((s) => s.id === id);
  const getCar = (id: string | null) => cars.find((c) => c.id === id);

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim();
    const cols =
      searchColumns.size === 0 ? defaultLeadSearchColumns() : searchColumns;
    return leads.filter((lead) => {
      if (cols.has("status") && statusFilterIds.size > 0) {
        const sid = lead.status_id;
        if (!sid || !statusFilterIds.has(sid)) return false;
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
  }, [leads, statusFilterIds, searchQuery, statuses, cars, searchColumns]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilterIds, searchColumns]);

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

  const toggleStatusFilter = (statusId: string) => {
    setStatusFilterIds((prev) => {
      const next = new Set(prev);
      if (next.has(statusId)) next.delete(statusId);
      else next.add(statusId);
      return next;
    });
  };

  const toggleLeadColumn = (id: LeadSearchColumnId) => {
    setSearchColumns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
        if (id === "status") setStatusSubOpen(false);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setStatusFilterIds(new Set());
    setSearchQuery("");
    setSearchColumns(defaultLeadSearchColumns());
    setStatusSubOpen(false);
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
    searchQuery.trim().length > 0;

  return (
    <div className="flex max-w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">All Leads</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Bulk Update Status</Button>
          <Button variant="outline" size="sm">Export Leads</Button>
          <div className="relative">
            <Button size="sm" onClick={() => setShowGenerateMenu(!showGenerateMenu)}>
              + Generate Lead <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
            {showGenerateMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm hover:bg-surface-hover transition-colors"
                  onClick={() => { onAddLead(); setShowGenerateMenu(false); }}
                >
                  Manual entry
                </button>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm text-muted-foreground cursor-not-allowed"
                  disabled
                >
                  Import CSV
                </button>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm text-muted-foreground cursor-not-allowed"
                  disabled
                >
                  From Instagram
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Leads", value: totalLeads, color: "bg-blue-500" },
          { label: "New Leads", value: newLeads, color: "bg-amber-500" },
          { label: "Contacted", value: contactedLeads, color: "bg-emerald-500" },
          { label: "Qualified", value: qualifiedLeads, color: "bg-red-500" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${stat.color}`} />
              {stat.label}
            </div>
            <div className="text-2xl font-semibold text-foreground mt-1">{stat.value}</div>
          </div>
        ))}
      </div>

      <TableSearchToolbar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search leads (name, car, notes, status…)"
        filterContent={(
          <div className="space-y-1 p-3">
            <p className="text-xs text-muted-foreground">
              Toggle columns to include them in search.{" "}
              <span className="font-medium text-foreground">Status</span> adds
              value filters.
            </p>
            <div className="max-h-[min(50vh,18rem)] space-y-1 overflow-y-auto pr-1">
              {LEAD_SEARCH_COLUMN_IDS.map((colId) => {
                const active = searchColumns.has(colId);
                const isStatus = colId === "status";
                return (
                  <div key={colId} className="space-y-1">
                    <div
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
                        {LEAD_SEARCH_COLUMN_LABELS[colId]}
                        {!active ? (
                          <span className="ml-1 text-[10px] uppercase text-muted-foreground">
                            off
                          </span>
                        ) : null}
                      </button>
                      {isStatus && active ? (
                        <button
                          type="button"
                          className="shrink-0 rounded p-1 hover:bg-background/60"
                          aria-expanded={statusSubOpen}
                          aria-label="Status value filters"
                          onClick={(e) => {
                            e.preventDefault();
                            setStatusSubOpen((o) => !o);
                          }}
                        >
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform",
                              statusSubOpen && "rotate-180",
                            )}
                          />
                        </button>
                      ) : null}
                    </div>
                    {isStatus && active && statusSubOpen ? (
                      <div className="ml-1 space-y-2 border-l-2 border-border py-1 pl-3">
                        <p className="text-[11px] text-muted-foreground">
                          Match any checked status (none checked = any)
                        </p>
                        {statuses.map((s) => (
                          <label
                            key={s.id}
                            className="flex cursor-pointer items-center gap-2 text-sm"
                          >
                            <Checkbox
                              className={tableCheckboxClassName}
                              checked={statusFilterIds.has(s.id)}
                              onCheckedChange={() => toggleStatusFilter(s.id)}
                            />
                            <span>{s.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={clearFilters}
              >
                Clear search &amp; filters
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
              <TableHead className="min-w-[120px]">Name</TableHead>
              <TableHead className="min-w-[100px]">Instagram</TableHead>
              <TableHead className="min-w-[100px]">Phone</TableHead>
              <TableHead className="min-w-[88px]">Lead type</TableHead>
              <TableHead className="min-w-[160px]">Car</TableHead>
              <TableHead className="min-w-[220px]">Buyer criteria</TableHead>
              <TableHead className="min-w-[100px]">Status</TableHead>
              <TableHead className="min-w-[88px]">Source</TableHead>
              <TableHead className="min-w-[140px]">Notes</TableHead>
              <TableHead className="min-w-[120px]">Sender ID</TableHead>
              <TableHead className="min-w-[100px]">Created</TableHead>
              <TableHead className="min-w-[100px]">Updated</TableHead>
              <TableHead className="min-w-[100px]">Actions</TableHead>
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
                  <TableCell className="font-medium">{lead.name || "—"}</TableCell>
                  <TableCell>{lead.instagram_handle || "—"}</TableCell>
                  <TableCell>{lead.phone || "—"}</TableCell>
                  <TableCell className="capitalize">{lead.lead_type}</TableCell>
                  <TableCell>{car ? `${car.year} ${car.brand} ${car.model}` : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[280px]">
                    {summarizeBuyerCriteria(lead)}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const s = statusStyle(status);
                      const color = (s as { color?: string }).color || "#6B7280";
                      return (
                        <span
                          className="text-xs px-3 py-1 rounded-full font-medium"
                          style={{ backgroundColor: `${color}15`, color }}
                        >
                          {status?.name || "Unassigned"}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="capitalize">{lead.source}</TableCell>
                  <TableCell className="text-sm max-w-[160px]" title={lead.notes ?? undefined}>
                    {truncateText(lead.notes, 48)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground" title={lead.platform_sender_id}>
                    {truncateId(lead.platform_sender_id)}
                  </TableCell>
                  <TableCell>{formatShortDate(lead.created_at)}</TableCell>
                  <TableCell>{formatShortDate(lead.updated_at)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
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
          Showing {filteredLeads.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
          -
          {Math.min(page * PAGE_SIZE, filteredLeads.length)} of {filteredLeads.length} entries
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Previous
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
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-xl shadow-xl px-6 py-3 flex items-center gap-4 z-50">
          <span className="text-sm font-medium">{selected.size} Selected</span>
          <Button variant="outline" size="sm">Duplicate</Button>
          <Button variant="outline" size="sm">Print</Button>
          <Button variant="destructive" size="sm">Delete</Button>
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
    </div>
  );
}
