import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe } from "lucide-react";

import { ApiError, patchMe } from "@automia/api";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function SetupWebsitePage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const w = website.trim();
    if (!w) {
      toast.error("Enter your website URL");
      return;
    }
    setSubmitting(true);
    try {
      await patchMe({ website: w });
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(typeof e.detail === "string" ? e.detail : e.message);
      } else {
        toast.error("Could not save your website");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background items-center justify-center px-6 py-4">
      <div className="w-full max-w-md flex flex-col items-center gap-4 -translate-y-4">
        <div className="flex items-center gap-3">
          <img src="/automia-logo.png" alt="Automia logo" className="h-10 w-10 object-contain" />
          <span className="text-3xl font-bold text-black">Your website</span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Add the site you use for your inventory or business. You can change this later in settings.
        </p>
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3.5">
            <Globe className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              type="url"
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="https://yourdealership.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              autoComplete="url"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !website.trim()}
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
