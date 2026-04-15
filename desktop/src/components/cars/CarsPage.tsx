import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  createCar,
  deleteCar,
  importCarFromNeoAuto,
  listCars,
  listLeads,
  updateCar,
  updateLead,
  type LeadsListResponse,
} from "@automia/api";
import { CarsTable } from "./CarsTable";
import { Car, Lead } from "@/types/leads";
import { useLanguage } from "@/i18n/LanguageProvider";
import {
  mapCarFromApi,
  mapLeadFromApi,
  carToCreatePayload,
  carToUpdatePayload,
  leadToUpdatePayloadOmitCarLinks,
  syncLeadCarJunctionLinks,
} from "@/lib/apiMappers";
import { getAllCarIdsForLead } from "@/lib/leadCarLinks";
import { buildDraftCar } from "@/lib/draftLeadCar";
import { isDraftRecordId } from "@/lib/draftIds";
import { neoAutoPreviewToDraftCar } from "@/lib/neoAutoPreviewToCar";

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
    const raw = queryClient.getQueryData<LeadsListResponse>(["leads"]);
    const prevRow = raw?.leads.find((l) => l.id === updated.id);
    const previousLead = prevRow ? mapLeadFromApi(prevRow) : null;
    const prevIds = previousLead ? getAllCarIdsForLead(previousLead) : [];
    const nextIds = getAllCarIdsForLead(updated);

    await syncLeadCarJunctionLinks(updated.id, prevIds, nextIds);

    await updateLead(updated.id, leadToUpdatePayloadOmitCarLinks(updated));
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
    await queryClient.invalidateQueries({ queryKey: ["cars"] });
  };

  const handleAddCar = (): Car => {
    return buildDraftCar(tx);
  };

  const handleAddCarFromUrl = async (url: string): Promise<Car> => {
    const res = await importCarFromNeoAuto({ url });
    return neoAutoPreviewToDraftCar(res.car_preview);
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
