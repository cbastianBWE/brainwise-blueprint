import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useNewsletterImageUrl } from "@/components/newsletter/editor/useNewsletterImageUrl";
import type { NewsletterImageWidth } from "@/components/newsletter/tiptap/types";

function safeHttpUrl(u: unknown): string | null {
  if (typeof u !== "string") return null;
  const t = u.trim();
  if (!/^https?:\/\//i.test(t)) return null;
  try {
    const parsed = new URL(t);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}


export default function ImageReaderNodeView({ node }: NodeViewProps) {
  const assetId = (node.attrs.asset_id as string | null) ?? null;
  const importFailedSrc = (node.attrs.import_failed_src as string | null) ?? null;
  const alt = (node.attrs.alt as string) ?? "";
  const caption = (node.attrs.caption as string) ?? "";
  const width = ((node.attrs.width as NewsletterImageWidth) || "inline") as NewsletterImageWidth;
  const attribution = (node.attrs.attribution as {
    source: "pexels" | null;
    photographer: string;
    photographer_url: string;
    source_url: string;
  } | null) ?? null;

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
      {attribution && (
        <figcaption
          style={{
            fontSize: 12,
            fontStyle: "italic",
            color: "rgba(0,0,0,0.55)",
            marginTop: 4,
          }}
        >
          Photo by{" "}
          <a
            href={attribution.photographer_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline", color: "inherit" }}
          >
            {attribution.photographer}
          </a>
          {attribution.source === "pexels" && (
            <>
              {" "}on{" "}
              <a
                href={attribution.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "underline", color: "inherit" }}
              >
                Pexels
              </a>
            </>
          )}
        </figcaption>
      )}
    </NodeViewWrapper>
  );
}
