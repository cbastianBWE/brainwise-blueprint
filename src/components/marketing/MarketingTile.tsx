import { CSSProperties, KeyboardEvent, useState } from "react";
import type { MarketingCardData } from "./types";

export type { MarketingCardData } from "./types";

interface Props {
  card: MarketingCardData;
  onOpen: () => void;
}

export default function MarketingTile({ card, onOpen }: Props) {
  const [hover, setHover] = useState(false);
  const isComingSoon = card.status === "coming_soon";

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  const surface: CSSProperties = {
    background: "white",
    border: `1px solid ${hover ? "var(--bw-orange-100)" : "var(--border-1)"}`,
    borderRadius: "var(--r-lg)",
    padding: 24,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    height: "100%",
    transition:
      "box-shadow var(--dur-med) var(--ease-standard), border-color var(--dur-med) var(--ease-standard), transform var(--dur-med) var(--ease-standard)",
    boxShadow: hover ? "var(--shadow-md)" : "none",
    transform: hover ? "translateY(-2px)" : "translateY(0)",
    outline: "none",
    textAlign: "left",
    position: "relative",
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={surface}
    >
      {isComingSoon && (
        <span
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            padding: "4px 10px",
            background: "var(--bw-cream-300)",
            color: "var(--bw-slate)",
            fontSize: 11,
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            borderRadius: "var(--r-pill)",
          }}
        >
          Coming Soon
        </span>
      )}

      <div
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--bw-orange)",
          marginBottom: 6,
        }}
      />

      <h3
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: 18,
          color: "var(--bw-navy)",
          margin: 0,
          lineHeight: 1.25,
          paddingRight: isComingSoon ? 96 : 0,
        }}
      >
        {card.title}
      </h3>

      <p
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 400,
          fontSize: 14,
          color: "var(--bw-slate)",
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {card.summary}
      </p>

      <div
        style={{
          marginTop: "auto",
          paddingTop: 16,
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 600,
          fontSize: 12,
          color: "var(--bw-orange)",
          alignSelf: "flex-end",
        }}
      >
        Learn more →
      </div>
    </div>
  );
}
