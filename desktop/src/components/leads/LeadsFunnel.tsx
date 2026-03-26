import { useState } from "react";
import { Plus, MoreVertical } from "lucide-react";
import { Lead, LeadStatus, Car } from "@/types/leads";
import { LeadEditDialog } from "./LeadEditDialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FunnelColumnColorMenu } from "./FunnelColumnColorMenu";
import { useLanguage } from "@/i18n/LanguageProvider";

interface LeadsFunnelProps {
  leads: Lead[];
  statuses: LeadStatus[];
  cars: Car[];
  onUpdateLead: (lead: Lead) => void;
  onUpdateStatuses: (statuses: LeadStatus[]) => void;
}

export function LeadsFunnel({ leads, statuses, cars, onUpdateLead, onUpdateStatuses }: LeadsFunnelProps) {
  const { tx } = useLanguage();
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [colorMenuOpenId, setColorMenuOpenId] = useState<string | null>(null);
  const [lastUsedColors, setLastUsedColors] = useState<string[]>([]);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);

  const getLeadsForStatus = (statusId: string) =>
    leads.filter((l) => l.status_id === statusId);

  const getCar = (carId: string | null) => cars.find((c) => c.id === carId);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    setDragOverStatusId(statusId);
  };

  const handleDrop = (e: React.DragEvent, targetStatusId: string) => {
    e.preventDefault();
    if (!draggedLeadId) return;
    const lead = leads.find((l) => l.id === draggedLeadId);
    if (lead && lead.status_id !== targetStatusId) {
      onUpdateLead({ ...lead, status_id: targetStatusId });
    }
    setDraggedLeadId(null);
    setDragOverStatusId(null);
  };

  const startEditColumn = (status: LeadStatus) => {
    setEditingColumnId(status.id);
    setEditingName(status.name);
  };

  const saveColumnName = () => {
    if (!editingColumnId) return;
    onUpdateStatuses(
      statuses.map((s) => (s.id === editingColumnId ? { ...s, name: editingName } : s)),
    );
    setEditingColumnId(null);
    setColorMenuOpenId(null);
  };

  const updateColumnColor = (statusId: string, color: string | null) => {
    onUpdateStatuses(statuses.map((s) => (s.id === statusId ? { ...s, color } : s)));
    setColorMenuOpenId(null);
  };

  const handleColorSelect = (statusId: string, hex: string | null) => {
    updateColumnColor(statusId, hex);
    if (hex) {
      setLastUsedColors((prev) => [hex, ...prev.filter((c) => c !== hex)].slice(0, 5));
    }
  };

  const addColumn = () => {
    const newStatus: LeadStatus = {
      id: `s_${Date.now()}`,
      name: tx("New Column", "Nueva columna"),
      display_order: statuses.length,
      color: "#6B7280",
      is_default: false,
      created_at: new Date().toISOString(),
    };
    onUpdateStatuses([...statuses, newStatus]);
  };

  const getStatusColor = (status: LeadStatus) => status.color || "#6B7280";

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full">
      {statuses
        .sort((a, b) => a.display_order - b.display_order)
        .map((status) => {
          const columnLeads = getLeadsForStatus(status.id);
          const color = getStatusColor(status);
          return (
            <div
              key={status.id}
              className="min-w-[280px] w-[280px] flex flex-col bg-muted/30 rounded-none border border-border"
              onDragOver={(e) => handleDragOver(e, status.id)}
              onDrop={(e) => handleDrop(e, status.id)}
              onDragLeave={(e) => {
                const next = e.relatedTarget as Node | null;
                if (next && e.currentTarget.contains(next)) return;
                setDragOverStatusId((prev) => (prev === status.id ? null : prev));
              }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between gap-2 p-3 border-b border-border">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {editingColumnId === status.id && (
                    <Popover
                      open={colorMenuOpenId === status.id}
                      onOpenChange={(open) => setColorMenuOpenId(open ? status.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="h-6 w-6 shrink-0 rounded-full border-2 border-border shadow-sm outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          style={{ backgroundColor: color }}
                          aria-label={tx("Choose column color", "Elegir color de columna")}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto border-0 bg-transparent p-0 shadow-none"
                        align="start"
                        side="bottom"
                        sideOffset={8}
                        collisionPadding={16}
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <FunnelColumnColorMenu
                          currentHex={status.color}
                          lastUsed={lastUsedColors}
                          onSelect={(hex) => handleColorSelect(status.id, hex)}
                        />
                      </PopoverContent>
                    </Popover>
                  )}

                  {editingColumnId === status.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={saveColumnName}
                      onKeyDown={(e) => e.key === "Enter" && saveColumnName()}
                      className="h-7 min-w-0 flex-1 text-sm font-semibold"
                      autoFocus
                    />
                  ) : (
                    <>
                      <span className="truncate text-sm font-semibold uppercase tracking-wide text-foreground">
                        {translateStatusName(status.name, tx)}
                      </span>
                      <span className="shrink-0 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                        {columnLeads.length}
                      </span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="shrink-0 text-muted-foreground hover:text-foreground p-1"
                  onClick={() => startEditColumn(status)}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {columnLeads.length === 0 && dragOverStatusId === status.id && (
                  <div
                    className="pointer-events-none h-1 w-full rounded-full bg-muted/45"
                    aria-hidden
                  />
                )}
                {columnLeads.map((lead) => {
                  const car = getCar(lead.car_id);
                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onDragEnd={() => {
                        setDraggedLeadId(null);
                        setDragOverStatusId(null);
                      }}
                      className={`bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                        draggedLeadId === lead.id ? "opacity-50" : ""
                      }`}
                      onClick={() => setEditLead(lead)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-foreground">{lead.name || tx("Unnamed", "Sin nombre")}</div>
                          <span className="inline-block mt-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                            {lead.lead_type === "buyer" ? tx("buyer", "comprador") : lead.lead_type === "seller" ? tx("seller", "vendedor") : tx("pending", "pendiente")}
                          </span>
                        </div>
                        <button type="button" className="text-muted-foreground hover:text-foreground shrink-0" onClick={(e) => { e.stopPropagation(); }}>
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {car && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {car.year} {car.brand} {car.model}
                        </div>
                      )}
                      <div className="mt-2">
                        <span
                          className="text-xs px-3 py-1 rounded-full font-medium"
                          style={{
                            backgroundColor: `${color}15`,
                            color: color,
                          }}
                        >
                          {status.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {columnLeads.length > 0 && dragOverStatusId === status.id && (
                  <div
                    className="pointer-events-none h-1 w-full rounded-full bg-muted/45"
                    aria-hidden
                  />
                )}
              </div>
            </div>
          );
        })}

      {/* Add column button */}
      <div className="min-w-[48px] flex items-start pt-3">
        <button
          type="button"
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

function translateStatusName(name: string, tx: (enText: string, esText: string) => string) {
  switch (name.toLowerCase()) {
    case "new":
      return tx("New", "Nuevo");
    case "contacted":
      return tx("Contacted", "Contactado");
    case "qualified":
      return tx("Qualified", "Calificado");
    case "closed":
      return tx("Closed", "Cerrado");
    default:
      return name;
  }
}
