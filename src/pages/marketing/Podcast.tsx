import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import "@/styles/marketing-tokens.css";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import Eyebrow from "@/components/marketing/Eyebrow";
import DotArc from "@/components/marketing/DotArc";
import PodcastListenBadges from "@/components/marketing/PodcastListenBadges";
import { fetchPodcastFeed, formatEpisodeDate, type PodcastEpisode } from "@/lib/podcastFeed";
import { podcastMeta } from "@/content/marketing/podcastContent";

function useIsBelow(width: number) {
  const [v, setV] = useState(typeof window !== "undefined" ? window.innerWidth < width : false);
  useEffect(() => {
    const onR = () => setV(window.innerWidth < width);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [width]);
  return v;
}

export default function Podcast() {
  const isMobile = useIsBelow(768);
  const isTablet = useIsBelow(1024);
  const padX = isMobile ? 20 : 48;
  const [page, setPage] = useState(1);

  const feedQuery = useQuery({
    queryKey: ["podcast-feed"],
    queryFn: fetchPodcastFeed,
    staleTime: 1000 * 60 * 30, // 30 min — cache refreshes server-side every 4h
  });

  const feed = feedQuery.data;
  const showTitle = feed?.show.title ?? "My BrainWise Coach";
  const showDescription = feed?.show.description_text ?? "";
  const showImage = feed?.show.image ?? null;
  const heroEpisode: PodcastEpisode | undefined = feed?.episodes[0];
  const archiveEpisodes: PodcastEpisode[] = feed?.episodes.slice(1) ?? [];
  const totalArchivePages = Math.max(1, Math.ceil(archiveEpisodes.length / podcastMeta.episodesPerPage));
  const safePage = Math.min(Math.max(1, page), totalArchivePages);
  const pageStart = (safePage - 1) * podcastMeta.episodesPerPage;
  const pageEnd = pageStart + podcastMeta.episodesPerPage;
  const pageEpisodes = archiveEpisodes.slice(pageStart, pageEnd);

  // Per-page meta tags (mirrors Home.tsx setMeta pattern)
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${showTitle} — BrainWise Podcast`;
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
    const desc = showDescription
      ? showDescription.slice(0, 160)
      : "My BrainWise Coach — neuroscience, behavioral science, and psychology with Cole Bastian and Phil Dixon.";
    setMeta("description", desc);
    setMeta("og:title", `${showTitle} | BrainWise Enterprises`, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", "https://brainwiseenterprises.com/podcast", "property");
    if (showImage) setMeta("og:image", showImage, "property");
    return () => {
      document.title = prevTitle;
    };
  }, [showTitle, showDescription, showImage]);

  // JSON-LD PodcastSeries structured data
  const jsonLd = useMemo(() => {
    if (!feed) return null;
    return {
      "@context": "https://schema.org",
      "@type": "PodcastSeries",
      name: feed.show.title,
      description: feed.show.description_text,
      url: "https://brainwiseenterprises.com/podcast",
      webFeed: "https://anchor.fm/s/106acb1cc/podcast/rss",
      image: feed.show.image,
      inLanguage: feed.show.language || "en-us",
      author: { "@type": "Person", name: podcastMeta.hosts },
      publisher: { "@type": "Organization", name: "BrainWise Enterprises" },
    };
  }, [feed]);

  useEffect(() => {
    if (!jsonLd) return;
    const scriptId = "podcast-jsonld";
    let el = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = scriptId;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(jsonLd);
    return () => {
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, [jsonLd]);

  const archiveGridCols = isMobile ? "1fr" : isTablet ? "1fr 1fr" : "1fr 1fr 1fr";

  return (
    <div style={{ background: "var(--bg-1)", minHeight: "100vh" }}>
      <MarketingNav />

      {/* HERO */}
      <section
        style={{
          position: "relative",
          background: "var(--bw-navy)",
          color: "#fff",
          padding: `${isMobile ? 64 : 96}px ${padX}px ${isMobile ? 56 : 88}px`,
          overflow: "hidden",
        }}
      >
        <DotArc />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <Eyebrow color="var(--bw-orange)">The Podcast</Eyebrow>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) auto",
              gap: isMobile ? 32 : 56,
              alignItems: "center",
              marginTop: 20,
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 800,
                  fontSize: isMobile ? 36 : 56,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  color: "#fff",
                }}
              >
                {showTitle}
              </h1>
              <p
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: isMobile ? 16 : 18,
                  lineHeight: 1.55,
                  color: "rgba(255,255,255,0.82)",
                  marginTop: 20,
                  maxWidth: 620,
                }}
              >
                {showDescription ||
                  "Neuroscience, behavioral science, and psychology to help you live and lead better lives."}
              </p>
              <p
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--bw-orange)",
                  marginTop: 24,
                }}
              >
                {podcastMeta.tagline}
              </p>
              <div style={{ marginTop: 28 }}>
                <PodcastListenBadges variant="onDark" />
              </div>
            </div>
            {showImage && !isMobile && (
              <div
                style={{
                  width: isTablet ? 220 : 280,
                  height: isTablet ? 220 : 280,
                  borderRadius: "var(--r-lg)",
                  overflow: "hidden",
                  boxShadow: "var(--shadow-lg)",
                  flexShrink: 0,
                }}
              >
                <img
                  src={showImage}
                  alt={`${showTitle} cover art`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FEATURED LATEST EPISODE */}
      {heroEpisode && (
        <section style={{ background: "var(--bg-1)", padding: `${isMobile ? 56 : 80}px ${padX}px 0` }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Eyebrow color="var(--bw-teal)">Latest Episode</Eyebrow>
            <FeaturedEpisode episode={heroEpisode} isMobile={isMobile} />
          </div>
        </section>
      )}

      {/* ARCHIVE GRID */}
      <section
        style={{
          background: "var(--bg-1)",
          padding: `${isMobile ? 56 : 80}px ${padX}px ${isMobile ? 64 : 96}px`,
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 32,
            }}
          >
            <div>
              <Eyebrow color="var(--bw-orange)">The Archive</Eyebrow>
              <h2
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 800,
                  fontSize: isMobile ? 28 : 40,
                  letterSpacing: "-0.02em",
                  margin: "12px 0 0",
                  color: "var(--bw-navy)",
                }}
              >
                Every episode.
              </h2>
            </div>
            {feed && (
              <div
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 14,
                  color: "var(--bw-slate)",
                }}
              >
                {archiveEpisodes.length} earlier episode{archiveEpisodes.length === 1 ? "" : "s"}
              </div>
            )}
          </div>

          <div>
            {feedQuery.isLoading && <FeedLoadingSkeleton isMobile={isMobile} />}
            {feedQuery.isError && <FeedErrorState />}
            {feed && pageEpisodes.length === 0 && safePage === 1 && (
              <div
                style={{
                  padding: 24,
                  background: "#fff",
                  border: "1px solid var(--border-1)",
                  borderRadius: "var(--r-lg)",
                  color: "var(--bw-slate-700)",
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 14,
                }}
              >
                No earlier episodes yet — the featured episode above is the only one published so far.
              </div>
            )}
            {feed && pageEpisodes.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: archiveGridCols, gap: 24 }}>
                {pageEpisodes.map((ep) => (
                  <EpisodeCard key={ep.guid} episode={ep} />
                ))}
              </div>
            )}
          </div>

          {feed && totalArchivePages > 1 && (
            <Pagination
              currentPage={safePage}
              totalPages={totalArchivePages}
              onChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

// ----- Subcomponents -----

function FeaturedEpisode({ episode, isMobile }: { episode: PodcastEpisode; isMobile: boolean }) {
  const date = formatEpisodeDate(episode.pub_date);
  const cover = episode.episode_image;

  return (
    <div
      style={{
        marginTop: 20,
        background: "#fff",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--r-lg)",
        padding: isMobile ? 20 : 32,
        display: "grid",
        gridTemplateColumns: cover && !isMobile ? "200px 1fr" : "1fr",
        gap: isMobile ? 20 : 32,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {cover && (
        <img
          src={cover}
          alt={`${episode.title} cover`}
          style={{
            width: isMobile ? "100%" : 200,
            height: isMobile ? "auto" : 200,
            maxWidth: isMobile ? 200 : undefined,
            borderRadius: "var(--r-md)",
            objectFit: "cover",
            display: "block",
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div>
        <EpisodeMetaRow episode={episode} date={date} />
        <h3
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: isMobile ? 22 : 28,
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
            margin: "10px 0 14px",
            color: "var(--bw-navy)",
          }}
        >
          {episode.title}
        </h3>
        <p
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 15,
            lineHeight: 1.6,
            color: "var(--bw-slate-700)",
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {episode.description_text}
        </p>
        <div style={{ marginTop: 20 }}>
          <a
            href={episode.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: "var(--bw-navy)",
              color: "#fff",
              borderRadius: 999,
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Listen on Spotify
          </a>
        </div>
      </div>
    </div>
  );
}

function EpisodeCard({ episode }: { episode: PodcastEpisode }) {
  const date = formatEpisodeDate(episode.pub_date);
  return (
    <a
      href={episode.link}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        background: "#fff",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--r-lg)",
        padding: 20,
        textDecoration: "none",
        boxShadow: "var(--shadow-sm)",
        transition: "transform 160ms, box-shadow 160ms",
        color: "inherit",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "var(--shadow-sm)";
      }}
    >
      <EpisodeMetaRow episode={episode} date={date} compact />
      <h4
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: 17,
          lineHeight: 1.3,
          letterSpacing: "-0.01em",
          margin: "10px 0 10px",
          color: "var(--bw-navy)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {episode.title}
      </h4>
      <p
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 13,
          lineHeight: 1.55,
          color: "var(--bw-slate-700)",
          margin: 0,
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {episode.description_text}
      </p>
    </a>
  );
}

function EpisodeMetaRow({
  episode,
  date,
  compact = false,
}: {
  episode: PodcastEpisode;
  date: string;
  compact?: boolean;
}) {
  const seasonEp =
    episode.season !== null && episode.episode_number !== null
      ? `S${episode.season} · E${episode.episode_number}`
      : null;
  const items: { label: string; color?: string }[] = [];
  if (seasonEp) items.push({ label: seasonEp });
  if (episode.episode_type === "bonus") items.push({ label: "Bonus", color: "var(--bw-orange)" });
  else if (episode.episode_type === "trailer") items.push({ label: "Trailer", color: "var(--bw-teal)" });
  if (date) items.push({ label: date });
  if (episode.duration_display) items.push({ label: episode.duration_display });

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
        fontFamily: "'Montserrat', sans-serif",
        fontSize: compact ? 11 : 12,
        fontWeight: 600,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "var(--bw-slate)",
      }}
    >
      {items.map((it, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span style={{ color: "var(--bw-slate-300)" }}>·</span>}
          <span style={it.color ? { color: it.color } : undefined}>{it.label}</span>
        </span>
      ))}
    </div>
  );
}

function FeedLoadingSkeleton({ isMobile }: { isMobile: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
        gap: 24,
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: "#fff",
            border: "1px solid var(--border-1)",
            borderRadius: "var(--r-lg)",
            padding: 20,
            height: 180,
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
}

function FeedErrorState() {
  return (
    <div
      style={{
        padding: 24,
        background: "#fff",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--r-lg)",
        color: "var(--bw-slate-700)",
        fontFamily: "'Montserrat', sans-serif",
        fontSize: 14,
        lineHeight: 1.6,
      }}
    >
      The episode list isn't loading right now. You can listen on{" "}
      <a
        href="https://open.spotify.com/show/3l9vMGcHuZ7nzInXY3dWev"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--bw-navy)", fontWeight: 600 }}
      >
        Spotify
      </a>{" "}
      or{" "}
      <a
        href="https://podcasts.apple.com/us/podcast/my-brainwise-coach/id1823765544"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--bw-navy)", fontWeight: 600 }}
      >
        Apple Podcasts
      </a>{" "}
      while we sort it out.
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  // Show up to 7 page links: first, last, current ± 1, ellipses as needed.
  const pages: (number | "ellipsis")[] = [];
  const add = (v: number | "ellipsis") => pages.push(v);
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) add(i);
  } else {
    add(1);
    if (currentPage > 3) add("ellipsis");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) add(i);
    if (currentPage < totalPages - 2) add("ellipsis");
    add(totalPages);
  }

  const baseBtn: CSSProperties = {
    minWidth: 40,
    height: 40,
    padding: "0 12px",
    border: "1px solid var(--border-1)",
    borderRadius: 8,
    background: "#fff",
    cursor: "pointer",
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 600,
    fontSize: 14,
    color: "var(--bw-slate-700)",
  };
  const activeBtn: CSSProperties = {
    ...baseBtn,
    background: "var(--bw-navy)",
    color: "#fff",
    borderColor: "var(--bw-navy)",
    cursor: "default",
  };
  const disabledBtn: CSSProperties = { ...baseBtn, opacity: 0.45, cursor: "not-allowed" };

  return (
    <nav
      aria-label="Episode archive pagination"
      style={{
        marginTop: 40,
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <button
        type="button"
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={currentPage === 1 ? disabledBtn : baseBtn}
        aria-label="Previous page"
      >
        Prev
      </button>
      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`e-${i}`}
            aria-hidden="true"
            style={{
              minWidth: 24,
              textAlign: "center",
              color: "var(--bw-slate)",
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 14,
            }}
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === currentPage ? "page" : undefined}
            aria-label={`Page ${p}`}
            style={p === currentPage ? activeBtn : baseBtn}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={currentPage === totalPages ? disabledBtn : baseBtn}
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
}
