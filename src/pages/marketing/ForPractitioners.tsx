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

export default function ForPractitioners() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<string>("practitioner_hero_briefing");
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
      "Get certified in the Personal Threat & Reward Profile. Debrief the PTP, deliver paired and team profiles, and build a coaching practice or bring the capability inside your organization.";
    setMeta("description", desc);
    setMeta("og:title", "Become a Certified PTP Practitioner — BrainWise Enterprises", "property");
    setMeta("og:description", desc, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", "https://brainwiseenterprises.com/for-practitioners", "property");
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
          <Eyebrow>For Practitioners</Eyebrow>
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
            Get certified to debrief the Personal Threat & Reward Profile and deliver paired and team profiles. Build your own practice, or bring the capability inside your organization.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 36, flexWrap: "wrap" }}>
            <MarketingButton variant="primary" size="lg" onClick={() => openModal("practitioner_hero_briefing")}>
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
          <Eyebrow>The Certification</Eyebrow>
          <h2 style={h2Style}>Go as deep as your practice needs.</h2>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, marginTop: 48 }}>
            {[
              { eyebrow: "PTP Practitioner", color: "var(--bw-teal)", title: "The entry credential", body: "Certified to administer and debrief the Personal Threat & Reward Profile, and to run paired and team profiles." },
              { eyebrow: "Full Coach", color: "var(--bw-orange)", title: "The deeper credential", body: "Trained across the full activity library — foundational, typical, and advanced. A separate, deeper certification taken when you're ready to run the whole program with clients." },
              { eyebrow: "Enterprise Pathway", color: "var(--bw-forest)", title: "For internal teams", body: "For L&D, OD, and talent teams equipping their own people to guide the activity modules, usually through asynchronous learning rather than a full second certification." },
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

      {/* TWO PATHS */}
      <section style={{ background: "var(--bw-cream)", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>Who It's For</Eyebrow>
          <h2 style={h2Style}>Independent, or inside your organization.</h2>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20, marginTop: 48 }}>
            {[
              { eyebrow: "Independent practitioners", color: "var(--bw-teal)", body: "Run your own practice with your own clients." },
              { eyebrow: "Internal teams", color: "var(--bw-orange)", body: "Certify your own people, so the capability stays inside your organization rather than depending on an outside contractor." },
            ].map((c) => (
              <div key={c.eyebrow} style={cardStyle}>
                <Eyebrow color={c.color}>{c.eyebrow}</Eyebrow>
                <p style={bodyStyle}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU DELIVER + GOES UNDERNEATH */}
      <section style={{ background: "#fff", padding: `${isMobile ? 80 : 112}px ${padX}px`, borderBottom: "1px solid var(--divider)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 40 }}>
          <div>
            <h3 style={h3Style}>What you can deliver</h3>
            <p style={bodyStyle}>The PTP debrief, the Paired Profile, and the Team Profile at the practitioner level. Once you hold the full coach certification, the complete 150-activity program with guided pathways.</p>
          </div>
          <div>
            <h3 style={h3Style}>It goes underneath what you already use</h3>
            <p style={bodyStyle}>If you're certified in DiSC, Enneagram, Working Genius, or Hogan, PTP doesn't replace them. Your tool says what your client does. PTP says what they're protecting, and what's driving them toward the change.</p>
          </div>
          <p
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              fontSize: isMobile ? 18 : 20,
              color: "var(--bw-navy)",
              lineHeight: 1.4,
              letterSpacing: "-0.01em",
              margin: 0,
              paddingTop: 8,
              borderTop: "1px solid var(--divider)",
            }}
          >
            Grounded in Oxford Brain Institute research. Take the PTP yourself and judge the instrument, not the brochure.
          </p>
        </div>
      </section>

      {/* DIRECTORY PLACEHOLDER */}
      <section style={{ background: "var(--bw-cream)", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Eyebrow>Certified Practitioners</Eyebrow>
          <h2 style={h2Style}>See our certified practitioners</h2>
          <p style={{ ...bodyStyle, fontSize: 16, marginTop: 20, maxWidth: 680 }}>
            Our directory of certified practitioners is coming soon. Looking for an introduction to a practitioner now? Get in touch and we'll connect you.
          </p>
          <div style={{ marginTop: 28 }}>
            <MarketingButton variant="primary" size="lg" onClick={() => openModal("practitioner_directory_request")}>
              Request an introduction
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
              <MarketingButton variant="primary" size="lg" onClick={() => openModal("practitioner_footer_briefing")}>
                Get certified
              </MarketingButton>
              <MarketingButton variant="invert" size="lg" onClick={() => openModal("practitioner_footer_briefing")}>
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
