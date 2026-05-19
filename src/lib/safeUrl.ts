/**
 * Single source of truth for the URL scheme allowlist used to defend against
 * `javascript:` / `data:` URL XSS at href render sites and TipTap link marks.
 *
 * Returns true only if `url` parses and its resolved protocol is one of
 * https:, http:, mailto:, tel:. Relative paths resolve against the current
 * origin and therefore pass.
 */
const ALLOWED_PROTOCOLS = new Set(["https:", "http:", "mailto:", "tel:"]);

export function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(url, base);
    return ALLOWED_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}
