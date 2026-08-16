import { CSSProperties, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/marketing-tokens.css";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingButton from "@/components/marketing/MarketingButton";
import Eyebrow from "@/components/marketing/Eyebrow";
import DotArc from "@/components/marketing/DotArc";
import { setPageMeta } from "@/components/marketing/newsletter/setPageMeta";
import { meta, certLabel } from "@/content/marketing/practitionerDirectoryContent";
import {
  headshotUrl,
  initialsOf,
  locationOf,
  type PublicPractitioner,
} from "@/lib/publicDirectory";

function useIsBelow(width: number) {
  const [v, setV] = useState(typeof window !== "undefined" ? window.innerWidth < width : false);
  useEffect(() => {
    const onR = () => setV(window.innerWidth < width);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [width]);
  return v;
}

const chipStyle: CSSProperties = {
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.22)",
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  fontSize: 12,
  color: "#fff",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function PractitionerProfile() {
  const { slug = "" } = useParams();
  const isMobile = useIsBelow(768);
  const isTablet = useIsBelow(1024);
  const padX = isMobile ? 20 : 48;

  const profileQuery = useQuery({
    queryKey: ["pd-public-profile", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("pd_public_profile", { p_slug: slug });
      if (error) throw error;
      const rows = (data ?? []) as PublicPractitioner[];
      return rows[0] ?? null;
    },
  });

  const p = profileQuery.data ?? null;
  const img = headshotUrl(p?.headshot_path);
  const loc = p ? locationOf(p) : "";

  useEffect(() => {
    if (!p) return;
    const description = [p.headline, loc].filter(Boolean).join(" · ") ||
      `${p.display_name} is a BrainWise certified practitioner.`;
    return setPageMeta({
      title: `${p.display_name} | BrainWise Certified Practitioner`,
      description,
      canonical: `https://brainwiseenterprises.com/find-a-practitioner/${p.slug}`,
      ogTitle: `${p.display_name} | BrainWise Certified Practitioner`,
      ogDescription: description,
      ogType: "profile",
      ogUrl: `https://brainwiseenterprises.com/find-a-practitioner/${p.slug}`,
      ogImage: img,
      twitterCard: "summary_large_image",
      jsonLd: {
        id: "practitioner-profile-jsonld",
        data: {
          "@context": "https://schema.org",
          "@type": "Person",
          name: p.display_name,
          jobTitle: p.headline ?? "BrainWise Certified Practitioner",
          description: p.bio ?? description,
          image: img ?? undefined,
          url: `https://brainwiseenterprises.com/find-a-practitioner/${p.slug}`,
          address: loc || undefined,
          sameAs: [p.linkedin_url, p.instagram_url, p.youtube_url, p.x_url, p.website_url].filter(
            Boolean,
          ),
        },
      },
    });
  }, [p, img, loc]);

  const links = p
    ? ([
        { label: "Website", url: p.website_url },
        { label: "Book a session", url: p.booking_url },
        { label: "LinkedIn", url: p.linkedin_url },
        { label: "Instagram", url: p.instagram_url },
        { label: "YouTube", url: p.youtube_url },
        { label: "X", url: p.x_url },
      ].filter((l) => Boolean(l.url)) as { label: string; url: string }[])
    : [];

  const paragraphs = (p?.bio ?? "")
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="bw-marketing-root" style={{ background: "var(--bg-1)", overflowX: "hidden" }}>
      <MarketingNav />

      {profileQuery.isLoading ? (
        <section style={{ background: "var(--bw-navy)", padding: `${isMobile ? 80 : 120}px ${padX}px` }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", height: 200, background: "rgba(255,255,255,0.06)", borderRadius: "var(--r-lg)" }} />
        </section>
      ) : profileQuery.isError ? (
        <section style={{ background: "#fff", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 28, color: "var(--bw-navy)" }}>
              {meta.loadErrorTitle}
            </h1>
            <div style={{ marginTop: 24 }}>
              <button
                type="button"
                onClick={() => profileQuery.refetch()}
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
          </div>
        </section>
      ) : !p ? (
        <section style={{ background: "#fff", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <Eyebrow>404</Eyebrow>
            <h1
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(28px, 3.5vw, 44px)",
                color: "var(--bw-navy)",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {meta.profileNotFoundTitle}
            </h1>
            <p
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 16,
                color: "var(--bw-slate)",
                lineHeight: 1.6,
                margin: "18px auto 28px",
                maxWidth: 520,
              }}
            >
              {meta.profileNotFoundBody}
            </p>
            <MarketingButton as={Link} to="/find-a-practitioner" variant="primary" size="lg">
              Browse the directory
            </MarketingButton>
          </div>
        </section>
      ) : (
        <>
          {/* HERO */}
          <section
            style={{
              background: "var(--bw-navy)",
              padding: isMobile ? "56px 20px 72px" : "88px 48px 104px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <DotArc size={640} opacity={0.08} style={{ right: -140, top: -80 }} />
            <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 2 }}>
              <Link
                to="/find-a-practitioner"
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.7)",
                  textDecoration: "none",
                }}
              >
                ← {meta.backToDirectory}
              </Link>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isTablet ? "1fr" : "180px 1fr",
                  gap: isTablet ? 28 : 40,
                  alignItems: "center",
                  marginTop: 28,
                }}
              >
                {img ? (
                  <img
                    src={img}
                    alt={p.display_name}
                    style={{ width: 180, height: 180, borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: 180,
                      height: 180,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 700,
                      fontSize: 48,
                      color: "#fff",
                    }}
                  >
                    {initialsOf(p.display_name)}
                  </div>
                )}
                <div>
                  <Eyebrow>Certified Practitioner</Eyebrow>
                  <h1
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 800,
                      fontSize: "clamp(32px, 4.5vw, 56px)",
                      color: "#fff",
                      lineHeight: 1.05,
                      letterSpacing: "-0.02em",
                      margin: 0,
                    }}
                  >
                    {p.display_name}
                  </h1>
                  {p.headline && (
                    <p
                      style={{
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: isMobile ? 16 : 18,
                        color: "rgba(255,255,255,0.8)",
                        lineHeight: 1.55,
                        marginTop: 16,
                        maxWidth: 640,
                      }}
                    >
                      {p.headline}
                    </p>
                  )}
                  {loc && (
                    <p
                      style={{
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: 14,
                        color: "rgba(255,255,255,0.6)",
                        marginTop: 10,
                      }}
                    >
                      {loc}
                    </p>
                  )}
                  {(p.certifications ?? []).length > 0 && (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
                      {(p.certifications ?? []).map((c) => {
                        const when = formatDate(c.certified_at);
                        return (
                          <span key={c.certification_type} style={chipStyle}>
                            {certLabel(c.certification_type)}
                            {when ? ` · ${when}` : ""}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* BIO + LINKS */}
          <section style={{ background: "#fff", padding: `${isMobile ? 72 : 104}px ${padX}px` }}>
            <div
              style={{
                maxWidth: 1100,
                margin: "0 auto",
                display: "grid",
                gridTemplateColumns: isTablet ? "1fr" : "1.6fr 1fr",
                gap: isTablet ? 40 : 56,
                alignItems: "start",
              }}
            >
              <div>
                <Eyebrow>About</Eyebrow>
                {paragraphs.length > 0 ? (
                  paragraphs.map((para, i) => (
                    <p
                      key={i}
                      style={{
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: 16,
                        color: "var(--bw-slate)",
                        lineHeight: 1.7,
                        marginTop: i === 0 ? 8 : 18,
                        marginBottom: 0,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {para}
                    </p>
                  ))
                ) : (
                  <p
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: 16,
                      color: "var(--bw-slate)",
                      lineHeight: 1.7,
                    }}
                  >
                    This practitioner has not added a bio yet.
                  </p>
                )}
              </div>

              {links.length > 0 && (
                <div
                  style={{
                    background: "var(--bw-cream)",
                    border: "1px solid var(--bw-cream-300)",
                    borderRadius: "var(--r-lg)",
                    padding: "26px 24px",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <Eyebrow>Connect</Eyebrow>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {links.map((l) => (
                      <a
                        key={l.label}
                        href={l.url}
                        target="_blank"
                        rel="nofollow noopener"
                        style={{
                          display: "block",
                          padding: "11px 14px",
                          borderRadius: "var(--r-md)",
                          background: "#fff",
                          border: "1px solid var(--bw-cream-300)",
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: 600,
                          fontSize: 14,
                          color: "var(--bw-navy)",
                          textDecoration: "none",
                        }}
                      >
                        {l.label} →
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ maxWidth: 1100, margin: "48px auto 0" }}>
              <MarketingButton as={Link} to="/find-a-practitioner" variant="secondary" size="md">
                {meta.backToDirectory}
              </MarketingButton>
            </div>
          </section>
        </>
      )}

      <MarketingFooter />
    </div>
  );
}
