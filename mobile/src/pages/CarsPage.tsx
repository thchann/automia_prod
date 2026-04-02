import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, listCars } from "@automia/api";
import type { Car, CarStatus } from "@/types/models";
import { mapCarFromApi } from "@/lib/apiMappers";
import DetailSheet, { DetailRow } from "@/components/DetailSheet";
import AddCarSheet from "@/components/AddCarSheet";
import { TableSearchToolbar } from "@/components/table/TableSearchToolbar";
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
  defaultCarSearchColumns,
  allCarColumnsSelected,
  type CarSearchColumnId,
} from "@/lib/searchHaystack";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";

const CarsPage = () => {
  const { tx, locale } = useLanguage();
  const queryClient = useQueryClient();
  const fmt = (n: number | null) => (n != null ? `$${n.toLocaleString(locale)}` : "—");

  const { data: carsData } = useQuery({
    queryKey: ["cars"],
    queryFn: async () => {
      try {
        return await listCars();
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          return { cars: [] };
        }
        throw e;
      }
    },
  });
  const cars = useMemo(() => carsData?.cars.map(mapCarFromApi) ?? [], [carsData]);
  const [selected, setSelected] = useState<Car | null>(null);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<Set<CarStatus>>(() => new Set());
  const [searchColumns, setSearchColumns] = useState<Set<CarSearchColumnId>>(() => defaultCarSearchColumns());

  const filteredCars = useMemo(() => {
    const q = searchQuery.trim();
    const cols =
      searchColumns.size === 0 ? defaultCarSearchColumns() : searchColumns;
    return cars.filter((car) => {
      if (statusFilters.size > 0 && !statusFilters.has(car.status)) return false;
      if (q) {
        const hay = buildCarSearchHaystackForColumns(car, cols);
        if (!matchesFuzzy(q, hay)) return false;
      }
      return true;
    });
  }, [cars, statusFilters, searchQuery, searchColumns]);

  const clearFilters = () => {
    setStatusFilters(new Set());
    setSearchQuery("");
    setSearchColumns(defaultCarSearchColumns());
  };

  const toggleStatusFilter = (status: CarStatus) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const hasActiveFilters =
    !allCarColumnsSelected(searchColumns) ||
    statusFilters.size > 0 ||
    searchQuery.trim().length > 0;

  return (
    <div className="px-5 pt-12 pb-24 max-w-[430px] mx-auto animate-fade-in">
      <div className="flex items-end justify-between mb-1">
        <h1 className="text-3xl font-extrabold tracking-tight">{tx("Cars", "Autos")}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 min-w-[2.75rem] items-center justify-center gap-0.5 rounded-full bg-primary px-2.5 active:scale-95 transition-transform shadow-md"
              aria-label={tx("Add car", "Agregar auto")}
            >
              <Plus size={18} className="text-primary-foreground" />
              <ChevronDown size={14} className="text-primary-foreground" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => {
              setEditingCar(null);
              setShowAdd(true);
            }}>
              {tx("Manual entry", "Entrada manual")}
            </DropdownMenuItem>
            <DropdownMenuItem disabled>{tx("Import CSV", "Importar CSV")}</DropdownMenuItem>
            <DropdownMenuItem disabled>{tx("From Instagram", "Desde Instagram")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 mb-3 w-full">
        <TableSearchToolbar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={tx("Search cars (make, model, year, price…)", "Buscar autos (marca, modelo, ano, precio...)")}
          filterContent={(
            <div className="space-y-1 p-3">
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
        {filteredCars.length} {tx("in inventory", "en inventario")}
      </p>

      <div className="overflow-hidden rounded-md border border-border bg-card">
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
                {car.car_type || "—"} · {car.owner_type === "owned" ? tx("owned", "propio") : car.owner_type === "client" ? tx("client", "cliente") : tx("advisor", "asesor")}
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
                  {car.status === "available" ? tx("available", "disponible") : tx("sold", "vendido")}
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
        onEdit={() => {
          if (!selected) return;
          setEditingCar(selected);
          setSelected(null);
          setShowAdd(true);
        }}
      >
        {selected && (
          <>
            <DetailRow label={tx("Brand", "Marca")} value={selected.brand} />
            <DetailRow label={tx("Model", "Modelo")} value={selected.model} />
            <DetailRow label={tx("Year", "Ano")} value={String(selected.year)} />
            <DetailRow
              label={tx("Mileage", "Kilometraje")}
              value={selected.mileage != null ? `${selected.mileage.toLocaleString(locale)} km` : null}
            />
            <DetailRow label={tx("Listing Price", "Precio de lista")} value={fmt(selected.price)} />
            <DetailRow label={tx("Desired Price", "Precio deseado")} value={fmt(selected.desired_price)} />
            <DetailRow label={tx("Type", "Tipo")} value={selected.car_type} />
            <DetailRow label={tx("Owner Type", "Tipo de dueno")} value={selected.owner_type === "owned" ? tx("owned", "propio") : selected.owner_type === "client" ? tx("client", "cliente") : tx("advisor", "asesor")} />
            <DetailRow label={tx("Status", "Estado")} value={selected.status === "available" ? tx("available", "disponible") : tx("sold", "vendido")} />
            <DetailRow
              label={tx("Listed", "Publicado")}
              value={selected.listed_at ? new Date(selected.listed_at).toLocaleDateString(locale) : null}
            />
            <DetailRow label={tx("Created", "Creado")} value={new Date(selected.created_at).toLocaleDateString(locale)} />
          </>
        )}
      </DetailSheet>

      <AddCarSheet
        open={showAdd}
        onClose={() => {
          setShowAdd(false);
          setEditingCar(null);
        }}
        onSaved={async () => {
          await queryClient.invalidateQueries({ queryKey: ["cars"] });
        }}
        initialCar={editingCar}
      />
    </div>
  );
};

export default CarsPage;
