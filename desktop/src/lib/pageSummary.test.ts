import { describe, expect, it } from "vitest";
import {
  countCreatedToday,
  formatCarsPageSummary,
  formatEntityPageSummary,
  formatLeadsPageSummary,
} from "./pageSummary";

const tx = (en: string) => en;

describe("pageSummary", () => {
  it("counts items created today in local time", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const items = [
      { created_at: today.toISOString() },
      { created_at: yesterday.toISOString() },
      { created_at: today.toISOString() },
    ];

    expect(countCreatedToday(items)).toBe(2);
  });

  it("formats total and new-today summary", () => {
    expect(
      formatEntityPageSummary(8, 0, {
        singularEn: "lead",
        pluralEn: "leads",
        singularEs: "lead",
        pluralEs: "leads",
      }, tx),
    ).toBe("8 leads · 0 new today");
  });

  it("formats leads and cars summaries", () => {
    const today = new Date();
    today.setHours(9, 0, 0, 0);

    expect(
      formatLeadsPageSummary([{ created_at: today.toISOString() }], tx),
    ).toBe("1 lead · 1 new today");

    expect(formatCarsPageSummary([], tx)).toBe("0 cars · 0 new today");
  });
});
