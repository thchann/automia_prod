import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { Pencil, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, Image as ImageIcon, X } from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Car } from "@/types/leads";
import { CarEditDialog } from "./CarEditDialog";
import { TableSearchToolbar } from "@/components/table/TableSearchToolbar";
import { matchesFuzzy } from "@/lib/fuzzyMatch";
import {
  buildCarSearchHaystackForColumns,
  CAR_SEARCH_COLUMN_IDS,
  CAR_SEARCH_COLUMN_LABELS,
  defaultCarSearchColumns,
  type CarSearchColumnId,
} from "@/lib/tableSearchHaystack";
import { cn } from "@/lib/utils";

interface CarsTableProps {
  cars: Car[];
  onUpdateCar: (car: Car) => void;
  onDeleteCar: (id: string) => void;
  onAddCar: () => void;
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

function thumbnailUrl(car: Car): string | null {
  const list = car.attachments;
  if (!list?.length) return null;
  const img = list.find((a) => a.type === "image") ?? list[0];
  return img?.url ?? null;
}

function allCarColumnsSelected(s: Set<CarSearchColumnId>) {
  return (
    s.size === CAR_SEARCH_COLUMN_IDS.length &&
    CAR_SEARCH_COLUMN_IDS.every((id) => s.has(id))
  );
}

export function CarsTable({ cars, onUpdateCar, onDeleteCar, onAddCar }: CarsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [editCar, setEditCar] = useState<Car | null>(null);
  const [showImagePopup, setShowImagePopup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  /** When Status column is active: empty = any listing status; else restrict. */
  const [statusFilter, setStatusFilter] = useState<Set<Car["status"]>>(() => new Set());
  /** When Owner column is active: empty = any owner; else restrict. */
  const [ownerFilter, setOwnerFilter] = useState<Set<Car["owner_type"]>>(() => new Set());
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

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, ownerFilter, searchColumns]);

  const totalPages = Math.max(1, Math.ceil(filteredCars.length / PAGE_SIZE));
  const paged = filteredCars.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map((c) => c.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleStatus = (s: Car["status"]) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const toggleOwner = (o: Car["owner_type"]) => {
    setOwnerFilter((prev) => {
      const next = new Set(prev);
      if (next.has(o)) next.delete(o);
      else next.add(o);
      return next;
    });
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

  const clearFilters = () => {
    setStatusFilter(new Set());
    setOwnerFilter(new Set());
    setSearchQuery("");
    setSearchColumns(defaultCarSearchColumns());
    setStatusSubOpen(false);
    setOwnerSubOpen(false);
  };

  const statusStyle = (status: Car["status"]) => {
    switch (status) {
      case "available": return "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400";
      case "sold": return "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const ownerStyle = (type: Car["owner_type"]) => {
    switch (type) {
      case "owned": return "bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400";
      case "client": return "bg-purple-50 text-purple-500 dark:bg-purple-500/10 dark:text-purple-400";
      case "advisor": return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const totalCars = filteredCars.length;
  const available = filteredCars.filter((c) => c.status === "available").length;
  const sold = filteredCars.filter((c) => c.status === "sold").length;
  const owned = filteredCars.filter((c) => c.owner_type === "owned").length;

  const popupCar = showImagePopup ? cars.find((c) => c.id === showImagePopup) : null;
  const popupUrl = popupCar ? thumbnailUrl(popupCar) : null;

  const hasActiveFilters =
    !allCarColumnsSelected(searchColumns) ||
    statusFilter.size > 0 ||
    ownerFilter.size > 0 ||
    searchQuery.trim().length > 0;

  return (
    <div className="flex max-w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">All Cars</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Export Cars</Button>
          <Button size="sm" onClick={onAddCar}>
            + Add Car
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Cars", value: totalCars, color: "bg-blue-500" },
          { label: "Available", value: available, color: "bg-emerald-500" },
          { label: "Sold", value: sold, color: "bg-amber-500" },
          { label: "Owned", value: owned, color: "bg-purple-500" },
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
        placeholder="Search cars (make, model, year, price…)"
        filterContent={(
          <div className="space-y-1 p-3">
            <p className="text-xs text-muted-foreground">
              Toggle columns for search scope.{" "}
              <span className="font-medium text-foreground">Status</span> and{" "}
              <span className="font-medium text-foreground">Owner</span> add
              value filters.
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
              <TableHead className="min-w-[56px]">Image</TableHead>
              <TableHead className="min-w-[100px]">Brand</TableHead>
              <TableHead className="min-w-[100px]">Model</TableHead>
              <TableHead className="min-w-[72px]">Year</TableHead>
              <TableHead className="min-w-[88px]">Mileage</TableHead>
              <TableHead className="min-w-[96px]">Price</TableHead>
              <TableHead className="min-w-[100px]">Desired</TableHead>
              <TableHead className="min-w-[88px]">Car type</TableHead>
              <TableHead className="min-w-[100px]">Listed</TableHead>
              <TableHead className="min-w-[100px]">Owner</TableHead>
              <TableHead className="min-w-[96px]">Status</TableHead>
              <TableHead className="min-w-[100px]">Added</TableHead>
              <TableHead className="min-w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((car) => {
              const thumb = thumbnailUrl(car);
              return (
                <TableRow
                  key={car.id}
                  className="group cursor-pointer hover:bg-surface-hover"
                  onClick={() => setEditCar(car)}
                >
                  <TableCell
                    className={stickyCheckboxCell}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      className={tableCheckboxClassName}
                      checked={selected.has(car.id)}
                      onCheckedChange={() => toggleOne(car.id)}
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="h-10 w-10 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden hover:bg-surface-hover transition-colors"
                      onClick={() => setShowImagePopup(car.id)}
                    >
                      {thumb ? (
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">{car.brand}</TableCell>
                  <TableCell>{car.model}</TableCell>
                  <TableCell>{car.year}</TableCell>
                  <TableCell>{car.mileage != null ? car.mileage.toLocaleString() : "—"}</TableCell>
                  <TableCell>{car.price != null ? `$${Number(car.price).toLocaleString()}` : "—"}</TableCell>
                  <TableCell>{car.desired_price != null ? `$${Number(car.desired_price).toLocaleString()}` : "—"}</TableCell>
                  <TableCell className="capitalize">{car.car_type || "—"}</TableCell>
                  <TableCell>{formatShortDate(car.listed_at)}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${ownerStyle(car.owner_type)}`}>
                      {car.owner_type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${statusStyle(car.status)}`}>
                      {car.status}
                    </span>
                  </TableCell>
                  <TableCell>{formatShortDate(car.created_at)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button type="button" className="p-1 hover:text-foreground text-muted-foreground" onClick={() => setEditCar(car)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" className="p-1 hover:text-destructive text-muted-foreground" onClick={() => onDeleteCar(car.id)}>
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
          Showing {filteredCars.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
          -
          {Math.min(page * PAGE_SIZE, filteredCars.length)} of {filteredCars.length} entries
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

      {showImagePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowImagePopup(null)}>
          <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium text-foreground">Car Image</span>
              <button type="button" onClick={() => setShowImagePopup(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-48 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              {popupUrl ? (
                <img src={popupUrl} alt="" className="max-h-full max-w-full object-contain" />
              ) : (
                <>
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">No image available</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-xl shadow-xl px-6 py-3 flex items-center gap-4 z-50">
          <span className="text-sm font-medium">{selected.size} Selected</span>
          <Button variant="outline" size="sm">Duplicate</Button>
          <Button variant="destructive" size="sm">Delete</Button>
          <button type="button" onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground ml-2">✕</button>
        </div>
      )}

      <CarEditDialog
        car={editCar}
        open={!!editCar}
        onOpenChange={(open) => !open && setEditCar(null)}
        onSave={onUpdateCar}
      />
    </div>
  );
}
