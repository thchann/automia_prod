import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeadStatusChip } from "./LeadStatusChip";
import type { LeadStatus } from "@/types/leads";

const tx = (en: string) => en;

function makeStatus(name: string, color: string): LeadStatus {
  return {
    id: "st-1",
    name,
    color,
    display_order: 0,
    is_default: false,
    created_at: "2024-01-01T00:00:00Z",
  };
}

describe("LeadStatusChip", () => {
  it("renders unassigned label when status is missing", () => {
    render(<LeadStatusChip status={undefined} tx={tx} />);
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("renders long status names in a wrap-safe chip", () => {
    render(<LeadStatusChip status={makeStatus("En busqueda", "#337EA9")} tx={tx} />);
    const chip = screen.getByText("En busqueda");
    expect(chip).toHaveClass("rounded-md");
    expect(chip).toHaveClass("break-words");
    expect(chip).not.toHaveClass("rounded-full");
  });
});
