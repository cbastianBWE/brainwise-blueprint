import { CSSProperties, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { LISTEN_PLATFORMS } from "@/content/marketing/podcastContent";

type Variant = "onDark" | "onLight";

interface PodcastListenBadgesProps {
  /** "onDark" for navy hero, "onLight" for cream sections. */
  variant?: Variant;
}

/**
 * Multi-platform listen-badge row for the podcast page.
 *
 * Primary tier (Apple/Spotify/YouTube) renders as a row of three "pill" buttons.
 * Secondary tier (iHeart/Pandora/Castbox/Deezer/Amazon Music/RSS) is hidden
 * behind an expandable "More ways to listen" toggle.
 *
 * Hover pattern: inline handlers, variant-dependent color targets — same
 * rationale as SocialLinks.tsx. Don't refactor to CSS classes.
 */
export default function PodcastListenBadges({ variant = "onLight" }: PodcastListenBadgesProps) {
  const [expanded, setExpanded] = useState(false);
  const primary = LISTEN_PLATFORMS.filter((p) => p.tier === "primary");
  const secondary = LISTEN_PLATFORMS.filter((p) => p.tier === "secondary");

  const isDark = variant === "onDark";
  const pillBg = isDark ? "rgba(255,255,255,0.10)" : "#fff";
  const pillBgHover = isDark ? "rgba(255,255,255,0.18)" : "var(--bw-cream-200)";
  const pillBorder = isDark ? "rgba(255,255,255,0.18)" : "var(--border-1)";
  const pillText = isDark ? "#fff" : "var(--bw-navy)";
  const toggleColor = isDark ? "rgba(255,255,255,0.78)" : "var(--bw-slate)";
  const toggleHoverColor = isDark ? "#fff" : "var(--bw-navy)";

  const pillStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 18px",
    background: pillBg,
    border: `1px solid ${pillBorder}`,
    borderRadius: 999,
    color: pillText,
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 600,
    fontSize: 14,
    textDecoration: "none",
    transition: "background 140ms",
  };

  const renderPill = (name: string, href: string) => (
    <a
      key={name}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={pillStyle}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = pillBgHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = pillBg;
      }}
    >
      {name}
    </a>
  );

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {primary.map((p) => renderPill(p.name, p.href))}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="podcast-secondary-platforms"
        style={{
          marginTop: 14,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: "transparent",
          border: "none",
          padding: "4px 0",
          cursor: "pointer",
          color: toggleColor,
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 500,
          fontSize: 13,
          transition: "color 140ms",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = toggleHoverColor;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = toggleColor;
        }}
      >
        {expanded ? "Fewer ways" : "More ways to listen"}
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div
          id="podcast-secondary-platforms"
          style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}
        >
          {secondary.map((p) => renderPill(p.name, p.href))}
        </div>
      )}
    </div>
  );
}
