import { Node, mergeAttributes } from "@tiptap/core";
import type { CalloutVariant } from "../types";

const VARIANTS: CalloutVariant[] = [
  "info",
  "warning",
  "quote",
  "tldr",
  "key_takeaway",
];

/**
 * newsletterCallout — variant-styled emphasis block.
 *
 * Contains nested block content (paragraphs, lists, etc.). Variants:
 *   info         → teal accent (--info)
 *   warning      → amber accent (--warning)
 *   quote        → navy accent, serif italic body
 *   tldr         → navy text on cream, no border
 *   key_takeaway → plum accent (--premium). Orange is reserved for UI/CTA
 *                  per brand discipline; key_takeaway uses plum specifically
 *                  to communicate "high signal" without violating that rule.
 */
export const NewsletterCallout = Node.create({
  name: "newsletterCallout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info" as CalloutVariant,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-variant");
          return VARIANTS.includes(v as CalloutVariant)
            ? (v as CalloutVariant)
            : "info";
        },
      },
      title: { default: null as string | null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "aside[data-newsletter-callout]",
        priority: 51,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            variant: el.getAttribute("data-variant") || "info",
            title:
              el.querySelector(".newsletter-callout__title")?.textContent ??
              null,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const variant = (node.attrs.variant as CalloutVariant) || "info";
    const title = node.attrs.title as string | null;

    const inner: any[] = [];
    if (title) {
      inner.push(["div", { class: "newsletter-callout__title" }, title]);
    }
    inner.push(["div", { class: "newsletter-callout__body" }, 0]);

    return [
      "aside",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-callout": "true",
        "data-variant": variant,
        class: `newsletter-callout newsletter-callout--${variant}`,
      }),
      ...inner,
    ] as any;
  },
});
