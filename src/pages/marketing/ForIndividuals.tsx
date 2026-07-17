import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "@/styles/marketing-tokens.css";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingButton from "@/components/marketing/MarketingButton";
import Eyebrow from "@/components/marketing/Eyebrow";
import DotArc from "@/components/marketing/DotArc";
import BriefingModal from "@/components/marketing/BriefingModal";

function useIsBelow(width: number) {
  const [v, setV] = useState(typeof window !== "undefined" ? window.innerWidth < width : false);
  useEffect(() => {
    const onR = () => setV(window.innerWidth < width);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [width]);
  return v;
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--bw-cream-300)",
  borderRadius: "var(--r-lg)",
  padding: "32px 28px",
  boxShadow: "var(--shadow-sm)",
  minHeight: 240,
  display: "flex",
  flexDirection: "column",
};

const h3Style: React.CSSProperties = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 700,
  fontSize: 22,
  color: "var(--bw-navy)",
  lineHeight: 1.2,
  letterSpacing: "-0.01em",
  margin: 0,
};

const bodyStyle: React.CSSProperties = {
  fontFamily: "'Montserrat', sans-serif",
  fontSize: 14.5,
  color: "var(--bw-slate)",
  lineHeight: 1.55,
  marginTop: 16,
};

export default function ForIndividuals() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<string>("individual_find_practitioner");
  const isMobile = useIsBelow(768);
  const isTablet = useIsBelow(1024);

  const openModal = (source: string) => {
    setModalSource(source);
    setModalOpen(true);
  };

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Know What's Driving Your Change — BrainWise Enterprises";
    const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
      return el;
    };
    const desc =
      "The Personal Threat & Reward Profile shows you what drives you, and what's quietly driving against it, across 89 facets. About 20 minutes, on your own.";
    setMeta("description", desc);
    setMeta("og:title", "Know What's Driving Your Change — BrainWise Enterprises", "property");
    setMeta("og:description", desc, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", "https://brainwiseenterprises.com/for-individuals", "property");
    return () => {
      document.title = prevTitle;
    };
  }, []);

  const padX = isMobile ? 20 : 48;

  const h2Style: React.CSSProperties = {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: "clamp(28px, 3.5vw, 44px)",
    color: "var(--bw-navy)",
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
    margin: 0,
  };

  return (
    <div className="bw-marketing-root" style={{ background: "var(--bg-1)", overflowX: "hidden" }}>
      <MarketingNav />

      {/* HERO */}
      <section style={{ background: "var(--bw-navy)", padding: isMobile ? "64px 20px 80px" : "96px 48px 112px", position: "relative", overflow: "hidden" }}>
        <DotArc size={720} opacity={0.09} style={{ right: -160, top: -80 }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <Eyebrow>For Individuals</Eyebrow>
          <h1
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(36px, 5.5vw, 72px)",
              color: "#fff",
              maxWidth: 880,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Know what's driving <span style={{ color: "var(--bw-orange)" }}>your change</span>.
          </h1>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: isMobile ? 16 : 18,
              color: "rgba(255,255,255,0.78)",
              maxWidth: 640,
              marginTop: 28,
              lineHeight: 1.55,
            }}
          >
            The Personal Threat & Reward Profile shows you what drives you, and what's quietly driving against it, across 89 facets. About 20 minutes, on your own.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 36, flexWrap: "wrap" }}>
            <MarketingButton as={Link} to="/signup" variant="primary" size="lg">
              Sign up
            </MarketingButton>
            <MarketingButton as={Link} to="/contact" variant="invert" size="lg">
              Contact us
            </MarketingButton>
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section style={{ background: "#fff", padding: `${isMobile ? 80 : 112}px ${padX}px`, borderBottom: "1px solid var(--divider)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>What You Get</Eyebrow>
          <h2 style={h2Style}>See what drives you.</h2>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, marginTop: 48 }}>
            {[
              { eyebrow: "Your Profile", color: "var(--bw-orange)", title: "Your own PTP", body: "Your Personal Threat & Reward Profile across 89 facets, with an AI-generated narrative written to your own results." },
              { eyebrow: "Share It", color: "var(--bw-teal)", title: "Share your results", body: "Share your profile with a partner, a colleague, or your therapist, and talk about what actually drives you." },
              { eyebrow: "Keep Growing", color: "var(--bw-plum)", title: "A personalized program", body: "Access a library of structured, interactive activities personalized to your profile, so the work builds on itself over time." },
            ].map((c) => (
              <div key={c.eyebrow} style={cardStyle}>
                <Eyebrow color={c.color}>{c.eyebrow}</Eyebrow>
                <h3 style={h3Style}>{c.title}</h3>
                <p style={bodyStyle}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GOING DEEPER */}
      <section style={{ background: "var(--bw-cream)", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Eyebrow>Going Deeper</Eyebrow>
          <h2 style={h2Style}>Want to see how you and someone else fit?</h2>
          <p style={{ ...bodyStyle, fontSize: 16, marginTop: 20, maxWidth: 780 }}>
            Paired and team profiles — seeing how you and another person actually work together, at work, on a team, or at home — are delivered through a certified practitioner. We'll help you find one.
          </p>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--bw-slate-400)",
              marginTop: 12,
              maxWidth: 780,
            }}
          >
            The individual assessment is inexpensive. Paired and team profiles are arranged through a practitioner.
          </p>
          <div style={{ marginTop: 28 }}>
            <MarketingButton variant="primary" size="lg" onClick={() => openModal("individual_find_practitioner")}>
              Find a practitioner
            </MarketingButton>
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section style={{ background: "var(--bw-navy)", padding: `${isMobile ? 72 : 96}px ${padX}px`, position: "relative", overflow: "hidden" }}>
        <DotArc size={540} opacity={0.07} style={{ left: -120, bottom: -120 }} />
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isTablet ? "1fr" : "1.2fr 1fr",
            gap: isTablet ? 40 : 56,
            alignItems: "center",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div>
            <Eyebrow>Get Started</Eyebrow>
            <h2
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(28px, 3.8vw, 52px)",
                color: "#fff",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Know what's driving your change.
            </h2>
          </div>
          <div>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 16, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, margin: 0 }}>
              Sign up takes a minute. See what drives you, and what's quietly driving against it.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
              <MarketingButton as={Link} to="/signup" variant="primary" size="lg">
                Sign up
              </MarketingButton>
              <MarketingButton as={Link} to="/contact" variant="invert" size="lg">
                Contact us
              </MarketingButton>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />

      <BriefingModal open={modalOpen} onClose={() => setModalOpen(false)} source={modalSource} />
    </div>
  );
}
