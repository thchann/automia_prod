import { useState } from "react";
import { CarsTable } from "./CarsTable";
import { mockCars, mockLeads } from "@/data/mockLeads";
import { Car, Lead } from "@/types/leads";
import { useLanguage } from "@/i18n/LanguageProvider";

export function CarsPage() {
  const [cars, setCars] = useState<Car[]>(mockCars);
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const { tx } = useLanguage();

  const handleUpdateCar = (updated: Car) => {
    setCars((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteCar = (id: string) => {
    setCars((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateLead = (updated: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const handleAddCar = () => {
    const newCar: Car = {
      id: `c_${Date.now()}`,
      brand: tx("New", "Nuevo"),
      model: tx("Car", "Auto"),
      year: new Date().getFullYear(),
      mileage: 0,
      price: 0,
      desired_price: null,
      car_type: "sedan",
      listed_at: null,
      owner_type: "owned",
      status: "available",
      attachments: null,
      created_at: new Date().toISOString(),
      updated_at: null,
    };
    setCars((prev) => [newCar, ...prev]);
    return newCar;
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <CarsTable
          cars={cars}
          leads={leads}
          onUpdateCar={handleUpdateCar}
          onUpdateLead={handleUpdateLead}
          onDeleteCar={handleDeleteCar}
          onAddCar={handleAddCar}
        />
      </div>
    </div>
  );
}
