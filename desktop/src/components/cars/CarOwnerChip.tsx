import type { Car } from "@/types/leads";
import { TABLE_TEXT_CHIP_CLASS } from "@/components/table/tableTextChip";
import { cn } from "@/lib/utils";

export type CarOwnerChipProps = {
  ownerType: Car["owner_type"];
  tx: (enText: string, esText: string) => string;
  className?: string;
};

function getCarOwnerChipClassName(ownerType: Car["owner_type"]): string {
  switch (ownerType) {
    case "owned":
      return "border-blue-200/60 bg-blue-50 text-blue-500 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-400";
    case "client":
      return "border-purple-200/60 bg-purple-50 text-purple-500 dark:border-purple-400/30 dark:bg-purple-500/10 dark:text-purple-400";
    case "advisor":
      return "border-amber-200/60 bg-amber-50 text-amber-600 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-400";
    case "web_listing":
      return "border-indigo-200/60 bg-indigo-50 text-indigo-600 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-400";
    default:
      return "border-border bg-muted/30 text-muted-foreground";
  }
}

function translateOwnerType(
  ownerType: Car["owner_type"],
  tx: (enText: string, esText: string) => string,
): string {
  switch (ownerType) {
    case "owned":
      return tx("owned", "propio");
    case "client":
      return tx("client", "cliente");
    case "advisor":
      return tx("advisor", "asesor");
    case "web_listing":
      return tx("Web listing", "Listado web");
    default:
      return ownerType;
  }
}

export function CarOwnerChip({ ownerType, tx, className }: CarOwnerChipProps) {
  return (
    <span
      className={cn(
        TABLE_TEXT_CHIP_CLASS,
        "capitalize",
        getCarOwnerChipClassName(ownerType),
        className,
      )}
    >
      {translateOwnerType(ownerType, tx)}
    </span>
  );
}
