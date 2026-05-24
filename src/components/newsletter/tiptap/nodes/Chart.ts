import { Node, mergeAttributes } from "@tiptap/core";

const CHART_TYPES = ["line", "bar", "pie", "donut", "area", "image"] as const;
type ChartTypeUnion = (typeof CHART_TYPES)[number];

function clampType(v: string | null): ChartTypeUnion {
  return (CHART_TYPES as readonly string[]).includes(v ?? "")
    ? (v as ChartTypeUnion)
    : "line";
}

/**
 * newsletterChart — atom block holding chart config JSON.
 * Phase 1: render a placeholder figure. Phase 2 will swap in chart.js.
 */
export const NewsletterChart = Node.create({
  name: "newsletterChart",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      chart_type: {
        default: "line" as ChartTypeUnion,
        parseHTML: (el) => clampType(el.getAttribute("data-chart-type")),
        renderHTML: (attrs) => ({ "data-chart-type": attrs.chart_type }),
      },
      data_json: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-config") || "",
        renderHTML: (attrs) => ({ "data-config": attrs.data_json }),
      },
      caption: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-caption") || null,
        renderHTML: (attrs) =>
          attrs.caption ? { "data-caption": attrs.caption } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-newsletter-chart]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            chart_type: clampType(el.getAttribute("data-chart-type")),
            data_json: el.getAttribute("data-config") || "",
            caption: el.getAttribute("data-caption") || null,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const chartType = (node.attrs.chart_type as string) || "line";
    const dataJson = (node.attrs.data_json as string) || "";
    const caption = node.attrs.caption as string | null;

    const inner: unknown[] = [
      [
        "div",
        { class: "newsletter-chart__placeholder" },
        ["div", { class: "newsletter-chart__type" }, chartType.toUpperCase()],
        [
          "div",
          { class: "newsletter-chart__hint" },
          "Chart rendering ships in phase 2",
        ],
      ],
    ];
    if (caption) {
      inner.push(["figcaption", { class: "newsletter-chart__caption" }, caption]);
    }

    const wrapperAttrs: Record<string, string> = {
      "data-newsletter-chart": "true",
      "data-chart-type": chartType,
      "data-config": dataJson,
      class: "newsletter-chart",
    };
    if (caption) wrapperAttrs["data-caption"] = caption;

    return [
      "figure",
      mergeAttributes(HTMLAttributes, wrapperAttrs),
      ...inner,
    ] as never;
  },
});
