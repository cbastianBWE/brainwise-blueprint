import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterStatGrid — grid of existing newsletterStatCallout atoms.
 *
 * Children are the existing `newsletterStatCallout` block atom — no new
 * child node type. Each child renders its own StatCalloutNodeView.
 *
 * Root tag is `section[data-newsletter-stat-grid]` to avoid colliding
 * with `figure[data-newsletter-stat-callout]` per §144.
 */
export const NewsletterStatGrid = Node.create({
  name: "newsletterStatGrid",
  group: "block",
  content: "newsletterStatCallout+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      columns: {
        default: 2 as 2 | 3 | 4,
        parseHTML: (el: HTMLElement) => {
          const v = parseInt(el.getAttribute("data-columns") || "2", 10);
          return [2, 3, 4].includes(v) ? v : 2;
        },
        renderHTML: (attrs: { columns: number }) => ({
          "data-columns": String(attrs.columns),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "section[data-newsletter-stat-grid]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-stat-grid": "true",
        class: "newsletter-stat-grid",
      }),
      0,
    ] as any;
  },
});
