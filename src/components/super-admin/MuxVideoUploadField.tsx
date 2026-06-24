import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as UpChunk from "@mux/upchunk";
import { Loader2, AlertCircle, RotateCw, CheckCircle2, Video, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { HeygenGeneratePanel } from "./HeygenGeneratePanel";

const MAX_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
const ACCEPT = ".mp4,.webm,.mov";
const ALLOWED_MIME = ["video/mp4", "video/webm", "video/quicktime"];

interface Props {
  contentItemId?: string;
  resourceId?: string;
  initialMuxStatus: string | null;
  initialPlaybackId: string | null;
  disabled?: boolean;
  hideAiMode?: boolean;
}

type State =
  | { kind: "idle" }
  | { kind: "uploading"; filename: string; progress: number }
  | { kind: "processing" }
  | { kind: "ready" }
  | { kind: "error"; message: string };

type Mode = "upload" | "ai";

function deriveInitial(status: string | null, playbackId: string | null): State {
  if (status === "ready" && playbackId) return { kind: "ready" };
  if (status === "preparing") return { kind: "processing" };
  if (status === "errored")
    return { kind: "error", message: "Mux reported an encoding error. Re-upload to try again." };
  return { kind: "idle" };
}

export function MuxVideoUploadField({
  contentItemId,
  resourceId,
  initialMuxStatus,
  initialPlaybackId,
  disabled,
  hideAiMode,
}: Props) {
  const [state, setState] = useState<State>(() => deriveInitial(initialMuxStatus, initialPlaybackId));
  const [mode, setMode] = useState<Mode>("upload");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const targetTable = resourceId ? "resources" : "content_items";
  const targetId = (resourceId ?? contentItemId) as string;
  const aiAvailable = !hideAiMode && !!contentItemId;

  const statusQuery = useQuery({
    queryKey: ["mux-upload-status", targetTable, targetId],
    enabled: state.kind === "processing",
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(targetTable)
        .select("mux_status, video_source_id")
        .eq("id", targetId)
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
      body: resourceId ? { resource_id: resourceId } : { content_item_id: contentItemId },
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

      {aiAvailable && (
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
      )}

      {hideAiMode || mode === "upload" ? (
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
        <HeygenGeneratePanel
          generateTarget={{ kind: "standalone" }}
          resolveContentItemId={async () => contentItemId}
          initialContentItemId={contentItemId}
          initialMuxStatus={initialMuxStatus}
          onReady={() => setState({ kind: "ready" })}
          disabled={disabled}
        />
      )}
    </div>
  );
}

export default MuxVideoUploadField;
