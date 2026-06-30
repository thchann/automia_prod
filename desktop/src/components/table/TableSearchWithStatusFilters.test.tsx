import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TableSearchWithStatusFilters } from "./TableSearchWithStatusFilters";

vi.mock("@/i18n/LanguageProvider", () => ({
  useLanguage: () => ({
    tx: (en: string) => en,
  }),
}));

describe("TableSearchWithStatusFilters", () => {
  it("selects a status chip and clears with All", () => {
    const onSelectChip = vi.fn();
    render(
      <TableSearchWithStatusFilters
        searchValue=""
        onSearchChange={() => {}}
        searchPlaceholder="Search"
        allCount={8}
        selectedChipId={null}
        onSelectChip={onSelectChip}
        chips={[
          { id: "st-1", label: "New", color: "#3B82F6", count: 2 },
          { id: "st-2", label: "Contacted", color: "#F59E0B", count: 4 },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /New/i }));
    expect(onSelectChip).toHaveBeenCalledWith("st-1");

    fireEvent.click(screen.getByRole("button", { name: /All/i }));
    expect(onSelectChip).toHaveBeenCalledWith(null);
  });
});
