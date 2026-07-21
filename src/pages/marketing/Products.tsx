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
  minHeight: 280,
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

const h2Style: React.CSSProperties = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 700,
  fontSize: "clamp(28px, 3.5vw, 44px)",
  color: "var(--bw-navy)",
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
  margin: 0,
};

export default function Products() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<string>("products_hero_briefing");
  const isMobile = useIsBelow(768);
  const isTablet = useIsBelow(1024);

  const openModal = (source: string) => {
    setModalSource(source);
    setModalOpen(true);
  };

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "The Platform — BrainWise Enterprises";
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
      "The Personal Threat & Reward Profile and the platform it powers: individual, paired, and team reports, plus a program of over 200 personalized coaching and development activities.";
    setMeta("description", desc);
    setMeta("og:title", "The Platform — BrainWise Enterprises", "property");
    setMeta("og:description", desc, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", "https://brainwiseenterprises.com/products", "property");
    return () => {
      document.title = prevTitle;
    };
  }, []);

  const padX = isMobile ? 20 : 48;

  const reportCards = [
    {
      eyebrow: "Individual",
      eyebrowColor: "var(--bw-teal)",
      title: "The PTP profile",
      body: "89 facets across five dimensions, with an AI-generated narrative written to the person's own results. Available in a work-safe 47-item professional set for workplace use.",
    },
    {
      eyebrow: "Paired",
      eyebrowColor: "var(--bw-orange)",
      title: "The Paired Profile",
      body: "Compares two people's profiles and interprets which overlaps create friction and which differences are strengths, in work, personal, and romantic modes.",
    },
    {
      eyebrow: "Team",
      eyebrowColor: "var(--bw-plum)",
      title: "The Team Profile",
      body: "Aggregate patterns across a group, plus a private brief for the leader on where the friction is and why.",
    },
  ];

  const programCards = [
    {
      eyebrow: "Three levels",
      eyebrowColor: "var(--bw-teal)",
      body: "Foundational, typical, and advanced activities, so the program meets people where they are and grows with them.",
    },
    {
      eyebrow: "A searchable catalog",
      eyebrowColor: "var(--bw-orange)",
      body: "Browse the whole library, with a participant view (description, time, prerequisites) and a practitioner view (why to use it, what it produces, situational guidance).",
    },
    {
      eyebrow: "Guided pathways",
      eyebrowColor: "var(--bw-plum)",
      body: "Suggested sequences and AI-assisted 'what to do next,' so no one is left staring at 200 activities wondering where to start.",
    },
  ];

  return (
    <div className="bw-marketing-root" style={{ background: "var(--bg-1)", overflowX: "hidden" }}>
      <MarketingNav />

      {/* HERO */}
      <section style={{ background: "var(--bw-navy)", padding: isMobile ? "64px 20px 80px" : "96px 48px 112px", position: "relative", overflow: "hidden" }}>
        <DotArc size={720} opacity={0.09} style={{ right: -160, top: -80 }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <Eyebrow>The Platform</Eyebrow>
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
            The Personal Threat & Reward Profile, and{" "}
            <span style={{ color: "var(--bw-orange)" }}>the platform it powers</span>.
          </h1>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: isMobile ? 16 : 18,
              color: "rgba(255,255,255,0.78)",
              maxWidth: 720,
              marginTop: 28,
              lineHeight: 1.55,
            }}
          >
            One proprietary instrument — 89 facets across five dimensions — read for an individual, for any two people, and for a whole team. Then a program of over 200 activities does the work between sessions.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 36, flexWrap: "wrap" }}>
            <MarketingButton as={Link} to="/signup" variant="primary" size="lg">
              Sign up
            </MarketingButton>
            <MarketingButton variant="invert" size="lg" onClick={() => openModal("products_hero_briefing")}>
              Book a conversation
            </MarketingButton>
          </div>
        </div>
      </section>

      {/* REPORT SUITE */}
      <section style={{ background: "#fff", padding: `${isMobile ? 80 : 112}px ${padX}px`, borderBottom: "1px solid var(--divider)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>The Reports</Eyebrow>
          <h2 style={h2Style}>One instrument, three ways to read it.</h2>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, marginTop: 48 }}>
            {reportCards.map((c) => (
              <div key={c.eyebrow} style={cardStyle}>
                <Eyebrow color={c.eyebrowColor}>{c.eyebrow}</Eyebrow>
                <h3 style={h3Style}>{c.title}</h3>
                <p style={bodyStyle}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROGRAM & CATALOG */}
      <section style={{ background: "var(--bw-cream)", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>The Program</Eyebrow>
          <h2 style={h2Style}>A program, not a test.</h2>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: isMobile ? 16 : 17,
              color: "var(--bw-slate)",
              lineHeight: 1.6,
              maxWidth: 780,
              marginTop: 20,
            }}
          >
            A library of over 200 structured, interactive activities. Most personalize to the person's own profile, and many read what they did in earlier work, so the system builds on itself over time.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, marginTop: 40 }}>
            {programCards.map((c) => (
              <div key={c.eyebrow} style={cardStyle}>
                <Eyebrow color={c.eyebrowColor}>{c.eyebrow}</Eyebrow>
                <p style={{ ...bodyStyle, marginTop: 8 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WORKS WITH YOUR TOOLKIT */}
      <section style={{ background: "#fff", padding: `${isMobile ? 80 : 112}px ${padX}px`, borderTop: "1px solid var(--divider)", borderBottom: "1px solid var(--divider)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Eyebrow>Works With Your Toolkit</Eyebrow>
          <h2 style={h2Style}>Bring the assessments you already use.</h2>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: isMobile ? 16 : 17,
              color: "var(--bw-slate)",
              lineHeight: 1.6,
              maxWidth: 780,
              marginTop: 20,
            }}
          >
            Already have a DiSC, Enneagram, or Strengths result? Upload it and the program takes it into account, so the work reflects everything you already know about yourself.
          </p>
        </div>
      </section>

      {/* SCIENCE */}
      <section style={{ background: "var(--bw-cream)", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Eyebrow>The Science</Eyebrow>
          <h2 style={h2Style}>Grounded in the neuroscience of threat and reward.</h2>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: isMobile ? 16 : 17,
              color: "var(--bw-slate)",
              lineHeight: 1.6,
              maxWidth: 780,
              marginTop: 20,
            }}
          >
            The PTP is grounded in Oxford Brain Institute research on threat-reward neural patterns, across 89 facets in five dimensions.
          </p>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 15,
              color: "var(--bw-slate)",
              lineHeight: 1.6,
              marginTop: 28,
            }}
          >
            Deploying across an organization? See how BrainWise works{" "}
            <Link to="/for-enterprise" style={{ color: "var(--bw-navy)", textDecoration: "underline", fontWeight: 600 }}>
              for enterprise
            </Link>
            .
          </p>
        </div>
      </section>

      {/* CTA */}
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
              See what's actually driving behavior.
            </h2>
          </div>
          <div>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 16, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, margin: 0 }}>
              Sign up, or book a 30-minute conversation to see how the platform fits your work.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
              <MarketingButton as={Link} to="/signup" variant="primary" size="lg">
                Sign up
              </MarketingButton>
              <MarketingButton variant="invert" size="lg" onClick={() => openModal("products_footer_briefing")}>
                Book a conversation
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
