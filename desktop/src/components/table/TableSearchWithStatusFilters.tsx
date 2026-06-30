import { Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageProvider";

const TOOLBAR_CONTROL_HEIGHT = "h-[30px]";

export type StatusFilterChip = {
  id: string;
  label: string;
  color?: string | null;
  count: number;
};

export type TableSearchWithStatusFiltersProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  chips: StatusFilterChip[];
  allCount: number;
  /** `null` = "All" / Todos selected */
  selectedChipId: string | null;
  onSelectChip: (id: string | null) => void;
  onOpenFilters?: () => void;
  filterActive?: boolean;
  className?: string;
};

function StatusFilterChipButton({
  label,
  count,
  color,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  color?: string | null;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        TOOLBAR_CONTROL_HEIGHT,
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0 text-xs font-medium leading-none transition-colors",
        selected
          ? "border-border bg-muted/70 text-foreground"
          : "border-border bg-background text-foreground hover:bg-muted/40",
      )}
    >
      {color ? (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      ) : null}
      <span>{label}</span>
      <span className="text-muted-foreground">{count}</span>
    </button>
  );
}

export function TableSearchWithStatusFilters({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  chips,
  allCount,
  selectedChipId,
  onSelectChip,
  onOpenFilters,
  filterActive,
  className,
}: TableSearchWithStatusFiltersProps) {
  const { tx } = useLanguage();

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <div
        className={cn(
          "flex w-full max-w-[163px] shrink-0 overflow-hidden rounded-md border border-border bg-background sm:max-w-[175px]",
          TOOLBAR_CONTROL_HEIGHT,
        )}
      >
        <div className="flex shrink-0 items-center pl-2" aria-hidden>
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="min-w-0 flex-1 border-0 bg-transparent px-1.5 py-0 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
          autoComplete="off"
        />
        {searchValue ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="flex shrink-0 items-center justify-center px-1.5 text-muted-foreground hover:text-foreground"
            aria-label={tx("Clear search", "Limpiar busqueda")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        <StatusFilterChipButton
          label={tx("All", "Todos")}
          count={allCount}
          selected={selectedChipId === null}
          onClick={() => onSelectChip(null)}
        />
        {chips.map((chip) => (
          <StatusFilterChipButton
            key={chip.id}
            label={chip.label}
            count={chip.count}
            color={chip.color}
            selected={selectedChipId === chip.id}
            onClick={() => onSelectChip(chip.id)}
          />
        ))}
      </div>

      {onOpenFilters != null ? (
        <Button
          type="button"
          variant="outline"
          className={cn(
            TOOLBAR_CONTROL_HEIGHT,
            "shrink-0 gap-1.5 border-border px-2.5 py-0 text-xs",
            filterActive && "border-primary/40 bg-primary/10",
          )}
          onClick={onOpenFilters}
        >
          <Filter className="h-3.5 w-3.5" />
          {tx("Filters", "Filtros")}
        </Button>
      ) : null}
    </div>
  );
}
