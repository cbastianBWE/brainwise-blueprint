import { CSSProperties, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/marketing-tokens.css";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import Eyebrow from "@/components/marketing/Eyebrow";
import SubscribeForm from "@/components/marketing/newsletter/SubscribeForm";
import NewsletterArticleCard, {
  type ArchiveItem,
} from "@/components/marketing/newsletter/NewsletterArticleCard";
import { setPageMeta } from "@/components/marketing/newsletter/setPageMeta";

const PAGE_SIZE = 12;
type GateFilter = "all" | "public" | "subscribers" | "plan_tier";

function useIsBelow(w: number) {
  const [v, setV] = useState(typeof window !== "undefined" ? window.innerWidth < w : false);
  useEffect(() => {
    const onR = () => setV(window.innerWidth < w);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [w]);
  return v;
}

const chipStyle = (active: boolean): CSSProperties => ({
  padding: "9px 16px",
  borderRadius: 999,
  border: active ? "1px solid var(--bw-navy)" : "1px solid rgba(0,0,0,0.12)",
  background: active ? "var(--bw-navy)" : "transparent",
  color: active ? "#fff" : "var(--bw-navy)",
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: "0.04em",
  cursor: "pointer",
  transition: "all 140ms",
});

export default function Newsletter() {
  const isMobile = useIsBelow(768);
  const isTablet = useIsBelow(1024);
  const padX = isMobile ? 20 : 48;
  const [gate, setGate] = useState<GateFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    return setPageMeta({
      title: "Newsletter — BrainWise Enterprises",
      description:
        "Field notes on behavior change, leadership, and applied neuroscience from BrainWise Enterprises.",
      canonical: "https://brainwiseenterprises.com/newsletter",
      ogTitle: "BrainWise Newsletter",
      ogDescription:
        "Field notes on behavior change, leadership, and applied neuroscience.",
      ogType: "website",
      ogUrl: "https://brainwiseenterprises.com/newsletter",
      twitterCard: "summary_large_image",
      jsonLd: {
        id: "newsletter-archive-jsonld",
        data: {
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "BrainWise Newsletter",
          description:
            "Field notes on behavior change, leadership, and applied neuroscience.",
          url: "https://brainwiseenterprises.com/newsletter",
          publisher: {
            "@type": "Organization",
            name: "BrainWise Enterprises",
          },
        },
      },
    });
  }, []);

  const archiveQuery = useQuery({
    queryKey: ["newsletter-archive", gate, page],
    queryFn: async () => {
      const offset = (page - 1) * PAGE_SIZE;
      const { data, error } = await supabase.rpc("list_articles_for_archive", {
        p_gate_filter: gate === "all" ? null : gate,
        p_limit: PAGE_SIZE,
        p_offset: offset,
      });
      if (error) throw error;
      return data as unknown as {
        items: ArchiveItem[];
        total: number;
        limit: number;
        offset: number;
      };
    },
  });

  const items = archiveQuery.data?.items ?? [];
  const total = archiveQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const featured = page === 1 && items.length > 0 ? items[0] : null;
  const rest = page === 1 && items.length > 0 ? items.slice(1) : items;
  const gridCols = isMobile ? "1fr" : isTablet ? "1fr 1fr" : "1fr 1fr 1fr";

  return (
    <div style={{ background: "var(--bg-1, #fff)", minHeight: "100vh" }}>
      <MarketingNav />

      {/* HERO */}
      <section
        style={{
          background: "var(--bw-navy)",
          color: "#fff",
          padding: `${isMobile ? 64 : 96}px ${padX}px ${isMobile ? 48 : 72}px`,
        }}
      >
        <div style={{ maxWidth: 920, margin: "0 auto", textAlign: "center" }}>
          <Eyebrow>Field notes</Eyebrow>
          <h1
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: isMobile ? 38 : 60,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: "16px 0 18px",
              color: "#fff",
            }}
          >
            The BrainWise Newsletter
          </h1>
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: isMobile ? 16 : 18,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.78)",
              margin: "0 auto 32px",
              maxWidth: 640,
            }}
          >
            Essays, research notes, and case studies on behavior change, leadership,
            and applied neuroscience. Delivered when there's something worth saying.
          </p>
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <SubscribeForm source="archive_hero" variant="inline" />
          </div>
        </div>
      </section>

      {/* FILTERS + GRID */}
      <section style={{ padding: `${isMobile ? 40 : 64}px ${padX}px` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 32,
            }}
          >
            {(["all", "public", "subscribers", "plan_tier"] as GateFilter[]).map(
              (g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setGate(g);
                    setPage(1);
                  }}
                  style={chipStyle(gate === g)}
                >
                  {g === "all"
                    ? "All articles"
                    : g === "plan_tier"
                      ? "Plan tier"
                      : g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ),
            )}
          </div>

          {archiveQuery.isLoading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                gap: 24,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(0,0,0,0.04)",
                    borderRadius: 14,
                    height: 320,
                    animation: "pulse 1.6s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          ) : archiveQuery.isError ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                background: "var(--bw-cream, #FBF7F1)",
                borderRadius: 12,
              }}
            >
              <p
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  color: "var(--bw-navy)",
                  marginBottom: 12,
                }}
              >
                We couldn't load the archive right now.
              </p>
              <button
                type="button"
                onClick={() => archiveQuery.refetch()}
                style={{
                  background: "var(--bw-orange)",
                  color: "#fff",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
            </div>
          ) : items.length === 0 ? (
            <div
              style={{
                background: "var(--bw-cream, #FBF7F1)",
                borderRadius: 16,
                padding: "48px 32px",
                textAlign: "center",
              }}
            >
              <h2
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 24,
                  color: "var(--bw-navy)",
                  margin: "0 0 8px",
                }}
              >
                The first issue is coming soon.
              </h2>
              <p
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  color: "rgba(0,0,0,0.65)",
                  margin: "0 auto 24px",
                  maxWidth: 480,
                }}
              >
                Subscribe to be notified when the first edition lands in your inbox.
              </p>
              <div style={{ maxWidth: 460, margin: "0 auto" }}>
                <SubscribeForm source="archive_empty" variant="inline" />
              </div>
            </div>
          ) : (
            <>
              {featured && (
                <div style={{ marginBottom: 32 }}>
                  <NewsletterArticleCard item={featured} featured />
                </div>
              )}
              {rest.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: gridCols,
                    gap: 24,
                  }}
                >
                  {rest.map((it) => (
                    <NewsletterArticleCard key={it.id} item={it} />
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div
                  style={{
                    marginTop: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 16,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.15)",
                      background: "transparent",
                      color: "var(--bw-navy)",
                      cursor: page === 1 ? "default" : "pointer",
                      opacity: page === 1 ? 0.4 : 1,
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    Previous
                  </button>
                  <span
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: 13,
                      color: "rgba(0,0,0,0.6)",
                    }}
                  >
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.15)",
                      background: "transparent",
                      color: "var(--bw-navy)",
                      cursor: page >= totalPages ? "default" : "pointer",
                      opacity: page >= totalPages ? 0.4 : 1,
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
