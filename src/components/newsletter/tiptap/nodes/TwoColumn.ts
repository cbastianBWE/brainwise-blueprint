import { Node, mergeAttributes } from "@tiptap/core";

const GAP_VALUES = ["tight", "normal", "wide"] as const;
type GapValue = (typeof GAP_VALUES)[number];

function clampGap(v: string | null): GapValue {
  return (GAP_VALUES as readonly string[]).includes(v ?? "")
    ? (v as GapValue)
    : "normal";
}

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

  addAttributes() {
    return {
      gap: {
        default: "normal" as GapValue,
        parseHTML: (el) => clampGap(el.getAttribute("data-gap")),
        renderHTML: (attrs) => ({ "data-gap": attrs.gap }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-newsletter-two-column]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return { gap: clampGap(el.getAttribute("data-gap")) };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-two-column": "true",
        "data-gap": node.attrs.gap,
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
