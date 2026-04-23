import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type CreateDeploymentModalProps = {
  open: boolean;
  serviceName: string;
  onClose: () => void;
  onSubmit: (values: { price: string; description: string }) => void;
};

export function CreateDeploymentModal({ open, serviceName, onClose, onSubmit }: CreateDeploymentModalProps) {
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) {
      setPrice("");
      setDescription("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button type="button" className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} aria-label="Close create deployment dialog" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-deployment-title"
        className={cn(
          "relative z-10 w-full max-w-[760px] rounded-[1.5rem] border border-border bg-panel px-6 py-6 text-panel-foreground shadow-builder-panel sm:px-10 sm:py-9",
        )}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 id="create-deployment-title" className="text-[1.9rem] font-semibold tracking-tight text-panel-foreground">
              Create deployment
            </h2>
            <p className="mt-3 max-w-[42rem] text-[1rem] leading-7 text-muted-foreground">
              Add the first deployment details for {serviceName}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-panel-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close create deployment dialog"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form
          className="mt-8 space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({ price, description });
          }}
        >
          <div className="space-y-3">
            <label htmlFor="deployment-price" className="text-sm font-medium text-panel-foreground">
              Price
            </label>
            <Input
              id="deployment-price"
              type="text"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="$29 / month"
              className="h-12 rounded-xl border-border bg-card/40 px-4 text-panel-foreground placeholder:text-muted-foreground"
              maxLength={40}
              required
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="deployment-description" className="text-sm font-medium text-panel-foreground">
              Description
            </label>
            <Textarea
              id="deployment-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe what this deployment is used for."
              className="min-h-[260px] rounded-xl border-border bg-card/40 px-4 py-3 leading-7 text-panel-foreground placeholder:text-muted-foreground"
              maxLength={220}
              required
            />
            <p className="text-sm text-muted-foreground">{description.length}/220 characters</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-card/65 px-5 py-3 text-[1rem] text-panel-foreground transition hover:bg-accent/35"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-3 text-[1rem] font-medium text-primary-foreground transition hover:opacity-90"
            >
              Create deployment
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
