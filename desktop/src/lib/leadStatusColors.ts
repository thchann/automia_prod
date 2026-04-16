/** Fixed palette for funnel column colors (no free-form color wheel). */
export const LEAD_STATUS_PALETTE = [
  "#6B7280",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#3B82F6",
  "#6366F1",
  "#A855F7",
  "#EC4899",
] as const;

export type LeadStatusPaletteColor = (typeof LEAD_STATUS_PALETTE)[number];

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace(/^#/, "");
  if (h.length !== 6 || !/^[0-9a-fA-F]+$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function dist2(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/** Map any stored color to the nearest palette entry (for display and editing). */
export function normalizeLeadStatusColor(color: string | null | undefined): LeadStatusPaletteColor {
  const raw = (color ?? "").trim();
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  const upper = withHash.toUpperCase();
  if ((LEAD_STATUS_PALETTE as readonly string[]).includes(upper)) {
    return upper as LeadStatusPaletteColor;
  }
  const rgb = parseHex(withHash);
  if (!rgb) return LEAD_STATUS_PALETTE[0];
  let best: LeadStatusPaletteColor = LEAD_STATUS_PALETTE[0];
  let bestD = Infinity;
  for (const p of LEAD_STATUS_PALETTE) {
    const pr = parseHex(p);
    if (!pr) continue;
    const d = dist2(rgb, pr);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}
