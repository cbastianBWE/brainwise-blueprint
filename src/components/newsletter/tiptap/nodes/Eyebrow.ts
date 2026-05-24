import { Node, mergeAttributes } from "@tiptap/core";

type EyebrowVariant = "default" | "accent" | "muted";
const VARIANTS: EyebrowVariant[] = ["default", "accent", "muted"];

/**
 * newsletterEyebrow — small-caps category tag rendered above a heading.
 *
 * Content is inline-editable directly in the DOM (no NodeView needed).
 * Variants control color; `with_rule` toggles the leading horizontal stripe
 * rendered via a CSS `::before` pseudo-element keyed off `data-with-rule`.
 */
export const NewsletterEyebrow = Node.create({
  name: "newsletterEyebrow",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "default" as EyebrowVariant,
        parseHTML: (el) => {
          const e = el as HTMLElement;
          const v = e.getAttribute("data-variant");
          if (VARIANTS.includes(v as EyebrowVariant)) return v as EyebrowVariant;
          if (e.classList.contains("newsletter-eyebrow--accent")) return "accent";
          if (e.classList.contains("newsletter-eyebrow--muted")) return "muted";
          return "default";
        },
      },
      with_rule: {
        default: true,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-with-rule");
          if (v === "false") return false;
          return true;
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: "div.eyebrow" },
      { tag: "p.eyebrow" },
      { tag: '[class~="eyebrow"]' },
      { tag: '[class~="kicker"]' },
      { tag: '[class~="category"]' },
      { tag: "[data-newsletter-eyebrow]" },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const variant = (node.attrs.variant as EyebrowVariant) || "default";
    const withRule = node.attrs.with_rule !== false;
    return [
      "p",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-eyebrow": "true",
        "data-variant": variant,
        "data-with-rule": withRule ? "true" : "false",
        class: `newsletter-eyebrow newsletter-eyebrow--${variant}`,
      }),
      0,
    ];
  },
});
