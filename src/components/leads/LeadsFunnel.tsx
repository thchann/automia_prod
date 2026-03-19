import { useState, useRef } from "react";
import { Plus, MoreVertical, GripVertical } from "lucide-react";
import { Lead, LeadStatus, Car } from "@/types/leads";
import { LeadEditDialog } from "./LeadEditDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LeadsFunnelProps {
  leads: Lead[];
  statuses: LeadStatus[];
  cars: Car[];
  onUpdateLead: (lead: Lead) => void;
  onUpdateStatuses: (statuses: LeadStatus[]) => void;
}

export function LeadsFunnel({ leads, statuses, cars, onUpdateLead, onUpdateStatuses }: LeadsFunnelProps) {
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const dragOverColumnRef = useRef<string | null>(null);

  const getLeadsForStatus = (statusId: string) =>
    leads.filter((l) => l.status_id === statusId);

  const getCar = (carId: string | null) => cars.find((c) => c.id === carId);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    dragOverColumnRef.current = statusId;
  };

  const handleDrop = (e: React.DragEvent, targetStatusId: string) => {
    e.preventDefault();
    if (!draggedLeadId) return;
    const lead = leads.find((l) => l.id === draggedLeadId);
    if (lead && lead.status_id !== targetStatusId) {
      onUpdateLead({ ...lead, status_id: targetStatusId });
    }
    setDraggedLeadId(null);
    dragOverColumnRef.current = null;
  };

  const startEditColumn = (status: LeadStatus) => {
    setEditingColumnId(status.id);
    setEditingName(status.name);
  };

  const saveColumnName = () => {
    if (!editingColumnId) return;
    onUpdateStatuses(
      statuses.map((s) => s.id === editingColumnId ? { ...s, name: editingName } : s)
    );
    setEditingColumnId(null);
  };

  const addColumn = () => {
    const newStatus: LeadStatus = {
      id: `s_${Date.now()}`,
      name: "New Column",
      display_order: statuses.length,
      color: null,
      is_default: false,
      created_at: new Date().toISOString(),
    };
    onUpdateStatuses([...statuses, newStatus]);
  };

  const statusColor = (status: LeadStatus) => {
    switch (status.name) {
      case "New": return "text-blue-500 bg-blue-50 dark:bg-blue-500/10";
      case "Contacted": return "text-amber-500 bg-amber-50 dark:bg-amber-500/10";
      case "Qualified": return "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10";
      case "Closed": return "text-muted-foreground bg-muted";
      default: return "text-foreground bg-muted";
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full">
      {statuses
        .sort((a, b) => a.display_order - b.display_order)
        .map((status) => {
          const columnLeads = getLeadsForStatus(status.id);
          return (
            <div
              key={status.id}
              className="min-w-[280px] w-[280px] flex flex-col bg-muted/30 rounded-lg border border-border"
              onDragOver={(e) => handleDragOver(e, status.id)}
              onDrop={(e) => handleDrop(e, status.id)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between p-3 border-b border-border">
                {editingColumnId === status.id ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={saveColumnName}
                    onKeyDown={(e) => e.key === "Enter" && saveColumnName()}
                    className="h-7 text-sm font-semibold"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      {status.name}
                    </span>
                    <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      {columnLeads.length}
                    </span>
                  </div>
                )}
                <button
                  className="text-muted-foreground hover:text-foreground p-1"
                  onClick={() => startEditColumn(status)}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto scrollbar-none p-2 space-y-2">
                {columnLeads.map((lead) => {
                  const car = getCar(lead.car_id);
                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className={`bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                        draggedLeadId === lead.id ? "opacity-50" : ""
                      }`}
                      onClick={() => setEditLead(lead)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="font-medium text-sm text-foreground">{lead.name || "Unnamed"}</div>
                        <button className="text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); }}>
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {car && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {car.year} {car.brand} {car.model}
                        </div>
                      )}
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(status)}`}>
                          {status.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      {/* Add column button */}
      <div className="min-w-[48px] flex items-start pt-3">
        <button
          onClick={addColumn}
          className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <LeadEditDialog
        lead={editLead}
        open={!!editLead}
        onOpenChange={(open) => !open && setEditLead(null)}
        onSave={onUpdateLead}
        statuses={statuses}
        cars={cars}
      />
    </div>
  );
}
