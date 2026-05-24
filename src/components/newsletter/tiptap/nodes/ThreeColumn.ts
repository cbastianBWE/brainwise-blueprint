import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterThreeColumn — three side-by-side panes.
 *
 * Mirrors the TwoColumn pattern. Panes are intentionally NOT in the
 * 'block' group, so they can only exist inside this parent.
 * Mobile collapse is handled in newsletter-prose.css.
 */
export const NewsletterThreeColumn = Node.create({
  name: "newsletterThreeColumn",
  group: "block",
  content:
    "newsletterThreeColumnPane newsletterThreeColumnPane newsletterThreeColumnPane",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: "div[data-newsletter-three-column]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-three-column": "true",
        class: "newsletter-three-column",
      }),
      ["div", { class: "newsletter-three-column__panes" }, 0],
    ] as any;
  },
});

export const NewsletterThreeColumnPane = Node.create({
  name: "newsletterThreeColumnPane",
  // Intentionally NOT in 'block' group — parent-only placement.
  content: "block+",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: "div[data-newsletter-three-column-pane]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-three-column-pane": "true",
        class: "newsletter-three-column__pane",
      }),
      0,
    ] as any;
  },
});
