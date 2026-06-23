import type { CSSProperties } from "react";
import type { LeadStatus } from "@/types/leads";

const PROCESO_CHIP_CLASS =
  "text-[oklch(0.46_0.14_32)] bg-[oklch(0.93_0.06_36)]";

function isProcesoStatus(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower === "en proceso" ||
    lower === "in process" ||
    lower === "in progress" ||
    lower.includes("proceso")
  );
}

export function getStatusChipStyle(status: LeadStatus): {
  className?: string;
  style?: CSSProperties;
} {
  if (isProcesoStatus(status.name)) {
    return { className: PROCESO_CHIP_CLASS };
  }
  const color = status.color || "#6B7280";
  return {
    style: { color, backgroundColor: `${color}22` },
  };
}

export function translateStatusName(
  name: string,
  tx: (enText: string, esText: string) => string,
): string {
  switch (name.toLowerCase()) {
    case "new":
      return tx("New", "Nuevo");
    case "contacted":
      return tx("Contacted", "Contactado");
    case "qualified":
      return tx("Qualified", "Calificado");
    case "closed":
      return tx("Closed", "Cerrado");
    default:
      return name;
  }
}
