import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageProvider";

type ManageTableFiltersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onSave: () => void;
  onReset: () => void;
  children: ReactNode;
};

export function ManageTableFiltersDialog({
  open,
  onOpenChange,
  title,
  description,
  onSave,
  onReset,
  children,
}: ManageTableFiltersDialogProps) {
  const { tx } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,720px)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="space-y-1.5 px-6 pt-6 pb-4 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">{children}</div>
        <DialogFooter className="flex-col gap-2 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground sm:mr-auto"
            onClick={onReset}
          >
            {tx("Reset to default", "Restablecer predeterminado")}
          </Button>
          <div className="flex w-full justify-end gap-2 sm:w-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tx("Cancel", "Cancelar")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                onSave();
                onOpenChange(false);
              }}
            >
              {tx("Save", "Guardar")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
