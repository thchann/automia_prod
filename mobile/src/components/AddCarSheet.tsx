import { useEffect, useRef, useState } from "react";
import { createCar, updateCar, type CarCreate } from "@automia/api";
import DetailSheet from "@/components/DetailSheet";
import type { Car, CarStatus, OwnerType } from "@/types/models";
import { carToUpdatePayload } from "@/lib/apiMappers";
import { useLanguage } from "@/i18n/LanguageProvider";
import { Download, ExternalLink, FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

function attachmentsForApi(att: Car["attachments"]): Car["attachments"] | null {
  if (!att?.length) return null;
  const filtered = att.filter((a) => !a.url.startsWith("blob:"));
  return filtered.length ? filtered : null;
}

interface AddCarSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
  initialCar?: Car | null;
}

const carTypes = ["sedan", "suv", "sports", "truck", "coupe", "hatchback", "van"];
const ownerTypes: OwnerType[] = ["owned", "client", "advisor", "web_listing"];
const statuses: CarStatus[] = ["available", "sold"];

const AddCarSheet = ({ open, onClose, onSaved, initialCar = null }: AddCarSheetProps) => {
  const { tx } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const MAX_ATTACHMENTS = 10;

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [price, setPrice] = useState("");
  const [desiredPrice, setDesiredPrice] = useState("");
  const [carType, setCarType] = useState("");
  const [ownerType, setOwnerType] = useState<OwnerType>("owned");
  const [status, setStatus] = useState<CarStatus>("available");
  const [attachments, setAttachments] = useState<Car["attachments"]>(initialCar?.attachments ?? null);

  useEffect(() => {
    if (!open) return;
    if (!initialCar) {
      reset();
      return;
    }
    setBrand(initialCar.brand ?? "");
    setModel(initialCar.model ?? "");
    setYear(String(initialCar.year ?? ""));
    setMileage(initialCar.mileage != null ? String(initialCar.mileage) : "");
    setPrice(initialCar.price != null ? String(initialCar.price) : "");
    setDesiredPrice(initialCar.desired_price != null ? String(initialCar.desired_price) : "");
    setCarType(initialCar.car_type ?? "");
    setOwnerType(initialCar.owner_type ?? "owned");
    setStatus(initialCar.status ?? "available");
    setAttachments(initialCar.attachments ?? null);
  }, [open, initialCar]);

  const reset = () => {
    setBrand(""); setModel(""); setYear(""); setMileage("");
    setPrice(""); setDesiredPrice(""); setCarType(""); setOwnerType("owned"); setStatus("available");
    setAttachments(null);
  };

  const attachmentList = attachments ?? [];

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const current = attachmentList;
    const remaining = MAX_ATTACHMENTS - current.length;
    if (remaining <= 0) return;

    const picked = Array.from(files).slice(0, remaining);
    const added = picked.map((file) => {
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

  const viewAttachment = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const downloadAttachment = (url: string, filename: string | null | undefined) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename?.trim() || "attachment";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleSave = async () => {
    if (!brand.trim() || !model.trim() || !year.trim()) return;
    const yearNum = parseInt(year, 10);
    const mileageNum = mileage ? parseInt(mileage, 10) : null;
    const priceNum = price ? parseFloat(price) : null;
    const desiredNum = desiredPrice ? parseFloat(desiredPrice) : null;
    const safeAtt = attachmentsForApi(attachments);

    if (initialCar) {
      const attForApi = safeAtt ?? attachmentsForApi(initialCar.attachments);
      const updated: Car = {
        ...initialCar,
        brand: brand.trim(),
        model: model.trim(),
        year: yearNum,
        mileage: mileageNum,
        price: priceNum,
        desired_price: desiredNum,
        car_type: carType || null,
        listed_at: initialCar.listed_at,
        owner_type: ownerType,
        status,
        attachments: attachments ?? null,
        updated_at: new Date().toISOString(),
      };
      await updateCar(initialCar.id, carToUpdatePayload({ ...updated, attachments: attForApi }));
    } else {
      const body: CarCreate = {
        brand: brand.trim(),
        model: model.trim(),
        year: yearNum,
        mileage: mileageNum,
        price: priceNum,
        desired_price: desiredNum,
        car_type: carType || null,
        listed_at: new Date().toISOString(),
        owner_type: ownerType,
        status,
        attachments: safeAtt,
      };
      await createCar(body);
    }
    await Promise.resolve(onSaved?.());
    reset();
    onClose();
  };

  return (
    <DetailSheet
      open={open}
      onClose={onClose}
      title={initialCar ? tx("Edit Car", "Editar auto") : tx("Add Car", "Agregar auto")}
    >
      <div className="space-y-4">
        <Field label={tx("Brand *", "Marca *")} value={brand} onChange={setBrand} placeholder="e.g. BMW" />
        <Field label={tx("Model *", "Modelo *")} value={model} onChange={setModel} placeholder="e.g. M4 Competition" />
        <Field label={tx("Year *", "Año *")} value={year} onChange={setYear} placeholder="e.g. 2024" type="number" />
        <Field label={tx("Mileage", "Kilometraje")} value={mileage} onChange={setMileage} placeholder="e.g. 12000" type="number" />
        <Field label={tx("Listing Price", "Precio de lista")} value={price} onChange={setPrice} placeholder="e.g. 72500" type="number" />
        <Field label={tx("Desired Price", "Precio deseado")} value={desiredPrice} onChange={setDesiredPrice} placeholder="e.g. 74000" type="number" />

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{tx("Type", "Tipo")}</label>
          <select value={carType} onChange={(e) => setCarType(e.target.value)}
            className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">{tx("Select type", "Seleccionar tipo")}</option>
            {carTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{tx("Owner Type", "Tipo de dueño")}</label>
          <select value={ownerType} onChange={(e) => setOwnerType(e.target.value as OwnerType)}
            className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            {ownerTypes.map((t) => (
              <option key={t} value={t}>
                {t === "owned"
                  ? tx("owned", "propio")
                  : t === "client"
                    ? tx("client", "cliente")
                    : t === "advisor"
                      ? tx("advisor", "asesor")
                      : tx("web listing", "listado web")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{tx("Status", "Estado")}</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as CarStatus)}
            className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === "available" ? tx("available", "disponible") : tx("sold", "vendido")}
              </option>
            ))}
          </select>
        </div>

        {/* Attachments */}
        <div className="bg-muted rounded-md px-3 py-2.5 border border-border">
          <div className="flex items-center justify-between gap-3 mb-2">
            <label className="text-xs text-muted-foreground font-medium">
              {tx("Attachments", "Adjuntos")}
            </label>
            <div className="text-[11px] text-muted-foreground">
              {attachmentList.length}/{MAX_ATTACHMENTS}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="*/*"
              className="hidden"
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                e.currentTarget.value = "";
              }}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {tx("Upload attachment", "Subir adjunto")}
            </Button>
          </div>

          {attachmentList.length === 0 ? (
            <p className="text-xs text-muted-foreground">{tx("No attachments yet.", "Aún no hay adjuntos.")}</p>
          ) : (
            <div className="space-y-2">
              {attachmentList.map((att, idx) => (
                <div
                  key={`${att.url}-${idx}`}
                  className="flex items-center justify-between gap-3 border border-border rounded-md p-2 bg-background"
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
                      <p className="text-[11px] text-muted-foreground capitalize">
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
                      onClick={() => viewAttachment(att.url)}
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
                      onClick={() => downloadAttachment(att.url, att.filename)}
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

        <button onClick={handleSave}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-md active:scale-[0.98] transition-transform mt-2">
          {initialCar ? tx("Save Changes", "Guardar cambios") : tx("Save Car", "Guardar auto")}
        </button>
      </div>
    </DetailSheet>
  );
};

export default AddCarSheet;

const Field = ({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
  </div>
);
