import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  createCar,
  deleteCar,
  listCars,
  listLeads,
  updateCar,
  updateLead,
} from "@automia/api";
import { CarsTable } from "./CarsTable";
import { Car, Lead } from "@/types/leads";
import { useLanguage } from "@/i18n/LanguageProvider";
import {
  mapCarFromApi,
  mapLeadFromApi,
  mergeLeadResponseWithClientCarLinks,
  patchLeadsListCache,
  carToCreatePayload,
  carToUpdatePayload,
  leadToUpdatePayload,
} from "@/lib/apiMappers";
import { buildDraftCar } from "@/lib/draftLeadCar";
import { isDraftRecordId } from "@/lib/draftIds";
import { extractCarDataFromUrl } from "@/lib/carUrlExtractors";
import { toast } from "@/components/ui/sonner";

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
    if (isDraftRecordId(updated.id)) {
      await createCar(carToCreatePayload(updated));
    } else {
      await updateCar(updated.id, carToUpdatePayload(updated));
    }
    await queryClient.invalidateQueries({ queryKey: ["cars"] });
  };

  const handleCarNotesAutosave = async (carId: string, document: Record<string, unknown>) => {
    if (isDraftRecordId(carId)) return;
    await updateCar(carId, { notes_document: document });
    await queryClient.invalidateQueries({ queryKey: ["cars"] });
  };

  const handleDeleteCar = async (id: string) => {
    await deleteCar(id);
    await queryClient.invalidateQueries({ queryKey: ["cars"] });
  };

  const handleUpdateLead = async (updated: Lead) => {
    const data = await updateLead(updated.id, leadToUpdatePayload(updated));
    patchLeadsListCache(queryClient, mergeLeadResponseWithClientCarLinks(data, updated));
  };

  const handleAddCar = (): Car => {
    return buildDraftCar(tx);
  };

  const handleAddCarFromUrl = async (url: string): Promise<Car> => {
    const draft = buildDraftCar(tx);
    try {
      const parsed = await extractCarDataFromUrl(url);
      return {
        ...draft,
        ...(parsed.brand ? { brand: parsed.brand } : {}),
        ...(parsed.model ? { model: parsed.model } : {}),
        ...(parsed.year != null ? { year: parsed.year } : {}),
        ...(parsed.mileage != null ? { mileage: parsed.mileage } : {}),
        ...(parsed.price != null ? { price: parsed.price } : {}),
        ...(parsed.owner_type ? { owner_type: parsed.owner_type } : {}),
        ...(parsed.status ? { status: parsed.status } : {}),
        ...(parsed.listed_at ? { listed_at: parsed.listed_at } : {}),
        ...(parsed.car_type ? { car_type: parsed.car_type } : {}),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error(
        message
          ? tx(`Could not import car from URL: ${message}`, `No se pudo importar el auto desde URL: ${message}`)
          : tx("Could not import car from URL.", "No se pudo importar el auto desde URL."),
      );
      return draft;
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <CarsTable
          cars={cars}
          leads={leads}
          onUpdateCar={handleUpdateCar}
          onNotesDocumentAutosave={handleCarNotesAutosave}
          onUpdateLead={handleUpdateLead}
          onDeleteCar={handleDeleteCar}
          onAddCar={handleAddCar}
          onAddCarFromUrl={handleAddCarFromUrl}
        />
      </div>
    </div>
  );
}
