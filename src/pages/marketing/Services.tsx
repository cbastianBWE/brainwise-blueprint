import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "@/styles/marketing-tokens.css";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingButton from "@/components/marketing/MarketingButton";
import Eyebrow from "@/components/marketing/Eyebrow";
import DotArc from "@/components/marketing/DotArc";
import BriefingModal from "@/components/marketing/BriefingModal";
import ServiceTile from "@/components/marketing/ServiceTile";
import ServiceDetailModal from "@/components/marketing/ServiceDetailModal";
import { meta, services, type ServiceCard } from "@/content/marketing/servicesContent";

export default function Services() {
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [openCard, setOpenCard] = useState<ServiceCard | null>(null);
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);

  useEffect(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const isMobile = w < 640;
  const isTablet = w >= 640 && w < 1024;

  const gridCols = w >= 1024 ? "repeat(3, 1fr)" : w >= 640 ? "repeat(2, 1fr)" : "1fr";
  const gridGap = w >= 1024 ? 24 : w >= 640 ? 20 : 16;

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
        <DotArc
          size={620}
          opacity={0.08}
          style={{ right: -120, top: "50%", transform: "translateY(-50%)", zIndex: 0 }}
        />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <Eyebrow color="var(--bw-orange)">{meta.eyebrow}</Eyebrow>
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
            {meta.title}
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
            {meta.subhead}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
            <MarketingButton variant="primary" size="md" onClick={() => setBriefingOpen(true)}>
              Book a Briefing
            </MarketingButton>
            <MarketingButton
              variant="invert"
              size="md"
              onClick={() => document.getElementById("methodology")?.scrollIntoView({ behavior: "smooth" })}
            >
              See how it works
            </MarketingButton>
          </div>
        </div>
      </section>

      {/* Services accordion */}
      <section
        style={{
          background: "var(--bw-cream)",
          padding: isMobile ? "64px 24px" : "96px 48px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ maxWidth: 720 }}>
            <Eyebrow>Engagement Lines</Eyebrow>
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
              What we do.
            </h2>
          </div>
          <div
            style={{
              marginTop: 56,
              display: "grid",
              gridTemplateColumns: gridCols,
              gap: gridGap,
              alignItems: "start",
            }}
          >
            {services.map((card) => (
              <ServiceTile key={card.id} card={card} onOpen={() => setOpenCard(card)} />
            ))}
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section
        id="methodology"
        style={{
          background: "white",
          padding: isMobile ? "64px 24px" : "96px 48px",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
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
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 16 }}>
            <p
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 400,
                fontSize: 16,
                lineHeight: 1.7,
                color: "var(--bw-slate-700)",
                margin: 0,
              }}
            >
              {meta.methodologyBody1}
            </p>
            <p
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 400,
                fontSize: 16,
                lineHeight: 1.7,
                color: "var(--bw-slate-700)",
                margin: 0,
              }}
            >
              {meta.methodologyBody2}
            </p>
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
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Eyebrow color="var(--bw-orange)" style={{ display: "inline-block" }}>
            {meta.ctaSectionEyebrow}
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
            {meta.ctaSectionTitle}
          </h2>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 400,
              fontSize: 16,
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.55,
              marginTop: 16,
              marginBottom: 0,
            }}
          >
            {meta.ctaSectionBody}
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 32,
              justifyContent: "center",
            }}
          >
            <MarketingButton variant="primary" size="md" onClick={() => setBriefingOpen(true)}>
              Book a Briefing
            </MarketingButton>
            <MarketingButton as={Link} to="/contact" variant="invert" size="md">
              Contact us
            </MarketingButton>
          </div>
        </div>
      </section>

      <MarketingFooter />

      <BriefingModal
        open={briefingOpen}
        onClose={() => setBriefingOpen(false)}
        source="services_page"
      />

      <ServiceDetailModal
        card={openCard}
        onClose={() => setOpenCard(null)}
        onOpenBriefing={() => setBriefingOpen(true)}
      />
    </div>
  );
}
