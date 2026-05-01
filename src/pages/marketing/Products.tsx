import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "@/styles/marketing-tokens.css";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import Eyebrow from "@/components/marketing/Eyebrow";
import BriefingModal from "@/components/marketing/BriefingModal";
import MarketingTile from "@/components/marketing/MarketingTile";
import MarketingDetailModal from "@/components/marketing/MarketingDetailModal";
import type { MarketingCardData } from "@/components/marketing/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { meta, assessments, certifications } from "@/content/marketing/productsContent";

type TabValue = "assessments" | "certifications";

function hashToTab(hash: string): TabValue {
  const h = hash.replace("#", "");
  if (h === "certifications" || h === "coach-certifications") return "certifications";
  return "assessments";
}

export default function Products() {
  const location = useLocation();
  const navigate = useNavigate();
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [openCard, setOpenCard] = useState<MarketingCardData | null>(null);
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);

  const initialTab = useMemo(() => hashToTab(location.hash), []);
  const [tab, setTab] = useState<TabValue>(initialTab);

  useEffect(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  // tab -> hash
  useEffect(() => {
    const targetHash = tab === "certifications" ? "#certifications" : "";
    if (location.hash !== targetHash && !(tab === "certifications" && location.hash === "#coach-certifications")) {
      navigate({ pathname: location.pathname, hash: targetHash }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // hash -> tab (handles back/forward)
  useEffect(() => {
    const next = hashToTab(location.hash);
    if (next !== tab) setTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash]);

  const isMobile = w < 640;
  const gridCols = w >= 1024 ? "repeat(3, 1fr)" : w >= 640 ? "repeat(2, 1fr)" : "1fr";
  const gridGap = w >= 1024 ? 24 : w >= 640 ? 20 : 16;

  const renderGrid = (cards: MarketingCardData[]) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: gridCols,
        gap: gridGap,
        alignItems: "start",
      }}
    >
      {cards.map((card) => (
        <MarketingTile key={card.id} card={card} onOpen={() => setOpenCard(card)} />
      ))}
    </div>
  );

  return (
    <div className="bw-marketing-root">
      <MarketingNav />

      {/* Hero */}
      <section
        style={{
          background: "var(--bw-cream)",
          padding: isMobile ? "64px 24px 48px" : "96px 48px 64px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>{meta.eyebrow}</Eyebrow>
          <h1
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(34px, 5vw, 54px)",
              color: "var(--bw-navy)",
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
              color: "var(--bw-slate)",
              lineHeight: 1.55,
              maxWidth: 720,
              marginTop: 20,
              marginBottom: 0,
            }}
          >
            {meta.subhead}
          </p>
        </div>
      </section>

      {/* Tabs */}
      <section
        style={{
          background: "var(--bw-cream)",
          padding: isMobile ? "32px 24px 64px" : "48px 48px 96px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
            <TabsList className="bw-products-tabs">
              <TabsTrigger value="assessments">Assessments</TabsTrigger>
              <TabsTrigger value="certifications">Certifications</TabsTrigger>
            </TabsList>
            <TabsContent value="assessments">{renderGrid(assessments)}</TabsContent>
            <TabsContent value="certifications">{renderGrid(certifications)}</TabsContent>
          </Tabs>
        </div>
      </section>

      <MarketingFooter />

      <MarketingDetailModal
        card={openCard}
        onClose={() => setOpenCard(null)}
        onOpenBriefing={() => setBriefingOpen(true)}
      />

      <BriefingModal
        open={briefingOpen}
        onClose={() => setBriefingOpen(false)}
        source="products_page"
      />
    </div>
  );
}
