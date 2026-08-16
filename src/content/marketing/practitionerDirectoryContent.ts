// Static copy for the public Practitioner Directory pages.
// Last updated: August 16, 2026

export const meta = {
  heroEyebrow: "Certified Practitioners",
  heroTitle: "Find a Certified BrainWise Practitioner.",
  heroSubhead:
    "Every practitioner listed here has completed BrainWise certification and holds a live credential. Browse the directory and reach out to whoever fits the work you want to do.",

  explainerEyebrow: "What certification means",
  explainerTitle: "Certified means trained, assessed, and current.",
  explainerBody:
    "Certified practitioners have completed the structured BrainWise curriculum, practiced live debriefs under observation, and been assessed before certification. Listings appear only while a credential is live and only with the practitioner's consent, so nobody shows up here by default.",

  filtersLabel: "Filter the directory",
  searchPlaceholder: "Search by name, focus, or location",
  clearFilters: "Clear filters",

  emptyDirectoryTitle: "The directory is not populated yet.",
  emptyDirectoryBody:
    "No practitioners have published a listing so far. Certified practitioners choose whether to appear here, so this page fills up as they opt in. Check back soon.",

  emptyResultsTitle: "No practitioners match those filters.",
  emptyResultsBody:
    "Try widening the location, clearing the certification filter, or searching for a different term.",

  loadErrorTitle: "We couldn't load the directory right now.",
  retryLabel: "Try again",

  profileNotFoundTitle: "We couldn't find that practitioner.",
  profileNotFoundBody:
    "This listing may have been removed, or the link may be wrong. Browse the full directory to find a certified practitioner.",

  backToDirectory: "Back to all practitioners",
};

export const CERT_LABELS: Record<string, string> = {
  ptp_coach: "PTP Coach",
  ai_transformation_coach: "AI Transformation Coach",
  ai_transformation_ptp_coach: "AI Transformation and PTP Coach",
  my_brainwise_coach: "My BrainWise Coach",
};

export function certLabel(raw: string): string {
  return CERT_LABELS[raw] ?? raw.replace(/_/g, " ");
}
