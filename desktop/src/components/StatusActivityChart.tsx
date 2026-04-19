import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { normalizeLeadStatusColor } from "@/lib/leadStatusColors";
import { EMPTY_STATUS_ACTIVITY_KEYS, statusActivityKey } from "@/lib/statusActivityKeys";
import { cn } from "@/lib/utils";

/**
 * Time-range pills should drive which items the parent passes in (filter by `created_at`)
 * via `range` / `onRangeChange`. The chart does not filter data by itself.
 */

/**
 * One item in the strip = one lead OR one car.
 * `color` is the status color (hex). It will be snapped to the
 * 10-color lead status palette via normalizeLeadStatusColor().
 */
export interface StatusActivityItem {
  id: string | number;
  /** Optional label shown in the tooltip (e.g. lead name, car VIN) */
  label?: string;
  /** Optional status name shown in the tooltip */
  statusName?: string;
  /** Hex color of the status — snapped to the palette */
  color?: string;
}

export type StatusEntity = "lead" | "car";

export const STATUS_ACTIVITY_RANGES = [
  "1d",
  "1w",
  "1m",
  "3m",
  "6m",
  "1y",
  "All time",
] as const;

export type StatusActivityRange = (typeof STATUS_ACTIVITY_RANGES)[number];

export interface StatusActivityChartProps {
  /** Drives the title + icon ("Leads" / "Cars" with EN/ES) */
  entity: StatusEntity;
  /** One bar per item */
  items: StatusActivityItem[];
  /** Selected range tab (controlled). Defaults to "1d". */
  range?: StatusActivityRange;
  onRangeChange?: (range: StatusActivityRange) => void;
  /**
   * When `onSelectedKeysChange` is set, selection is controlled: use `selectedKeys`
   * and update via the callback (e.g. to filter an external table).
   */
  selectedKeys?: Set<string>;
  onSelectedKeysChange?: (keys: Set<string>) => void;
  /** Click a bar segment to open the lead/car detail (parent handles dialog). */
  onItemClick?: (id: string | number) => void;
  className?: string;
}

const COPY = {
  lead: { en: "Leads", es: "Leads" },
  car: { en: "Cars", es: "Autos" },
} as const;

const TILES_PER_PAGE = 4;

interface NormalizedItem extends StatusActivityItem {
  _color: string;
  _statusKey: string;
}

interface StatusGroup {
  key: string;
  color: string;
  name: string;
  count: number;
}

export function StatusActivityChart({
  entity,
  items,
  range: rangeProp,
  onRangeChange,
  selectedKeys: selectedKeysProp,
  onSelectedKeysChange,
  onItemClick,
  className,
}: StatusActivityChartProps) {
  const [internalRange, setInternalRange] = useState<StatusActivityRange>("1d");
  const range = rangeProp ?? internalRange;
  const setRange = (r: StatusActivityRange) => {
    if (onRangeChange) onRangeChange(r);
    else setInternalRange(r);
  };

  const selectionControlled = onSelectedKeysChange !== undefined;
  const [internalSelected, setInternalSelected] = useState<Set<string>>(new Set());
  const selected = useMemo(() => {
    if (!selectionControlled) return internalSelected;
    return selectedKeysProp ?? EMPTY_STATUS_ACTIVITY_KEYS;
  }, [selectionControlled, selectedKeysProp, internalSelected]);

  const setSelected = (next: Set<string>) => {
    if (selectionControlled) {
      onSelectedKeysChange!(next);
    } else {
      setInternalSelected(next);
    }
  };

  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const titleEn = COPY[entity].en;
  const titleEs = COPY[entity].es;

  const normalized: NormalizedItem[] = useMemo(
    () =>
      items.map((it) => {
        const color = normalizeLeadStatusColor(it.color);
        const statusKey = statusActivityKey(it.statusName, it.color);
        return { ...it, _color: color, _statusKey: statusKey };
      }),
    [items],
  );

  const statusGroups: StatusGroup[] = useMemo(() => {
    const map = new Map<string, StatusGroup>();
    for (const it of normalized) {
      const existing = map.get(it._statusKey);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(it._statusKey, {
          key: it._statusKey,
          color: it._color,
          name: it.statusName ?? "Unlabeled",
          count: 1,
        });
      }
    }
    return Array.from(map.values());
  }, [normalized]);

  const activeKeys: Set<string> | null = useMemo(() => {
    if (hoveredStatus) return new Set([hoveredStatus]);
    if (selected.size > 0) return selected;
    return null;
  }, [hoveredStatus, selected]);

  const totalPages = Math.max(1, Math.ceil(statusGroups.length / TILES_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * TILES_PER_PAGE;
  const visibleGroups = statusGroups.slice(pageStart, pageStart + TILES_PER_PAGE);
  const hasPaging = statusGroups.length > TILES_PER_PAGE;
  const canPrev = safePage > 0;
  const canNext = safePage < totalPages - 1;

  const toggleStatus = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const restoreDefaults = () => {
    setSelected(new Set());
    setHoveredStatus(null);
    setPage(0);
  };

  const isDirty = selected.size > 0 || safePage !== 0;

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-border bg-card p-6 shadow-sm",
        "flex flex-col gap-6",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {titleEn}
        </h2>

        <div className="flex items-center gap-0.5 rounded-full bg-muted p-1">
          {STATUS_ACTIVITY_RANGES.map((r) => {
            const active = r === range;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-foreground">
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10"
          >
            <span className="block h-2.5 w-2.5 rounded-sm border-2 border-primary" />
          </span>
          <span className="text-xl font-semibold tracking-tight">
            {titleEn}
            <span className="sr-only"> / {titleEs}</span>
          </span>
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            {normalized.length} {normalized.length === 1 ? "item" : "items"}
          </span>

          {isDirty && (
            <button
              type="button"
              onClick={restoreDefaults}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore defaults
            </button>
          )}
        </div>

        <BarStrip items={normalized} activeKeys={activeKeys} onItemClick={onItemClick} />
      </div>

      {statusGroups.length > 0 && (
        <div className="flex items-stretch gap-3">
          <div
            className={cn(
              "grid flex-1 gap-3",
              "grid-cols-2 md:grid-cols-4",
            )}
          >
            {visibleGroups.map((g) => {
              const isSelected = selected.has(g.key);
              const isHovered = hoveredStatus === g.key;
              const isDimmed =
                activeKeys !== null && !activeKeys.has(g.key);
              return (
                <button
                  key={g.key}
                  type="button"
                  onMouseEnter={() => setHoveredStatus(g.key)}
                  onMouseLeave={() => setHoveredStatus(null)}
                  onFocus={() => setHoveredStatus(g.key)}
                  onBlur={() => setHoveredStatus(null)}
                  onClick={() => toggleStatus(g.key)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border bg-card px-4 py-3 text-left transition-all",
                    "hover:border-foreground/30 hover:shadow-sm",
                    isSelected
                      ? "border-foreground/40 ring-2 ring-foreground/10"
                      : "border-border",
                    isDimmed && !isHovered && "opacity-50",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: g.color }}
                    />
                    <span className="truncate">{g.name}</span>
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {g.count}
                  </span>
                </button>
              );
            })}
            {visibleGroups.length < TILES_PER_PAGE &&
              Array.from({
                length: TILES_PER_PAGE - visibleGroups.length,
              }).map((_, i) => (
                <div
                  key={`pad-${i}`}
                  aria-hidden
                  className="hidden md:block"
                />
              ))}
          </div>

          {hasPaging && (
            <div className="flex flex-col items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={!canPrev}
                aria-label="Previous statuses"
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors",
                  "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card",
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                {safePage + 1}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={!canNext}
                aria-label="Next statuses"
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors",
                  "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card",
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BarStrip({
  items,
  activeKeys,
  onItemClick,
}: {
  items: NormalizedItem[];
  activeKeys: Set<string> | null;
  onItemClick?: (id: string | number) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex h-[180px] w-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        No items yet
      </div>
    );
  }

  const BASE_CAPACITY = 20;
  let capacity = BASE_CAPACITY;
  while (items.length > capacity) capacity *= 2;
  const widthPct = 100 / capacity;

  return (
    <div
      className={cn(
        "relative flex h-[180px] w-full items-stretch rounded-xl",
        "px-1 py-1",
      )}
    >
      {items.map((it) => {
        const matches = activeKeys === null || activeKeys.has(it._statusKey);
        const dimmed = activeKeys !== null && !matches;
        const highlighted = activeKeys !== null && matches;
        const title =
          it.label
            ? `${it.label}${it.statusName ? ` — ${it.statusName}` : ""}`
            : it.statusName;
        return (
          <div
            key={it.id}
            className="group relative h-full px-[2px]"
            style={{ width: `${widthPct}%` }}
          >
            <button
              type="button"
              title={title}
              aria-label={
                it.label
                  ? `${it.label}${it.statusName ? `, ${it.statusName}` : ""}`
                  : it.statusName ?? "Item"
              }
              onClick={() => onItemClick?.(it.id)}
              className={cn(
                "h-full w-full rounded-full transition-all duration-200 hover:scale-y-[1.03]",
                onItemClick && "cursor-pointer",
                dimmed && "opacity-20",
                highlighted && "scale-y-[1.05] shadow-sm",
              )}
              style={{ backgroundColor: it._color }}
            />
            {(it.label || it.statusName) && (
              <div
                className={cn(
                  "pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2",
                  "whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background",
                  "opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
                )}
              >
                {it.label}
                {it.statusName && (
                  <span className="ml-1 opacity-70">· {it.statusName}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
