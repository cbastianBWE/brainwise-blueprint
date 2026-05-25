import { useMemo } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useQuery } from "@tanstack/react-query";
import {
  resolveRelatedArticles,
} from "@/components/newsletter/editor/relatedArticles";
import {
  RelatedArticleCardView,
  RelatedArticleCardSkeleton,
  relatedGridClass,
} from "@/components/newsletter/editor/RelatedArticleCardView";
import type {
  NewsletterRelatedArticlesAttrs,
} from "@/components/newsletter/tiptap/types";

/**
 * Reader-path NodeView for newsletterRelatedArticles. Resolves config to
 * actual article cards via the appropriate get_related_articles_by_* RPC.
 *
 * The source article id is read from `node.attrs.__sourceArticleId` (set by
 * the reader render switch via an extension that injects it). If absent
 * (e.g. preview render before article is fully loaded), the component
 * silently renders nothing.
 *
 * Per H2-MIG-10b: all 3 RPCs filter to published + public + non-archived
 * at SQL level, so any drafts the author manually selected are skipped
 * here without additional client logic.
 */
export default function RelatedArticlesReaderNodeView({
  node,
  extension,
}: NodeViewProps) {
  const attrs = node.attrs as NewsletterRelatedArticlesAttrs;
  // The parent switch passes sourceArticleId via extension storage.
  const sourceArticleId =
    (extension.options as { sourceArticleId?: string } | undefined)
      ?.sourceArticleId ?? "";

  const manualIds = useMemo(
    () => attrs.manual_article_ids ?? [],
    [attrs.manual_article_ids],
  );

  const query = useQuery({
    queryKey: [
      "newsletter-related-reader",
      sourceArticleId,
      attrs.mode,
      attrs.max_count,
      attrs.tag_match_mode,
      manualIds.join(","),
    ],
    enabled: !!sourceArticleId,
    queryFn: () =>
      resolveRelatedArticles({
        mode: attrs.mode,
        sourceArticleId,
        maxCount: attrs.max_count ?? 3,
        tagMatchMode: attrs.tag_match_mode,
        manualArticleIds: manualIds,
      }),
  });

  const cards = query.data ?? [];
  const heading = attrs.title?.trim() ? attrs.title : "Related articles";
  const max_count = attrs.max_count ?? 3;

  // If the resolved list is empty and no source id, render nothing
  // (cards section shouldn't appear at all to readers).
  if (!sourceArticleId) return null;
  if (!query.isLoading && cards.length === 0 && !query.isError) {
    return null;
  }

  return (
    <NodeViewWrapper
      as="section"
      data-newsletter-related-articles="true"
      className="newsletter-related-articles my-10"
    >
      <h3
        data-newsletter-related-articles-title
        className="m-0 mb-4 text-lg font-bold text-[var(--bw-navy,#0f1b3d)]"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        {heading}
      </h3>
      {query.isLoading ? (
        <div className={relatedGridClass(max_count)}>
          {Array.from({ length: Math.min(3, max_count) }).map((_, i) => (
            <RelatedArticleCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className={relatedGridClass(max_count)}>
          {cards.map((card) => (
            <RelatedArticleCardView key={card.id} card={card} />
          ))}
        </div>
      )}
    </NodeViewWrapper>
  );
}
