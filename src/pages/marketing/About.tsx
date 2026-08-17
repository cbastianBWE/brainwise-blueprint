import { CSSProperties, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/marketing-tokens.css";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingButton from "@/components/marketing/MarketingButton";
import Eyebrow from "@/components/marketing/Eyebrow";
import DotArc from "@/components/marketing/DotArc";
import TestimonialSection from "@/components/marketing/TestimonialSection";
import PractitionerHeadshot from "@/components/PractitionerHeadshot";
import { setPageMeta } from "@/components/marketing/newsletter/setPageMeta";
import { meta } from "@/content/marketing/aboutContent";

interface TeamMember {
  slug: string;
  display_name: string;
  role_title: string | null;
  credentials: string | null;
  headline: string | null;
  short_bio: string | null;
  bio: string | null;
  headshot_bucket: string;
  headshot_path: string | null;
  booking_url: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  sort_order: number;
}

function useIsBelow(width: number) {
  const [v, setV] = useState(typeof window !== "undefined" ? window.innerWidth < width : false);
  useEffect(() => {
    const onR = () => setV(window.innerWidth < width);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [width]);
  return v;
}

function publicUrl(bucket: string, path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

function paragraphsOf(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const bodyStyle: CSSProperties = {
  fontFamily: "'Montserrat', sans-serif",
  fontSize: 16,
  color: "var(--bw-slate)",
  lineHeight: 1.65,
};

const h2Style: CSSProperties = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 700,
  fontSize: "clamp(28px, 3.5vw, 44px)",
  color: "var(--bw-navy)",
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
  margin: 0,
};

export default function About() {
  const isMobile = useIsBelow(768);
  const isTablet = useIsBelow(1024);
  const padX = isMobile ? 20 : 48;

  const teamQuery = useQuery({
    queryKey: ["mk-about-team"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("mk_about_team");
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });

  const team = teamQuery.data ?? [];

  useEffect(() => {
    return setPageMeta({
      title: "About BrainWise Enterprises",
      description:
        "BrainWise Enterprises turns applied neuroscience into assessments, coaching, and certification that make change stick. Meet the founders.",
      canonical: "https://brainwiseenterprises.com/about",
      ogTitle: "About BrainWise Enterprises",
      ogDescription:
        "Why BrainWise exists, and the practitioners behind the assessments, coaching, and certification.",
      ogType: "website",
      ogUrl: "https://brainwiseenterprises.com/about",
      twitterCard: "summary_large_image",
      jsonLd: {
        id: "about-organization-jsonld",
        data: {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "BrainWise Enterprises",
          url: "https://brainwiseenterprises.com",
          founder: team.map((m) => ({
            "@type": "Person",
            name: m.display_name,
            jobTitle: m.role_title ?? undefined,
            sameAs: m.linkedin_url ?? undefined,
          })),
        },
      },
    });
  }, [team]);

  return (
    <div className="bw-marketing-root" style={{ background: "var(--bg-1)", overflowX: "hidden" }}>
      <MarketingNav />

      {/* HERO */}
      <section
        style={{
          background: "var(--bw-navy)",
          padding: isMobile ? "64px 20px 80px" : "96px 48px 112px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <DotArc size={720} opacity={0.09} style={{ right: -160, top: -80 }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <Eyebrow>{meta.heroEyebrow}</Eyebrow>
          <h1
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(36px, 5.5vw, 72px)",
              color: "#fff",
              maxWidth: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            {meta.heroTitle}
          </h1>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: isMobile ? 16 : 18,
              color: "rgba(255,255,255,0.78)",
              maxWidth: 660,
              marginTop: 28,
              lineHeight: 1.55,
            }}
          >
            {meta.heroSubhead}
          </p>
        </div>
      </section>

      {/* WHY BRAINWISE EXISTS */}
      <section
        style={{
          background: "#fff",
          padding: `${isMobile ? 80 : 112}px ${padX}px`,
          borderBottom: "1px solid var(--divider)",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Eyebrow>{meta.premiseEyebrow}</Eyebrow>
          <h2 style={h2Style}>{meta.premiseTitle}</h2>
          <p style={{ ...bodyStyle, marginTop: 22 }}>{meta.premiseBodyOne}</p>
          <p style={{ ...bodyStyle, marginTop: 18 }}>{meta.premiseBodyTwo}</p>
        </div>
      </section>

      {/* FOUNDERS */}
      <section style={{ background: "var(--bw-cream)", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Eyebrow>{meta.foundersEyebrow}</Eyebrow>
          <h2 style={h2Style}>{meta.foundersTitle}</h2>
          <p style={{ ...bodyStyle, marginTop: 20, maxWidth: 720 }}>{meta.foundersIntro}</p>

          <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 32 }}>
            {teamQuery.isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(0,0,0,0.04)",
                    borderRadius: "var(--r-lg)",
                    height: isMobile ? 380 : 300,
                  }}
                />
              ))
            ) : teamQuery.isError ? (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid var(--bw-cream-300)",
                  borderRadius: "var(--r-lg)",
                  padding: "40px 32px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    fontSize: 18,
                    color: "var(--bw-navy)",
                    margin: "0 0 16px",
                  }}
                >
                  {meta.foundersErrorTitle}
                </p>
                <button
                  type="button"
                  onClick={() => teamQuery.refetch()}
                  style={{
                    background: "var(--bw-orange)",
                    color: "#fff",
                    border: "none",
                    padding: "10px 18px",
                    borderRadius: 8,
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {meta.retryLabel}
                </button>
              </div>
            ) : team.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid var(--bw-cream-300)",
                  borderRadius: "var(--r-lg)",
                  padding: "44px 32px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    fontSize: 20,
                    color: "var(--bw-navy)",
                    margin: 0,
                  }}
                >
                  {meta.foundersEmptyTitle}
                </p>
                <p style={{ ...bodyStyle, margin: "12px auto 0", maxWidth: 520, fontSize: 15 }}>
                  {meta.foundersEmptyBody}
                </p>
              </div>
            ) : (
              team.map((m, i) => (
                <FounderCard key={m.slug} m={m} flip={!isTablet && i % 2 === 1} isMobile={isMobile} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — renders nothing when the pool is empty */}
      <TestimonialSection placement="about" heading={meta.testimonialsHeading} background="white" />

      {/* CLOSING CTA */}
      <section
        style={{
          background: "var(--bw-navy)",
          padding: `${isMobile ? 72 : 96}px ${padX}px`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <DotArc size={640} opacity={0.08} style={{ left: -160, bottom: -120 }} />
        <div style={{ maxWidth: 820, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <Eyebrow>{meta.ctaEyebrow}</Eyebrow>
          <h2
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(28px, 3.5vw, 44px)",
              color: "#fff",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            {meta.ctaTitle}
          </h2>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 16,
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.6,
              margin: "20px 0 30px",
              maxWidth: 640,
            }}
          >
            {meta.ctaBody}
          </p>
          <MarketingButton as={Link} to="/contact" variant="primary" size="lg">
            {meta.ctaButton}
          </MarketingButton>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function FounderCard({
  m,
  flip,
  isMobile,
}: {
  m: TeamMember;
  flip: boolean;
  isMobile: boolean;
}) {
  const img = publicUrl(m.headshot_bucket, m.headshot_path);
  const paras = paragraphsOf(m.bio);
  const nameLine = m.credentials ? `${m.display_name}, ${m.credentials}` : m.display_name;
  const size = isMobile ? 240 : 260;
  const links = [
    m.booking_url ? { href: m.booking_url, label: "Book a call", primary: true } : null,
    m.linkedin_url ? { href: m.linkedin_url, label: "LinkedIn", primary: false } : null,
    m.website_url ? { href: m.website_url, label: "Website", primary: false } : null,
  ].filter(Boolean) as { href: string; label: string; primary: boolean }[];

  return (
    <article
      style={{
        background: "#fff",
        border: "1px solid var(--bw-cream-300)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: isMobile ? "28px 22px" : "36px 36px",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : flip ? `1fr ${size}px` : `${size}px 1fr`,
        gap: isMobile ? 24 : 40,
        alignItems: "start",
      }}
    >
      <div
        style={{
          order: isMobile ? 0 : flip ? 2 : 0,
          display: "flex",
          justifyContent: isMobile ? "center" : "flex-start",
        }}
      >
        <PractitionerHeadshot
          src={img}
          name={m.display_name}
          size={size}
          shape="square"
          fontSize={56}
          objectPosition="center top"
        />
      </div>

      <div style={{ order: isMobile ? 1 : flip ? 1 : 2, minWidth: 0 }}>
        <h3
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: isMobile ? 24 : 28,
            color: "var(--bw-navy)",
            margin: 0,
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
          }}
        >
          {nameLine}
        </h3>
        {m.role_title && (
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--bw-slate)",
              margin: "8px 0 0",
            }}
          >
            {m.role_title}
          </p>
        )}
        {m.headline && m.headline.trim() !== (m.role_title ?? "").trim() && (
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: isMobile ? 15 : 16,
              color: "var(--bw-navy)",
              lineHeight: 1.5,
              margin: "16px 0 0",
            }}
          >
            {m.headline}
          </p>
        )}

        {paras.length > 0 && (
          <div style={{ marginTop: 18 }}>
            {paras.map((p, i) => (
              <p key={i} style={{ ...bodyStyle, fontSize: 15.5, margin: i === 0 ? 0 : "14px 0 0" }}>
                {p}
              </p>
            ))}
          </div>
        )}

        {links.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}>
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener"
                style={{
                  textDecoration: "none",
                  padding: "10px 18px",
                  borderRadius: 999,
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  background: l.primary ? "var(--bw-orange)" : "transparent",
                  color: l.primary ? "#fff" : "var(--bw-navy)",
                  border: l.primary ? "1px solid var(--bw-orange)" : "1px solid var(--bw-cream-300)",
                }}
              >
                {l.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
