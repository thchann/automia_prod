import { useState, useMemo, useEffect } from "react";
import { Pencil, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, Image as ImageIcon, X } from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Car, Lead } from "@/types/leads";
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
import { useLanguage } from "@/i18n/LanguageProvider";
import { getCar } from "@automia/api";
import { mapCarFromApi } from "@/lib/apiMappers";
import { isDraftRecordId } from "@/lib/draftIds";
import { getAllCarIdsForLead, getLeadsForCar } from "@/lib/leadCarLinks";
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

interface CarsTableProps {
  cars: Car[];
  leads: Lead[];
  onUpdateCar: (car: Car) => void | Promise<void>;
  onNotesDocumentAutosave?: (carId: string, document: Record<string, unknown>) => void | Promise<void>;
  onUpdateLead: (lead: Lead) => void;
  onDeleteCar: (id: string) => void;
  onAddCar: () => Car | Promise<Car>;
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

function thumbnailUrl(car: Car): string | null {
  const list = car.attachments;
  if (!list?.length) return null;
  const img = list.find((a) => a.type === "image");
  // Only show an image preview when an image attachment exists.
  return img?.url ?? null;
}

function allCarColumnsSelected(s: Set<CarSearchColumnId>) {
  return (
    s.size === CAR_SEARCH_COLUMN_IDS.length &&
    CAR_SEARCH_COLUMN_IDS.every((id) => s.has(id))
  );
}

export function CarsTable({
  cars,
  leads,
  onUpdateCar,
  onNotesDocumentAutosave,
  onUpdateLead,
  onDeleteCar,
  onAddCar,
}: CarsTableProps) {
  const { tx, locale } = useLanguage();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [editCar, setEditCar] = useState<Car | null>(null);

  const beginEditCar = (c: Car) => {
    if (isDraftRecordId(c.id)) {
      setEditCar(c);
      return;
    }
    void (async () => {
      try {
        const r = await getCar(c.id);
        setEditCar(mapCarFromApi(r));
      } catch {
        setEditCar(c);
      }
    })();
  };

  const [showImagePopup, setShowImagePopup] = useState<string | null>(null);
  const [bulkMatchCar, setBulkMatchCar] = useState<Car | null>(null);
  const [bulkMatchCarIds, setBulkMatchCarIds] = useState<string[] | null>(null);
  const [pendingUnmatchCar, setPendingUnmatchCar] = useState<Car | null>(null);
  const [pendingDeleteCarIds, setPendingDeleteCarIds] = useState<string[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"drop" | "filter">("drop");
  const [statusFilters, setStatusFilters] = useState<Set<Car["status"]>>(() => new Set());
  const [cardFilter, setCardFilter] = useState<"total" | "available" | "sold" | "owned" | null>(null);
  const [searchColumns, setSearchColumns] = useState<Set<CarSearchColumnId>>(
    () => defaultCarSearchColumns(),
  );

  const filteredCars = useMemo(() => {
    const q = searchQuery.trim();
    const cols =
      searchColumns.size === 0 ? defaultCarSearchColumns() : searchColumns;
    return cars.filter((car) => {
      if (cardFilter === "available" && car.status !== "available") return false;
      if (cardFilter === "sold" && car.status !== "sold") return false;
      if (cardFilter === "owned" && car.owner_type !== "owned") return false;
      if (statusFilters.size > 0 && !statusFilters.has(car.status)) return false;
      if (q) {
        const hay = buildCarSearchHaystackForColumns(car, cols);
        if (!matchesFuzzy(q, hay)) return false;
      }
      return true;
    });
  }, [cars, cardFilter, statusFilters, searchQuery, searchColumns]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilters, searchColumns, cardFilter]);

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

  const toggleCarColumn = (id: CarSearchColumnId) => {
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
    setStatusFilters(new Set());
    setSearchQuery("");
    setSearchColumns(defaultCarSearchColumns());
    setCardFilter(null);
  };

  const toggleStatusFilter = (status: Car["status"]) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
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

  const statsCatalog = useMemo(() => ([
    { id: "total", label: tx("Total Cars", "Total de autos"), color: "bg-blue-500", value: cars.length },
    { id: "available", label: tx("Available", "Disponible"), color: "bg-emerald-500", value: cars.filter((c) => c.status === "available").length },
    { id: "sold", label: tx("Sold", "Vendido"), color: "bg-amber-500", value: cars.filter((c) => c.status === "sold").length },
    { id: "owned", label: tx("Owned", "Propio"), color: "bg-purple-500", value: cars.filter((c) => c.owner_type === "owned").length },
  ]), [cars, tx]);

  const popupCar = showImagePopup ? cars.find((c) => c.id === showImagePopup) : null;
  const popupUrl = popupCar ? thumbnailUrl(popupCar) : null;

  const hasActiveFilters =
    !allCarColumnsSelected(searchColumns) ||
    statusFilters.size > 0 ||
    searchQuery.trim().length > 0;

  const visibleColumns = useMemo(
    () => CAR_SEARCH_COLUMN_IDS.filter((id) => searchColumns.has(id)),
    [searchColumns],
  );

  const selectedCar =
    selected.size === 1 ? cars.find((car) => car.id === Array.from(selected)[0]) ?? null : null;

  const assignCarToLead = (carId: string, leadId: string) => {
    const now = new Date().toISOString();
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const current = getAllCarIdsForLead(lead);
    const nextIds = Array.from(new Set([...current, carId]));
    onUpdateLead({
      ...lead,
      car_id: nextIds[0] ?? null,
      car_ids: nextIds.length ? nextIds : null,
      updated_at: now,
    });
  };

  const unmatchCar = (carId: string) => {
    const now = new Date().toISOString();
    for (const lead of leads) {
      const current = getAllCarIdsForLead(lead);
      if (!current.includes(carId)) continue;
      const nextIds = current.filter((id) => id !== carId);
      onUpdateLead({
        ...lead,
        car_id: nextIds[0] ?? null,
        car_ids: nextIds.length ? nextIds : null,
        updated_at: now,
      });
    }
  };

  const unlinkLeadFromCar = (leadId: string, carId: string) => {
    const now = new Date().toISOString();
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const nextIds = getAllCarIdsForLead(lead).filter((id) => id !== carId);
    onUpdateLead({
      ...lead,
      car_id: nextIds[0] ?? null,
      car_ids: nextIds.length ? nextIds : null,
      updated_at: now,
    });
  };

  const confirmDeleteCars = () => {
    const ids = pendingDeleteCarIds;
    if (!ids?.length) return;
    for (const carId of ids) onDeleteCar(carId);
    setPendingDeleteCarIds(null);
    setSelected(new Set());
  };

  return (
    <div className="flex max-w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{tx("All Cars", "Todos los autos")}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled aria-disabled>
            {tx("Export Cars", "Exportar autos")}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              void Promise.resolve(onAddCar()).then((created) => beginEditCar(created));
            }}
          >
            + {tx("Add Car", "Agregar auto")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {statsCatalog.map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={() =>
              setCardFilter((prev) => {
                const next = stat.id as "total" | "available" | "sold" | "owned";
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
        placeholder={tx("Search cars (make, model, year, price…)", "Buscar autos (marca, modelo, año, precio...)")}
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
                {CAR_SEARCH_COLUMN_IDS.map((colId) => {
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
                        className="min-w-0 flex-1 text-left font-medium capitalize"
                        onClick={() => toggleCarColumn(colId)}
                      >
                        {tx(CAR_SEARCH_COLUMN_LABELS[colId], translateCarColumn(CAR_SEARCH_COLUMN_LABELS[colId]))}
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
              <div className="pt-2">
                  <p className="mb-1 text-xs text-muted-foreground">{tx("Status", "Estado")}</p>
                <div className="space-y-1">
                  {(["available", "sold"] as const).map((status) => (
                    <button
                      type="button"
                      key={status}
                      onClick={() => toggleStatusFilter(status)}
                      className={cn(
                        "flex w-full items-center rounded-md border px-2 py-2 text-left text-sm capitalize transition-colors",
                        statusFilters.has(status)
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-transparent bg-muted/70 text-muted-foreground",
                      )}
                    >
                      <span>{status === "available" ? tx("available", "disponible") : tx("sold", "vendido")}</span>
                    </button>
                  ))}
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
              {visibleColumns.includes("brand") && <TableHead className="min-w-[100px]">{tx("Brand", "Marca")}</TableHead>}
              {visibleColumns.includes("model") && <TableHead className="min-w-[100px]">{tx("Model", "Modelo")}</TableHead>}
              {visibleColumns.includes("year") && <TableHead className="min-w-[72px]">{tx("Year", "Año")}</TableHead>}
              {visibleColumns.includes("mileage") && <TableHead className="min-w-[88px]">{tx("Mileage", "Kilometraje")}</TableHead>}
              {visibleColumns.includes("price") && <TableHead className="min-w-[96px]">{tx("Price", "Precio")}</TableHead>}
              {visibleColumns.includes("desired") && <TableHead className="min-w-[100px]">{tx("Desired", "Deseado")}</TableHead>}
              {visibleColumns.includes("carType") && <TableHead className="min-w-[88px]">{tx("Car type", "Tipo de auto")}</TableHead>}
              {visibleColumns.includes("listed") && <TableHead className="min-w-[100px]">{tx("Listed", "Publicado")}</TableHead>}
              {visibleColumns.includes("owner") && <TableHead className="min-w-[100px]">{tx("Owner", "Propietario")}</TableHead>}
              {visibleColumns.includes("status") && <TableHead className="min-w-[96px]">{tx("Status", "Estado")}</TableHead>}
              {visibleColumns.includes("added") && <TableHead className="min-w-[100px]">{tx("Added", "Agregado")}</TableHead>}
              <TableHead className="min-w-[100px]">{tx("Actions", "Acciones")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((car) => {
              return (
                <TableRow
                  key={car.id}
                  className="group cursor-pointer hover:bg-surface-hover"
                  onClick={() => beginEditCar(car)}
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
                  {visibleColumns.includes("brand") && <TableCell className="font-medium">{car.brand}</TableCell>}
                  {visibleColumns.includes("model") && <TableCell>{car.model}</TableCell>}
                  {visibleColumns.includes("year") && <TableCell>{car.year}</TableCell>}
                  {visibleColumns.includes("mileage") && <TableCell>{car.mileage != null ? car.mileage.toLocaleString(locale) : "—"}</TableCell>}
                  {visibleColumns.includes("price") && <TableCell>{car.price != null ? `$${Number(car.price).toLocaleString(locale)}` : "—"}</TableCell>}
                  {visibleColumns.includes("desired") && <TableCell>{car.desired_price != null ? `$${Number(car.desired_price).toLocaleString(locale)}` : "—"}</TableCell>}
                  {visibleColumns.includes("carType") && <TableCell className="capitalize">{car.car_type || tx("N/A", "N/D")}</TableCell>}
                  {visibleColumns.includes("listed") && <TableCell>{formatShortDate(car.listed_at, locale)}</TableCell>}
                  {visibleColumns.includes("owner") && <TableCell>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${ownerStyle(car.owner_type)}`}>
                      {car.owner_type === "owned" ? tx("owned", "propio") : car.owner_type === "client" ? tx("client", "cliente") : tx("advisor", "asesor")}
                    </span>
                  </TableCell>}
                  {visibleColumns.includes("status") && <TableCell>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${statusStyle(car.status)}`}>
                      {car.status === "available" ? tx("available", "disponible") : tx("sold", "vendido")}
                    </span>
                  </TableCell>}
                  {visibleColumns.includes("added") && <TableCell>{formatShortDate(car.created_at, locale)}</TableCell>}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button type="button" className="p-1 hover:text-foreground text-muted-foreground" onClick={() => beginEditCar(car)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="p-1 hover:text-destructive text-muted-foreground"
                        onClick={() => setPendingDeleteCarIds([car.id])}
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
          {tx("Showing", "Mostrando")} {filteredCars.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
          -
          {Math.min(page * PAGE_SIZE, filteredCars.length)} {tx("of", "de")} {filteredCars.length} {tx("entries", "registros")}
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
          {selected.size >= 1 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selected.size === 1) {
                    if (selectedCar) setBulkMatchCar(selectedCar);
                    setBulkMatchCarIds(null);
                    return;
                  }
                  setBulkMatchCar(null);
                  setBulkMatchCarIds(Array.from(selected));
                }}
              >
                {tx("Match", "Vincular")}
              </Button>

              {(() => {
                if (selected.size !== 1) return null;
                const linked = selectedCar ? getLeadsForCar(selectedCar.id, leads) : [];
                return (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={linked.length === 0}
                    onClick={() => {
                      if (!selectedCar) return;
                      setPendingUnmatchCar(selectedCar);
                    }}
                  >
                    {tx("Unmatch", "Desvincular")}
                  </Button>
                );
              })()}
            </>
          ) : null}
          <Button variant="destructive" size="sm" onClick={() => setPendingDeleteCarIds(Array.from(selected))}>
            {tx("Delete", "Eliminar")}
          </Button>
          <button type="button" onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground ml-2">✕</button>
        </div>
      )}

      <CarEditDialog
        car={editCar}
        open={!!editCar}
        onOpenChange={(open) => !open && setEditCar(null)}
        onSave={onUpdateCar}
        onNotesDocumentAutosave={onNotesDocumentAutosave}
        leads={leads}
        onUnlinkLeadFromCar={unlinkLeadFromCar}
      />

      <Dialog open={!!bulkMatchCar} onOpenChange={(open) => !open && setBulkMatchCar(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>
              {tx("Match lead for", "Vincular lead para")}{" "}
              {bulkMatchCar ? `${bulkMatchCar.year} ${bulkMatchCar.brand} ${bulkMatchCar.model}` : tx("car", "auto")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {leads.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tx("No leads available.", "No hay leads disponibles.")}</p>
            ) : (
              leads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  className="w-full rounded-md border border-border p-3 text-left transition-colors hover:bg-surface-hover"
                  onClick={() => {
                    if (!bulkMatchCar) return;
                    assignCarToLead(bulkMatchCar.id, lead.id);
                    setBulkMatchCar(null);
                    setSelected(new Set());
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{lead.name || tx("Unknown lead", "Lead desconocido")}</p>
                    <span className="text-xs text-muted-foreground capitalize">
                      {lead.lead_type === "buyer" ? tx("buyer", "comprador") : lead.lead_type === "seller" ? tx("seller", "vendedor") : tx("pending", "pendiente")}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!bulkMatchCarIds}
        onOpenChange={(open) => {
          if (!open) setBulkMatchCarIds(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>
              {tx("Match lead for", "Vincular lead para")} {bulkMatchCarIds ? `(${bulkMatchCarIds.length})` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {leads.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tx("No leads available.", "No hay leads disponibles.")}</p>
            ) : (
              leads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  className="w-full rounded-md border border-border p-3 text-left transition-colors hover:bg-surface-hover"
                  onClick={() => {
                    const ids = bulkMatchCarIds ?? [];
                    if (ids.length === 0) return;
                    for (const carId of ids) assignCarToLead(carId, lead.id);
                    setBulkMatchCarIds(null);
                    setSelected(new Set());
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{lead.name || tx("Unknown lead", "Lead desconocido")}</p>
                    <span className="text-xs text-muted-foreground capitalize">
                      {lead.lead_type === "buyer" ? tx("buyer", "comprador") : lead.lead_type === "seller" ? tx("seller", "vendedor") : tx("pending", "pendiente")}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDeleteCarIds != null && pendingDeleteCarIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteCarIds(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tx("Delete car(s)?", "¿Eliminar auto(s)?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteCarIds && pendingDeleteCarIds.length === 1
                ? tx("This car will be permanently removed.", "Este auto se eliminará de forma permanente.")
                : tx("These cars will be permanently removed.", "Estos autos se eliminarán de forma permanente.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tx("Cancel", "Cancelar")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDeleteCars}>
              {tx("Delete", "Eliminar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!pendingUnmatchCar}
        onOpenChange={(open) => {
          if (!open) setPendingUnmatchCar(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tx("Unmatch car", "Desvincular auto")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingUnmatchCar ? (() => {
                const linked = getLeadsForCar(pendingUnmatchCar.id, leads);
                if (linked.length === 0) return tx("This car has no match.", "Este auto no tiene vínculo.");
                const names = linked.map((l) => l.name || tx("Unnamed", "Sin nombre")).join(", ");
                return tx(
                  `This car is linked to: ${names}. Remove all links for this car?`,
                  `Este auto está vinculado con: ${names}. ¿Quitar todos los vínculos de este auto?`,
                );
              })() : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tx("Cancel", "Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingUnmatchCar) return;
                unmatchCar(pendingUnmatchCar.id);
                setPendingUnmatchCar(null);
                setSelected(new Set());
              }}
            >
              {tx("Unmatch", "Desvincular")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function translateCarColumn(label: string) {
  switch (label) {
    case "Brand":
      return "Marca";
    case "Model":
      return "Modelo";
    case "Year":
      return "Año";
    case "Mileage":
      return "Kilometraje";
    case "Price":
      return "Precio";
    case "Desired":
      return "Deseado";
    case "Car type":
      return "Tipo de auto";
    case "Listed":
      return "Publicado";
    case "Owner":
      return "Propietario";
    case "Status":
      return "Estado";
    case "Added":
      return "Agregado";
    default:
      return label;
  }
}
