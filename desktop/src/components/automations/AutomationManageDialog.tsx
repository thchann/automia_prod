import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, getAutomation, updateAutomation, updateAutomationConfig } from "@automia/api";
import type { AutomationItem, AutomationTypeItem } from "@automia/api";
import { useLanguage } from "@/i18n/LanguageProvider";
import { toast } from "@/components/ui/sonner";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeItem: AutomationTypeItem;
  automation: AutomationItem;
  /** Re-run Instagram OAuth to manage the shared Instagram connection. */
  onRefreshInstagramAccess: () => void;
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

type DmMode = "ai" | "static";
const AI_MAX_CHARS = 8000;
const STATIC_MAX_CHARS = 2000;
const COMMENTS_TRIGGER_MAX_CHARS = 128;
const COMMENTS_RESPONSE_MAX_CHARS = 2000;

const COMMENT_BOT_CODES = new Set(["comments_bot", "instagram_comment", "instagram_comments"]);

function isInstagramCommentsType(typeItem: AutomationTypeItem): boolean {
  if (typeItem.platform !== "instagram") return false;
  return COMMENT_BOT_CODES.has(typeItem.code.toLowerCase());
}

function isInstagramDmType(typeItem: AutomationTypeItem): boolean {
  if (typeItem.platform !== "instagram") return false;
  const code = typeItem.code.toLowerCase();
  const name = typeItem.name.toLowerCase();
  if (COMMENT_BOT_CODES.has(code)) return false;
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
  const [commentsTrigger, setCommentsTrigger] = useState("");
  const [commentsResponse, setCommentsResponse] = useState("");
  const [savingComments, setSavingComments] = useState(false);
  const [exitPromptOpen, setExitPromptOpen] = useState(false);

  const { data: detail = automation } = useQuery({
    queryKey: ["automation", automation.id],
    queryFn: () => getAutomation(automation.id),
    enabled: open && !!automation.id,
    initialData: automation,
  });

  const isActive = detail.status === "active";
  const isIg = typeItem.platform === "instagram";
  const isIgDm = isInstagramDmType(typeItem);
  const isIgComments = isInstagramCommentsType(typeItem);
  const savingSettings = savingDm || savingComments;

  useEffect(() => {
    if (!open || !isIgDm) return;
    const cfg = (detail.config ?? {}) as Record<string, unknown>;
    const rawMode = typeof cfg.dm_response_mode === "string" ? cfg.dm_response_mode : "";
    setDmMode(rawMode === "static" ? "static" : "ai");
    setDmInstructions(typeof cfg.dm_system_instructions === "string" ? cfg.dm_system_instructions : "");
    setDmStaticMessage(typeof cfg.dm_static_message === "string" ? cfg.dm_static_message : "");
  }, [open, isIgDm, detail.id, detail.updated_at, detail.config]);

  useEffect(() => {
    if (!open || !isIgComments) return;
    const cfg = (detail.config ?? {}) as Record<string, unknown>;
    setCommentsTrigger(typeof cfg.trigger === "string" ? cfg.trigger : "");
    setCommentsResponse(typeof cfg.response === "string" ? cfg.response : "");
  }, [open, isIgComments, detail.id, detail.updated_at, detail.config]);

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

  const saveDmSettings = async (): Promise<boolean> => {
    if (!isIgDm) return true;
    if (dmMode !== "ai" && dmMode !== "static") {
      toast.error(tx("Invalid mode selected.", "Modo seleccionado no valido."));
      return false;
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
      return false;
    }
    if (dmMode === "static") {
      if (!staticMessage) {
        toast.error(tx("Fixed reply is required in static mode.", "La respuesta fija es obligatoria en modo estatico."));
        return false;
      }
      if (staticMessage.length > STATIC_MAX_CHARS) {
        toast.error(
          tx(
            `Fixed reply must be ${STATIC_MAX_CHARS} characters or less.`,
            `La respuesta fija debe tener ${STATIC_MAX_CHARS} caracteres o menos.`,
          ),
        );
        return false;
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
      toast.success(tx("Saved", "Guardado"));
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        toast.error(typeof e.detail === "string" ? e.detail : e.message);
      } else {
        toast.error(tx("Could not save DM settings.", "No se pudo guardar la configuracion de DM."));
      }
      return false;
    } finally {
      setSavingDm(false);
    }
  };

  const saveCommentsSettings = async (): Promise<boolean> => {
    if (!isIgComments) return true;
    const trigger = commentsTrigger.trim();
    const response = commentsResponse.trim();
    if (!trigger) {
      toast.error(tx("Match text is required.", "El texto de coincidencia es obligatorio."));
      return false;
    }
    if (trigger.length > COMMENTS_TRIGGER_MAX_CHARS) {
      toast.error(
        tx(
          `Match text must be ${COMMENTS_TRIGGER_MAX_CHARS} characters or less.`,
          `El texto de coincidencia debe tener ${COMMENTS_TRIGGER_MAX_CHARS} caracteres o menos.`,
        ),
      );
      return false;
    }
    if (!response) {
      toast.error(tx("Reply message is required.", "El mensaje de respuesta es obligatorio."));
      return false;
    }
    if (response.length > COMMENTS_RESPONSE_MAX_CHARS) {
      toast.error(
        tx(
          `Response must be ${COMMENTS_RESPONSE_MAX_CHARS} characters or less.`,
          `La respuesta debe tener ${COMMENTS_RESPONSE_MAX_CHARS} caracteres o menos.`,
        ),
      );
      return false;
    }
    setSavingComments(true);
    try {
      const fresh = await getAutomation(detail.id);
      const prev = (fresh.config ?? {}) as Record<string, unknown>;
      const next: Record<string, unknown> = { ...prev, trigger, response };
      await updateAutomationConfig(detail.id, { config: next });
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
      await queryClient.invalidateQueries({ queryKey: ["automation", detail.id] });
      toast.success(tx("Saved", "Guardado"));
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        toast.error(typeof e.detail === "string" ? e.detail : e.message);
      } else {
        toast.error(
          tx("Could not save comment bot settings.", "No se pudo guardar la configuracion del bot de comentarios."),
        );
      }
      return false;
    } finally {
      setSavingComments(false);
    }
  };

  const initialDmMode = (() => {
    const cfg = (detail.config ?? {}) as Record<string, unknown>;
    return typeof cfg.dm_response_mode === "string" && cfg.dm_response_mode === "static"
      ? "static"
      : "ai";
  })();
  const initialDmInstructions = (() => {
    const cfg = (detail.config ?? {}) as Record<string, unknown>;
    return typeof cfg.dm_system_instructions === "string" ? cfg.dm_system_instructions : "";
  })();
  const initialDmStaticMessage = (() => {
    const cfg = (detail.config ?? {}) as Record<string, unknown>;
    return typeof cfg.dm_static_message === "string" ? cfg.dm_static_message : "";
  })();
  const initialCommentsTrigger = (() => {
    const cfg = (detail.config ?? {}) as Record<string, unknown>;
    return typeof cfg.trigger === "string" ? cfg.trigger : "";
  })();
  const initialCommentsResponse = (() => {
    const cfg = (detail.config ?? {}) as Record<string, unknown>;
    return typeof cfg.response === "string" ? cfg.response : "";
  })();
  const hasUnsavedChanges =
    (isIgDm &&
      (dmMode !== initialDmMode ||
        dmInstructions !== initialDmInstructions ||
        dmStaticMessage !== initialDmStaticMessage)) ||
    (isIgComments &&
      (commentsTrigger !== initialCommentsTrigger || commentsResponse !== initialCommentsResponse));

  const requestClose = () => {
    if (!hasUnsavedChanges || savingSettings) {
      onOpenChange(false);
      return;
    }
    setExitPromptOpen(true);
  };

  const saveAndExitActivePanel = async (): Promise<boolean> => {
    if (isIgComments) return saveCommentsSettings();
    if (isIgDm) return saveDmSettings();
    return true;
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
        <DialogContent className="flex flex-col max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-none gap-0 p-0 sm:max-w-[min(960px,calc(100vw-1.5rem))] overflow-hidden">
        <div className="shrink-0 border-b px-6 pt-6 pb-4 pr-14">
          <DialogHeader>
            <DialogTitle className="text-left">
              {tx("Manage automation", "Gestionar automatización")}: {typeItem.name}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {tx(
                "Configure automation settings and connection details.",
                "Configura ajustes de automatización y detalles de conexión.",
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 divide-y md:grid-cols-[0.9fr_1.35fr] md:divide-x md:divide-y-0">
          {/* Column 1 — details + controls */}
          <div className="flex min-h-0 flex-col md:min-h-[min(520px,calc(90vh-10rem))]">
            <div className="shrink-0 px-4 pt-3 pb-2">
              <p className="text-sm font-semibold text-foreground">
                {tx("Automation details", "Detalles de la automatización")}
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
                <p className="text-sm text-muted-foreground mb-1">{tx("Platform display name", "Nombre visible de plataforma")}</p>
                <p className="text-sm text-foreground">
                  {detail.platform_display_name?.trim() || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{tx("Platform username", "Usuario de plataforma")}</p>
                <p className="text-sm text-foreground">
                  {detail.platform_username?.trim()
                    ? detail.platform_username.startsWith("@")
                      ? detail.platform_username
                      : `@${detail.platform_username}`
                    : "—"}
                </p>
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
                  {tx("Manage Instagram connection", "Gestionar conexion de Instagram")}
                </Button>
              ) : null}
            </div>
          </div>

          {/* Column 2 — settings */}
          <div className="flex min-h-0 flex-col md:min-h-[min(520px,calc(90vh-10rem))]">
            {isIgDm ? (
              <div className="flex h-full min-h-0 flex-col px-4 pb-4 pt-3">
                <div className="flex min-h-0 flex-1 flex-col gap-2">
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
                    <div className="flex min-h-0 flex-1 flex-col gap-1">
                      <p className="text-xs text-muted-foreground">
                        {tx("Custom instructions (optional)", "Instrucciones personalizadas (opcional)")}
                      </p>
                      <Textarea
                        value={dmInstructions}
                        onChange={(e) => setDmInstructions(e.target.value)}
                        maxLength={AI_MAX_CHARS}
                        className="min-h-[16rem] flex-1 resize-none"
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
                    <div className="flex min-h-0 flex-1 flex-col gap-1">
                      <p className="text-xs text-muted-foreground">
                        {tx("Fixed reply (required)", "Respuesta fija (obligatoria)")}
                      </p>
                      <Textarea
                        value={dmStaticMessage}
                        onChange={(e) => setDmStaticMessage(e.target.value)}
                        maxLength={STATIC_MAX_CHARS}
                        className="min-h-[16rem] flex-1 resize-none"
                        placeholder={tx("Write the exact message to send.", "Escribe el mensaje exacto a enviar.")}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {dmStaticMessage.length}/{STATIC_MAX_CHARS}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : isIgComments ? (
              <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-3">
                <p className="text-sm font-medium text-foreground">
                  {tx("Comment bot settings", "Configuracion del bot de comentarios")}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {tx(
                    "Replies are driven by Instagram comments on your posts. When a comment matches the text below, the bot sends your reply.",
                    "Las respuestas dependen de los comentarios en tus publicaciones. Si un comentario coincide con el texto de abajo, el bot envia tu respuesta.",
                  )}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="comments-trigger">
                    {tx("Match in comment", "Coincidencia en el comentario")}
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {tx(
                      "Keyword or phrase the comment should contain (not a manual button).",
                      "Palabra o frase que debe contener el comentario (no es un boton manual).",
                    )}
                  </p>
                  <Input
                    id="comments-trigger"
                    value={commentsTrigger}
                    onChange={(e) => setCommentsTrigger(e.target.value)}
                    maxLength={COMMENTS_TRIGGER_MAX_CHARS}
                    className="h-10 rounded-lg"
                    placeholder={tx("e.g. PRICE", "ej. PRICE")}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {commentsTrigger.length}/{COMMENTS_TRIGGER_MAX_CHARS}
                  </p>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-1">
                  <Label htmlFor="comments-response">
                    {tx("Reply to send", "Respuesta a enviar")}
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {tx(
                      "This is the message the bot sends when a comment matches.",
                      "Este es el mensaje que envia el bot cuando un comentario coincide.",
                    )}
                  </p>
                  <Textarea
                    id="comments-response"
                    value={commentsResponse}
                    onChange={(e) => setCommentsResponse(e.target.value)}
                    maxLength={COMMENTS_RESPONSE_MAX_CHARS}
                    className="min-h-[12rem] flex-1 resize-none rounded-lg"
                    placeholder={tx(
                      "Write the reply the bot should post.",
                      "Escribe la respuesta que debe publicar el bot.",
                    )}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {commentsResponse.length}/{COMMENTS_RESPONSE_MAX_CHARS}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto px-4 pb-4 pt-3">
                <p className="text-sm text-muted-foreground">
                  {tx(
                    "No additional settings are available for this automation type yet.",
                    "Aún no hay configuraciones adicionales para este tipo de automatización.",
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={requestClose} disabled={savingSettings}>
            {tx("Close", "Cerrar")}
          </Button>
          {isIgDm ? (
            <Button
              type="button"
              disabled={savingDm}
              onClick={() => void saveDmSettings()}
            >
              {savingDm ? tx("Saving…", "Guardando…") : tx("Save DM settings", "Guardar configuracion de DM")}
            </Button>
          ) : null}
          {isIgComments ? (
            <Button
              type="button"
              disabled={savingComments}
              onClick={() => void saveCommentsSettings()}
            >
              {savingComments
                ? tx("Saving…", "Guardando…")
                : tx("Save comment bot settings", "Guardar configuracion del bot de comentarios")}
            </Button>
          ) : null}
        </DialogFooter>
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog
        open={exitPromptOpen}
        onOpenChange={setExitPromptOpen}
        onSaveAndExit={async () => {
          const ok = await saveAndExitActivePanel();
          if (!ok) return;
          setExitPromptOpen(false);
          onOpenChange(false);
        }}
        onDiscardAndExit={() => {
          setExitPromptOpen(false);
          onOpenChange(false);
        }}
        saving={savingSettings}
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
