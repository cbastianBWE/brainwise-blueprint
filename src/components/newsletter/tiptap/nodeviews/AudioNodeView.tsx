import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  Music,
  Trash2,
  GripVertical,
  Upload,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isSafeHttpUrl } from "@/lib/safeUrl";
import { useNewsletterEditorContext } from "../../editor/NewsletterEditorContext";
import {
  uploadNewsletterAsset,
  type UploadProgress,
} from "../../editor/uploadNewsletterAsset";
import {
  invalidateNewsletterAssetUrl,
  useNewsletterAssetUrl,
} from "../../editor/useNewsletterAssetUrl";

function formatDuration(s: number): string {
  if (!s || !isFinite(s) || s < 0) return "0:00";
  const total = Math.round(s);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function AudioNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const { articleId } = useNewsletterEditorContext();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [titleDraft, setTitleDraft] = useState<string>(node.attrs.title ?? "");
  const [transcriptDraft, setTranscriptDraft] = useState<string>(
    node.attrs.transcript_url ?? "",
  );
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideDraft, setOverrideDraft] = useState<string>(
    String(node.attrs.duration_seconds ?? 0),
  );

  const assetId: string | null = node.attrs.asset_id ?? null;
  const durationSeconds: number = Number(node.attrs.duration_seconds) || 0;

  const { url, loading } = useNewsletterAssetUrl(assetId);

  const flushDebounce = (fn: () => void) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fn, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const triggerFilePicker = () => fileInputRef.current?.click();

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    setProgress({ loaded: 0, total: file.size, pct: 0 });
    try {
      const { asset_id: newId } = await uploadNewsletterAsset({
        kind: "audio",
        file,
        articleId,
        onProgress: setProgress,
      });
      invalidateNewsletterAssetUrl(newId);
      updateAttributes({ asset_id: newId });
    } catch (e: any) {
      setError(e?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const handleLoadedMetadata = () => {
    const el = audioRef.current;
    if (!el) return;
    const d = el.duration;
    if (isFinite(d) && d > 0) {
      updateAttributes({ duration_seconds: Math.round(d) });
      return;
    }
    // Infinity / NaN fallback: seek to end to force the browser to compute it.
    const onTimeUpdate = () => {
      const d2 = el.duration;
      el.removeEventListener("timeupdate", onTimeUpdate);
      try {
        el.currentTime = 0;
      } catch {
        /* noop */
      }
      if (isFinite(d2) && d2 > 0) {
        updateAttributes({ duration_seconds: Math.round(d2) });
      }
    };
    el.addEventListener("timeupdate", onTimeUpdate);
    try {
      el.currentTime = 1e10;
    } catch {
      el.removeEventListener("timeupdate", onTimeUpdate);
    }
  };

  const commitTranscript = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setTranscriptError(null);
      updateAttributes({ transcript_url: null });
      return;
    }
    if (!isSafeHttpUrl(trimmed)) {
      setTranscriptError("Only http(s) URLs are allowed.");
      return;
    }
    setTranscriptError(null);
    updateAttributes({ transcript_url: trimmed });
  };

  return (
    <NodeViewWrapper
      as="figure"
      data-newsletter-audio-nodeview
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        "group/nl-audio relative my-6 rounded-lg border p-4 transition-all duration-150",
        selected
          ? "border-[#F5741A] ring-2 ring-[#F5741A]/30"
          : "border-[var(--border-2)] hover:border-[var(--border-1)]",
      )}
    >
      {/* Drag handle */}
      <div
        className="absolute -left-7 top-1/2 z-10 -translate-y-1/2 cursor-grab opacity-0 transition-opacity duration-150 group-hover/nl-audio:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
      </div>

      {/* Hover affordances */}
      {assetId && (
        <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-1 opacity-0 shadow-md backdrop-blur-sm transition-opacity duration-150 group-hover/nl-audio:opacity-100">
          <button
            type="button"
            onClick={triggerFilePicker}
            className="rounded-full p-1 text-[var(--fg-2)] transition-colors hover:bg-[var(--bw-cream-200)] hover:text-[var(--fg-1)]"
            aria-label="Replace audio"
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={deleteNode}
            className="rounded-full p-1 text-[var(--fg-2)] transition-colors hover:bg-red-50 hover:text-[var(--danger)]"
            aria-label="Delete audio"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!assetId ? (
        <button
          type="button"
          onClick={triggerFilePicker}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--border-2)] bg-[var(--bw-cream-300)] py-10 text-[var(--fg-3)] transition-colors hover:border-[#F5741A] hover:bg-[var(--bw-cream-200)] hover:text-[#F5741A]"
        >
          {uploading ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : (
            <Music className="h-7 w-7" />
          )}
          <div className="text-sm font-medium">
            {uploading
              ? progress
                ? `Uploading ${Math.round(progress.pct)}%`
                : "Uploading…"
              : "Click to upload audio file"}
          </div>
          <div className="text-[11px]">MP3, WAV, OGG, M4A up to 100 MB</div>
        </button>
      ) : (
        <div className="space-y-3">
          {loading || !url ? (
            <div className="flex h-14 w-full items-center justify-center rounded bg-[var(--bw-cream-200)]">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--fg-4)]" />
            </div>
          ) : (
            <audio
              ref={audioRef}
              src={url}
              controls
              preload="metadata"
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full"
            />
          )}

          <input
            type="text"
            value={titleDraft}
            onChange={(e) => {
              setTitleDraft(e.target.value);
              flushDebounce(() => updateAttributes({ title: e.target.value }));
            }}
            onBlur={() => updateAttributes({ title: titleDraft })}
            placeholder="Optional title or description"
            className="w-full border-0 bg-transparent text-sm italic text-[var(--fg-2)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-0"
          />

          <div className="flex items-center gap-3 text-[11px] text-[var(--fg-3)]">
            <span className="font-mono">
              Duration: {formatDuration(durationSeconds)}
            </span>
            {overrideOpen ? (
              <span className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={overrideDraft}
                  onChange={(e) => setOverrideDraft(e.target.value)}
                  className="w-20 rounded border border-[var(--border-1)] bg-white px-1.5 py-0.5 text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const n = parseInt(overrideDraft, 10);
                    if (!isNaN(n) && n >= 0) {
                      updateAttributes({ duration_seconds: n });
                    }
                    setOverrideOpen(false);
                  }}
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#F5741A] hover:bg-[var(--bw-cream-200)]"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideOpen(false)}
                  className="rounded px-1.5 py-0.5 text-[10px] uppercase text-[var(--fg-4)] hover:bg-[var(--bw-cream-200)]"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOverrideDraft(String(durationSeconds));
                  setOverrideOpen(true);
                }}
                className="rounded px-1.5 py-0.5 text-[10px] uppercase hover:bg-[var(--bw-cream-200)] hover:text-[var(--fg-2)]"
              >
                Override
              </button>
            )}
          </div>

          <div>
            <input
              type="url"
              value={transcriptDraft}
              onChange={(e) => {
                setTranscriptDraft(e.target.value);
                flushDebounce(() => commitTranscript(e.target.value));
              }}
              onBlur={() => commitTranscript(transcriptDraft)}
              placeholder="Optional transcript link (https://…)"
              className="w-full rounded border border-[var(--border-1)] bg-white px-2 py-1 text-[12px] text-[var(--fg-2)] placeholder:text-[var(--fg-4)] focus:border-[#F5741A] focus:outline-none"
            />
            {transcriptError && (
              <div className="mt-1 text-[11px] text-[var(--danger)]">
                {transcriptError}
              </div>
            )}
          </div>
        </div>
      )}

      {uploading && assetId && (
        <div className="mt-2 text-center text-[11px] text-[var(--fg-3)]">
          {progress ? `Uploading ${Math.round(progress.pct)}%` : "Uploading…"}
        </div>
      )}
      {error && (
        <div className="mt-2 text-center text-xs text-[var(--danger)]">
          {error}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/webm,audio/ogg,audio/mp4"
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
