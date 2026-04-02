import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lead, LeadStatus, Car } from "@/types/leads";
import { useLanguage } from "@/i18n/LanguageProvider";

interface LeadEditDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (lead: Lead) => void | Promise<void>;
  statuses: LeadStatus[];
  cars: Car[];
}

export function LeadEditDialog({ lead, open, onOpenChange, onSave, statuses, cars }: LeadEditDialogProps) {
  const [form, setForm] = useState<Partial<Lead>>({});
  const { tx } = useLanguage();

  useEffect(() => {
    if (lead) setForm({ ...lead });
  }, [lead]);

  if (!lead) return null;

  const leadType = form.lead_type || "pending";

  const handleSave = () => {
    void Promise.resolve(
      onSave({
        ...lead,
        ...form,
        updated_at: new Date().toISOString(),
      } as Lead),
    ).then(() => onOpenChange(false));
  };

  const numOrNull = (v: string) => (v === "" ? null : Number(v));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tx("Edit lead details", "Editar detalles del lead")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{tx("Name", "Nombre")}</label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Instagram</label>
              <Input value={form.instagram_handle || ""} onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{tx("Phone", "Telefono")}</label>
              <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{tx("Source", "Origen")}</label>
              <Input value={form.source || ""} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{tx("Lead Type", "Tipo de lead")}</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={leadType}
                onChange={(e) => setForm({ ...form, lead_type: e.target.value as Lead["lead_type"] })}
              >
                <option value="pending">{tx("Pending", "Pendiente")}</option>
                <option value="buyer">{tx("Buyer", "Comprador")}</option>
                <option value="seller">{tx("Seller", "Vendedor")}</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{tx("Status", "Estado")}</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.status_id || ""}
                onChange={(e) => setForm({ ...form, status_id: e.target.value || null })}
              >
                <option value="">{tx("None", "Ninguno")}</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{tx("Linked car", "Auto vinculado")}</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.car_id || ""}
              onChange={(e) => setForm({ ...form, car_id: e.target.value || null })}
            >
              <option value="">{tx("None", "Ninguno")}</option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>{c.year} {c.brand} {c.model}</option>
              ))}
            </select>
          </div>

          {leadType === "buyer" && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm font-medium text-foreground">{tx("Buyer criteria", "Criterios del comprador")}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{tx("Budget min", "Presupuesto minimo")}</label>
                  <Input
                    type="number"
                    value={form.desired_budget_min ?? ""}
                    onChange={(e) => setForm({ ...form, desired_budget_min: numOrNull(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{tx("Budget max", "Presupuesto maximo")}</label>
                  <Input
                    type="number"
                    value={form.desired_budget_max ?? ""}
                    onChange={(e) => setForm({ ...form, desired_budget_max: numOrNull(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{tx("Mileage max", "Kilometraje maximo")}</label>
                  <Input
                    type="number"
                    value={form.desired_mileage_max ?? ""}
                    onChange={(e) => setForm({ ...form, desired_mileage_max: numOrNull(e.target.value) as number | null })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{tx("Car type", "Tipo de auto")}</label>
                  <Input
                    value={form.desired_car_type || ""}
                    onChange={(e) => setForm({ ...form, desired_car_type: e.target.value || null })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{tx("Year min", "Ano minimo")}</label>
                  <Input
                    type="number"
                    value={form.desired_year_min ?? ""}
                    onChange={(e) => setForm({ ...form, desired_year_min: numOrNull(e.target.value) as number | null })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{tx("Year max", "Ano maximo")}</label>
                  <Input
                    type="number"
                    value={form.desired_year_max ?? ""}
                    onChange={(e) => setForm({ ...form, desired_year_max: numOrNull(e.target.value) as number | null })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{tx("Desired make", "Marca deseada")}</label>
                  <Input
                    value={form.desired_make || ""}
                    onChange={(e) => setForm({ ...form, desired_make: e.target.value || null })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{tx("Desired model", "Modelo deseado")}</label>
                  <Input
                    value={form.desired_model || ""}
                    onChange={(e) => setForm({ ...form, desired_model: e.target.value || null })}
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{tx("Notes", "Notas")}</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
            />
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
