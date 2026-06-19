import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as UpChunk from "@mux/upchunk";
import { Loader2, AlertCircle, RotateCw, CheckCircle2, Video, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
const ACCEPT = ".mp4,.webm,.mov";
const ALLOWED_MIME = ["video/mp4", "video/webm", "video/quicktime"];
const SCRIPT_MAX = 4900;

interface Props {
  contentItemId: string;
  initialMuxStatus: string | null;
  initialPlaybackId: string | null;
  disabled?: boolean;
}

type State =
  | { kind: "idle" }
  | { kind: "uploading"; filename: string; progress: number }
  | { kind: "generating"; generationId: string }
  | { kind: "processing" }
  | { kind: "ready" }
  | { kind: "error"; message: string };

type Mode = "upload" | "ai";

interface HeygenAvatar {
  avatar_id: string;
  name: string;
  gender?: string | null;
  preview_image_url?: string | null;
  preview_video_url?: string | null;
}
interface HeygenVoice {
  voice_id: string;
  name: string;
  language?: string | null;
  gender?: string | null;
  preview_audio_url?: string | null;
}

function deriveInitial(status: string | null, playbackId: string | null): State {
  if (status === "ready" && playbackId) return { kind: "ready" };
  if (status === "preparing") return { kind: "processing" };
  if (status === "errored")
    return { kind: "error", message: "Mux reported an encoding error. Re-upload to try again." };
  return { kind: "idle" };
}

export function MuxVideoUploadField({
  contentItemId,
  initialMuxStatus,
  initialPlaybackId,
  disabled,
}: Props) {
  const [state, setState] = useState<State>(() => deriveInitial(initialMuxStatus, initialPlaybackId));
  const [mode, setMode] = useState<Mode>("upload");
  const [script, setScript] = useState("");
  const [avatarId, setAvatarId] = useState<string>("");
  const [voiceId, setVoiceId] = useState<string>("");
  const [genError, setGenError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const statusQuery = useQuery({
    queryKey: ["mux-upload-status", contentItemId],
    enabled: state.kind === "processing",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items")
        .select("mux_status, video_source_id")
        .eq("id", contentItemId)
        .single();
      if (error) throw error;
      return data as { mux_status: string | null; video_source_id: string | null };
    },
    refetchInterval: (q) => {
      const s = (q.state.data as any)?.mux_status;
      return s === "ready" || s === "errored" ? false : 5000;
    },
  });

  useEffect(() => {
    if (state.kind !== "processing" || !statusQuery.data) return;
    if (statusQuery.data.mux_status === "ready" && statusQuery.data.video_source_id) {
      setState({ kind: "ready" });
    } else if (statusQuery.data.mux_status === "errored") {
      setState({
        kind: "error",
        message: "Mux reported an encoding error. Re-upload to try again.",
      });
    }
  }, [statusQuery.data, state.kind]);

  const catalogQuery = useQuery({
    queryKey: ["heygen-catalog"],
    enabled: mode === "ai" && (state.kind === "idle" || state.kind === "error"),
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("lesson-heygen-catalog");
      if (error) throw error;
      return data as { avatars: HeygenAvatar[]; voices: HeygenVoice[] };
    },
  });

  const genId = state.kind === "generating" ? state.generationId : null;
  const generationQuery = useQuery({
    queryKey: ["lesson-video-generation", genId],
    enabled: !!genId,
    refetchInterval: genId ? 5000 : false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_video_generations")
        .select("status, error_reason")
        .eq("id", genId!)
        .single();
      if (error) throw error;
      return data as { status: string; error_reason: string | null };
    },
  });

  useEffect(() => {
    if (state.kind !== "generating" || !generationQuery.data) return;
    const { status, error_reason } = generationQuery.data;
    if (status === "ingesting") setState({ kind: "processing" });
    else if (status === "ready") setState({ kind: "ready" });
    else if (status === "rejected" || status === "failed") {
      setState({ kind: "error", message: error_reason || "Video generation failed." });
    }
  }, [generationQuery.data, state.kind]);

  const startUpload = async (file: File) => {
    if (file.size > MAX_BYTES) {
      setState({ kind: "error", message: "File too large: exceeds the 5 GB ceiling." });
      return;
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      setState({
        kind: "error",
        message: `File type not allowed: ${file.type || "(unknown)"}. Allowed: MP4, WebM, MOV.`,
      });
      return;
    }
    setState({ kind: "uploading", filename: file.name, progress: 0 });

    const { data, error } = await supabase.functions.invoke("mux-create-upload", {
      body: { content_item_id: contentItemId },
    });
    if (error || !(data as any)?.upload_url) {
      setState({
        kind: "error",
        message: error?.message || (data as any)?.error || "Could not start the Mux upload.",
      });
      return;
    }

    try {
      const upload = UpChunk.createUpload({ endpoint: (data as any).upload_url, file });
      upload.on("progress", (e: any) => {
        setState((s) => (s.kind === "uploading" ? { ...s, progress: Math.round(e.detail) } : s));
      });
      upload.on("error", (e: any) => {
        setState({
          kind: "error",
          message: `Upload failed: ${e?.detail?.message ?? "unknown error"}`,
        });
      });
      upload.on("success", () => {
        setState({ kind: "processing" });
      });
    } catch (e: any) {
      setState({ kind: "error", message: `Upload failed: ${String(e?.message ?? e)}` });
    }
  };

  const handleFile = (file: File | null | undefined) => {
    if (file) startUpload(file);
  };

  const handleGenerate = async () => {
    setGenError(null);
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("lesson-heygen-generate", {
        body: {
          content_item_id: contentItemId,
          script,
          avatar_id: avatarId,
          voice_id: voiceId,
          target_kind: "standalone",
        },
      });
      if (error) {
        setGenError(error.message || "Could not start AI video generation.");
        return;
      }
      const generationId = (data as any)?.generation_id;
      if (!generationId) {
        setGenError((data as any)?.error || "Could not start AI video generation.");
        return;
      }
      setState({ kind: "generating", generationId });
    } catch (e: any) {
      setGenError(String(e?.message ?? e));
    } finally {
      setSubmitting(false);
    }
  };

  if (state.kind === "uploading") {
    return (
      <div className="space-y-3 rounded-md border p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">{state.filename}</p>
            <p className="text-xs text-muted-foreground">
              Uploading to Mux… {state.progress}%
            </p>
          </div>
        </div>
        <Progress value={state.progress} />
      </div>
    );
  }

  if (state.kind === "generating") {
    return (
      <div className="flex items-start gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        <Loader2 className="mt-0.5 h-4 w-4 animate-spin" />
        <span>Generating your video with AI. This can take a few minutes.</span>
      </div>
    );
  }

  if (state.kind === "processing") {
    return (
      <div className="flex items-start gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        <Loader2 className="mt-0.5 h-4 w-4 animate-spin" />
        <span>
          Processing on Mux. This can take a few minutes. You can leave this page and come back; it
          will keep encoding.
        </span>
      </div>
    );
  }

  if (state.kind === "ready") {
    return (
      <div className="space-y-2 rounded-md border p-4">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span>Video is ready and streaming via Mux.</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <RotateCw className="mr-2 h-4 w-4" />
          Replace video
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  // idle or error
  return (
    <div className="space-y-3">
      {state.kind === "error" && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      <div className="inline-flex rounded-md border p-0.5">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded",
            mode === "upload" ? "bg-accent text-foreground" : "text-muted-foreground",
          )}
        >
          Upload a file
        </button>
        <button
          type="button"
          onClick={() => setMode("ai")}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded inline-flex items-center gap-1",
            mode === "ai" ? "bg-accent text-foreground" : "text-muted-foreground",
          )}
        >
          <Sparkles className="h-3 w-3" />
          Generate with AI
        </button>
      </div>

      {mode === "upload" ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-center",
            disabled
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring",
          )}
          onClick={() => !disabled && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (!disabled && (e.key === "Enter" || e.key === " ")) fileInputRef.current?.click();
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!disabled) handleFile(e.dataTransfer.files?.[0]);
          }}
          role="button"
          tabIndex={0}
        >
          <Video className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">Drop a video here, or click to browse</p>
          <p className="text-xs text-muted-foreground">
            MP4, WebM, MOV up to 5 GB. Streams adaptively via Mux.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <div className="space-y-3 rounded-md border p-4">
          {catalogQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading HeyGen avatars and voices…
            </div>
          ) : catalogQuery.isError ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">Could not load HeyGen avatars/voices</p>
              <Button type="button" variant="outline" size="sm" onClick={() => catalogQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium">Script</label>
                <Textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value.slice(0, SCRIPT_MAX))}
                  rows={5}
                  placeholder="Write the script the avatar will speak…"
                  disabled={disabled || submitting}
                />
                <div className="text-right text-xs text-muted-foreground">
                  {script.length} / {SCRIPT_MAX}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Avatar</label>
                  <Select value={avatarId} onValueChange={setAvatarId} disabled={disabled || submitting}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an avatar" />
                    </SelectTrigger>
                    <SelectContent>
                      {(catalogQuery.data?.avatars ?? []).map((a) => (
                        <SelectItem key={a.avatar_id} value={a.avatar_id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {avatarId && (() => {
                    const a = catalogQuery.data?.avatars.find((x) => x.avatar_id === avatarId);
                    if (!a) return null;
                    return (
                      <div className="space-y-2">
                        {a.preview_image_url && (
                          <img
                            src={a.preview_image_url}
                            alt={a.name}
                            className="mt-2 rounded-md"
                            style={{ maxHeight: 120 }}
                          />
                        )}
                        {a.preview_video_url && (
                          <video
                            src={a.preview_video_url}
                            controls
                            muted
                            playsInline
                            className="mt-2 w-full max-w-xs rounded-md bg-black"
                            preload="metadata"
                          />
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Voice</label>
                  <Select value={voiceId} onValueChange={setVoiceId} disabled={disabled || submitting}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {(catalogQuery.data?.voices ?? []).map((v) => {
                        const extras = [v.language, v.gender].filter(Boolean).join(" · ");
                        return (
                          <SelectItem key={v.voice_id} value={v.voice_id}>
                            {v.name}
                            {extras ? ` (${extras})` : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {voiceId && (() => {
                    const v = catalogQuery.data?.voices.find((x) => x.voice_id === voiceId);
                    if (!v?.preview_audio_url) return null;
                    return (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground">Voice sample</p>
                        <audio
                          src={v.preview_audio_url}
                          controls
                          preload="none"
                          className="mt-2 w-full"
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>


              {genError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-2 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{genError}</span>
                </div>
              )}

              <Button
                type="button"
                onClick={handleGenerate}
                disabled={
                  disabled ||
                  submitting ||
                  script.trim().length === 0 ||
                  !avatarId ||
                  !voiceId
                }
                style={{ backgroundColor: "var(--bw-orange)", color: "#fff" }}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate video
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default MuxVideoUploadField;
