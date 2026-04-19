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
import { Car, CarAttachment, Lead } from "@/types/leads";
import { getLeadsForCar } from "@/lib/leadCarLinks";
import { useLeadsLinkedToCar } from "@/hooks/useLeadsLinkedToCar";
import { useLanguage } from "@/i18n/LanguageProvider";
import { Download, Eye, FileText, Loader2, Trash2, Upload, X } from "lucide-react";
import {
  ApiError,
  exportCarNotes,
  presignCarAttachmentDownload,
  uploadCarAttachmentsToBucket,
} from "@automia/api";
import { toast } from "@/components/ui/sonner";
import { isDraftRecordId } from "@/lib/draftIds";
import { LeadNotesEditor, type LeadNotesEditorHandle } from "@/components/leads/LeadNotesEditor";
import {
  getEditableCarFormState,
  serializeAttachments,
  serializeCarFormState,
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
  /** Optional: sever the connection between this car and a linked lead. */
  onUnlinkLeadFromCar?: (leadId: string, carId: string) => void;
  /** Optional: create a lead-car connection from this dialog. */
  onLinkLeadToCar?: (leadId: string, carId: string) => void | Promise<void>;
}

export function CarEditDialog({
  car,
  open,
  onOpenChange,
  onSave,
  leads,
  onOpenLinkedLead,
  onUnlinkLeadFromCar,
  onLinkLeadToCar,
}: CarEditDialogProps) {
  const [form, setForm] = useState<Partial<Car>>({});
  const [attachments, setAttachments] = useState<Car["attachments"]>(car?.attachments ?? null);
  const [fileDropActive, setFileDropActive] = useState(false);
  const [rightPanel, setRightPanel] = useState<"files" | "notes" | "connections">("notes");
  const [pendingUnlinkLeadIds, setPendingUnlinkLeadIds] = useState<Set<string>>(new Set());
  const [pendingLinkLeadIds, setPendingLinkLeadIds] = useState<Set<string>>(new Set());
  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  const [savingFromExitPrompt, setSavingFromExitPrompt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    setRightPanel("notes");
  }, [car?.id]);
  const notesDocRef = useRef<unknown>(undefined);
  const notesEditorRef = useRef<LeadNotesEditorHandle | null>(null);
  const hydratedCarIdRef = useRef<string | null>(null);
  const attachmentsListRef = useRef<CarAttachment[]>([]);
  const initialFormSerializedRef = useRef<string>("");
  const initialAttachmentsSerializedRef = useRef<string>("");
  const initialNotesSerializedRef = useRef<string>("");
  const { tx } = useLanguage();

  const attachmentList = attachments ?? [];
  attachmentsListRef.current = attachmentList;

  useEffect(() => {
    if (!open || !car) return;
    if (hydratedCarIdRef.current === car.id) return;
    hydratedCarIdRef.current = car.id;
    const nextForm = getEditableCarFormState(car);
    setForm(nextForm);
    setAttachments(car.attachments ?? null);
    notesDocRef.current = car.notes_document;
    initialFormSerializedRef.current = serializeCarFormState(nextForm);
    initialAttachmentsSerializedRef.current = serializeAttachments(car.attachments);
    initialNotesSerializedRef.current = serializeNotesDocument(car.notes_document, car.notes);
    setPendingUnlinkLeadIds(new Set());
    setPendingLinkLeadIds(new Set());
  }, [open, car]);

  useEffect(() => {
    if (open) return;
    hydratedCarIdRef.current = null;
    initialFormSerializedRef.current = "";
    initialAttachmentsSerializedRef.current = "";
    initialNotesSerializedRef.current = "";
    for (const att of attachmentsListRef.current) {
      if (att.url?.startsWith("blob:")) URL.revokeObjectURL(att.url);
    }
  }, [open]);

  const { data: junctionLeads } = useLeadsLinkedToCar(car?.id, { enabled: open });
  const linkedLeads = useMemo(() => {
    if (junctionLeads !== undefined) return junctionLeads;
    return car ? getLeadsForCar(car.id, leads ?? []) : [];
  }, [junctionLeads, car, leads]);
  const linkedLeadsVisible = useMemo(() => {
    const base = linkedLeads.filter((l) => !pendingUnlinkLeadIds.has(l.id));
    const existing = new Set(base.map((l) => l.id));
    const extra = (leads ?? []).filter((l) => pendingLinkLeadIds.has(l.id) && !existing.has(l.id));
    return [...base, ...extra];
  }, [linkedLeads, pendingUnlinkLeadIds, pendingLinkLeadIds, leads]);
  const leadsAvailableToLink = useMemo(() => {
    const visibleIds = new Set(linkedLeadsVisible.map((l) => l.id));
    return (leads ?? []).filter((l) => !visibleIds.has(l.id));
  }, [leads, linkedLeadsVisible]);
  const showDesiredPrice = linkedLeadsVisible.some((l) => l.lead_type === "seller");

  if (!car) return null;
  const isHydrated = hydratedCarIdRef.current === car.id;

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

  const removeAttachmentLocal = (index: number) => {
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

  const hasUnsavedChanges = (() => {
    if (!isHydrated) return false;
    const formChanged = serializeCarFormState(form) !== initialFormSerializedRef.current;
    const attachmentsChanged = serializeAttachments(attachmentList) !== initialAttachmentsSerializedRef.current;
    const notesChanged =
      serializeNotesDocument(notesDocRef.current, car.notes) !== initialNotesSerializedRef.current;
    const linksChanged = pendingUnlinkLeadIds.size > 0 || pendingLinkLeadIds.size > 0;
    return formChanged || attachmentsChanged || notesChanged || linksChanged;
  })();

  const requestClose = () => {
    if (!hasUnsavedChanges) {
      onOpenChange(false);
      return;
    }
    setExitPromptOpen(true);
  };

  const persistCarChanges = async (): Promise<boolean> => {
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
        return false;
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
    );
    if (onLinkLeadToCar) {
      for (const leadId of pendingLinkLeadIds) {
        await Promise.resolve(onLinkLeadToCar(leadId, car.id));
      }
    }
    if (onUnlinkLeadFromCar) {
      for (const leadId of pendingUnlinkLeadIds) {
        await Promise.resolve(onUnlinkLeadFromCar(leadId, car.id));
      }
    }
    return true;
  };

  const handleSave = () => {
    void (async () => {
      setIsSaving(true);
      try {
        const ok = await persistCarChanges();
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
      const ok = await persistCarChanges();
      if (!ok) return;
      toast.success(tx("Saved", "Guardado"));
      setExitPromptOpen(false);
      onOpenChange(false);
    } finally {
      setSavingFromExitPrompt(false);
    }
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
                    <Select
                      value={form.owner_type || "owned"}
                      onValueChange={(v) =>
                        setForm({ ...form, owner_type: v as Car["owner_type"] })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owned">
                          {tx("Owned", "Propio")}
                        </SelectItem>
                        <SelectItem value="client">
                          {tx("Client", "Cliente")}
                        </SelectItem>
                        <SelectItem value="advisor">
                          {tx("Advisor", "Asesor")}
                        </SelectItem>
                        <SelectItem value="web_listing">
                          {tx("Web listing", "Listado web")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">{tx("Status", "Estado")}</label>
                    <Select
                      value={form.status || "available"}
                      onValueChange={(v) =>
                        setForm({ ...form, status: v as Car["status"] })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">
                          {tx("Available", "Disponible")}
                        </SelectItem>
                        <SelectItem value="sold">
                          {tx("Sold", "Vendido")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">{tx("Transmission", "Transmisión")}</label>
                    <Input
                      value={form.transmission ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, transmission: e.target.value.trim() || null })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">{tx("Color", "Color")}</label>
                    <Input
                      value={form.color ?? ""}
                      onChange={(e) => setForm({ ...form, color: e.target.value.trim() || null })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">{tx("Fuel", "Combustible")}</label>
                    <Input
                      value={form.fuel ?? ""}
                      onChange={(e) => setForm({ ...form, fuel: e.target.value.trim() || null })}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">
                      {tx("Manufacture year", "Año de fabricación")}
                    </label>
                    <Input
                      type="number"
                      value={form.manufacture_year ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        const n = v === "" ? null : parseInt(v, 10);
                        setForm({
                          ...form,
                          manufacture_year: n !== null && Number.isFinite(n) ? n : null,
                        });
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">
                      {tx("Vehicle condition", "Condición del vehículo")}
                    </label>
                    <Input
                      value={form.vehicle_condition ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, vehicle_condition: e.target.value.trim() || null })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/20 md:col-span-2 md:h-full md:min-h-0">
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
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pt-3 pb-3 sm:px-4 sm:pt-3 sm:pb-3">
                <LeadNotesEditor
                  ref={notesEditorRef}
                  key={car.id}
                  className="min-h-0 h-full flex-1"
                  recordId={car.id}
                  notesDocument={car.notes_document}
                  legacyNotes={car.notes}
                  exportNotes={
                    isDraftRecordId(car.id) ? undefined : (format) => exportCarNotes(car.id, format)
                  }
                  exportDownloadBasename={`car-${car.id}-notes`}
                  onPersist={async (json) => {
                    notesDocRef.current = json;
                  }}
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-4">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm text-muted-foreground">
                      {tx("Add linked lead", "Agregar lead vinculado")}
                    </label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      value=""
                      disabled={leadsAvailableToLink.length === 0}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        setPendingUnlinkLeadIds((prev) => {
                          const next = new Set(prev);
                          next.delete(id);
                          return next;
                        });
                        setPendingLinkLeadIds((prev) => new Set(prev).add(id));
                        e.currentTarget.value = "";
                      }}
                    >
                      <option value="">
                        {leadsAvailableToLink.length === 0
                          ? tx("All leads already linked", "Todos los leads ya están vinculados")
                          : tx("Choose a lead to link…", "Elige un lead para vincular…")}
                      </option>
                      {leadsAvailableToLink.map((leadOption) => (
                        <option key={leadOption.id} value={leadOption.id}>
                          {(leadOption.name ?? tx("Unknown lead", "Lead desconocido"))}
                        </option>
                      ))}
                    </select>
                  </div>
                <div className="rounded-lg border border-border/80 bg-muted/25 p-2 sm:p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {tx("Linked leads", "Leads vinculados")}
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-10 px-3">{tx("Lead", "Lead")}</TableHead>
                        <TableHead className="h-10 w-[100px] px-3">{tx("Type", "Tipo")}</TableHead>
                        <TableHead className="h-10 w-[120px] px-2 text-right">
                          {tx("Actions", "Acciones")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linkedLeadsVisible.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="px-3 py-6 text-center text-xs text-muted-foreground"
                          >
                            {tx(
                              "No linked leads. You can unlink all connections from this car.",
                              "Sin leads vinculados. Puedes dejar este auto sin conexiones.",
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
                        linkedLeadsVisible.map((leadRow) => (
                          <TableRow key={leadRow.id}>
                            <TableCell className="max-w-[200px] px-3 py-2 align-middle">
                              <p className="truncate text-sm font-medium text-foreground">
                                {leadRow.name ?? tx("Unknown lead", "Lead desconocido")}
                              </p>
                            </TableCell>
                            <TableCell className="px-3 py-2 align-middle text-xs capitalize text-muted-foreground">
                              {leadRow.lead_type === "buyer"
                                ? tx("buyer", "comprador")
                                : leadRow.lead_type === "seller"
                                  ? tx("seller", "vendedor")
                                  : tx("pending", "pendiente")}
                            </TableCell>
                            <TableCell className="px-2 py-2 text-right align-middle">
                              <div className="flex items-center justify-end gap-1">
                                {onOpenLinkedLead ? (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="h-7 shrink-0 text-xs"
                                    onClick={() => onOpenLinkedLead(leadRow)}
                                  >
                                    {tx("Open", "Abrir")}
                                  </Button>
                                ) : null}
                                <button
                                  type="button"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-destructive transition-colors hover:border-destructive hover:bg-destructive/10"
                                  aria-label={tx("Unlink lead from car", "Desvincular lead del auto")}
                                  onClick={() => {
                                    if (pendingLinkLeadIds.has(leadRow.id)) {
                                      setPendingLinkLeadIds((prev) => {
                                        const next = new Set(prev);
                                        next.delete(leadRow.id);
                                        return next;
                                      });
                                      return;
                                    }
                                    setPendingUnlinkLeadIds((prev) => new Set(prev).add(leadRow.id));
                                  }}
                                >
                                  <X className="h-4 w-4" aria-hidden />
                                </button>
                              </div>
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
