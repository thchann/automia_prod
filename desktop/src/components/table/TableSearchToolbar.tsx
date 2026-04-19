import { Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageProvider";

type TableSearchToolbarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Opens the manage filters dialog. Omit to hide the filter control. */
  onOpenFilters?: () => void;
  /** Highlight the filter button when filters differ from defaults or search is active. */
  filterActive?: boolean;
  className?: string;
};

export function TableSearchToolbar({
  value,
  onChange,
  placeholder,
  onOpenFilters,
  filterActive,
  className,
}: TableSearchToolbarProps) {
  const { tx } = useLanguage();

  return (
    <div
      className={cn(
        "flex min-w-0 flex-row items-center gap-2",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-h-10 min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-background",
        )}
      >
        <input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
          autoComplete="off"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex shrink-0 items-center justify-center px-2 text-muted-foreground hover:text-foreground"
            aria-label={tx("Clear search", "Limpiar busqueda")}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <div
          className="flex shrink-0 items-center border-l border-border bg-muted px-3"
          aria-hidden
        >
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {onOpenFilters != null && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "h-10 w-10 shrink-0 border-border",
            filterActive && "border-primary/40 bg-primary/10",
          )}
          aria-label={tx("Open filters", "Abrir filtros")}
          onClick={onOpenFilters}
        >
          <Filter className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
