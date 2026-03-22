import { useState, useMemo } from "react";
import { mockCars as initialCars } from "@/data/mock";
import type { Car, CarStatus, OwnerType } from "@/types/models";
import DetailSheet, { DetailRow } from "@/components/DetailSheet";
import AddCarSheet from "@/components/AddCarSheet";
import { TableSearchToolbar } from "@/components/table/TableSearchToolbar";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { matchesFuzzy } from "@/lib/fuzzyMatch";
import {
  buildCarSearchHaystackForColumns,
  CAR_SEARCH_COLUMN_IDS,
  CAR_SEARCH_COLUMN_LABELS,
  defaultCarSearchColumns,
  allCarColumnsSelected,
  type CarSearchColumnId,
} from "@/lib/searchHaystack";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

const fmt = (n: number | null) => (n != null ? `$${n.toLocaleString()}` : "—");

const tableCheckboxClassName =
  "border-border bg-transparent shadow-none ring-offset-transparent data-[state=unchecked]:bg-transparent data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground";

const CarsPage = () => {
  const [cars, setCars] = useState<Car[]>(initialCars);
  const [selected, setSelected] = useState<Car | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<CarStatus>>(() => new Set());
  const [ownerFilter, setOwnerFilter] = useState<Set<OwnerType>>(() => new Set());
  const [searchColumns, setSearchColumns] = useState<Set<CarSearchColumnId>>(
    () => defaultCarSearchColumns(),
  );
  const [statusSubOpen, setStatusSubOpen] = useState(false);
  const [ownerSubOpen, setOwnerSubOpen] = useState(false);

  const filteredCars = useMemo(() => {
    const q = searchQuery.trim();
    const cols =
      searchColumns.size === 0 ? defaultCarSearchColumns() : searchColumns;
    return cars.filter((car) => {
      if (cols.has("status") && statusFilter.size > 0 && !statusFilter.has(car.status))
        return false;
      if (cols.has("owner") && ownerFilter.size > 0 && !ownerFilter.has(car.owner_type))
        return false;
      if (q) {
        const hay = buildCarSearchHaystackForColumns(car, cols);
        if (!matchesFuzzy(q, hay)) return false;
      }
      return true;
    });
  }, [cars, statusFilter, ownerFilter, searchQuery, searchColumns]);

  const handleAddCar = (car: Car) => {
    setCars((prev) => [car, ...prev]);
  };

  const toggleCarColumn = (id: CarSearchColumnId) => {
    setSearchColumns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
        if (id === "status") setStatusSubOpen(false);
        if (id === "owner") setOwnerSubOpen(false);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleStatus = (s: CarStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const toggleOwner = (o: OwnerType) => {
    setOwnerFilter((prev) => {
      const next = new Set(prev);
      if (next.has(o)) next.delete(o);
      else next.add(o);
      return next;
    });
  };

  const clearFilters = () => {
    setStatusFilter(new Set());
    setOwnerFilter(new Set());
    setSearchQuery("");
    setSearchColumns(defaultCarSearchColumns());
    setStatusSubOpen(false);
    setOwnerSubOpen(false);
  };

  const hasActiveFilters =
    !allCarColumnsSelected(searchColumns) ||
    statusFilter.size > 0 ||
    ownerFilter.size > 0 ||
    searchQuery.trim().length > 0;

  return (
    <div className="px-5 pt-14 pb-24 max-w-[430px] mx-auto animate-fade-in">
      <div className="flex items-end justify-between mb-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Cars</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 min-w-[2.75rem] items-center justify-center gap-0.5 rounded-full bg-primary px-2.5 active:scale-95 transition-transform shadow-md"
              aria-label="Add car"
            >
              <Plus size={18} className="text-primary-foreground" />
              <ChevronDown size={14} className="text-primary-foreground" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => setShowAdd(true)}>
              Manual entry
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Import CSV</DropdownMenuItem>
            <DropdownMenuItem disabled>From Instagram</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 mb-3 w-full">
        <TableSearchToolbar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search cars (make, model, year, price…)"
          filterContent={(
            <div className="space-y-1 p-3">
              <p className="text-xs text-muted-foreground">
                Deselect a column to remove it from text search (only checked
                fields are searched). Type in the bar to filter the list.{" "}
                <span className="font-medium text-foreground">Status</span> and{" "}
                <span className="font-medium text-foreground">Owner</span> can
                add value filters when on. If{" "}
                <span className="font-medium text-foreground">Year</span> (or
                brand/model) is off, search won’t match on that field.
              </p>
              <div className="max-h-[min(50vh,18rem)] space-y-1 overflow-y-auto pr-1">
                {CAR_SEARCH_COLUMN_IDS.map((colId) => {
                  const active = searchColumns.has(colId);
                  const isStatus = colId === "status";
                  const isOwner = colId === "owner";
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
                          className="min-w-0 flex-1 text-left font-medium capitalize"
                          onClick={() => toggleCarColumn(colId)}
                        >
                          {CAR_SEARCH_COLUMN_LABELS[colId]}
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
                            aria-label="Listing status filters"
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
                        {isOwner && active ? (
                          <button
                            type="button"
                            className="shrink-0 rounded p-1 hover:bg-background/60"
                            aria-expanded={ownerSubOpen}
                            aria-label="Owner filters"
                            onClick={(e) => {
                              e.preventDefault();
                              setOwnerSubOpen((o) => !o);
                            }}
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform",
                                ownerSubOpen && "rotate-180",
                              )}
                            />
                          </button>
                        ) : null}
                      </div>
                      {isStatus && active && statusSubOpen ? (
                        <div className="ml-1 space-y-2 border-l-2 border-border py-1 pl-3">
                          <p className="text-[11px] text-muted-foreground">
                            Match any checked (none = any)
                          </p>
                          {(["available", "sold"] as const).map((s) => (
                            <label
                              key={s}
                              className="flex cursor-pointer items-center gap-2 text-sm capitalize"
                            >
                              <Checkbox
                                className={tableCheckboxClassName}
                                checked={statusFilter.has(s)}
                                onCheckedChange={() => toggleStatus(s)}
                              />
                              <span>{s}</span>
                            </label>
                          ))}
                        </div>
                      ) : null}
                      {isOwner && active && ownerSubOpen ? (
                        <div className="ml-1 space-y-2 border-l-2 border-border py-1 pl-3">
                          <p className="text-[11px] text-muted-foreground">
                            Match any checked (none = any)
                          </p>
                          {(["owned", "client", "advisor"] as const).map((o) => (
                            <label
                              key={o}
                              className="flex cursor-pointer items-center gap-2 text-sm capitalize"
                            >
                              <Checkbox
                                className={tableCheckboxClassName}
                                checked={ownerFilter.has(o)}
                                onCheckedChange={() => toggleOwner(o)}
                              />
                              <span>{o}</span>
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
        {filteredCars.length} in inventory
      </p>

      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        {filteredCars.map((car, i) => (
          <button
            key={car.id}
            type="button"
            onClick={() => setSelected(car)}
            className={`w-full flex items-center justify-between px-4 py-3.5 text-left active:scale-[0.98] active:bg-muted/50 transition-all ${
              i < filteredCars.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">
                {car.year} {car.brand} {car.model}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {car.car_type || "—"} · {car.owner_type}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums">{fmt(car.price)}</p>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    car.status === "available"
                      ? "bg-stat-positive/15 text-stat-positive"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {car.status}
                </span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>

      <DetailSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.year} ${selected.brand} ${selected.model}` : ""}
        subtitle={selected?.car_type || undefined}
        onEdit={() => {}}
      >
        {selected && (
          <>
            <DetailRow label="Brand" value={selected.brand} />
            <DetailRow label="Model" value={selected.model} />
            <DetailRow label="Year" value={String(selected.year)} />
            <DetailRow
              label="Mileage"
              value={selected.mileage != null ? `${selected.mileage.toLocaleString()} mi` : null}
            />
            <DetailRow label="Listing Price" value={fmt(selected.price)} />
            <DetailRow label="Desired Price" value={fmt(selected.desired_price)} />
            <DetailRow label="Type" value={selected.car_type} />
            <DetailRow label="Owner Type" value={selected.owner_type} />
            <DetailRow label="Status" value={selected.status} />
            <DetailRow
              label="Listed"
              value={selected.listed_at ? new Date(selected.listed_at).toLocaleDateString() : null}
            />
            <DetailRow label="Created" value={new Date(selected.created_at).toLocaleDateString()} />
          </>
        )}
      </DetailSheet>

      <AddCarSheet open={showAdd} onClose={() => setShowAdd(false)} onSave={handleAddCar} />
    </div>
  );
};

export default CarsPage;
