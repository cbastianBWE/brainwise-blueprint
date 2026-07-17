import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "@/styles/marketing-tokens.css";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingButton from "@/components/marketing/MarketingButton";
import Eyebrow from "@/components/marketing/Eyebrow";
import DotArc from "@/components/marketing/DotArc";
import BriefingModal from "@/components/marketing/BriefingModal";

const stats = [
  { value: "89", label: "Facets the PTP measures across five dimensions", citation: "", color: "var(--bw-orange)" },
  { value: "150+", label: "Structured, interactive coaching and development activities", citation: "", color: "var(--bw-teal)" },
  { value: "3", label: "Report modes — individual, paired, and team, on one instrument", citation: "", color: "var(--bw-forest)" },
  { value: "5–7×", label: "Median ROI from professional coaching", citation: "ICF / PwC Global Coaching Client Study (2024)", color: "var(--bw-plum)" },
];

function useIsBelow(width: number) {
  const [v, setV] = useState(typeof window !== "undefined" ? window.innerWidth < width : false);
  useEffect(() => {
    const onR = () => setV(window.innerWidth < width);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [width]);
  return v;
}

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<string>("homepage_briefing_modal");
  const isMobile = useIsBelow(768);
  const isTablet = useIsBelow(1024);

  const openModal = (source: string) => {
    setModalSource(source);
    setModalOpen(true);
  };

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "BrainWise Enterprises — AI-Powered Coaching and Development Platform";
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
      "BrainWise Enterprises is an AI-powered coaching and development platform with a proprietary personalization engine and a library of over 150 structured, interactive activities personalized to each individual.";
    setMeta("description", desc);
    setMeta("og:title", "BrainWise Enterprises", "property");
    setMeta("og:description", desc, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", "https://brainwiseenterprises.com", "property");
    return () => {
      document.title = prevTitle;
    };
  }, []);

  const padX = isMobile ? 20 : 48;

  return (
    <div className="bw-marketing-root" style={{ background: "var(--bg-1)", overflowX: "hidden" }}>
      <MarketingNav />

      {/* HERO */}
      <section style={{ background: "var(--bw-navy)", padding: isMobile ? "64px 20px 80px" : "96px 48px 112px", position: "relative", overflow: "hidden" }}>
        <DotArc size={720} opacity={0.09} style={{ right: -160, top: -80 }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <Eyebrow>AI-Powered Coaching and Development Platform</Eyebrow>
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
            Know what is driving the change. And{" "}
            <span style={{ color: "var(--bw-orange)" }}>what's quietly driving against it</span>.
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
            BrainWise Enterprises is an AI-powered coaching and development platform. A proprietary engine personalizes a library of over 150 structured, interactive activities to each individual, so the work builds on itself over time.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 36, flexWrap: "wrap" }}>
            <MarketingButton as={Link} to="/signup" variant="primary" size="lg">
              Sign Up
            </MarketingButton>
            <MarketingButton variant="invert" size="lg" onClick={() => openModal("homepage_hero_briefing")}>
              Book a conversation
            </MarketingButton>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ background: "#fff", padding: `64px ${padX}px`, borderTop: "1px solid var(--divider)", borderBottom: "1px solid var(--divider)" }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: 24,
          }}
        >
          {stats.map((s) => (
            <div key={s.value} style={{ borderLeft: `3px solid ${s.color}`, paddingLeft: 18 }}>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 36, color: "var(--bw-navy)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                  fontSize: 12,
                  color: "var(--bw-slate)",
                  marginTop: 8,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {s.label}
              </div>
              {s.citation && (
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontStyle: "italic", fontSize: 11, color: "var(--bw-slate-400)", marginTop: 6 }}>
                  {s.citation}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* WHAT NOBODY ELSE DOES */}
      <section style={{ background: "#fff", padding: `${isMobile ? 80 : 112}px ${padX}px`, borderBottom: "1px solid var(--divider)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>What Nobody Else Does</Eyebrow>
          <h2
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 3.5vw, 44px)",
              color: "var(--bw-navy)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Three things no other assessment does.
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, marginTop: 48 }}>
            {[
              {
                eyebrow: "Paired Profile",
                eyebrowColor: "var(--bw-orange)",
                title: "See how any two people fit",
                body: "Compares two people's profiles and interprets which overlaps create friction and which differences are strengths. Nothing else on the market does this.",
              },
              {
                eyebrow: "Team Profile",
                eyebrowColor: "var(--bw-teal)",
                title: "Read a whole team at once",
                body: "Aggregate patterns across a group, plus a private brief for the leader on where the friction is and why.",
              },
              {
                eyebrow: "The Program",
                eyebrowColor: "var(--bw-plum)",
                title: "A program, not a test",
                body: "Most activities personalize to a person's own profile, and many read what they did in earlier work, so the system builds on itself over time. Already use another assessment? Upload a DiSC, Enneagram, or Strengths result and the program takes it into account.",
              },
            ].map((c) => (
              <div
                key={c.eyebrow}
                style={{
                  background: "#fff",
                  border: "1px solid var(--bw-cream-300)",
                  borderRadius: "var(--r-lg)",
                  padding: "32px 28px",
                  boxShadow: "var(--shadow-sm)",
                  minHeight: 280,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Eyebrow color={c.eyebrowColor}>{c.eyebrow}</Eyebrow>
                <h3
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    fontSize: 22,
                    color: "var(--bw-navy)",
                    lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                    margin: 0,
                  }}
                >
                  {c.title}
                </h3>
                <p
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 14.5,
                    color: "var(--bw-slate)",
                    lineHeight: 1.55,
                    marginTop: 16,
                  }}
                >
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AUDIENCE CARDS */}
      <section style={{ background: "var(--bw-cream)", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>Who It's For</Eyebrow>
          <h2
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 3.5vw, 44px)",
              color: "var(--bw-navy)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Three audiences. One platform.
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, marginTop: 48 }}>
            {[
              {
                eyebrow: "Practitioners",
                eyebrowColor: "var(--bw-teal)",
                title: "Certify to debrief the PTP, or train as a full coach",
                body: "Get certified to administer and debrief the Personal Threat & Reward Profile, including paired and team profiles. Go deeper with the full coach certification to work the whole activity library. Build your own practice, or bring the capability inside your organization.",
                cta: (
                  <MarketingButton
                    variant="ghost"
                    size="md"
                    hideArrow
                    style={{ color: "var(--bw-navy)", borderColor: "var(--border-2)" }}
                    onClick={() => openModal("audience_card_practitioner")}
                  >
                    Get certified
                  </MarketingButton>
                ),
              },
              {
                eyebrow: "Individuals",
                eyebrowColor: "var(--bw-orange)",
                title: "Know what's driving your change",
                body: "See what drives you across 89 facets. About 20 minutes, on your own.",
                cta: (
                  <MarketingButton as={Link} to="/signup" variant="primary" size="md">
                    Sign up
                  </MarketingButton>
                ),
              },
              {
                eyebrow: "Enterprise",
                eyebrowColor: "var(--bw-forest)",
                title: "Development for everyone, at a cost you can scale",
                body: "Give everyone in your organization access to personalized coaching and development, delivered by your own certified practitioner or run independently.",
                cta: (
                  <MarketingButton
                    variant="ghost"
                    size="md"
                    hideArrow
                    style={{ color: "var(--bw-navy)", borderColor: "var(--border-2)" }}
                    onClick={() => openModal("audience_card_enterprise")}
                  >
                    Book a conversation
                  </MarketingButton>
                ),
              },
            ].map((c) => (
              <div
                key={c.eyebrow}
                style={{
                  background: "#fff",
                  border: "1px solid var(--bw-cream-300)",
                  borderRadius: "var(--r-lg)",
                  padding: "32px 28px",
                  boxShadow: "var(--shadow-sm)",
                  minHeight: 280,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Eyebrow color={c.eyebrowColor}>{c.eyebrow}</Eyebrow>
                <h3
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    fontSize: 22,
                    color: "var(--bw-navy)",
                    lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                    margin: 0,
                  }}
                >
                  {c.title}
                </h3>
                <p
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 14.5,
                    color: "var(--bw-slate)",
                    lineHeight: 1.55,
                    flexGrow: 1,
                    marginTop: 16,
                  }}
                >
                  {c.body}
                </p>
                <div style={{ marginTop: 8 }}>{c.cta}</div>
              </div>
            ))}
          </div>
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
              Sign up, or book a 30-minute conversation to see how it fits your team.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
              <MarketingButton as={Link} to="/signup" variant="primary" size="lg">
                Sign Up
              </MarketingButton>
              <MarketingButton variant="invert" size="lg" onClick={() => openModal("homepage_briefing_modal")}>
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
