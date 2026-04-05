import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  createLead,
  createLeadStatus,
  deleteLead,
  listCars,
  listLeadStatuses,
  listLeads,
  updateLead,
  updateLeadStatus,
} from "@automia/api";
import { LeadsTable } from "./LeadsTable";
import { LeadsFunnel } from "./LeadsFunnel";
import { Lead, LeadStatus } from "@/types/leads";
import { useLanguage } from "@/i18n/LanguageProvider";
import { mapCarFromApi, mapLeadFromApi, mapStatusFromApi, leadToUpdatePayload } from "@/lib/apiMappers";

type Tab = "table" | "funnel";

export function LeadsPage() {
  const { tx } = useLanguage();
  const queryClient = useQueryClient();

  const { data: leadsData } = useQuery({
    queryKey: ["leads"],
    queryFn: () => listLeads({ limit: 200 }),
  });
  const { data: statusesData } = useQuery({
    queryKey: ["lead-statuses"],
    queryFn: () => listLeadStatuses(),
  });
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

  const statuses = useMemo(
    () => statusesData?.statuses.map(mapStatusFromApi) ?? [],
    [statusesData],
  );

  const leads = useMemo(() => {
    if (!leadsData?.leads) return [];
    return leadsData.leads.map((r) => mapLeadFromApi(r, statuses));
  }, [leadsData, statuses]);

  const cars = useMemo(
    () => carsData?.cars.map(mapCarFromApi) ?? [],
    [carsData],
  );

  const [tab, setTab] = useState<Tab>("table");

  const handleUpdateLead = async (updated: Lead) => {
    await updateLead(updated.id, leadToUpdatePayload(updated));
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
  };

  const handleNotesDocumentAutosave = async (leadId: string, document: Record<string, unknown>) => {
    await updateLead(leadId, { notes_document: document });
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
  };

  const handleDeleteLead = async (id: string) => {
    await deleteLead(id);
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
  };

  const handleAddLead = async (): Promise<Lead> => {
    const defaultStatus = statuses[0];
    const created = await createLead({
      lead_type: "pending",
      source: "manual",
      platform_sender_id: `manual-${crypto.randomUUID()}`,
      status_id: defaultStatus?.id ?? undefined,
      name: tx("New Lead", "Nuevo lead"),
    });
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
    return mapLeadFromApi(created, statuses);
  };

  const handleUpdateStatuses = async (next: LeadStatus[]) => {
    const prev = statuses;
    for (const s of next) {
      const old = prev.find((p) => p.id === s.id);
      if (!old && s.id.startsWith("s_")) {
        await createLeadStatus({ name: s.name, display_order: s.display_order });
        continue;
      }
      if (old && old.name !== s.name && !s.id.startsWith("s_")) {
        await updateLeadStatus(s.id, { name: s.name });
      }
    }
    await queryClient.invalidateQueries({ queryKey: ["lead-statuses"] });
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "table", label: tx("Table", "Tabla") },
    { key: "funnel", label: tx("Funnel", "Embudo") },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-0 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              tab === t.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {tab === t.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "table" && (
          <LeadsTable
            leads={leads}
            statuses={statuses}
            cars={cars}
            onUpdateLead={handleUpdateLead}
            onNotesDocumentAutosave={handleNotesDocumentAutosave}
            onDeleteLead={handleDeleteLead}
            onAddLead={handleAddLead}
          />
        )}
        {tab === "funnel" && (
          <LeadsFunnel
            leads={leads}
            statuses={statuses}
            cars={cars}
            onUpdateLead={handleUpdateLead}
            onNotesDocumentAutosave={handleNotesDocumentAutosave}
            onUpdateStatuses={handleUpdateStatuses}
          />
        )}
      </div>
    </div>
  );
}
