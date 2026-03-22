import { describe, it, expect } from "vitest";
import { matchesFuzzy } from "./fuzzyMatch";

describe("matchesFuzzy", () => {
  const haystackClint =
    "clint hoppe @clint_h +1 555-0103 seller manual qualified 16 dec 2024";

  const haystackDarin =
    "darin deckow @darin_d +1 555-0104 buyer website contacted years 2020–2024 toyota camry 2023 toyota camry";

  it("matches name substring", () => {
    expect(matchesFuzzy("clint", haystackClint)).toBe(true);
  });

  it("does not match unrelated names (no sliding-window false positives)", () => {
    expect(matchesFuzzy("clint", haystackDarin)).toBe(false);
  });

  it("typo-tolerant for brand token", () => {
    expect(matchesFuzzy("nissa", "2023 nissan altima sedan")).toBe(true);
  });

  it("year 2024 does not fuzzy-match 2023-only haystack", () => {
    expect(matchesFuzzy("2024", "2023 bmw m4 competition")).toBe(false);
  });

  it("year 2024 matches when present as substring", () => {
    expect(matchesFuzzy("2024", "2024 bmw m4 competition")).toBe(true);
  });

  it("plausible year query has no fuzzy fallback after includes fails", () => {
    expect(matchesFuzzy("2024", "2023 ford truck")).toBe(false);
  });
});
