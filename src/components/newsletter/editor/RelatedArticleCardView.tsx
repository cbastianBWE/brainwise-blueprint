import { Link } from "react-router-dom";
import { useNewsletterImageUrl } from "@/components/newsletter/editor/useNewsletterImageUrl";
import type { RelatedArticleCard as CardData } from "@/components/newsletter/editor/relatedArticles";

/**
 * Single related-article card. Shared between the editor live-preview and
 * the reader-path NodeView so visual parity is guaranteed.
 */
export function RelatedArticleCardView({ card }: { card: CardData }) {
  const { url: coverUrl } = useNewsletterImageUrl(card.cover_asset_id);
  return (
    <Link
      to={`/newsletter/${card.slug}`}
      data-newsletter-related-card="true"
      className="group/nl-rel-card flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white no-underline transition-shadow hover:shadow-md"
    >
      <div
        className="aspect-[16/10] w-full bg-slate-100"
        style={
          coverUrl
            ? {
                background: `center/cover no-repeat url("${coverUrl}")`,
              }
            : undefined
        }
      />
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h4
          data-newsletter-related-card-title
          className="m-0 text-sm font-semibold leading-tight text-[var(--bw-navy,#0f1b3d)] group-hover/nl-rel-card:underline"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          {card.title}
        </h4>
        {card.excerpt && (
          <p
            data-newsletter-related-card-excerpt
            className="m-0 text-xs leading-snug text-slate-600"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {card.excerpt}
          </p>
        )}
        <div
          data-newsletter-related-card-meta
          className="mt-auto pt-1 text-[11px] uppercase tracking-wider text-slate-400"
        >
          {card.read_time_minutes
            ? `${card.read_time_minutes} min read`
            : ""}
          {card.read_time_minutes && card.category_display_name ? " · " : ""}
          {card.category_display_name ?? ""}
        </div>
      </div>
    </Link>
  );
}

export function RelatedArticleCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="aspect-[16/10] w-full animate-pulse bg-slate-100" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export function relatedGridClass(maxCount: number): string {
  return maxCount > 3
    ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
    : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
}
