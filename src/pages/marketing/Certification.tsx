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

const h2Style: React.CSSProperties = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 700,
  fontSize: "clamp(28px, 3.5vw, 44px)",
  color: "var(--bw-navy)",
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
  margin: 0,
};

export default function Certification() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<string>("certification_hero_briefing");
  const isMobile = useIsBelow(768);
  const isTablet = useIsBelow(1024);

  const openModal = (source: string) => {
    setModalSource(source);
    setModalOpen(true);
  };

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Become a Certified PTP Practitioner — BrainWise Enterprises";
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
      "Get certified in the Personal Threat & Reward Profile. Debrief the PTP, deliver paired and team profiles, and grow into the full coaching program.";
    setMeta("description", desc);
    setMeta("og:title", "Become a Certified PTP Practitioner — BrainWise Enterprises", "property");
    setMeta("og:description", desc, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", "https://brainwiseenterprises.com/certification", "property");
    return () => {
      document.title = prevTitle;
    };
  }, []);

  const padX = isMobile ? 20 : 48;

  const levels = [
    {
      eyebrow: "Level 1",
      eyebrowColor: "var(--bw-teal)",
      title: "PTP Practitioner",
      status: "Available now",
      body: "Certified to administer and debrief the Personal Threat & Reward Profile, and to run paired and team profiles. This is the entry credential.",
    },
    {
      eyebrow: "Level 2",
      eyebrowColor: "var(--bw-orange)",
      title: "Full Coach",
      status: "Coming soon",
      body: "Trained across the full activity library — foundational, typical, and advanced. A separate, deeper certification for running the whole program with clients.",
    },
    {
      eyebrow: "For Organizations",
      eyebrowColor: "var(--bw-plum)",
      title: "Enterprise Pathway",
      status: "By arrangement",
      body: "For internal L&D, OD, and talent teams equipping their own people to guide the activity modules, usually through asynchronous learning.",
    },
  ];

  const programFeatures = [
    "19 modules of structured curriculum",
    "9 hours of virtual instructor-led training",
    "Known and unknown actor debrief practice",
    "Observe a fellow participant's debrief and receive your own",
    "Platform access for ongoing client management",
  ];

  const paths = [
    {
      eyebrow: "Independent practitioners",
      eyebrowColor: "var(--bw-teal)",
      body: "Run your own practice with your own clients.",
    },
    {
      eyebrow: "Internal teams",
      eyebrowColor: "var(--bw-orange)",
      body: "Get your own team members certified through BrainWise, so you have practitioners on staff who can develop your people with the platform.",
    },
  ];

  const whyCertify = [
    {
      eyebrow: "A system, not a test",
      eyebrowColor: "var(--bw-teal)",
      body: "Deliver a program across 200 structured, interactive activities that personalize to each client's profile and build on the work they've already done.",
    },
    {
      eyebrow: "Tools nobody else has",
      eyebrowColor: "var(--bw-orange)",
      body: "The Paired Profile and Team Profile read people against each other at facet level. Every report includes a private practitioner section that shows its reasoning, not a black box.",
    },
    {
      eyebrow: "It works with your toolkit",
      eyebrowColor: "var(--bw-plum)",
      body: "PTP goes underneath DiSC, Enneagram, Working Genius, or Hogan. Your tool says what a client does; PTP says what's driving it. Most of our practitioners run both.",
    },
    {
      eyebrow: "Ongoing relationships",
      eyebrowColor: "var(--bw-forest)",
      body: "Because the work continues between sessions, clients stay engaged over months instead of ending at a one-time debrief.",
    },
  ];

  const qa = [
    {
      q: "Is it ICF accredited, or offer CCEUs?",
      a: "Not yet, and we won't claim it before it's true. Accreditation is a named priority. PTP is a tool credential, complementary to a coaching-methodology credential, not a substitute.",
    },
    {
      q: "Is the instrument validated?",
      a: "The PTP is grounded in Oxford Brain Institute research on threat-reward neural patterns, across 89 facets in five dimensions. The fastest way to judge it is to take it yourself and see what it surfaces.",
    },
    {
      q: "How is this different from DiSC?",
      a: "DiSC tells you your client's style. PTP tells you what's driving it, then gives you a program of activities to work on it. DiSC ends at the debrief.",
    },
    {
      q: "Do I need to learn to interpret 89 facets?",
      a: "No. The platform carries the interpretation and shows you its reasoning. Certification teaches application, not decoding.",
    },
  ];

  return (
    <div className="bw-marketing-root" style={{ background: "var(--bg-1)", overflowX: "hidden" }}>
      <MarketingNav />

      {/* HERO */}
      <section style={{ background: "var(--bw-navy)", padding: isMobile ? "64px 20px 80px" : "96px 48px 112px", position: "relative", overflow: "hidden" }}>
        <DotArc size={720} opacity={0.09} style={{ right: -160, top: -80 }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <Eyebrow>Certification</Eyebrow>
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
            Become a <span style={{ color: "var(--bw-orange)" }}>Certified PTP Practitioner</span>.
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
            Get certified to debrief the Personal Threat & Reward Profile. Go deeper, when you're ready, to work the full activity program with clients.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 36, flexWrap: "wrap" }}>
            <MarketingButton variant="primary" size="lg" onClick={() => openModal("certification_hero_briefing")}>
              Get certified
            </MarketingButton>
            <MarketingButton as={Link} to="/contact" variant="invert" size="lg">
              Contact us
            </MarketingButton>
          </div>
        </div>
      </section>

      {/* THE LEVELS */}
      <section style={{ background: "#fff", padding: `${isMobile ? 80 : 112}px ${padX}px`, borderBottom: "1px solid var(--divider)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>The Levels</Eyebrow>
          <h2 style={h2Style}>Go as deep as your practice needs.</h2>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, marginTop: 48 }}>
            {levels.map((c) => (
              <div key={c.eyebrow} style={cardStyle}>
                <Eyebrow color={c.eyebrowColor}>{c.eyebrow}</Eyebrow>
                <h3 style={h3Style}>{c.title}</h3>
                <div
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 13,
                    color: "var(--bw-slate-400)",
                    marginTop: 8,
                    fontWeight: 600,
                  }}
                >
                  {c.status}
                </div>
                <p style={bodyStyle}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE PROGRAM */}
      <section style={{ background: "var(--bw-cream)", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Eyebrow>The PTP Practitioner Program</Eyebrow>
          <h2 style={h2Style}>What certification involves.</h2>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 16,
              color: "var(--bw-slate)",
              lineHeight: 1.6,
              marginTop: 24,
            }}
          >
            The PTP Practitioner Certification trains you to deliver the Personal Threat & Reward Profile with depth and accuracy.
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: "32px 0 0", display: "flex", flexDirection: "column", gap: 14 }}>
            {programFeatures.map((f) => (
              <li
                key={f}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 15.5,
                  color: "var(--bw-navy)",
                  lineHeight: 1.5,
                  paddingBottom: 14,
                  borderBottom: "1px solid var(--bw-cream-300)",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--bw-orange)",
                    marginTop: 8,
                    flexShrink: 0,
                  }}
                />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* TWO PATHS */}
      <section style={{ background: "#fff", padding: `${isMobile ? 80 : 112}px ${padX}px`, borderBottom: "1px solid var(--divider)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Eyebrow>Who It's For</Eyebrow>
          <h2 style={h2Style}>Independent, or inside your organization.</h2>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20, marginTop: 48 }}>
            {paths.map((c) => (
              <div key={c.eyebrow} style={cardStyle}>
                <Eyebrow color={c.eyebrowColor}>{c.eyebrow}</Eyebrow>
                <p style={bodyStyle}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CERTIFY */}
      <section style={{ background: "var(--bw-cream)", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>Why Certify</Eyebrow>
          <h2 style={h2Style}>You leave with a practice to run, not a report to debrief.</h2>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 16,
              color: "var(--bw-slate)",
              lineHeight: 1.6,
              marginTop: 24,
              maxWidth: 820,
            }}
          >
            Most certifications qualify you to explain a result. This one qualifies you to run a structured, personalized, AI-supported program with a client for months.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20, marginTop: 48 }}>
            {whyCertify.map((c) => (
              <div key={c.eyebrow} style={cardStyle}>
                <Eyebrow color={c.eyebrowColor}>{c.eyebrow}</Eyebrow>
                <p style={bodyStyle}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STRAIGHT ANSWERS */}
      <section style={{ background: "#fff", padding: `${isMobile ? 80 : 112}px ${padX}px`, borderBottom: "1px solid var(--divider)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Eyebrow>Straight Answers</Eyebrow>
          <h2 style={h2Style}>The questions coaches actually ask.</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 32, marginTop: 48 }}>
            {qa.map((item) => (
              <div key={item.q} style={{ paddingBottom: 32, borderBottom: "1px solid var(--bw-cream-300)" }}>
                <h3
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    fontSize: 20,
                    color: "var(--bw-navy)",
                    lineHeight: 1.3,
                    letterSpacing: "-0.01em",
                    margin: 0,
                  }}
                >
                  {item.q}
                </h3>
                <p
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 15.5,
                    color: "var(--bw-slate)",
                    lineHeight: 1.6,
                    marginTop: 12,
                  }}
                >
                  {item.a}
                </p>
              </div>
            ))}
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
            <Eyebrow>Get Certified</Eyebrow>
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
              Become a Certified PTP Practitioner.
            </h2>
          </div>
          <div>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 16, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, margin: 0 }}>
              Start with the practitioner credential and go deeper when your practice is ready.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
              <MarketingButton variant="primary" size="lg" onClick={() => openModal("certification_footer_briefing")}>
                Get certified
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
