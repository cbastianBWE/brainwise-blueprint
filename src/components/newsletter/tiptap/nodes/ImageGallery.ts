import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterImageGallery — grid of existing newsletterImage atoms.
 *
 * Children are the existing `newsletterImage` block atom — no new child
 * node type. Each child renders its own ImageNodeView upload dropzone.
 *
 * Root tag is `section[data-newsletter-image-gallery]` (per §144 the
 * `figure[data-newsletter-image]` tag is claimed by NewsletterImage, so
 * the gallery wrapper must use a different element).
 */
export const NewsletterImageGallery = Node.create({
  name: "newsletterImageGallery",
  group: "block",
  content: "newsletterImage+",
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
      gap: {
        default: "normal" as "tight" | "normal" | "wide",
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-gap") || "normal",
        renderHTML: (attrs: { gap: string }) => ({
          "data-gap": attrs.gap,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "section[data-newsletter-image-gallery]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-image-gallery": "true",
        class: "newsletter-image-gallery",
      }),
      0,
    ] as any;
  },
});
