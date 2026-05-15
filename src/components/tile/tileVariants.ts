import type { LucideIcon } from "lucide-react";

/**
 * Unified Tile component variants.
 * Used across the Resources page (Group X+Y) and all detail pages (Group Z).
 */
export type TileVariant =
  | "resource"
  | "cert_path"
  | "curriculum"
  | "module"
  | "content_item";

/**
 * Completion status common to learning-tree tile variants (cert_path / curriculum /
 * module / content_item). Resources don't have completion status.
 *
 * - "in_progress": the user has started but not completed
 * - "completed": the user has completed (or "certified" for cert_path)
 *
 * `null` means not started OR not enrolled. The tile renders no status pill.
 */
export type CompletionStatus = "in_progress" | "completed" | null;

/**
 * The required/optional badge state shown in the bottom metadata row.
 * `null` means "don't show a required/optional badge at all" (e.g., for resources).
 */
export type RequiredState = "required" | "optional" | null;

/**
 * Content type for resource tiles. Drives the bottom-right pill on resource tiles
 * (in place of completion status, which resources don't have).
 */
export type ResourceContentType =
  | "article"
  | "video"
  | "guide"
  | "worksheet"
  | "template";

/**
 * Instrument badges for cert path tiles. Locked dimension colors per the brand system:
 *   PTP   = Navy    (--bw-navy)
 *   NAI   = Mustard (--bw-mustard)
 *   AIRSA = Forest  (--bw-forest)
 *   HSS   = Slate   (--bw-slate)
 */
export type InstrumentCode = "INST-001" | "INST-002" | "INST-003" | "INST-004";

export const INSTRUMENT_BADGE_LABEL: Record<InstrumentCode, string> = {
  "INST-001": "PTP",
  "INST-002": "NAI",
  "INST-003": "AIRSA",
  "INST-004": "HSS",
};

export const INSTRUMENT_BADGE_BG: Record<InstrumentCode, string> = {
  "INST-001": "var(--bw-navy)",
  "INST-002": "var(--bw-mustard)",
  "INST-003": "var(--bw-forest)",
  "INST-004": "var(--bw-slate)",
};

/**
 * Item type strings for content_item tiles. Drives the item-type chip in the
 * bottom metadata row. Maps the 8 database CHECK values to user-facing labels.
 */
export const CONTENT_ITEM_TYPE_LABEL: Record<string, string> = {
  video: "Video",
  quiz: "Quiz",
  written_summary: "Written summary",
  skills_practice: "Skills practice",
  file_upload: "Submission",
  external_link: "External link",
  live_event: "Live event",
  lesson_blocks: "Lesson",
};
