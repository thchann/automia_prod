import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";

type LoginFormValues = {
  email: string;
  password: string;
  remember: boolean;
};

export default function LoginForm({
  onLogin,
  onCreateAccount,
}: {
  onLogin: (values: LoginFormValues) => Promise<void> | void;
  onCreateAccount: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.trim().length > 0;
  }, [email, password]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onLogin({ email: email.trim(), password, remember });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
      {/* Email field */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3.5">
        <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
          autoComplete="email"
        />
      </div>

      {/* Password field */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3.5">
        <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
        </button>
      </div>

      {/* Remember me / Forgot password */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={remember}
            onCheckedChange={(v) => setRemember(v === true)}
            className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <span className="text-sm text-foreground">Remember me</span>
        </label>
        <button type="button" className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
          Forgot password
        </button>
      </div>

      {/* Login button */}
      <button
        type="submit"
        disabled={!canSubmit || isSubmitting}
        className="w-full rounded-xl bg-primary py-4 text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed mt-2"
      >
        {isSubmitting ? "Logging in…" : "Login"}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="text-primary">◆</span> Or login with <span className="text-primary">◆</span>
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Social buttons (visual only) */}
      <div className="flex gap-3">
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border py-3.5 hover:bg-secondary/80 transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span className="text-sm font-medium text-foreground">Google</span>
        </button>
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border py-3.5 hover:bg-secondary/80 transition-colors"
        >
          <svg className="h-5 w-5 text-foreground" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          <span className="text-sm font-medium text-foreground">Apple</span>
        </button>
      </div>

      {/* Bottom link */}
      <p className="text-center text-sm text-muted-foreground mt-4">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={onCreateAccount}
          className="font-semibold text-black underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          Create an account
        </button>
      </p>
    </form>
  );
}

