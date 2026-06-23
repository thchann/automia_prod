import type { LeadStatus } from "@/types/leads";
import { TABLE_TEXT_CHIP_CLASS } from "@/components/table/tableTextChip";
import { getStatusChipStyle, translateStatusName } from "@/lib/leadStatusChip";
import { cn } from "@/lib/utils";

export type LeadStatusChipProps = {
  status: LeadStatus | undefined;
  tx: (enText: string, esText: string) => string;
  className?: string;
};

export function LeadStatusChip({ status, tx, className }: LeadStatusChipProps) {
  if (!status) {
    return (
      <span
        className={cn(
          TABLE_TEXT_CHIP_CLASS,
          "border-border bg-muted/30 text-muted-foreground",
          className,
        )}
      >
        {tx("Unassigned", "Sin asignar")}
      </span>
    );
  }

  const chip = getStatusChipStyle(status);
  const color = status.color || "#6B7280";

  return (
    <span
      className={cn(TABLE_TEXT_CHIP_CLASS, chip.className, className)}
      style={{
        ...chip.style,
        borderColor: isProcesoChip(chip) ? undefined : `${color}40`,
      }}
    >
      {translateStatusName(status.name, tx)}
    </span>
  );
}

function isProcesoChip(chip: ReturnType<typeof getStatusChipStyle>): boolean {
  return chip.className != null && chip.style == null;
}
