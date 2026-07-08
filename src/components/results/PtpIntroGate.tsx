import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MuxPlayer from "@mux/mux-player-react";
import { Loader2, CircleCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { resolveTierThumbnailUrls } from "@/lib/assetUrls";

interface GateVideo {
  gate_video_id: string;
  resource_id: string;
  position: number;
  card_title: string;
  card_body: string;
  runtime_label: string;
  title: string;
  summary: string | null;
  thumbnail_asset_id: string | null;
  duration_seconds: number;
  my_status: "not_started" | "in_progress" | "watched" | "skipped";
  my_max_percent: number;
}

interface GateStatus {
  should_show: boolean;
  has_ptp: boolean;
  already_resolved: boolean;
  active_video_count: number;
  videos: GateVideo[];
}

async function upsertProgress(args: {
  p_gate_video_id: string;
  p_max_percent: number;
  p_last_position: number;
  p_event: "heartbeat" | "play" | "ended" | "skip";
  p_watched_seconds_delta?: number;
  p_duration?: number;
}) {
  await supabase.rpc("ptp_intro_video_progress_upsert" as never, args as never);
}

function VideoStep({
  video,
  thumbUrl,
  isLast,
  onDone,
}: {
  video: GateVideo;
  thumbUrl: string | undefined;
  isLast: boolean;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<"card" | "playing" | "done">("card");
  const [doneReason, setDoneReason] = useState<"watched" | "skipped" | null>(null);

  const playbackQuery = useQuery({
    queryKey: ["ptp-intro-video-playback", video.resource_id],
    enabled: phase === "playing",
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-resource-video-url", {
        body: { p_resource_id: video.resource_id },
      });
      if (error) throw new Error(error.message || "Video not available.");
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as {
        kind: "mux";
        processing?: boolean;
        mux_status?: string;
        playback_id?: string;
        token?: string;
      };
    },
    refetchInterval: (q) =>
      (q.state.data as any)?.processing ? 8000 : false,
  });

  const lastReportedPosRef = useRef(0);
  const lastHeartbeatRef = useRef(0);
  const completedFiredRef = useRef(false);
  const playFiredRef = useRef(false);
  const currentPctRef = useRef(0);
  const currentPosRef = useRef(0);

  const finishWatched = async () => {
    if (completedFiredRef.current) return;
    completedFiredRef.current = true;
    await upsertProgress({
      p_gate_video_id: video.gate_video_id,
      p_event: "ended",
      p_max_percent: 100,
      p_last_position: currentPosRef.current,
    });
    setDoneReason("watched");
    setPhase("done");
  };

  const handleSkip = async () => {
    await upsertProgress({
      p_gate_video_id: video.gate_video_id,
      p_event: "skip",
      p_max_percent: currentPctRef.current || 0,
      p_last_position: currentPosRef.current || 0,
    });
    setDoneReason("skipped");
    setPhase("done");
  };

  const handleTimeUpdate = async (e: any) => {
    const el = e?.currentTarget;
    const duration = el?.duration;
    const currentTime = el?.currentTime;
    if (!duration || !isFinite(duration) || currentTime == null) return;
    const pct = Math.floor((currentTime / duration) * 100);
    const pos = Math.floor(currentTime);
    currentPctRef.current = pct;
    currentPosRef.current = pos;

    if (!completedFiredRef.current && pct >= 95) {
      await finishWatched();
      return;
    }

    const now = Date.now();
    if (now - lastHeartbeatRef.current >= 15000) {
      const delta = Math.max(0, pos - lastReportedPosRef.current);
      lastHeartbeatRef.current = now;
      lastReportedPosRef.current = pos;
      await upsertProgress({
        p_gate_video_id: video.gate_video_id,
        p_event: "heartbeat",
        p_max_percent: pct,
        p_last_position: pos,
        p_watched_seconds_delta: delta,
        p_duration: Math.floor(duration),
      });
    }
  };

  const handlePlay = async (e: any) => {
    if (playFiredRef.current) return;
    playFiredRef.current = true;
    const duration = e?.currentTarget?.duration;
    await upsertProgress({
      p_gate_video_id: video.gate_video_id,
      p_event: "play",
      p_max_percent: 0,
      p_last_position: 0,
      p_duration: duration && isFinite(duration) ? Math.floor(duration) : undefined,
    });
  };

  const nextLabel = isLast ? "Go to your report" : "Next video";

  if (phase === "done") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--bw-forest)" }}>
          <CircleCheck className="h-4 w-4" />
          {doneReason === "watched" ? "Video complete" : "Skipped"}
        </div>
        <div className="flex justify-end">
          <Button
            onClick={onDone}
            className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
          >
            {nextLabel}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "playing") {
    const data = playbackQuery.data;
    return (
      <div className="space-y-4">
        {playbackQuery.isLoading ? (
          <div className="aspect-video w-full flex items-center justify-center rounded-md bg-muted">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : playbackQuery.isError ? (
          <div className="rounded-md border border-destructive/30 bg-card p-6 text-sm text-destructive space-y-3">
            <div>
              Could not load video:{" "}
              {playbackQuery.error instanceof Error ? playbackQuery.error.message : "Unknown error"}
            </div>
            <Button variant="outline" size="sm" onClick={() => playbackQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : data?.processing || !data?.playback_id || !data?.token ? (
          <div className="aspect-video w-full flex flex-col items-center justify-center gap-2 rounded-md bg-muted text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>This video is still processing. It will appear here shortly.</span>
          </div>
        ) : (
          <div className="mx-auto flex w-full justify-center rounded-md bg-black overflow-hidden">
            <MuxPlayer
              playbackId={data.playback_id}
              tokens={{ playback: data.token }}
              streamType="on-demand"
              autoPlay
              metadata={{ video_title: video.title }}
              style={{ maxHeight: "60vh", aspectRatio: "16 / 9", width: "100%" }}
              onPlay={handlePlay as any}
              onTimeUpdate={handleTimeUpdate as any}
              onEnded={finishWatched as any}
            />
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleSkip}>
            Skip
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="w-full aspect-video rounded-md overflow-hidden bg-gradient-to-br from-muted to-muted/60">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{video.card_title}</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-line">{video.card_body}</p>
        <p className="text-xs text-muted-foreground">{video.runtime_label}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleSkip}>
          Skip
        </Button>
        <Button
          onClick={() => setPhase("playing")}
          className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
        >
          Play
        </Button>
      </div>
    </div>
  );
}

export default function PtpIntroGate() {
  const statusQuery = useQuery({
    queryKey: ["ptp-intro-gate-status"],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ptp_intro_gate_status" as never);
      if (error) throw error;
      return data as unknown as GateStatus;
    },
  });

  const status = statusQuery.data;
  const videos = useMemo(() => status?.videos ?? [], [status]);

  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const initedRef = useRef(false);

  useEffect(() => {
    if (initedRef.current) return;
    if (!status) return;
    initedRef.current = true;
    if (!status.should_show || videos.length === 0) return;
    const firstUnfinished = videos.findIndex(
      (v) => v.my_status === "not_started" || v.my_status === "in_progress",
    );
    setIdx(firstUnfinished === -1 ? videos.length - 1 : firstUnfinished);
    setOpen(true);
  }, [status, videos]);

  const resourceIds = useMemo(() => videos.map((v) => v.resource_id), [videos]);
  const thumbsQuery = useQuery({
    queryKey: ["ptp-intro-gate-thumbs", resourceIds],
    enabled: resourceIds.length > 0,
    staleTime: 60 * 60 * 1000,
    queryFn: () => resolveTierThumbnailUrls("resource", resourceIds),
  });

  const advance = async () => {
    if (idx >= videos.length - 1) {
      const { data } = await supabase.rpc("ptp_intro_gate_resolve" as never);
      if ((data as any)?.resolved) {
        setOpen(false);
      }
      return;
    }
    setIdx((i) => i + 1);
  };

  if (!status?.should_show || videos.length === 0) return null;

  const current = videos[Math.min(idx, videos.length - 1)];
  const isLast = idx >= videos.length - 1;
  const thumbUrl = thumbsQuery.data?.get(current.resource_id);

  return (
    <Dialog open={open} onOpenChange={() => { /* non-dismissable */ }}>
      <DialogContent
        className="max-w-2xl [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{current.card_title}</DialogTitle>
          <DialogDescription className="sr-only">
            Introductory video {idx + 1} of {videos.length}
          </DialogDescription>
        </DialogHeader>
        <VideoStep
          key={current.gate_video_id}
          video={current}
          thumbUrl={thumbUrl}
          isLast={isLast}
          onDone={advance}
        />
        <div className="flex justify-center gap-1 pt-2">
          {videos.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full ${
                i < idx ? "bg-[var(--bw-forest)]" : i === idx ? "bg-[var(--bw-orange)]" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
