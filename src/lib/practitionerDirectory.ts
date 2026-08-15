export const PD_BUCKET = "practitioner-headshots";
export const PD_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const PD_MAX_BYTES = 10 * 1024 * 1024;

export interface PdNotice {
  version_id: string;
  version_hash: string;
  body_markdown: string;
}

export interface PdConsent {
  user_id: string;
  listed: boolean;
  decision_version_id: string | null;
  consented_at: string | null;
  consent_recorded_at: string | null;
  consent_source: string | null;
  withdrawn_at: string | null;
  updated_at: string | null;
}

export interface PdProfile {
  user_id: string;
  slug: string | null;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  website_url: string | null;
  booking_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  x_url: string | null;
  headshot_path: string | null;
  moderation_status: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  approved_payload: Record<string, unknown> | null;
  approved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PdState {
  is_certified: boolean;
  notice: PdNotice | null;
  consent: PdConsent | null;
  has_decided: boolean;
  profile: PdProfile | null;
  missing_fields: string[];
  needs_completion: boolean;
}

/** Human wording for the server-driven missing_fields list. */
export const PD_MISSING_LABELS: Record<string, string> = {
  display_name: "your display name",
  bio: "a short bio",
  headshot: "a photo",
  city: "your city",
  country: "your country",
};

export function pdMissingLabel(field: string): string {
  return PD_MISSING_LABELS[field] ?? field.replace(/_/g, " ");
}

export const PD_STATUS_LINE: Record<string, string> = {
  draft: "Not submitted yet. Finish the required fields to send it for review.",
  submitted: "Submitted and waiting for BrainWise review.",
  approved: "Live in the directory.",
  rejected: "Not approved.",
};
