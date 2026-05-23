/**
 * Podcast feed reader.
 *
 * Reads the cached JSON snapshot of the My BrainWise Coach Spotify RSS feed.
 * The cache is refreshed every 4 hours by the `refresh-podcast-feed` Supabase
 * Edge Function (Class B internal-secret auth) on a pg_cron schedule. The page
 * reads the public Storage bucket URL directly — no DB roundtrip, CDN-cached.
 *
 * If the cache is somehow unavailable (network failure, bucket misconfigured),
 * the fetcher throws so callers can show a graceful error state. Do not retry
 * client-side; the cache is server-driven on a fixed schedule.
 */

export interface PodcastEpisode {
  guid: string;
  title: string;
  description_html: string;
  description_text: string;
  link: string;
  pub_date: string;
  duration_seconds: number | null;
  duration_display: string;
  audio_url: string;
  audio_size_bytes: number | null;
  episode_image: string | null;
  season: number | null;
  episode_number: number | null;
  episode_type: "full" | "bonus" | "trailer" | null;
}

export interface PodcastShow {
  title: string;
  description_html: string;
  description_text: string;
  link: string;
  language: string;
  author: string;
  email: string;
  image: string | null;
  category: string | null;
}

export interface PodcastFeed {
  fetched_at: string;
  episode_count: number;
  show: PodcastShow;
  episodes: PodcastEpisode[];
}

const CACHE_URL =
  "https://svprhtzawnbzmumxnhsq.supabase.co/storage/v1/object/public/podcast-feed/episodes.json";

export async function fetchPodcastFeed(): Promise<PodcastFeed> {
  const res = await fetch(CACHE_URL, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Podcast feed fetch failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as PodcastFeed;
  return data;
}

/**
 * Format a parsed pub_date (RFC 2822) into a short display date.
 * Returns e.g. "May 21, 2026" or empty string if parse fails.
 */
export function formatEpisodeDate(pub_date: string): string {
  if (!pub_date) return "";
  const d = new Date(pub_date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
