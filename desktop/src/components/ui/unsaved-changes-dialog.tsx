import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type UnsavedChangesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndExit: () => void | Promise<void>;
  onDiscardAndExit: () => void;
  saving?: boolean;
  title: string;
  description: string;
  saveLabel: string;
  discardLabel: string;
  cancelLabel: string;
};

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onSaveAndExit,
  onDiscardAndExit,
  saving = false,
  title,
  description,
  saveLabel,
  discardLabel,
  cancelLabel,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>{cancelLabel}</AlertDialogCancel>
          <Button type="button" variant="outline" onClick={onDiscardAndExit} disabled={saving}>
            {discardLabel}
          </Button>
          <AlertDialogAction onClick={() => void onSaveAndExit()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {saveLabel}…
              </>
            ) : (
              saveLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
