import type { FormEvent } from "react";
import { useState } from "react";

export default function VerificationForm({
  onVerify,
  onRequestLogin,
  onBack,
}: {
  onVerify: (code: string) => Promise<void> | void;
  onRequestLogin?: () => void;
  onBack?: () => void;
}) {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onVerify(trimmed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6 w-full">
      <div>
        <h3 className="text-xl font-bold text-foreground text-center">Welcome to Automia</h3>
        <p className="text-sm text-muted-foreground text-center mt-1">Enter your access code to continue</p>
      </div>

      <div className="w-full">
        <input
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={255}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. AUTM-XXXX-001"
          className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3.5 text-center text-base font-semibold tracking-wide text-foreground outline-none placeholder:text-muted-foreground placeholder:font-normal focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          aria-label="Access code"
        />
      </div>

      <button
        type="submit"
        disabled={!code.trim() || isSubmitting}
        className="w-full rounded-xl bg-primary py-4 text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Verifying…" : "Continue →"}
      </button>

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to sign in
        </button>
      ) : null}

      {onRequestLogin ? (
        <button
          type="button"
          onClick={onRequestLogin}
          className="text-sm font-semibold text-black hover:opacity-80 transition-opacity"
        >
          Continue to login page →
        </button>
      ) : null}
    </form>
  );
}
