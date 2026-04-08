import { useState, useEffect, useRef } from "react";
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
import { Lead, LeadStatus, Car, CarAttachment } from "@/types/leads";
import { useLanguage } from "@/i18n/LanguageProvider";
import { Download, Eye, FileText, Trash2, Upload } from "lucide-react";
import {
  ApiError,
  exportLeadNotes,
  presignLeadAttachmentDownload,
  uploadLeadAttachmentsToBucket,
} from "@automia/api";
import { toast } from "@/components/ui/sonner";
import { isDraftRecordId } from "@/lib/draftIds";
import { LeadNotesEditor, type LeadNotesEditorHandle } from "./LeadNotesEditor";

interface LeadEditDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (lead: Lead) => void | Promise<void>;
  /** Debounced Tiptap JSON autosave (optional; wire to `updateLead(id, { notes_document })`). */
  onNotesDocumentAutosave?: (leadId: string, document: Record<string, unknown>) => void | Promise<void>;
  statuses: LeadStatus[];
  cars: Car[];
}

const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export function LeadEditDialog({
  lead,
  open,
  onOpenChange,
  onSave,
  onNotesDocumentAutosave,
  statuses,
  cars,
}: LeadEditDialogProps) {
  const [form, setForm] = useState<Partial<Lead>>({});
  const [attachments, setAttachments] = useState<CarAttachment[]>([]);
  const [fileDropActive, setFileDropActive] = useState(false);
  const [rightPanel, setRightPanel] = useState<"files" | "notes">("notes");
  useEffect(() => {
    setRightPanel("notes");
  }, [lead?.id]);
  const notesDocRef = useRef<unknown>(undefined);
  const notesEditorRef = useRef<LeadNotesEditorHandle | null>(null);
  const hydratedLeadIdRef = useRef<string | null>(null);
  const attachmentsRef = useRef<CarAttachment[]>([]);
  attachmentsRef.current = attachments;
  const { tx } = useLanguage();

  // Only hydrate from `lead` when opening or switching leads — not when the parent passes a new object reference (e.g. React Query refetch) or blob previews get wiped.
  useEffect(() => {
    if (!open || !lead) return;
    if (hydratedLeadIdRef.current === lead.id) return;
    hydratedLeadIdRef.current = lead.id;
    setForm({ ...lead });
    setAttachments(lead.attachments ?? []);
    notesDocRef.current = lead.notes_document;
  }, [open, lead]);

  useEffect(() => {
    if (open) return;
    hydratedLeadIdRef.current = null;
    for (const att of attachmentsRef.current) {
      if (att.url?.startsWith("blob:")) URL.revokeObjectURL(att.url);
    }
  }, [open]);

  if (!lead) return null;

  const leadType = form.lead_type || "pending";
  const attachmentList = attachments;

  const handleSave = () => {
    void (async () => {
      await notesEditorRef.current?.flushPendingSave();

      let nextAttachments: CarAttachment[] | null = attachmentList.length > 0 ? attachmentList : null;
      if (
        nextAttachments &&
        nextAttachments.length > 0 &&
        !isDraftRecordId(lead.id) &&
        nextAttachments.some((a) => a.url?.startsWith("blob:"))
      ) {
        try {
          const uploaded = await uploadLeadAttachmentsToBucket(lead.id, nextAttachments);
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
          : lead.attachments !== undefined
            ? null
            : undefined;

      await Promise.resolve(
        onSave({
          ...lead,
          ...form,
          ...(resolvedAttachments !== undefined ? { attachments: resolvedAttachments } : {}),
          ...(notesDocRef.current !== undefined ? { notes_document: notesDocRef.current } : {}),
          updated_at: new Date().toISOString(),
        } as Lead),
      ).then(() => onOpenChange(false));
    })();
  };

  const numOrNull = (v: string) => (v === "" ? null : Number(v));

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

    setAttachments([...attachmentList, ...added].slice(0, MAX_ATTACHMENTS));
  };

  const removeAttachment = (index: number) => {
    const removed = attachmentList[index];
    if (removed?.url?.startsWith("blob:")) URL.revokeObjectURL(removed.url);
    setAttachments(attachmentList.filter((_, i) => i !== index));
  };

  const renameAttachment = (index: number, filename: string) => {
    const current = attachmentList;
    const row = current[index];
    if (!row) return;
    const trimmed = filename.trim();
    const next = [...current];
    next[index] = { ...row, filename: trimmed || row.filename };
    setAttachments(next);
  };

  const canPreviewAttachment = (att: CarAttachment) => {
    if (typeof att.url === "string" && att.url.length > 0) return true;
    if (att.storage_key && !isDraftRecordId(lead.id)) return true;
    return false;
  };

  const viewAttachment = (att: CarAttachment) => {
    void (async () => {
      if (att.url) {
        window.open(att.url, "_blank", "noopener,noreferrer");
        return;
      }
      if (att.storage_key && !isDraftRecordId(lead.id)) {
        try {
          const { download_url } = await presignLeadAttachmentDownload(lead.id, att.storage_key);
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
      if (att.storage_key && !isDraftRecordId(lead.id)) {
        try {
          const { download_url } = await presignLeadAttachmentDownload(lead.id, att.storage_key);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col max-h-[90vh] w-[calc(100vw-10vh)] max-w-none gap-0 p-0 sm:max-w-[min(1360px,calc(100vw-10vh))] overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="shrink-0 border-b px-6 pt-6 pb-4 pr-14">
          <DialogHeader>
            <DialogTitle>{tx("Edit lead details", "Editar detalles del lead")}</DialogTitle>
            <DialogDescription className="sr-only">
              {tx(
                "Edit lead fields, linked car, attachments, and rich notes.",
                "Editar campos del lead, auto vinculado, adjuntos y notas.",
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
          {/* Column 1 — same fields as before (notes moved to column 3) */}
          <div className="flex min-h-[280px] flex-col min-h-0 md:min-h-[min(520px,calc(90vh-10rem))]">
            <div className="shrink-0 px-4 pt-3 pb-2">
              <p className="text-sm font-semibold text-foreground">{tx("Lead details", "Detalles del lead")}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">{tx("Name", "Nombre")}</label>
                    <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Instagram</label>
                    <Input
                      value={form.instagram_handle || ""}
                      onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })}
                    />
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
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
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
                      <option key={c.id} value={c.id}>
                        {c.year} {c.brand} {c.model}
                      </option>
                    ))}
                  </select>
                </div>

                {leadType === "buyer" && (
                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <p className="text-sm font-medium text-foreground">{tx("Buyer criteria", "Criterios del comprador")}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">{tx("Budget min", "Presupuesto mínimo")}</label>
                        <Input
                          type="number"
                          value={form.desired_budget_min ?? ""}
                          onChange={(e) => setForm({ ...form, desired_budget_min: numOrNull(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">{tx("Budget max", "Presupuesto máximo")}</label>
                        <Input
                          type="number"
                          value={form.desired_budget_max ?? ""}
                          onChange={(e) => setForm({ ...form, desired_budget_max: numOrNull(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">{tx("Mileage max", "Kilometraje máximo")}</label>
                        <Input
                          type="number"
                          value={form.desired_mileage_max ?? ""}
                          onChange={(e) =>
                            setForm({ ...form, desired_mileage_max: numOrNull(e.target.value) as number | null })
                          }
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
                        <label className="text-sm text-muted-foreground mb-1 block">{tx("Year min", "Año mínimo")}</label>
                        <Input
                          type="number"
                          value={form.desired_year_min ?? ""}
                          onChange={(e) =>
                            setForm({ ...form, desired_year_min: numOrNull(e.target.value) as number | null })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">{tx("Year max", "Año máximo")}</label>
                        <Input
                          type="number"
                          value={form.desired_year_max ?? ""}
                          onChange={(e) =>
                            setForm({ ...form, desired_year_max: numOrNull(e.target.value) as number | null })
                          }
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
              </div>
            </div>
          </div>

          {/* Columns 2–3 — Files or Notes (single panel, spans two grid columns) */}
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
                  key={lead.id}
                  className="min-h-0 max-h-full flex-1"
                  recordId={lead.id}
                  notesDocument={lead.notes_document}
                  legacyNotes={lead.notes}
                  exportNotes={
                    isDraftRecordId(lead.id)
                      ? undefined
                      : (format) => exportLeadNotes(lead.id, format)
                  }
                  exportDownloadBasename={`lead-${lead.id}-notes`}
                  onPersist={async (json) => {
                    notesDocRef.current = json;
                    if (!isDraftRecordId(lead.id)) {
                      await onNotesDocumentAutosave?.(lead.id, json);
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
