export const FONT_MAP: Record<string, string> = {
  inter: '"Inter", system-ui, sans-serif',
  manrope: '"Manrope", system-ui, sans-serif',
  poppins: '"Poppins", system-ui, sans-serif',
  lora: '"Lora", Georgia, serif',
  merriweather: '"Merriweather", Georgia, serif',
  playfair: '"Playfair Display", Georgia, serif',
  source_serif: '"Source Serif Pro", Georgia, serif',
  ibm_plex_sans: '"IBM Plex Sans", system-ui, sans-serif',
  ibm_plex_serif: '"IBM Plex Serif", Georgia, serif',
};

export function resolveFont(key: string | null | undefined): string | null {
  if (!key) return null;
  return FONT_MAP[key.toLowerCase()] ?? null;
}
