import { useState, useMemo, useEffect, useCallback, Fragment } from "react";
import {
  Pencil,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Image as ImageIcon,
  X,
  Search,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Car, Lead } from "@/types/leads";
import { CarEditDialog } from "./CarEditDialog";
import { TableSearchToolbar } from "@/components/table/TableSearchToolbar";
import { ManageTableFiltersDialog } from "@/components/table/ManageTableFiltersDialog";
import { Badge } from "@/components/ui/badge";
import { matchesFuzzy } from "@/lib/fuzzyMatch";
import {
  buildCarSearchHaystackForColumns,
  CAR_SEARCH_COLUMN_IDS,
  CAR_SEARCH_COLUMN_LABELS,
  defaultCarSearchColumns,
  extractPlainTextFromNotesDocument,
  reconcileColumnOrder,
  type CarSearchColumnId,
} from "@/lib/tableSearchHaystack";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageProvider";
import { ApiError, getCar, listLeadsForCar } from "@automia/api";
import { toast } from "@/components/ui/sonner";
import { mapCarFromApi, mapLeadFromApi } from "@/lib/apiMappers";
import { useLeadsLinkedToCar } from "@/hooks/useLeadsLinkedToCar";
import { isDraftRecordId } from "@/lib/draftIds";
import { getAllCarIdsForLead, getLeadsForCar, mergeCarIdsIntoLead } from "@/lib/leadCarLinks";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  onAddCarFromUrl: (url: string) => Car | Promise<Car>;
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

type TxFn = (en: string, es: string) => string;

function renderCarColumnHead(colId: CarSearchColumnId, tx: TxFn) {
  switch (colId) {
    case "brand":
      return <TableHead className="min-w-[100px]">{tx("Brand", "Marca")}</TableHead>;
    case "model":
      return <TableHead className="min-w-[100px]">{tx("Model", "Modelo")}</TableHead>;
    case "year":
      return <TableHead className="min-w-[72px]">{tx("Year", "Año")}</TableHead>;
    case "mileage":
      return <TableHead className="min-w-[88px]">{tx("Mileage", "Kilometraje")}</TableHead>;
    case "price":
      return <TableHead className="min-w-[96px]">{tx("Price", "Precio")}</TableHead>;
    case "desired":
      return <TableHead className="min-w-[100px]">{tx("Desired", "Deseado")}</TableHead>;
    case "carType":
      return <TableHead className="min-w-[88px]">{tx("Car type", "Tipo de auto")}</TableHead>;
    case "transmission":
      return <TableHead className="min-w-[100px]">{tx("Transmission", "Transmisión")}</TableHead>;
    case "color":
      return <TableHead className="min-w-[96px]">{tx("Color", "Color")}</TableHead>;
    case "fuel":
      return <TableHead className="min-w-[88px]">{tx("Fuel", "Combustible")}</TableHead>;
    case "manufactureYear":
      return <TableHead className="min-w-[96px]">{tx("Manufacture year", "Año de fabricación")}</TableHead>;
    case "vehicleCondition":
      return <TableHead className="min-w-[120px]">{tx("Vehicle condition", "Condición")}</TableHead>;
    case "listed":
      return <TableHead className="min-w-[100px]">{tx("Listed", "Publicado")}</TableHead>;
    case "owner":
      return <TableHead className="min-w-[100px]">{tx("Owner", "Propietario")}</TableHead>;
    case "status":
      return <TableHead className="min-w-[96px]">{tx("Status", "Estado")}</TableHead>;
    case "added":
      return <TableHead className="min-w-[100px]">{tx("Added", "Agregado")}</TableHead>;
    case "notes":
      return <TableHead className="min-w-[160px]">{tx("Notes", "Notas")}</TableHead>;
    default: {
      const _exhaustive: never = colId;
      return _exhaustive;
    }
  }
}

function carNotesPreview(car: Car): string {
  const fromDoc = extractPlainTextFromNotesDocument(car.notes_document);
  const bits = [fromDoc, car.notes?.trim()].filter(Boolean).join(" ");
  return bits.replace(/\s+/g, " ").trim();
}

function renderCarColumnCell(
  colId: CarSearchColumnId,
  car: Car,
  locale: string,
  tx: TxFn,
  statusStyleFn: (status: Car["status"]) => string,
  ownerStyleFn: (type: Car["owner_type"]) => string,
  formatShortDateFn: (s: string | null, loc: string) => string,
) {
  switch (colId) {
    case "brand":
      return <TableCell className="font-medium">{car.brand}</TableCell>;
    case "model":
      return <TableCell>{car.model}</TableCell>;
    case "year":
      return <TableCell>{car.year}</TableCell>;
    case "mileage":
      return <TableCell>{car.mileage != null ? car.mileage.toLocaleString(locale) : "—"}</TableCell>;
    case "price":
      return <TableCell>{car.price != null ? `$${Number(car.price).toLocaleString(locale)}` : "—"}</TableCell>;
    case "desired":
      return <TableCell>{car.desired_price != null ? `$${Number(car.desired_price).toLocaleString(locale)}` : "—"}</TableCell>;
    case "carType":
      return <TableCell className="capitalize">{car.car_type || tx("N/A", "N/D")}</TableCell>;
    case "transmission":
      return <TableCell className="max-w-[140px] capitalize">{car.transmission?.trim() || "—"}</TableCell>;
    case "color":
      return <TableCell className="max-w-[140px]">{car.color?.trim() || "—"}</TableCell>;
    case "fuel":
      return <TableCell className="capitalize">{car.fuel?.trim() || "—"}</TableCell>;
    case "manufactureYear":
      return <TableCell>{car.manufacture_year != null ? String(car.manufacture_year) : "—"}</TableCell>;
    case "vehicleCondition":
      return <TableCell className="capitalize">{car.vehicle_condition?.trim() || "—"}</TableCell>;
    case "listed":
      return <TableCell>{formatShortDateFn(car.listed_at, locale)}</TableCell>;
    case "owner":
      return (
        <TableCell>
          <span
            className={cn(
              "inline-flex max-w-full items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium capitalize",
              ownerStyleFn(car.owner_type),
            )}
          >
            {car.owner_type === "owned"
              ? tx("owned", "propio")
              : car.owner_type === "client"
                ? tx("client", "cliente")
                : car.owner_type === "advisor"
                  ? tx("advisor", "asesor")
                  : tx("Web listing", "Listado web")}
          </span>
        </TableCell>
      );
    case "status":
      return (
        <TableCell>
          <span
            className={cn(
              "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium capitalize",
              statusStyleFn(car.status),
            )}
          >
            {car.status === "available" ? tx("available", "disponible") : tx("sold", "vendido")}
          </span>
        </TableCell>
      );
    case "added":
      return <TableCell>{formatShortDateFn(car.created_at, locale)}</TableCell>;
    case "notes": {
      const preview = carNotesPreview(car);
      return (
        <TableCell className="max-w-[220px] text-muted-foreground">
          {preview ? (preview.length > 80 ? `${preview.slice(0, 80)}…` : preview) : "—"}
        </TableCell>
      );
    }
    default: {
      const _exhaustive: never = colId;
      return _exhaustive;
    }
  }
}

export function CarsTable({
  cars,
  leads,
  onUpdateCar,
  onNotesDocumentAutosave,
  onUpdateLead,
  onDeleteCar,
  onAddCar,
  onAddCarFromUrl,
}: CarsTableProps) {
  const { tx, locale } = useLanguage();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [editCar, setEditCar] = useState<Car | null>(null);

  const beginEditCar = (c: Car) => {
    setEditCar(c);
    if (isDraftRecordId(c.id)) {
      return;
    }
    void (async () => {
      try {
        const r = await getCar(c.id);
        setEditCar(mapCarFromApi(r));
      } catch {
        /* ignore */
      }
    })();
  };

  const [showImagePopup, setShowImagePopup] = useState<string | null>(null);
  const [bulkMatchCar, setBulkMatchCar] = useState<Car | null>(null);
  const [bulkMatchCarIds, setBulkMatchCarIds] = useState<string[] | null>(null);
  const [addViaUrlOpen, setAddViaUrlOpen] = useState(false);
  const [urlToImport, setUrlToImport] = useState("");
  const [addingViaUrl, setAddingViaUrl] = useState(false);
  const [pendingUnmatchCar, setPendingUnmatchCar] = useState<Car | null>(null);
  const [pendingDeleteCarIds, setPendingDeleteCarIds] = useState<string[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"drop" | "filter">("drop");
  const [statusFilters, setStatusFilters] = useState<Set<Car["status"]>>(() => new Set());
  /** Inventory status filter from summary cards (`null` = show all). */
  const [cardFilter, setCardFilter] = useState<"available" | "sold" | null>(null);
  const [searchColumns, setSearchColumns] = useState<Set<CarSearchColumnId>>(
    () => defaultCarSearchColumns(),
  );
  const [carColumnOrder, setCarColumnOrder] = useState<CarSearchColumnId[]>(() =>
    reconcileColumnOrder(CAR_SEARCH_COLUMN_IDS, defaultCarSearchColumns(), []),
  );
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [draftFilterMode, setDraftFilterMode] = useState<"drop" | "filter">("drop");
  const [draftSearchColumns, setDraftSearchColumns] = useState<Set<CarSearchColumnId>>(
    () => new Set(),
  );
  const [draftColumnOrder, setDraftColumnOrder] = useState<CarSearchColumnId[]>([]);
  const [draftStatusFilters, setDraftStatusFilters] = useState<Set<Car["status"]>>(() => new Set());
  const [draftColumnSearchLeft, setDraftColumnSearchLeft] = useState("");
  const [draftColumnSearchRight, setDraftColumnSearchRight] = useState("");

  const syncFilterDraftFromCommitted = useCallback(() => {
    setDraftFilterMode(filterMode);
    setDraftSearchColumns(new Set(searchColumns));
    setDraftColumnOrder(reconcileColumnOrder(CAR_SEARCH_COLUMN_IDS, searchColumns, carColumnOrder));
    setDraftStatusFilters(new Set(statusFilters));
  }, [filterMode, searchColumns, carColumnOrder, statusFilters]);

  useEffect(() => {
    if (!filterDialogOpen) return;
    syncFilterDraftFromCommitted();
    setDraftColumnSearchLeft("");
    setDraftColumnSearchRight("");
  }, [filterDialogOpen, syncFilterDraftFromCommitted]);

  const filteredCars = useMemo(() => {
    const q = searchQuery.trim();
    const cols =
      searchColumns.size === 0 ? defaultCarSearchColumns() : searchColumns;
    return cars.filter((car) => {
      if (cardFilter === "available" && car.status !== "available") return false;
      if (cardFilter === "sold" && car.status !== "sold") return false;
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

  const clearFilters = () => {
    const def = defaultCarSearchColumns();
    setStatusFilters(new Set());
    setSearchQuery("");
    setSearchColumns(def);
    setCarColumnOrder(reconcileColumnOrder(CAR_SEARCH_COLUMN_IDS, def, []));
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

  const commitFilterDialog = () => {
    setFilterMode(draftFilterMode);
    setSearchColumns(new Set(draftSearchColumns));
    setCarColumnOrder([...draftColumnOrder]);
    setStatusFilters(new Set(draftStatusFilters));
  };

  const resetFilterDraft = () => {
    const def = defaultCarSearchColumns();
    setDraftFilterMode("drop");
    setDraftSearchColumns(new Set(def));
    setDraftColumnOrder(reconcileColumnOrder(CAR_SEARCH_COLUMN_IDS, def, []));
    setDraftStatusFilters(new Set());
  };

  const draftAddColumn = (id: CarSearchColumnId) => {
    setDraftSearchColumns((prev) => {
      const next = new Set(prev);
      next.add(id);
      setDraftColumnOrder((order) => reconcileColumnOrder(CAR_SEARCH_COLUMN_IDS, next, order));
      return next;
    });
  };

  const draftRemoveColumn = (id: CarSearchColumnId) => {
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

  const draftToggleStatusFilter = (status: Car["status"]) => {
    setDraftStatusFilters((prev) => {
      const n = new Set(prev);
      if (n.has(status)) n.delete(status);
      else n.add(status);
      return n;
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
      case "web_listing": return "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const statusCards = useMemo(
    () => [
      {
        id: "available" as const,
        label: tx("Available", "Disponible"),
        color: "bg-emerald-500",
        value: cars.filter((c) => c.status === "available").length,
      },
      {
        id: "sold" as const,
        label: tx("Sold", "Vendido"),
        color: "bg-amber-500",
        value: cars.filter((c) => c.status === "sold").length,
      },
    ],
    [cars, tx],
  );

  const carStatusCardCount = statusCards.length;
  const carStatusRowMinWidth = `max(100%, ${Math.max(carStatusCardCount, 1) * 280}px)`;

  const popupCar = showImagePopup ? cars.find((c) => c.id === showImagePopup) : null;
  const popupUrl = popupCar ? thumbnailUrl(popupCar) : null;

  const hasActiveFilters =
    !allCarColumnsSelected(searchColumns) ||
    statusFilters.size > 0 ||
    searchQuery.trim().length > 0 ||
    cardFilter != null;

  const visibleColumnIds = carColumnOrder;

  const selectedCar =
    selected.size === 1 ? cars.find((car) => car.id === Array.from(selected)[0]) ?? null : null;

  const { data: junctionLeadsForSelection } = useLeadsLinkedToCar(selectedCar?.id, {
    enabled: selected.size === 1 && !!selectedCar,
  });
  const linkedForBulkBar =
    junctionLeadsForSelection ??
    (selectedCar ? getLeadsForCar(selectedCar.id, leads) : []);

  const { data: junctionLeadsForUnmatch } = useLeadsLinkedToCar(pendingUnmatchCar?.id, {
    enabled: !!pendingUnmatchCar,
  });
  const linkedForUnmatchDialog =
    junctionLeadsForUnmatch ??
    (pendingUnmatchCar ? getLeadsForCar(pendingUnmatchCar.id, leads) : []);

  /** Link one or more cars to a lead in one update (bulk match must not loop — each loop saw stale `leads`). */
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

  const assignCarToLead = (carId: string, leadId: string) => {
    assignCarsToLead(leadId, [carId]);
  };

  const unmatchCar = async (carId: string) => {
    const rows = await listLeadsForCar(carId);
    const now = new Date().toISOString();
    for (const row of rows) {
      const fromList = leads.find((l) => l.id === row.id);
      const lead = fromList ?? mapLeadFromApi(row);
      const nextIds = getAllCarIdsForLead(lead).filter((id) => id !== carId);
      await onUpdateLead({
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

  const startAddManual = () => {
    void Promise.resolve(onAddCar()).then((created) => beginEditCar(created));
  };

  const startAddViaUrl = () => {
    setAddViaUrlOpen(true);
  };

  const submitAddViaUrl = () => {
    const url = urlToImport.trim();
    if (!url) return;
    setAddingViaUrl(true);
    void Promise.resolve(onAddCarFromUrl(url))
      .then((car) => {
        setAddViaUrlOpen(false);
        setUrlToImport("");
        beginEditCar(car);
      })
      .catch((error: unknown) => {
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "";
        toast.error(
          message
            ? tx(`Could not import car from URL: ${message}`, `No se pudo importar el auto desde URL: ${message}`)
            : tx("Could not import car from URL.", "No se pudo importar el auto desde URL."),
        );
      })
      .finally(() => setAddingViaUrl(false));
  };

  return (
    <div className="flex max-w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{tx("All Cars", "Todos los autos")}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled aria-disabled>
            {tx("Export Cars", "Exportar autos")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                + {tx("Add Car", "Agregar auto")}
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={startAddManual}>
                {tx("Add manually", "Agregar manualmente")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={startAddViaUrl}>
                {tx("Add via URL", "Agregar por URL")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="-mx-1 snap-x snap-proximity overflow-x-auto overflow-y-hidden overscroll-x-none pb-1">
        <div
          className="flex min-w-0 flex-nowrap gap-4 px-1"
          style={{ minWidth: carStatusRowMinWidth }}
        >
          {statusCards.map((stat) => (
            <button
              key={stat.id}
              type="button"
              onClick={() =>
                setCardFilter((prev) => (prev === stat.id ? null : stat.id))
              }
              className={cn(
                "min-w-[200px] flex-1 basis-0 snap-start rounded-lg border p-4 text-left transition-colors",
                cardFilter === stat.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-surface-hover",
              )}
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={`h-2 w-2 shrink-0 rounded-full ${stat.color}`} />
                <span className="line-clamp-2">{stat.label}</span>
              </div>
              <div className="mt-1 text-2xl font-semibold text-foreground">{stat.value}</div>
            </button>
          ))}
        </div>
      </div>

      <TableSearchToolbar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={tx("Search cars (make, model, year, price…)", "Buscar autos (marca, modelo, año, precio...)")}
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
                  {CAR_SEARCH_COLUMN_IDS.filter((colId) => {
                    if (draftSearchColumns.has(colId)) return false;
                    const label = tx(
                      CAR_SEARCH_COLUMN_LABELS[colId],
                      translateCarColumn(CAR_SEARCH_COLUMN_LABELS[colId]),
                    );
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
                      <span className="font-medium capitalize">
                        {tx(CAR_SEARCH_COLUMN_LABELS[colId], translateCarColumn(CAR_SEARCH_COLUMN_LABELS[colId]))}
                      </span>
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
                    const label = tx(
                      CAR_SEARCH_COLUMN_LABELS[colId],
                      translateCarColumn(CAR_SEARCH_COLUMN_LABELS[colId]),
                    );
                    const q = draftColumnSearchRight.trim();
                    if (q && !matchesFuzzy(q, label)) return null;
                    return (
                      <div
                        key={colId}
                        className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-2 text-sm"
                      >
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0 flex-1 font-medium capitalize">{label}</span>
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
            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">{tx("Status", "Estado")}</p>
              <div className="flex flex-wrap gap-2">
                {(["available", "sold"] as const).map((status) => (
                  <button
                    type="button"
                    key={status}
                    onClick={() => draftToggleStatusFilter(status)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm capitalize transition-colors",
                      draftStatusFilters.has(status)
                        ? "border-primary/50 bg-primary/15 text-foreground"
                        : "border-border bg-muted/50 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {status === "available" ? tx("available", "disponible") : tx("sold", "vendido")}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ManageTableFiltersDialog>

      <div className="rounded-lg border border-border overflow-x-auto overscroll-x-none">
        <Table scrollWrapper={false}>
          <TableHeader>
            <TableRow className="border-b-2 border-primary">
              <TableHead className={stickyCheckboxHead}>
                <Checkbox
                  className={tableCheckboxClassName}
                  checked={selected.size === paged.length && paged.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              {visibleColumnIds.map((colId) => (
                <Fragment key={colId}>{renderCarColumnHead(colId, tx)}</Fragment>
              ))}
              <TableHead className="min-w-[100px]">{tx("Actions", "Acciones")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((car) => {
              return (
                <TableRow
                  key={car.id}
                  className="group cursor-pointer transition-colors duration-150 ease-linear hover:bg-surface-hover"
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
                  {visibleColumnIds.map((colId) => (
                    <Fragment key={colId}>
                      {renderCarColumnCell(
                        colId,
                        car,
                        locale,
                        tx,
                        statusStyle,
                        ownerStyle,
                        formatShortDate,
                      )}
                    </Fragment>
                  ))}
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
                const linked = linkedForBulkBar;
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
        onLinkLeadToCar={(leadId, carId) => {
          assignCarToLead(carId, leadId);
        }}
        onUnlinkLeadFromCar={unlinkLeadFromCar}
      />

      <Dialog
        open={addViaUrlOpen}
        onOpenChange={(open) => {
          setAddViaUrlOpen(open);
          if (!open) {
            setUrlToImport("");
            setAddingViaUrl(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{tx("Add car via URL", "Agregar auto por URL")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={urlToImport}
              onChange={(e) => setUrlToImport(e.target.value)}
              placeholder="https://neoauto.com/auto/..."
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {tx(
                "Sites supported: NeoAuto (more coming soon).",
                "Sitios compatibles: NeoAuto (más próximamente).",
              )}
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setAddViaUrlOpen(false)} disabled={addingViaUrl}>
                {tx("Cancel", "Cancelar")}
              </Button>
              <Button type="button" onClick={submitAddViaUrl} disabled={addingViaUrl || urlToImport.trim().length === 0}>
                {addingViaUrl ? tx("Importing…", "Importando…") : tx("Import", "Importar")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                    assignCarsToLead(lead.id, ids);
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
                const linked = linkedForUnmatchDialog;
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
                void unmatchCar(pendingUnmatchCar.id).finally(() => {
                  setPendingUnmatchCar(null);
                  setSelected(new Set());
                });
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
    case "Transmission":
      return "Transmisión";
    case "Color":
      return "Color";
    case "Fuel":
      return "Combustible";
    case "Manufacture year":
      return "Año de fabricación";
    case "Vehicle condition":
      return "Condición";
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
