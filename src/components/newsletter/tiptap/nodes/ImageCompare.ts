import { Node, mergeAttributes } from "@tiptap/core";

function imageCompareFallbackAttrs() {
  return {
    before_asset_id: null as string | null,
    after_asset_id: null as string | null,
    before_label: "Before",
    after_label: "After",
    default_position: 50,
  };
}

/**
 * newsletterImageCompare — atom block with two image asset_ids
 * (before + after), an author-stored default divider position, and
 * static reader-path rendering.
 *
 * Per §133 the <img> `src` attrs are emitted empty; the runtime layer
 * (editor NodeView in G4-A, reader resolver in G6) populates them by
 * joining against content_assets at render time.
 *
 * The author-chosen divider position rides to the reader as both
 * `data-default-position` (for the resolver to read) and as an inline
 * CSS custom property `--ic-position` on the viewport div, which the
 * static CSS uses to clip-path the after image and place the divider.
 */
export const NewsletterImageCompare = Node.create({
  name: "newsletterImageCompare",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      before_asset_id: {
        default: null as string | null,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-before-asset-id") || null,
        renderHTML: (attrs) =>
          attrs.before_asset_id
            ? { "data-before-asset-id": attrs.before_asset_id }
            : {},
      },
      after_asset_id: {
        default: null as string | null,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-after-asset-id") || null,
        renderHTML: (attrs) =>
          attrs.after_asset_id
            ? { "data-after-asset-id": attrs.after_asset_id }
            : {},
      },
      before_label: {
        default: "Before",
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-before-label") || "Before",
        renderHTML: (attrs) => ({
          "data-before-label": attrs.before_label,
        }),
      },
      after_label: {
        default: "After",
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-after-label") || "After",
        renderHTML: (attrs) => ({
          "data-after-label": attrs.after_label,
        }),
      },
      default_position: {
        default: 50,
        parseHTML: (el) => {
          const v = parseInt(
            (el as HTMLElement).getAttribute("data-default-position") || "50",
            10,
          );
          if (isNaN(v) || v < 0 || v > 100) return 50;
          return v;
        },
        renderHTML: (attrs) => ({
          "data-default-position": String(attrs.default_position),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-newsletter-image-compare]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const posAttr = el.getAttribute("data-default-position") || "50";
          const pos = parseInt(posAttr, 10);
          return {
            before_asset_id: el.getAttribute("data-before-asset-id") || null,
            after_asset_id: el.getAttribute("data-after-asset-id") || null,
            before_label: el.getAttribute("data-before-label") || "Before",
            after_label: el.getAttribute("data-after-label") || "After",
            default_position:
              isNaN(pos) || pos < 0 || pos > 100 ? 50 : pos,
          };
        },
      },
      { tag: "figure.image-compare", priority: 51, getAttrs: () => imageCompareFallbackAttrs() },
      { tag: "figure.before-after", priority: 51, getAttrs: () => imageCompareFallbackAttrs() },
      { tag: "div.image-compare", priority: 51, getAttrs: () => imageCompareFallbackAttrs() },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const beforeId = (node.attrs.before_asset_id as string | null) || "";
    const afterId = (node.attrs.after_asset_id as string | null) || "";
    const beforeLabel = (node.attrs.before_label as string) || "Before";
    const afterLabel = (node.attrs.after_label as string) || "After";
    const pos = Math.max(
      0,
      Math.min(100, Number(node.attrs.default_position) || 50),
    );

    const wrapperAttrs: Record<string, string> = {
      "data-newsletter-image-compare": "true",
      "data-before-asset-id": beforeId,
      "data-after-asset-id": afterId,
      "data-before-label": beforeLabel,
      "data-after-label": afterLabel,
      "data-default-position": String(pos),
      class: "newsletter-image-compare",
    };

    return [
      "figure",
      mergeAttributes(HTMLAttributes, wrapperAttrs),
      [
        "div",
        {
          class: "newsletter-image-compare__viewport",
          style: `--ic-position: ${pos}%`,
        },
        [
          "img",
          {
            src: "",
            alt: beforeLabel,
            class:
              "newsletter-image-compare__image newsletter-image-compare__image--before",
          },
        ],
        [
          "img",
          {
            src: "",
            alt: afterLabel,
            class:
              "newsletter-image-compare__image newsletter-image-compare__image--after",
          },
        ],
        ["div", { class: "newsletter-image-compare__divider" }],
      ],
      [
        "div",
        { class: "newsletter-image-compare__labels" },
        ["span", { class: "newsletter-image-compare__label--before" }, beforeLabel],
        ["span", { class: "newsletter-image-compare__label--after" }, afterLabel],
      ],
    ] as any;
  },
});
