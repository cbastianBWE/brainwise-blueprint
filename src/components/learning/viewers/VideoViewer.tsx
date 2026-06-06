import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CircleCheck } from "lucide-react";
import MuxPlayer from "@mux/mux-player-react";
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

  const lastReportRef = useRef<number>(0);
  const completedFiredRef = useRef<boolean>(isCompleted);

  useEffect(() => {
    completedFiredRef.current = isCompleted;
  }, [isCompleted]);

  // Single call site for the brokered video URL. Covers supabase_storage and mux;
  // the response `kind` selects the player. Embeds (youtube/vimeo/cloudflare) do
  // not use the edge function.
  const usesEdgeFn = sourceType === "supabase_storage" || sourceType === "mux";
  const videoQuery = useQuery({
    queryKey: ["content-item-video-url", contentItem.id],
    enabled: usesEdgeFn,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "get-content-item-video-url",
        { body: { p_content_item_id: contentItem.id } },
      );
      if (error) {
        throw new Error(error.message || "Video not available.");
      }
      if ((data as any)?.error) {
        throw new Error((data as any).error);
      }
      return data as
        | { kind: "supabase_storage"; signed_url: string; mime_type?: string }
        | {
            kind: "mux";
            processing?: boolean;
            mux_status?: string;
            playback_id?: string;
            token?: string;
          };
    },
    // Mux tokens last 2h; refetch comfortably inside that window.
    staleTime: 60 * 60 * 1000,
    // While a Mux asset is still processing, poll so it appears when ready.
    refetchInterval: (q) =>
      (q.state.data as any)?.kind === "mux" && (q.state.data as any)?.processing
        ? 8000
        : false,
  });

  // Shared progress reporter for both native <video> and <MuxPlayer>.
  const onTimeUpdate = async (e: {
    currentTarget: { currentTime?: number; duration?: number };
  }) => {
    if (!isSelf) return;
    const el = e.currentTarget;
    const duration = el?.duration;
    const currentTime = el?.currentTime;
    if (!duration || !isFinite(duration) || currentTime == null) return;
    const pct = Math.floor((currentTime / duration) * 100);
    const pos = Math.floor(currentTime);
    const now = Date.now();

    if (!completedFiredRef.current && pct >= threshold) {
      completedFiredRef.current = true;
      await reportCompletion("record_video_progress", {
        p_content_item_id: contentItem.id,
        p_watch_pct: pct,
        p_last_position_seconds: pos,
      });
      return;
    }

    if (now - lastReportRef.current >= 15000) {
      lastReportRef.current = now;
      await reportCompletion("record_video_progress", {
        p_content_item_id: contentItem.id,
        p_watch_pct: pct,
        p_last_position_seconds: pos,
      });
    }
  };

  const embedUrl = buildEmbedUrl(sourceType, sourceId);
  const data = videoQuery.data as any;

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
      {usesEdgeFn ? (
        videoQuery.isLoading ? (
          <div className="aspect-video w-full flex items-center justify-center rounded-md bg-muted">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : videoQuery.isError ? (
          <div className="rounded-md border border-destructive/30 bg-card p-6 text-sm text-destructive">
            Could not load video:{" "}
            {videoQuery.error instanceof Error
              ? videoQuery.error.message
              : "Unknown error"}
          </div>
        ) : data?.kind === "mux" ? (
          data.processing || !data.playback_id || !data.token ? (
            <div className="aspect-video w-full flex flex-col items-center justify-center gap-2 rounded-md bg-muted text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>This video is still processing. It will appear here shortly.</span>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-4xl justify-center rounded-md bg-black overflow-hidden">
              <MuxPlayer
                playbackId={data.playback_id}
                tokens={{ playback: data.token }}
                streamType="on-demand"
                autoPlay={false}
                metadata={{ video_title: contentItem.title ?? undefined }}
                style={{ maxHeight: "70vh", aspectRatio: "16 / 9", width: "100%" }}
                onTimeUpdate={onTimeUpdate as any}
                onEnded={(() => {
                  if (isSelf && !completedFiredRef.current) {
                    completedFiredRef.current = true;
                    reportCompletion("record_video_progress", {
                      p_content_item_id: contentItem.id,
                      p_watch_pct: 100,
                      p_last_position_seconds: 0,
                    });
                  }
                }) as any}
              />
            </div>
          )
        ) : data?.kind === "supabase_storage" && data?.signed_url ? (
          <div className="mx-auto flex w-full max-w-4xl justify-center rounded-md bg-black">
            <video
              controls
              className="rounded-md"
              style={{ maxHeight: "70vh", maxWidth: "100%", objectFit: "contain" }}
              src={data.signed_url}
              onTimeUpdate={onTimeUpdate as any}
            />
          </div>
        ) : (
          <div className="rounded-md border border-destructive/30 bg-card p-6 text-sm text-destructive">
            Could not load video.
          </div>
        )
      ) : embedUrl ? (
        <div className="mx-auto w-full max-w-4xl">
          <div
            className="mx-auto overflow-hidden rounded-md bg-muted"
            style={{
              maxHeight: "70vh",
              aspectRatio: "16 / 9",
              maxWidth: "min(100%, calc(70vh * 16 / 9))",
            }}
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
      ) : (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No video source configured.
        </div>
      )}

      {/* Embed-source completion button (self only, embeds only, not yet completed).
          Storage and Mux report progress automatically via onTimeUpdate. */}
      {isSelf &&
        sourceType !== "supabase_storage" &&
        sourceType !== "mux" &&
        embedUrl &&
        !isCompleted && (
          <div className="flex justify-end">
            <Button
              onClick={markAsWatched}
              disabled={isReporting}
              className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
            >
              {isReporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Mark as watched
            </Button>
          </div>
        )}

      {isCompleted && (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--bw-forest)" }}>
          <CircleCheck className="h-4 w-4" /> Completed
        </div>
      )}

      {isCompleted &&
        typeof contentItem.video_ai_summary === "string" &&
        contentItem.video_ai_summary.trim().length > 0 && (
          <SummaryCard summary={contentItem.video_ai_summary} />
        )}
    </div>
  );
}
