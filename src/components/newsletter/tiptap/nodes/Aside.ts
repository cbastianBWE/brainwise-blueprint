import { Node, mergeAttributes } from "@tiptap/core";

type AsideTone = "default" | "subtle";
const TONES: AsideTone[] = ["default", "subtle"];

/**
 * newsletterAside — secondary content box for tangential notes.
 *
 * Holds nested block content (paragraphs, lists). The bare `aside` parseHTML
 * rule excludes `[data-newsletter-callout]` so it never swallows callouts;
 * NewsletterCallout's matching rule also runs at priority 51 as defense in
 * depth.
 */
export const NewsletterAside = Node.create({
  name: "newsletterAside",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      label: { default: null as string | null },
      tone: {
        default: "default" as AsideTone,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-tone");
          return TONES.includes(v as AsideTone) ? (v as AsideTone) : "default";
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "aside:not([data-newsletter-callout])",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            tone: el.getAttribute("data-tone") || "default",
            label:
              el.querySelector(".newsletter-aside__label")?.textContent ?? null,
          };
        },
      },
      {
        tag: "div.aside",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            tone: el.getAttribute("data-tone") || "default",
            label:
              el.querySelector(".newsletter-aside__label")?.textContent ?? null,
          };
        },
      },
      { tag: "div.sidebar" },
      { tag: '[class~="by-the-way"]' },
      { tag: "[data-newsletter-aside]" },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const tone = (node.attrs.tone as AsideTone) || "default";
    const label = node.attrs.label as string | null;

    const inner: any[] = [];
    if (label) {
      inner.push(["div", { class: "newsletter-aside__label" }, label]);
    }
    inner.push(["div", { class: "newsletter-aside__body" }, 0]);

    return [
      "aside",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-aside": "true",
        "data-tone": tone,
        class: `newsletter-aside newsletter-aside--${tone}`,
      }),
      ...inner,
    ] as any;
  },
});
