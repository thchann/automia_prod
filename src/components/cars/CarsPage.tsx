import { useState } from "react";
import { CarsTable } from "./CarsTable";
import { mockCars, defaultStatuses } from "@/data/mockLeads";
import { Car, LeadStatus } from "@/types/leads";

export function CarsPage() {
  const [cars, setCars] = useState<Car[]>(mockCars);
  const [statuses] = useState<LeadStatus[]>(defaultStatuses);

  const handleUpdateCar = (updated: Car) => {
    setCars((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteCar = (id: string) => {
    setCars((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddCar = () => {
    const newCar: Car = {
      id: `c_${Date.now()}`,
      brand: "New",
      model: "Car",
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
  };

  return (
    <CarsTable
      cars={cars}
      statuses={statuses}
      onUpdateCar={handleUpdateCar}
      onDeleteCar={handleDeleteCar}
      onAddCar={handleAddCar}
    />
  );
}
