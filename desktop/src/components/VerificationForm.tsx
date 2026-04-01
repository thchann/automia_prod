import type { FormEvent } from "react";
import { useMemo, useRef, useState } from "react";

const CODE_LENGTH = 5;

export default function VerificationForm({
  onVerify,
  onRequestLogin,
}: {
  onVerify: (code: string) => Promise<void> | void;
  onRequestLogin?: () => void;
}) {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const isFilled = useMemo(() => code.every((d) => d !== ""), [code]);
  const fullCode = useMemo(() => code.join(""), [code]);

  const handleChange = (index: number, value: string) => {
    const letter = value.replace(/[^a-zA-Z]/g, "").slice(-1).toUpperCase();
    setCode((prev) => {
      const next = [...prev];
      next[index] = letter;
      return next;
    });
    if (letter && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, key: string) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFilled || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onVerify(fullCode);
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

      <div className="flex gap-3 justify-center">
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e.key)}
            className="w-16 h-16 rounded-xl border border-border bg-secondary/50 text-center text-2xl font-bold text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            aria-label={`Letter ${i + 1}`}
          />
        ))}
      </div>

      <button
        type="submit"
        disabled={!isFilled || isSubmitting}
        className="w-full rounded-xl bg-primary py-4 text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Verifying…" : "Continue →"}
      </button>

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
