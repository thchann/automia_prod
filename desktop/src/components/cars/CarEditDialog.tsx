import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Car, CarAttachment, Lead } from "@/types/leads";
import { getLeadsForCar } from "@/lib/leadCarLinks";
import { useLanguage } from "@/i18n/LanguageProvider";
import { Download, Eye, FileText, Trash2, Upload } from "lucide-react";
import {
  ApiError,
  exportCarNotes,
  presignCarAttachmentDownload,
  uploadCarAttachmentsToBucket,
} from "@automia/api";
import { toast } from "@/components/ui/sonner";
import { isDraftRecordId } from "@/lib/draftIds";
import { LeadNotesEditor, type LeadNotesEditorHandle } from "@/components/leads/LeadNotesEditor";

const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

interface CarEditDialogProps {
  car: Car | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (car: Car) => void | Promise<void>;
  onNotesDocumentAutosave?: (carId: string, document: Record<string, unknown>) => void | Promise<void>;
  /** When set, used to show linked leads and whether “Desired price” applies (seller lead). */
  leads?: Lead[];
  /** Optional: e.g. open lead editor from home dashboard. */
  onOpenLinkedLead?: (lead: Lead) => void;
}

export function CarEditDialog({
  car,
  open,
  onOpenChange,
  onSave,
  onNotesDocumentAutosave,
  leads,
  onOpenLinkedLead,
}: CarEditDialogProps) {
  const [form, setForm] = useState<Partial<Car>>({});
  const [attachments, setAttachments] = useState<Car["attachments"]>(car?.attachments ?? null);
  const [fileDropActive, setFileDropActive] = useState(false);
  const [rightPanel, setRightPanel] = useState<"files" | "notes">("notes");
  useEffect(() => {
    setRightPanel("notes");
  }, [car?.id]);
  const notesDocRef = useRef<unknown>(undefined);
  const notesEditorRef = useRef<LeadNotesEditorHandle | null>(null);
  const hydratedCarIdRef = useRef<string | null>(null);
  const attachmentsListRef = useRef<CarAttachment[]>([]);
  const { tx } = useLanguage();

  const attachmentList = attachments ?? [];
  attachmentsListRef.current = attachmentList;

  useEffect(() => {
    if (!open || !car) return;
    if (hydratedCarIdRef.current === car.id) return;
    hydratedCarIdRef.current = car.id;
    setForm({ ...car });
    setAttachments(car.attachments ?? null);
    notesDocRef.current = car.notes_document;
  }, [open, car]);

  useEffect(() => {
    if (open) return;
    hydratedCarIdRef.current = null;
    for (const att of attachmentsListRef.current) {
      if (att.url?.startsWith("blob:")) URL.revokeObjectURL(att.url);
    }
  }, [open]);

  const linkedLeads = useMemo(
    () => (car ? getLeadsForCar(car.id, leads ?? []) : []),
    [car, leads],
  );
  const showDesiredPrice = linkedLeads.some((l) => l.lead_type === "seller");

  if (!car) return null;

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_ATTACHMENTS - attachmentList.length;
    if (remaining <= 0) return;

    const picked = Array.from(files).slice(0, remaining);
    for (const file of picked) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(
          tx("Each file must be 15 MB or smaller.", "Cada archivo debe pesar 15 MB o menos."),
        );
        return;
      }
    }
    const added: CarAttachment[] = picked.map((file) => {
      const isImage = file.type?.startsWith("image/");
      return {
        type: isImage ? "image" : "document",
        url: URL.createObjectURL(file),
        filename: file.name,
        content_type: file.type || undefined,
        size_bytes: file.size,
      };
    });

    const merged = [...attachmentList, ...added].slice(0, MAX_ATTACHMENTS);
    setAttachments(merged.length ? merged : null);
  };

  const removeAttachment = (index: number) => {
    const current = attachmentList;
    const removed = current[index];
    if (removed?.url?.startsWith("blob:")) URL.revokeObjectURL(removed.url);
    const next = current.filter((_, i) => i !== index);
    setAttachments(next.length ? next : null);
  };

  const renameAttachment = (index: number, filename: string) => {
    const current = attachmentList;
    const row = current[index];
    if (!row) return;
    const next = [...current];
    const trimmed = filename.trim();
    next[index] = { ...row, filename: trimmed || row.filename };
    setAttachments(next.length ? next : null);
  };

  const canPreviewAttachment = (att: CarAttachment) => {
    if (typeof att.url === "string" && att.url.length > 0) return true;
    if (att.storage_key && !isDraftRecordId(car.id)) return true;
    return false;
  };

  const viewAttachment = (att: CarAttachment) => {
    void (async () => {
      if (att.url) {
        window.open(att.url, "_blank", "noopener,noreferrer");
        return;
      }
      if (att.storage_key && !isDraftRecordId(car.id)) {
        try {
          const { download_url } = await presignCarAttachmentDownload(car.id, att.storage_key);
          window.open(download_url, "_blank", "noopener,noreferrer");
        } catch {
          toast.error(tx("Could not open attachment.", "No se pudo abrir el adjunto."));
        }
      }
    })();
  };

  const downloadAttachment = (att: CarAttachment) => {
    void (async () => {
      if (att.url) {
        const a = document.createElement("a");
        a.href = att.url;
        a.download = att.filename?.trim() || "attachment";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }
      if (att.storage_key && !isDraftRecordId(car.id)) {
        try {
          const { download_url } = await presignCarAttachmentDownload(car.id, att.storage_key);
          const a = document.createElement("a");
          a.href = download_url;
          a.download = att.filename?.trim() || "attachment";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          a.remove();
        } catch {
          toast.error(tx("Could not download attachment.", "No se pudo descargar el adjunto."));
        }
      }
    })();
  };

  const handleSave = () => {
    void (async () => {
      await notesEditorRef.current?.flushPendingSave();

      let nextAttachments: CarAttachment[] | null = attachmentList.length > 0 ? attachmentList : null;
      if (
        nextAttachments &&
        nextAttachments.length > 0 &&
        !isDraftRecordId(car.id) &&
        nextAttachments.some((a) => a.url?.startsWith("blob:"))
      ) {
        try {
          const uploaded = await uploadCarAttachmentsToBucket(car.id, nextAttachments);
          nextAttachments = uploaded.map((u) => ({
            type: u.type,
            ...(u.url ? { url: u.url } : {}),
            ...(u.storage_key ? { storage_key: u.storage_key } : {}),
            filename: u.filename,
            content_type: u.content_type,
            size_bytes: u.size_bytes,
          }));
        } catch (e) {
          if (e instanceof ApiError && e.status === 503) {
            toast.error(
              tx(
                "File uploads are unavailable: server storage is not configured.",
                "Las subidas no estan disponibles: el almacenamiento del servidor no esta configurado.",
              ),
            );
          } else {
            toast.error(
              tx("Could not upload attachments. Try again.", "No se pudieron subir los adjuntos. Reintenta."),
            );
          }
          return;
        }
      }

      const resolvedAttachments =
        nextAttachments && nextAttachments.length > 0
          ? nextAttachments
          : car.attachments !== undefined
            ? null
            : undefined;

      await Promise.resolve(
        onSave({
          ...car,
          ...form,
          ...(resolvedAttachments !== undefined ? { attachments: resolvedAttachments } : {}),
          ...(notesDocRef.current !== undefined ? { notes_document: notesDocRef.current } : {}),
          updated_at: new Date().toISOString(),
        } as Car),
      ).then(() => onOpenChange(false));
    })();
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
      <DialogContent
        className="flex flex-col max-h-[90vh] w-[calc(100vw-10vh)] max-w-none gap-0 p-0 sm:max-w-[min(1360px,calc(100vw-10vh))] overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="shrink-0 border-b px-6 pt-6 pb-4 pr-14">
          <DialogHeader>
            <DialogTitle>{tx("Edit car details", "Editar detalles del auto")}</DialogTitle>
            <DialogDescription className="sr-only">
              {tx(
                "Edit car fields, attachments, and rich notes.",
                "Editar campos del auto, adjuntos y notas.",
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="flex min-h-[280px] flex-col min-h-0 md:min-h-[min(520px,calc(90vh-10rem))]">
            <div className="shrink-0 px-4 pt-3 pb-2">
              <p className="text-sm font-semibold text-foreground">{tx("Car details", "Detalles del auto")}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <div className="grid gap-4">
                {linkedLeads.length > 0 ? (
                  <div className="rounded-lg border border-border/80 bg-muted/25 px-3 py-2.5">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {tx("Linked leads", "Leads vinculados")}
                    </p>
                    <ul className="space-y-2">
                      {linkedLeads.map((lead) => (
                        <li
                          key={lead.id}
                          className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/80 px-2 py-1.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {lead.name ?? tx("Unknown lead", "Lead desconocido")}
                            </p>
                            <span className="text-[11px] text-muted-foreground capitalize">
                              {lead.lead_type === "buyer"
                                ? tx("buyer", "comprador")
                                : lead.lead_type === "seller"
                                  ? tx("seller", "vendedor")
                                  : tx("pending", "pendiente")}
                            </span>
                          </div>
                          {onOpenLinkedLead ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-7 shrink-0 text-xs"
                              onClick={() => onOpenLinkedLead(lead)}
                            >
                              {tx("Open", "Abrir")}
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
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
                    <label className="text-sm text-muted-foreground mb-1 block">{tx("Year", "Año")}</label>
                    <Input
                      type="number"
                      value={form.year ?? ""}
                      onChange={(e) => setForm({ ...form, year: parseInt(e.target.value, 10) || 0 })}
                    />
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
                <div className={`grid gap-4 ${showDesiredPrice ? "grid-cols-2" : "grid-cols-1"}`}>
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
                  {showDesiredPrice ? (
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
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">{tx("Owner Type", "Tipo de dueño")}</label>
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
            </div>
          </div>

          <div className="flex min-h-[min(70vh,28rem)] max-h-[min(75vh,calc(90vh-12rem))] flex-1 flex-col overflow-hidden bg-muted/20 md:col-span-2">
            <div className="shrink-0 px-4 pt-3 pb-2">
              <ToggleGroup
                type="single"
                value={rightPanel}
                onValueChange={(v) => {
                  if (v === "files" || v === "notes") setRightPanel(v);
                }}
                variant="outline"
                size="sm"
                className="justify-start"
                aria-label={tx("Files or notes", "Archivos o notas")}
              >
                <ToggleGroupItem value="files">{tx("Files", "Archivos")}</ToggleGroupItem>
                <ToggleGroupItem value="notes">{tx("Notes", "Notas")}</ToggleGroupItem>
              </ToggleGroup>
            </div>

            {rightPanel === "files" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="shrink-0 px-4 pb-2">
                  <p className="text-xs text-muted-foreground">
                    {tx("Attached files appear above the upload area.", "Los archivos adjuntos aparecen arriba del área de subida.")}
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
                  <div className="flex min-h-[8rem] flex-col gap-2">
                    {attachmentList.length === 0 ? (
                      <div className="flex flex-1 min-h-[6rem] items-center justify-center rounded-md border border-dashed border-transparent px-2">
                        <p className="text-center text-xs text-muted-foreground">
                          {tx("No attachments yet.", "Aún no hay adjuntos.")}
                        </p>
                      </div>
                    ) : (
                      attachmentList.map((att, idx) => (
                        <div
                          key={`${att.storage_key ?? att.url ?? "row"}-${idx}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-2"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {att.type === "image" && att.url ? (
                              <img
                                src={att.url}
                                alt={att.filename ?? "attachment"}
                                className="h-11 w-11 rounded-md border border-border object-cover shrink-0"
                              />
                            ) : (
                              <div className="h-11 w-11 rounded-md border border-border bg-muted/30 flex items-center justify-center shrink-0">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <Input
                                value={att.filename ?? ""}
                                onChange={(e) => renameAttachment(idx, e.target.value)}
                                placeholder={tx("Untitled", "Sin nombre")}
                                className="h-8 text-sm font-medium"
                                aria-label={tx("File name", "Nombre del archivo")}
                              />
                              <p className="text-xs text-muted-foreground capitalize">{att.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center shrink-0">
                            {canPreviewAttachment(att) ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                title={tx("Preview", "Vista previa")}
                                onClick={() => viewAttachment(att)}
                                className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              title={tx("Download", "Descargar")}
                              onClick={() => downloadAttachment(att)}
                              className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              title={tx("Remove", "Quitar")}
                              onClick={() => removeAttachment(idx)}
                              className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="shrink-0 border-t border-border/70 bg-muted/10 px-4 pb-4 pt-3">
                  <div
                    className={[
                      "relative flex flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-7 transition-colors",
                      fileDropActive
                        ? "border-primary bg-primary/5"
                        : "border-border/80 bg-background shadow-sm hover:bg-muted/40",
                    ].join(" ")}
                  >
                    <input
                      type="file"
                      multiple
                      accept="*/*"
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                      aria-label={tx("Attach files", "Adjuntar archivos")}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setFileDropActive(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFileDropActive(false);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        setFileDropActive(false);
                        handleFilesSelected(e.dataTransfer.files);
                        e.currentTarget.value = "";
                      }}
                      onChange={(e) => {
                        handleFilesSelected(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                    <div className="pointer-events-none flex flex-col items-center">
                      <Upload className="mb-3 h-7 w-7 text-muted-foreground" aria-hidden />
                      <p className="text-center text-sm font-semibold text-foreground">
                        {tx("Drop files to attach", "Suelta archivos para adjuntar")}
                      </p>
                      <p className="mt-1 text-center text-xs font-normal text-muted-foreground">
                        {tx("or click to browse", "o haz clic para buscar")}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {attachmentList.length}/{MAX_ATTACHMENTS}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2 sm:px-4 sm:pb-4">
                <LeadNotesEditor
                  ref={notesEditorRef}
                  key={car.id}
                  className="min-h-0 max-h-full flex-1"
                  recordId={car.id}
                  notesDocument={car.notes_document}
                  legacyNotes={car.notes}
                  exportNotes={
                    isDraftRecordId(car.id) ? undefined : (format) => exportCarNotes(car.id, format)
                  }
                  exportDownloadBasename={`car-${car.id}-notes`}
                  onPersist={async (json) => {
                    notesDocRef.current = json;
                    if (!isDraftRecordId(car.id)) {
                      await onNotesDocumentAutosave?.(car.id, json);
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tx("Cancel", "Cancelar")}
          </Button>
          <Button onClick={handleSave}>{tx("Save changes", "Guardar cambios")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
