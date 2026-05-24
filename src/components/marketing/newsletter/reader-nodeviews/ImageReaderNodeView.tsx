import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useNewsletterImageUrl } from "@/components/newsletter/editor/useNewsletterImageUrl";
import type { NewsletterImageWidth } from "@/components/newsletter/tiptap/types";

export default function ImageReaderNodeView({ node }: NodeViewProps) {
  const assetId = (node.attrs.asset_id as string | null) ?? null;
  const importFailedSrc = (node.attrs.import_failed_src as string | null) ?? null;
  const alt = (node.attrs.alt as string) ?? "";
  const caption = (node.attrs.caption as string) ?? "";
  const width = ((node.attrs.width as NewsletterImageWidth) || "inline") as NewsletterImageWidth;

  const { url, loading } = useNewsletterImageUrl(assetId);
  const finalSrc = url || importFailedSrc;

  return (
    <NodeViewWrapper
      as="figure"
      data-newsletter-image="true"
      data-width={width}
      className={`newsletter-image newsletter-image--${width}`}
    >
      {finalSrc ? (
        <img src={finalSrc} alt={alt} loading="lazy" />
      ) : loading ? (
        <div
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            background: "rgba(0,0,0,0.06)",
            borderRadius: 8,
          }}
          aria-hidden
        />
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
          Image unavailable
        </div>
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </NodeViewWrapper>
  );
}
