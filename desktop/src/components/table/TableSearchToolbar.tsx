import { Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useLanguage } from "@/i18n/LanguageProvider";

type TableSearchToolbarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Popover body (checkboxes, etc.). Omit to hide the filter control. */
  filterContent?: ReactNode;
  className?: string;
  /** Extra classes for the filter popover panel (width, padding). */
  filterContentClassName?: string;
};

export function TableSearchToolbar({
  value,
  onChange,
  placeholder,
  filterContent,
  className,
  filterContentClassName,
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

      {filterContent != null && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 border-border"
              aria-label={tx("Open filters", "Abrir filtros")}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className={cn(
              "max-h-[min(70vh,24rem)] w-[min(100vw-1.5rem,22rem)] overflow-y-auto p-0",
              filterContentClassName,
            )}
          >
            {filterContent}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
