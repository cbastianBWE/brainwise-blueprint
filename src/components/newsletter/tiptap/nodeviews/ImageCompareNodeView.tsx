import { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2, Image as ImageIcon, Loader2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNewsletterEditorContext } from "../../editor/NewsletterEditorContext";
import { uploadNewsletterAsset } from "../../editor/uploadNewsletterAsset";
import {
  invalidateNewsletterAssetUrl,
  useNewsletterAssetUrl,
} from "../../editor/useNewsletterAssetUrl";

type Side = "before" | "after";

const REF_FIELD: Record<Side, string> = {
  before: "inline_image_compare_before",
  after: "inline_image_compare_after",
};

export function ImageCompareNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const { articleId } = useNewsletterEditorContext();

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const beforeInputRef = useRef<HTMLInputElement | null>(null);
  const afterInputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beforeAssetId: string | null = node.attrs.before_asset_id ?? null;
  const afterAssetId: string | null = node.attrs.after_asset_id ?? null;
  const storedPosition: number = Number(node.attrs.default_position) || 50;

  const [position, setPosition] = useState<number>(storedPosition);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [progressBefore, setProgressBefore] = useState<number>(0);
  const [progressAfter, setProgressAfter] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [beforeLabelDraft, setBeforeLabelDraft] = useState<string>(
    node.attrs.before_label ?? "Before",
  );
  const [afterLabelDraft, setAfterLabelDraft] = useState<string>(
    node.attrs.after_label ?? "After",
  );

  const { url: beforeUrl, loading: beforeLoading } =
    useNewsletterAssetUrl(beforeAssetId);
  const { url: afterUrl, loading: afterLoading } =
    useNewsletterAssetUrl(afterAssetId);

  // Sync external position changes (e.g. collaborative edits, history)
  useEffect(() => {
    setPosition(storedPosition);
  }, [storedPosition]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const flushDebounce = (fn: () => void) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fn, 300);
  };

  const handleFile = async (file: File | undefined, side: Side) => {
    if (!file) return;
    setError(null);
    const setUploading =
      side === "before" ? setUploadingBefore : setUploadingAfter;
    const setProgress =
      side === "before" ? setProgressBefore : setProgressAfter;

    setUploading(true);
    setProgress(0);
    try {
      const { asset_id } = await uploadNewsletterAsset({
        kind: "image",
        file,
        articleId,
        refField: REF_FIELD[side],
        onProgress: (p) => setProgress(p.pct),
      });
      invalidateNewsletterAssetUrl(asset_id);
      updateAttributes({
        [side === "before" ? "before_asset_id" : "after_asset_id"]: asset_id,
      });
    } catch (e: any) {
      setError(e?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDividerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const viewport = viewportRef.current;
      if (!viewport) return;
      const target = e.currentTarget as HTMLElement;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }

      let latest = position;
      const onMove = (moveEvent: PointerEvent) => {
        const rect = viewport.getBoundingClientRect();
        if (rect.width === 0) return;
        const x = moveEvent.clientX - rect.left;
        const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
        latest = pct;
        setPosition(pct);
      };
      const onUp = (upEvent: PointerEvent) => {
        try {
          target.releasePointerCapture?.(upEvent.pointerId);
        } catch {
          /* noop */
        }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        updateAttributes({ default_position: Math.round(latest) });
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [position, updateAttributes],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    let next: number | null = null;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      next = Math.max(0, position - step);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      next = Math.min(100, position + step);
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = 100;
    }
    if (next !== null) {
      e.preventDefault();
      setPosition(next);
      updateAttributes({ default_position: Math.round(next) });
    }
  };

  const bothFilled = !!beforeAssetId && !!afterAssetId;

  return (
    <NodeViewWrapper
      as="figure"
      data-newsletter-image-compare-nodeview
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        "group/nl-imgcmp relative my-6 rounded-lg border p-2 transition-all duration-150",
        selected
          ? "border-[#F5741A] ring-2 ring-[#F5741A]/30"
          : "border-[var(--border-2)] hover:border-[var(--border-1)]",
      )}
    >
      {/* Drag handle */}
      <div
        className="absolute -left-7 top-1/2 z-10 -translate-y-1/2 cursor-grab opacity-0 transition-opacity duration-150 group-hover/nl-imgcmp:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
      </div>

      {/* Hover affordances */}
      <div className="absolute right-2 top-2 z-30 flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-1 opacity-0 shadow-md backdrop-blur-sm transition-opacity duration-150 group-hover/nl-imgcmp:opacity-100">
        <button
          type="button"
          onClick={deleteNode}
          className="rounded-full p-1 text-[var(--fg-2)] transition-colors hover:bg-red-50 hover:text-[var(--danger)]"
          aria-label="Delete image compare"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Viewport */}
      <div
        ref={viewportRef}
        className="newsletter-image-compare-view__viewport"
        style={{ ["--ic-position" as any]: `${position}%` }}
      >
        {!bothFilled ? (
          <div className="newsletter-image-compare-view__upload-grid">
            {/* Before */}
            <button
              type="button"
              onClick={() => beforeInputRef.current?.click()}
              disabled={uploadingBefore}
              className="newsletter-image-compare-view__dropzone"
            >
              {beforeAssetId && beforeUrl && !beforeLoading ? (
                <img src={beforeUrl} alt="Before" />
              ) : (
                <>
                  {uploadingBefore || beforeLoading ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : (
                    <ImageIcon className="h-7 w-7" />
                  )}
                  <div className="text-sm font-medium">
                    {uploadingBefore
                      ? `Uploading ${Math.round(progressBefore)}%`
                      : "Before image"}
                  </div>
                </>
              )}
            </button>
            {/* After */}
            <button
              type="button"
              onClick={() => afterInputRef.current?.click()}
              disabled={uploadingAfter}
              className="newsletter-image-compare-view__dropzone"
            >
              {afterAssetId && afterUrl && !afterLoading ? (
                <img src={afterUrl} alt="After" />
              ) : (
                <>
                  {uploadingAfter || afterLoading ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : (
                    <ImageIcon className="h-7 w-7" />
                  )}
                  <div className="text-sm font-medium">
                    {uploadingAfter
                      ? `Uploading ${Math.round(progressAfter)}%`
                      : "After image"}
                  </div>
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            {beforeUrl && (
              <img
                src={beforeUrl}
                alt={beforeLabelDraft || "Before"}
                className="newsletter-image-compare-view__image newsletter-image-compare-view__image--before"
                draggable={false}
              />
            )}
            {afterUrl && (
              <img
                src={afterUrl}
                alt={afterLabelDraft || "After"}
                className="newsletter-image-compare-view__image newsletter-image-compare-view__image--after"
                draggable={false}
              />
            )}
            <div
              role="slider"
              tabIndex={0}
              aria-label="Image compare divider position"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(position)}
              onPointerDown={handleDividerPointerDown}
              onKeyDown={handleKeyDown}
              className="newsletter-image-compare-view__divider"
            />
          </>
        )}
      </div>

      {/* Label inputs */}
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={beforeLabelDraft}
          onChange={(e) => {
            setBeforeLabelDraft(e.target.value);
            flushDebounce(() =>
              updateAttributes({ before_label: e.target.value || "Before" }),
            );
          }}
          onBlur={() =>
            updateAttributes({ before_label: beforeLabelDraft || "Before" })
          }
          placeholder="Before"
          className="w-full flex-1 border-0 bg-transparent text-left text-[11px] uppercase italic tracking-wider text-[var(--fg-3)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-0"
        />
        <input
          type="text"
          value={afterLabelDraft}
          onChange={(e) => {
            setAfterLabelDraft(e.target.value);
            flushDebounce(() =>
              updateAttributes({ after_label: e.target.value || "After" }),
            );
          }}
          onBlur={() =>
            updateAttributes({ after_label: afterLabelDraft || "After" })
          }
          placeholder="After"
          className="w-full flex-1 border-0 bg-transparent text-right text-[11px] uppercase italic tracking-wider text-[var(--fg-3)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-0"
        />
      </div>

      {error && (
        <div className="mt-2 text-center text-xs text-[var(--danger)]">
          {error}
        </div>
      )}

      <input
        ref={beforeInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          handleFile(file, "before");
          e.target.value = "";
        }}
      />
      <input
        ref={afterInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          handleFile(file, "after");
          e.target.value = "";
        }}
      />
    </NodeViewWrapper>
  );
}
