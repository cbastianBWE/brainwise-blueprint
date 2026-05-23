/**
 * Static podcast page content.
 *
 * Episode data flows from the cached RSS feed (see src/lib/podcastFeed.ts).
 * This file carries only the brand metadata that RSS doesn't expose — the
 * multi-platform listen URLs from the BrainWise Beacons link aggregator, and
 * hand-tuned hero copy.
 *
 * Verified May 23, 2026 against the production Beacons page.
 */

export interface ListenPlatform {
  name: string;
  href: string;
  /** Primary platforms shown in the first row; secondary platforms in the "More ways to listen" expandable section. */
  tier: "primary" | "secondary";
}

export const LISTEN_PLATFORMS: ListenPlatform[] = [
  // Primary — the three platforms that cover 90%+ of listeners
  { name: "Apple Podcasts", href: "https://podcasts.apple.com/us/podcast/my-brainwise-coach/id1823765544", tier: "primary" },
  { name: "Spotify",        href: "https://open.spotify.com/show/3l9vMGcHuZ7nzInXY3dWev",                  tier: "primary" },
  { name: "YouTube",        href: "https://www.youtube.com/@mybrainwisecoach",                            tier: "primary" },
  // Secondary — long-tail platforms
  { name: "Amazon Music",   href: "https://music.amazon.com/podcasts/e7695355-4f22-40dd-abe9-deed3b06ee73/my-brainwise-coach", tier: "secondary" },
  { name: "iHeart",         href: "https://www.iheart.com/podcast/1333-my-brainwise-coach-286036844/",    tier: "secondary" },
  { name: "Pandora",        href: "https://www.pandora.com/podcast/my-brainwise-coach/PC:1001110015",     tier: "secondary" },
  { name: "Castbox",        href: "https://castbox.fm/channel/id6664240",                                 tier: "secondary" },
  { name: "Deezer",         href: "https://www.deezer.com/us/show/1002290202",                            tier: "secondary" },
];

export const podcastMeta = {
  /** Tagline shown below the title in the hero. */
  tagline: "Stay Curious. Stay Compassionate. Stay BrainWise.",
  /** Pagination size for the archive grid. */
  episodesPerPage: 12,
  /** Hosts string for SEO + page footer credit (RSS author field is "My BrainWise Coach", not the host names). */
  hosts: "Cole Bastian and Phil Dixon",
};
