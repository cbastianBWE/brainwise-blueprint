import { Compass } from "lucide-react";

/**
 * Rewrites a Supabase public storage URL to the image render endpoint with
 * width/height/quality. Non-Supabase URLs pass through unchanged; null returns
 * undefined. (Same behaviour as the coaching catalogue's transform — copied
 * deliberately rather than imported, so the two surfaces stay decoupled.)
 */
export const renderImg = (
  url: string | null | undefined,
  w: number,
  h: number,
): string | undefined => {
  if (!url) return undefined;
  const transformed = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/",
  );
  if (transformed === url) return url;
  const sep = transformed.includes("?") ? "&" : "?";
  return `${transformed}${sep}width=${w}&height=${h}&resize=cover&quality=70`;
};

export function BrandedPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/40">
      <Compass className="h-10 w-10 text-muted-foreground" />
    </div>
  );
}

export interface ModuleRow {
  module_number: number;
  title: string | null;
  description: string | null;
  learning_outcomes: string[] | null;
  tags: string[] | null;
  prerequisites: string | null;
  hero_image_url: string | null;
}

/** A single activity row as shown inside a milestone briefing. */
export interface MilestoneActivityRow {
  id: string;
  code: string;
  title: string;
  allowed: boolean;
  /** Machine key plus payload. Never rendered — see LockNotice. */
  reason: string | null;
  /** Bare reason key, for display mapping. */
  reason_code?: string | null;
  /** Blocking activity titles, journey order. */
  reason_detail?: string[] | null;
  own_status: string | null;
  partner_status: string | null;
}


export interface ActivityBriefing {
  description?: string;
  learning_outcomes?: string[];
  time_estimate?: string;
  prerequisites?: string;
  hero_image_url?: string;
}

export interface CatalogueActivity {
  id: string;
  code: string;
  title: string;
  module_number: number | null;
  sequence: number | null;
  tags: string[] | null;
  hero_image_url: string | null;
  definition: { briefing?: ActivityBriefing } | null;
  est_minutes_low: number | null;
  est_minutes_high: number | null;
}

export function getBriefing(a: CatalogueActivity | undefined | null): ActivityBriefing | null {
  const def = a?.definition;
  if (def && typeof def === "object" && def.briefing && typeof def.briefing === "object") {
    return def.briefing as ActivityBriefing;
  }
  return null;
}

export function minuteRange(
  rows: Array<{ est_minutes_low: number | null; est_minutes_high: number | null }>,
): { low: number; high: number } | null {
  let low = 0;
  let high = 0;
  let any = false;
  for (const r of rows) {
    if (r.est_minutes_low != null) {
      low += r.est_minutes_low;
      any = true;
    }
    if (r.est_minutes_high != null) {
      high += r.est_minutes_high;
      any = true;
    }
  }
  if (!any) return null;
  return { low, high: Math.max(high, low) };
}
