import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CircleCheck, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { CascadeResult } from "@/hooks/useCompletionReporter";

interface ViewerProps {
  contentItem: any;
  completion: any | null;
  viewerRole: "self" | "mentor" | "super_admin";
  reportCompletion: (
    rpcName: string,
    rpcArgs: Record<string, unknown>,
  ) => Promise<{ ok: boolean; cascade: CascadeResult | null; error?: string }>;
  isReporting: boolean;
}

function buildEmbedUrl(
  sourceType: string | null | undefined,
  sourceId: string | null | undefined,
): string | null {
  if (!sourceId) return null;
  switch (sourceType) {
    case "youtube_unlisted":
      return `https://www.youtube.com/embed/${sourceId}`;
    case "vimeo":
      return `https://player.vimeo.com/video/${sourceId}`;
    case "cloudflare_stream":
      return `https://iframe.videodelivery.net/${sourceId}`;
    default:
      return null;
  }
}

function SummaryCard({ summary }: { summary: string }) {
  const bullets = summary
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.replace(/^-\s*/, ""));
  if (bullets.length === 0) return null;
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Quick summary</h3>
      <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/90">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

export default function VideoViewer({
  contentItem,
  completion,
  viewerRole,
  reportCompletion,
  isReporting,
}: ViewerProps) {
  const sourceType = contentItem.video_source_type as string | null;
  const sourceId = contentItem.video_source_id as string | null;
  const threshold = Number(contentItem.video_completion_threshold_pct ?? 90);
  const isCompleted = completion?.status === "completed";
  const isSelf = viewerRole === "self";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastReportRef = useRef<number>(0);
  const completedFiredRef = useRef<boolean>(isCompleted);

  // Signed URL for supabase_storage
  const signedUrlQuery = useQuery({
    queryKey: ["content-item-video-url", contentItem.id],
    enabled: sourceType === "supabase_storage",
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "get-content-item-video-url",
        { body: { p_content_item_id: contentItem.id } },
      );
      if (error || !data?.signed_url) {
        throw new Error(data?.error || error?.message || "Video not available.");
      }
      return data as { signed_url: string; mime_type?: string };
    },
    staleTime: 5 * 60 * 1000,
  });

  const onTimeUpdate = async () => {
    if (!isSelf) return;
    const v = videoRef.current;
    if (!v || !v.duration || !isFinite(v.duration)) return;
    const pct = Math.floor((v.currentTime / v.duration) * 100);
    const pos = Math.floor(v.currentTime);
    const now = Date.now();

    // Threshold reached → complete
    if (!completedFiredRef.current && pct >= threshold) {
      completedFiredRef.current = true;
      await reportCompletion("record_video_progress", {
        p_content_item_id: contentItem.id,
        p_watch_pct: pct,
        p_last_position_seconds: pos,
      });
      return;
    }

    // Periodic progress (every 15s)
    if (now - lastReportRef.current >= 15000) {
      lastReportRef.current = now;
      await reportCompletion("record_video_progress", {
        p_content_item_id: contentItem.id,
        p_watch_pct: pct,
        p_last_position_seconds: pos,
      });
    }
  };

  useEffect(() => {
    completedFiredRef.current = isCompleted;
  }, [isCompleted]);

  const embedUrl = buildEmbedUrl(sourceType, sourceId);
  const muxHls = sourceType === "mux" && sourceId
    ? `https://stream.mux.com/${sourceId}.m3u8`
    : null;

  const markAsWatched = async () => {
    await reportCompletion("record_video_progress", {
      p_content_item_id: contentItem.id,
      p_watch_pct: 100,
      p_last_position_seconds: 0,
    });
  };

  return (
    <div className="space-y-4">
      {/* Player */}
      {sourceType === "supabase_storage" ? (
        signedUrlQuery.isLoading ? (
          <div className="aspect-video w-full flex items-center justify-center rounded-md bg-muted">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : signedUrlQuery.isError || !signedUrlQuery.data?.signed_url ? (
          <div className="rounded-md border border-destructive/30 bg-card p-6 text-sm text-destructive">
            Could not load video:{" "}
            {signedUrlQuery.error instanceof Error
              ? signedUrlQuery.error.message
              : "Unknown error"}
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-4xl justify-center rounded-md bg-black">
            <video
              ref={videoRef}
              controls
              className="rounded-md"
              style={{ maxHeight: "70vh", maxWidth: "100%", objectFit: "contain" }}
              src={signedUrlQuery.data.signed_url}
              onTimeUpdate={onTimeUpdate}
            />
          </div>
        )
      ) : embedUrl ? (
        <div className="mx-auto w-full max-w-4xl">
          <div
            className="mx-auto overflow-hidden rounded-md bg-muted"
            style={{ maxHeight: "70vh", aspectRatio: "16 / 9", maxWidth: "min(100%, calc(70vh * 16 / 9))" }}
          >
            <iframe
              src={embedUrl}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={contentItem.title ?? "Video"}
            />
          </div>
        </div>
      ) : muxHls ? (
        <div className="rounded-md border bg-card p-4 text-sm">
          <a
            href={muxHls}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary underline"
          >
            <ExternalLink className="h-4 w-4" /> Open video
          </a>
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No video source configured.
        </div>
      )}

      {/* Embed-source completion button (self only, not yet completed) */}
      {isSelf && sourceType !== "supabase_storage" && !isCompleted && (
        <div className="flex justify-end">
          <Button
            onClick={markAsWatched}
            disabled={isReporting}
            className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
          >
            {isReporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Mark as watched
          </Button>
        </div>
      )}

      {isCompleted && (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--bw-forest)" }}>
          <CircleCheck className="h-4 w-4" /> Completed
        </div>
      )}

      {/* AI summary card */}
      {isCompleted && typeof contentItem.video_ai_summary === "string" && contentItem.video_ai_summary.trim().length > 0 && (
        <SummaryCard summary={contentItem.video_ai_summary} />
      )}
    </div>
  );
}
