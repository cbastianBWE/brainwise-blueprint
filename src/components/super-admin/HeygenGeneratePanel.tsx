import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SCRIPT_MAX = 4900;

export interface HeygenAvatar {
  avatar_id: string;
  name: string;
  gender?: string | null;
  preview_image_url?: string | null;
  preview_video_url?: string | null;
}
export interface HeygenVoice {
  voice_id: string;
  name: string;
  language?: string | null;
  gender?: string | null;
  preview_audio_url?: string | null;
}

export type HeygenGenerateTarget =
  | { kind: "standalone" }
  | { kind: "lesson_block"; lessonContentItemId: string; blockClientId: string };

type State =
  | { kind: "idle" }
  | { kind: "generating"; generationId: string; contentItemId: string }
  | { kind: "processing"; contentItemId: string }
  | { kind: "ready"; contentItemId: string }
  | { kind: "error"; message: string };

interface Props {
  disabled?: boolean;
  generateTarget: HeygenGenerateTarget;
  resolveContentItemId: () => Promise<string>;
  initialContentItemId?: string | null;
  initialMuxStatus?: string | null;
  onReady?: (contentItemId: string) => void;
  initialScript?: string;
  onScriptChange?: (script: string) => void;
}

function deriveInitial(status: string | null | undefined, cid: string | null | undefined): State {
  if (status === "ready" && cid) return { kind: "ready", contentItemId: cid };
  if (status === "preparing" && cid) return { kind: "processing", contentItemId: cid };
  if (status === "errored")
    return { kind: "error", message: "Mux reported an encoding error." };
  return { kind: "idle" };
}

export function HeygenGeneratePanel({
  disabled,
  generateTarget,
  resolveContentItemId,
  initialContentItemId,
  initialMuxStatus,
  onReady,
  initialScript,
  onScriptChange,
}: Props) {
  const [state, setState] = useState<State>(() =>
    deriveInitial(initialMuxStatus, initialContentItemId),
  );
  const [script, setScript] = useState(initialScript ?? "");
  const [avatarId, setAvatarId] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [genError, setGenError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    setScript(initialScript ?? "");
  }, [initialScript]);

  const catalogQuery = useQuery({
    queryKey: ["heygen-catalog"],
    enabled: state.kind === "idle" || state.kind === "error",
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("lesson-heygen-catalog");
      if (error) throw error;
      return data as { avatars: HeygenAvatar[]; voices: HeygenVoice[] };
    },
  });

  const pollCid =
    state.kind === "processing"
      ? state.contentItemId
      : state.kind === "generating"
        ? state.contentItemId
        : null;

  const statusQuery = useQuery({
    queryKey: ["heygen-panel-mux-status", pollCid],
    enabled: state.kind === "processing" && !!pollCid,
    refetchInterval: (q) => {
      const s = (q.state.data as { mux_status: string | null } | undefined)?.mux_status;
      return s === "ready" || s === "errored" ? false : 5000;
    },
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items")
        .select("mux_status, video_source_id")
        .eq("id", pollCid!)
        .single();
      if (error) throw error;
      return data as { mux_status: string | null; video_source_id: string | null };
    },
  });

  useEffect(() => {
    if (state.kind !== "processing" || !statusQuery.data) return;
    if (statusQuery.data.mux_status === "ready" && statusQuery.data.video_source_id) {
      const cid = state.contentItemId;
      setState({ kind: "ready", contentItemId: cid });
      onReady?.(cid);
    } else if (statusQuery.data.mux_status === "errored") {
      setState({
        kind: "error",
        message: "Mux reported an encoding error. Try again.",
      });
    }
  }, [statusQuery.data, state, onReady]);

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
    if (status === "ingesting") {
      setState({ kind: "processing", contentItemId: state.contentItemId });
    } else if (status === "ready") {
      const cid = state.contentItemId;
      setState({ kind: "ready", contentItemId: cid });
      onReady?.(cid);
    } else if (status === "rejected" || status === "failed") {
      setState({ kind: "error", message: error_reason || "Video generation failed." });
    }
  }, [generationQuery.data, state, onReady]);

  const handleGenerate = async () => {
    setGenError(null);
    setSubmitting(true);
    try {
      const cid = await resolveContentItemId();
      const target =
        generateTarget.kind === "standalone"
          ? { target_kind: "standalone" as const }
          : {
              target_kind: "lesson_block" as const,
              target_lesson_content_item_id: generateTarget.lessonContentItemId,
              target_block_client_id: generateTarget.blockClientId,
            };
      const { data, error } = await supabase.functions.invoke("lesson-heygen-generate", {
        body: {
          content_item_id: cid,
          script,
          avatar_id: avatarId,
          voice_id: voiceId,
          ...target,
        },
      });
      if (error) {
        setGenError(error.message || "Could not start AI video generation.");
        return;
      }
      const generationId = (data as { generation_id?: string } | null)?.generation_id;
      if (!generationId) {
        setGenError(
          (data as { error?: string } | null)?.error || "Could not start AI video generation.",
        );
        return;
      }
      setState({ kind: "generating", generationId, contentItemId: cid });
    } catch (e) {
      setGenError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDraftScript = async () => {
    setDraftError(null);
    setDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke("draft-lesson-block", {
        body: { block_type: "video_embed", author_prompt: draftPrompt },
      });
      if (error) {
        setDraftError(error.message || "Could not draft a script.");
        return;
      }
      const s = (data as { config?: { script?: string } } | null)?.config?.script;
      if (typeof s !== "string" || s.trim().length === 0) {
        setDraftError((data as { error?: string } | null)?.error || "The AI did not return a script. Try rephrasing.");
        return;
      }
      const next = s.slice(0, SCRIPT_MAX);
      setScript(next);
      onScriptChange?.(next);
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : String(e));
    } finally {
      setDrafting(false);
    }
  };

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
        <span>Processing on Mux. This can take a few minutes.</span>
      </div>
    );
  }

  if (state.kind === "ready") {
    return (
      <div className="space-y-3 rounded-md border p-4">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span>Video is ready.</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setState({ kind: "idle" })}
          disabled={disabled}
        >
          Regenerate
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-4">
      {state.kind === "error" && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

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
            <label className="text-xs font-medium">Draft a script with AI (optional)</label>
            <div className="flex gap-2">
              <Input
                value={draftPrompt}
                onChange={(e) => setDraftPrompt(e.target.value)}
                placeholder="What should this video cover?"
                disabled={disabled || submitting || drafting}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleDraftScript}
                disabled={disabled || submitting || drafting || draftPrompt.trim().length === 0}
              >
                {drafting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Draft script
              </Button>
            </div>
            {draftError && <p className="text-xs text-destructive">{draftError}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Script</label>
            <Textarea
              value={script}
              onChange={(e) => {
                const next = e.target.value.slice(0, SCRIPT_MAX);
                setScript(next);
                onScriptChange?.(next);
              }}
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
  );
}

export default HeygenGeneratePanel;
