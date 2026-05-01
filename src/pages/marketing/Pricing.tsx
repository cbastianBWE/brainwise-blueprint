import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "@/styles/marketing-tokens.css";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingButton from "@/components/marketing/MarketingButton";
import Eyebrow from "@/components/marketing/Eyebrow";
import BriefingModal from "@/components/marketing/BriefingModal";
import { PLANS, ASSESSMENT_PURCHASE, type PlanTier } from "@/lib/stripe";
import { coachPricing, type CoachPricingItem } from "@/content/marketing/coachPricingContent";

type Segment = "individual" | "coach" | "enterprise";

function hashToSegment(hash: string): Segment {
  const h = hash.replace("#", "");
  if (h === "coach") return "coach";
  if (h === "enterprise") return "enterprise";
  return "individual";
}

const sectionHeading = (text: string): React.CSSProperties => ({});

const headingStyle: React.CSSProperties = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 700,
  fontSize: 28,
  color: "var(--bw-navy)",
  margin: 0,
  lineHeight: 1.2,
};

const subheadStyle: React.CSSProperties = {
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 400,
  fontSize: 15,
  color: "var(--bw-slate)",
  marginTop: 8,
  marginBottom: 0,
  lineHeight: 1.55,
};

const comingSoonBadge: React.CSSProperties = {
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
};

function PricingIndividual({ isMobile, onSignup }: { isMobile: boolean; onSignup: () => void }) {
  const tiers = Object.entries(PLANS) as [PlanTier, (typeof PLANS)[PlanTier]][];

  return (
    <div>
      <h2 style={headingStyle}>For individuals.</h2>
      <p style={subheadStyle}>Self-paced subscriptions and one-time assessment purchases.</p>

      <div
        style={{
          marginTop: 48,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
          gap: 24,
        }}
      >
        {tiers.map(([tier, plan]) => {
          const isPremium = tier === "premium";
          const annualSavings = Math.round(plan.monthly.price * 12 - plan.annual.price);
          return (
            <div
              key={tier}
              style={{
                position: "relative",
                background: "white",
                border: `${isPremium ? 2 : 1}px solid ${isPremium ? "var(--bw-orange)" : "var(--border-1)"}`,
                borderRadius: "var(--r-lg)",
                padding: 32,
                boxShadow: isPremium ? "var(--shadow-md)" : "none",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {isPremium && (
                <span
                  style={{
                    position: "absolute",
                    top: -12,
                    right: 24,
                    background: "var(--bw-orange)",
                    color: "white",
                    padding: "4px 12px",
                    fontSize: 11,
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    borderRadius: "var(--r-pill)",
                  }}
                >
                  Recommended
                </span>
              )}
              <h3
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: 22,
                  color: "var(--bw-navy)",
                  margin: 0,
                }}
              >
                {plan.name}
              </h3>
              <div>
                <span
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 800,
                    fontSize: 36,
                    color: "var(--bw-navy)",
                  }}
                >
                  ${plan.monthly.price}
                </span>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 14, color: "var(--bw-slate)", marginLeft: 6 }}>
                  /month
                </span>
              </div>
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 13, color: "var(--bw-slate)", margin: 0 }}>
                Or ${plan.annual.price}/year (save ${annualSavings})
              </p>
              <div style={{ height: 1, background: "var(--border-1)" }} />
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  flex: 1,
                }}
              >
                {plan.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: 14,
                      color: "var(--bw-slate-700)",
                      lineHeight: 1.5,
                    }}
                  >
                    <span aria-hidden style={{ color: "var(--bw-orange)", fontWeight: 700 }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <MarketingButton variant={isPremium ? "primary" : "secondary"} size="md" onClick={onSignup} fullWidth>
                Get Started
              </MarketingButton>
            </div>
          );
        })}
      </div>

      <div style={{ height: 1, background: "var(--border-1)", margin: "56px 0 40px" }} />

      <div>
        <h3 style={{ ...headingStyle, fontSize: 20 }}>Or buy a single assessment</h3>
        <p style={subheadStyle}>
          ${ASSESSMENT_PURCHASE.price} per assessment. Available for {ASSESSMENT_PURCHASE.instruments.join(", ")}.
        </p>
        <div style={{ marginTop: 20 }}>
          <MarketingButton variant="secondary" size="md" onClick={onSignup}>
            Get Started
          </MarketingButton>
        </div>
      </div>
    </div>
  );
}

function PricingCoach({
  items,
  isMobile,
  onContact,
}: {
  items: CoachPricingItem[];
  isMobile: boolean;
  onContact: () => void;
}) {
  const cols = isMobile ? "1fr" : window.innerWidth >= 1024 ? "repeat(3, 1fr)" : "repeat(2, 1fr)";
  return (
    <div>
      <h2 style={headingStyle}>For coaches.</h2>
      <p style={subheadStyle}>Certifications that grant ongoing platform access.</p>

      <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: cols, gap: 24, alignItems: "start" }}>
        {items.map((item) => {
          const isComingSoon = item.status === "coming_soon";
          return (
            <div
              key={item.id}
              style={{
                position: "relative",
                background: "white",
                border: "1px solid var(--border-1)",
                borderRadius: "var(--r-lg)",
                padding: 28,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                height: "100%",
              }}
            >
              {isComingSoon && <span style={comingSoonBadge}>Coming Soon</span>}
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
                {item.title}
              </h3>
              <div
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: isComingSoon ? 16 : 22,
                  color: isComingSoon ? "var(--bw-slate)" : "var(--bw-navy)",
                }}
              >
                {item.priceLabel}
              </div>
              {isComingSoon ? (
                <p
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 14,
                    color: "var(--bw-slate)",
                    margin: 0,
                    flex: 1,
                  }}
                >
                  Details available at launch.
                </p>
              ) : (
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  {item.highlights.map((h, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: 13,
                        color: "var(--bw-slate-700)",
                        lineHeight: 1.5,
                      }}
                    >
                      <span aria-hidden style={{ color: "var(--bw-orange)", fontWeight: 700 }}>✓</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              )}
              <MarketingButton variant={isComingSoon ? "secondary" : "primary"} size="md" onClick={onContact} fullWidth>
                {isComingSoon ? "Notify me" : "Contact for pricing"}
              </MarketingButton>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PricingEnterprise({ onContact }: { onContact: () => void }) {
  const inclusions = [
    "All four assessment instruments",
    "Unlimited workforce administrations within seat count",
    "Org-level dashboards with AI-generated narratives",
    "Cross-instrument insights and intervention recommendations",
    "Dedicated account support",
  ];
  return (
    <div>
      <h2 style={headingStyle}>For organizations.</h2>
      <p style={subheadStyle}>
        Invoice-based annual contracts. We'll scope your engagement around your team size, instruments
        needed, and intended outcomes.
      </p>

      <div
        style={{
          marginTop: 48,
          maxWidth: 720,
          marginLeft: "auto",
          marginRight: "auto",
          background: "white",
          border: "2px solid var(--bw-navy)",
          borderRadius: "var(--r-lg)",
          padding: 48,
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 600,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "var(--bw-orange)",
            marginBottom: 16,
          }}
        >
          What's included
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {inclusions.map((line) => (
            <li
              key={line}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 15,
                color: "var(--bw-slate-700)",
                lineHeight: 1.55,
              }}
            >
              <span aria-hidden style={{ color: "var(--bw-orange)", fontWeight: 700 }}>✓</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <MarketingButton variant="primary" size="md" onClick={onContact}>
            Contact for enterprise pricing
          </MarketingButton>
        </div>
      </div>
    </div>
  );
}

export default function MarketingPricing() {
  const location = useLocation();
  const navigate = useNavigate();
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);

  const initialSegment = useMemo(() => hashToSegment(location.hash), []);
  const [segment, setSegment] = useState<Segment>(initialSegment);

  useEffect(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  useEffect(() => {
    const targetHash = `#${segment}`;
    if (location.hash !== targetHash) {
      navigate({ pathname: location.pathname, hash: targetHash }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment]);

  useEffect(() => {
    const next = hashToSegment(location.hash);
    if (next !== segment) setSegment(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash]);

  const isMobile = w < 640;

  return (
    <div className="bw-marketing-root">
      <MarketingNav />

      {/* Hero */}
      <section
        style={{
          background: "var(--bw-cream)",
          padding: isMobile ? "64px 24px 32px" : "96px 48px 48px",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <Eyebrow style={{ display: "inline-block" }}>Pricing</Eyebrow>
          <h1
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(34px, 5vw, 48px)",
              color: "var(--bw-navy)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            Simple pricing for every path.
          </h1>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 400,
              fontSize: 17,
              color: "var(--bw-slate)",
              lineHeight: 1.55,
              marginTop: 20,
              marginBottom: 0,
            }}
          >
            Choose the path that fits how you'll use BrainWise.
          </p>
        </div>
      </section>

      {/* Segment switcher */}
      <section
        style={{
          background: "var(--bw-cream)",
          padding: isMobile ? "8px 24px 24px" : "16px 48px 32px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="bw-segment-switcher">
            {(["individual", "coach", "enterprise"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSegment(s)}
                className={`bw-segment-button ${segment === s ? "active" : ""}`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Segment content */}
      <section
        style={{
          background: "white",
          padding: isMobile ? "48px 24px 64px" : "64px 48px 96px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {segment === "individual" && (
            <PricingIndividual isMobile={isMobile} onSignup={() => navigate("/signup")} />
          )}
          {segment === "coach" && (
            <PricingCoach items={coachPricing} isMobile={isMobile} onContact={() => setBriefingOpen(true)} />
          )}
          {segment === "enterprise" && <PricingEnterprise onContact={() => setBriefingOpen(true)} />}
        </div>
      </section>

      <MarketingFooter />

      <BriefingModal
        open={briefingOpen}
        onClose={() => setBriefingOpen(false)}
        source="pricing_page"
      />
    </div>
  );
}
