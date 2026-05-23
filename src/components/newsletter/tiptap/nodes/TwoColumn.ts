import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterTwoColumn — side-by-side prose layout.
 *
 * Content schema enforces exactly two `newsletterTwoColumnPane` children.
 * Panes are intentionally NOT in the 'block' group, so they can only exist
 * inside this parent (the schema rejects loose panes elsewhere).
 *
 * Mobile collapse to single column is handled in newsletter-prose.css.
 */
export const NewsletterTwoColumn = Node.create({
  name: "newsletterTwoColumn",
  group: "block",
  content: "newsletterTwoColumnPane newsletterTwoColumnPane",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: "div[data-newsletter-two-column]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-two-column": "true",
        class: "newsletter-two-column",
      }),
      [
        "div",
        { class: "newsletter-two-column__panes" },
        0,
      ],
    ] as any;
  },
});

export const NewsletterTwoColumnPane = Node.create({
  name: "newsletterTwoColumnPane",
  // Intentionally NOT in 'block' group — schema enforces parent-only placement.
  content: "block+",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: "div[data-newsletter-two-column-pane]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-two-column-pane": "true",
        class: "newsletter-two-column__pane",
      }),
      0,
    ] as any;
  },
});
