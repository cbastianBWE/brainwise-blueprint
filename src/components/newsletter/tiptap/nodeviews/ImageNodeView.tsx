import { useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  ImageOff,
  Trash2,
  GripVertical,
  Upload,
  Loader2,
  Image as ImageIcon,
  Maximize2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNewsletterEditorContext } from "../../editor/NewsletterEditorContext";
import {
  uploadNewsletterAsset,
  type UploadProgress,
} from "../../editor/uploadNewsletterAsset";
import {
  invalidateNewsletterImageUrl,
  useNewsletterImageUrl,
} from "../../editor/useNewsletterImageUrl";
import type { NewsletterImageWidth } from "../types";

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


const WIDTHS: Array<{ value: NewsletterImageWidth; label: string }> = [
  { value: "inline", label: "Inline" },
  { value: "wide", label: "Wide" },
  { value: "full_bleed", label: "Full" },
];

export function ImageNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const { articleId } = useNewsletterEditorContext();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState<string>(node.attrs.caption ?? "");
  const [altOpen, setAltOpen] = useState(false);
  const [altDraft, setAltDraft] = useState<string>(node.attrs.alt ?? "");

  const assetId: string | null = node.attrs.asset_id ?? null;
  const importFailedSrc: string | null = node.attrs.import_failed_src ?? null;
  const width: NewsletterImageWidth = (node.attrs.width ?? "inline") as NewsletterImageWidth;

  const { url, loading } = useNewsletterImageUrl(
    importFailedSrc ? null : assetId,
  );

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    setProgress({ loaded: 0, total: file.size, pct: 0 });
    try {
      const { asset_id: newId } = await uploadNewsletterAsset({
        kind: "image",
        file,
        articleId,
        refField: "inline_image",
        onProgress: setProgress,
      });
      invalidateNewsletterImageUrl(newId);
      updateAttributes({
        asset_id: newId,
        import_failed_src: null,
      });
    } catch (e: any) {
      setError(e?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const widthClass =
    width === "full_bleed"
      ? "newsletter-image--full_bleed"
      : width === "wide"
        ? "newsletter-image--wide"
        : "newsletter-image--inline";

  return (
    <NodeViewWrapper
      as="div"
      data-newsletter-image-nodeview
      className={cn(
        "group/nl-image relative my-6 transition-shadow duration-150",
        widthClass,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border transition-all duration-150",
          selected
            ? "ring-2 ring-[#F5741A] border-transparent"
            : "border-transparent hover:border-[var(--border-2)] hover:shadow-sm",
        )}
      >
        {/* Selected accent rail */}
        {selected && (
          <div className="absolute left-0 top-0 z-10 h-full w-1 bg-[#F5741A]" />
        )}

        {/* Top-right hover affordances */}
        <div
          className={cn(
            "absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-1 shadow-md backdrop-blur-sm transition-opacity duration-150",
            selected
              ? "opacity-100"
              : "opacity-0 group-hover/nl-image:opacity-100",
          )}
        >
          {WIDTHS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => updateAttributes({ width: w.value })}
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
                width === w.value
                  ? "bg-[#F5741A] text-white"
                  : "text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]",
              )}
            >
              {w.label}
            </button>
          ))}
          <div className="mx-1 h-4 w-px bg-[var(--border-1)]" />
          <button
            type="button"
            onClick={() =>
              updateAttributes({ lightbox: !node.attrs.lightbox })
            }
            title="Toggle lightbox on click in reader"
            aria-label="Toggle lightbox on click in reader"
            className={cn(
              "rounded-full p-1 transition-colors",
              node.attrs.lightbox
                ? "bg-[#F5741A] text-white"
                : "text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]",
            )}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              updateAttributes({ lazy_load: !(node.attrs.lazy_load !== false) })
            }
            title="Lazy-load (defer offscreen images)"
            aria-label="Lazy-load (defer offscreen images)"
            className={cn(
              "rounded-full p-1 transition-colors",
              node.attrs.lazy_load !== false
                ? "bg-[#F5741A] text-white"
                : "text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]",
            )}
          >
            <Clock className="h-3.5 w-3.5" />
          </button>
          <div className="mx-1 h-4 w-px bg-[var(--border-1)] " />
          <button
            type="button"
            onClick={triggerFilePicker}
            className="rounded-full p-1 text-[var(--fg-2)] transition-colors hover:bg-[var(--bw-cream-200)] hover:text-[var(--fg-1)]"
            aria-label="Replace image"
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={deleteNode}
            className="rounded-full p-1 text-[var(--fg-2)] transition-colors hover:bg-red-50 hover:text-[var(--danger)]"
            aria-label="Delete image"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Left drag handle */}
        <div
          className="absolute -left-7 top-1/2 z-10 -translate-y-1/2 cursor-grab opacity-0 transition-opacity duration-150 group-hover/nl-image:opacity-100"
          data-drag-handle
        >
          <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
        </div>

        {/* Body */}
        {importFailedSrc ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-[var(--border-2)] bg-[var(--bw-cream-300)] p-6 text-center">
            <ImageOff className="h-8 w-8 text-[var(--danger)]" />
            <div className="w-full">
              <div className="text-sm font-semibold text-[var(--fg-1)]">
                Image import failed
              </div>
              <code className="mt-1 block max-w-full truncate font-mono text-[11px] text-[var(--fg-3)]">
                {importFailedSrc}
              </code>
            </div>
            <button
              type="button"
              onClick={triggerFilePicker}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-full bg-[#021F36] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0A2F4D] disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Re-upload
            </button>
          </div>
        ) : assetId ? (
          <div className="relative">
            {loading || !url ? (
              <div className="flex aspect-video w-full items-center justify-center bg-[var(--bw-cream-200)]">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--fg-4)]" />
              </div>
            ) : (
              <img
                src={url}
                alt={node.attrs.alt ?? ""}
                className="block h-auto w-full"
                draggable={false}
              />
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-[#F5741A]" />
                  <div className="text-xs font-medium text-[var(--fg-2)]">
                    {progress ? `${Math.round(progress.pct)}%` : "Uploading…"}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={triggerFilePicker}
            disabled={uploading}
            className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--border-2)] bg-[var(--bw-cream-300)] text-[var(--fg-3)] transition-colors hover:border-[#F5741A] hover:bg-[var(--bw-cream-200)] hover:text-[#F5741A]"
          >
            {uploading ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <ImageIcon className="h-7 w-7" />
            )}
            <div className="text-sm font-medium">
              {uploading
                ? progress
                  ? `Uploading ${Math.round(progress.pct)}%`
                  : "Uploading…"
                : "Click to upload image"}
            </div>
            <div className="text-[11px]">JPG, PNG, WebP, GIF, SVG up to 20 MB</div>
          </button>
        )}
      </div>

      {/* Caption */}
      <input
        type="text"
        value={captionDraft}
        onChange={(e) => setCaptionDraft(e.target.value)}
        onBlur={() => updateAttributes({ caption: captionDraft })}
        placeholder="Add caption (optional)"
        className="mt-2 w-full border-0 bg-transparent text-center text-sm italic text-[var(--fg-3)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-0"
      />

      {/* Attribution (Pexels etc. — required by license) */}
      {node.attrs.attribution && (
        <div className="mt-1 text-center text-xs italic text-[var(--fg-4)]">
          Photo by{" "}
          {(() => {
            const photoUrl = safeHttpUrl(node.attrs.attribution.photographer_url);
            return photoUrl ? (
              <a
                href={photoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[var(--fg-2)]"
              >
                {node.attrs.attribution.photographer}
              </a>
            ) : (
              <span>{node.attrs.attribution.photographer}</span>
            );
          })()}
          {node.attrs.attribution.source === "pexels" && (
            <>
              {" "}on{" "}
              {(() => {
                const srcUrl = safeHttpUrl(node.attrs.attribution.source_url);
                return srcUrl ? (
                  <a
                    href={srcUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[var(--fg-2)]"
                  >
                    Pexels
                  </a>
                ) : (
                  <>Pexels</>
                );
              })()}
            </>
          )}

        </div>
      )}

      {/* Alt text editor */}
      <div className="mt-1 flex items-center justify-center gap-2 text-[11px] text-[var(--fg-4)]">
        {altOpen ? (
          <input
            autoFocus
            type="text"
            value={altDraft}
            onChange={(e) => setAltDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateAttributes({ alt: altDraft });
                setAltOpen(false);
              } else if (e.key === "Escape") {
                setAltDraft(node.attrs.alt ?? "");
                setAltOpen(false);
              }
            }}
            onBlur={() => {
              updateAttributes({ alt: altDraft });
              setAltOpen(false);
            }}
            placeholder="Describe image for accessibility"
            className="w-64 rounded border border-[var(--border-1)] bg-white px-2 py-0.5 text-[11px] text-[var(--fg-2)] focus:border-[#F5741A] focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setAltDraft(node.attrs.alt ?? "");
              setAltOpen(true);
            }}
            className="rounded px-1.5 py-0.5 transition-colors hover:bg-[var(--bw-cream-200)] hover:text-[var(--fg-2)]"
          >
            Alt: {node.attrs.alt ? node.attrs.alt : <span className="italic">none</span>}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-2 text-center text-xs text-[var(--danger)]">{error}</div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </NodeViewWrapper>
  );
}
