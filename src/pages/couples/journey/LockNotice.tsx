/**
 * Plain-English lock reasons for the couples journey.
 *
 * The RPC still returns `reason` (machine key plus payload) because the runner
 * and `relationship_session_start` branch on it. Nothing here reads it — the
 * display path uses `reason_code` and `reason_detail` only. A raw code in
 * front of a participant is a defect, so an unrecognised code falls back to
 * "Not open yet." rather than printing whatever it was handed.
 */

/** Codes that mean "you're allowed in" — nothing to say. */
const PASS_CODES = new Set([
  "ok",
  "super_admin",
  "entitlement",
  "product_purchase",
]);

/**
 * Codes whose sentence is completed by the blocking-activity pills. Everything
 * else in the table below is a complete sentence on its own.
 */
const PILL_CODES = new Set(["prerequisite_incomplete", "awaiting_partner"]);

const FALLBACK = "Not open yet.";

function sentenceFor(code: string, otherName: string): string {
  switch (code) {
    case "prerequisite_incomplete":
      return "Opens once you have finished";
    case "awaiting_partner":
      return `Opens once ${otherName} has finished`;
    case "catch_up_required":
      return "There's something waiting for you to read. Open that first.";
    case "paced_by_practitioner":
      return "Your practitioner has paused the journey here for now.";
    case "practitioner_opens_this":
      return "Your practitioner opens this one.";
    case "paired_profile_not_released":
      return "Opens once your paired profile has been released to you both.";
    case "paired_profile_required":
      return "Opens once your paired profile is ready.";
    case "romantic_profile_required":
      return "This journey needs a romantic paired profile.";
    case "purchase_required":
      return "Opens once the journey has been purchased for the two of you.";
    case "focus_area_not_selected":
      return "You have not chosen this focus area.";
    case "denied":
    case "unavailable":
    case "not_found":
      return "Not available.";
    default:
      return FALLBACK;
  }
}

const norm = (s: string) => s.trim().toLowerCase();

export interface LockNoticeProps {
  /** Bare reason key from `relationship_journey_state.reason_code`. */
  reasonCode: string | null | undefined;
  /** Blocking activities as real titles, journey order. Null for most codes. */
  reasonDetail?: string[] | null;
  otherName: string;
  /**
   * Titles of the *other* activities in the same milestone. Used to detect a
   * Together session that waits on its whole milestone, which collapses to one
   * sentence instead of a wall of pills.
   */
  siblingTitles?: string[];
  /** Resolves a blocking activity title to its code and current lock state. */
  lookupByTitle?: (title: string) => { code: string; allowed: boolean } | null;
  /** Opens the blocking activity's own briefing dialog. */
  onOpenActivity?: (code: string) => void;
  className?: string;
}

export default function LockNotice({
  reasonCode,
  reasonDetail,
  otherName,
  siblingTitles,
  lookupByTitle,
  onOpenActivity,
  className,
}: LockNoticeProps) {
  const code = (reasonCode || "").trim();
  if (!code || PASS_CODES.has(code)) return null;

  let sentence = sentenceFor(code, otherName);
  const usesPills = PILL_CODES.has(code);

  const detail = usesPills ? (reasonDetail || []).filter(Boolean) : [];
  let pills = detail;
  let overflow = 0;

  if (usesPills) {
    if (detail.length === 0) {
      // Structured detail missing — keep the sentence readable on its own.
      sentence =
        code === "awaiting_partner"
          ? `Opens once ${otherName} has finished the earlier activities.`
          : "Opens once you have finished the earlier activities.";
      pills = [];
    } else {
      const siblings = (siblingTitles || []).map(norm);
      const blockers = new Set(detail.map(norm));
      const wholeMilestone =
        siblings.length > 0 &&
        detail.length > 3 &&
        siblings.length === blockers.size &&
        siblings.every((t) => blockers.has(t));

      if (wholeMilestone) {
        sentence =
          code === "awaiting_partner"
            ? `Opens once ${otherName} has finished the other ${detail.length} in this milestone.`
            : `Opens once you have finished the other ${detail.length} in this milestone.`;
        pills = [];
      } else if (detail.length > 3) {
        pills = detail.slice(0, 3);
        overflow = detail.length - 3;
      }
    }
  }

  return (
    <div className={"space-y-1.5 " + (className || "")}>
      <p className="text-xs text-muted-foreground">{sentence}</p>
      {pills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {pills.map((title) => {
            const hit = lookupByTitle?.(title) || null;
            const tappable = !!hit?.allowed && !!onOpenActivity;
            const base =
              "inline-block rounded-full px-2.5 py-1 text-[11px] leading-none " +
              // Sand, not orange: orange is reserved for CTAs and gates, and a
              // prerequisite is neither. Quieter than the title above it.
              "bg-[hsl(40_38%_92%)] text-[hsl(222_47%_20%)]";
            return tappable ? (
              <button
                key={title}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenActivity?.(hit!.code);
                }}
                className={base + " transition-opacity hover:opacity-80"}
              >
                {title}
              </button>
            ) : (
              <span key={title} className={base}>
                {title}
              </span>
            );
          })}
          {overflow > 0 && (
            <span className="text-[11px] text-muted-foreground">+{overflow} more</span>
          )}
        </div>
      )}
    </div>
  );
}
