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
import { Lead, LeadStatus, Car, CarAttachment } from "@/types/leads";
import { useLanguage } from "@/i18n/LanguageProvider";
import { Download, Eye, FileText, Loader2, Trash2, Upload, X } from "lucide-react";
import {
  ApiError,
  exportLeadNotes,
  presignLeadAttachmentDownload,
  uploadLeadAttachmentsToBucket,
} from "@automia/api";
import { toast } from "@/components/ui/sonner";
import { isDraftRecordId } from "@/lib/draftIds";
import { LeadNotesEditor, type LeadNotesEditorHandle } from "./LeadNotesEditor";
import { getAllCarIdsForLead } from "@/lib/leadCarLinks";
import {
  getEditableLeadFormState,
  serializeAttachments,
  serializeLeadFormState,
  serializeNotesDocument,
} from "@/lib/editDialogDirtyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";

const dialogSelectContentClass =
  "border-border bg-background text-foreground shadow-md [&_[data-radix-select-item-indicator]]:text-foreground";
const dialogSelectItemClass =
  "cursor-pointer rounded-sm focus:bg-muted focus:text-foreground data-[highlighted]:bg-muted data-[highlighted]:text-foreground";

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
  statuses,
  cars,
}: LeadEditDialogProps) {
  const [form, setForm] = useState<Partial<Lead>>({});
  const [attachments, setAttachments] = useState<CarAttachment[]>([]);
  const [fileDropActive, setFileDropActive] = useState(false);
  const [rightPanel, setRightPanel] = useState<"files" | "notes" | "connections">("notes");
  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  const [savingFromExitPrompt, setSavingFromExitPrompt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [linkedCarPickerKey, setLinkedCarPickerKey] = useState(0);
  useEffect(() => {
    setRightPanel("notes");
  }, [lead?.id]);
  const notesDocRef = useRef<unknown>(undefined);
  const notesEditorRef = useRef<LeadNotesEditorHandle | null>(null);
  const hydratedLeadIdRef = useRef<string | null>(null);
  const attachmentsRef = useRef<CarAttachment[]>([]);
  const initialFormSerializedRef = useRef<string>("");
  const initialAttachmentsSerializedRef = useRef<string>("");
  const initialNotesSerializedRef = useRef<string>("");
  attachmentsRef.current = attachments;
  const { tx } = useLanguage();

  // Only hydrate from `lead` when opening or switching leads — not when the parent passes a new object reference (e.g. React Query refetch) or blob previews get wiped.
  useEffect(() => {
    if (!open || !lead) return;
    if (hydratedLeadIdRef.current === lead.id) return;
    hydratedLeadIdRef.current = lead.id;
    const nextForm = getEditableLeadFormState(lead);
    setForm(nextForm);
    setAttachments(lead.attachments ?? []);
    notesDocRef.current = lead.notes_document;
    initialFormSerializedRef.current = serializeLeadFormState(nextForm);
    initialAttachmentsSerializedRef.current = serializeAttachments(lead.attachments);
    initialNotesSerializedRef.current = serializeNotesDocument(lead.notes_document, lead.notes);
  }, [open, lead]);

  useEffect(() => {
    if (open) return;
    hydratedLeadIdRef.current = null;
    initialFormSerializedRef.current = "";
    initialAttachmentsSerializedRef.current = "";
    initialNotesSerializedRef.current = "";
    for (const att of attachmentsRef.current) {
      if (att.url?.startsWith("blob:")) URL.revokeObjectURL(att.url);
    }
  }, [open]);

  if (!lead) return null;
  const isHydrated = hydratedLeadIdRef.current === lead.id;

  const leadType = form.lead_type || "pending";
  const attachmentList = attachments;

  const effectiveLead = {
    ...lead,
    ...form,
    /** Use `!== undefined` so explicit `null` clears legacy `car_id` when unlinking all cars. */
    car_id: form.car_id !== undefined ? form.car_id : lead.car_id,
    car_ids: form.car_ids !== undefined ? form.car_ids : lead.car_ids,
  } as Lead;
  const linkedCarIds = getAllCarIdsForLead(effectiveLead);
  /** Resolved rows plus orphan IDs (not in `cars`) so links stay visible and unlinkable. */
  const linkedRows = linkedCarIds.map((id) => {
    const car = cars.find((c) => c.id === id);
    return car ? ({ type: "car" as const, car }) : ({ type: "orphan" as const, id });
  });
  const carsAvailableToLink = cars.filter((c) => !linkedCarIds.includes(c.id));

  const addLinkedCar = (carId: string) => {
    if (!carId || linkedCarIds.includes(carId)) return;
    const nextIds = Array.from(new Set([...linkedCarIds, carId]));
    setForm({
      ...form,
      car_id: nextIds[0] ?? null,
      car_ids: nextIds.length ? nextIds : null,
    });
    setLinkedCarPickerKey((k) => k + 1);
  };

  const removeLinkedCar = (carId: string) => {
    const nextIds = linkedCarIds.filter((id) => id !== carId);
    setForm({
      ...form,
      car_id: nextIds[0] ?? null,
      car_ids: nextIds.length ? nextIds : null,
    });
  };

  const hasUnsavedChanges = (() => {
    if (!isHydrated) return false;
    const formChanged = serializeLeadFormState(form) !== initialFormSerializedRef.current;
    const attachmentsChanged = serializeAttachments(attachmentList) !== initialAttachmentsSerializedRef.current;
    const notesChanged =
      serializeNotesDocument(notesDocRef.current, lead.notes) !== initialNotesSerializedRef.current;
    return formChanged || attachmentsChanged || notesChanged;
  })();

  const requestClose = () => {
    if (!hasUnsavedChanges) {
      onOpenChange(false);
      return;
    }
    setExitPromptOpen(true);
  };

  const persistLeadChanges = async (): Promise<boolean> => {
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
        return false;
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
    );

    return true;
  };

  const handleSave = () => {
    void (async () => {
      setIsSaving(true);
      try {
        const ok = await persistLeadChanges();
        if (!ok) return;
        toast.success(tx("Saved", "Guardado"));
        onOpenChange(false);
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const handleSaveAndExitFromPrompt = async () => {
    setSavingFromExitPrompt(true);
    try {
      const ok = await persistLeadChanges();
      if (!ok) return;
      toast.success(tx("Saved", "Guardado"));
      setExitPromptOpen(false);
      onOpenChange(false);
    } finally {
      setSavingFromExitPrompt(false);
    }
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

  const removeAttachmentLocal = (index: number) => {
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
    <>
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }
        requestClose();
      }}
    >
      <DialogContent
        className="flex flex-col max-h-[90vh] w-[calc(100vw-10vh)] max-w-none gap-0 p-0 sm:max-w-[min(1360px,calc(100vw-10vh))] overflow-hidden"
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
                    <Select
                      value={leadType}
                      onValueChange={(v) =>
                        setForm({ ...form, lead_type: v as Lead["lead_type"] })
                      }
                    >
                      <SelectTrigger className="h-10 w-full border-input bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={dialogSelectContentClass}>
                        <SelectItem className={dialogSelectItemClass} value="pending">
                          {tx("Pending", "Pendiente")}
                        </SelectItem>
                        <SelectItem className={dialogSelectItemClass} value="buyer">
                          {tx("Buyer", "Comprador")}
                        </SelectItem>
                        <SelectItem className={dialogSelectItemClass} value="seller">
                          {tx("Seller", "Vendedor")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">{tx("Status", "Estado")}</label>
                    <Select
                      value={form.status_id ?? "__none__"}
                      onValueChange={(v) =>
                        setForm({ ...form, status_id: v === "__none__" ? null : v })
                      }
                    >
                      <SelectTrigger className="h-10 w-full border-input bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={dialogSelectContentClass}>
                        <SelectItem className={dialogSelectItemClass} value="__none__">
                          {tx("None", "Ninguno")}
                        </SelectItem>
                        {statuses.map((s) => (
                          <SelectItem className={dialogSelectItemClass} key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
          <div className="flex h-[min(75vh,calc(90vh-12rem))] flex-1 flex-col overflow-hidden bg-muted/20 md:col-span-2">
            <div className="shrink-0 border-b border-border px-4 pt-2 pb-1">
              <div className="flex items-center gap-4">
                {([
                  ["files", tx("Files", "Archivos")],
                  ["notes", tx("Notes", "Notas")],
                  ["connections", tx("Connections", "Conexiones")],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRightPanel(key)}
                    className={`relative px-1 py-2 text-sm font-medium transition-colors ${
                      rightPanel === key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                    {rightPanel === key ? (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            {rightPanel === "files" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="shrink-0 px-4 pt-3 pb-2">
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
                              onClick={() => removeAttachmentLocal(idx)}
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
            ) : rightPanel === "notes" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pt-3 pb-2 sm:px-4 sm:pt-3 sm:pb-4">
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
                  }}
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">{tx("Add linked car", "Agregar auto vinculado")}</label>
                    <Select
                      key={linkedCarPickerKey}
                      value="__pick__"
                      disabled={carsAvailableToLink.length === 0}
                      onValueChange={(id) => {
                        if (id !== "__pick__") addLinkedCar(id);
                      }}
                    >
                      <SelectTrigger className="h-10 w-full border-input bg-background disabled:cursor-not-allowed disabled:opacity-60">
                        <SelectValue
                          placeholder={
                            carsAvailableToLink.length === 0
                              ? tx("All cars already linked", "Todos los autos ya están vinculados")
                              : tx("Choose a car to link…", "Elige un auto para vincular…")
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className={dialogSelectContentClass}>
                        <SelectItem className={dialogSelectItemClass} value="__pick__" disabled>
                          {carsAvailableToLink.length === 0
                            ? tx("All cars already linked", "Todos los autos ya están vinculados")
                            : tx("Choose a car to link…", "Elige un auto para vincular…")}
                        </SelectItem>
                        {carsAvailableToLink.map((c) => (
                          <SelectItem className={dialogSelectItemClass} key={c.id} value={c.id}>
                            {c.year} {c.brand} {c.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-muted/25 p-2 sm:p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {tx("Linked cars", "Autos vinculados")}
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="h-10 px-3">{tx("Vehicle", "Vehículo")}</TableHead>
                          <TableHead className="h-10 w-[100px] px-3">{tx("Inventory", "Inventario")}</TableHead>
                          <TableHead className="h-10 w-14 px-2 text-right">
                            <span className="sr-only">{tx("Actions", "Acciones")}</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {linkedRows.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="px-3 py-6 text-center text-xs text-muted-foreground"
                            >
                              {tx("No linked cars.", "Sin autos vinculados.")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          linkedRows.map((row) => (
                            <TableRow key={row.type === "car" ? row.car.id : `orphan-${row.id}`}>
                              <TableCell className="max-w-[200px] px-3 py-2 align-middle">
                                {row.type === "car" ? (
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {row.car.year} {row.car.brand} {row.car.model}
                                  </p>
                                ) : (
                                  <>
                                    <p className="truncate text-sm font-medium text-foreground">
                                      {tx("Unknown car (not in inventory)", "Auto desconocido (no en inventario)")}
                                    </p>
                                    <span
                                      className="block truncate font-mono text-[11px] text-muted-foreground"
                                      title={row.id}
                                    >
                                      {row.id}
                                    </span>
                                  </>
                                )}
                              </TableCell>
                              <TableCell className="px-3 py-2 align-middle text-xs capitalize text-muted-foreground">
                                {row.type === "car"
                                  ? row.car.status === "sold"
                                    ? tx("sold", "vendido")
                                    : tx("available", "disponible")
                                  : "—"}
                              </TableCell>
                              <TableCell className="px-2 py-2 text-right align-middle">
                                <button
                                  type="button"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-destructive transition-colors hover:border-destructive hover:bg-destructive/10"
                                  aria-label={tx("Unlink car from lead", "Desvincular auto del lead")}
                                  onClick={() => removeLinkedCar(row.type === "car" ? row.car.id : row.id)}
                                >
                                  <X className="h-4 w-4" aria-hidden />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4 sm:justify-end">
          <Button variant="outline" onClick={requestClose} disabled={isSaving}>
            {tx("Cancel", "Cancelar")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className={isSaving ? "opacity-80" : undefined}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tx("Saving changes…", "Guardando cambios…")}
              </>
            ) : (
              tx("Save changes", "Guardar cambios")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <UnsavedChangesDialog
      open={exitPromptOpen}
      onOpenChange={setExitPromptOpen}
      onSaveAndExit={handleSaveAndExitFromPrompt}
      onDiscardAndExit={() => {
        setExitPromptOpen(false);
        onOpenChange(false);
      }}
      saving={savingFromExitPrompt}
      title={tx("Save your changes before leaving?", "¿Guardar cambios antes de salir?")}
      description={tx(
        "You have unsaved edits in this modal.",
        "Tienes cambios sin guardar en este modal.",
      )}
      saveLabel={tx("Save and exit", "Guardar y salir")}
      discardLabel={tx("Discard", "Descartar")}
      cancelLabel={tx("Keep editing", "Seguir editando")}
    />

    </>
  );
}
