import { Node, mergeAttributes } from "@tiptap/core";
import type { NewsletterImageWidth } from "../types";

/**
 * newsletterImage — block-level image node.
 *
 * Canonical reference is `attrs.asset_id` (per §133). The `src` attribute on
 * the emitted <img> is intentionally left empty in renderHTML output; the
 * runtime layer (editor NodeView in G4-A, reader resolver in G6) populates it
 * by joining against content_assets at render time. This makes the doc
 * portable across Storage path migrations and CDN swaps.
 */
export const NewsletterImage = Node.create({
  name: "newsletterImage",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      asset_id: { default: null as string | null },
      alt: { default: "" },
      caption: { default: "" },
      width: { default: "inline" as NewsletterImageWidth },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-newsletter-image]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const img = el.querySelector("img");
          const figcaption = el.querySelector("figcaption");
          return {
            asset_id: el.getAttribute("data-asset-id"),
            alt: img?.getAttribute("alt") ?? "",
            caption: figcaption?.textContent ?? "",
            width:
              (el.getAttribute("data-width") as NewsletterImageWidth) ||
              "inline",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const width = (node.attrs.width as NewsletterImageWidth) || "inline";
    const caption = (node.attrs.caption as string) || "";
    const alt = (node.attrs.alt as string) || "";
    const assetId = (node.attrs.asset_id as string | null) || "";

    const children: Array<[string, Record<string, string>] | [string, Record<string, string>, string]> = [
      ["img", { src: "", alt }],
    ];
    if (caption) {
      children.push(["figcaption", {}, caption]);
    }

    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-image": "true",
        "data-asset-id": assetId,
        "data-width": width,
        class: `newsletter-image newsletter-image--${width}`,
      }),
      ...children,
    ] as any;
  },
});
