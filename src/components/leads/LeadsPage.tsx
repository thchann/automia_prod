import { useState } from "react";
import { LeadsTable } from "./LeadsTable";
import { LeadsFunnel } from "./LeadsFunnel";
import { mockLeads, defaultStatuses, mockCars } from "@/data/mockLeads";
import { Lead, LeadStatus } from "@/types/leads";

type Tab = "table" | "funnel" | "coming_soon";

export function LeadsPage() {
  const [tab, setTab] = useState<Tab>("table");
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [statuses, setStatuses] = useState<LeadStatus[]>(defaultStatuses);

  const handleUpdateLead = (updated: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const handleDeleteLead = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const handleAddLead = () => {
    const newLead: Lead = {
      id: `l_${Date.now()}`,
      lead_type: "pending",
      source: "manual",
      platform_sender_id: `manual-${crypto.randomUUID()}`,
      status_id: statuses.find((s) => s.is_default)?.id || statuses[0]?.id || null,
      car_id: null,
      name: "New Lead",
      instagram_handle: null,
      phone: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: null,
      desired_budget_min: null,
      desired_budget_max: null,
      desired_mileage_max: null,
      desired_year_min: null,
      desired_year_max: null,
      desired_make: null,
      desired_model: null,
      desired_car_type: null,
    };
    setLeads((prev) => [newLead, ...prev]);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "table", label: "Table" },
    { key: "funnel", label: "Funnel" },
    { key: "coming_soon", label: "Coming soon" },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => t.key !== "coming_soon" && setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              tab === t.key
                ? "text-foreground"
                : t.key === "coming_soon"
                ? "text-muted-foreground cursor-not-allowed"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {tab === t.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "table" && (
          <LeadsTable
            leads={leads}
            statuses={statuses}
            cars={mockCars}
            onUpdateLead={handleUpdateLead}
            onDeleteLead={handleDeleteLead}
            onAddLead={handleAddLead}
          />
        )}
        {tab === "funnel" && (
          <LeadsFunnel
            leads={leads}
            statuses={statuses}
            cars={mockCars}
            onUpdateLead={handleUpdateLead}
            onUpdateStatuses={setStatuses}
          />
        )}
        {tab === "coming_soon" && (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Coming soon
          </div>
        )}
      </div>
    </div>
  );
}
