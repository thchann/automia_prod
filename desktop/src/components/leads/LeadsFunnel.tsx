import { useEffect, useRef, useState } from "react";
import { Plus, MoreVertical } from "lucide-react";
import { Lead, LeadStatus, Car } from "@/types/leads";
import { LeadEditDialog } from "./LeadEditDialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/i18n/LanguageProvider";
import { getLead } from "@automia/api";
import { mapLeadFromApi } from "@/lib/apiMappers";
import { isDraftRecordId } from "@/lib/draftIds";
import { getAllCarIdsForLead } from "@/lib/leadCarLinks";
import { LEAD_STATUS_PALETTE, normalizeLeadStatusColor } from "@/lib/leadStatusColors";

interface LeadsFunnelProps {
  leads: Lead[];
  statuses: LeadStatus[];
  cars: Car[];
  onUpdateLead: (lead: Lead) => void;
  /** Funnel column drop: optimistic move in parent; falls back to onUpdateLead if omitted. */
  onMoveLeadToStatus?: (leadId: string, statusId: string) => void;
  onNotesDocumentAutosave?: (leadId: string, document: Record<string, unknown>) => void | Promise<void>;
  onUpdateStatuses: (statuses: LeadStatus[]) => void;
}

export function LeadsFunnel({
  leads,
  statuses,
  cars,
  onUpdateLead,
  onMoveLeadToStatus,
  onNotesDocumentAutosave,
  onUpdateStatuses,
}: LeadsFunnelProps) {
  const { tx } = useLanguage();
  const [editLead, setEditLead] = useState<Lead | null>(null);

  const beginEditLead = (l: Lead) => {
    setEditLead(l);
    if (isDraftRecordId(l.id)) {
      return;
    }
    void (async () => {
      try {
        const r = await getLead(l.id);
        setEditLead(mapLeadFromApi(r, statuses));
      } catch {}
    })();
  };
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState<string>(LEAD_STATUS_PALETTE[0]);
  const statusEditAreaRef = useRef<HTMLDivElement | null>(null);
  const saveColumnNameRef = useRef<() => void>(() => {});
  /** Prevents duplicate commits when `pointerdown` and `blur` fire in the same interaction. */
  const statusEditCommitLockRef = useRef(false);
  const [pendingDeleteStatusId, setPendingDeleteStatusId] = useState<string | null>(null);
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
    setDragOverStatusId((prev) => (prev === statusId ? prev : statusId));
  };

  const handleDrop = (e: React.DragEvent, targetStatusId: string) => {
    e.preventDefault();
    if (!draggedLeadId) return;
    const lead = leads.find((l) => l.id === draggedLeadId);
    if (lead && lead.status_id !== targetStatusId) {
      if (onMoveLeadToStatus) {
        onMoveLeadToStatus(lead.id, targetStatusId);
      } else {
        onUpdateLead({ ...lead, status_id: targetStatusId });
      }
    }
    setDraggedLeadId(null);
    setDragOverStatusId(null);
  };

  const startEditColumn = (status: LeadStatus) => {
    statusEditCommitLockRef.current = false;
    setEditingColumnId(status.id);
    setEditingName(status.name);
    setEditingColor(normalizeLeadStatusColor(status.color));
  };

  const saveColumnName = () => {
    if (!editingColumnId || statusEditCommitLockRef.current) return;
    statusEditCommitLockRef.current = true;
    const id = editingColumnId;
    const nextName = editingName;
    const nextColor = editingColor;
    setEditingColumnId(null);
    try {
      onUpdateStatuses(
        statuses.map((s) => (s.id === id ? { ...s, name: nextName, color: nextColor } : s)),
      );
    } finally {
      queueMicrotask(() => {
        statusEditCommitLockRef.current = false;
      });
    }
  };

  saveColumnNameRef.current = saveColumnName;

  /** True when focus moved to something outside the name/color edit strip (e.g. Tab to next control). */
  const shouldCommitStatusEditOnBlur = (e: React.FocusEvent) => {
    const next = e.relatedTarget;
    if (next == null) return true;
    const el = statusEditAreaRef.current;
    if (!el) return true;
    return !el.contains(next as Node);
  };

  /** Click outside the edit strip (covers color picker + name) commits via `onUpdateStatuses` → `updateLeadStatus`. */
  useEffect(() => {
    if (!editingColumnId) return;
    const onPointerDownCapture = (ev: PointerEvent) => {
      const el = statusEditAreaRef.current;
      const target = ev.target as Node | null;
      if (!el || !target) return;
      if (el.contains(target)) return;
      saveColumnNameRef.current();
    };
    document.addEventListener("pointerdown", onPointerDownCapture, true);
    return () => document.removeEventListener("pointerdown", onPointerDownCapture, true);
  }, [editingColumnId]);

  const requestDeleteColumn = (statusId: string) => {
    setPendingDeleteStatusId(statusId);
  };

  const confirmDeleteColumn = () => {
    if (!pendingDeleteStatusId) return;
    onUpdateStatuses(statuses.filter((s) => s.id !== pendingDeleteStatusId));
    setPendingDeleteStatusId(null);
  };

  const addColumn = () => {
    const newStatus: LeadStatus = {
      id: `s_${Date.now()}`,
      name: tx("New Column", "Nueva columna"),
      display_order: statuses.length,
      color: LEAD_STATUS_PALETTE[0],
      is_default: false,
      created_at: new Date().toISOString(),
    };
    onUpdateStatuses([...statuses, newStatus]);
  };

  const getStatusColor = (status: LeadStatus) => normalizeLeadStatusColor(status.color);

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
                  {editingColumnId === status.id ? (
                    <div
                      ref={statusEditAreaRef}
                      className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={tx("Status color", "Color del estado")}
                            title={tx("Status color", "Color del estado")}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background"
                            onBlur={(e) => {
                              if (shouldCommitStatusEditOnBlur(e)) saveColumnName();
                            }}
                          >
                            <span
                              className="h-4 w-4 rounded-full border border-border/60"
                              style={{ backgroundColor: editingColor }}
                              aria-hidden
                            />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44">
                          {LEAD_STATUS_PALETTE.map((hex) => (
                            <DropdownMenuItem
                              key={hex}
                              onClick={() => setEditingColor(hex)}
                              className="flex items-center gap-2"
                            >
                              <span
                                className="h-4 w-4 rounded-full border border-border/60"
                                style={{ backgroundColor: hex }}
                                aria-hidden
                              />
                              <span className="text-xs font-mono">{hex}</span>
                              {editingColor.toUpperCase() === hex ? (
                                <span className="ml-auto text-[11px] text-muted-foreground">
                                  {tx("Selected", "Seleccionado")}
                                </span>
                              ) : null}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={(e) => {
                          if (shouldCommitStatusEditOnBlur(e)) saveColumnName();
                        }}
                        onKeyDown={(e) => e.key === "Enter" && saveColumnName()}
                        className="h-7 min-w-0 flex-1 text-sm font-semibold"
                        autoFocus
                      />
                    </div>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={tx("Status actions", "Acciones del estado")}
                      className="shrink-0 text-muted-foreground hover:text-foreground p-1"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startEditColumn(status)}>
                      {tx("Edit", "Editar")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => requestDeleteColumn(status.id)}
                    >
                      {tx("Delete", "Eliminar")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                  const carIds = getAllCarIdsForLead(lead);
                  const car = (carIds.length ? getCar(carIds[0]) : null) ?? getCar(lead.car_id);
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
                      onClick={() => beginEditLead(lead)}
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
        onNotesDocumentAutosave={onNotesDocumentAutosave}
        statuses={statuses}
        cars={cars}
      />

      <AlertDialog
        open={pendingDeleteStatusId != null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteStatusId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tx("Delete status?", "¿Eliminar estado?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tx(
                "This will remove the status if it is not currently in use.",
                "Esto eliminará el estado si no está en uso.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tx("Cancel", "Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteColumn}
            >
              {tx("Delete", "Eliminar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
