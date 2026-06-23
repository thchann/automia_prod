import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CarOwnerChip } from "./CarOwnerChip";

const tx = (en: string) => en;

describe("CarOwnerChip", () => {
  it("renders owner type in a wrap-safe chip", () => {
    render(<CarOwnerChip ownerType="web_listing" tx={tx} />);
    const chip = screen.getByText("Web listing");
    expect(chip).toHaveClass("rounded-md");
    expect(chip).toHaveClass("break-words");
    expect(chip).not.toHaveClass("rounded-full");
  });
});
