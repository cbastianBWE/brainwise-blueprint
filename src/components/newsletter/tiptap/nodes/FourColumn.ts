import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterFourColumn — four side-by-side panes.
 *
 * Mirrors the TwoColumn/ThreeColumn pattern. Panes are intentionally NOT
 * in the 'block' group, so they can only exist inside this parent.
 * Responsive collapse (4 → 2x2 → 1) lives in newsletter-prose.css.
 */
export const NewsletterFourColumn = Node.create({
  name: "newsletterFourColumn",
  group: "block",
  content:
    "newsletterFourColumnPane newsletterFourColumnPane newsletterFourColumnPane newsletterFourColumnPane",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: "div[data-newsletter-four-column]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-four-column": "true",
        class: "newsletter-four-column",
      }),
      ["div", { class: "newsletter-four-column__panes" }, 0],
    ] as any;
  },
});

export const NewsletterFourColumnPane = Node.create({
  name: "newsletterFourColumnPane",
  content: "block+",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: "div[data-newsletter-four-column-pane]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-four-column-pane": "true",
        class: "newsletter-four-column__pane",
      }),
      0,
    ] as any;
  },
});
