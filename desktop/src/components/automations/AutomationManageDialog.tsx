import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, getAutomation, listAutomationMessages, updateAutomation, updateAutomationConfig } from "@automia/api";
import type { AutomationItem, AutomationMessageItem, AutomationTypeItem } from "@automia/api";
import { useLanguage } from "@/i18n/LanguageProvider";
import { toast } from "@/components/ui/sonner";
import { ChevronDown } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeItem: AutomationTypeItem;
  automation: AutomationItem;
  /** Re-run Instagram OAuth for this automation type (new account or token refresh). */
  onRefreshInstagramAccess: () => void;
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function directionLabel(dir: string | null, tx: (en: string, es: string) => string): string {
  if (!dir) return tx("Message", "Mensaje");
  const d = dir.toLowerCase();
  if (d === "error") return tx("Error", "Error");
  if (d === "system" || d === "activity") return tx("System", "Sistema");
  if (d === "outbound" || d === "sent") return tx("Sent", "Enviado");
  if (d === "inbound" || d === "received") return tx("Received", "Recibido");
  return dir;
}

type DmMode = "ai" | "static";
const AI_MAX_CHARS = 8000;
const STATIC_MAX_CHARS = 2000;

function isInstagramDmType(typeItem: AutomationTypeItem): boolean {
  if (typeItem.platform !== "instagram") return false;
  const code = typeItem.code.toLowerCase();
  const name = typeItem.name.toLowerCase();
  if (code === "instagram_comment" || code === "instagram_comments") return false;
  return code === "instagram_dm" || /\bdm\b/.test(code) || /\bdm\b/.test(name);
}

export function AutomationManageDialog({
  open,
  onOpenChange,
  typeItem,
  automation,
  onRefreshInstagramAccess,
}: Props) {
  const { tx } = useLanguage();
  const queryClient = useQueryClient();
  const [dmMode, setDmMode] = useState<DmMode>("ai");
  const [dmInstructions, setDmInstructions] = useState("");
  const [dmStaticMessage, setDmStaticMessage] = useState("");
  const [savingDm, setSavingDm] = useState(false);

  const { data: detail = automation } = useQuery({
    queryKey: ["automation", automation.id],
    queryFn: () => getAutomation(automation.id),
    enabled: open && !!automation.id,
    initialData: automation,
  });

  const { data: messagesRes, isLoading: loadingMessages } = useQuery({
    queryKey: ["automation-messages", automation.id],
    queryFn: () => listAutomationMessages(automation.id),
    enabled: open && !!automation.id,
  });

  const mergedMessages = useMemo(() => {
    const d = detail;
    const api = [...(messagesRes?.messages ?? [])];
    const synth: AutomationMessageItem[] = [];
    if (api.length === 0) {
      if (d.last_error?.trim()) {
        synth.push({
          id: `${d.id}__error`,
          body: d.last_error,
          direction: "error",
          created_at: d.updated_at ?? d.created_at,
        });
      }
      if (d.last_activity?.trim()) {
        const parsed = Date.parse(d.last_activity);
        const created = Number.isFinite(parsed) ? d.last_activity : d.updated_at ?? d.created_at;
        const line = Number.isFinite(parsed)
          ? `${tx("Last activity", "Ultima actividad")}: ${new Date(parsed).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}`
          : `${tx("Last activity", "Ultima actividad")}: ${d.last_activity}`;
        synth.push({
          id: `${d.id}__activity`,
          body: line,
          direction: "system",
          created_at: created,
        });
      }
    }
    const all = [...api, ...synth];
    all.sort((a, b) => {
      const x = Date.parse(a.created_at);
      const y = Date.parse(b.created_at);
      return (Number.isFinite(y) ? y : 0) - (Number.isFinite(x) ? x : 0);
    });
    return all;
  }, [detail, messagesRes, tx]);

  const isActive = detail.status === "active";
  const isIg = typeItem.platform === "instagram";
  const isIgDm = isInstagramDmType(typeItem);

  useEffect(() => {
    if (!open || !isIgDm) return;
    const cfg = (detail.config ?? {}) as Record<string, unknown>;
    const rawMode = typeof cfg.dm_response_mode === "string" ? cfg.dm_response_mode : "";
    setDmMode(rawMode === "static" ? "static" : "ai");
    setDmInstructions(typeof cfg.dm_system_instructions === "string" ? cfg.dm_system_instructions : "");
    setDmStaticMessage(typeof cfg.dm_static_message === "string" ? cfg.dm_static_message : "");
  }, [open, isIgDm, detail.id, detail.updated_at, detail.config]);

  const toggleStatus = async () => {
    const next = detail.status === "active" ? "paused" : "active";
    try {
      await updateAutomation(detail.id, { status: next });
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
      await queryClient.invalidateQueries({ queryKey: ["automation", detail.id] });
    } catch {
      toast.error(tx("Update failed", "Error al actualizar"));
    }
  };

  const saveDmSettings = async () => {
    if (!isIgDm) return;
    if (dmMode !== "ai" && dmMode !== "static") {
      toast.error(tx("Invalid mode selected.", "Modo seleccionado no valido."));
      return;
    }
    const prompt = dmInstructions.trim();
    const staticMessage = dmStaticMessage.trim();
    if (prompt.length > AI_MAX_CHARS) {
      toast.error(
        tx(
          `Custom instructions must be ${AI_MAX_CHARS} characters or less.`,
          `Las instrucciones deben tener ${AI_MAX_CHARS} caracteres o menos.`,
        ),
      );
      return;
    }
    if (dmMode === "static") {
      if (!staticMessage) {
        toast.error(tx("Fixed reply is required in static mode.", "La respuesta fija es obligatoria en modo estatico."));
        return;
      }
      if (staticMessage.length > STATIC_MAX_CHARS) {
        toast.error(
          tx(
            `Fixed reply must be ${STATIC_MAX_CHARS} characters or less.`,
            `La respuesta fija debe tener ${STATIC_MAX_CHARS} caracteres o menos.`,
          ),
        );
        return;
      }
    }
    setSavingDm(true);
    try {
      const fresh = await getAutomation(detail.id);
      const prev = (fresh.config ?? {}) as Record<string, unknown>;
      const next: Record<string, unknown> = { ...prev, dm_response_mode: dmMode };
      if (dmMode === "ai") {
        if (prompt) next.dm_system_instructions = prompt;
        else delete next.dm_system_instructions;
        delete next.dm_static_message;
      } else {
        next.dm_static_message = staticMessage;
      }
      await updateAutomationConfig(detail.id, { config: next });
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
      await queryClient.invalidateQueries({ queryKey: ["automation", detail.id] });
      toast.success(tx("DM settings saved.", "Configuracion de DM guardada."));
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        toast.error(typeof e.detail === "string" ? e.detail : e.message);
      } else {
        toast.error(tx("Could not save DM settings.", "No se pudo guardar la configuracion de DM."));
      }
    } finally {
      setSavingDm(false);
    }
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
      <DialogContent className="flex flex-col max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-none gap-0 p-0 sm:max-w-[min(960px,calc(100vw-1.5rem))] overflow-hidden">
        <div className="shrink-0 border-b px-6 pt-6 pb-4 pr-14">
          <DialogHeader>
            <DialogTitle className="text-left">
              {tx("Manage automation", "Gestionar automatizacion")}: {typeItem.name}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
          {/* Column 1 — details + controls */}
          <div className="flex min-h-[280px] flex-col min-h-0 md:min-h-[min(520px,calc(90vh-10rem))]">
            <div className="shrink-0 px-4 pt-3 pb-2">
              <p className="text-sm font-semibold text-foreground">
                {tx("Automation details", "Detalles de la automatizacion")}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{tx("Name", "Nombre")}</p>
                <p className="text-sm font-medium text-foreground">{typeItem.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{tx("Description", "Descripcion")}</p>
                <p className="text-sm text-foreground leading-relaxed">{typeItem.description ?? typeItem.code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">{tx("Run state", "Estado de ejecucion")}</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={isActive ? tx("Active", "Activo") : tx("Paused", "Pausado")}
                    onClick={() => void toggleStatus()}
                    className={`relative h-6 w-10 shrink-0 overflow-hidden rounded-full transition-colors ${
                      isActive ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        isActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-foreground">
                    {isActive ? tx("Active", "Activo") : tx("Paused", "Pausado")}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{tx("Connected since", "Conectada desde")}</p>
                <p className="text-sm text-foreground">{formatWhen(detail.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{tx("Last updated", "Ultima actualizacion")}</p>
                <p className="text-sm text-foreground">{formatWhen(detail.updated_at)}</p>
              </div>
              {isIg ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={onRefreshInstagramAccess}
                >
                  {tx("Refresh Instagram connection", "Actualizar conexión de Instagram")}
                </Button>
              ) : null}
            </div>
          </div>

          {/* Column 2 — DM settings + messages */}
          <div className="flex min-h-[320px] flex-col min-h-0 md:min-h-[min(520px,calc(90vh-10rem))]">
            {isIgDm ? (
              <>
                <div className="min-h-0 flex-1 border-b border-border">
                  <div className="h-full overflow-y-auto px-4 pb-4 pt-3">
                    <div className="space-y-2 rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-foreground">
                        {tx("Instagram DM settings", "Configuracion de DM de Instagram")}
                      </p>
                      <ToggleGroup
                        type="single"
                        value={dmMode}
                        onValueChange={(v) => {
                          if (v === "ai" || v === "static") setDmMode(v);
                        }}
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        aria-label={tx("DM response mode", "Modo de respuesta de DM")}
                      >
                        <ToggleGroupItem value="ai">{tx("AI response", "Respuesta IA")}</ToggleGroupItem>
                        <ToggleGroupItem value="static">{tx("Static reply", "Respuesta fija")}</ToggleGroupItem>
                      </ToggleGroup>
                      {dmMode === "ai" ? (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            {tx("Custom instructions (optional)", "Instrucciones personalizadas (opcional)")}
                          </p>
                          <Textarea
                            value={dmInstructions}
                            onChange={(e) => setDmInstructions(e.target.value)}
                            maxLength={AI_MAX_CHARS}
                            rows={5}
                            placeholder={tx(
                              "Tell the bot how to respond (tone, goals, routing to website, etc.).",
                              "Indica como debe responder el bot (tono, objetivos, envio al sitio web, etc.).",
                            )}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            {dmInstructions.length}/{AI_MAX_CHARS}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            {tx("Fixed reply (required)", "Respuesta fija (obligatoria)")}
                          </p>
                          <Textarea
                            value={dmStaticMessage}
                            onChange={(e) => setDmStaticMessage(e.target.value)}
                            maxLength={STATIC_MAX_CHARS}
                            rows={4}
                            placeholder={tx("Write the exact message to send.", "Escribe el mensaje exacto a enviar.")}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            {dmStaticMessage.length}/{STATIC_MAX_CHARS}
                          </p>
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {tx(
                          "Business description and website are managed in profile settings.",
                          "La descripcion del negocio y el sitio web se gestionan en perfil.",
                        )}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-full"
                        disabled={savingDm}
                        onClick={() => void saveDmSettings()}
                      >
                        {savingDm ? tx("Saving…", "Guardando…") : tx("Save DM settings", "Guardar configuracion de DM")}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="min-h-0 flex-1">
                  <div className="shrink-0 px-4 pt-3 pb-2">
                    <p className="text-base font-semibold text-foreground">{tx("Messages", "Mensajes")}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tx("Sent and received activity from this automation.", "Actividad enviada y recibida.")}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {filterPill(tx("All activity", "Toda la actividad"))}
                      {filterPill(tx("Outbound", "Salientes"))}
                      {filterPill(tx("Time range", "Periodo"))}
                    </div>
                  </div>
                  <div className="min-h-0 h-[calc(100%-4.5rem)] overflow-y-auto px-4 space-y-3 pb-4">
                    {loadingMessages ? (
                      <p className="text-sm text-muted-foreground py-6">{tx("Loading messages…", "Cargando mensajes…")}</p>
                    ) : mergedMessages.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">
                        {tx("No messages yet. When the API exposes message history, it will show here.", "Aun no hay mensajes. Cuando el servidor exponga el historial, aparecera aqui.")}
                      </p>
                    ) : (
                      mergedMessages.map((m) => {
                        const isErr = m.direction?.toLowerCase() === "error";
                        return (
                          <div
                            key={m.id}
                            className={`rounded-xl border p-3 shadow-sm ${
                              isErr ? "border-destructive/40 bg-destructive/5" : "border-border bg-background"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-wide ${
                                  isErr ? "text-destructive" : "text-muted-foreground"
                                }`}
                              >
                                {directionLabel(m.direction, tx)}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0">{formatWhen(m.created_at)}</span>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{m.body || "—"}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="shrink-0 px-4 pt-3 pb-2">
                  <p className="text-base font-semibold text-foreground">{tx("Messages", "Mensajes")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tx("Sent and received activity from this automation.", "Actividad enviada y recibida.")}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {filterPill(tx("All activity", "Toda la actividad"))}
                    {filterPill(tx("Outbound", "Salientes"))}
                    {filterPill(tx("Time range", "Periodo"))}
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 space-y-3 pb-4">
                  {loadingMessages ? (
                    <p className="text-sm text-muted-foreground py-6">{tx("Loading messages…", "Cargando mensajes…")}</p>
                  ) : mergedMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      {tx("No messages yet. When the API exposes message history, it will show here.", "Aun no hay mensajes. Cuando el servidor exponga el historial, aparecera aqui.")}
                    </p>
                  ) : (
                    mergedMessages.map((m) => {
                      const isErr = m.direction?.toLowerCase() === "error";
                      return (
                        <div
                          key={m.id}
                          className={`rounded-xl border p-3 shadow-sm ${
                            isErr ? "border-destructive/40 bg-destructive/5" : "border-border bg-background"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wide ${
                                isErr ? "text-destructive" : "text-muted-foreground"
                              }`}
                            >
                              {directionLabel(m.direction, tx)}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">{formatWhen(m.created_at)}</span>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{m.body || "—"}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tx("Close", "Cerrar")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
