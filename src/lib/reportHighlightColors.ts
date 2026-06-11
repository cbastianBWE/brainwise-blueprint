export type HighlightColor = "teal" | "amber" | "purple";

export const HIGHLIGHT_COLORS: { key: HighlightColor; label: string; css: string }[] = [
  { key: "teal", label: "Teal", css: "rgba(0,109,119,0.22)" },
  { key: "amber", label: "Amber", css: "rgba(255,183,3,0.38)" },
  { key: "purple", label: "Purple", css: "rgba(60,9,108,0.18)" },
];
export const DEFAULT_HIGHLIGHT_COLOR: HighlightColor = "teal";

export function highlightCss(color: string | null): string {
  return HIGHLIGHT_COLORS.find((c) => c.key === color)?.css ?? HIGHLIGHT_COLORS[0].css;
}

// Deterministic non-crypto hash (cyrb53) used only to detect when block text changed.
export function blockTextSha(text: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}
