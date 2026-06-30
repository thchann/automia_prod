import { LayoutGrid, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageProvider";

export type ViewMode = "table" | "funnel";

type ViewModeToggleProps = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  className?: string;
};

export function ViewModeToggle({ value, onChange, className }: ViewModeToggleProps) {
  const { tx } = useLanguage();

  const options: { key: ViewMode; label: string; icon: typeof Table2 }[] = [
    { key: "table", label: tx("Table", "Tabla"), icon: Table2 },
    { key: "funnel", label: tx("Funnel", "Embudo"), icon: LayoutGrid },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={tx("View mode", "Modo de vista")}
      className={cn("inline-flex items-center rounded-lg bg-muted/60 p-0.5", className)}
    >
      {options.map(({ key, label, icon: Icon }) => {
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
