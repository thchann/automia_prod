import type { Car } from "@/types/leads";
import { TABLE_TEXT_CHIP_CLASS } from "@/components/table/tableTextChip";
import { cn } from "@/lib/utils";

export type CarStatusChipProps = {
  status: Car["status"];
  tx: (enText: string, esText: string) => string;
  className?: string;
};

function getCarStatusChipClassName(status: Car["status"]): string {
  switch (status) {
    case "available":
      return "border-blue-300/50 bg-blue-100 text-blue-600 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-400";
    case "sold":
      return "border-emerald-300/50 bg-emerald-100 text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-400";
    default:
      return "border-border bg-muted/30 text-muted-foreground";
  }
}

function translateCarStatus(
  status: Car["status"],
  tx: (enText: string, esText: string) => string,
): string {
  return status === "available" ? tx("available", "disponible") : tx("sold", "vendido");
}

export function CarStatusChip({ status, tx, className }: CarStatusChipProps) {
  return (
    <span className={cn(TABLE_TEXT_CHIP_CLASS, "capitalize", getCarStatusChipClassName(status), className)}>
      {translateCarStatus(status, tx)}
    </span>
  );
}
