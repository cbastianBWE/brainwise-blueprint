/**
 * Shared driving-facet selection for the PTP report.
 *
 * Replaces the previous mean ± 1 population SD rule, which produced an empty
 * high-scoring bucket whenever (mean + stdDev) exceeded the 100 ceiling.
 *
 * Rule:
 *   1. Split the respondent's items at their own median. Items above the median
 *      are high candidates; items below are low candidates. This guarantees the
 *      two lists are disjoint.
 *   2. Within each side, take the top 10 by score, extended to include every
 *      item tied with the 10th. Ties come in whole rather than being truncated
 *      arbitrarily.
 *   3. Order deterministically: by score, then by facetName as a stable
 *      tiebreak, so the same respondent sees the same list on every load.
 *
 * A perfectly flat profile yields two empty lists, which the callers already
 * render as "Your scores are evenly distributed across all facets."
 */

export const DRIVING_FACET_TARGET_COUNT = 10;

export interface DrivingFacetSelection<T> {
  elevated: T[];
  suppressed: T[];
  totalElevated: number;
  totalSuppressed: number;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/** Take the first `n`, then keep extending while tied with the nth. */
function takeWithTies<T extends { value: number }>(sorted: T[], n: number): T[] {
  if (sorted.length <= n) return [...sorted];
  const cut = sorted[n - 1].value;
  const result: T[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i < n || sorted[i].value === cut) result.push(sorted[i]);
    else break;
  }
  return result;
}

export function selectDrivingFacets<
  T extends { value: number; facetName: string }
>(items: T[]): DrivingFacetSelection<T> {
  const empty: DrivingFacetSelection<T> = {
    elevated: [],
    suppressed: [],
    totalElevated: 0,
    totalSuppressed: 0,
  };
  if (!items.length) return empty;

  const med = median(items.map((i) => i.value));

  const highCandidates = items
    .filter((i) => i.value > med)
    .sort((a, b) => b.value - a.value || a.facetName.localeCompare(b.facetName));

  const lowCandidates = items
    .filter((i) => i.value < med)
    .sort((a, b) => a.value - b.value || a.facetName.localeCompare(b.facetName));

  const elevated = takeWithTies(highCandidates, DRIVING_FACET_TARGET_COUNT);
  const suppressed = takeWithTies(lowCandidates, DRIVING_FACET_TARGET_COUNT);

  return {
    elevated,
    suppressed,
    totalElevated: elevated.length,
    totalSuppressed: suppressed.length,
  };
}
