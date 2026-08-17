import { CSSProperties, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { initialsOf } from "@/lib/publicDirectory";

export interface MarketingTestimonial {
  id: string;
  quote: string;
  attribution_name: string;
  attribution_title: string | null;
  attribution_org: string | null;
  headshot_bucket: string;
  headshot_path: string | null;
  is_featured: boolean;
  sort_order: number;
}

export type TestimonialSectionProps = {
  /** Passed straight to the RPC. Omit for every published testimonial. */
  placement?: string;
  featuredOnly?: boolean;
  /** Omit to render no heading. */
  heading?: string;
  background?: "white" | "cream" | "navy";
  columns?: 1 | 2 | 3;
};

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

function attributionMeta(t: MarketingTestimonial): string {
  return [t.attribution_title, t.attribution_org].filter(Boolean).join(", ");
}

export default function TestimonialSection({
  placement,
  featuredOnly,
  heading,
  background = "white",
  columns = 3,
}: TestimonialSectionProps) {
  const isMobile = useIsBelow(768);
  const isTablet = useIsBelow(1024);
  const padX = isMobile ? 20 : 48;

  const query = useQuery({
    queryKey: ["testimonials", placement ?? null, featuredOnly ?? false],
    queryFn: async () => {
      const args: Record<string, unknown> = {};
      if (placement) args.p_placement = placement;
      if (featuredOnly) args.p_featured_only = true;
      const { data, error } = await (supabase.rpc as any)("mk_testimonials", args);
      if (error) throw error;
      return (data ?? []) as MarketingTestimonial[];
    },
  });

  // Decorative band: never show a skeleton, spinner or error where a quote goes.
  if (query.isLoading || query.isError) return null;
  const rows = query.data ?? [];
  if (rows.length === 0) return null;

  const onDark = background === "navy";
  const bg =
    background === "navy" ? "var(--bw-navy)" : background === "cream" ? "var(--bw-cream)" : "#fff";

  const cardStyle: CSSProperties = {
    background: onDark ? "rgba(255,255,255,0.06)" : "#fff",
    border: onDark ? "1px solid rgba(255,255,255,0.16)" : "1px solid var(--bw-cream-300)",
    borderRadius: "var(--r-lg)",
    boxShadow: onDark ? "none" : "var(--shadow-sm)",
    padding: "30px 28px",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  };

  const gridCols = isMobile
    ? "1fr"
    : isTablet
    ? "repeat(2, 1fr)"
    : `repeat(${columns}, 1fr)`;

  return (
    <section style={{ background: bg, padding: `${isMobile ? 80 : 112}px ${padX}px` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {heading && (
          <h2
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 3.5vw, 44px)",
              color: onDark ? "#fff" : "var(--bw-navy)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: "0 0 40px",
            }}
          >
            {heading}
          </h2>
        )}

        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 24 }}>
          {rows.map((t) => {
            const img = publicUrl(t.headshot_bucket, t.headshot_path);
            const sub = attributionMeta(t);
            return (
              <figure key={t.id} style={{ ...cardStyle, margin: 0 }}>
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 20,
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 800,
                    fontSize: 56,
                    lineHeight: 1,
                    color: "var(--bw-orange)",
                    opacity: onDark ? 0.4 : 0.22,
                    pointerEvents: "none",
                  }}
                >
                  &ldquo;
                </span>
                <blockquote
                  style={{
                    margin: 0,
                    position: "relative",
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: isMobile ? 16 : 17.5,
                    lineHeight: 1.6,
                    color: onDark ? "rgba(255,255,255,0.9)" : "var(--bw-navy)",
                    flex: 1,
                  }}
                >
                  {t.quote}
                </blockquote>
                <figcaption
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 22,
                  }}
                >
                  {img ? (
                    <img
                      src={img}
                      alt={t.attribution_name}
                      width={44}
                      height={44}
                      loading="lazy"
                      style={{
                        width: 44,
                        height: 44,
                        minWidth: 44,
                        borderRadius: "50%",
                        objectFit: "cover",
                        objectPosition: "center top",
                        display: "block",
                      }}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      style={{
                        width: 44,
                        height: 44,
                        minWidth: 44,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: onDark ? "rgba(255,255,255,0.1)" : "var(--bw-cream)",
                        border: onDark
                          ? "1px solid rgba(255,255,255,0.2)"
                          : "1px solid var(--bw-cream-300)",
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 700,
                        fontSize: 14,
                        color: onDark ? "#fff" : "var(--bw-navy)",
                      }}
                    >
                      {initialsOf(t.attribution_name)}
                    </span>
                  )}
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 700,
                        fontSize: 14,
                        color: onDark ? "#fff" : "var(--bw-navy)",
                      }}
                    >
                      {t.attribution_name}
                    </span>
                    {sub && (
                      <span
                        style={{
                          display: "block",
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: 13,
                          color: onDark ? "rgba(255,255,255,0.7)" : "var(--bw-slate)",
                          marginTop: 2,
                        }}
                      >
                        {sub}
                      </span>
                    )}
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
