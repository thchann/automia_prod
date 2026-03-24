import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageProvider";

/** Muted presets similar to Notion-style column / background chips */
export const FUNNEL_BACKGROUND_PRESETS: { label: string; hex: string | null }[] = [
  { label: "Default", hex: null },
  { label: "Gray", hex: "#787774" },
  { label: "Brown", hex: "#9F6B53" },
  { label: "Orange", hex: "#D9730D" },
  { label: "Yellow", hex: "#CB912F" },
  { label: "Green", hex: "#448361" },
  { label: "Blue", hex: "#337EA9" },
  { label: "Purple", hex: "#9065B0" },
  { label: "Pink", hex: "#C14C8A" },
  { label: "Red", hex: "#E03E3E" },
];

interface FunnelColumnColorMenuProps {
  currentHex: string | null;
  lastUsed: string[];
  onSelect: (hex: string | null) => void;
}

export function FunnelColumnColorMenu({ currentHex, lastUsed, onSelect }: FunnelColumnColorMenuProps) {
  const { tx } = useLanguage();
  const normalized = (h: string | null) => (h ?? "").toLowerCase();

  return (
    <div className="relative w-[220px] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl">
      <div className="min-w-0 py-1.5">
        {lastUsed.length > 0 && (
          <section className="border-b border-border pb-1">
            <p className="px-3 pb-1 pt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {tx("Last used", "Ultimos usados")}
            </p>
            <div className="px-1">
              {lastUsed.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground outline-none transition-colors hover:bg-muted/80",
                    normalized(hex) === normalized(currentHex) && "bg-muted/80",
                  )}
                  onClick={() => onSelect(hex)}
                >
                  <span
                    className="h-5 w-5 shrink-0 rounded-md border border-border/60"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="truncate">{labelForHex(hex, tx)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {tx("Background color", "Color de fondo")}
          </p>
          <div className="px-1 pb-1">
            {FUNNEL_BACKGROUND_PRESETS.map(({ label, hex }) => {
              const active =
                (hex === null && (currentHex === null || currentHex === "")) ||
                (hex !== null && normalized(hex) === normalized(currentHex));
              return (
                <button
                  key={label + (hex ?? "default")}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground outline-none transition-colors hover:bg-muted/80",
                    active && "bg-muted/80",
                  )}
                  onClick={() => onSelect(hex)}
                >
                  <Swatch hex={hex} />
                  <span>{translateColorLabel(label, tx)}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function labelForHex(hex: string, tx: (enText: string, esText: string) => string): string {
  const preset = FUNNEL_BACKGROUND_PRESETS.find((p) => p.hex && p.hex.toLowerCase() === hex.toLowerCase());
  return preset ? `${translateColorLabel(preset.label, tx)} ${tx("background", "fondo")}` : tx("Custom", "Personalizado");
}

function translateColorLabel(label: string, tx: (enText: string, esText: string) => string) {
  switch (label) {
    case "Default":
      return tx("Default", "Predeterminado");
    case "Gray":
      return tx("Gray", "Gris");
    case "Brown":
      return tx("Brown", "Marron");
    case "Orange":
      return tx("Orange", "Naranja");
    case "Yellow":
      return tx("Yellow", "Amarillo");
    case "Green":
      return tx("Green", "Verde");
    case "Blue":
      return tx("Blue", "Azul");
    case "Purple":
      return tx("Purple", "Morado");
    case "Pink":
      return tx("Pink", "Rosa");
    case "Red":
      return tx("Red", "Rojo");
    default:
      return label;
  }
}

function Swatch({ hex }: { hex: string | null }) {
  if (hex === null) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/40 bg-transparent" />
    );
  }
  return (
    <span
      className="h-5 w-5 shrink-0 rounded-md border border-border/50"
      style={{ backgroundColor: hex }}
    />
  );
}
