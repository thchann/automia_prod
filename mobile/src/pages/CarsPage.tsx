import { useState } from "react";
import { mockCars as initialCars } from "@/data/mock";
import type { Car } from "@/types/models";
import DetailSheet, { DetailRow } from "@/components/DetailSheet";
import AddCarSheet from "@/components/AddCarSheet";
import { ChevronRight, Plus } from "lucide-react";

const fmt = (n: number | null) => n != null ? `$${n.toLocaleString()}` : "—";

const CarsPage = () => {
  const [cars, setCars] = useState<Car[]>(initialCars);
  const [selected, setSelected] = useState<Car | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const handleAddCar = (car: Car) => {
    setCars((prev) => [car, ...prev]);
  };

  return (
    <div className="px-5 pt-14 pb-24 max-w-[430px] mx-auto animate-fade-in">
      <div className="flex items-end justify-between mb-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Cars</h1>
        <button onClick={() => setShowAdd(true)}
          className="w-9 h-9 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-transform shadow-md">
          <Plus size={20} className="text-primary-foreground" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">{cars.length} in inventory</p>

      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        {cars.map((car, i) => (
          <button
            key={car.id}
            onClick={() => setSelected(car)}
            className={`w-full flex items-center justify-between px-4 py-3.5 text-left active:scale-[0.98] active:bg-muted/50 transition-all ${
              i < cars.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{car.year} {car.brand} {car.model}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{car.car_type || "—"} · {car.owner_type}</p>
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums">{fmt(car.price)}</p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  car.status === "available" ? "bg-stat-positive/15 text-stat-positive" : "bg-muted text-muted-foreground"
                }`}>
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
            <DetailRow label="Mileage" value={selected.mileage != null ? `${selected.mileage.toLocaleString()} mi` : null} />
            <DetailRow label="Listing Price" value={fmt(selected.price)} />
            <DetailRow label="Desired Price" value={fmt(selected.desired_price)} />
            <DetailRow label="Type" value={selected.car_type} />
            <DetailRow label="Owner Type" value={selected.owner_type} />
            <DetailRow label="Status" value={selected.status} />
            <DetailRow label="Listed" value={selected.listed_at ? new Date(selected.listed_at).toLocaleDateString() : null} />
            <DetailRow label="Created" value={new Date(selected.created_at).toLocaleDateString()} />
          </>
        )}
      </DetailSheet>

      <AddCarSheet open={showAdd} onClose={() => setShowAdd(false)} onSave={handleAddCar} />
    </div>
  );
};

export default CarsPage;
