import { useState } from "react";
import DOMPurify from "dompurify";
import MuxPlayer from "@mux/mux-player-react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RecordingResponse {
  kind?: string;
  processing?: boolean;
  playback_id?: string;
  token?: string;
  media_kind?: "audio" | "video";
  mux_status?: string;
  transcript?: string | null;
  transcript_status?: string | null;
}

interface ResourceVideoResponse {
  kind?: string;
  processing?: boolean;
  playback_id?: string;
  token?: string;
  mux_status?: string;
}

export function ResourceVideo({ resourceId, title }: { resourceId: string; title?: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["resource-video", resourceId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-resource-video-url", {
        body: { p_resource_id: resourceId },
      });
      if (error) throw error;
      return data as ResourceVideoResponse;
    },
    staleTime: 60_000,
    retry: false,
  });

  return (
    <div className="space-y-2">
      {title && <h4 className="text-sm font-medium">{title}</h4>}
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading video…
        </div>
      ) : isError || !data ? (
        <p className="text-xs text-muted-foreground">Video unavailable.</p>
      ) : data.processing ? (
        <p className="text-xs text-muted-foreground">This video is still processing.</p>
      ) : data.kind !== "mux" || !data.playback_id || !data.token ? (
        <p className="text-xs text-muted-foreground">Video unavailable.</p>
      ) : (
        <MuxPlayer
          playbackId={data.playback_id}
          tokens={{ playback: data.token }}
          streamType="on-demand"
          style={{ maxHeight: "60vh", aspectRatio: "16/9", width: "100%" }}
        />
      )}
    </div>
  );
}


export function CoachingRecordingPlayer({ mediaId }: { mediaId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["coaching-recording", mediaId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-coaching-response-video-url", {
        body: { p_media_id: mediaId },
      });
      if (error) throw error;
      return data as RecordingResponse;
    },
    staleTime: 60_000,
    retry: false,
  });
  const [showTranscript, setShowTranscript] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading recording…
      </div>
    );
  }
  if (isError || !data) {
    return <p className="text-xs text-muted-foreground">Recording unavailable.</p>;
  }
  if (data.processing) {
    return <p className="text-xs text-muted-foreground">This recording is still processing.</p>;
  }
  if (!data.playback_id || !data.token) {
    return <p className="text-xs text-muted-foreground">Recording unavailable.</p>;
  }
  const isAudio = data.media_kind === "audio";
  return (
    <div className="space-y-2">
      <MuxPlayer
        playbackId={data.playback_id}
        tokens={{ playback: data.token }}
        streamType="on-demand"
        {...(isAudio ? { audio: true } : {})}
        style={
          isAudio
            ? { width: "100%" }
            : { maxHeight: "50vh", aspectRatio: "16/9", width: "100%" }
        }
      />
      {data.transcript_status === "ready" && data.transcript && (
        <div className="rounded-md border bg-muted/30">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-between"
            onClick={() => setShowTranscript((v) => !v)}
            aria-expanded={showTranscript}
          >
            Transcript
            <span aria-hidden>{showTranscript ? "−" : "+"}</span>
          </Button>
          {showTranscript && (
            <p className="whitespace-pre-wrap px-3 pb-3 text-sm">{data.transcript}</p>
          )}
        </div>
      )}
    </div>
  );
}


export interface Negative {
  text: string;
  a?: string;
  b?: string;
  c?: string;
}

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export interface Responses {
  action?: string;
  positives?: string[];
  positiveAction?: string;
  negatives?: Negative[];
  analysis?: { html?: string; [k: string]: unknown };
  chat?: ChatMsg[];
  [k: string]: unknown;
}

export function AiAnalysisPanel({ html }: { html?: string }) {
  if (!html) return null;
  let src = html.trim();
  if (src.startsWith("```"))
    src = src.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
  const clean = DOMPurify.sanitize(src, {
    ALLOWED_TAGS: ["h3", "h4", "p", "ul", "ol", "li", "strong", "em", "br"],
    ALLOWED_ATTR: [],
  });
  return (
    <div
      className="prose prose-sm max-w-none rounded-lg border bg-muted/30 p-4"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

function isRec(v: unknown): v is { media_id: string } {
  return !!v && typeof v === "object" && typeof (v as any).media_id === "string";
}
function renderMM(v: unknown): JSX.Element | null {
  if (typeof v === "string") {
    if (!v.trim()) return null;
    return <p className="whitespace-pre-wrap text-sm">{v}</p>;
  }
  if (isRec(v)) return <CoachingRecordingPlayer mediaId={(v as any).media_id} />;
  return null;
}
function mmFilled(v: unknown): boolean {
  if (typeof v === "string") return v.trim().length > 0;
  return isRec(v);
}

export function SynthesisView({ responses, steps }: { responses: Responses; steps?: any[] }) {
  if (!steps || steps.length === 0) return null;
  const rendered = new Set<string>();
  const defaultRiskLabels: Record<string, string> = { a: "Prevent", b: "In the moment", c: "Recover" };
  const sections: JSX.Element[] = [];
  for (const step of steps) {
    const w = step.widget;
    const key = step.key as string | undefined;
    if (["ai_panel", "synthesis", "image_select", "image_describe"].includes(w) || !key || rendered.has(key)) continue;
    const heading = step.summaryLabel || step.label || step.title || key;
    if (w === "textarea" || w === "content") {
      const v = (responses as any)[key];
      if (mmFilled(v)) {
        rendered.add(key);
        sections.push(
          <div key={key}>
            <h3 className="text-sm font-semibold text-muted-foreground">{heading}</h3>
            <div className="mt-1">{renderMM(v)}</div>
          </div>
        );
      }
    } else if (w === "list_builder") {
      const arr = (responses as any)[key] as unknown[] | undefined;
      if (Array.isArray(arr) && arr.length > 0) {
        rendered.add(key);
        const priorityKey = step.prioritize?.priorityKey as string | undefined;
        const prioritized = priorityKey
          ? new Set((((responses as any)[priorityKey] as unknown[] | undefined) || []).filter((x) => typeof x === "string") as string[])
          : null;
        sections.push(
          <div key={key}>
            <h3 className="text-sm font-semibold text-muted-foreground">{heading}</h3>
            <ul className="mt-1 space-y-2 text-sm">
              {arr.map((p, i) => {
                const marked = typeof p === "string" && prioritized?.has(p);
                return (
                  <li key={i} className={marked ? "font-semibold" : undefined}>
                    {typeof p === "string" ? (
                      <span className="inline-flex items-start gap-1">
                        <span aria-hidden className="mt-1">•</span>
                        <span>
                          {marked && (
                            <span aria-hidden style={{ color: "var(--bw-orange)" }} className="mr-1">★</span>
                          )}
                          <span style={marked ? { color: "var(--bw-orange)" } : undefined}>{p}</span>
                          {marked && (
                            <span className="ml-2 rounded bg-[var(--bw-orange)]/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--bw-orange)]">
                              Top {step.prioritize?.selectExactly ?? ""}
                            </span>
                          )}
                        </span>
                      </span>
                    ) : isRec(p) ? (
                      <CoachingRecordingPlayer mediaId={(p as any).media_id} />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      }
    } else if (w === "text_select") {
      const arr = (responses as any)[key] as Array<{ text: string; author: string | null; description: unknown }> | undefined;
      if (Array.isArray(arr) && arr.length > 0) {
        rendered.add(key);
        sections.push(
          <div key={key} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">{heading}</h3>
            {arr.map((s, i) => (
              <div key={i} className="space-y-1">
                <blockquote className="border-l-2 pl-3 text-sm italic">{s.text}</blockquote>
                {s.author && (
                  <p className="text-xs text-muted-foreground">— {s.author}</p>
                )}
                {mmFilled(s.description) && <div>{renderMM(s.description)}</div>}
              </div>
            ))}
          </div>
        );
      }
    } else if (w === "risk_blocks") {
      if (!(step.subfields && step.subfields.length > 0)) continue;
      const arr = (responses as any)[key] as any[] | undefined;
      if (Array.isArray(arr) && arr.length > 0) {
        rendered.add(key);
        const labels: Record<string, string> = { ...defaultRiskLabels, ...(step.subfieldLabels || {}) };
        sections.push(
          <div key={key} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">{heading}</h3>
            {arr.map((n, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {typeof n.text === "string" ? (n.text || `Risk ${i + 1}`) : `Risk ${i + 1}`}
                  </CardTitle>
                  {isRec(n.text) && (
                    <div className="pt-2"><CoachingRecordingPlayer mediaId={(n.text as any).media_id} /></div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(step.subfields as string[]).map((sf) => {
                    const val = (n as any)[sf];
                    if (!mmFilled(val)) return null;
                    return (
                      <div key={sf}>
                        <span className="font-medium">{labels[sf] || sf}: </span>
                        {typeof val === "string" ? (
                          <span>{val}</span>
                        ) : (
                          <div className="mt-1"><CoachingRecordingPlayer mediaId={(val as any).media_id} /></div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        );
      }
    } else if (w === "qa_multimodal") {
      const bag = (responses as any)[key] as
        | Record<string, { mode?: string; text?: string; media_id?: string; skipped?: boolean }>
        | undefined;
      const questions = (step.questions as Array<{ key: string; prompt: string }>) || [];
      if (bag && questions.length > 0) {
        rendered.add(key);
        sections.push(
          <div key={key} className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">{heading}</h3>
            {questions.map((q) => {
              const a = bag[q.key];
              return (
                <div key={q.key} className="space-y-2">
                  <h4 className="text-sm font-medium">{q.prompt}</h4>
                  {!a || a.skipped ? (
                    <p className="text-sm italic text-muted-foreground">Skipped</p>
                  ) : a.mode === "audio" || a.mode === "video" ? (
                    a.media_id ? (
                      <CoachingRecordingPlayer mediaId={a.media_id} />
                    ) : (
                      <p className="text-xs text-muted-foreground">Recording unavailable.</p>
                    )
                  ) : a.text ? (
                    <p className="whitespace-pre-wrap text-sm">{a.text}</p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">No answer</p>
                  )}
                </div>
              );
            })}
          </div>
        );
      }
    }
  }

  if (sections.length === 0) return null;
  return <div className="space-y-6">{sections}</div>;
}

export function ChatTranscript({ chat }: { chat: ChatMsg[] }) {
  if (!chat || chat.length === 0) return null;
  return (
    <div className="space-y-2 rounded-lg border p-3">
      {chat.map((m, i) => (
        <div
          key={i}
          className={
            m.role === "user"
              ? "ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
              : "mr-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm"
          }
        >
          <div className="whitespace-pre-wrap">{m.content}</div>
        </div>
      ))}
    </div>
  );
}
