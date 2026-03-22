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

function maxDistForQuery(qLen: number): number {
  if (qLen <= 1) return 0;
  if (qLen <= 4) return 1;
  if (qLen <= 10) return 2;
  return 2;
}

/**
 * Substring match first; else fuzzy match against tokens and short windows.
 * Empty query is treated as match by callers (pass only non-empty queries).
 */
export function matchesFuzzy(query: string, haystack: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  let h = haystack.toLowerCase();
  if (h.length > 400) h = h.slice(0, 400);
  if (h.includes(q)) return true;

  const maxD = maxDistForQuery(q.length);
  const tokens = h.split(/[\s\-_/.,;:#]+/).filter((t) => t.length >= 2);

  for (const t of tokens) {
    if (Math.abs(t.length - q.length) > maxD + 2) continue;
    if (levenshtein(q, t) <= maxD) return true;
    if (t.length > q.length) {
      for (let start = 0; start <= t.length - q.length; start++) {
        const slice = t.slice(start, start + q.length + 2);
        if (slice.length < q.length) continue;
        if (levenshtein(q, slice) <= maxD) return true;
      }
    }
  }

  for (let len = Math.max(2, q.length - 1); len <= q.length + maxD + 1; len++) {
    for (let i = 0; i + len <= h.length; i++) {
      const slice = h.slice(i, i + len);
      if (levenshtein(q, slice) <= maxD) return true;
    }
  }

  return false;
}
