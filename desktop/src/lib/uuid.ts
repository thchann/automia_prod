function fallbackUuid(): string {
  const time = Date.now().toString(16);
  const rnd = Math.random().toString(16).slice(2).padEnd(16, "0").slice(0, 16);
  return `fallback-${time}-${rnd}`;
}

/**
 * Runtime-safe UUID for browser/electron contexts.
 * Prefers `crypto.randomUUID`, falls back to UUIDv4-from-random-bytes,
 * and finally to a timestamp/random string to avoid UI crashes.
 */
export function makeUuid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }

  if (c && typeof c.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return fallbackUuid();
}
