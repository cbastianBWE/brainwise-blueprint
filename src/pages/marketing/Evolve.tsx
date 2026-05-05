import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "@/styles/marketing-tokens.css";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingButton from "@/components/marketing/MarketingButton";
import Eyebrow from "@/components/marketing/Eyebrow";
import DotArc from "@/components/marketing/DotArc";
import BriefingModal from "@/components/marketing/BriefingModal";
import MarketingTile from "@/components/marketing/MarketingTile";
import {
  meta,
  heroStats,
  heroStatsSourceNote,
  problemStats,
  evolveStages,
  evolveInstruments,
  researchFailures,
  researchSuccesses,
  differentiators,
} from "@/content/marketing/evolveContent";

export default function Evolve() {
  const navigate = useNavigate();
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);

  useEffect(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const isMobile = w < 640;
  const isTablet = w >= 640 && w < 1024;

  const stagesCols = w >= 1024 ? "repeat(3, 1fr)" : w >= 640 ? "repeat(2, 1fr)" : "1fr";
  const instrumentsCols = w >= 1024 ? "repeat(3, 1fr)" : w >= 640 ? "repeat(2, 1fr)" : "1fr";
  const statsCols = w >= 1024 ? "repeat(4, 1fr)" : w >= 640 ? "repeat(2, 1fr)" : "1fr";
  const twoCol = w >= 768 ? "1fr 1fr" : "1fr";
  const gap = w >= 1024 ? 24 : w >= 640 ? 20 : 16;

  return (
    <div className="bw-marketing-root">
      <MarketingNav />

      {/* Hero */}
      <section
        style={{
          background: "var(--bw-navy)",
          padding: isMobile ? "64px 24px 56px" : "96px 48px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <DotArc size={620} opacity={0.08} style={{ right: -120, top: "50%", transform: "translateY(-50%)", zIndex: 0 }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <Eyebrow color="var(--bw-orange)">{meta.heroEyebrow}</Eyebrow>
          <h1
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(34px, 5vw, 54px)",
              color: "#fff",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              maxWidth: 800,
              margin: 0,
            }}
          >
            {meta.heroTitle}
          </h1>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 400,
              fontSize: 17,
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.55,
              maxWidth: 720,
              marginTop: 20,
              marginBottom: 0,
            }}
          >
            {meta.heroSubhead}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
            <MarketingButton variant="primary" size="md" onClick={() => setBriefingOpen(true)}>
              {meta.heroPrimaryCta}
            </MarketingButton>
            <MarketingButton
              variant="invert"
              size="md"
              onClick={() => document.getElementById("methodology")?.scrollIntoView({ behavior: "smooth" })}
            >
              {meta.heroSecondaryCta}
            </MarketingButton>
          </div>
        </div>
      </section>

      {/* Stat banner */}
      <section
        style={{
          background: "var(--bw-orange)",
          padding: isMobile ? "48px 24px" : "56px 48px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: statsCols, gap: gap }}>
            {heroStats.map((s, i) => (
              <div key={i}>
                <div
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 800,
                    fontSize: "clamp(36px, 4vw, 56px)",
                    color: "#fff",
                    lineHeight: 1.05,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 500,
                    fontSize: 14,
                    color: "#fff",
                    lineHeight: 1.4,
                    marginTop: 8,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 24,
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 400,
              fontSize: 12,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {heroStatsSourceNote}
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section
        style={{
          background: "var(--bw-navy)",
          padding: isMobile ? "64px 24px" : "96px 48px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <DotArc
          size={520}
          opacity={0.08}
          style={{ left: -120, top: "50%", transform: "translateY(-50%) scaleX(-1)", zIndex: 0 }}
        />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <Eyebrow color="var(--bw-orange)">{meta.problemEyebrow}</Eyebrow>
          <h2
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 4vw, 40px)",
              color: "#fff",
              margin: 0,
              lineHeight: 1.15,
              maxWidth: 900,
            }}
          >
            {meta.problemTitle}
          </h2>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 400,
              fontSize: 16,
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.7,
              maxWidth: 720,
              marginTop: 24,
              marginBottom: 0,
            }}
          >
            {meta.problemBody}
          </p>
          <div
            style={{
              marginTop: 48,
              display: "grid",
              gridTemplateColumns: w >= 768 ? "repeat(2, 1fr)" : "1fr",
              gap: gap,
            }}
          >
            {problemStats.map((s, i) => (
              <div
                key={i}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "var(--r-lg)",
                  padding: 24,
                }}
              >
                <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 32, color: "#fff", lineHeight: 1.1 }}>
                  {s.value}
                </div>
                <div
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.82)",
                    lineHeight: 1.45,
                    marginTop: 10,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 400,
                    fontSize: 11,
                    fontStyle: "italic",
                    color: "rgba(255,255,255,0.55)",
                    marginTop: 12,
                  }}
                >
                  {s.source}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section
        id="methodology"
        style={{
          background: "var(--bw-cream)",
          padding: isMobile ? "64px 24px" : "96px 48px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ maxWidth: 800 }}>
            <Eyebrow>{meta.methodologyEyebrow}</Eyebrow>
            <h2
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(28px, 4vw, 40px)",
                color: "var(--bw-navy)",
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              {meta.methodologyTitle}
            </h2>
          </div>
          <div style={{ marginTop: 56, display: "grid", gridTemplateColumns: stagesCols, gap: gap }}>
            {evolveStages.map((s, i) => (
              <StageCard key={i} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* Foundation */}
      <section
        style={{
          background: "var(--bw-white)",
          padding: isMobile ? "64px 24px" : "96px 48px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ maxWidth: 720 }}>
            <Eyebrow>{meta.foundationEyebrow}</Eyebrow>
            <h2
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(28px, 4vw, 40px)",
                color: "var(--bw-navy)",
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              {meta.foundationTitle}
            </h2>
            <p
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 400,
                fontSize: 17,
                color: "var(--bw-slate-700)",
                lineHeight: 1.55,
                marginTop: 20,
                marginBottom: 0,
              }}
            >
              {meta.foundationSubhead}
            </p>
          </div>
          <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: instrumentsCols, gap: gap, alignItems: "stretch" }}>
            {evolveInstruments.map((inst) => (
              <MarketingTile
                key={inst.id}
                card={{
                  id: inst.id,
                  title: inst.title,
                  summary: inst.summary,
                  body: "",
                  benefits: [],
                  cta: { label: "Learn more", action: "navigate", to: "/products" },
                }}
                onOpen={() => navigate("/products")}
              />
            ))}
          </div>
          <p
            style={{
              marginTop: 32,
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 14,
              color: "var(--bw-slate-700)",
              lineHeight: 1.6,
            }}
          >
            {meta.foundationFooterCopy}{" "}
            <Link
              to={meta.foundationFooterLinkTo}
              className="bw-nav-link"
              style={{ color: "var(--bw-orange)", fontWeight: 600, textDecoration: "none" }}
            >
              {meta.foundationFooterLinkLabel} →
            </Link>
          </p>
        </div>
      </section>

      {/* Research */}
      <section
        style={{
          background: "var(--bw-navy)",
          padding: isMobile ? "64px 24px" : "96px 48px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow color="var(--bw-orange)">{meta.researchEyebrow}</Eyebrow>
          <h2
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 4vw, 40px)",
              color: "#fff",
              margin: 0,
              lineHeight: 1.15,
              maxWidth: 900,
            }}
          >
            {meta.researchTitle}
          </h2>

          <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: twoCol, gap: 32 }}>
            <ResearchColumn heading="Why it fails" items={researchFailures} />
            <ResearchColumn heading="What works" items={researchSuccesses} />
          </div>

          <div
            style={{
              marginTop: 40,
              padding: 24,
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "var(--r-lg)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 400,
                fontSize: 14,
                fontStyle: "italic",
                color: "rgba(255,255,255,0.78)",
                lineHeight: 1.6,
              }}
            >
              {meta.researchHonestFraming}
            </p>
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section
        style={{
          background: "var(--bw-cream)",
          padding: isMobile ? "64px 24px" : "96px 48px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ maxWidth: 720 }}>
            <Eyebrow>{meta.differentiatorsEyebrow}</Eyebrow>
            <h2
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(28px, 4vw, 40px)",
                color: "var(--bw-navy)",
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              {meta.differentiatorsTitle}
            </h2>
          </div>
          <div
            style={{
              marginTop: 48,
              display: "grid",
              gridTemplateColumns: w >= 768 ? "repeat(2, 1fr)" : "1fr",
              gap: gap,
            }}
          >
            {differentiators.map((d, i) => (
              <DiffCard key={i} {...d} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        style={{
          background: "var(--bw-navy)",
          padding: isMobile ? "56px 24px" : "80px 48px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <DotArc
          size={520}
          opacity={0.08}
          style={{ left: -120, top: "50%", transform: "translateY(-50%) scaleX(-1)", zIndex: 0 }}
        />
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <Eyebrow color="var(--bw-orange)" style={{ display: "inline-block" }}>
            {meta.ctaEyebrow}
          </Eyebrow>
          <h2
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 4vw, 40px)",
              color: "#fff",
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            {meta.ctaTitle}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32, justifyContent: "center" }}>
            <MarketingButton variant="primary" size="md" onClick={() => setBriefingOpen(true)}>
              {meta.ctaPrimaryLabel}
            </MarketingButton>
            <MarketingButton as={Link} to={meta.ctaSecondaryTo} variant="invert" size="md">
              {meta.ctaSecondaryLabel}
            </MarketingButton>
          </div>
        </div>
      </section>

      <MarketingFooter />

      <BriefingModal open={briefingOpen} onClose={() => setBriefingOpen(false)} source="evolve_page" />
    </div>
  );
}

function StageCard({ letter, name, description }: { letter: string; name: string; description: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "#fff",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--r-lg)",
        padding: "32px 24px",
        boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        transition: "box-shadow var(--dur-med) var(--ease-standard), transform var(--dur-med) var(--ease-standard)",
      }}
    >
      <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 56, lineHeight: 1, color: "var(--bw-orange)" }}>
        {letter}
      </div>
      <div
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: 20,
          color: "var(--bw-navy)",
          marginTop: 12,
        }}
      >
        {name}
      </div>
      <p
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 14,
          color: "var(--bw-slate-700)",
          lineHeight: 1.55,
          marginTop: 8,
          marginBottom: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}

function ResearchColumn({
  heading,
  items,
}: {
  heading: string;
  items: { text: string; source: string }[];
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 600,
          fontSize: 18,
          color: "#fff",
          paddingLeft: 16,
          borderLeft: "3px solid var(--bw-orange)",
        }}
      >
        {heading}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 0 0", display: "flex", flexDirection: "column", gap: 20 }}>
        {items.map((item, i) => (
          <li key={i}>
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 14,
                color: "rgba(255,255,255,0.85)",
                lineHeight: 1.55,
              }}
            >
              {item.text}
            </div>
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 400,
                fontSize: 11,
                fontStyle: "italic",
                color: "rgba(255,255,255,0.55)",
                marginTop: 6,
              }}
            >
              {item.source}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DiffCard({ others, brainwise, detail }: { others: string; brainwise: string; detail: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "#fff",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--r-lg)",
        padding: 24,
        boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        transition: "box-shadow var(--dur-med) var(--ease-standard), transform var(--dur-med) var(--ease-standard)",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 11,
            color: "var(--bw-slate)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontWeight: 600,
          }}
        >
          Others
        </div>
        <div
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 600,
            fontSize: 16,
            color: "var(--bw-slate-700)",
            marginTop: 6,
          }}
        >
          {others}
        </div>
      </div>
      <hr style={{ border: "none", borderTop: "1px solid var(--border-1)", margin: "16px 0" }} />
      <div>
        <div
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 11,
            color: "var(--bw-orange)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontWeight: 600,
          }}
        >
          BrainWise
        </div>
        <div
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            color: "var(--bw-navy)",
            marginTop: 6,
          }}
        >
          {brainwise}
        </div>
      </div>
      <p
        style={{
          marginTop: 16,
          marginBottom: 0,
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 13,
          color: "var(--bw-slate-700)",
          lineHeight: 1.55,
        }}
      >
        {detail}
      </p>
    </div>
  );
}
