import { CSSProperties } from "react";
import { Instagram, Youtube } from "lucide-react";

// BrainWise's social media accounts (single handle across all platforms).
// Brand note: destinations are branded "My BrainWise Coach" — keep our UI labels
// generic (platform names, not handles) to keep visitor attention on platform.
//
// Hover pattern note: this component uses inline onMouseEnter/Leave handlers
// rather than the CSS-class hover pattern used elsewhere (e.g. .bw-footer-link).
// That's intentional — hover target color is variant-dependent (white on dark
// surfaces, navy on light surfaces) and CSS classes can't cleanly express that
// without duplicating into two classes. Don't "fix" this to match the other pattern.
const SOCIAL_LINKS = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/mybrainwisecoach/",
    Icon: Instagram,
  },
  {
    name: "X",
    href: "https://x.com/mybrainwisecoach",
    Icon: XIcon,
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@mybrainwisecoach",
    Icon: TikTokIcon,
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@mybrainwisecoach",
    Icon: Youtube,
  },
];

type Variant = "onDark" | "onLight";

interface SocialLinksProps {
  /** "onDark" for navy/dark backgrounds (footer), "onLight" for cream/white backgrounds (contact page). */
  variant?: Variant;
  /** Render size in px for each icon (square). Default 20. */
  iconSize?: number;
  /** Horizontal gap between icons in px. Default 16. */
  gap?: number;
  /** Optional aria-label for the container. Default "Social media". */
  ariaLabel?: string;
}

export default function SocialLinks({
  variant = "onLight",
  iconSize = 20,
  gap = 16,
  ariaLabel = "Social media",
}: SocialLinksProps) {
  const iconColor =
    variant === "onDark" ? "rgba(255,255,255,0.72)" : "var(--bw-slate)";
  const iconHoverColor =
    variant === "onDark" ? "#ffffff" : "var(--bw-navy)";

  const linkStyle: CSSProperties = {
    color: iconColor,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 140ms",
    textDecoration: "none",
  };

  return (
    <nav
      aria-label={ariaLabel}
      style={{ display: "flex", gap, alignItems: "center" }}
    >
      {SOCIAL_LINKS.map(({ name, href, Icon }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`BrainWise on ${name}`}
          style={linkStyle}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = iconHoverColor;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = iconColor;
          }}
        >
          <Icon size={iconSize} aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
}

// ----- Custom SVG icons for platforms lucide-react doesn't ship -----

interface IconProps {
  size?: number;
  "aria-hidden"?: boolean | "true" | "false";
}

/** X (formerly Twitter) logo. Sized to match lucide's icon stroke convention. */
function XIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

/** TikTok logo. Single-color rendering using currentColor so it inherits link styling. */
function TikTokIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.81a8.16 8.16 0 0 0 4.77 1.52V6.89a4.85 4.85 0 0 1-1.84-.2Z" />
    </svg>
  );
}
