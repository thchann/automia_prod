import { useState } from "react";
import { format } from "date-fns";
import { Pencil, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Lead, LeadStatus, Car } from "@/types/leads";
import { LeadEditDialog } from "./LeadEditDialog";

interface LeadsTableProps {
  leads: Lead[];
  statuses: LeadStatus[];
  cars: Car[];
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onAddLead: () => void;
}

const PAGE_SIZE = 9;

export function LeadsTable({ leads, statuses, cars, onUpdateLead, onDeleteLead, onAddLead }: LeadsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [showGenerateMenu, setShowGenerateMenu] = useState(false);

  const totalPages = Math.ceil(leads.length / PAGE_SIZE);
  const paged = leads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getStatus = (id: string | null) => statuses.find((s) => s.id === id);
  const getCar = (id: string | null) => cars.find((c) => c.id === id);

  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map((l) => l.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const statusStyle = (status: LeadStatus | undefined) => {
    if (!status) return { bg: "bg-muted", text: "text-muted-foreground" };
    const color = status.color || "#6B7280";
    return { color };
  };


  // Stats
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => getStatus(l.status_id)?.name === "New").length;
  const contactedLeads = leads.filter(l => getStatus(l.status_id)?.name === "Contacted").length;
  const qualifiedLeads = leads.filter(l => getStatus(l.status_id)?.name === "Qualified").length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">All Leads</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Bulk Update Status</Button>
          <Button variant="outline" size="sm">Export Leads</Button>
          <div className="relative">
            <Button size="sm" onClick={() => setShowGenerateMenu(!showGenerateMenu)}>
              + Generate Lead <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
            {showGenerateMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-surface-hover transition-colors"
                  onClick={() => { onAddLead(); setShowGenerateMenu(false); }}
                >
                  Manual entry
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-muted-foreground cursor-not-allowed"
                  disabled
                >
                  Import CSV
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-muted-foreground cursor-not-allowed"
                  disabled
                >
                  From Instagram
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Leads", value: totalLeads, color: "bg-blue-500" },
          { label: "New Leads", value: newLeads, color: "bg-amber-500" },
          { label: "Contacted", value: contactedLeads, color: "bg-emerald-500" },
          { label: "Qualified", value: qualifiedLeads, color: "bg-red-500" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${stat.color}`} />
              {stat.label}
            </div>
            <div className="text-2xl font-semibold text-foreground mt-1">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-primary">
              <TableHead className="w-10">
                <Checkbox
                  checked={selected.size === paged.length && paged.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Instagram</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Interested Car</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((lead) => {
              const status = getStatus(lead.status_id);
              const car = getCar(lead.car_id);
              return (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-surface-hover"
                  onClick={() => setEditLead(lead)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(lead.id)}
                      onCheckedChange={() => toggleOne(lead.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{lead.name || "—"}</TableCell>
                  <TableCell>{lead.instagram_handle || "—"}</TableCell>
                  <TableCell>{lead.phone || "—"}</TableCell>
                  <TableCell>{car ? `${car.year} ${car.brand} ${car.model}` : "—"}</TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${statusColor(status)}`}>
                      {status?.name || "Unassigned"}
                    </span>
                  </TableCell>
                  <TableCell className="capitalize">{lead.source}</TableCell>
                  <TableCell>{format(new Date(lead.created_at), "dd MMM yyyy")}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button className="p-1 hover:text-foreground text-muted-foreground" onClick={() => setEditLead(lead)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="p-1 hover:text-destructive text-muted-foreground" onClick={() => onDeleteLead(lead.id)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button className="p-1 hover:text-foreground text-muted-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, leads.length)} of {leads.length} entries</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="w-8 h-8 p-0"
              onClick={() => setPage(p)}
            >
              {p}
            </Button>
          ))}
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-xl shadow-xl px-6 py-3 flex items-center gap-4 z-50">
          <span className="text-sm font-medium">{selected.size} Selected</span>
          <Button variant="outline" size="sm">Duplicate</Button>
          <Button variant="outline" size="sm">Print</Button>
          <Button variant="destructive" size="sm">Delete</Button>
          <button onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground ml-2">✕</button>
        </div>
      )}

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
