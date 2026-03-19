import { useState } from "react";
import { format } from "date-fns";
import { Pencil, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, Image as ImageIcon, Info, X } from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Car, LeadStatus } from "@/types/leads";
import { CarEditDialog } from "./CarEditDialog";

interface CarsTableProps {
  cars: Car[];
  statuses: LeadStatus[];
  onUpdateCar: (car: Car) => void;
  onDeleteCar: (id: string) => void;
  onAddCar: () => void;
}

const PAGE_SIZE = 9;

export function CarsTable({ cars, statuses, onUpdateCar, onDeleteCar, onAddCar }: CarsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [editCar, setEditCar] = useState<Car | null>(null);
  const [showImagePopup, setShowImagePopup] = useState<string | null>(null);
  const [showSourcePopup, setShowSourcePopup] = useState<string | null>(null);

  const totalPages = Math.ceil(cars.length / PAGE_SIZE);
  const paged = cars.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map((c) => c.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const statusStyle = (status: string) => {
    switch (status) {
      case "available": return "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400";
      case "sold": return "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400";
      case "pending": return "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const ownerStyle = (type: string) => {
    switch (type) {
      case "owned": return "bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400";
      case "consignment": return "bg-purple-50 text-purple-500 dark:bg-purple-500/10 dark:text-purple-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // Stats
  const totalCars = cars.length;
  const available = cars.filter(c => c.status === "available").length;
  const sold = cars.filter(c => c.status === "sold").length;
  const owned = cars.filter(c => c.owner_type === "owned").length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">All Cars</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Export Cars</Button>
          <Button size="sm" onClick={onAddCar}>
            + Add Car
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Cars", value: totalCars, color: "bg-blue-500" },
          { label: "Available", value: available, color: "bg-emerald-500" },
          { label: "Sold", value: sold, color: "bg-amber-500" },
          { label: "Owned", value: owned, color: "bg-purple-500" },
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
              <TableHead>Image</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Owner Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((car) => (
              <TableRow
                key={car.id}
                className="cursor-pointer hover:bg-surface-hover"
                onClick={() => setEditCar(car)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(car.id)}
                    onCheckedChange={() => toggleOne(car.id)}
                  />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <button
                    className="h-10 w-10 rounded-md border border-border bg-muted flex items-center justify-center hover:bg-surface-hover transition-colors"
                    onClick={() => setShowImagePopup(car.id)}
                  >
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </button>
                </TableCell>
                <TableCell className="font-medium">{car.brand} {car.model}</TableCell>
                <TableCell>{car.year}</TableCell>
                <TableCell>{car.price ? `$${car.price.toLocaleString()}` : "—"}</TableCell>
                <TableCell>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${ownerStyle(car.owner_type)}`}>
                    {car.owner_type}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${statusStyle(car.status)}`}>
                    {car.status}
                  </span>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <button
                    className="p-1 hover:text-foreground text-muted-foreground"
                    onClick={() => setShowSourcePopup(car.id)}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                  {showSourcePopup === car.id && (
                    <div className="absolute z-50 bg-popover border border-border rounded-lg shadow-lg p-3 w-56 mt-1">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Source Details</span>
                        <button onClick={() => setShowSourcePopup(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Owner type: {car.owner_type}</p>
                        <p>Listed: {car.listed_at ? format(new Date(car.listed_at), "dd MMM yyyy") : "Not listed"}</p>
                        <p>Added: {format(new Date(car.created_at), "dd MMM yyyy")}</p>
                      </div>
                    </div>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button className="p-1 hover:text-foreground text-muted-foreground" onClick={() => setEditCar(car)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="p-1 hover:text-destructive text-muted-foreground" onClick={() => onDeleteCar(car.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button className="p-1 hover:text-foreground text-muted-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, cars.length)} of {cars.length} entries</span>
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

      {/* Image popup */}
      {showImagePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowImagePopup(null)}>
          <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium text-foreground">Car Image</span>
              <button onClick={() => setShowImagePopup(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">No image available</span>
            </div>
          </div>
        </div>
      )}

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-xl shadow-xl px-6 py-3 flex items-center gap-4 z-50">
          <span className="text-sm font-medium">{selected.size} Selected</span>
          <Button variant="outline" size="sm">Duplicate</Button>
          <Button variant="destructive" size="sm">Delete</Button>
          <button onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground ml-2">✕</button>
        </div>
      )}

      <CarEditDialog
        car={editCar}
        open={!!editCar}
        onOpenChange={(open) => !open && setEditCar(null)}
        onSave={onUpdateCar}
      />
    </div>
  );
}
