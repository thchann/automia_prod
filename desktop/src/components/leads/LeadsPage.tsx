import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  createLead,
  createLeadStatus,
  deleteLeadStatus,
  deleteLead,
  listCars,
  listLeadStatuses,
  listLeads,
  uploadLeadAttachmentsToBucket,
  updateLead,
  updateLeadStatus,
  type LeadsListResponse,
} from "@automia/api";
import { LeadsTable } from "./LeadsTable";
import { LeadsFunnel } from "./LeadsFunnel";
import { Lead, LeadStatus } from "@/types/leads";
import { useLanguage } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  mapCarFromApi,
  mapLeadFromApi,
  mapStatusFromApi,
  mergeLeadResponseWithClientCarLinks,
  patchLeadRowWithJunctionCars,
  patchLeadsListCache,
  leadToCreatePayload,
  leadToUpdatePayload,
  leadToUpdatePayloadOmitCarLinks,
  syncLeadCarJunctionLinks,
} from "@/lib/apiMappers";
import { getAllCarIdsForLead } from "@/lib/leadCarLinks";
import { buildDraftLead } from "@/lib/draftLeadCar";
import { isDraftRecordId } from "@/lib/draftIds";
import { toast } from "@/components/ui/sonner";

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
  const [showGenerateMenu, setShowGenerateMenu] = useState(false);
  const [generateLeadSignal, setGenerateLeadSignal] = useState(0);

  const moveLeadStatusMutation = useMutation({
    mutationFn: ({ leadId, statusId }: { leadId: string; statusId: string }) =>
      updateLead(leadId, { status_id: statusId }),
    onMutate: async ({ leadId, statusId }) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previous = queryClient.getQueryData<LeadsListResponse>(["leads"]);
      const now = new Date().toISOString();
      queryClient.setQueryData<LeadsListResponse>(["leads"], (old) => {
        if (!old?.leads) return old;
        return {
          ...old,
          leads: old.leads.map((l) =>
            l.id === leadId ? { ...l, status_id: statusId, updated_at: now } : l,
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["leads"], context.previous);
      }
      toast.error(tx("Could not move lead", "No se pudo mover el lead"));
    },
    onSuccess: (data) => {
      queryClient.setQueryData<LeadsListResponse>(["leads"], (old) => {
        if (!old?.leads) return old;
        return {
          ...old,
          leads: old.leads.map((l) =>
            l.id === data.id ? mergeLeadResponseWithClientCarLinks(data, l) : l,
          ),
        };
      });
    },
  });

  const handleLeadStatusMove = (leadId: string, statusId: string) => {
    moveLeadStatusMutation.mutate({ leadId, statusId });
  };

  const handleUpdateLead = async (updated: Lead) => {
    if (isDraftRecordId(updated.id)) {
      const created = await createLead(leadToCreatePayload(updated));
      const mapped = mapLeadFromApi(created, statuses);
      const nextAttachments = updated.attachments ?? null;
      const hasDraftBlobAttachments = !!nextAttachments?.some((a) => a.url?.startsWith("blob:"));
      let uploadedAttachments = nextAttachments;

      if (hasDraftBlobAttachments && nextAttachments) {
        const uploaded = await uploadLeadAttachmentsToBucket(mapped.id, nextAttachments);
        uploadedAttachments = uploaded.map((u) => ({
          type: u.type,
          ...(u.url ? { url: u.url } : {}),
          ...(u.storage_key ? { storage_key: u.storage_key } : {}),
          filename: u.filename,
          content_type: u.content_type,
          size_bytes: u.size_bytes,
        }));
      }

      const extra = leadToUpdatePayload({
        ...updated,
        ...(uploadedAttachments !== undefined ? { attachments: uploadedAttachments } : {}),
      });
      if (extra.attachments !== undefined) {
        await updateLead(mapped.id, { attachments: extra.attachments });
      }
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
    } else {
      const raw = queryClient.getQueryData<LeadsListResponse>(["leads"]);
      const prevRow = raw?.leads.find((l) => l.id === updated.id);
      const previousLead = prevRow ? mapLeadFromApi(prevRow, statuses) : null;
      const prevIds = previousLead ? getAllCarIdsForLead(previousLead) : [];
      const nextIds = getAllCarIdsForLead(updated);

      await syncLeadCarJunctionLinks(updated.id, prevIds, nextIds);

      const data = await updateLead(updated.id, leadToUpdatePayloadOmitCarLinks(updated));
      try {
        await patchLeadRowWithJunctionCars(queryClient, updated.id, data);
      } catch {
        await queryClient.invalidateQueries({ queryKey: ["leads"] });
      }
      await queryClient.invalidateQueries({ queryKey: ["cars"] });
      await queryClient.invalidateQueries({ queryKey: ["leads-for-car"] });
    }
  };

  const handleNotesDocumentAutosave = async (leadId: string, document: Record<string, unknown>) => {
    if (isDraftRecordId(leadId)) return;
    const raw = queryClient.getQueryData<LeadsListResponse>(["leads"]);
    const existing = raw?.leads.find((l) => l.id === leadId);
    const data = await updateLead(leadId, { notes_document: document });
    if (existing) {
      patchLeadsListCache(queryClient, mergeLeadResponseWithClientCarLinks(data, existing));
    } else {
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
    }
  };

  const handleDeleteLead = async (id: string) => {
    await deleteLead(id);
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
  };

  const handleAddLead = (): Lead => {
    return buildDraftLead(statuses, tx("New Lead", "Nuevo lead"));
  };

  const handleUpdateStatuses = async (next: LeadStatus[]) => {
    const prev = statuses;
    for (const old of prev) {
      const stillPresent = next.some((s) => s.id === old.id);
      if (!stillPresent && !old.id.startsWith("s_")) {
        try {
          await deleteLeadStatus(old.id);
        } catch (e) {
          if (e instanceof ApiError && e.status === 409) {
            toast.error(
              tx(
                "Cannot delete a status that is in use by leads.",
                "No se puede eliminar un estado que está en uso por leads.",
              ),
            );
          } else {
            toast.error(tx("Could not delete status.", "No se pudo eliminar el estado."));
          }
          throw e;
        }
      }
    }

    for (const s of next) {
      const old = prev.find((p) => p.id === s.id);
      if (!old && s.id.startsWith("s_")) {
        await createLeadStatus({ name: s.name, color: s.color ?? null, display_order: s.display_order });
        continue;
      }
      if (old && !s.id.startsWith("s_")) {
        const nameChanged = old.name !== s.name;
        const colorChanged = (old.color ?? null) !== (s.color ?? null);
        if (nameChanged || colorChanged) {
          await updateLeadStatus(s.id, {
            ...(nameChanged ? { name: s.name } : {}),
            ...(colorChanged ? { color: s.color ?? null } : {}),
          });
        }
      }
    }
    await queryClient.invalidateQueries({ queryKey: ["lead-statuses"] });
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "table", label: tx("Table", "Tabla") },
    { key: "funnel", label: tx("Funnel", "Embudo") },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">{tx("All Leads", "Todos los leads")}</h1>
        <div className="relative shrink-0">
          <Button size="sm" onClick={() => setShowGenerateMenu((v) => !v)}>
            + {tx("Generate Lead", "Generar lead")} <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
          {showGenerateMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-popover py-1 shadow-lg">
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-surface-hover"
                onClick={() => {
                  setTab("table");
                  setGenerateLeadSignal((s) => s + 1);
                  setShowGenerateMenu(false);
                }}
              >
                {tx("Manual entry", "Entrada manual")}
              </button>
              <button
                type="button"
                className="w-full cursor-not-allowed px-4 py-2 text-left text-sm text-muted-foreground"
                disabled
              >
                {tx("Import CSV", "Importar CSV")}
              </button>
              <button
                type="button"
                className="w-full cursor-not-allowed px-4 py-2 text-left text-sm text-muted-foreground"
                disabled
              >
                {tx("From Instagram", "Desde Instagram")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {tab === t.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-y-none">
        {tab === "table" && (
          <LeadsTable
            leads={leads}
            statuses={statuses}
            cars={cars}
            onUpdateLead={handleUpdateLead}
            onNotesDocumentAutosave={handleNotesDocumentAutosave}
            onDeleteLead={handleDeleteLead}
            onAddLead={handleAddLead}
            generateLeadSignal={generateLeadSignal}
          />
        )}
        {tab === "funnel" && (
          <LeadsFunnel
            leads={leads}
            statuses={statuses}
            cars={cars}
            onUpdateLead={handleUpdateLead}
            onMoveLeadToStatus={handleLeadStatusMove}
            onNotesDocumentAutosave={handleNotesDocumentAutosave}
            onUpdateStatuses={handleUpdateStatuses}
          />
        )}
      </div>
    </div>
  );
}
