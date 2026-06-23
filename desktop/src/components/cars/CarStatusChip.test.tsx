import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CarStatusChip } from "./CarStatusChip";

const tx = (en: string) => en;

describe("CarStatusChip", () => {
  it("renders available status in a wrap-safe chip", () => {
    render(<CarStatusChip status="available" tx={tx} />);
    const chip = screen.getByText("available");
    expect(chip).toHaveClass("rounded-md");
    expect(chip).toHaveClass("break-words");
    expect(chip).not.toHaveClass("rounded-full");
  });

  it("renders sold status", () => {
    render(<CarStatusChip status="sold" tx={tx} />);
    expect(screen.getByText("sold")).toBeInTheDocument();
  });
});
