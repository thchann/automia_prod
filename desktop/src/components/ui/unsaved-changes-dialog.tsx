import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

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
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <Button type="button" variant="outline" onClick={onDiscardAndExit}>
            {discardLabel}
          </Button>
          <AlertDialogAction onClick={() => void onSaveAndExit()} disabled={saving}>
            {saving ? `${saveLabel}…` : saveLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
