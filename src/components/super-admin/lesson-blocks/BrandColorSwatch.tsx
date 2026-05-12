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
  { label: "Teal", hex: "#006D77" },
  { label: "Forest", hex: "#2D6A4F" },
  { label: "Slate", hex: "#6D6875" },
];

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
}

export function BrandColorSwatch({
  value,
  onChange,
  allowedHexes,
  allowDefault = false,
  defaultLabel = "Default",
  onDefaultSelected,
}: BrandColorSwatchProps) {
  const swatches = allowedHexes
    ? BRAND_SWATCH_COLORS.filter((c) => allowedHexes.includes(c.hex))
    : BRAND_SWATCH_COLORS;

  return (
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
  );
}
