// The 360 answering component. One component, two callers: the subject
// answering their own version, and an invited rater answering theirs.
// The only input is a submission id.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Check, RotateCcw } from "lucide-react";
import * as UpChunk from "@mux/upchunk";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  MediaRecorderPane,
  DictateButton,
} from "@/components/coaching/MultimodalField";
import { CoachingRecordingPlayer } from "@/components/coaching/CoachingViews";

export interface ThreeSixtyQuestion {
  question_key: string;
  ordinal: number;
  section: string;
  focus: string | null;
  answer_type: "text" | "scale" | string;
  scale_min: number | null;
  scale_max: number | null;
  scale_min_label: string | null;
  scale_max_label: string | null;
  ai_followup: boolean;
  prompt: string;
}

type Answer =
  | { mode: "text" | "dictate"; text: string }
  | { mode: "audio" | "video"; media_id?: string }
  | { value: number };

type FieldMode = "text" | "dictate" | "audio" | "video";

// Section keys are instrument copy. Humanize the key, never invent a heading.
function sectionHeading(section: string) {
  const s = section.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function saveAnswer(
  submissionId: string,
  questionKey: string,
  answer: Answer,
): Promise<{ ok: boolean; response_id?: string; error?: string }> {
  const { data, error } = await supabase.rpc("bw_360_save_answer", {
    p_submission: submissionId,
    p_question_key: questionKey,
    p_answer: answer as never,
    // The AI follow-up is not implemented. The column is waiting.
    p_followup: null,
  });
  if (error) return { ok: false, error: error.message };
  return (data || { ok: false }) as { ok: boolean; response_id?: string; error?: string };
}

// Media hangs off three_sixty_response_id, so the response row must exist
// first: save, take response_id, upload against it, save again with media_id.
async function uploadFor(responseId: string, questionKey: string, kind: "audio" | "video", blob: Blob) {
  const { data, error } = await supabase.functions.invoke("coaching-response-upload", {
    body: { three_sixty_response_id: responseId, question_key: questionKey, kind },
  });
  if (error) throw new Error(error.message);
  const { upload_url, media_id } = (data || {}) as { upload_url?: string; media_id?: string };
  if (!upload_url || !media_id) throw new Error("Upload broker returned no URL");
  const file =
    blob instanceof File
      ? blob
      : new File([blob], `answer-${Date.now()}.webm`, {
          type: blob.type || (kind === "audio" ? "audio/webm" : "video/webm"),
        });
  await new Promise<void>((resolve, reject) => {
    const upload = UpChunk.createUpload({ endpoint: upload_url, file });
    upload.on("error", (err: any) => reject(new Error(err?.detail?.message || "Upload failed")));
    upload.on("success", () => resolve());
  });
  return media_id;
}

function ScaleAnswer({
  q,
  value,
  disabled,
  onPick,
}: {
  q: ThreeSixtyQuestion;
  value: number | null;
  disabled?: boolean;
  onPick: (n: number) => void;
}) {
  const min = q.scale_min ?? 1;
  const max = q.scale_max ?? 10;
  const points = [];
  for (let i = min; i <= max; i++) points.push(i);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {points.map((n) => (
          <Button
            key={n}
            type="button"
            size="sm"
            disabled={disabled}
            variant={value === n ? "default" : "outline"}
            onClick={() => onPick(n)}
            aria-pressed={value === n}
          >
            {n}
          </Button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{q.scale_min_label || ""}</span>
        <span>{q.scale_max_label || ""}</span>
      </div>
    </div>
  );
}

function TextAnswer({
  q,
  submissionId,
  value,
  disabled,
  onSaved,
}: {
  q: ThreeSixtyQuestion;
  submissionId: string;
  value: Answer | undefined;
  disabled?: boolean;
  onSaved: (a: Answer) => void;
}) {
  const rec = value && "mode" in value && (value.mode === "audio" || value.mode === "video") ? value : null;
  const [mode, setMode] = useState<FieldMode>(rec ? rec.mode : "text");
  const [text, setText] = useState(
    value && "mode" in value && (value.mode === "text" || value.mode === "dictate") ? value.text : "",
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rerecording, setRerecording] = useState(false);
  const timer = useRef<number | null>(null);

  const pushText = (next: string, nextMode: FieldMode) => {
    setText(next);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      if (!next.trim()) return;
      const a: Answer = { mode: nextMode === "dictate" ? "dictate" : "text", text: next };
      const res = await saveAnswer(submissionId, q.question_key, a);
      if (!res.ok) setError(res.error === "already_submitted" ? "Your answers are final." : "Could not save.");
      else {
        setError(null);
        onSaved(a);
      }
    }, 800);
  };

  const confirmRecording = async (blob: Blob, kind: "audio" | "video") => {
    setUploading(true);
    setError(null);
    try {
      // 1. Save the answer so the response row exists.
      const first = await saveAnswer(submissionId, q.question_key, { mode: kind });
      if (!first.ok || !first.response_id) {
        throw new Error(first.error === "already_submitted" ? "Your answers are final." : "Could not save.");
      }
      // 2. Upload the media against that response id.
      const mediaId = await uploadFor(first.response_id, q.question_key, kind, blob);
      // 3. Save again, now carrying the media id.
      const a: Answer = { mode: kind, media_id: mediaId };
      const second = await saveAnswer(submissionId, q.question_key, a);
      if (!second.ok) throw new Error("Could not attach the recording.");
      onSaved(a);
      setRerecording(false);
    } catch (e: any) {
      setError(e?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {(["text", "dictate", "audio", "video"] as FieldMode[]).map((m) => (
          <Button
            key={m}
            type="button"
            size="sm"
            disabled={disabled}
            variant={mode === m ? "default" : "outline"}
            onClick={() => {
              setMode(m);
              setRerecording(false);
            }}
          >
            {m === "text" ? "Type" : m === "dictate" ? "Dictate" : m === "audio" ? "Record audio" : "Record video"}
          </Button>
        ))}
      </div>

      {(mode === "text" || mode === "dictate") && (
        <div className="space-y-2">
          <Textarea
            rows={4}
            value={text}
            disabled={disabled}
            placeholder="Type here…"
            onChange={(e) => pushText(e.target.value, mode)}
          />
          {mode === "dictate" && (
            <DictateButton
              disabled={disabled}
              onFinal={(t) => pushText((text ? text + " " : "") + t, "dictate")}
            />
          )}
        </div>
      )}

      {(mode === "audio" || mode === "video") &&
        (rec && rec.mode === mode && rec.media_id && !rerecording ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span className="flex-1">Recording saved</span>
              {!disabled && (
                <Button type="button" size="sm" variant="outline" onClick={() => setRerecording(true)}>
                  <RotateCcw className="h-4 w-4" />
                  Re-record
                </Button>
              )}
            </div>
            <div className="rounded-md border bg-background p-2">
              <CoachingRecordingPlayer mediaId={rec.media_id} />
            </div>
          </div>
        ) : (
          <MediaRecorderPane
            kind={mode}
            uploading={uploading}
            disabled={disabled}
            onConfirm={(blob) => confirmRecording(blob, mode)}
          />
        ))}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function AnswerFlow({
  submissionId,
  onSubmitted,
}: {
  submissionId: string;
  onSubmitted?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<ThreeSixtyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("bw_360_question_set", { p_submission: submissionId });
      if (cancelled) return;
      if (error) setLoadError("These questions could not be opened.");
      else setQuestions(((data || []) as any[]).sort((a, b) => a.ordinal - b.ordinal) as ThreeSixtyQuestion[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  const grouped = useMemo(() => {
    const out: { section: string; items: ThreeSixtyQuestion[] }[] = [];
    for (const q of questions) {
      const last = out[out.length - 1];
      if (last && last.section === q.section) last.items.push(q);
      else out.push({ section: q.section, items: [q] });
    }
    return out;
  }, [questions]);

  const setAnswer = useCallback((key: string, a: Answer) => {
    setAnswers((prev) => ({ ...prev, [key]: a }));
  }, []);

  const submit = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.rpc("bw_360_submit", { p_submission: submissionId });
    setSubmitting(false);
    if (error) {
      toast.error("That could not be submitted.");
      return;
    }
    const res = (data || {}) as { ok?: boolean; error?: string };
    if (!res.ok) {
      toast.error(
        res.error === "nothing_answered"
          ? "Answer at least one question before you submit."
          : "That could not be submitted.",
      );
      return;
    }
    setSubmitted(true);
    onSubmitted?.();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the questions…
      </div>
    );
  }
  if (loadError) return <p className="text-sm text-muted-foreground">{loadError}</p>;

  if (submitted) {
    return (
      <Card className="p-6 text-center space-y-2">
        <Check className="mx-auto h-6 w-6 text-primary" />
        <p className="font-medium">Thank you. Your answers have been submitted.</p>
        <p className="text-sm text-muted-foreground">
          Nobody sees your answers with your name attached.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map((g) => (
        <div key={g.section} className="space-y-4">
          <h3 className="text-base font-semibold">{sectionHeading(g.section)}</h3>
          {g.items.map((q) => (
            <Card key={q.question_key} className="space-y-3 p-4">
              {/* Approved instrument copy. Rendered as it arrives. */}
              <p className="text-sm font-medium whitespace-pre-wrap">{q.prompt}</p>
              {q.answer_type === "scale" ? (
                <ScaleAnswer
                  q={q}
                  value={
                    answers[q.question_key] && "value" in (answers[q.question_key] as any)
                      ? (answers[q.question_key] as { value: number }).value
                      : null
                  }
                  onPick={async (n) => {
                    setAnswer(q.question_key, { value: n });
                    const res = await saveAnswer(submissionId, q.question_key, { value: n });
                    if (!res.ok) toast.error(res.error === "already_submitted" ? "Your answers are final." : "Could not save.");
                  }}
                />
              ) : (
                <TextAnswer
                  q={q}
                  submissionId={submissionId}
                  value={answers[q.question_key]}
                  onSaved={(a) => setAnswer(q.question_key, a)}
                />
              )}
              {/* Space is left for the AI follow-up. It is not built. */}
            </Card>
          ))}
        </div>
      ))}

      <div className="space-y-2 rounded-md border bg-muted/30 p-4">
        <p className="text-sm">
          Once you submit, your answers are final and cannot be changed.
        </p>
        <Button type="button" onClick={submit} disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Submit my answers
        </Button>
      </div>
    </div>
  );
}

export default AnswerFlow;
