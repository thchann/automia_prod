import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ottoLogo from "@/assets/Otto_cropped.png";

const LOGO_TEXT = "Automia";
const CODE_LENGTH = 4;

const Index = () => {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;
      const digit = value.slice(-1);
      setCode((prev) => {
        const next = [...prev];
        next[index] = digit;
        return next;
      });
      if (digit && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    []
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [code]
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    setCode((prev) => {
      const next = [...prev];
      for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
      return next;
    });
    const focusIdx = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const full = code.join("");
    if (full.length < CODE_LENGTH) return;
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 1500);
  };

  const isFilled = code.every((d) => d !== "");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <img
          src={ottoLogo}
          alt="Automia logo"
          className="h-10 w-10 object-contain transition-transform duration-500 hover:rotate-[360deg]"
        />
        <h1 className="text-4xl tracking-wide text-primary" style={{ fontFamily: "'Amazing Grotesk', sans-serif" }}>
          {LOGO_TEXT}
        </h1>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-[448px] rounded-3xl border border-border bg-card p-8"
        style={{ boxShadow: "var(--verify-card-shadow)" }}
      >
        <h2 className="text-center text-xl font-semibold text-card-foreground">
          Welcome to Automia
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Enter your access code to continue
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 w-full">

          {/* OTP Inputs */}
          <div className="flex gap-3 justify-center" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-[72px] w-[72px] rounded-xl border border-border bg-muted text-center text-3xl font-semibold text-card-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/30"
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={!isFilled || isSubmitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-muted py-3.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent disabled:opacity-50"
          >
            {isSubmitting ? "Verifying…" : "Continue"}
            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
          </button>
          <Link
            to="/login"
            className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm font-medium text-[#FF9900] transition-colors hover:text-[#e68a00] hover:underline"
          >
            Continue to login page
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </form>

      </div>
    </div>
  );
};

export default Index;
