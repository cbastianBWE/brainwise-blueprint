import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterAudio — atom block-level audio node.
 *
 * Canonical reference is `attrs.asset_id`. The `src` attribute on the emitted
 * <audio> is intentionally left empty in renderHTML; the runtime layer
 * (editor NodeView / G6 reader resolver) populates it by joining against
 * content_assets at render time.
 */
export const NewsletterAudio = Node.create({
  name: "newsletterAudio",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      asset_id: { default: null as string | null },
      title: { default: "" },
      duration_seconds: { default: 0 },
      transcript_url: { default: null as string | null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-newsletter-audio]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const figcaption = el.querySelector("figcaption");
          return {
            asset_id: el.getAttribute("data-asset-id"),
            title: figcaption?.textContent ?? "",
            duration_seconds: parseInt(
              el.getAttribute("data-duration-seconds") || "0",
              10,
            ),
            transcript_url:
              el.getAttribute("data-transcript-url") || null,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const assetId = (node.attrs.asset_id as string | null) || "";
    const title = (node.attrs.title as string) || "";
    const durationSeconds = Number(node.attrs.duration_seconds) || 0;
    const transcriptUrl = (node.attrs.transcript_url as string | null) || "";

    const wrapperAttrs: Record<string, string> = {
      "data-newsletter-audio": "true",
      "data-asset-id": assetId,
      "data-duration-seconds": String(durationSeconds),
      class: "newsletter-audio",
    };
    if (transcriptUrl) {
      wrapperAttrs["data-transcript-url"] = transcriptUrl;
    }

    const children: Array<
      [string, Record<string, string>] | [string, Record<string, string>, string]
    > = [["audio", { src: "", controls: "", preload: "metadata" }]];

    if (title) {
      children.push([
        "figcaption",
        { class: "newsletter-audio__caption" },
        title,
      ]);
    }
    if (transcriptUrl) {
      children.push([
        "a",
        {
          href: transcriptUrl,
          class: "newsletter-audio__transcript",
          target: "_blank",
          rel: "noopener noreferrer",
        },
        "View transcript",
      ]);
    }

    return [
      "figure",
      mergeAttributes(HTMLAttributes, wrapperAttrs),
      ...children,
    ] as any;
  },
});
