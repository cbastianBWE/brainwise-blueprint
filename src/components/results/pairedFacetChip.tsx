/**
 * Shared paired-report chip primitives.
 *
 * Lifted out of src/pages/PairedReport.tsx so the one-pager can reuse the exact
 * same chip (color, tooltip, facet jump) instead of growing a second one.
 * Chip color comes only from the locked PTP dimension namespace.
 */
import { useEffect, useState } from "react";
import { facetDisplayLabel } from "@/lib/pairedSectionTypes";

/* ---------- palette (brand-only) ---------- */
export const NAVY = "#021F36";
export const TEAL = "#006D77";
export const GRAY = "#6D6875";
export const PURPLE = "#3C096C";
export const AMBER = "#FFB703";
export const GREEN = "#2D6A4F";
export const MUSTARD = "#7a5800";
export const ORANGE = "#F5741A";

export const POPPINS = 'Poppins, Montserrat, system-ui, sans-serif';

/* dimension colors (matches PTP_DIMENSION_COLORS) */
export const DIM_COLOR: Record<string, string> = {
  Protection: NAVY,
  Participation: TEAL,
  Prediction: GRAY,
  Purpose: PURPLE,
  Pleasure: AMBER,
};

/* ---------- pair shape mapping ---------- */
export const PAIR_SHAPE_KEYS = ["farApart", "bothHigh", "bothLow", "bothMedium", "mild"] as const;
export type PairShapeKey = (typeof PAIR_SHAPE_KEYS)[number];
export const PSC: Record<PairShapeKey, string> = {
  farApart: MUSTARD,
  bothHigh: GREEN,
  bothLow: NAVY,
  bothMedium: TEAL,
  mild: GRAY,
};
export const PAIR_SHAPE_TITLE: Record<PairShapeKey, string> = {
  farApart: "Far apart (opposite ends)",
  bothHigh: "Both high",
  bothLow: "Both low",
  bothMedium: "Both medium",
  mild: "Mild (small, soft difference)",
};
export const PAIR_SHAPE_SHORT: Record<PairShapeKey, { t: string; s: string }> = {
  farApart: { t: "Far apart", s: "opposite ends" },
  bothHigh: { t: "Both high", s: "both up here" },
  bothLow: { t: "Both low", s: "neither is high" },
  bothMedium: { t: "Both medium", s: "meet in the middle" },
  mild: { t: "Mild", s: "a soft difference" },
};

export function pairShapeKey(
  shape: string | null | undefined,
  a?: number,
  b?: number,
): PairShapeKey {
  const s = (shape ?? "").toLowerCase();
  if (s.includes("far apart") || s === "farapart") return "farApart";
  if (s.includes("both high")) return "bothHigh";
  if (s.includes("both low")) return "bothLow";
  if (s.includes("both medium") || s.includes("medium")) return "bothMedium";
  if (s.includes("mild")) return "mild";
  // fallback inference
  if (typeof a === "number" && typeof b === "number") {
    const diff = Math.abs(a - b);
    const mean = (a + b) / 2;
    if (diff >= 35) return "farApart";
    if (mean >= 65 && diff < 20) return "bothHigh";
    if (mean <= 35 && diff < 20) return "bothLow";
    if (diff < 12) return "bothMedium";
    return "mild";
  }
  return "mild";
}

/* ---------- tooltip ---------- */
export type Tip = { x: number; y: number; text: string } | null;
const TipCtx = { current: null as null | ((t: Tip) => void) };
export function useTipController() {
  const [tip, setTip] = useState<Tip>(null);
  useEffect(() => {
    TipCtx.current = setTip;
    return () => { TipCtx.current = null; };
  }, []);
  return tip;
}
export function showTip(e: React.MouseEvent, text: string) {
  TipCtx.current?.({
    x: Math.min(e.clientX + 12, window.innerWidth - 310),
    y: e.clientY + 14,
    text,
  });
}
export function hideTip() { TipCtx.current?.(null); }

/* ---------- small helpers ---------- */
export function hexAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function bandWord(v: number | null | undefined): string {
  if (typeof v !== "number") return "not scored";
  if (v >= 67) return "high";
  if (v <= 33) return "low";
  return "middle";
}

/* ---------- facet index entry (name-keyed) ---------- */
export interface FacetEntry {
  itemNumber: number;
  facetName: string;
  domain?: string | null;
  shape?: string | null;
  a?: number | null;
  b?: number | null;
}

/* ---------- shared anchor resolution ----------
   Facets promoted into strengths / focusAreas are not in the full map, so the
   chip has to try the driver anchor as well. Distinct prefixes so the two can
   never collide. */
export function findFacetAnchor(itemNumber?: number | null): HTMLElement | null {
  if (itemNumber == null) return null;
  return (
    document.getElementById(`facet-${itemNumber}`) ??
    document.getElementById(`driver-${itemNumber}`)
  );
}

export function jumpToFacet(itemNumber?: number | null): boolean {
  const el = findFacetAnchor(itemNumber);
  if (!el) return false; // nothing rendered for this facet — silent no-op
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.remove("pr-pulse");
  void el.offsetWidth;
  el.classList.add("pr-pulse");
  window.setTimeout(() => el.classList.remove("pr-pulse"), 1000);
  return true;
}

/** True only once an anchor for this facet actually exists in the DOM. */
export function useFacetAnchorExists(itemNumber?: number | null): boolean {
  const [exists, setExists] = useState(false);
  useEffect(() => {
    setExists(!!findFacetAnchor(itemNumber));
  }, [itemNumber]);
  return exists;
}

/** Chips rendered inside a Radix dialog sit above a scroll-locked, overlaid
 *  page: jumping while the dialog is open moves nothing the user can see. Any
 *  overlay surface must therefore hand the chip a closer. Without one the chip
 *  renders inert (default cursor, no hover lift, no handler) rather than
 *  looking clickable and doing nothing. */
export interface ChipOverlayProps {
  /** true when the chip is rendered inside a dialog / overlay surface */
  inOverlay?: boolean;
  /** closes that surface; required for a chip in an overlay to be clickable */
  onCloseOverlay?: () => void;
}

/** Shared jump behavior for every facet chip in the system. */
export function useChipJump(
  itemNumber: number | null | undefined,
  { inOverlay, onCloseOverlay }: ChipOverlayProps = {},
): { canJump: boolean; jump: () => void } {
  const anchorExists = useFacetAnchorExists(itemNumber);
  const canJump = anchorExists && (!inOverlay || !!onCloseOverlay);
  const jump = () => {
    if (!canJump) return;
    if (inOverlay && onCloseOverlay) {
      onCloseOverlay();
      // let the dialog unmount and release the body scroll lock first
      window.setTimeout(() => jumpToFacet(itemNumber), 240);
      return;
    }
    jumpToFacet(itemNumber);
  };
  return { canJump, jump };
}

/* ---------- facet chip ---------- */
export function FacetChip({
  name, entry, firstA, firstB, delay, size = "md", mode, inOverlay, onCloseOverlay,
}: {
  name: string;
  entry?: FacetEntry;
  firstA: string;
  firstB: string;
  delay: number;
  /** "sm" is used by the printed one-pager, where vertical space is fixed. */
  size?: "md" | "sm";
  /** Relationship mode; drives the displayed label only, never a lookup. */
  mode?: string | null;
} & ChipOverlayProps) {
  const base = entry?.domain ? DIM_COLOR[entry.domain] : undefined;
  const text = base ? (base === AMBER ? MUSTARD : base) : GRAY;
  const bg = base ? hexAlpha(base, 0.1) : "rgba(109,104,117,.08)";
  const border = base ? hexAlpha(base, 0.26) : "rgba(109,104,117,.22)";
  const tip = entry
    ? `${PAIR_SHAPE_SHORT[pairShapeKey(entry.shape, entry.a ?? undefined, entry.b ?? undefined)].t}. ${firstA} ${bandWord(entry.a)}, ${firstB} ${bandWord(entry.b)}`
    : null;

  const { canJump, jump } = useChipJump(entry?.itemNumber, { inOverlay, onCloseOverlay });

  return (
    <span
      className={canJump ? "pr-chip pr-chip-jump" : "pr-chip"}
      onClick={canJump ? jump : undefined}
      onMouseEnter={tip ? (e) => showTip(e, tip) : undefined}
      onMouseLeave={hideTip}
      style={{
        ["--pr-chip-delay" as string]: `${delay}ms`,
        display: "inline-block",
        borderRadius: 999,
        fontFamily: "Montserrat, system-ui, sans-serif",
        fontWeight: 600,
        fontSize: size === "sm" ? 7.6 : 10.5,
        padding: size === "sm" ? "1.5px 6px" : "3px 9px",
        background: bg,
        border: `1px solid ${border}`,
        color: text,
        cursor: canJump ? "pointer" : "default",
        whiteSpace: "nowrap",
      } as React.CSSProperties}
    >
      {facetDisplayLabel(name, mode)}
    </span>
  );
}
