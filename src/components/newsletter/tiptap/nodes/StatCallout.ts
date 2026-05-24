import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterStatCallout — large numeric display.
 *
 * `value` is a string (not number) to support "42%", "$1.2M", "3x", etc.
 */
export const NewsletterStatCallout = Node.create({
  name: "newsletterStatCallout",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      value: { default: "" },
      label: { default: "" },
      source: { default: null as string | null },
      trend: {
        default: null as "up" | "down" | "flat" | null,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-trend");
          return ["up", "down", "flat"].includes(v || "")
            ? (v as "up" | "down" | "flat")
            : null;
        },
        renderHTML: (attrs) =>
          attrs.trend ? { "data-trend": attrs.trend } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-newsletter-stat-callout]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const t = el.getAttribute("data-trend");
          return {
            value:
              el.querySelector(".newsletter-stat-callout__value")
                ?.textContent ?? "",
            label:
              el.querySelector(".newsletter-stat-callout__label")
                ?.textContent ?? "",
            source:
              el.querySelector(".newsletter-stat-callout__source")
                ?.textContent ?? null,
            trend: ["up", "down", "flat"].includes(t || "") ? t : null,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const value = (node.attrs.value as string) || "";
    const label = (node.attrs.label as string) || "";
    const source = node.attrs.source as string | null;
    const trend = node.attrs.trend as "up" | "down" | "flat" | null;

    const inner: any[] = [
      ["div", { class: "newsletter-stat-callout__value" }, value],
    ];
    if (trend) {
      inner.push([
        "span",
        {
          class: `newsletter-stat-callout__trend newsletter-stat-callout__trend--${trend}`,
        },
        "",
      ]);
    }
    inner.push(["div", { class: "newsletter-stat-callout__label" }, label]);
    if (source) {
      inner.push(["div", { class: "newsletter-stat-callout__source" }, source]);
    }

    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-stat-callout": "true",
        ...(trend ? { "data-trend": trend } : {}),
        class: "newsletter-stat-callout",
      }),
      ...inner,
    ] as any;
  },
});
