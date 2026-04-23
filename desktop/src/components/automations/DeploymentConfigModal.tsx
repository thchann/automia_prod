import { useEffect, useMemo, useState } from "react";

import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useLanguage } from "@/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

type BotKind = "dm" | "comment";

type DeploymentConfigModalProps = {
  open: boolean;
  deploymentName: string;
  botKind: BotKind;
  initialConfig: Record<string, unknown> | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (nextConfig: Record<string, unknown>) => Promise<void>;
};

export function DeploymentConfigModal({
  open,
  deploymentName,
  botKind,
  initialConfig,
  saving = false,
  onClose,
  onSave,
}: DeploymentConfigModalProps) {
  const { tx } = useLanguage();
  const [dmMode, setDmMode] = useState<"dynamic" | "static">("dynamic");
  const [dmContent, setDmContent] = useState("");
  const [commentPrice, setCommentPrice] = useState("");
  const [commentDescription, setCommentDescription] = useState("");
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);

  const initialStateKey = useMemo(() => {
    const cfg = (initialConfig ?? {}) as Record<string, unknown>;
    if (botKind === "dm") {
      const mode = typeof cfg.dm_response_mode === "string" && cfg.dm_response_mode === "static" ? "static" : "dynamic";
      const content = mode === "static"
        ? (typeof cfg.dm_static_message === "string" ? cfg.dm_static_message : "")
        : (typeof cfg.dm_system_instructions === "string" ? cfg.dm_system_instructions : "");
      return JSON.stringify({ botKind, mode, content });
    }
    const price = typeof cfg.price === "string" ? cfg.price : (typeof cfg.trigger === "string" ? cfg.trigger : "");
    const description = typeof cfg.description === "string" ? cfg.description : (typeof cfg.response === "string" ? cfg.response : "");
    return JSON.stringify({ botKind, price, description });
  }, [initialConfig, botKind]);

  const currentStateKey = useMemo(() => {
    if (botKind === "dm") {
      return JSON.stringify({ botKind, mode: dmMode, content: dmContent });
    }
    return JSON.stringify({ botKind, price: commentPrice, description: commentDescription });
  }, [botKind, dmMode, dmContent, commentPrice, commentDescription]);

  const dirty = currentStateKey !== initialStateKey;

  useEffect(() => {
    if (open) {
      const cfg = (initialConfig ?? {}) as Record<string, unknown>;
      if (botKind === "dm") {
        const nextMode = typeof cfg.dm_response_mode === "string" && cfg.dm_response_mode === "static" ? "static" : "dynamic";
        setDmMode(nextMode);
        setDmContent(
          nextMode === "static"
            ? (typeof cfg.dm_static_message === "string" ? cfg.dm_static_message : "")
            : (typeof cfg.dm_system_instructions === "string" ? cfg.dm_system_instructions : ""),
        );
      } else {
        setCommentPrice(typeof cfg.price === "string" ? cfg.price : (typeof cfg.trigger === "string" ? cfg.trigger : ""));
        setCommentDescription(
          typeof cfg.description === "string" ? cfg.description : (typeof cfg.response === "string" ? cfg.response : ""),
        );
      }
      setConfirmExitOpen(false);
    }
  }, [open, initialConfig, botKind]);

  const tryClose = () => {
    if (!dirty || saving) {
      onClose();
      return;
    }
    setConfirmExitOpen(true);
  };

  const saveChanges = async (): Promise<boolean> => {
    const prev = (initialConfig ?? {}) as Record<string, unknown>;
    const next: Record<string, unknown> = { ...prev };

    if (botKind === "dm") {
      const content = dmContent.trim();
      next.dm_response_mode = dmMode === "dynamic" ? "ai" : "static";
      if (dmMode === "dynamic") {
        if (content) next.dm_system_instructions = content;
        else delete next.dm_system_instructions;
        delete next.dm_static_message;
      } else {
        if (!content) {
          toast.error(tx("Content is required for static mode.", "El contenido es obligatorio para el modo estatico."));
          return false;
        }
        next.dm_static_message = content;
        delete next.dm_system_instructions;
      }
    } else {
      const price = commentPrice.trim();
      const description = commentDescription.trim();
      if (!price) {
        toast.error(tx("Price is required.", "El precio es obligatorio."));
        return false;
      }
      if (!description) {
        toast.error(tx("Description is required.", "La descripcion es obligatoria."));
        return false;
      }
      // Keep compatibility with existing comment-bot keys and also persist
      // explicit form fields used by this deployment editor UI.
      next.trigger = price;
      next.response = description;
      next.price = price;
      next.description = description;
    }

    await onSave(next);
    return true;
  };

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          onClick={tryClose}
          aria-label={tx("Close deployment config dialog", "Cerrar dialogo de configuracion de implementacion")}
        />
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="deployment-config-title"
          className={cn(
            "relative z-10 w-full max-w-[900px] rounded-[1.5rem] border border-border bg-panel px-6 py-6 text-panel-foreground shadow-builder-panel sm:px-10 sm:py-9",
          )}
        >
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 id="deployment-config-title" className="text-[1.9rem] font-semibold tracking-tight text-panel-foreground">
                {tx("Deployment config", "Configuracion de implementacion")}
              </h2>
              <p className="mt-3 max-w-[42rem] text-[1rem] leading-7 text-muted-foreground">
                {botKind === "dm"
                  ? tx(`Edit DM bot settings for ${deploymentName}.`, `Edita la configuracion del bot de MD para ${deploymentName}.`)
                  : tx(
                      `Edit Comment bot settings for ${deploymentName}.`,
                      `Edita la configuracion del bot de Comentarios para ${deploymentName}.`,
                    )}
              </p>
            </div>
            <button
              type="button"
              onClick={tryClose}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-panel-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={tx("Close deployment config dialog", "Cerrar dialogo de configuracion de implementacion")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {botKind === "dm" ? (
            <div className="mt-8 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="dm-response-mode" className="text-sm font-medium text-panel-foreground">
                  {tx("DM response mode", "Modo de respuesta por MD")}
                </Label>
                <select
                  id="dm-response-mode"
                  value={dmMode}
                  onChange={(event) => setDmMode(event.target.value === "static" ? "static" : "dynamic")}
                  className="h-12 w-full rounded-xl border border-border bg-card/40 px-4 text-panel-foreground"
                >
                  <option value="dynamic">{tx("Dynamic response", "Respuesta dinamica")}</option>
                  <option value="static">{tx("Static response", "Respuesta estatica")}</option>
                </select>
              </div>
              <div className="space-y-3">
                <Label htmlFor="dm-content" className="text-sm font-medium text-panel-foreground">
                  {tx("Content", "Contenido")}
                </Label>
                <Textarea
                  id="dm-content"
                  value={dmContent}
                  onChange={(event) => setDmContent(event.target.value)}
                  placeholder={
                    dmMode === "dynamic"
                      ? tx(
                          "Describe how the bot should respond dynamically.",
                          "Describe como debe responder el bot de forma dinamica.",
                        )
                      : tx("Write the exact DM message to send.", "Escribe el mensaje exacto de MD para enviar.")
                  }
                  className="min-h-[260px] rounded-xl border-border bg-card/40 px-4 py-3 leading-7 text-panel-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
          ) : (
            <div className="mt-8 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="deployment-price" className="text-sm font-medium text-panel-foreground">
                  {tx("Price", "Precio")}
                </Label>
                <Input
                  id="deployment-price"
                  type="text"
                  value={commentPrice}
                  onChange={(event) => setCommentPrice(event.target.value)}
                  placeholder="$29 / month"
                  className="h-12 rounded-xl border-border bg-card/40 px-4 text-panel-foreground placeholder:text-muted-foreground"
                  maxLength={40}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="deployment-description" className="text-sm font-medium text-panel-foreground">
                  {tx("Description", "Descripcion")}
                </Label>
                <Textarea
                  id="deployment-description"
                  value={commentDescription}
                  onChange={(event) => setCommentDescription(event.target.value)}
                  placeholder={tx(
                    "Describe what this deployment is used for.",
                    "Describe para que se usa esta implementacion.",
                  )}
                  className="min-h-[260px] rounded-xl border-border bg-card/40 px-4 py-3 leading-7 text-panel-foreground placeholder:text-muted-foreground"
                  maxLength={220}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  {commentDescription.length}/220 {tx("characters", "caracteres")}
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={tryClose} disabled={saving}>
              {tx("Close", "Cerrar")}
            </Button>
            <Button type="button" onClick={() => void saveChanges()} disabled={saving}>
              {tx("Save changes", "Guardar cambios")}
            </Button>
          </div>
        </section>
      </div>

      <UnsavedChangesDialog
        open={confirmExitOpen}
        onOpenChange={setConfirmExitOpen}
        onSaveAndExit={async () => {
          const saved = await saveChanges();
          if (!saved) return;
          setConfirmExitOpen(false);
          onClose();
        }}
        onDiscardAndExit={() => {
          setConfirmExitOpen(false);
          onClose();
        }}
        saving={saving}
        title={tx("Discard unsaved changes?", "¿Descartar cambios no guardados?")}
        description={tx(
          "You made changes to this deployment config. Do you want to discard them or save first?",
          "Hiciste cambios en esta configuracion. ¿Quieres descartarlos o guardar primero?",
        )}
        saveLabel={tx("Save and exit", "Guardar y salir")}
        discardLabel={tx("Discard changes", "Descartar cambios")}
        cancelLabel={tx("Keep editing", "Seguir editando")}
      />
    </>
  );
}
