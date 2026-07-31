/**
 * Shared driving-facet selection for the PTP report.
 *
 * Replaces the previous mean ± 1 population SD rule, which produced an empty
 * high-scoring bucket whenever (mean + stdDev) exceeded the 100 ceiling.
 *
 * Rule:
 *   1. Split the respondent's items at their own median. Items above the median
 *      are high candidates; items below are low candidates. The median split is
 *      what guarantees the two lists are disjoint — a plain top-10/bottom-10 on
 *      a low-variance profile puts the same items in both lists.
 *   2. Take the top 10 of each side. Hard cap, no tie extension.
 *   3. Order deterministically: by score, then by itemNumber. itemNumber matches
 *      the ordering used by the responses accordion, so a facet's relative
 *      position is consistent across report sections.
 *
 * Reported counts (computed but not currently displayed anywhere — kept so the
 * metadata is available if we resurface it later):
 *   - totalCandidates: how many items fall on that side of the median.
 *   - tiedAtCut: how many items share the score of the 10th-ranked item, when
 *     the cut splits a tie.
 *
 * A perfectly flat profile yields two empty lists, which the callers already
 * render as "Your scores are evenly distributed across all facets."
 */

export const DRIVING_FACET_LIMIT = 10;

export interface DrivingFacetSide<T> {
  items: T[];
  totalCandidates: number;
  /** Score shared by the items at the cut boundary, or null if no tie is split. */
  cutValue: number | null;
  /** How many items share cutValue. Only meaningful when cutValue is non-null. */
  tiedAtCut: number;
}

export interface DrivingFacetSelection<T> {
  elevated: DrivingFacetSide<T>;
  suppressed: DrivingFacetSide<T>;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function buildSide<T extends { value: number }>(
  candidates: T[],
): DrivingFacetSide<T> {
  const items = candidates.slice(0, DRIVING_FACET_LIMIT);
  if (candidates.length <= DRIVING_FACET_LIMIT) {
    return { items, totalCandidates: candidates.length, cutValue: null, tiedAtCut: 0 };
  }
  const boundary = candidates[DRIVING_FACET_LIMIT - 1].value;
  const tiedAtCut = candidates.filter((c) => c.value === boundary).length;
  // Only report a split tie if the tie actually extends past the cut.
  const splittingATie = candidates[DRIVING_FACET_LIMIT]?.value === boundary;
  return {
    items,
    totalCandidates: candidates.length,
    cutValue: splittingATie ? boundary : null,
    tiedAtCut: splittingATie ? tiedAtCut : 0,
  };
}

export function selectDrivingFacets<
  T extends { value: number; itemNumber: number }
>(items: T[]): DrivingFacetSelection<T> {
  const emptySide: DrivingFacetSide<T> = {
    items: [],
    totalCandidates: 0,
    cutValue: null,
    tiedAtCut: 0,
  };
  if (!items.length) return { elevated: emptySide, suppressed: emptySide };

  const med = median(items.map((i) => i.value));

  const highCandidates = items
    .filter((i) => i.value > med)
    .sort((a, b) => b.value - a.value || a.itemNumber - b.itemNumber);

  const lowCandidates = items
    .filter((i) => i.value < med)
    .sort((a, b) => a.value - b.value || a.itemNumber - b.itemNumber);

  return {
    elevated: buildSide(highCandidates),
    suppressed: buildSide(lowCandidates),
  };
}
