import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, User } from "lucide-react";

import { ApiError } from "@automia/api";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearRegistrationAccessGranted,
  getPendingRegistrationAccessCode,
  hasRegistrationAccess,
} from "@/lib/registrationAccess";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, user, isLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) navigate("/dashboard", { replace: true });
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (isLoading || user) return;
    if (!hasRegistrationAccess()) {
      navigate("/verification", { replace: true });
    }
  }, [isLoading, user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const accessCode = getPendingRegistrationAccessCode();
    if (!hasRegistrationAccess() || !accessCode || !name.trim() || !email.trim() || password.length < 8) return;
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password, accessCode);
      clearRegistrationAccessGranted();
      navigate("/setup-website", { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(typeof e.detail === "string" ? e.detail : e.message);
      } else {
        toast.error("Registration failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || user) return null;
  if (!hasRegistrationAccess()) return null;

  return (
    <div className="flex min-h-screen bg-background items-center justify-center px-6 py-4">
      <div className="w-full max-w-md flex flex-col items-center gap-4 -translate-y-4">
        <div className="flex items-center gap-3">
          <img src="/automia-logo.png" alt="Automia logo" className="h-10 w-10 object-contain" />
          <span className="text-3xl font-bold text-black">Create account</span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Access code verified. Enter your details to finish signing up.
        </p>
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3.5">
            <User className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3.5">
            <Mail className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              type="email"
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3.5">
            <Lock className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              type="password"
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || password.length < 8}
            className="mt-2 w-full rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "…" : "Create account"}
          </button>
          <button
            type="button"
            onClick={() => {
              clearRegistrationAccessGranted();
              navigate("/verification");
            }}
            className="text-center text-sm text-muted-foreground"
          >
            Use a different access code
          </button>
          <button
            type="button"
            onClick={() => navigate("/sign-in")}
            className="text-center text-sm text-muted-foreground"
          >
            Already have an account? Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
