import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Video as VideoIcon, Square, Check, RotateCcw, Upload as UploadIcon } from "lucide-react";
import * as UpChunk from "@mux/upchunk";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CoachingRecordingPlayer } from "@/components/coaching/CoachingViews";

// ---- Types ----
export type MMRec = { mode: "audio" | "video"; media_id: string };
export type MMValue = string | MMRec;
export type MMMode = "text" | "dictate" | "audio" | "video";

export function isMMRec(v: unknown): v is MMRec {
  return !!v && typeof v === "object" && typeof (v as any).media_id === "string";
}
export function mmIsFilled(v: unknown): boolean {
  if (typeof v === "string") return v.trim().length > 0;
  return isMMRec(v);
}

// ---- Helpers ----
function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

// ---- MediaRecorderPane (extracted verbatim) ----
export function MediaRecorderPane({
  kind,
  onConfirm,
  uploading,
  disabled,
}: {
  kind: "audio" | "video";
  onConfirm: (blob: Blob) => void;
  uploading: boolean;
  disabled?: boolean;
  /** Which session table the recording belongs to. Presentational no-op here; kept for API parity. */
  sessionKind?: "coaching" | "relationship";
}) {
  const [permError, setPermError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    cleanupStream();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [cleanupStream, previewUrl]);

  const start = async () => {
    setPermError(null);
    setBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === "audio" ? { audio: true } : { video: true, audio: true },
      );
      streamRef.current = stream;
      if (kind === "video" && liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.muted = true;
        await liveVideoRef.current.play().catch(() => {});
      }
      const mime = kind === "audio" ? "audio/webm" : "video/webm";
      const rec = new MediaRecorder(stream, MediaRecorder.isTypeSupported(mime) ? { mimeType: mime } : undefined);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: rec.mimeType || mime });
        setBlob(b);
        setPreviewUrl(URL.createObjectURL(b));
        cleanupStream();
      };
      rec.start();
      startedAtRef.current = Date.now();
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed(Date.now() - startedAtRef.current);
      }, 250);
      setRecording(true);
    } catch (e: any) {
      setPermError(
        e?.name === "NotAllowedError"
          ? `Permission to use the ${kind === "audio" ? "microphone" : "camera"} was denied. You can answer as text instead.`
          : e?.message || "Could not start recording.",
      );
      cleanupStream();
    }
  };

  const stop = () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    setRecording(false);
  };

  return (
    <div className="space-y-3">
      {kind === "video" && (recording || !blob) && (
        <video
          ref={liveVideoRef}
          className="w-full rounded-md bg-black"
          playsInline
          muted
          style={{ display: recording ? "block" : "none" }}
        />
      )}
      {permError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">{permError}</p>
      )}
      {!recording && !blob && (
        <Button
          type="button"
          variant="outline"
          onClick={start}
          disabled={disabled}
          aria-label={`Start ${kind} recording`}
        >
          {kind === "audio" ? <Mic className="h-4 w-4" /> : <VideoIcon className="h-4 w-4" />}
          Record {kind}
        </Button>
      )}
      {recording && (
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          <span className="text-sm tabular-nums" aria-live="polite">Recording {formatElapsed(elapsed)}</span>
          <Button type="button" variant="outline" onClick={stop} aria-label="Stop recording">
            <Square className="h-4 w-4" />
            Stop
          </Button>
        </div>
      )}
      {!recording && blob && previewUrl && (
        <div className="space-y-2">
          {kind === "audio" ? (
            <audio src={previewUrl} controls className="w-full" />
          ) : (
            <video src={previewUrl} controls className="w-full rounded-md bg-black" playsInline />
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => onConfirm(blob)}
              disabled={uploading || disabled}
              style={{ backgroundColor: "var(--bw-orange)", color: "white" }}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {uploading ? "Uploading…" : "Use this recording"}
            </Button>
            <Button type="button" variant="outline" onClick={start} disabled={uploading || disabled}>
              <RotateCcw className="h-4 w-4" />
              Re-record
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Every platform ships dictation the user already has. When the browser
// cannot do in-page speech recognition, tell the user how to use it rather
// than hiding the option.
export function dictationHint(): string {
  if (typeof navigator === "undefined") {
    return "Use your device's built-in dictation to speak into this box.";
  }
  const ua = navigator.userAgent || "";
  // Modern iPads report as Macintosh, so check touch points as well.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && (navigator as any).maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  if (isIOS || isAndroid) {
    return "Tap the microphone key on your keyboard, then speak.";
  }
  if (/Windows/.test(ua)) {
    return "Press the Windows key and H together, then speak.";
  }
  if (/Mac OS X|Macintosh/.test(ua)) {
    return "Turn on Dictation in System Settings, under Keyboard, then press its shortcut and speak.";
  }
  return "Use your device's built-in dictation to speak into this box.";
}

// ---- DictateButton (extracted verbatim) ----
export function DictateButton({ onFinal, disabled }: { onFinal: (text: string) => void; disabled?: boolean }) {
  const [listening, setListening] = useState(false);
  const [fallback, setFallback] = useState<null | "unsupported" | "denied">(null);
  const recRef = useRef<any>(null);

  const hasNative =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const mode = !hasNative ? "unsupported" : fallback;

  if (mode) {
    return (
      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Mic className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          {mode === "denied"
            ? "Microphone access was blocked, so in-page dictation is unavailable. You can allow it in your browser settings, or dictate another way: "
            : "This browser cannot dictate directly into the page. "}
          {dictationHint()}
        </span>
      </p>
    );
  }

  const toggle = () => {
    if (listening) {
      try { recRef.current?.stop(); } catch { /* ignore */ }
      setListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = navigator.language || "en-US";
    rec.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal && r[0]?.transcript) onFinal(r[0].transcript.trim() + " ");
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = (event: any) => {
      setListening(false);
      const err = event?.error;
      // no-speech, aborted and audio-capture are transient. The rest mean
      // this browser cannot serve dictation at all, so switch to the hint
      // permanently rather than letting the user click a dead button.
      if (err === "not-allowed") setFallback("denied");
      else if (err === "service-not-allowed" || err === "language-not-supported" || err === "network") {
        setFallback("unsupported");
      }
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      setFallback("unsupported");
    }
  };
  return (
    <Button
      type="button"
      variant={listening ? "default" : "outline"}
      size="sm"
      onClick={toggle}
      disabled={disabled}
      aria-pressed={listening}
      aria-label={listening ? "Stop dictation" : "Start dictation"}
    >
      <Mic className="h-4 w-4" />
      {listening ? "Stop dictating" : "Dictate"}
    </Button>
  );
}

// ---- Upload broker + UpChunk (extracted verbatim) ----
export async function uploadCoachingRecording(args: {
  sessionId: string;
  activityCode: string;
  questionKey: string;
  kind: "audio" | "video";
  blob: Blob;
  sessionKind?: "coaching" | "relationship";
}): Promise<{ media_id: string }> {
  const { sessionId, activityCode, questionKey, kind, blob, sessionKind = "coaching" } = args;
  const { data, error } = await supabase.functions.invoke("coaching-response-upload", {
    body: {
      ...(sessionKind === "relationship"
        ? { relationship_session_id: sessionId }
        : { coaching_session_id: sessionId }),
      activity_code: activityCode,
      question_key: questionKey,
      kind,
    },
  });
  if (error) throw new Error(error.message);
  const { upload_url, media_id } = (data || {}) as { upload_url: string; media_id: string };
  if (!upload_url || !media_id) throw new Error("Upload broker returned no URL");
  const file =
    blob instanceof File
      ? blob
      : new File(
          [blob],
          `answer-${Date.now()}.webm`,
          { type: blob.type || (kind === "audio" ? "audio/webm" : "video/webm") },
        );
  await new Promise<void>((resolve, reject) => {
    const upload = UpChunk.createUpload({ endpoint: upload_url, file });
    upload.on("error", (err: any) => reject(new Error(err?.detail?.message || "Upload failed")));
    upload.on("success", () => resolve());
  });
  return { media_id };
}

// ---- MultimodalField ----
const MODE_LABELS: Record<MMMode, string> = {
  text: "Type",
  dictate: "Dictate",
  audio: "Record audio",
  video: "Record video",
};

export function MultimodalField({
  value,
  onChange,
  sessionId,
  activityCode,
  questionKey,
  modes,
  placeholder,
  minRows,
  sessionKind = "coaching",
}: {
  value: MMValue | undefined;
  onChange: (v: MMValue) => void;
  sessionId: string;
  activityCode: string;
  questionKey: string;
  modes?: MMMode[];
  sessionKind?: "coaching" | "relationship";
  placeholder?: string;
  minRows?: number;
}) {
  const allowed: MMMode[] = modes && modes.length > 0 ? modes : ["text", "dictate", "audio", "video"];
  const rec = isMMRec(value) ? value : null;
  const initialMode: MMMode = rec ? rec.mode : allowed[0];
  const [mode, setMode] = useState<MMMode>(initialMode);
  const [text, setText] = useState<string>(typeof value === "string" ? value : "");
  const [rerecording, setRerecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [videoSource, setVideoSource] = useState<"record" | "upload">("record");

  // Sync internal text if value changes externally to a string
  useEffect(() => {
    if (typeof value === "string") setText(value);
  }, [value]);

  const changeText = (v: string) => {
    setText(v);
    onChange(v);
  };

  const doUpload = async (blob: Blob, kind: "audio" | "video") => {
    setUploading(true);
    setUploadError(null);
    try {
      const { media_id } = await uploadCoachingRecording({
        sessionId,
        activityCode,
        questionKey,
        kind,
        blob,
        sessionKind,
      });
      onChange({ mode: kind, media_id });
      setRerecording(false);
    } catch (e: any) {
      setUploadError(e?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const showRecordingChip =
    rec && (mode === "audio" || mode === "video") && !rerecording;

  return (
    <div className="space-y-2">
      {allowed.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Answer mode">
          {allowed.map((m) => {
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
                onClick={() => {
                  setMode(m);
                  setRerecording(false);
                }}
              >
                {MODE_LABELS[m]}
              </Button>
            );
          })}
        </div>
      )}

      {(mode === "text" || mode === "dictate") && (
        <div className="space-y-2">
          <Textarea
            rows={minRows ?? 3}
            placeholder={placeholder || "Type here…"}
            value={text}
            onChange={(e) => changeText(e.target.value)}
          />
          {mode === "dictate" && (
            <DictateButton onFinal={(t) => changeText((text ? text + " " : "") + t)} />
          )}
        </div>
      )}

      {mode === "audio" && (
        <>
          {showRecordingChip ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span className="flex-1">Recording saved</span>
              <Button type="button" size="sm" variant="outline" onClick={() => setRerecording(true)}>
                <RotateCcw className="h-4 w-4" />
                Re-record
              </Button>
            </div>
          ) : (
            <MediaRecorderPane
              kind="audio"
              sessionKind={sessionKind}
              uploading={uploading}
              onConfirm={(blob) => doUpload(blob, "audio")}
            />
          )}
        </>
      )}

      {mode === "video" && (
        <div className="space-y-2">
          {showRecordingChip ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span className="flex-1">Recording saved</span>
              <Button type="button" size="sm" variant="outline" onClick={() => setRerecording(true)}>
                <RotateCcw className="h-4 w-4" />
                Re-record
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={videoSource === "record" ? "default" : "outline"}
                  onClick={() => setVideoSource("record")}
                >
                  <VideoIcon className="h-4 w-4" />
                  Record
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
                  sessionKind={sessionKind}
                  uploading={uploading}
                  onConfirm={(blob) => doUpload(blob, "video")}
                />
              ) : (
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="video/*"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) doUpload(f, "video");
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
            </>
          )}
        </div>
      )}

      {rec && (mode === "audio" || mode === "video") && (
        <div className="rounded-md border bg-background p-2">
          <CoachingRecordingPlayer mediaId={rec.media_id} />
        </div>
      )}

      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
    </div>
  );
}
