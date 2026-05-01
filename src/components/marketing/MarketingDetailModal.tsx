import { CSSProperties, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import MarketingButton from "./MarketingButton";
import type { MarketingCardData } from "./types";

interface Props {
  card: MarketingCardData | null;
  onClose: () => void;
  onOpenBriefing: () => void;
}

export default function MarketingDetailModal({ card, onClose, onOpenBriefing }: Props) {
  const titleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!card) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => closeBtnRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
    };
  }, [card, onClose]);

  if (!card) return null;

  const eyebrowStyle: CSSProperties = {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "var(--bw-orange)",
  };

  const handleCtaClick = () => {
    if (card.cta.action === "open-briefing") {
      onClose();
      setTimeout(() => onOpenBriefing(), 0);
    }
  };

  const ctaButton =
    card.cta.action === "navigate" ? (
      <MarketingButton as={Link} to={card.cta.to} variant="primary" size="md" onClick={onClose}>
        {card.cta.label}
      </MarketingButton>
    ) : (
      <MarketingButton variant="primary" size="md" onClick={handleCtaClick}>
        {card.cta.label}
      </MarketingButton>
    );

  return createPortal(
    <div className="bw-marketing-root">
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2,15,28,0.82)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          zIndex: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "white",
            width: "min(640px, 92vw)",
            maxHeight: "92vh",
            overflowY: "auto",
            borderRadius: 22,
            padding: 40,
            boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
            position: "relative",
          }}
        >
          <button
            ref={closeBtnRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 36,
              height: 36,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--bw-slate)",
              borderRadius: 8,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--bw-navy)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--bw-slate)")}
          >
            <X size={18} />
          </button>

          <div style={eyebrowStyle}>Detail</div>

          <h2
            id={titleId}
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: 28,
              color: "var(--bw-navy)",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              marginTop: 4,
              marginBottom: 16,
            }}
          >
            {card.title}
          </h2>

          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 400,
              fontSize: 15,
              lineHeight: 1.7,
              color: "var(--bw-slate-700)",
              marginTop: 0,
              marginBottom: 24,
            }}
          >
            {card.body}
          </p>

          {card.benefits.length > 0 && (
            <>
              <div
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: "var(--bw-orange)",
                  marginBottom: 12,
                }}
              >
                What you get
              </div>

              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
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
                      fontWeight: 400,
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: "var(--bw-slate-700)",
                    }}
                  >
                    <span aria-hidden style={{ color: "var(--bw-orange)", fontWeight: 700, flex: "0 0 auto" }}>
                      ✓
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div style={{ marginTop: 32 }}>{ctaButton}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
