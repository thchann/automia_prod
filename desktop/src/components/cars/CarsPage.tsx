import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  createCar,
  deleteCar,
  listCars,
  listLeads,
  updateCar,
  updateLead,
  type CarCreate,
} from "@automia/api";
import { CarsTable } from "./CarsTable";
import { Car, Lead } from "@/types/leads";
import { useLanguage } from "@/i18n/LanguageProvider";
import { mapCarFromApi, mapLeadFromApi, carToUpdatePayload, leadToUpdatePayload } from "@/lib/apiMappers";

export function CarsPage() {
  const { tx } = useLanguage();
  const queryClient = useQueryClient();

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
  const { data: leadsData } = useQuery({
    queryKey: ["leads"],
    queryFn: () => listLeads({ limit: 200 }),
  });

  const cars = carsData?.cars.map(mapCarFromApi) ?? [];
  const leads = leadsData?.leads.map((r) => mapLeadFromApi(r)) ?? [];

  const handleUpdateCar = async (updated: Car) => {
    await updateCar(updated.id, carToUpdatePayload(updated));
    await queryClient.invalidateQueries({ queryKey: ["cars"] });
  };

  const handleDeleteCar = async (id: string) => {
    await deleteCar(id);
    await queryClient.invalidateQueries({ queryKey: ["cars"] });
  };

  const handleUpdateLead = async (updated: Lead) => {
    await updateLead(updated.id, leadToUpdatePayload(updated));
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
  };

  const handleAddCar = async (): Promise<Car> => {
    const body: CarCreate = {
      brand: tx("New", "Nuevo"),
      model: tx("Car", "Auto"),
      year: new Date().getFullYear(),
      mileage: 0,
      price: 0,
      desired_price: null,
      car_type: "sedan",
      listed_at: new Date().toISOString(),
      owner_type: "owned",
      status: "available",
      attachments: null,
    };
    const created = await createCar(body);
    await queryClient.invalidateQueries({ queryKey: ["cars"] });
    return mapCarFromApi(created);
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
