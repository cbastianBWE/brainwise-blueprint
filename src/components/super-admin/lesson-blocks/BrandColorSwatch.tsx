import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface BrandSwatchColor {
  /** Brand token name shown in tooltip */
  label: string;
  /** Hex value used as the canonical value passed to onChange */
  hex: string;
}

export const BRAND_SWATCH_COLORS: BrandSwatchColor[] = [
  { label: "Navy", hex: "#021F36" },
  { label: "Orange", hex: "#F5741A" },
  { label: "Sand", hex: "#F9F7F1" },
  { label: "Teal", hex: "#006D77" },
  { label: "Mustard", hex: "#7a5800" },
  { label: "Slate", hex: "#6D6875" },
  { label: "Purple", hex: "#3C096C" },
  { label: "Forest", hex: "#2D6A4F" },
];

export const BRAND_TINT_COLORS: BrandSwatchColor[] = [
  { label: "Navy tint", hex: "#EDEFF2" },
  { label: "Orange tint", hex: "#FDEFE3" },
  { label: "Sand tint", hex: "#F9F7F1" },
  { label: "Teal tint", hex: "#E3EDED" },
  { label: "Mustard tint", hex: "#F3EEDF" },
  { label: "Slate tint", hex: "#EFEDEF" },
  { label: "Purple tint", hex: "#EAE4EE" },
  { label: "Forest tint", hex: "#E5EBE7" },
];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function clamp(n: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, n));
}

function hexToRgb(hex: string): [number, number, number] | null {
  if (!HEX_RE.test(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => clamp(Math.round(v)).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/**
 * Linearly mix `hex` toward `surfaceHex` by `ratio` (0..1).
 * ratio=0.85 means the result is 85% surface + 15% hex → a soft tint.
 */
export function toTint(hex: string, surfaceHex = "#F9F7F1", ratio = 0.85): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(surfaceHex);
  if (!a || !b) return hex;
  const mix = (x: number, y: number) => y * ratio + x * (1 - ratio);
  return rgbToHex(mix(a[0], b[0]), mix(a[1], b[1]), mix(a[2], b[2]));
}

interface BrandColorSwatchProps {
  /** Currently selected hex value, or null/undefined for "default" */
  value: string | null | undefined;
  onChange: (hex: string | null) => void;
  /** Optional: show only a subset (e.g. ["#021F36", "#F5741A"]) */
  allowedHexes?: string[];
  /** Optional: show a "default" / "none" option that calls onChange with null */
  allowDefault?: boolean;
  /** Default label, defaults to "Default" */
  defaultLabel?: string;
  onDefaultSelected?: () => void;
  /** Which palette to render. "full" = saturated brand colors (default). "tints" = pre-mixed near-neutral tints for backgrounds. */
  palette?: "full" | "tints";
  /** When true, show a custom hex input below the swatches. */
  allowCustomHex?: boolean;
  /** Surface hex used for softening custom hexes when palette="tints". Defaults to BrainWise sand. */
  surfaceHex?: string;
}

export function BrandColorSwatch({
  value,
  onChange,
  allowedHexes,
  allowDefault = false,
  defaultLabel = "Default",
  onDefaultSelected,
  palette = "full",
  allowCustomHex = false,
  surfaceHex = "#F9F7F1",
}: BrandColorSwatchProps) {
  const source = palette === "tints" ? BRAND_TINT_COLORS : BRAND_SWATCH_COLORS;
  const swatches = allowedHexes
    ? source.filter((c) => allowedHexes.includes(c.hex))
    : source;

  const [hexDraft, setHexDraft] = useState<string>(value ?? "#000000");
  useEffect(() => {
    if (value && HEX_RE.test(value)) setHexDraft(value);
  }, [value]);

  const commitCustom = (raw: string) => {
    if (!HEX_RE.test(raw)) return;
    const next = palette === "tints" ? toTint(raw, surfaceHex) : raw.toUpperCase();
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {allowDefault && (
          <button
            type="button"
            onClick={() => {
              if (onDefaultSelected) onDefaultSelected();
              onChange(null);
            }}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs transition-colors",
              !value
                ? "border-foreground bg-muted font-medium"
                : "border-border hover:bg-muted/50",
            )}
          >
            {defaultLabel}
          </button>
        )}
        {swatches.map((c) => {
          const selected = value === c.hex;
          return (
            <button
              key={c.hex}
              type="button"
              onClick={() => onChange(c.hex)}
              title={c.label}
              aria-label={c.label}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-all",
                selected
                  ? "border-foreground ring-2 ring-offset-1 ring-foreground/20 scale-110"
                  : "border-border hover:scale-105",
              )}
              style={{ background: c.hex }}
            />
          );
        })}
      </div>

      {allowCustomHex && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">More colors</span>
          <input
            type="color"
            value={HEX_RE.test(hexDraft) ? hexDraft : "#000000"}
            onChange={(e) => {
              const v = e.target.value.toUpperCase();
              setHexDraft(v);
              commitCustom(v);
            }}
            className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent p-0.5"
            aria-label="Pick custom color"
          />
          <input
            type="text"
            value={hexDraft}
            onChange={(e) => {
              const v = e.target.value;
              setHexDraft(v);
              if (HEX_RE.test(v)) commitCustom(v);
            }}
            placeholder="#RRGGBB"
            maxLength={7}
            spellCheck={false}
            className={cn(
              "h-7 w-24 rounded border bg-background px-2 text-xs font-mono uppercase",
              HEX_RE.test(hexDraft) ? "border-border" : "border-destructive",
            )}
            aria-label="Hex color"
          />
        </div>
      )}
    </div>
  );
}
