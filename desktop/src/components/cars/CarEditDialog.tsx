import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Car } from "@/types/leads";
import { useLanguage } from "@/i18n/LanguageProvider";

interface CarEditDialogProps {
  car: Car | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (car: Car) => void;
}

export function CarEditDialog({ car, open, onOpenChange, onSave }: CarEditDialogProps) {
  const [form, setForm] = useState<Partial<Car>>({});
  const { tx } = useLanguage();

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
          <DialogTitle>{tx("Edit car details", "Editar detalles del auto")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{tx("Brand", "Marca")}</label>
              <Input value={form.brand || ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{tx("Model", "Modelo")}</label>
              <Input value={form.model || ""} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{tx("Year", "Ano")}</label>
              <Input type="number" value={form.year ?? ""} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value, 10) || 0 })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{tx("Mileage", "Kilometraje")}</label>
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
              <label className="text-sm text-muted-foreground mb-1 block">{tx("Price", "Precio")}</label>
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
              <label className="text-sm text-muted-foreground mb-1 block">{tx("Desired Price", "Precio deseado")}</label>
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
              <label className="text-sm text-muted-foreground mb-1 block">{tx("Owner Type", "Tipo de dueno")}</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.owner_type || "owned"}
                onChange={(e) => setForm({ ...form, owner_type: e.target.value as Car["owner_type"] })}
              >
                <option value="owned">{tx("Owned", "Propio")}</option>
                <option value="client">{tx("Client", "Cliente")}</option>
                <option value="advisor">{tx("Advisor", "Asesor")}</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{tx("Status", "Estado")}</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.status || "available"}
                onChange={(e) => setForm({ ...form, status: e.target.value as Car["status"] })}
              >
                <option value="available">{tx("Available", "Disponible")}</option>
                <option value="sold">{tx("Sold", "Vendido")}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{tx("Listed at", "Publicado en")}</label>
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
              <label className="text-sm text-muted-foreground mb-1 block">{tx("Car Type", "Tipo de auto")}</label>
              <Input value={form.car_type || ""} onChange={(e) => setForm({ ...form, car_type: e.target.value || null })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tx("Cancel", "Cancelar")}</Button>
          <Button onClick={handleSave}>{tx("Save changes", "Guardar cambios")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
