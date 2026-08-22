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

// Only `answer` is ever sent back. The prompt is written server side.
interface Followup {
  prompt?: string;
  answer?: string;
}

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
  followup?: { answer: string } | null,
): Promise<{ ok: boolean; response_id?: string; error?: string; note?: string }> {
  const { data, error } = await supabase.rpc("bw_360_save_answer", {
    p_submission: submissionId,
    p_question_key: questionKey,
    p_answer: answer as never,
    // Never send a prompt: that column is written once by the edge function.
    p_followup: (followup ?? null) as never,
  });
  if (error) return { ok: false, error: error.message };
  const res = (data || { ok: false }) as {
    ok: boolean;
    response_id?: string;
    error?: string;
    note?: string;
  };
  if (res.note) console.warn("[360] save_answer note", questionKey, res.note);
  return res;
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
  followup,
  disabled,
  onSaved,
  onFollowup,
  registerFlush,
}: {
  q: ThreeSixtyQuestion;
  submissionId: string;
  value: Answer | undefined;
  followup: Followup | null;
  disabled?: boolean;
  onSaved: (a: Answer) => void;
  onFollowup: (f: Followup) => void;
  registerFlush?: Map<string, () => Promise<void>>;
}) {
  const rec = value && "mode" in value && (value.mode === "audio" || value.mode === "video") ? value : null;
  const [mode, setMode] = useState<FieldMode>(rec ? rec.mode : "text");
  const [text, setText] = useState(
    value && "mode" in value && (value.mode === "text" || value.mode === "dictate") ? value.text : "",
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rerecording, setRerecording] = useState(false);
  const [probing, setProbing] = useState(false);
  const [fuText, setFuText] = useState(followup?.answer || "");
  const timer = useRef<number | null>(null);
  const fuTimer = useRef<number | null>(null);
  const pending = useRef<Answer | null>(null);
  const fuPending = useRef<string | null>(null);
  const probeInFlight = useRef(false);
  const probeDebounce = useRef<number | null>(null);
  const retryTimer = useRef<number | null>(null);
  const alive = useRef(true);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const textRef = useRef(text);
  textRef.current = text;
  const latestAnswer = useRef<Answer | undefined>(value);
  latestAnswer.current = value;


  // One probe per question, only after the answer is stored, never for a
  // question that already carries a follow-up. A recorded answer usually
  // returns transcript_pending on the first call, so we retry exactly once.
  const maybeProbe = useCallback(
    async (attempt = 0) => {
      if (!q.ai_followup || followup?.prompt) return;
      if (attempt === 0 && probeInFlight.current) return;
      probeInFlight.current = true;
      setProbing(true);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("three-sixty-followup", {
          body: { submission_id: submissionId, question_key: q.question_key },
        });
        // Every ok:false, and every transport error, is simply "no follow-up".
        if (fnErr) return;
        const res = (data || {}) as {
          ok?: boolean;
          followup_prompt?: string;
          reason?: string;
          retry_after_ms?: number;
        };
        if (res.ok && res.followup_prompt) {
          onFollowup({ prompt: res.followup_prompt });
          return;
        }
        // Mux has not finished the transcript yet. One retry, then silence.
        if (res.reason === "transcript_pending" && attempt === 0 && alive.current) {
          const wait = typeof res.retry_after_ms === "number" ? res.retry_after_ms : 10000;
          retryTimer.current = window.setTimeout(() => {
            retryTimer.current = null;
            if (alive.current) void maybeProbe(1);
          }, wait);
          // Stay "in flight" across the wait so nothing else starts a probe.
          return;
        }
      } catch {
        /* silence is correct here */
      } finally {
        // Keep the flag and the spinner up while a retry is queued.
        if (!retryTimer.current) {
          probeInFlight.current = false;
          setProbing(false);
        }
      }
    },
    [q.ai_followup, q.question_key, followup?.prompt, submissionId, onFollowup],
  );


  const saveNow = async (a: Answer) => {
    const res = await saveAnswer(submissionId, q.question_key, a);
    if (!res.ok) {
      setError(res.error === "already_submitted" ? "Your answers are final." : "Could not save.");
      return false;
    }
    setError(null);
    onSaved(a);
    return true;
  };

  const pushText = (next: string, nextMode: FieldMode) => {
    setText(next);
    const a: Answer = { mode: nextMode === "dictate" ? "dictate" : "text", text: next };
    pending.current = next.trim() ? a : null;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      timer.current = null;
      if (!pending.current) return;
      const a2 = pending.current;
      pending.current = null;
      await saveNow(a2);
    }, 800);
  };

  // Flush the pending main answer. Used by blur, dictation, unmount, unload.
  const flushMain = async () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (!pending.current) return true;
    const a = pending.current;
    pending.current = null;
    return await saveNow(a);
  };

  // Flush the pending follow-up answer. Same three triggers.
  const flushFollowup = async () => {
    if (fuTimer.current) {
      window.clearTimeout(fuTimer.current);
      fuTimer.current = null;
    }
    const next = fuPending.current;
    fuPending.current = null;
    const main = latestAnswer.current;
    if (next === null || !main) return;
    const res = await saveAnswer(submissionId, q.question_key, main, { answer: next });
    if (!res.ok) setError(res.error === "already_submitted" ? "Your answers are final." : "Could not save.");
  };

  // Save, then probe, serialised: a second caller waits on the first, so three
  // quick dictation bursts cannot each start their own probe.
  const flushAndProbe = () => {
    const run = chain.current
      .catch(() => {})
      .then(async () => {
        const ok = await flushMain();
        if (ok && textRef.current.trim()) await maybeProbe();
      });
    chain.current = run;
    return run;
  };

  const handleBlur = () => void flushAndProbe();

  // Dictation has no blur. Treat the end of a segment as one, debounced by the
  // same 800ms as the save so a burst of segments collapses into one probe.
  const handleDictationEnd = () => {
    if (probeDebounce.current) window.clearTimeout(probeDebounce.current);
    probeDebounce.current = window.setTimeout(() => {
      probeDebounce.current = null;
      void flushAndProbe();
    }, 800);
  };

  const pushFollowup = (next: string) => {
    setFuText(next);
    fuPending.current = next;
    onFollowup({ prompt: followup?.prompt, answer: next });
    if (fuTimer.current) window.clearTimeout(fuTimer.current);
    fuTimer.current = window.setTimeout(() => {
      fuTimer.current = null;
      void flushFollowup();
    }, 800);
  };

  // Blur is handled inline; this covers unmount (which is also what submitting
  // does to this component) and a tab close. Timers are cancelled either way.
  // It also registers this question's flush with the parent, so Submit can
  // await every pending save before it calls bw_360_submit.
  useEffect(() => {
    alive.current = true;
    const onUnload = () => {
      void flushMain();
      void flushFollowup();
    };
    window.addEventListener("beforeunload", onUnload);
    const map = registerFlush;
    map?.set(q.question_key, async () => {
      await flushMain();
      await flushFollowup();
    });
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      map?.delete(q.question_key);
      alive.current = false;
      if (probeDebounce.current) window.clearTimeout(probeDebounce.current);
      if (retryTimer.current) window.clearTimeout(retryTimer.current);
      void flushMain();
      void flushFollowup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



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
      // 4. Only now is there something to probe.
      void maybeProbe();
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
            onBlur={handleBlur}
          />
          {mode === "dictate" && (
            <DictateButton
              disabled={disabled}
              onFinal={(t) => {
                pushText((textRef.current ? textRef.current + " " : "") + t, "dictate");
                handleDictationEnd();
              }}

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

      {/* AI follow-up. One per question, never required, never blocking. */}
      {probing && !followup?.prompt && (
        <div className="flex items-center gap-2 pl-3 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking of a follow-up…
        </div>
      )}
      {followup?.prompt && (
        <div className="ml-1 space-y-2 border-l-2 pl-3">
          <p className="text-sm text-muted-foreground">
            {followup.prompt} <span className="text-xs italic">(Optional)</span>
          </p>
          <Textarea
            rows={3}
            value={fuText}
            disabled={disabled}
            placeholder="Optional"
            onChange={(e) => pushFollowup(e.target.value)}
            onBlur={() => void flushFollowup()}

          />
        </div>
      )}

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
  const [followups, setFollowups] = useState<Record<string, Followup>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Questions and any answers already saved, under the one loading flag.
      const [{ data: qdata, error: qerr }, { data: rdata }] = await Promise.all([
        supabase.rpc("bw_360_question_set", { p_submission: submissionId }),
        supabase
          .from("three_sixty_responses")
          .select("question_key, answer, followup")
          .eq("submission_id", submissionId),
      ]);
      if (cancelled) return;
      if (qerr) {
        setLoadError("These questions could not be opened.");
        setLoading(false);
        return;
      }
      setQuestions(((qdata || []) as any[]).sort((a, b) => a.ordinal - b.ordinal) as ThreeSixtyQuestion[]);
      const seededAnswers: Record<string, Answer> = {};
      const seededFollowups: Record<string, Followup> = {};
      for (const r of (rdata || []) as any[]) {
        if (r.answer) seededAnswers[r.question_key] = r.answer as Answer;
        if (r.followup) seededFollowups[r.question_key] = r.followup as Followup;
      }
      setAnswers(seededAnswers);
      setFollowups(seededFollowups);
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

  const setFollowup = useCallback((key: string, f: Followup) => {
    setFollowups((prev) => ({ ...prev, [key]: { ...prev[key], ...f } }));
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

  // Nothing renders until both reads have resolved, so TextAnswer never
  // mounts before its saved value exists.
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
                  followup={followups[q.question_key] || null}
                  onSaved={(a) => setAnswer(q.question_key, a)}
                  onFollowup={(f) => setFollowup(q.question_key, f)}
                  registerFlush={flushers.current}

                />
              )}
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
