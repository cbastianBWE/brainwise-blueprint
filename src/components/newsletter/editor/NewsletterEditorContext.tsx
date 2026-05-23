import { createContext, useContext } from "react";

export interface NewsletterEditorContextValue {
  articleId: string;
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
