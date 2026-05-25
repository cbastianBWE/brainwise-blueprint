import { Node, mergeAttributes } from "@tiptap/core";
import type { CalloutVariant } from "../types";

const VARIANTS: CalloutVariant[] = [
  "info",
  "warning",
  "quote",
  "tldr",
  "key_takeaway",
];

function inferCalloutVariantFromClass(el: HTMLElement): CalloutVariant {
  const cls = el.className.toLowerCase();
  const role = el.getAttribute("role") || "";
  if (cls.includes("warning") || cls.includes("alert") || role === "alert")
    return "warning";
  if (cls.includes("quote")) return "quote";
  if (cls.includes("tldr") || cls.includes("summary")) return "tldr";
  if (cls.includes("takeaway") || cls.includes("key")) return "key_takeaway";
  return "info";
}

function calloutFallbackAttrs(el: unknown) {
  if (!(el instanceof HTMLElement)) return false;
  return {
    variant: inferCalloutVariantFromClass(el),
    title:
      el
        .querySelector("h1, h2, h3, h4, h5, h6, strong:first-child")
        ?.textContent?.trim() ?? null,
    with_icon: false,
  };
}

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
      with_icon: {
        default: false,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-with-icon") === "true",
        renderHTML: (attrs) =>
          attrs.with_icon ? { "data-with-icon": "true" } : {},
      },
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
            with_icon: el.getAttribute("data-with-icon") === "true",
          };
        },
      },
      { tag: "aside.callout", priority: 51, getAttrs: calloutFallbackAttrs },
      { tag: "aside.info-box", priority: 51, getAttrs: calloutFallbackAttrs },
      { tag: "aside.warning", priority: 51, getAttrs: calloutFallbackAttrs },
      { tag: "aside.tip", priority: 51, getAttrs: calloutFallbackAttrs },
      { tag: "aside.note", priority: 51, getAttrs: calloutFallbackAttrs },
      { tag: "aside.alert", priority: 51, getAttrs: calloutFallbackAttrs },
      { tag: "div.callout", priority: 51, getAttrs: calloutFallbackAttrs },
      { tag: "div.info-box", priority: 51, getAttrs: calloutFallbackAttrs },
      { tag: "div.warning", priority: 51, getAttrs: calloutFallbackAttrs },
      { tag: "div.tip", priority: 51, getAttrs: calloutFallbackAttrs },
      { tag: "div.note", priority: 51, getAttrs: calloutFallbackAttrs },
      { tag: '[role="note"]', priority: 51, getAttrs: calloutFallbackAttrs },
      { tag: '[role="alert"]', priority: 51, getAttrs: calloutFallbackAttrs },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const variant = (node.attrs.variant as CalloutVariant) || "info";
    const title = node.attrs.title as string | null;
    const withIcon = !!node.attrs.with_icon;

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
        ...(withIcon ? { "data-with-icon": "true" } : {}),
        class: `newsletter-callout newsletter-callout--${variant}`,
      }),
      ...inner,
    ] as any;
  },
});
