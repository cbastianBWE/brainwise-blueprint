import { useEffect, useState } from "react";
import { Loader2, ArrowLeft, ArrowRight, Check, Video as VideoIcon, Upload as UploadIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  MediaRecorderPane,
  DictateButton,
  uploadCoachingRecording,
} from "@/components/coaching/MultimodalField";
import { type Step, type QaAnswer } from "../shared";

export function QaMultimodalWidget({
  step,
  sessionId,
  activityCode,
  value,
  onChange,
}: {
  step: Step;
  sessionId: string;
  activityCode: string;
  value: Record<string, QaAnswer>;
  onChange: (next: Record<string, QaAnswer>) => void;
}) {
  const questions = (step.questions as Array<{ key: string; prompt: string }>) || [];
  const modes = (step.modes && step.modes.length > 0 ? step.modes : ["text"]) as Array<
    "text" | "dictate" | "audio" | "video"
  >;
  const allowSkip = !!step.allowSkip;

  const firstUnanswered = Math.max(
    0,
    questions.findIndex((q) => {
      const a = value[q.key];
      return !a || (!a.skipped && !a.text?.trim() && !a.media_id);
    }),
  );
  const [idx, setIdx] = useState<number>(firstUnanswered === -1 ? 0 : firstUnanswered);
  const q = questions[idx];
  const existing = q ? value[q.key] : undefined;

  const [mode, setMode] = useState<"text" | "dictate" | "audio" | "video">(
    (existing?.mode as any) || modes[0],
  );
  const [text, setText] = useState<string>(
    existing?.mode === "text" || existing?.mode === "dictate" ? existing.text || "" : "",
  );
  const [videoSource, setVideoSource] = useState<"record" | "upload">("record");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const a = value[q?.key || ""];
    setMode((a?.mode as any) || modes[0]);
    setText(a?.mode === "text" || a?.mode === "dictate" ? a.text || "" : "");
    setUploadError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (!q) return null;

  const saveTextAnswer = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const next = { ...value, [q.key]: { mode, text: trimmed } as QaAnswer };
    onChange(next);
    if (idx < questions.length - 1) setIdx(idx + 1);
  };

  const skip = () => {
    const next = { ...value, [q.key]: { mode, skipped: true } as QaAnswer };
    onChange(next);
    if (idx < questions.length - 1) setIdx(idx + 1);
  };

  const uploadMedia = async (blob: Blob, kind: "audio" | "video") => {
    setUploading(true);
    setUploadError(null);
    try {
      const { media_id } = await uploadCoachingRecording({
        sessionId,
        activityCode,
        questionKey: q.key,
        kind,
        blob,
      });
      const next = { ...value, [q.key]: { mode: kind, media_id } as QaAnswer };
      onChange(next);
      if (idx < questions.length - 1) setIdx(idx + 1);
    } catch (e: any) {
      setUploadError(e?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };


  const hasAnswerForCurrent =
    (mode === "text" || mode === "dictate") ? text.trim().length > 0 : !!existing?.media_id;

  const answeredCount = questions.filter((qq) => {
    const a = value[qq.key];
    return !!a && (a.skipped || !!a.text?.trim() || !!a.media_id);
  }).length;

  const modeLabels: Record<string, string> = {
    text: "Type",
    dictate: "Dictate",
    audio: "Record audio",
    video: "Record video",
  };

  return (
    <div className="space-y-5">
      {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Question {idx + 1} of {questions.length}
        </span>
        <span className="text-xs text-muted-foreground">{answeredCount} / {questions.length} answered</span>
      </div>

      <div className="flex flex-wrap gap-1 rounded-md border p-1" role="tablist" aria-label="Answer mode">
        {questions.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === idx}
            onClick={() => setIdx(i)}
            className={`h-2 flex-1 min-w-[16px] rounded-sm ${i === idx ? "bg-primary" : value[questions[i].key]?.skipped ? "bg-muted-foreground/40" : value[questions[i].key] ? "bg-primary/40" : "bg-muted"}`}
            aria-label={`Go to question ${i + 1}`}
          />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{q.prompt}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {modes.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {modes.map((m) => {
                if (m === "dictate") {
                  const supported =
                    typeof window !== "undefined" &&
                    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
                  if (!supported) return null;
                }
                return (
                  <Button
                    key={m}
                    type="button"
                    size="sm"
                    variant={mode === m ? "default" : "outline"}
                    onClick={() => setMode(m)}
                  >
                    {modeLabels[m]}
                  </Button>
                );
              })}
            </div>
          )}

          {(mode === "text" || mode === "dictate") && (
            <div className="space-y-2">
              <Textarea
                rows={5}
                placeholder="Type your answer here…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              {mode === "dictate" && (
                <DictateButton onFinal={(t) => setText((cur) => (cur ? cur + " " : "") + t)} />
              )}
            </div>
          )}

          {mode === "audio" && (
            <MediaRecorderPane
              kind="audio"
              uploading={uploading}
              onConfirm={(blob) => uploadMedia(blob, "audio")}
            />
          )}

          {mode === "video" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={videoSource === "record" ? "default" : "outline"}
                  onClick={() => setVideoSource("record")}
                >
                  <VideoIcon className="h-4 w-4" />
                  Use camera
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={videoSource === "upload" ? "default" : "outline"}
                  onClick={() => setVideoSource("upload")}
                >
                  <UploadIcon className="h-4 w-4" />
                  Upload a file
                </Button>
              </div>
              {videoSource === "record" ? (
                <MediaRecorderPane
                  kind="video"
                  uploading={uploading}
                  onConfirm={(blob) => uploadMedia(blob, "video")}
                />
              ) : (
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="video/*"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadMedia(f, "video");
                    }}
                  />
                  {uploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading…
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {existing?.media_id && !uploading && (
            <p className="text-xs text-muted-foreground">
              Saved. Choose another mode or re-record to replace this answer.
            </p>
          )}
          {uploadError && (
            <p className="text-sm text-destructive">{uploadError}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {(mode === "text" || mode === "dictate") && (
              <Button
                type="button"
                onClick={saveTextAnswer}
                disabled={!hasAnswerForCurrent}
                style={hasAnswerForCurrent ? { backgroundColor: "var(--bw-orange)", color: "white" } : undefined}
              >
                <Check className="h-4 w-4" />
                {idx < questions.length - 1 ? "Save & next" : "Save"}
              </Button>
            )}
            {allowSkip && (
              <Button type="button" variant="ghost" onClick={skip} disabled={uploading}>
                Skip
              </Button>
            )}
            {idx > 0 && (
              <Button type="button" variant="outline" onClick={() => setIdx(idx - 1)} disabled={uploading}>
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
            )}
            {idx < questions.length - 1 && (existing?.skipped || existing?.text || existing?.media_id) && (
              <Button type="button" variant="outline" onClick={() => setIdx(idx + 1)} disabled={uploading}>
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
