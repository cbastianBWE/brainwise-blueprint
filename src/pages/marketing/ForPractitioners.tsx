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

  const introStyle: React.CSSProperties = {
    ...bodyStyle,
    fontSize: 16,
    marginTop: 20,
    maxWidth: 780,
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
            Get certified to debrief the Personal Threat & Reward Profile and deliver paired and team profiles. Build your own practice, or develop the people inside your own organization.
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

      {/* THE RECOGNITION MOMENT */}
      <section style={{ background: "#fff", padding: `${isMobile ? 80 : 112}px ${padX}px`, borderBottom: "1px solid var(--divider)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Eyebrow>The Recognition Moment</Eyebrow>
          <h2 style={h2Style}>You will feel it before your clients do.</h2>
          <p style={introStyle}>
            Before you certify, you take the PTP yourself. Most people have the same reaction. They see a driver named that they have felt for years but never had language for, and they think, that is actually who I am. That moment is the product. Your existing tools describe what a client does. PTP shows what is quietly driving it, and then gives you the means to work on it. You will recognize the moment because you will have had it first.
          </p>
        </div>
      </section>

      {/* THE FIVE DRIVERS */}
      <section style={{ background: "var(--bw-cream)", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>The Five Drivers</Eyebrow>
          <h2 style={h2Style}>Three things the brain protects. Two it reaches for.</h2>
          <p style={introStyle}>
            The brain is always scanning for what threatens it and what rewards it. The PTP maps that across five dimensions, the five P's.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, marginTop: 40 }}>
            {[
              { title: "Protection", body: "The need to feel safe and secure." },
              { title: "Participation", body: "The need to belong and be welcomed." },
              { title: "Prediction", body: "The need to understand what is happening and what comes next." },
            ].map((c) => (
              <div key={c.title} style={cardStyle}>
                <Eyebrow color="var(--bw-teal)">Threat driver</Eyebrow>
                <h3 style={h3Style}>{c.title}</h3>
                <p style={bodyStyle}>{c.body}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20, marginTop: 20 }}>
            {[
              { title: "Purpose", body: "A sense of meaning." },
              { title: "Pleasure", body: "Genuine enjoyment and joy." },
            ].map((c) => (
              <div key={c.title} style={cardStyle}>
                <Eyebrow color="var(--bw-orange)">Reward driver</Eyebrow>
                <h3 style={h3Style}>{c.title}</h3>
                <p style={bodyStyle}>{c.body}</p>
              </div>
            ))}
          </div>

          <p
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              fontSize: isMobile ? 17 : 19,
              color: "var(--bw-navy)",
              lineHeight: 1.5,
              letterSpacing: "-0.01em",
              margin: 0,
              marginTop: 36,
              padding: "24px 28px",
              background: "#fff",
              borderLeft: "4px solid var(--bw-orange)",
              borderRadius: "var(--r-md)",
            }}
          >
            Reward needs safety first. Until the three threat drivers are met well enough, Purpose and Pleasure stay out of reach, and an unmet reward drive can flip into a threat of its own. Reading that pattern in a specific person is what a practitioner learns to do.
          </p>
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

      {/* WHAT YOU GET */}
      <section style={{ background: "var(--bw-cream)", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>What You Get</Eyebrow>
          <h2 style={h2Style}>A complete system, not a report.</h2>
          <p style={introStyle}>
            Certification gives you the instrument, the program that runs off it, and the tools no other credential includes.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, marginTop: 48 }}>
            {[
              { color: "var(--bw-teal)", title: "The instrument", body: "89 facets across the five drivers, three on the threat side (Protection, Participation, Prediction) and two on the reward side (Purpose, Pleasure). Where most tools sort people into four to nine boxes, PTP resolves the specific driver underneath the behavior. And every facet is double-edged, so the work is rarely \"raise this score,\" it is \"see where this helps you and where it gets in your way, and choose.\"" },
              { color: "var(--bw-orange)", title: "200+ activities", body: "Structured, interactive activities organized as a Transition Map across ten areas and three depth tiers. Most personalize to the participant's profile and read their earlier work, so the program remembers the journey and compounds over months." },
              { color: "var(--bw-plum)", title: "The Paired Profile", body: "Two people read against each other at facet level, in work, personal, or romantic mode. It names which overlaps create friction and which gaps are actually strengths. No other assessment produces this." },
              { color: "var(--bw-forest)", title: "The Team Profile", body: "Aggregate patterns across a group, plus a private brief for the leader on where the friction is and why." },
              { color: "var(--bw-teal)", title: "A private practitioner section", body: "Every report shows you why the interpreter reached its conclusion. You work with the logic, not a score you have to take on faith." },
              { color: "var(--bw-orange)", title: "AI coaching throughout", body: "Your client has a knowledgeable, in-role conversation partner between sessions, informed by their own profile." },
            ].map((c) => (
              <div key={c.title} style={cardStyle}>
                <Eyebrow color={c.color}>Included</Eyebrow>
                <h3 style={h3Style}>{c.title}</h3>
                <p style={bodyStyle}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE PROGRAM YOU'LL RUN */}
      <section style={{ background: "#fff", padding: `${isMobile ? 80 : 112}px ${padX}px`, borderBottom: "1px solid var(--divider)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>The Program You'll Run</Eyebrow>
          <h2 style={h2Style}>A guided arc, not a pile of worksheets.</h2>
          <p style={introStyle}>
            The 200+ activities are organized as a Transition Map, one picture of the journey a participant moves through, from telling their story, to naming a future, to understanding where they stand now, to building the pathway between, to making the change hold.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20, marginTop: 48 }}>
            {[
              { color: "var(--bw-teal)", title: "A journey in ten areas", body: "Start Here, Purpose, Ideal Future, Present State, Past, Life's Tools, Pathway To Get There, Resolve, External Support, and Wrap Up. The participant sees the whole map before they begin, and you suggest what they need next." },
              { color: "var(--bw-orange)", title: "Three depth tiers", body: "Foundational is the spine you suggest by default, Typical goes deeper once that foundation is laid, and Advanced is a specialist tool you reach for on a specific need." },
              { color: "var(--bw-plum)", title: "It builds on itself", body: "Most activities read the participant's own earlier work, so an activity in month three knows what they wrote in month one. You guide the sequence, the system carries the thread." },
              { color: "var(--bw-forest)", title: "Personalized by their own drivers", body: "In many activities the platform offers options drawn from the participant's own five driving-force scores, and they keep the ones that land. The personalization is seeded by their results, not a generic template." },
              { color: "var(--bw-teal)", title: "Open by design", body: "Only the PTP debrief requires a completed profile. Everything else is yours to prescribe the moment it will help." },
            ].map((c) => (
              <div key={c.title} style={cardStyle}>
                <Eyebrow color={c.color}>Program</Eyebrow>
                <h3 style={h3Style}>{c.title}</h3>
                <p style={bodyStyle}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT RUNS */}
      <section style={{ background: "var(--bw-cream)", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>How It Runs</Eyebrow>
          <h2 style={h2Style}>A blended program built around practice, not a slide deck.</h2>
          <p style={introStyle}>
            It is deliberately small, so the coaching you get is real.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20, marginTop: 48 }}>
            {[
              { color: "var(--bw-teal)", title: "Personalized cohorts, never more than six to one", body: "Every cohort is capped at six participants to one master certified coach. Facilitators scale with enrollment, so the ratio never slips. You are one of six people a master coach is actually developing, not a seat in a webinar." },
              { color: "var(--bw-orange)", title: "The actor debriefs", body: "You put what you learn into practice on live people, not case studies. You send the PTP to two actors, one you know and one you do not, and both take the full assessment. Then you deliver your first real debrief to each, with feedback. Debriefing a stranger and someone familiar surfaces different challenges, which is exactly the point." },
            ].map((c) => (
              <div key={c.title} style={cardStyle}>
                <Eyebrow color={c.color}>Format</Eyebrow>
                <h3 style={h3Style}>{c.title}</h3>
                <p style={bodyStyle}>{c.body}</p>
              </div>
            ))}
          </div>
          <p style={{ ...bodyStyle, fontSize: 16, marginTop: 36, maxWidth: 900 }}>
            Roughly nine hours of live virtual training across four sessions, about four and a half hours of self-paced modules, two hours of actor debriefs, and a thirty-minute competency review.{" "}
            <Link to="/certification" style={{ color: "var(--bw-orange)", fontWeight: 600, textDecoration: "underline" }}>
              See the full certification detail
            </Link>
            .
          </p>
        </div>
      </section>

      {/* WHAT MAKES THIS DIFFERENT */}
      <section style={{ background: "#fff", padding: `${isMobile ? 80 : 112}px ${padX}px`, borderBottom: "1px solid var(--divider)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>What Makes This Different</Eyebrow>
          <h2 style={h2Style}>You leave with a practice to run, not a report to debrief.</h2>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, marginTop: 48 }}>
            {[
              { color: "var(--bw-teal)", title: "A system, not a test", body: "A typical certification qualifies you to run a debrief, valuable and finite. PTP qualifies you to run a structured, personalized, AI-supported program across 200+ activities for months, so the work continues between your sessions." },
              { color: "var(--bw-orange)", title: "It goes underneath what you already use", body: "If you are certified in DiSC, Enneagram, Working Genius, or Hogan, PTP does not replace them. Your tool says what your client does. PTP says what is driving it, and what is quietly working against it. Most of our practitioners run both." },
              { color: "var(--bw-plum)", title: "Ongoing client relationships", body: "Because the work continues between sessions, clients stay engaged over months instead of ending when the report is explained." },
            ].map((c) => (
              <div key={c.title} style={cardStyle}>
                <Eyebrow color={c.color}>Difference</Eyebrow>
                <h3 style={h3Style}>{c.title}</h3>
                <p style={bodyStyle}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* YOUR PRACTICE STAYS YOURS */}
      <section style={{ background: "var(--bw-cream)", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Eyebrow>Your Practice Stays Yours</Eyebrow>
          <h2 style={h2Style}>You keep your clients, and every dollar you charge them.</h2>
          <p style={{ ...bodyStyle, fontSize: 16, marginTop: 24 }}>
            BrainWise never takes a percentage of your coaching fees, and never sets your rates. Coaching networks routinely take 30 to 40 percent and set the rate for you. We do not. You keep your clients and every dollar you charge them for your coaching.
          </p>
          <p style={{ ...bodyStyle, fontSize: 16, marginTop: 16 }}>
            What anyone pays BrainWise is only for access to the platform. You pay for your certification, your annual subscription, and assessments. Your clients pay a platform fee to use the system, an individual through their own subscription and an enterprise through its seats, and you can cover that on their behalf if you prefer. That is all we ever charge, and none of it touches what you charge for your coaching.
          </p>
        </div>
      </section>

      {/* WHAT YOU CAN DELIVER */}
      <section style={{ background: "#fff", padding: `${isMobile ? 80 : 112}px ${padX}px`, borderBottom: "1px solid var(--divider)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
          <div>
            <h2 style={h2Style}>What you can deliver</h2>
            <p style={{ ...bodyStyle, fontSize: 16, marginTop: 20 }}>
              The PTP debrief, the Paired Profile, and the Team Profile at the practitioner level. Once you hold the full coach certification, the complete 200+ activity program with guided pathways.
            </p>
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
              paddingTop: 24,
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
