import { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lead, LeadStatus, Car, CarAttachment } from "@/types/leads";
import { useLanguage } from "@/i18n/LanguageProvider";
import {
  ChevronDown,
  Code2,
  Download,
  ExternalLink,
  FileText,
  Send,
  Star,
  Trash2,
  Upload,
} from "lucide-react";

interface LeadEditDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (lead: Lead) => void | Promise<void>;
  statuses: LeadStatus[];
  cars: Car[];
}

const MAX_ATTACHMENTS = 12;

function splitNotesIntoCards(notes: string | null | undefined): string[] {
  if (!notes?.trim()) return [];
  return notes
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function LeadEditDialog({ lead, open, onOpenChange, onSave, statuses, cars }: LeadEditDialogProps) {
  const [form, setForm] = useState<Partial<Lead>>({});
  const [attachments, setAttachments] = useState<CarAttachment[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteKind, setNoteKind] = useState<"internal" | "general">("internal");
  const [starred, setStarred] = useState<Record<number, boolean>>({});
  const [fileDropActive, setFileDropActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { tx } = useLanguage();

  useEffect(() => {
    if (lead) {
      setForm({ ...lead });
      setAttachments(lead.attachments ?? []);
      setNoteDraft("");
    }
  }, [lead]);

  const noteCards = useMemo(() => {
    const parts = splitNotesIntoCards(form.notes);
    return [...parts].reverse();
  }, [form.notes]);

  if (!lead) return null;

  const leadType = form.lead_type || "pending";
  const attachmentList = attachments;

  const handleSave = () => {
    const resolvedAttachments =
      attachmentList.length > 0 ? attachmentList : lead.attachments !== undefined ? null : undefined;

    void Promise.resolve(
      onSave({
        ...lead,
        ...form,
        ...(resolvedAttachments !== undefined ? { attachments: resolvedAttachments } : {}),
        updated_at: new Date().toISOString(),
      } as Lead),
    ).then(() => onOpenChange(false));
  };

  const numOrNull = (v: string) => (v === "" ? null : Number(v));

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_ATTACHMENTS - attachmentList.length;
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

    setAttachments([...attachmentList, ...added].slice(0, MAX_ATTACHMENTS));
  };

  const removeAttachment = (index: number) => {
    const removed = attachmentList[index];
    if (removed?.url?.startsWith("blob:")) URL.revokeObjectURL(removed.url);
    setAttachments(attachmentList.filter((_, i) => i !== index));
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

  const appendNote = () => {
    const text = noteDraft.trim();
    if (!text) return;
    const prefix =
      noteKind === "internal"
        ? `[${tx("Internal", "Interno")}]`
        : `[${tx("General", "General")}]`;
    const stamp = new Date().toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const block = `${prefix} · ${stamp}\n${text}`;
    setForm((prev) => ({
      ...prev,
      notes: prev.notes?.trim() ? `${prev.notes.trim()}\n\n${block}` : block,
    }));
    setNoteDraft("");
  };

  const onFilesDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setFileDropActive(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const filterPill = (label: string) => (
    <button
      key={label}
      type="button"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
    >
      {label}
      <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-none gap-0 p-0 sm:max-w-[min(1180px,calc(100vw-1.5rem))] overflow-hidden"
      >
        <div className="shrink-0 border-b px-6 pt-6 pb-4 pr-14">
          <DialogHeader>
            <DialogTitle>{tx("Edit lead details", "Editar detalles del lead")}</DialogTitle>
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
                        <label className="text-sm text-muted-foreground mb-1 block">{tx("Year min", "Ano minimo")}</label>
                        <Input
                          type="number"
                          value={form.desired_year_min ?? ""}
                          onChange={(e) =>
                            setForm({ ...form, desired_year_min: numOrNull(e.target.value) as number | null })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">{tx("Year max", "Ano maximo")}</label>
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

          {/* Column 2 — files only */}
          <div className="flex min-h-[220px] flex-col min-h-0 md:min-h-[min(520px,calc(90vh-10rem))] bg-muted/20">
            <div className="shrink-0 px-4 pt-3 pb-2">
              <p className="text-sm font-semibold text-foreground">{tx("Files", "Archivos")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tx("Drop files here or upload.", "Arrastra archivos aqui o subelos.")}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setFileDropActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setFileDropActive(false);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onFilesDrop}
                onClick={() => fileInputRef.current?.click()}
                className={[
                  "flex flex-1 min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition-colors",
                  fileDropActive ? "border-primary bg-primary/5" : "border-border bg-background/80 hover:bg-background",
                ].join(" ")}
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" aria-hidden />
                <p className="text-sm font-medium text-foreground">{tx("Drop files to attach", "Suelta archivos para adjuntar")}</p>
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  {tx("or click to browse", "o haz clic para buscar")}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {attachmentList.length}/{MAX_ATTACHMENTS}
                </p>
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
              </div>

              {attachmentList.length > 0 && (
                <div className="space-y-2">
                  {attachmentList.map((att, idx) => (
                    <div
                      key={`${att.url}-${idx}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {att.type === "image" ? (
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
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{att.filename ?? tx("Untitled", "Sin nombre")}</p>
                          <p className="text-xs text-muted-foreground capitalize">{att.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          title={tx("View", "Ver")}
                          onClick={() => viewAttachment(att)}
                          className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
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
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Column 3 — notes (feed + composer) */}
          <div className="flex min-h-[320px] flex-col min-h-0 md:min-h-[min(520px,calc(90vh-10rem))]">
            <div className="shrink-0 px-4 pt-3 pb-2">
              <p className="text-base font-semibold text-foreground">{tx("Notes", "Notas")}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {filterPill(tx("All Activity", "Toda la actividad"))}
                {filterPill(tx("Tags", "Etiquetas"))}
                {filterPill(tx("Time range", "Periodo"))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 space-y-3 pb-3">
              {noteCards.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">{tx("No notes yet.", "Aun no hay notas.")}</p>
              ) : (
                noteCards.map((body, i) => {
                  const looksLikeCode = body.includes("className") || body.includes("function ");
                  return (
                    <div
                      key={`${i}-${body.slice(0, 24)}`}
                      className="relative rounded-xl border border-border bg-background p-3 shadow-sm"
                    >
                      <button
                        type="button"
                        className="absolute right-2 top-2 text-muted-foreground hover:text-amber-500 p-1"
                        aria-label={tx("Favorite", "Favorito")}
                        onClick={() => setStarred((s) => ({ ...s, [i]: !s[i] }))}
                      >
                        <Star className={`h-4 w-4 ${starred[i] ? "fill-amber-400 text-amber-500" : ""}`} />
                      </button>
                      {looksLikeCode ? (
                        <div className="pr-8">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                            <Code2 className="h-3.5 w-3.5" />
                            {tx("Snippet", "Fragmento")}
                          </div>
                          <pre className="text-xs bg-muted/70 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
                            {body.length > 280 ? `${body.slice(0, 280)}…` : body}
                          </pre>
                          {body.length > 280 && (
                            <button type="button" className="text-xs text-primary mt-1 hover:underline">
                              {tx("see more", "ver mas")}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="pr-8 whitespace-pre-wrap text-sm text-foreground leading-relaxed">{body}</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="shrink-0 border-t bg-muted/30 px-4 py-3">
              <div className="rounded-xl bg-muted/80 p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <select
                    className="text-xs font-medium bg-transparent border-none cursor-pointer focus:outline-none focus:ring-0 py-0 pl-0 pr-6"
                    value={noteKind}
                    onChange={(e) => setNoteKind(e.target.value as "internal" | "general")}
                  >
                    <option value="internal">{tx("Internal note", "Nota interna")}</option>
                    <option value="general">{tx("General note", "Nota general")}</option>
                  </select>
                </div>
                <div className="flex gap-2 items-end rounded-lg border border-border bg-background p-2">
                  <textarea
                    className="flex-1 min-h-[44px] max-h-32 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground placeholder:italic"
                    placeholder={tx("Add a note about this contact", "Anade una nota sobre este contacto")}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        appendNote();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="shrink-0 h-9 w-9"
                    aria-label={tx("Send note", "Enviar nota")}
                    onClick={appendNote}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground px-1">
                  {tx("Tip: Cmd/Ctrl+Enter to add", "Atajo: Cmd/Ctrl+Enter para anadir")}
                </p>
              </div>
            </div>
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
