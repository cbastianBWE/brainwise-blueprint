import { supabase } from "@/integrations/supabase/client";

export interface PublicCertification {
  certification_type: string;
  certified_at: string | null;
}

export interface PublicPractitioner {
  slug: string;
  display_name: string;
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
  certifications: PublicCertification[] | null;
}

export function headshotUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from("practitioner-headshots").getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function locationOf(p: {
  city: string | null;
  region: string | null;
  country: string | null;
}): string {
  return [p.city, p.region, p.country].filter(Boolean).join(", ");
}

export function truncateWords(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:]$/, "")}…`;
}
