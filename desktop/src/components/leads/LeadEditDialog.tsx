import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lead, LeadStatus, Car } from "@/types/leads";
import { useLanguage } from "@/i18n/LanguageProvider";
import { LeadDetailPanel } from "./LeadDetailPanel";

interface LeadEditDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (lead: Lead) => void | Promise<void>;
  onNotesDocumentAutosave?: (leadId: string, document: Record<string, unknown>) => void | Promise<void>;
  statuses: LeadStatus[];
  cars: Car[];
}

/** Centered dialog wrapper; prefer `LeadDetailPanel` inside `EntityDetailPanel` for the slide-out UX. */
export function LeadEditDialog({
  lead,
  open,
  onOpenChange,
  onSave,
  statuses,
  cars,
}: LeadEditDialogProps) {
  const { tx } = useLanguage();

  if (!lead) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
        }
      }}
    >
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-10vh)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(980px,calc(100vw-10vh))]">
        <DialogHeader className="sr-only">
          <DialogTitle>{tx("Edit lead details", "Editar detalles del lead")}</DialogTitle>
          <DialogDescription>
            {tx(
              "Edit lead fields, linked car, attachments, and rich notes.",
              "Editar campos del lead, auto vinculado, adjuntos y notas.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-[min(720px,calc(90vh-2rem))]">
          <LeadDetailPanel
            lead={lead}
            statuses={statuses}
            cars={cars}
            onSave={onSave}
            onDismiss={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
