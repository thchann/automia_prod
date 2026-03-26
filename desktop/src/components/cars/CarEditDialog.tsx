import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Car, CarAttachment } from "@/types/leads";
import { useLanguage } from "@/i18n/LanguageProvider";
import { Download, ExternalLink, FileText, Trash2, Upload } from "lucide-react";

interface CarEditDialogProps {
  car: Car | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (car: Car) => void;
}

export function CarEditDialog({ car, open, onOpenChange, onSave }: CarEditDialogProps) {
  const [form, setForm] = useState<Partial<Car>>({});
  const [attachments, setAttachments] = useState<Car["attachments"]>(car?.attachments ?? null);
  const { tx } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const MAX_ATTACHMENTS = 10;

  useEffect(() => {
    if (car) {
      setForm({ ...car });
      setAttachments(car.attachments ?? null);
    }
  }, [car]);

  if (!car) return null;

  const attachmentList = attachments ?? [];

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const current = attachmentList;
    const remaining = MAX_ATTACHMENTS - current.length;
    if (remaining <= 0) return;

    const picked = Array.from(files).slice(0, remaining);
    const added: CarAttachment[] = picked.map((file) => {
      const isImage = file.type?.startsWith("image/");
      return {
        type: isImage ? "image" : "document",
        url: URL.createObjectURL(file),
        filename: file.name,
      };
    });

    const merged = [...current, ...added].slice(0, MAX_ATTACHMENTS);
    setAttachments(merged.length ? merged : null);
  };

  const removeAttachment = (index: number) => {
    const current = attachmentList;
    const removed = current[index];
    if (removed?.url?.startsWith("blob:")) URL.revokeObjectURL(removed.url);
    const next = current.filter((_, i) => i !== index);
    setAttachments(next.length ? next : null);
  };

  const viewAttachment = (att: CarAttachment) => {
    window.open(att.url, "_blank", "noopener,noreferrer");
  };

  const downloadAttachment = (att: CarAttachment) => {
    const a = document.createElement("a");
    a.href = att.url;
    a.download = att.filename?.trim() || "attachment";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleSave = () => {
    // Override attachments with local state so “remove all” correctly sends `null` to backend.
    onSave({ ...car, ...form, attachments } as Car);
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

          {/* Attachments */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 rounded-md border border-input bg-background px-3 py-2">
              <div className="flex items-center justify-between gap-3 mb-2">
                <label className="text-sm text-muted-foreground font-medium">
                  {tx("Attachments", "Adjuntos")}
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload />
                    {tx("Upload attachment", "Subir adjunto")}
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    {attachmentList.length}/{MAX_ATTACHMENTS}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="*/*"
                    className="hidden"
                    onChange={(e) => {
                      handleFilesSelected(e.target.files);
                      // Allow picking the same file again.
                      e.currentTarget.value = "";
                    }}
                  />
                </div>
              </div>

              {attachmentList.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {tx("No attachments yet.", "Aun no hay adjuntos.")}
                </p>
              ) : (
                <div className="space-y-2">
                  {attachmentList.map((att, idx) => (
                    <div
                      key={`${att.url}-${idx}`}
                      className="flex items-center justify-between gap-3 border border-border rounded-md p-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {att.type === "image" ? (
                          <img
                            src={att.url}
                            alt={att.filename ?? "attachment"}
                            className="h-12 w-12 rounded-md border border-border object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-md border border-border bg-muted/30 flex items-center justify-center shrink-0">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {att.filename ?? tx("Untitled", "Sin nombre")}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {att.type}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-0 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          title={tx("View", "Ver")}
                          aria-label={tx("View", "Ver")}
                          onClick={() => viewAttachment(att)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          title={tx("Download", "Descargar")}
                          aria-label={tx("Download", "Descargar")}
                          onClick={() => downloadAttachment(att)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          title={tx("Remove", "Quitar")}
                          aria-label={tx("Remove", "Quitar")}
                          onClick={() => removeAttachment(idx)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
