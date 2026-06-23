import { useEffect, useMemo, useRef, useState } from "react";
import type { Car, Lead } from "@/types/leads";
import { useLanguage } from "@/i18n/LanguageProvider";
import { Car as CarIcon, Check, Cog, FileText, Fuel, Loader2, Pencil, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DetailFieldCell } from "@/components/detail/DetailFieldCell";
import { CarConnectionsSection } from "@/components/cars/CarConnectionsSection";
import { getLeadsForCar } from "@/lib/leadCarLinks";
import { useLeadsLinkedToCar } from "@/hooks/useLeadsLinkedToCar";
import {
  formatCarMileage,
  formatCarPrice,
  getCarThumbnailColor,
  getCarThumbnailImageUrl,
} from "@/lib/carDisplay";
import {
  getEditableCarFormState,
  serializeCarFormState,
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
import { toast } from "@/components/ui/sonner";
import { ApiError, exportCarNotes } from "@automia/api";
import { isDraftRecordId } from "@/lib/draftIds";
import { LeadNotesEditor, type LeadNotesEditorHandle } from "@/components/leads/LeadNotesEditor";

export type CarDetailPanelProps = {
  car: Car;
  leads?: Lead[];
  onDismiss: () => void;
  onSave: (car: Car) => void | Promise<void>;
  onNotesDocumentAutosave?: (carId: string, document: Record<string, unknown>) => void | Promise<void>;
  onLinkLeadToCar?: (leadId: string, carId: string) => void | Promise<void>;
  onUnlinkLeadFromCar?: (leadId: string, carId: string) => void | Promise<void>;
  onOpenLinkedLead?: (lead: Lead) => void;
};

type CarDetailTab = "details" | "notes" | "connections";

const fieldInputClass =
  "h-auto border-0 bg-transparent p-0 text-[13.5px] leading-snug text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0";

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

function translateOwnerType(
  ownerType: Car["owner_type"],
  tx: (enText: string, esText: string) => string,
): string {
  switch (ownerType) {
    case "owned":
      return tx("owned", "propio");
    case "client":
      return tx("client", "cliente");
    case "advisor":
      return tx("advisor", "asesor");
    case "web_listing":
      return tx("Web listing", "Listado web");
    default:
      return ownerType;
  }
}

function translateCarStatus(
  status: Car["status"],
  tx: (enText: string, esText: string) => string,
): string {
  return status === "sold" ? tx("sold", "vendido") : tx("available", "disponible");
}

function numOrNull(v: string): number | null {
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function CarDetailPanel({
  car,
  leads = [],
  onDismiss,
  onSave,
  onNotesDocumentAutosave,
  onLinkLeadToCar,
  onUnlinkLeadFromCar,
  onOpenLinkedLead,
}: CarDetailPanelProps) {
  const { tx, locale } = useLanguage();
  const [activeTab, setActiveTab] = useState<CarDetailTab>("details");
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<Car>>({});
  const [notesSaving, setNotesSaving] = useState(false);
  const [pendingUnlinkLeadIds, setPendingUnlinkLeadIds] = useState<Set<string>>(new Set());
  const [pendingLinkLeadIds, setPendingLinkLeadIds] = useState<Set<string>>(new Set());
  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  const [savingFromExitPrompt, setSavingFromExitPrompt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hydratedCarIdRef = useRef<string | null>(null);
  const initialFormSerializedRef = useRef<string>("");
  const initialNotesSerializedRef = useRef<string>("");
  const notesDocRef = useRef<unknown>(undefined);
  const notesEditorRef = useRef<LeadNotesEditorHandle | null>(null);

  useEffect(() => {
    setActiveTab("details");
    setIsEditing(false);
    setPendingUnlinkLeadIds(new Set());
    setPendingLinkLeadIds(new Set());
  }, [car.id]);

  useEffect(() => {
    if (hydratedCarIdRef.current === car.id) return;
    hydratedCarIdRef.current = car.id;
    const nextForm = getEditableCarFormState(car);
    setForm(nextForm);
    notesDocRef.current = car.notes_document;
    initialFormSerializedRef.current = serializeCarFormState(nextForm);
    initialNotesSerializedRef.current = serializeNotesDocument(car.notes_document, car.notes);
  }, [car]);

  useEffect(() => {
    return () => {
      hydratedCarIdRef.current = null;
      initialFormSerializedRef.current = "";
      initialNotesSerializedRef.current = "";
    };
  }, []);

  const isHydrated = hydratedCarIdRef.current === car.id;
  const { data: junctionLeads } = useLeadsLinkedToCar(car.id, {});
  const linkedLeads = useMemo(() => {
    const fromList = getLeadsForCar(car.id, leads);
    if (junctionLeads === undefined) return fromList;
    const byId = new Map<string, Lead>();
    for (const lead of junctionLeads) byId.set(lead.id, lead);
    for (const lead of fromList) byId.set(lead.id, lead);
    return Array.from(byId.values());
  }, [junctionLeads, car.id, leads]);
  const linkedLeadsVisible = useMemo(() => {
    const base = linkedLeads.filter((l) => !pendingUnlinkLeadIds.has(l.id));
    const existing = new Set(base.map((l) => l.id));
    const extra = leads.filter((l) => pendingLinkLeadIds.has(l.id) && !existing.has(l.id));
    return [...base, ...extra];
  }, [linkedLeads, pendingUnlinkLeadIds, pendingLinkLeadIds, leads]);
  const leadsAvailableToLink = useMemo(() => {
    const visibleIds = new Set(linkedLeadsVisible.map((l) => l.id));
    return leads.filter((l) => !visibleIds.has(l.id));
  }, [leads, linkedLeadsVisible]);

  const displayCar = { ...car, ...form } as Car;
  const thumbUrl = getCarThumbnailImageUrl(displayCar);
  const isAvailable = displayCar.status === "available";
  const linkedLeadsCount = linkedLeadsVisible.length;

  const heroTitle =
    `${(displayCar.brand ?? "").trim().toUpperCase()} ${(displayCar.model ?? "").trim()}`.trim() || "—";
  const subtitleParts = [
    displayCar.year != null ? String(displayCar.year) : null,
    formatCarMileage(displayCar.mileage, locale),
  ].filter((part) => part && part !== "—");

  const tagItems = [
    displayCar.car_type?.trim() ? { icon: CarIcon, label: displayCar.car_type.trim() } : null,
    displayCar.transmission?.trim() ? { icon: Cog, label: displayCar.transmission.trim() } : null,
    displayCar.fuel?.trim() ? { icon: Fuel, label: displayCar.fuel.trim() } : null,
    displayCar.vehicle_condition?.trim() ? { icon: Tag, label: displayCar.vehicle_condition.trim() } : null,
  ].filter((item): item is { icon: typeof CarIcon; label: string } => item != null);

  const tabItems: { key: CarDetailTab; label: string; count?: number }[] = [
    { key: "details", label: tx("Details", "Detalles") },
    { key: "notes", label: tx("Notes", "Notas") },
    {
      key: "connections",
      label: tx("Connections", "Conexiones"),
      count: linkedLeadsCount > 0 ? linkedLeadsCount : undefined,
    },
  ];

  const hasUnsavedChanges = (() => {
    if (!isHydrated) return false;
    const formChanged =
      isEditing && serializeCarFormState(form) !== initialFormSerializedRef.current;
    const notesChanged =
      serializeNotesDocument(notesDocRef.current, car.notes) !== initialNotesSerializedRef.current;
    const linksChanged = pendingUnlinkLeadIds.size > 0 || pendingLinkLeadIds.size > 0;
    return formChanged || notesChanged || linksChanged;
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

  const persistCarChanges = async (): Promise<boolean> => {
    await notesEditorRef.current?.flushPendingSave();

    await Promise.resolve(
      onSave({
        ...car,
        ...form,
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

  const handleLinkLead = (leadId: string) => {
    setPendingUnlinkLeadIds((prev) => {
      const next = new Set(prev);
      next.delete(leadId);
      return next;
    });
    setPendingLinkLeadIds((prev) => new Set(prev).add(leadId));
  };

  const handleUnlinkLead = (leadId: string) => {
    if (pendingLinkLeadIds.has(leadId)) {
      setPendingLinkLeadIds((prev) => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
      return;
    }
    setPendingUnlinkLeadIds((prev) => new Set(prev).add(leadId));
  };

  const handleSave = () => {
    void (async () => {
      setIsSaving(true);
      try {
        const ok = await persistCarChanges();
        if (!ok) return;
        toast.success(tx("Saved", "Guardado"));
        onDismiss();
      } catch (e) {
        if (!(e instanceof ApiError)) {
          toast.error(tx("Could not save car.", "No se pudo guardar el auto."));
        }
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
      onDismiss();
    } catch (e) {
      if (!(e instanceof ApiError)) {
        toast.error(tx("Could not save car.", "No se pudo guardar el auto."));
      }
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
      <div className="inv-detail-panel flex h-full min-h-0 flex-col bg-[oklch(0.995_0.003_70)]">
        <div className="flex shrink-0 items-center justify-between px-6 pt-4">
          <button
            type="button"
            onClick={requestClose}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label={tx("Close", "Cerrar")}
          >
            <X className="h-4 w-4" />
          </button>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {tx("Edit", "Editar")}
            </button>
          ) : null}
        </div>

        <div className="inv-hero flex shrink-0 gap-0 px-6 pb-0 pt-2">
          <div className="h-[214px] w-[220px] shrink-0 overflow-hidden rounded-lg bg-muted">
            {thumbUrl ? (
              <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-white/90"
                style={{ backgroundColor: getCarThumbnailColor(displayCar) }}
              >
                {heroTitle}
              </div>
            )}
          </div>
          <div className="inv-hero-info min-w-0 flex-1 p-6">
            <h2 className="inv-title text-xl font-bold leading-8 text-foreground">{heroTitle}</h2>
            {subtitleParts.length > 0 ? (
              <p className="mt-1 text-[13px] text-[oklch(0.56_0.007_60)]">{subtitleParts.join(" · ")}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-2xl font-bold text-foreground">
                {formatCarPrice(displayCar.price, locale)}
              </span>
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium capitalize",
                  isAvailable
                    ? "bg-[oklch(0.93_0.06_145)] text-[oklch(0.46_0.14_145)]"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {translateCarStatus(displayCar.status, tx)}
              </span>
            </div>
            {tagItems.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
                {tagItems.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 capitalize"
                  >
                    <Icon className="h-3 w-3 shrink-0" aria-hidden />
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3.5 flex shrink-0 items-center gap-1 border-b border-border px-6" role="tablist">
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

        <div className="detail-body min-h-0 flex-1 overflow-y-auto py-5 px-6" role="tabpanel">
          {activeTab === "details" ? (
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-muted/50">
              <DetailFieldCell label={tx("Brand", "Marca")}>
                {isEditing ? (
                  <Input
                    className={fieldInputClass}
                    value={form.brand || ""}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  />
                ) : (
                  car.brand || "—"
                )}
              </DetailFieldCell>
              <DetailFieldCell label={tx("Model", "Modelo")}>
                {isEditing ? (
                  <Input
                    className={fieldInputClass}
                    value={form.model || ""}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                  />
                ) : (
                  car.model || "—"
                )}
              </DetailFieldCell>
              <DetailFieldCell label={tx("Year", "Año")}>
                {isEditing ? (
                  <Input
                    type="number"
                    className={fieldInputClass}
                    value={form.year ?? ""}
                    onChange={(e) => setForm({ ...form, year: parseInt(e.target.value, 10) || 0 })}
                  />
                ) : (
                  car.year ?? "—"
                )}
              </DetailFieldCell>
              <DetailFieldCell label={tx("Mileage", "Kilometraje")}>
                {isEditing ? (
                  <Input
                    type="number"
                    className={fieldInputClass}
                    value={form.mileage ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm({ ...form, mileage: v === "" ? null : parseInt(v, 10) });
                    }}
                  />
                ) : (
                  formatCarMileage(car.mileage, locale)
                )}
              </DetailFieldCell>
              <DetailFieldCell label={tx("Price", "Precio")}>
                {isEditing ? (
                  <Input
                    type="number"
                    className={fieldInputClass}
                    value={form.price ?? ""}
                    onChange={(e) => setForm({ ...form, price: numOrNull(e.target.value) })}
                  />
                ) : (
                  formatCarPrice(car.price, locale)
                )}
              </DetailFieldCell>
              <DetailFieldCell label={tx("Status", "Estado")}>
                {isEditing ? (
                  <Select
                    value={form.status || "available"}
                    onValueChange={(v) => setForm({ ...form, status: v as Car["status"] })}
                  >
                    <SelectTrigger className={cn(fieldInputClass, "h-8")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">{tx("Available", "Disponible")}</SelectItem>
                      <SelectItem value="sold">{tx("Sold", "Vendido")}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  translateCarStatus(car.status, tx)
                )}
              </DetailFieldCell>
              <DetailFieldCell label={tx("Car Type", "Tipo de auto")}>
                {isEditing ? (
                  <Input
                    className={fieldInputClass}
                    value={form.car_type || ""}
                    onChange={(e) => setForm({ ...form, car_type: e.target.value || null })}
                  />
                ) : (
                  <span className="capitalize">{car.car_type?.trim() || "—"}</span>
                )}
              </DetailFieldCell>
              <DetailFieldCell label={tx("Transmission", "Transmisión")}>
                {isEditing ? (
                  <Input
                    className={fieldInputClass}
                    value={form.transmission ?? ""}
                    onChange={(e) => setForm({ ...form, transmission: e.target.value.trim() || null })}
                  />
                ) : (
                  <span className="capitalize">{car.transmission?.trim() || "—"}</span>
                )}
              </DetailFieldCell>
              <DetailFieldCell label={tx("Color", "Color")}>
                {isEditing ? (
                  <Input
                    className={fieldInputClass}
                    value={form.color ?? ""}
                    onChange={(e) => setForm({ ...form, color: e.target.value.trim() || null })}
                  />
                ) : (
                  car.color?.trim() || "—"
                )}
              </DetailFieldCell>
              <DetailFieldCell label={tx("Fuel", "Combustible")}>
                {isEditing ? (
                  <Input
                    className={fieldInputClass}
                    value={form.fuel ?? ""}
                    onChange={(e) => setForm({ ...form, fuel: e.target.value.trim() || null })}
                  />
                ) : (
                  <span className="capitalize">{car.fuel?.trim() || "—"}</span>
                )}
              </DetailFieldCell>
              <DetailFieldCell label={tx("Vehicle condition", "Condición")}>
                {isEditing ? (
                  <Input
                    className={fieldInputClass}
                    value={form.vehicle_condition ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, vehicle_condition: e.target.value.trim() || null })
                    }
                  />
                ) : (
                  <span className="capitalize">{car.vehicle_condition?.trim() || "—"}</span>
                )}
              </DetailFieldCell>
              <DetailFieldCell label={tx("Source", "Fuente")}>
                {isEditing ? (
                  <Select
                    value={form.owner_type || "owned"}
                    onValueChange={(v) => setForm({ ...form, owner_type: v as Car["owner_type"] })}
                  >
                    <SelectTrigger className={cn(fieldInputClass, "h-8")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owned">{tx("Owned", "Propio")}</SelectItem>
                      <SelectItem value="client">{tx("Client", "Cliente")}</SelectItem>
                      <SelectItem value="advisor">{tx("Advisor", "Asesor")}</SelectItem>
                      <SelectItem value="web_listing">{tx("Web listing", "Listado web")}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  translateOwnerType(car.owner_type, tx)
                )}
              </DetailFieldCell>
              <DetailFieldCell label={tx("Listed at", "Publicado")}>
                {isEditing ? (
                  <Input
                    type="datetime-local"
                    className={fieldInputClass}
                    value={listedAtInputValue}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm({ ...form, listed_at: v ? new Date(v).toISOString() : null });
                    }}
                  />
                ) : (
                  formatShortDate(car.listed_at, locale)
                )}
              </DetailFieldCell>
              <DetailFieldCell label={tx("Manufacture year", "Año de fabricación")}>
                {isEditing ? (
                  <Input
                    type="number"
                    className={fieldInputClass}
                    value={form.manufacture_year ?? ""}
                    onChange={(e) => {
                      const n = numOrNull(e.target.value);
                      setForm({
                        ...form,
                        manufacture_year: n !== null ? Math.trunc(n) : null,
                      });
                    }}
                  />
                ) : (
                  car.manufacture_year ?? "—"
                )}
              </DetailFieldCell>
            </div>
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
                  key={car.id}
                  className="h-full min-h-[280px] flex-1"
                  recordId={car.id}
                  notesDocument={car.notes_document}
                  legacyNotes={car.notes}
                  exportNotes={isDraftRecordId(car.id) ? undefined : (format) => exportCarNotes(car.id, format)}
                  exportDownloadBasename={`car-${car.id}-notes`}
                  onPersist={async (json) => {
                    notesDocRef.current = json;
                    if (!isDraftRecordId(car.id) && onNotesDocumentAutosave) {
                      await onNotesDocumentAutosave(car.id, json);
                    }
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {tx(
                  "Notes are private and only visible to your team.",
                  "Las notas son privadas y solo visibles para tu equipo.",
                )}
              </p>
            </>
          ) : null}

          {activeTab === "connections" ? (
            <CarConnectionsSection
              tx={tx}
              linkedLeads={linkedLeadsVisible}
              leadsAvailableToLink={leadsAvailableToLink}
              onLinkLead={handleLinkLead}
              onUnlinkLead={handleUnlinkLead}
              onOpenLinkedLead={onOpenLinkedLead}
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
