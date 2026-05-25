import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterRelatedArticles — atom block. Editor NodeView resolves + previews
 * via the appropriate get_related_articles_by_* RPC. Reader-path NodeView
 * does the same at render time. Serialized doc carries only configuration
 * (mode + max_count + tag_match_mode + manual_article_ids + title); the
 * resolved article cards never live in the doc.
 */
export const NewsletterRelatedArticles = Node.create({
  name: "newsletterRelatedArticles",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      mode: { default: "by_tags" as "by_tags" | "by_category" | "manual" },
      manual_article_ids: { default: null as string[] | null },
      max_count: { default: 3 as number },
      tag_match_mode: { default: "any" as "any" | "all" | null },
      title: { default: null as string | null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-newsletter-related-articles]",
        priority: 60,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const mode = (el.getAttribute("data-mode") || "by_tags") as
            | "by_tags"
            | "by_category"
            | "manual";
          const maxRaw = el.getAttribute("data-max-count");
          const max_count = maxRaw ? parseInt(maxRaw, 10) || 3 : 3;
          const tagModeRaw = el.getAttribute("data-tag-match-mode");
          const tag_match_mode =
            mode === "by_tags"
              ? ((tagModeRaw as "any" | "all") || "any")
              : null;
          const title = el.getAttribute("data-title");
          let manual_article_ids: string[] | null = null;
          if (mode === "manual") {
            const raw = el.getAttribute("data-manual-article-ids");
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                  manual_article_ids = parsed.filter(
                    (x) => typeof x === "string",
                  );
                }
              } catch {
                manual_article_ids = [];
              }
            } else {
              manual_article_ids = [];
            }
          }
          return {
            mode,
            max_count: Math.max(1, Math.min(12, max_count)),
            tag_match_mode,
            title: title && title.length > 0 ? title : null,
            manual_article_ids,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const mode = (node.attrs.mode as string) || "by_tags";
    const max_count = (node.attrs.max_count as number) ?? 3;
    const tag_match_mode = node.attrs.tag_match_mode as string | null;
    const title = node.attrs.title as string | null;
    const manual_ids = node.attrs.manual_article_ids as string[] | null;

    const attrs: Record<string, string> = {
      "data-newsletter-related-articles": "true",
      "data-mode": mode,
      "data-max-count": String(max_count),
    };
    if (mode === "by_tags" && tag_match_mode) {
      attrs["data-tag-match-mode"] = tag_match_mode;
    }
    if (title) attrs["data-title"] = title;
    if (mode === "manual") {
      attrs["data-manual-article-ids"] = JSON.stringify(manual_ids ?? []);
    }

    return ["div", mergeAttributes(HTMLAttributes, attrs)] as never;
  },
});
