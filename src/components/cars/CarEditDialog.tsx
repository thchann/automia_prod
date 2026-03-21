import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Car } from "@/types/leads";

interface CarEditDialogProps {
  car: Car | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (car: Car) => void;
}

export function CarEditDialog({ car, open, onOpenChange, onSave }: CarEditDialogProps) {
  const [form, setForm] = useState<Partial<Car>>({});

  useEffect(() => {
    if (car) setForm({ ...car });
  }, [car]);

  if (!car) return null;

  const handleSave = () => {
    onSave({ ...car, ...form } as Car);
    onOpenChange(false);
  };

  const listedAtInputValue = form.listed_at
    ? (() => {
        try {
          const d = new Date(form.listed_at);
          const pad = (n: number) => String(n).padStart(2, "0");
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch {
          return "";
        }
      })()
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Edit car details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Brand</label>
              <Input value={form.brand || ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Model</label>
              <Input value={form.model || ""} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Year</label>
              <Input type="number" value={form.year ?? ""} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value, 10) || 0 })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Mileage</label>
              <Input
                type="number"
                value={form.mileage ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, mileage: v === "" ? null : parseInt(v, 10) });
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Price</label>
              <Input
                type="number"
                value={form.price ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, price: v === "" ? null : Number(v) });
                }}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Desired Price</label>
              <Input
                type="number"
                value={form.desired_price ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, desired_price: v === "" ? null : Number(v) });
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Owner Type</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.owner_type || "owned"}
                onChange={(e) => setForm({ ...form, owner_type: e.target.value as Car["owner_type"] })}
              >
                <option value="owned">Owned</option>
                <option value="client">Client</option>
                <option value="advisor">Advisor</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Status</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.status || "available"}
                onChange={(e) => setForm({ ...form, status: e.target.value as Car["status"] })}
              >
                <option value="available">Available</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Listed at</label>
              <Input
                type="datetime-local"
                value={listedAtInputValue}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, listed_at: v ? new Date(v).toISOString() : null });
                }}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Car Type</label>
              <Input value={form.car_type || ""} onChange={(e) => setForm({ ...form, car_type: e.target.value || null })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
