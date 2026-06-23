import type { ReactNode } from "react";

export function DetailFieldCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-background px-3.5 py-2.5">
      <div className="mb-0.5 text-[11px] text-muted-foreground">{label}</div>
      <div className="text-[13.5px] leading-snug text-foreground">{children}</div>
    </div>
  );
}
