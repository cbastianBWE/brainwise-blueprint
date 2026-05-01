import { CSSProperties, KeyboardEvent, useId } from "react";
import { Link } from "react-router-dom";
import MarketingButton from "./MarketingButton";
import type { ServiceCard } from "@/content/marketing/servicesContent";

interface Props {
  card: ServiceCard;
  isOpen: boolean;
  onToggle: () => void;
  onOpenBriefing: () => void;
}

export default function ServiceAccordionCard({ card, isOpen, onToggle, onOpenBriefing }: Props) {
  const titleId = useId();
  const regionId = useId();

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  const surface: CSSProperties = {
    background: "white",
    border: `1px solid ${isOpen ? "var(--bw-orange-100)" : "var(--border-1)"}`,
    borderRadius: "var(--r-lg)",
    padding: 24,
    cursor: "pointer",
    position: "relative",
    transition: "box-shadow var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)",
    boxShadow: isOpen ? "var(--shadow-md)" : "none",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    outline: "none",
  };

  const ctaContent = (() => {
    const handleCtaClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (card.cta.action === "open-briefing") onOpenBriefing();
    };

    if (card.cta.action === "navigate" && card.cta.to) {
      return (
        <MarketingButton
          as={Link}
          to={card.cta.to}
          variant="primary"
          size="md"
          onClick={handleCtaClick}
        >
          {card.cta.label}
        </MarketingButton>
      );
    }
    return (
      <MarketingButton variant="primary" size="md" onClick={handleCtaClick}>
        {card.cta.label}
      </MarketingButton>
    );
  })();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      aria-controls={regionId}
      onClick={onToggle}
      onKeyDown={onKeyDown}
      style={surface}
      onMouseEnter={(e) => {
        if (!isOpen) (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        if (!isOpen) (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Accent dot */}
      <div
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--bw-orange)",
          marginBottom: 14,
        }}
      />

      <h3
        id={titleId}
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: 18,
          color: "var(--bw-navy)",
          margin: 0,
          lineHeight: 1.25,
          paddingRight: 28,
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
          marginTop: 10,
          marginBottom: 0,
        }}
      >
        {card.summary}
      </p>

      {/* Chevron */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          color: "var(--bw-slate)",
          transition: "transform var(--dur-med) var(--ease-standard)",
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          display: "flex",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Expanded region */}
      <div
        id={regionId}
        role="region"
        aria-labelledby={titleId}
        style={{
          maxHeight: isOpen ? 1000 : 0,
          opacity: isOpen ? 1 : 0,
          overflow: "hidden",
          transition: "max-height var(--dur-med) var(--ease-standard), opacity var(--dur-med) var(--ease-standard)",
        }}
      >
        <div style={{ paddingTop: 18, paddingBottom: 8 }}>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 400,
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--bw-slate-700)",
              margin: 0,
            }}
          >
            {card.body}
          </p>

          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "var(--bw-orange)",
              marginTop: 22,
            }}
          >
            What you get
          </div>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "16px 0 0",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {card.benefits.map((b, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "var(--bw-slate-700)",
                }}
              >
                <span
                  aria-hidden
                  style={{ color: "var(--bw-orange)", fontWeight: 700, lineHeight: 1.55, flex: "0 0 auto" }}
                >
                  ✓
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 24 }}>{ctaContent}</div>
        </div>
      </div>
    </div>
  );
}
