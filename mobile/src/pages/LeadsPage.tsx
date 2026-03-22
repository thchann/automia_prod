import { useState, useMemo } from "react";
import { mockLeads as initialLeads, mockStatuses, mockCars } from "@/data/mock";
import type { Lead } from "@/types/models";
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

const fmt = (n: number | null) => (n != null ? `$${n.toLocaleString()}` : "—");

const tableCheckboxClassName =
  "border-border bg-transparent shadow-none ring-offset-transparent data-[state=unchecked]:bg-transparent data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground";

const LeadsPage = () => {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilterIds, setStatusFilterIds] = useState<Set<string>>(() => new Set());
  const [searchColumns, setSearchColumns] = useState<Set<LeadSearchColumnId>>(
    () => defaultLeadSearchColumns(),
  );
  const [statusSubOpen, setStatusSubOpen] = useState(false);

  const getStatusName = (id: string | null) => {
    const s = mockStatuses.find((st) => st.id === id);
    return s?.name || "—";
  };

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
        const st = mockStatuses.find((s) => s.id === lead.status_id);
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
  }, [leads, statusFilterIds, searchQuery, searchColumns]);

  const handleAddLead = (lead: Lead) => {
    setLeads((prev) => [lead, ...prev]);
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

  const hasActiveFilters =
    !allLeadColumnsSelected(searchColumns) ||
    statusFilterIds.size > 0 ||
    searchQuery.trim().length > 0;

  return (
    <div className="px-5 pt-14 pb-24 max-w-[430px] mx-auto animate-fade-in">
      <div className="flex items-end justify-between mb-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Leads</h1>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="w-9 h-9 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-transform shadow-md"
        >
          <Plus size={20} className="text-primary-foreground" />
        </button>
      </div>

      <div className="mt-3 mb-3 w-full">
        <TableSearchToolbar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search leads (name, car, notes, status…)"
          filterContent={(
            <div className="space-y-1 p-3">
              <p className="text-xs text-muted-foreground">
                Deselect a column to remove it from text search (only checked
                fields are searched). Type in the bar to filter the list.{" "}
                <span className="font-medium text-foreground">Status</span> adds
                value filters when on. If{" "}
                <span className="font-medium text-foreground">Name</span>,{" "}
                <span className="font-medium text-foreground">Car</span>, or{" "}
                <span className="font-medium text-foreground">Buyer criteria</span>{" "}
                is off, search won’t use that field (e.g. year ranges live under
                Buyer criteria for buyers).
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
                          {mockStatuses.map((s) => (
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
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        {filteredLeads.length} total
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
                <p className="text-sm font-bold truncate">{lead.name || "Unknown"}</p>
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
                {lead.lead_type}
              </span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>

      <DetailSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || "Unknown Lead"}
        subtitle={selected ? `${selected.lead_type} · ${selected.source}` : undefined}
        onEdit={() => {}}
      >
        {selected && (
          <>
            <DetailRow label="Name" value={selected.name} />
            <DetailRow label="Type" value={selected.lead_type} />
            <DetailRow label="Source" value={selected.source} />
            <DetailRow label="Status" value={getStatusName(selected.status_id)} />
            <DetailRow label="Instagram" value={selected.instagram_handle} />
            <DetailRow label="Phone" value={selected.phone} />
            <DetailRow label="Notes" value={selected.notes} />
            {selected.lead_type === "buyer" && (
              <>
                <div className="mt-4 mb-2">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">
                    Buyer preferences
                  </p>
                </div>
                <DetailRow
                  label="Budget"
                  value={
                    selected.desired_budget_min || selected.desired_budget_max
                      ? `${fmt(selected.desired_budget_min)} – ${fmt(selected.desired_budget_max)}`
                      : null
                  }
                />
                <DetailRow
                  label="Max Mileage"
                  value={selected.desired_mileage_max?.toLocaleString() || null}
                />
                <DetailRow
                  label="Year Range"
                  value={
                    selected.desired_year_min || selected.desired_year_max
                      ? `${selected.desired_year_min || "?"} – ${selected.desired_year_max || "?"}`
                      : null
                  }
                />
                <DetailRow label="Preferred Make" value={selected.desired_make} />
                <DetailRow label="Preferred Model" value={selected.desired_model} />
                <DetailRow label="Preferred Type" value={selected.desired_car_type} />
              </>
            )}
            <DetailRow
              label="Created"
              value={new Date(selected.created_at).toLocaleDateString()}
            />
          </>
        )}
      </DetailSheet>

      <AddLeadSheet open={showAdd} onClose={() => setShowAdd(false)} onSave={handleAddLead} />
    </div>
  );
};

export default LeadsPage;
