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

export default function ForEnterprise() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<string>("enterprise_briefing_modal");
  const isMobile = useIsBelow(768);
  const isTablet = useIsBelow(1024);

  const openModal = (source: string) => {
    setModalSource(source);
    setModalOpen(true);
  };

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Development for Everyone, at a Cost You Can Scale — BrainWise Enterprises";
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
      "Give everyone in your organization access to personalized coaching and development, delivered by your own certified practitioner, on a platform priced to reach your whole workforce.";
    setMeta("description", desc);
    setMeta("og:title", "Development for Everyone, at a Cost You Can Scale — BrainWise Enterprises", "property");
    setMeta("og:description", desc, "property");
    setMeta("og:type", "website", "property");
    return () => {
      document.title = prevTitle;
    };
  }, []);

  const padX = isMobile ? 20 : 48;

  const includedCards = [
    {
      eyebrow: "Leadership Development",
      eyebrowColor: "var(--bw-teal)",
      title: "Coach your leaders",
      body: "A personalized coaching program for a whole leadership layer, delivered by your own certified practitioner or run independently.",
    },
    {
      eyebrow: "Team & Paired Profiles",
      eyebrowColor: "var(--bw-orange)",
      title: "See how people fit",
      body: "Team and paired profiles reveal where a group's drivers align and where they compete, with a private brief for the leader.",
    },
    {
      eyebrow: "Practitioner Certification",
      eyebrowColor: "var(--bw-plum)",
      title: "Capability on staff",
      body: "Have members of your L&D, OD, or talent team certified through BrainWise, so you have practitioners on staff who can develop your people with the platform.",
    },
    {
      eyebrow: "Executive Coaching",
      eyebrowColor: "var(--bw-forest)",
      title: "For your senior leaders",
      body: "One-to-one coaching grounded in each leader's own profile, for the people at the top who still need depth.",
    },
  ];

  const pricingCards = [
    {
      eyebrow: "Base",
      eyebrowColor: "var(--bw-teal)",
      title: "The foundation",
      body: "The PTP and individual report, plus the Foundational activity set, the spine of the program almost everyone does.",
    },
    {
      eyebrow: "Premium",
      eyebrowColor: "var(--bw-orange)",
      title: "Adds depth",
      body: "Everything in Base, plus Paired Profiles and the Typical activity set, going deeper across each area.",
    },
    {
      eyebrow: "Premium Plus",
      eyebrowColor: "var(--bw-plum)",
      title: "The whole platform",
      body: "Everything in Premium, plus Team Profiles, the leader brief, the org dashboard, and the Advanced activity set, the specialist tools for leaders who want to push further.",
    },
  ];

  const whatPtpCards = [
    {
      eyebrow: "Self-Awareness",
      eyebrowColor: "var(--bw-teal)",
      title: "Self-awareness that lands",
      body: "Not a four-box type, the specific driver underneath a leader's behavior, in their own words.",
    },
    {
      eyebrow: "Change Navigation",
      eyebrowColor: "var(--bw-orange)",
      title: "Change navigation",
      body: "Resistance is a threat response. When a leader can see which threat is firing, the conversation moves from arguing about the change to working the driver.",
    },
    {
      eyebrow: "Team Insight",
      eyebrowColor: "var(--bw-plum)",
      title: "Team insight",
      body: "A Team Profile shows aggregate patterns across a leadership group, plus a private brief for the leader on where the friction is and why.",
    },
    {
      eyebrow: "Working Relationships",
      eyebrowColor: "var(--bw-forest)",
      title: "Working relationships",
      body: "The Paired Profile reads any two people against each other and names which overlaps create friction and which differences are strengths. Nothing else on the market does this.",
    },
  ];

  const builtForWorkCards = [
    {
      eyebrow: "Work-Safe Instrument",
      eyebrowColor: "var(--bw-teal)",
      title: "A work-safe instrument",
      body: "PTP ships in a 47-item professional set built specifically for workplace use. It excludes the items no employer should ask about. Designed in, not bolted on, which is what clears an HR review.",
    },
    {
      eyebrow: "Governance",
      eyebrowColor: "var(--bw-orange)",
      title: "Governance from the start",
      body: "Consent controls, access grants, role-scoped team-leader permissions, and a full audit trail. What legal asks about on the first call.",
    },
    {
      eyebrow: "Your Practitioner",
      eyebrowColor: "var(--bw-plum)",
      title: "Delivered by your own certified practitioner",
      body: "Certify your own people so the capability stays inside your organization, and the program runs asynchronously, so no one has to babysit the experience.",
    },
    {
      eyebrow: "See The Team",
      eyebrowColor: "var(--bw-forest)",
      title: "See the team before you commit",
      body: "Run a Team Profile on your real leadership group, not a sample, and decide from your own team's results.",
    },
  ];

  const evaluateSteps = [
    "A short conversation about the leadership development problem you are actually trying to solve.",
    "A Team Profile on your real leadership group. Not a sample. Yours.",
    "A scoped pilot with a defined cohort and a measured outcome.",
    "Rollout, priced per seat, with your own certified practitioner.",
  ];


  return (
    <div className="bw-marketing-root" style={{ background: "var(--bg-1)", overflowX: "hidden" }}>
      <MarketingNav />

      {/* HERO */}
      <section style={{ background: "var(--bw-navy)", padding: isMobile ? "64px 20px 80px" : "96px 48px 112px", position: "relative", overflow: "hidden" }}>
        <DotArc size={720} opacity={0.09} style={{ right: -160, top: -80 }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <Eyebrow>For Enterprise</Eyebrow>
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
            Development for <span style={{ color: "var(--bw-orange)" }}>everyone</span>, at a cost you can scale.
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
            Give everyone in your organization access to personalized coaching and development, delivered by your own certified practitioner, on a platform priced to reach your whole workforce.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 36, flexWrap: "wrap" }}>
            <MarketingButton variant="primary" size="lg" onClick={() => openModal("enterprise_hero_briefing")}>
              Book a conversation
            </MarketingButton>
            <MarketingButton as={Link} to="/contact" variant="invert" size="lg">
              Contact us
            </MarketingButton>
          </div>
        </div>
      </section>

      {/* WHY IT WORKS */}
      <section style={{ background: "#fff", padding: `${isMobile ? 80 : 112}px ${padX}px`, borderBottom: "1px solid var(--divider)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Eyebrow>Built For Work</Eyebrow>
          <h2 style={h2Style}>Two things that make this deployable.</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 40, marginTop: 48 }}>
            <div>
              <h3 style={h3Style}>A work-safe instrument</h3>
              <p style={{ ...bodyStyle, fontSize: 16 }}>
                PTP ships in a 47-item professional set built specifically for workplace use. It excludes the items no employer should ask about. That was designed in, not bolted on, which is what clears an HR review.
              </p>
            </div>
            <div>
              <h3 style={h3Style}>See the team before you commit</h3>
              <p style={{ ...bodyStyle, fontSize: 16 }}>
                Run a Team Profile on your real leadership group, not a sample. It shows the shared drivers and the friction lines, with a private brief for the leader. Decide from your own team's results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section style={{ background: "var(--bw-cream)", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>What's Included</Eyebrow>
          <h2 style={h2Style}>A coaching program for your whole organization.</h2>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20, marginTop: 48 }}>
            {includedCards.map((c) => (
              <div key={c.eyebrow} style={cardStyle}>
                <Eyebrow color={c.eyebrowColor}>{c.eyebrow}</Eyebrow>
                <h3 style={h3Style}>{c.title}</h3>
                <p style={bodyStyle}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIAGNOSTIC LAYER */}
      <section style={{ background: "#fff", padding: `${isMobile ? 80 : 112}px ${padX}px`, borderBottom: "1px solid var(--divider)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Eyebrow>Organizational Diagnostics</Eyebrow>
          <h2 style={h2Style}>Measure readiness before you invest.</h2>
          <p style={{ ...bodyStyle, fontSize: 16, marginTop: 24, maxWidth: 820 }}>
            For organizations navigating AI adoption and large-scale change, BrainWise adds an organizational diagnostic layer: the Neuroscience Adoption Index (NAI), the AI Readiness Skills Assessment (AIRSA), and the Habit Stabilization Scorecard (HSS), deployed through the EVOLVE methodology.
          </p>
          <div style={{ marginTop: 20 }}>
            <Link
              to="/our-approach"
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 600,
                fontSize: 15,
                color: "var(--bw-teal)",
                textDecoration: "underline",
              }}
            >
              See how EVOLVE works →
            </Link>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ background: "var(--bw-cream)", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>Pricing</Eyebrow>
          <h2 style={h2Style}>Per seat, per year. Tiered by depth.</h2>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, marginTop: 48 }}>
            {pricingCards.map((c) => (
              <div key={c.title} style={cardStyle}>
                <Eyebrow color={c.eyebrowColor}>{c.eyebrow}</Eyebrow>
                <h3 style={{ ...h3Style, marginTop: 12 }}>{c.title}</h3>
                <p style={bodyStyle}>{c.body}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
            <MarketingButton variant="primary" size="lg" onClick={() => openModal("enterprise_pricing_briefing")}>
              Book a conversation for pricing
            </MarketingButton>
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
              Development for everyone, at a cost you can scale.
            </h2>
          </div>
          <div>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 16, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, margin: 0 }}>
              Run a Team Profile on your real leadership team, and decide from that.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
              <MarketingButton variant="primary" size="lg" onClick={() => openModal("enterprise_footer_briefing")}>
                Book a conversation
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
