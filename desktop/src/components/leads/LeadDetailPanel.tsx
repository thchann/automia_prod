import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lead, LeadStatus, Car, CarAttachment } from "@/types/leads";
import { useLanguage } from "@/i18n/LanguageProvider";
import {
  Calendar,
  Check,
  Clock,
  FileText,
  Instagram,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Phone,
  Target,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ApiError,
  exportLeadNotes,
  presignLeadAttachmentDownload,
  uploadLeadAttachmentsToBucket,
} from "@automia/api";
import { toast } from "@/components/ui/sonner";
import { isDraftRecordId } from "@/lib/draftIds";
import { LeadNotesEditor, type LeadNotesEditorHandle } from "./LeadNotesEditor";
import { LeadConnectionsSection } from "./LeadConnectionsSection";
import { getAllCarIdsForLead, serializeLeadCarLinks } from "@/lib/leadCarLinks";
import {
  getEditableLeadFormState,
  serializeAttachments,
  serializeLeadFormState,
  serializeNotesDocument,
} from "@/lib/editDialogDirtyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { getStatusChipStyle, translateStatusName } from "@/lib/leadStatusChip";
import { DetailFieldCell } from "@/components/detail/DetailFieldCell";

export interface LeadDetailPanelProps {
  lead: Lead;
  onDismiss: () => void;
  onSave: (lead: Lead) => void | Promise<void>;
  onNotesDocumentAutosave?: (leadId: string, document: Record<string, unknown>) => void | Promise<void>;
  statuses: LeadStatus[];
  cars: Car[];
}

const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

const fieldInputClass =
  "h-auto border-0 bg-transparent p-0 text-[13.5px] leading-snug text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0";

const nameInputClass =
  "h-[33px] border-0 bg-transparent p-0 text-[22px] font-semibold leading-[33px] text-[oklch(0.18_0.01_60)] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0";

type LeadDetailTab = "details" | "notes" | "files" | "connections";

function formatShortDate(s: string | null, locale: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatFileSize(bytes?: number): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function leadInitial(name: string | null | undefined) {
  const t = (name ?? "").trim();
  return t ? t.charAt(0).toUpperCase() : "?";
}

function StatusChip({
  status,
  tx,
  className,
}: {
  status: LeadStatus;
  tx: (enText: string, esText: string) => string;
  className?: string;
}) {
  const chip = getStatusChipStyle(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full py-1 px-2.5 text-[11.5px] font-medium",
        chip.className,
        className,
      )}
      style={chip.style}
    >
      • {translateStatusName(status.name, tx)}
    </span>
  );
}

function AttachmentFileItem({
  attachment,
  onOpen,
  onRemove,
  tx,
}: {
  attachment: CarAttachment;
  onOpen: () => void;
  onRemove: () => void;
  tx: (enText: string, esText: string) => string;
}) {
  const isNewUpload = attachment.url?.startsWith("blob:");
  const metaParts = [formatFileSize(attachment.size_bytes)];
  if (isNewUpload) {
    metaParts.push(tx("Uploaded just now", "Subido justo ahora"));
  }

  return (
    <div className="file-item flex items-center gap-3 rounded-lg border border-border bg-background py-2.5 px-3">
      {attachment.type === "image" && attachment.url ? (
        <img
          src={attachment.url}
          alt={attachment.filename ?? "attachment"}
          className="h-9 w-9 shrink-0 rounded border border-border object-cover"
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border bg-muted/30">
          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen}
          className="block max-w-full truncate text-left text-sm font-semibold text-foreground hover:underline"
          title={attachment.filename ?? tx("Untitled", "Sin nombre")}
        >
          {attachment.filename?.trim() || tx("Untitled", "Sin nombre")}
        </button>
        <p className="text-xs text-muted-foreground">{metaParts.join(" · ")}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:text-foreground hover:opacity-100"
        aria-label={tx("Remove", "Quitar")}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function LeadDetailPanel({
  lead,
  onDismiss,
  onSave,
  statuses,
  cars,
}: LeadDetailPanelProps) {
  const [form, setForm] = useState<Partial<Lead>>({});
  const [attachments, setAttachments] = useState<CarAttachment[]>([]);
  const [fileDropActive, setFileDropActive] = useState(false);
  const [activeTab, setActiveTab] = useState<LeadDetailTab>("details");
  const [notesSaving, setNotesSaving] = useState(false);
  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  const [savingFromExitPrompt, setSavingFromExitPrompt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    setActiveTab("details");
  }, [lead.id]);
  const notesDocRef = useRef<unknown>(undefined);
  const notesEditorRef = useRef<LeadNotesEditorHandle | null>(null);
  const hydratedLeadIdRef = useRef<string | null>(null);
  const attachmentsRef = useRef<CarAttachment[]>([]);
  const initialFormSerializedRef = useRef<string>("");
  const initialAttachmentsSerializedRef = useRef<string>("");
  const initialNotesSerializedRef = useRef<string>("");
  const initialCarLinksSerializedRef = useRef<string>("");
  attachmentsRef.current = attachments;
  const { tx, locale } = useLanguage();

  // Only hydrate from `lead` when opening or switching leads — not when the parent passes a new object reference (e.g. React Query refetch) or blob previews get wiped.
  useEffect(() => {
    if (hydratedLeadIdRef.current === lead.id) return;
    hydratedLeadIdRef.current = lead.id;
    const nextForm = getEditableLeadFormState(lead);
    setForm(nextForm);
    setAttachments(lead.attachments ?? []);
    notesDocRef.current = lead.notes_document;
    initialFormSerializedRef.current = serializeLeadFormState(nextForm);
    initialAttachmentsSerializedRef.current = serializeAttachments(lead.attachments);
    initialNotesSerializedRef.current = serializeNotesDocument(lead.notes_document, lead.notes);
    initialCarLinksSerializedRef.current = serializeLeadCarLinks(nextForm);
  }, [lead]);

  // Same lead id: apply car links from a refreshed parent row (e.g. after getLead) unless the user staged link edits.
  useEffect(() => {
    if (hydratedLeadIdRef.current !== lead.id) return;
    const propLinks = serializeLeadCarLinks(lead);
    if (propLinks === initialCarLinksSerializedRef.current) return;
    setForm((prev) => {
      if (serializeLeadCarLinks(prev) !== initialCarLinksSerializedRef.current) return prev;
      const next = {
        ...prev,
        car_id: lead.car_id,
        car_ids: lead.car_ids ?? null,
      };
      initialCarLinksSerializedRef.current = propLinks;
      initialFormSerializedRef.current = serializeLeadFormState({
        ...getEditableLeadFormState(lead),
        ...next,
      });
      return next;
    });
  }, [lead]);

  useEffect(() => {
    return () => {
      hydratedLeadIdRef.current = null;
      initialFormSerializedRef.current = "";
      initialAttachmentsSerializedRef.current = "";
      initialNotesSerializedRef.current = "";
      initialCarLinksSerializedRef.current = "";
      for (const att of attachmentsRef.current) {
        if (att.url?.startsWith("blob:")) URL.revokeObjectURL(att.url);
      }
    };
  }, []);

  const isHydrated = hydratedLeadIdRef.current === lead.id;

  const formatRelativeDays = (s: string | null) => {
    if (!s) return "—";
    try {
      const days = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
      if (locale.startsWith("es")) {
        if (days <= 0) return tx("Today", "Hoy");
        return tx(`{{n}}d ago`, `Hace ${days}d`).replace("{{n}}", String(days));
      }
      if (days <= 0) return tx("Today", "Hoy");
      return tx(`${days}d ago`, `Hace ${days}d`);
    } catch {
      return "—";
    }
  };

  const currentStatus = statuses.find((s) => s.id === (form.status_id ?? lead.status_id));

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
    if (!carId || carId === "__pick__" || linkedCarIds.includes(carId)) return;
    const nextIds = Array.from(new Set([...linkedCarIds, carId]));
    setForm({
      ...form,
      car_id: nextIds[0] ?? null,
      car_ids: nextIds.length ? nextIds : null,
    });
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
      onDismiss();
      return;
    }
    setExitPromptOpen(true);
  };

  const handleNotesSave = () => {
    void (async () => {
      setNotesSaving(true);
      try {
        await notesEditorRef.current?.flushPendingSave();
        toast.success(tx("Saved", "Guardado"));
      } catch {
        toast.error(tx("Could not save notes.", "No se pudieron guardar las notas."));
      } finally {
        setNotesSaving(false);
      }
    })();
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
        ...effectiveLead,
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
        onDismiss();
      } catch (e) {
        if (!(e instanceof ApiError)) {
          toast.error(tx("Could not save lead.", "No se pudo guardar el lead."));
        }
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
      onDismiss();
    } catch (e) {
      if (!(e instanceof ApiError)) {
        toast.error(tx("Could not save lead.", "No se pudo guardar el lead."));
      }
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


  const tabItems: { key: LeadDetailTab; label: string; count?: number }[] = [
    { key: "details", label: tx("Details", "Detalles") },
    { key: "notes", label: tx("Notes", "Notas") },
    { key: "files", label: tx("Files", "Archivos") },
    {
      key: "connections",
      label: tx("Connections", "Conexiones"),
      count: linkedCarIds.length > 0 ? linkedCarIds.length : undefined,
    },
  ];

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 px-6 pb-0 pt-4">
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={requestClose}
              className="shrink-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label={tx("Close", "Cerrar")}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <Select
                value={form.status_id ?? "__none__"}
                onValueChange={(v) => setForm({ ...form, status_id: v === "__none__" ? null : v })}
              >
                <SelectTrigger
                  className={cn(
                    "h-[26.5px] min-h-[27px] w-full py-1 px-2 text-sm",
                    "bg-background border border-input rounded-md shadow-none",
                    "[&>svg]:h-3.5 [&>svg]:w-3.5",
                  )}
                >
                <SelectValue placeholder={tx("Status", "Estado")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{tx("None", "Ninguno")}</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {translateStatusName(s.name, tx)}
                  </SelectItem>
                ))}
              </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label={tx("More options", "Más opciones")}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5B8DEF] text-[15px] font-semibold text-white"
              aria-hidden
            >
              {leadInitial(form.name ?? lead.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-nowrap items-center gap-2">
                <Input
                  className={cn(
                    nameInputClass,
                    "w-auto min-w-0 max-w-full flex-none [field-sizing:content]",
                  )}
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  aria-label={tx("Name", "Nombre")}
                />
                {currentStatus ? (
                  <StatusChip status={currentStatus} tx={tx} className="shrink-0" />
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[oklch(0.56_0.03_270)]">
                {form.instagram_handle || lead.instagram_handle ? (
                  <span className="inline-flex items-center gap-1">
                    <Instagram className="h-3 w-3 shrink-0" aria-hidden />
                    @{String(form.instagram_handle || lead.instagram_handle).replace(/^@/, "")}
                  </span>
                ) : null}
                {form.phone || lead.phone ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" aria-hidden />
                    {form.phone || lead.phone}
                  </span>
                ) : null}
                {lead.created_at ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0" aria-hidden />
                    {tx("Created", "Creado")} {formatRelativeDays(lead.created_at)}
                  </span>
                ) : null}
                {lead.created_at ? (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                    {formatShortDate(lead.created_at, locale)}
                  </span>
                ) : null}
                {form.source || lead.source ? (
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3 w-3 shrink-0" aria-hidden />
                    {tx("Source", "Origen")}: {form.source || lead.source}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-3.5 flex items-center gap-1 border-b border-border px-1" role="tablist">
            {tabItems.map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                className={cn(
                  "relative px-3 py-2 text-[13px] font-medium transition-colors",
                  activeTab === key
                    ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setActiveTab(key)}
              >
                {label}
                {count != null ? ` ${count}` : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="detail-body min-h-0 flex-1 overflow-y-auto py-5 px-6" role="tabpanel">
          {activeTab === "details" ? (
            <>
              <div className="mb-3 flex items-center justify-between text-[13px] font-semibold text-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" aria-hidden />
                  {tx("Lead data", "Datos del lead")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-muted/50">
                <DetailFieldCell label={tx("Full name", "Nombre completo")}>
                  <Input
                    className={fieldInputClass}
                    value={form.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </DetailFieldCell>
                <DetailFieldCell label={tx("Lead Type", "Tipo de lead")}>
                  <Select value={leadType} onValueChange={(v) => setForm({ ...form, lead_type: v as Lead["lead_type"] })}>
                    <SelectTrigger className={cn(fieldInputClass, "h-8")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{tx("Pending", "Pendiente")}</SelectItem>
                      <SelectItem value="buyer">{tx("Buyer", "Comprador")}</SelectItem>
                      <SelectItem value="seller">{tx("Seller", "Vendedor")}</SelectItem>
                    </SelectContent>
                  </Select>
                </DetailFieldCell>
                <DetailFieldCell label={tx("Phone", "Teléfono")}>
                  <Input className={fieldInputClass} value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </DetailFieldCell>
                <DetailFieldCell label="Instagram">
                  <Input
                    className={fieldInputClass}
                    value={form.instagram_handle || ""}
                    onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })}
                  />
                </DetailFieldCell>
                <DetailFieldCell label={tx("Source", "Origen")}>
                  <Input className={fieldInputClass} value={form.source || ""} onChange={(e) => setForm({ ...form, source: e.target.value })} />
                </DetailFieldCell>
                <DetailFieldCell label={tx("Status", "Estado")}>
                  <span className="text-[13.5px] leading-snug">{currentStatus?.name ?? "—"}</span>
                </DetailFieldCell>
                <DetailFieldCell label={tx("Created", "Creado")}>
                  <span className="text-[13.5px] leading-snug">{formatShortDate(lead.created_at, locale)}</span>
                </DetailFieldCell>
                <DetailFieldCell label={tx("Last updated", "Última actualización")}>
                  <span className="text-[13.5px] leading-snug">{formatRelativeDays(lead.updated_at)}</span>
                </DetailFieldCell>
              </div>

              {leadType === "buyer" ? (
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between text-[13px] font-semibold text-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" aria-hidden />
                      {tx("Buyer criteria", "Criterios del comprador")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-muted/50">
                    <DetailFieldCell label={tx("Budget min", "Presupuesto mínimo")}>
                      <Input type="number" className={fieldInputClass} value={form.desired_budget_min ?? ""} onChange={(e) => setForm({ ...form, desired_budget_min: numOrNull(e.target.value) })} />
                    </DetailFieldCell>
                    <DetailFieldCell label={tx("Budget max", "Presupuesto máximo")}>
                      <Input type="number" className={fieldInputClass} value={form.desired_budget_max ?? ""} onChange={(e) => setForm({ ...form, desired_budget_max: numOrNull(e.target.value) })} />
                    </DetailFieldCell>
                    <DetailFieldCell label={tx("Mileage max", "Kilometraje máx.")}>
                      <Input type="number" className={fieldInputClass} value={form.desired_mileage_max ?? ""} onChange={(e) => setForm({ ...form, desired_mileage_max: numOrNull(e.target.value) as number | null })} />
                    </DetailFieldCell>
                    <DetailFieldCell label={tx("Car type", "Tipo de auto")}>
                      <Input className={fieldInputClass} value={form.desired_car_type || ""} onChange={(e) => setForm({ ...form, desired_car_type: e.target.value || null })} />
                    </DetailFieldCell>
                    <DetailFieldCell label={tx("Year min", "Año mínimo")}>
                      <Input type="number" className={fieldInputClass} value={form.desired_year_min ?? ""} onChange={(e) => setForm({ ...form, desired_year_min: numOrNull(e.target.value) as number | null })} />
                    </DetailFieldCell>
                    <DetailFieldCell label={tx("Year max", "Año máximo")}>
                      <Input type="number" className={fieldInputClass} value={form.desired_year_max ?? ""} onChange={(e) => setForm({ ...form, desired_year_max: numOrNull(e.target.value) as number | null })} />
                    </DetailFieldCell>
                    <DetailFieldCell label={tx("Desired make", "Marca deseada")}>
                      <Input className={fieldInputClass} value={form.desired_make || ""} onChange={(e) => setForm({ ...form, desired_make: e.target.value || null })} />
                    </DetailFieldCell>
                    <DetailFieldCell label={tx("Desired model", "Modelo deseado")}>
                      <Input className={fieldInputClass} value={form.desired_model || ""} onChange={(e) => setForm({ ...form, desired_model: e.target.value || null })} />
                    </DetailFieldCell>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {activeTab === "notes" ? (
            <>
              <div className="mb-3 flex items-center justify-between text-[13px] font-semibold text-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  {tx("Private notes", "Notas privadas")}
                </span>
                <Button type="button" size="sm" variant="outline" onClick={handleNotesSave} disabled={notesSaving}>
                  {notesSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                  {tx("Save", "Guardar")}
                </Button>
              </div>
              <div className="notes-area flex min-h-[320px] flex-col rounded-lg border border-border p-3.5 text-sm">
                <LeadNotesEditor
                  ref={notesEditorRef}
                  key={lead.id}
                  className="h-full min-h-[280px] flex-1"
                  recordId={lead.id}
                  notesDocument={lead.notes_document}
                  legacyNotes={lead.notes}
                  exportNotes={isDraftRecordId(lead.id) ? undefined : (format) => exportLeadNotes(lead.id, format)}
                  exportDownloadBasename={`lead-${lead.id}-notes`}
                  onPersist={async (json) => {
                    notesDocRef.current = json;
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {tx("Notes are private and are not shared with the lead.", "Las notas son privadas y no se comparten con el lead.")}
              </p>
            </>
          ) : null}

          {activeTab === "files" ? (
            <div className="flex min-h-0 flex-col">
              <div className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                <Paperclip className="h-3.5 w-3.5" aria-hidden />
                {tx("Attached files", "Archivos adjuntos")}
              </div>
              <div
                className={cn(
                  "relative flex min-h-[10rem] flex-col rounded-lg border border-dashed transition-colors",
                  fileDropActive ? "border-primary bg-primary/5" : "border-border bg-background",
                )}
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
                <div className="pointer-events-none flex flex-1 flex-col items-center justify-center px-4 py-8">
                  <FileText className="mb-3 h-7 w-7 text-muted-foreground" aria-hidden />
                  <p className="text-center text-sm font-semibold text-primary">
                    {tx("Click to upload or drag files here", "Haz clic para subir o arrastra archivos aquí")}
                  </p>
                  <p className="mt-1 text-center text-xs text-muted-foreground">
                    {tx(
                      "Photos, PDFs, documents · max. 10 files",
                      "Fotos, PDFs, documentos · máx. 10 archivos",
                    )}
                  </p>
                </div>
                {attachmentList.length === 0 ? (
                  <p className="pointer-events-none pb-4 text-center text-xs text-muted-foreground">
                    {tx("No attachments yet.", "Aún no hay archivos adjuntos.")}
                  </p>
                ) : null}
              </div>
              {attachmentList.length > 0 ? (
                <div className="mt-4 flex flex-col gap-2">
                  {attachmentList.map((att, idx) => (
                    <AttachmentFileItem
                      key={`${att.storage_key ?? att.url ?? "row"}-${idx}`}
                      attachment={att}
                      tx={tx}
                      onOpen={() => {
                        if (canPreviewAttachment(att)) {
                          viewAttachment(att);
                        } else {
                          downloadAttachment(att);
                        }
                      }}
                      onRemove={() => removeAttachmentLocal(idx)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "connections" ? (
            <LeadConnectionsSection
              tx={tx}
              locale={locale}
              linkedRows={linkedRows}
              carsAvailableToLink={carsAvailableToLink}
              onLinkCar={addLinkedCar}
              onUnlinkCar={removeLinkedCar}
            />
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
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
        </div>
      </div>

      <UnsavedChangesDialog
        open={exitPromptOpen}
        onOpenChange={setExitPromptOpen}
        onSaveAndExit={handleSaveAndExitFromPrompt}
        onDiscardAndExit={() => {
          setExitPromptOpen(false);
          onDismiss();
        }}
        saving={savingFromExitPrompt}
        title={tx("Save your changes before leaving?", "¿Guardar cambios antes de salir?")}
        description={tx("You have unsaved edits in this modal.", "Tienes cambios sin guardar en este modal.")}
        saveLabel={tx("Save and exit", "Guardar y salir")}
        discardLabel={tx("Discard", "Descartar")}
        cancelLabel={tx("Keep editing", "Seguir editando")}
      />
    </>
  );
}
