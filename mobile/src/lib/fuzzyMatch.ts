/** Levenshtein distance for small strings (client-side search). */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }
  return dp[m]![n]!;
}

/** Max edit distance for whole-token fuzzy: short queries allow typos; longer queries stay strict. */
function maxDistForFuzzyToken(qLen: number): number {
  if (qLen <= 1) return 0;
  if (qLen <= 6) return 1;
  if (qLen <= 10) return 1;
  return 2;
}

/**
 * 4-digit calendar years (1800–2099): fuzzy edit distance would match e.g. 2024 vs 2023.
 * Treat these as exact-substring-only (after the includes() check above).
 */
function isPlausibleYearQuery(q: string): boolean {
  return /^(18|19|20)\d{2}$/.test(q);
}

/**
 * Substring match first; then prefix / whole-token fuzzy (no sliding window over full haystack).
 * Empty query is treated as match by callers (pass only non-empty queries).
 */
export function matchesFuzzy(query: string, haystack: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  /** No searchable text in selected columns → row cannot match a non-empty query. */
  if (!haystack.trim()) return false;

  let h = haystack.toLowerCase();
  if (h.length > 400) h = h.slice(0, 400);
  if (h.includes(q)) return true;

  /** Year-sized numeric queries: substring only (no fuzzy), so 2024 ≠ 2023. */
  if (isPlausibleYearQuery(q)) return false;

  const maxD = maxDistForFuzzyToken(q.length);
  const tokens = h.split(/[\s\-_/.,;:#]+/).filter((t) => t.length >= 2);

  for (const raw of tokens) {
    const t = raw.replace(/^@/, "");
    if (t.length < 2) continue;

    /** Partial word: "cl" matches token "clint" */
    if (t.startsWith(q)) return true;

    if (Math.abs(t.length - q.length) > 3) continue;

    if (levenshtein(q, t) <= maxD) return true;
  }

  return false;
}
