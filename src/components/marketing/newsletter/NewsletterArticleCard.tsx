import { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useNewsletterImageUrl } from "@/components/newsletter/editor/useNewsletterImageUrl";

export interface ArchiveItem {
  access_state: "granted" | "paywall";
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_asset_id: string | null;
  published_at: string;
  gate: "public" | "subscribers" | "plan_tier";
  allowed_plan_tiers?: string[] | null;
  authors?: Array<{ user_id?: string; display_name: string | null } | string> | null;
  read_time_minutes?: number | null;
  paywall_reason?: "subscriber_required" | "plan_tier_required" | null;
}

function authorName(a: ArchiveItem["authors"] extends (infer U)[] | null | undefined ? U : never): string {
  if (typeof a === "string") return a;
  if (a && typeof a === "object" && "display_name" in a) return a.display_name ?? "BrainWise";
  return "BrainWise";
}

export default function NewsletterArticleCard({
  item,
  featured = false,
}: {
  item: ArchiveItem;
  featured?: boolean;
}) {
  const { url: coverUrl } = useNewsletterImageUrl(item.cover_asset_id);
  const firstAuthor = item.authors?.[0] ? authorName(item.authors[0]) : "BrainWise";
  const isPaywall = item.access_state === "paywall";

  const cardStyle: CSSProperties = {
    background: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    textDecoration: "none",
    color: "inherit",
    transition: "transform 180ms ease, box-shadow 180ms ease",
    height: "100%",
  };

  const coverStyle: CSSProperties = {
    width: "100%",
    aspectRatio: featured ? "16 / 9" : "16 / 10",
    background: coverUrl
      ? `center/cover no-repeat url("${coverUrl}")`
      : "linear-gradient(135deg, var(--bw-navy) 0%, var(--bw-plum, #3C096C) 100%)",
    position: "relative",
  };

  const titleStyle: CSSProperties = {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: featured ? 28 : 19,
    lineHeight: 1.25,
    color: "var(--bw-navy)",
    letterSpacing: "-0.01em",
    margin: 0,
  };

  const excerptStyle: CSSProperties = {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: featured ? 15 : 13.5,
    lineHeight: 1.6,
    color: "rgba(0,0,0,0.65)",
    margin: 0,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  };

  const eyebrowStyle: CSSProperties = {
    fontFamily: "'Poppins', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "var(--bw-orange)",
  };

  return (
    <Link
      to={`/newsletter/${item.slug}`}
      style={cardStyle}
      className="bw-newsletter-card"
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 12px 32px -12px rgba(0,0,0,0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      <div style={coverStyle}>
        {isPaywall && (
          <span
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background: "rgba(255,255,255,0.95)",
              color: "var(--bw-navy)",
              fontFamily: "'Poppins', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "5px 9px",
              borderRadius: 999,
            }}
          >
            {item.paywall_reason === "plan_tier_required" ? "Plan tier" : "Subscribers"}
          </span>
        )}
      </div>
      <div
        style={{
          padding: featured ? "24px 26px 26px" : "18px 20px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flex: 1,
        }}
      >
        <div style={eyebrowStyle}>
          {firstAuthor} · {formatDistanceToNow(new Date(item.published_at), { addSuffix: true })}
          {item.read_time_minutes ? ` · ${item.read_time_minutes} min read` : ""}
        </div>
        <h3 style={titleStyle}>{item.title}</h3>
        {item.excerpt && <p style={excerptStyle}>{item.excerpt}</p>}
      </div>
    </Link>
  );
}
