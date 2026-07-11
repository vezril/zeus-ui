/**
 * A unique id that works in ANY browser context.
 *
 * `crypto.randomUUID()` only exists in a secure context (HTTPS or localhost).
 * Zeus is a LAN operator console often served over plain HTTP on a hostname/IP,
 * where `crypto.randomUUID` is `undefined` and calling it throws
 * "crypto.randomUUID is not a function". `crypto.getRandomValues`, however, is
 * available in insecure contexts too, so we build a v4-shaped UUID from it and
 * fall back to a timestamp+random id only if crypto is entirely absent.
 *
 * These ids are used for React keys and client-side markers — uniqueness is what
 * matters, not cryptographic strength.
 */
export function uid(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant
    const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
    return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}
