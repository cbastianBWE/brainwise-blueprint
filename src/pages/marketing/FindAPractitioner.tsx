import { CSSProperties, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/marketing-tokens.css";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import Eyebrow from "@/components/marketing/Eyebrow";
import DotArc from "@/components/marketing/DotArc";
import { setPageMeta } from "@/components/marketing/newsletter/setPageMeta";
import { meta, certLabel } from "@/content/marketing/practitionerDirectoryContent";
import {
  headshotUrl,
  initialsOf,
  locationOf,
  truncateWords,
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

const labelStyle: CSSProperties = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--bw-slate)",
  marginBottom: 8,
  display: "block",
};

const controlStyle: CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "var(--r-md)",
  border: "1px solid var(--bw-cream-300)",
  background: "#fff",
  fontFamily: "'Montserrat', sans-serif",
  fontSize: 14,
  color: "var(--bw-navy)",
};

const chipStyle: CSSProperties = {
  display: "inline-block",
  padding: "5px 11px",
  borderRadius: 999,
  background: "var(--bw-cream)",
  border: "1px solid var(--bw-cream-300)",
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: "0.03em",
  color: "var(--bw-navy)",
};

export default function FindAPractitioner() {
  const isMobile = useIsBelow(768);
  const isTablet = useIsBelow(1024);
  const padX = isMobile ? 20 : 48;
  const [params, setParams] = useSearchParams();

  const cert = params.get("cert") ?? "";
  const country = params.get("country") ?? "";
  const place = params.get("place") ?? "";
  const q = params.get("q") ?? "";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "country") next.delete("place");
    setParams(next, { replace: true });
  };

  const dirQuery = useQuery({
    queryKey: ["pd-public-directory"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("pd_public_directory");
      if (error) throw error;
      return (data ?? []) as PublicPractitioner[];
    },
  });

  const all = dirQuery.data ?? [];

  const certOptions = useMemo(() => {
    const s = new Set<string>();
    all.forEach((p) => (p.certifications ?? []).forEach((c) => s.add(c.certification_type)));
    return Array.from(s).sort((a, b) => certLabel(a).localeCompare(certLabel(b)));
  }, [all]);

  const countryOptions = useMemo(() => {
    const s = new Set<string>();
    all.forEach((p) => p.country && s.add(p.country));
    return Array.from(s).sort();
  }, [all]);

  const placeOptions = useMemo(() => {
    if (!country) return [];
    const s = new Set<string>();
    all
      .filter((p) => p.country === country)
      .forEach((p) => {
        if (p.city) s.add(p.city);
        if (p.region) s.add(p.region);
      });
    return Array.from(s).sort();
  }, [all, country]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all.filter((p) => {
      if (cert && !(p.certifications ?? []).some((c) => c.certification_type === cert)) return false;
      if (country && p.country !== country) return false;
      if (place && p.city !== place && p.region !== place) return false;
      if (term) {
        const hay = [p.display_name, p.headline, p.bio, p.city, p.region, p.country]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [all, cert, country, place, q]);

  const anyFilter = Boolean(cert || country || place || q);

  useEffect(() => {
    return setPageMeta({
      title: "Find a Certified BrainWise Practitioner",
      description:
        "Browse BrainWise certified practitioners. Every listing holds a live credential and appears with the practitioner's consent.",
      canonical: "https://brainwiseenterprises.com/find-a-practitioner",
      ogTitle: "Find a Certified BrainWise Practitioner",
      ogDescription:
        "Browse BrainWise certified practitioners and find one who fits the work you want to do.",
      ogType: "website",
      ogUrl: "https://brainwiseenterprises.com/find-a-practitioner",
      twitterCard: "summary_large_image",
      jsonLd: {
        id: "practitioner-directory-jsonld",
        data: {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "BrainWise Certified Practitioners",
          url: "https://brainwiseenterprises.com/find-a-practitioner",
          numberOfItems: all.length,
          itemListElement: all.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `https://brainwiseenterprises.com/find-a-practitioner/${p.slug}`,
            name: p.display_name,
          })),
        },
      },
    });
  }, [all]);

  const gridCols = isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)";

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
              maxWidth: 880,
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

      {/* DIRECTORY */}
      <section style={{ background: "#fff", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>{meta.filtersLabel}</Eyebrow>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: 16,
              marginTop: 20,
            }}
          >
            <div>
              <label style={labelStyle} htmlFor="pd-cert">Certification</label>
              <select
                id="pd-cert"
                value={cert}
                onChange={(e) => setParam("cert", e.target.value)}
                style={controlStyle}
              >
                <option value="">All certifications</option>
                {certOptions.map((c) => (
                  <option key={c} value={c}>
                    {certLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="pd-country">Country</label>
              <select
                id="pd-country"
                value={country}
                onChange={(e) => setParam("country", e.target.value)}
                style={controlStyle}
              >
                <option value="">All countries</option>
                {countryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="pd-q">Search</label>
              <input
                id="pd-q"
                type="search"
                value={q}
                placeholder={meta.searchPlaceholder}
                onChange={(e) => setParam("q", e.target.value)}
                style={controlStyle}
              />
            </div>
            {country && placeOptions.length > 0 && (
              <div>
                <label style={labelStyle} htmlFor="pd-place">City or region</label>
                <select
                  id="pd-place"
                  value={place}
                  onChange={(e) => setParam("place", e.target.value)}
                  style={controlStyle}
                >
                  <option value="">Anywhere in {country}</option>
                  {placeOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {anyFilter && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
                marginTop: 20,
              }}
            >
              <span
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 14,
                  color: "var(--bw-slate)",
                }}
              >
                {filtered.length} {filtered.length === 1 ? "practitioner" : "practitioners"}
              </span>
              <button
                type="button"
                onClick={() => setParams(new URLSearchParams(), { replace: true })}
                style={{
                  background: "transparent",
                  border: "1px solid var(--bw-cream-300)",
                  borderRadius: 999,
                  padding: "7px 14px",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  fontSize: 12,
                  color: "var(--bw-navy)",
                  cursor: "pointer",
                }}
              >
                {meta.clearFilters}
              </button>
            </div>
          )}

          <div style={{ marginTop: 40 }}>
            {dirQuery.isLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 24 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(0,0,0,0.04)",
                      borderRadius: "var(--r-lg)",
                      height: 300,
                    }}
                  />
                ))}
              </div>
            ) : dirQuery.isError ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  background: "var(--bw-cream)",
                  borderRadius: "var(--r-lg)",
                }}
              >
                <p
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    color: "var(--bw-navy)",
                    marginBottom: 12,
                  }}
                >
                  {meta.loadErrorTitle}
                </p>
                <button
                  type="button"
                  onClick={() => dirQuery.refetch()}
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
            ) : all.length === 0 ? (
              <EmptyBlock title={meta.emptyDirectoryTitle} body={meta.emptyDirectoryBody} />
            ) : filtered.length === 0 ? (
              <EmptyBlock title={meta.emptyResultsTitle} body={meta.emptyResultsBody} />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 24 }}>
                {filtered.map((p) => (
                  <PractitionerCard key={p.slug} p={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* EXPLAINER */}
      <section style={{ background: "var(--bw-cream)", padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Eyebrow>{meta.explainerEyebrow}</Eyebrow>
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
            {meta.explainerTitle}
          </h2>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 16,
              color: "var(--bw-slate)",
              lineHeight: 1.6,
              marginTop: 20,
              maxWidth: 780,
            }}
          >
            {meta.explainerBody}
          </p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function EmptyBlock({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        background: "var(--bw-cream)",
        borderRadius: "var(--r-lg)",
        padding: "48px 32px",
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
        {title}
      </p>
      <p
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 15,
          color: "var(--bw-slate)",
          lineHeight: 1.6,
          margin: "12px auto 0",
          maxWidth: 520,
        }}
      >
        {body}
      </p>
    </div>
  );
}

function PractitionerCard({ p }: { p: PublicPractitioner }) {
  const img = headshotUrl(p.headshot_path);
  const loc = locationOf(p);
  return (
    <Link
      to={`/find-a-practitioner/${p.slug}`}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        border: "1px solid var(--bw-cream-300)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: "26px 24px",
        textDecoration: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {img ? (
          <img
            src={img}
            alt={p.display_name}
            loading="lazy"
            style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--bw-cream)",
              border: "1px solid var(--bw-cream-300)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 22,
              color: "var(--bw-navy)",
              flexShrink: 0,
            }}
          >
            {initialsOf(p.display_name)}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h3
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 19,
              color: "var(--bw-navy)",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {p.display_name}
          </h3>
          {p.headline && (
            <p
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 13.5,
                color: "var(--bw-slate)",
                margin: "6px 0 0",
                lineHeight: 1.4,
              }}
            >
              {p.headline}
            </p>
          )}
          {loc && (
            <p
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 12.5,
                color: "var(--bw-slate)",
                opacity: 0.8,
                margin: "6px 0 0",
              }}
            >
              {loc}
            </p>
          )}
        </div>
      </div>

      {(p.certifications ?? []).length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
          {(p.certifications ?? []).map((c) => (
            <span key={c.certification_type} style={chipStyle}>
              {certLabel(c.certification_type)}
            </span>
          ))}
        </div>
      )}

      {p.bio && (
        <p
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 14,
            color: "var(--bw-slate)",
            lineHeight: 1.55,
            marginTop: 16,
            marginBottom: 0,
          }}
        >
          {truncateWords(p.bio, 160)}
        </p>
      )}

      <span
        style={{
          marginTop: 18,
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: 13,
          color: "var(--bw-orange)",
        }}
      >
        View profile →
      </span>
    </Link>
  );
}
