import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { buildEmbedSrc } from "@/components/newsletter/tiptap";
import type { EmbedProvider } from "@/components/newsletter/tiptap/types";

export default function EmbedReaderNodeView({ node }: NodeViewProps) {
  const provider = (node.attrs.provider as EmbedProvider) || "generic";
  const embedId = (node.attrs.embed_id as string) || "";
  const url = (node.attrs.url as string) || "";
  const title = (node.attrs.title as string) || "";

  const src = buildEmbedSrc(provider, embedId, url);

  const aspectRatio =
    provider === "spotify" ? "auto" : "16 / 9";

  return (
    <NodeViewWrapper
      as="figure"
      data-newsletter-embed="true"
      className="newsletter-embed"
    >
      {src ? (
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio,
            background: "#000",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <iframe
            src={src}
            title={title || `${provider} embed`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: provider === "spotify" ? 232 : "100%",
              border: 0,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            padding: 24,
            background: "rgba(0,0,0,0.04)",
            borderRadius: 8,
            color: "rgba(0,0,0,0.5)",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          Invalid embed
        </div>
      )}
      {title && <figcaption>{title}</figcaption>}
    </NodeViewWrapper>
  );
}
