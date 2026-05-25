import { Node, mergeAttributes } from "@tiptap/core";
import type { NewsletterImageWidth } from "../types";

export interface NewsletterImageAttribution {
  source: "pexels" | null;
  photographer: string;
  photographer_url: string;
  source_url: string;
}

/**
 * newsletterImage — block-level image node.
 *
 * Canonical reference is `attrs.asset_id` (per §133). The `src` attribute on
 * the emitted <img> is intentionally left empty in renderHTML output; the
 * runtime layer (editor NodeView in G4-A, reader resolver in G6) populates
 * it by joining against content_assets at render time.
 *
 * `import_failed_src` (G4-A forward-compat) is set by the convert-html-to-tiptap
 * Edge Function when an image fetch fails during HTML import. When non-null,
 * the editor NodeView renders a broken-image card with a "Re-upload" affordance
 * instead of attempting to resolve asset_id.
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
      import_failed_src: { default: null as string | null },
      lightbox: {
        default: false,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-lightbox") === "true",
        renderHTML: (attrs) =>
          attrs.lightbox ? { "data-lightbox": "true" } : {},
      },
      lazy_load: {
        default: true,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-lazy-load");
          // Default true: only false if explicitly set to "false"
          return v !== "false";
        },
        renderHTML: (attrs) =>
          attrs.lazy_load ? {} : { "data-lazy-load": "false" },
      },
      attribution: {
        default: null as NewsletterImageAttribution | null,
        parseHTML: (el) => {
          const raw = (el as HTMLElement).getAttribute("data-attribution");
          if (!raw) return null;
          try {
            return JSON.parse(raw) as NewsletterImageAttribution;
          } catch {
            return null;
          }
        },
        renderHTML: (attrs) => {
          if (!attrs.attribution) return {};
          return { "data-attribution": JSON.stringify(attrs.attribution) };
        },
      },
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
          let attribution: NewsletterImageAttribution | null = null;
          const rawAttr = el.getAttribute("data-attribution");
          if (rawAttr) {
            try {
              attribution = JSON.parse(rawAttr) as NewsletterImageAttribution;
            } catch {
              attribution = null;
            }
          }
          return {
            asset_id: el.getAttribute("data-asset-id"),
            alt: img?.getAttribute("alt") ?? "",
            caption: figcaption?.textContent ?? "",
            width:
              (el.getAttribute("data-width") as NewsletterImageWidth) ||
              "inline",
            import_failed_src:
              el.getAttribute("data-import-failed-src") || null,
            lightbox: el.getAttribute("data-lightbox") === "true",
            lazy_load: el.getAttribute("data-lazy-load") !== "false",
            attribution,
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
    const importFailedSrc = (node.attrs.import_failed_src as string | null) || "";
    const lightbox = !!node.attrs.lightbox;
    const lazyLoad = node.attrs.lazy_load !== false;
    const attribution = (node.attrs.attribution as NewsletterImageAttribution | null) || null;

    const wrapperAttrs: Record<string, string> = {
      "data-newsletter-image": "true",
      "data-asset-id": assetId,
      "data-width": width,
      class: `newsletter-image newsletter-image--${width}`,
    };
    if (importFailedSrc) {
      wrapperAttrs["data-import-failed-src"] = importFailedSrc;
    }
    if (attribution) {
      wrapperAttrs["data-attribution"] = JSON.stringify(attribution);
    }
    if (lightbox) {
      wrapperAttrs["data-lightbox"] = "true";
    }
    if (!lazyLoad) {
      wrapperAttrs["data-lazy-load"] = "false";
    }

    const imgAttrs: Record<string, string> = { src: "", alt };
    if (lazyLoad) {
      imgAttrs.loading = "lazy";
    }

    const children: Array<[string, Record<string, string>] | [string, Record<string, string>, string]> = [
      ["img", imgAttrs],
    ];
    if (caption) {
      children.push(["figcaption", {}, caption]);
    }

    return [
      "figure",
      mergeAttributes(HTMLAttributes, wrapperAttrs),
      ...children,
    ] as any;
  },
});
