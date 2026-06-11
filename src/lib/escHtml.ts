// Null-safe HTML escape for interpolating user-controlled text into HTML
// string templates (e.g. transactional email bodies). null/undefined → "".
export function escHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
