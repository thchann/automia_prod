import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";

export type EntityDetailPanelLayout = "lead" | "car";

export type EntityDetailPanelProps = {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  layout?: EntityDetailPanelLayout;
};

export function EntityDetailPanel({
  open,
  onClose: _onClose,
  children,
  layout = "lead",
}: EntityDetailPanelProps) {
  const isCarLayout = layout === "car";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={() => {}}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/80",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "detail-panel fixed inset-y-0 right-0 z-50 flex h-full flex-col overflow-hidden border-l bg-background p-0 shadow-lg outline-none transition ease-in-out",
            isCarLayout
              ? "w-[820px] max-w-[min(820px,calc(100vw-1rem))]"
              : "w-[980px] max-w-[min(980px,calc(100vw-1rem))]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:duration-300 data-[state=open]:duration-300",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          )}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">Details</DialogPrimitive.Title>
          {isCarLayout ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {children ?? (
                <div className="flex h-full min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
                  Select a record
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-row">
              <div className="flex min-w-0 flex-[2] flex-col border-r">
                {children ?? (
                  <div className="flex h-full min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
                    Select a record
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-[1] bg-muted/30" aria-label="Matching section" />
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
