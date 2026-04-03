import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Globe } from "lucide-react";

import { ApiError, patchProfile } from "@automia/api";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function SetupWebsitePage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [website, setWebsite] = useState("");
  const [clientDescription, setClientDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const w = website.trim();
    const d = clientDescription.trim();
    if (!w && !d) {
      toast.error("Enter your website, a description, or both");
      return;
    }
    setSubmitting(true);
    try {
      await patchProfile({
        ...(w ? { website: w } : {}),
        ...(d ? { client_description: d } : {}),
      });
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(typeof e.detail === "string" ? e.detail : e.message);
      } else {
        toast.error("Could not save your profile");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = website.trim().length > 0 || clientDescription.trim().length > 0;

  return (
    <div className="flex min-h-screen bg-background items-center justify-center px-6 py-4">
      <div className="w-full max-w-md flex flex-col items-center gap-4 -translate-y-4">
        <div className="flex items-center gap-3">
          <img src="/automia-logo.png" alt="Automia logo" className="h-10 w-10 object-contain" />
          <span className="text-3xl font-bold text-black">Your business</span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Add your website and a short description. You can change these later in settings.
        </p>
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3.5">
            <Globe className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              className="flex-1 min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Website (URL, domain, or any text)"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="flex gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3.5">
            <FileText className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
            <textarea
              className="flex-1 min-h-[100px] min-w-0 resize-y bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Description (what you sell, your specialty, service area…)"
              value={clientDescription}
              onChange={(e) => setClientDescription(e.target.value)}
              maxLength={8000}
              rows={4}
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="mt-2 w-full rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "…" : "Continue to dashboard"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard", { replace: true })}
            className="text-center text-sm text-muted-foreground"
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}
