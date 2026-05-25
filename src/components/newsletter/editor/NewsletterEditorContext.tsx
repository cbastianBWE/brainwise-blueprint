import { createContext, useContext } from "react";

/**
 * Editor-side context surfacing article-level metadata to NodeViews.
 *
 * `articleId` (P6b) — required, used by upload helpers and reader RPCs.
 * `tags`, `categoryId` (P7b) — optional/nullable, used by RelatedArticlesNodeView
 *   to render no-tags / no-category warnings. Older consumers (AuthorBioNodeView)
 *   only destructure `articleId` and are unaffected by the additive fields.
 */
export interface NewsletterEditorContextValue {
  articleId: string;
  tags?: string[] | null;
  categoryId?: string | null;
}

export const NewsletterEditorContext =
  createContext<NewsletterEditorContextValue | null>(null);

export function useNewsletterEditorContext(): NewsletterEditorContextValue {
  const ctx = useContext(NewsletterEditorContext);
  if (!ctx) {
    throw new Error(
      "useNewsletterEditorContext must be used inside <NewsletterEditor>",
    );
  }
  return ctx;
}
