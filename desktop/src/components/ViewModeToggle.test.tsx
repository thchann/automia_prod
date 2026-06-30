import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ViewModeToggle } from "./ViewModeToggle";

vi.mock("@/i18n/LanguageProvider", () => ({
  useLanguage: () => ({
    tx: (en: string) => en,
  }),
}));

describe("ViewModeToggle", () => {
  it("switches between table and funnel", () => {
    const onChange = vi.fn();
    render(<ViewModeToggle value="table" onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: /Funnel/i }));
    expect(onChange).toHaveBeenCalledWith("funnel");

    fireEvent.click(screen.getByRole("radio", { name: /Table/i }));
    expect(onChange).toHaveBeenCalledWith("table");
  });
});
