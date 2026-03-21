import { useState } from "react";
import { mockLeads as initialLeads, mockStatuses } from "@/data/mock";
import type { Lead } from "@/types/models";
import DetailSheet, { DetailRow } from "@/components/DetailSheet";
import AddLeadSheet from "@/components/AddLeadSheet";
import { ChevronRight, Plus } from "lucide-react";

const fmt = (n: number | null) => n != null ? `$${n.toLocaleString()}` : "—";

const LeadsPage = () => {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const getStatusName = (id: string | null) => {
    const s = mockStatuses.find((s) => s.id === id);
    return s?.name || "—";
  };

  const handleAddLead = (lead: Lead) => {
    setLeads((prev) => [lead, ...prev]);
  };

  return (
    <div className="px-5 pt-14 pb-24 max-w-[430px] mx-auto animate-fade-in">
      <div className="flex items-end justify-between mb-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Leads</h1>
        <button onClick={() => setShowAdd(true)}
          className="w-9 h-9 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-transform shadow-md">
          <Plus size={20} className="text-primary-foreground" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">{leads.length} total</p>

      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        {leads.map((lead, i) => (
          <button
            key={lead.id}
            onClick={() => setSelected(lead)}
            className={`w-full flex items-center justify-between px-4 py-3.5 text-left active:scale-[0.98] active:bg-muted/50 transition-all ${
              i < leads.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                {lead.name?.charAt(0) || "?"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{lead.name || "Unknown"}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{lead.source} · {getStatusName(lead.status_id)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                lead.lead_type === "buyer" ? "bg-badge-buyer/15 text-badge-buyer" :
                lead.lead_type === "seller" ? "bg-badge-seller/15 text-badge-seller" :
                "bg-badge-pending/15 text-badge-pending"
              }`}>
                {lead.lead_type}
              </span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>

      <DetailSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || "Unknown Lead"}
        subtitle={selected ? `${selected.lead_type} · ${selected.source}` : undefined}
        onEdit={() => {}}
      >
        {selected && (
          <>
            <DetailRow label="Name" value={selected.name} />
            <DetailRow label="Type" value={selected.lead_type} />
            <DetailRow label="Source" value={selected.source} />
            <DetailRow label="Status" value={getStatusName(selected.status_id)} />
            <DetailRow label="Instagram" value={selected.instagram_handle} />
            <DetailRow label="Phone" value={selected.phone} />
            <DetailRow label="Notes" value={selected.notes} />
            {selected.lead_type === "buyer" && (
              <>
                <div className="mt-4 mb-2">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">Buyer preferences</p>
                </div>
                <DetailRow label="Budget" value={
                  selected.desired_budget_min || selected.desired_budget_max
                    ? `${fmt(selected.desired_budget_min)} – ${fmt(selected.desired_budget_max)}`
                    : null
                } />
                <DetailRow label="Max Mileage" value={selected.desired_mileage_max?.toLocaleString() || null} />
                <DetailRow label="Year Range" value={
                  selected.desired_year_min || selected.desired_year_max
                    ? `${selected.desired_year_min || "?"} – ${selected.desired_year_max || "?"}`
                    : null
                } />
                <DetailRow label="Preferred Make" value={selected.desired_make} />
                <DetailRow label="Preferred Model" value={selected.desired_model} />
                <DetailRow label="Preferred Type" value={selected.desired_car_type} />
              </>
            )}
            <DetailRow label="Created" value={new Date(selected.created_at).toLocaleDateString()} />
          </>
        )}
      </DetailSheet>

      <AddLeadSheet open={showAdd} onClose={() => setShowAdd(false)} onSave={handleAddLead} />
    </div>
  );
};

export default LeadsPage;
