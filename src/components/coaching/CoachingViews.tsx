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


export type MMRecView = { mode?: "audio" | "video"; media_id: string };
export type MMValueView = string | MMRecView;

export interface Negative {
  text: MMValueView;
  a?: MMValueView;
  b?: MMValueView;
  c?: MMValueView;
}

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export interface Responses {
  action?: MMValueView;
  positives?: MMValueView[];
  positiveAction?: MMValueView;
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

// ---- Ikigai helpers (shared by runner + keepsake) ----
export type IkigaiLens = "love" | "good" | "need" | "paid";
export const IKIGAI_LENSES: IkigaiLens[] = ["love", "good", "need", "paid"];

export interface IkigaiItem {
  label: string;
  source_lens: IkigaiLens;
  lenses: IkigaiLens[];
  region: string;
  reasoning?: string;
}
export interface IkigaiSufficiency {
  enough: boolean;
  note: string;
  questions: string[];
}
export interface IkigaiMap {
  items: IkigaiItem[];
  candidates?: string[];
  sufficiency?: IkigaiSufficiency;
  model?: string;
  generated_at?: string;
}

const IKIGAI_LENS_COLORS: Record<IkigaiLens, string> = {
  love: "var(--bw-orange)",
  good: "var(--bw-navy-500)",
  need: "var(--bw-plum)",
  paid: "var(--bw-mustard)",
};
export function ikigaiLensColor(l: IkigaiLens): string {
  return IKIGAI_LENS_COLORS[l];
}

export type HedgehogLens = "passion" | "best" | "engine";
export const HEDGEHOG_LENSES: HedgehogLens[] = ["passion", "best", "engine"];
const HEDGEHOG_LENS_COLORS: Record<HedgehogLens, string> = {
  passion: "var(--bw-orange)",
  best: "var(--bw-navy-500)",
  engine: "var(--bw-plum)",
};

export function deriveIkigaiRegion(lenses: string[], sourceLens: string): string {
  const valid: string[] = ["love", "good", "need", "paid"];
  const set = Array.from(new Set(lenses.filter((l) => valid.includes(l))));
  const has = (l: string) => set.includes(l);
  const n = set.length;
  const src = valid.includes(sourceLens) ? sourceLens : (set[0] ?? "love");
  if (n <= 1) return n === 1 ? set[0] : src;
  if (n === 2) {
    if (has("love") && has("good")) return "passion";
    if (has("good") && has("paid")) return "profession";
    if (has("paid") && has("need")) return "vocation";
    if (has("need") && has("love")) return "mission";
    return src;
  }
  if (n === 3) {
    if (has("love") && has("good") && has("need")) return "delight";
    if (has("love") && has("good") && has("paid")) return "satisfaction";
    if (has("good") && has("paid") && has("need")) return "comfortable";
    if (has("love") && has("paid") && has("need")) return "excitement";
    return src;
  }
  return "ikigai";
}

export function deriveHedgehogRegion(lenses: string[], sourceLens: string): string {
  const valid = ["passion", "best", "engine"];
  const set = Array.from(new Set(lenses.filter((l) => valid.includes(l))));
  const has = (l: string) => set.includes(l);
  const n = set.length;
  const src = valid.includes(sourceLens) ? sourceLens : (set[0] ?? "passion");
  if (n <= 1) return n === 1 ? set[0] : src;
  if (n === 2) {
    if (has("passion") && has("best")) return "passion_best";
    if (has("best") && has("engine")) return "best_engine";
    if (has("engine") && has("passion")) return "engine_passion";
    return src;
  }
  return "hedgehog";
}

export function effectiveIkigaiLenses(
  item: IkigaiItem,
  overrides?: Record<string, string[]>,
  validLenses: string[] = IKIGAI_LENSES as string[],
): IkigaiLens[] {
  const raw = overrides?.[item.label];
  const list = (raw && raw.length > 0 ? raw : item.lenses) || [];
  const set = new Set<IkigaiLens>(
    list.filter((l): l is IkigaiLens => validLenses.includes(l)),
  );
  if (item.source_lens && validLenses.includes(item.source_lens)) {
    set.add(item.source_lens);
  }
  return Array.from(set);
}

const IKIGAI_REGION_ORDER = [
  "love", "good", "need", "paid",
  "passion", "mission", "profession", "vocation",
  "satisfaction", "comfortable", "delight", "excitement",
  "ikigai",
];

const HEDGEHOG_REGION_ORDER = [
  "passion", "best", "engine",
  "passion_best", "best_engine", "engine_passion",
  "hedgehog",
];

function IkigaiBackdrop({ regionLabels }: { regionLabels: Record<string, string> }) {
  const loveC = IKIGAI_LENS_COLORS.love;
  const goodC = IKIGAI_LENS_COLORS.good;
  const needC = IKIGAI_LENS_COLORS.need;
  const paidC = IKIGAI_LENS_COLORS.paid;
  return (
    <svg
      viewBox="0 0 500 520"
      className="mx-auto h-auto w-full max-w-lg"
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      <g strokeWidth="2.5">
        <circle cx="195" cy="205" r="145" fill={loveC} fillOpacity="0.15" stroke={loveC} />
        <circle cx="305" cy="205" r="145" fill={goodC} fillOpacity="0.15" stroke={goodC} />
        <circle cx="195" cy="315" r="145" fill={needC} fillOpacity="0.15" stroke={needC} />
        <circle cx="305" cy="315" r="145" fill={paidC} fillOpacity="0.15" stroke={paidC} />
      </g>
      <g fontSize="18" fontWeight="600" textAnchor="middle">
        <text x="110" y="80" fill={loveC}>{regionLabels.love || "What you love"}</text>
        <text x="390" y="70" fill={goodC}>
          <tspan x="390" dy="0">What you&apos;re</tspan>
          <tspan x="390" dy="20">good at</tspan>
        </text>
        <text x="110" y="480" fill={needC}>
          <tspan x="110" dy="0">What the</tspan>
          <tspan x="110" dy="20">world needs</tspan>
        </text>
        <text x="390" y="480" fill={paidC}>
          <tspan x="390" dy="0">What you can</tspan>
          <tspan x="390" dy="20">be paid for</tspan>
        </text>
      </g>
      <text x="250" y="268" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--bw-orange)">
        {regionLabels.ikigai || "Ikigai"}
      </text>
    </svg>
  );
}

function HedgehogBackdrop({ regionLabels }: { regionLabels: Record<string, string> }) {
  const p = HEDGEHOG_LENS_COLORS.passion;
  const b = HEDGEHOG_LENS_COLORS.best;
  const e = HEDGEHOG_LENS_COLORS.engine;
  return (
    <svg viewBox="0 0 500 470" className="mx-auto h-auto w-full max-w-lg" aria-hidden preserveAspectRatio="xMidYMid meet">
      <g strokeWidth="2.5">
        <circle cx="190" cy="195" r="145" fill={p} fillOpacity="0.15" stroke={p} />
        <circle cx="310" cy="195" r="145" fill={b} fillOpacity="0.15" stroke={b} />
        <circle cx="250" cy="300" r="145" fill={e} fillOpacity="0.15" stroke={e} />
      </g>
      <g fontSize="17" fontWeight="600" textAnchor="middle">
        <text x="120" y="95" fill={p}>
          <tspan x="120" dy="0">What you&apos;re</tspan>
          <tspan x="120" dy="19">passionate about</tspan>
        </text>
        <text x="380" y="95" fill={b}>
          <tspan x="380" dy="0">What you can</tspan>
          <tspan x="380" dy="19">be best at</tspan>
        </text>
        <text x="250" y="452" fill={e}>
          <tspan x="250" dy="0">What drives your</tspan>
          <tspan x="250" dy="19">economic engine</tspan>
        </text>
      </g>
      <text x="250" y="240" textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--bw-orange)">
        {regionLabels.hedgehog || "Hedgehog"}
      </text>
    </svg>
  );
}

export function IkigaiRegionsView({
  map,
  overrides,
  regionLabels,
  renderItem,
}: {
  map: IkigaiMap | undefined;
  overrides?: Record<string, string[]>;
  regionLabels: Record<string, string>;
  renderItem?: (item: IkigaiItem, isCandidate: boolean) => JSX.Element;
}) {
  if (!map || !Array.isArray(map.items) || map.items.length === 0) return null;
  const isHog = (map as any)?.variant === "hedgehog";
  const regionOf = isHog ? deriveHedgehogRegion : deriveIkigaiRegion;
  const validLenses = isHog ? (HEDGEHOG_LENSES as string[]) : (IKIGAI_LENSES as string[]);
  const order = isHog ? HEDGEHOG_REGION_ORDER : IKIGAI_REGION_ORDER;
  const candidateSet = new Set(map.candidates || []);
  const byRegion = new Map<string, IkigaiItem[]>();
  for (const raw of map.items) {
    const lenses = effectiveIkigaiLenses(raw, overrides, validLenses);
    const region = regionOf(lenses, raw.source_lens);
    const item: IkigaiItem = { ...raw, lenses, region };
    if (!byRegion.has(region)) byRegion.set(region, []);
    byRegion.get(region)!.push(item);
  }
  const ordered = order.filter((r) => (byRegion.get(r) || []).length > 0);
  return (
    <div className="space-y-4">
      {isHog ? <HedgehogBackdrop regionLabels={regionLabels} /> : <IkigaiBackdrop regionLabels={regionLabels} />}
      <div className="grid gap-3 sm:grid-cols-2">
        {ordered.map((r) => {
          const items = byRegion.get(r)!;
          const isCentre = r === "ikigai" || r === "hedgehog";
          return (
            <Card
              key={r}
              className={
                isCentre
                  ? "border-[var(--bw-orange)] bg-[var(--bw-orange)]/5"
                  : "bg-muted/30"
              }
            >
              <CardHeader className="pb-2">
                <CardTitle
                  className={
                    isCentre
                      ? "text-base"
                      : "text-sm font-semibold text-muted-foreground"
                  }
                  style={isCentre ? { color: "var(--bw-orange)" } : undefined}
                >
                  {regionLabels[r] || r}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pt-0">
                {items.map((it, i) => {
                  const cand = candidateSet.has(it.label);
                  if (renderItem) {
                    return <div key={`${it.label}-${i}`}>{renderItem(it, cand)}</div>;
                  }
                  return (
                    <span
                      key={`${it.label}-${i}`}
                      className={
                        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs " +
                        (cand ? "border-[var(--bw-orange)]" : "border-border")
                      }
                      style={cand ? { color: "var(--bw-orange)" } : undefined}
                    >
                      {cand && <span aria-hidden>★</span>}
                      {it.label}
                    </span>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
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
    } else if (w === "ikigai") {
      const map = (responses as any)[step.mapKey || "ikigai_map"] as IkigaiMap | undefined;
      const overrides = (responses as any)[step.override?.storeKey || "ikigai_overrides"] as
        | Record<string, string[]>
        | undefined;
      if (map && Array.isArray(map.items) && map.items.length > 0) {
        rendered.add(key);
        sections.push(
          <div key={key} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">{heading}</h3>
            <IkigaiRegionsView
              map={map}
              overrides={overrides}
              regionLabels={(step.regionLabels as Record<string, string>) || {}}
            />
          </div>,
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

// ---------- Inner team ("Your team" / MBWC-0450) ----------
export type TeamLayer = "primary" | "secondary" | "tertiary";
export type TeamPower = "low" | "moderate" | "high";
export const TEAM_LAYERS: TeamLayer[] = ["primary", "secondary", "tertiary"];

export interface InnerTeamCharacter {
  name: string;
  description?: string;
  core_desire?: string;
  greatest_fear?: string;
  strength?: string;
  weakness?: string;
  layer: TeamLayer;
  power_now?: TeamPower;
  power_future?: TeamPower;
  when_useful?: string;
  talent?: string;
}
export interface TeamPair { a: string; b: string; note?: string }
export interface InnerTeamSufficiency { enough: boolean; note: string; questions: string[] }
export interface InnerTeamMap {
  characters: InnerTeamCharacter[];
  allies?: TeamPair[];
  conflicts?: TeamPair[];
  decision_driver?: { name: string; note?: string };
  grow?: string[];
  shrink?: string[];
  sufficiency?: InnerTeamSufficiency;
  model?: string;
  generated_at?: string;
}

const TEAM_LAYER_COLORS: Record<TeamLayer, string> = {
  primary: "var(--bw-orange)",
  secondary: "var(--bw-navy-500)",
  tertiary: "var(--bw-plum)",
};
export function teamLayerColor(l: TeamLayer): string { return TEAM_LAYER_COLORS[l]; }

const DEFAULT_LAYER_LABELS: Record<TeamLayer, string> = {
  primary: "Primary — shows up daily and drives",
  secondary: "Secondary — triggered, often by a threat",
  tertiary: "Tertiary — rare, but can take over",
};

export function effectiveTeamLayer(
  c: InnerTeamCharacter,
  overrides?: Record<string, string>,
): TeamLayer {
  const o = overrides?.[c.name];
  return o === "primary" || o === "secondary" || o === "tertiary" ? o : c.layer;
}

function TeamCircleBackdrop({ layerLabels }: { layerLabels: Record<string, string> }) {
  const p = TEAM_LAYER_COLORS.primary;
  const s = TEAM_LAYER_COLORS.secondary;
  const t = TEAM_LAYER_COLORS.tertiary;
  const shortLabel = (k: TeamLayer) =>
    (layerLabels[k] || DEFAULT_LAYER_LABELS[k]).split("—")[0].trim();
  return (
    <svg
      viewBox="0 0 500 500"
      className="mx-auto h-auto w-full max-w-md"
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      <g strokeWidth="2.5">
        <circle cx="250" cy="250" r="220" fill={t} fillOpacity="0.08" stroke={t} />
        <circle cx="250" cy="250" r="150" fill={s} fillOpacity="0.12" stroke={s} />
        <circle cx="250" cy="250" r="80" fill={p} fillOpacity="0.18" stroke={p} />
      </g>
      <text x="250" y="256" textAnchor="middle" fontSize="20" fontWeight="700" fill={p}>
        You
      </text>
      <g fontSize="14" fontWeight="600" textAnchor="middle">
        <text x="250" y="180" fill={p}>{shortLabel("primary")}</text>
        <text x="250" y="110" fill={s}>{shortLabel("secondary")}</text>
        <text x="250" y="40" fill={t}>{shortLabel("tertiary")}</text>
      </g>
    </svg>
  );
}

export function InnerTeamCircleView({
  map,
  overrides,
  layerLabels,
  renderItem,
}: {
  map: InnerTeamMap | undefined;
  overrides?: Record<string, string>;
  layerLabels: Record<string, string>;
  renderItem?: (c: InnerTeamCharacter, grow: boolean, shrink: boolean) => JSX.Element;
}) {
  if (!map || !Array.isArray(map.characters) || map.characters.length === 0) return null;
  const growSet = new Set(map.grow || []);
  const shrinkSet = new Set(map.shrink || []);
  const byLayer = new Map<TeamLayer, InnerTeamCharacter[]>();
  for (const c of map.characters) {
    const layer = effectiveTeamLayer(c, overrides);
    if (!byLayer.has(layer)) byLayer.set(layer, []);
    byLayer.get(layer)!.push(c);
  }
  const ordered = TEAM_LAYERS.filter((l) => (byLayer.get(l) || []).length > 0);
  const pairLine = (p: TeamPair, glyph: string) =>
    `${p.a} ${glyph} ${p.b}${p.note ? ` — ${p.note}` : ""}`;
  return (
    <div className="space-y-4">
      <TeamCircleBackdrop layerLabels={layerLabels} />
      <div className="grid gap-3 sm:grid-cols-3">
        {ordered.map((l) => {
          const cs = byLayer.get(l)!;
          const color = TEAM_LAYER_COLORS[l];
          return (
            <Card key={l} className="bg-muted/30" style={{ borderColor: color }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color }}>
                  {layerLabels[l] || DEFAULT_LAYER_LABELS[l]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {cs.map((c, i) => (
                  <div key={`${c.name}-${i}`}>
                    {renderItem ? (
                      renderItem(c, growSet.has(c.name), shrinkSet.has(c.name))
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs">
                        {growSet.has(c.name) && <span aria-hidden style={{ color: "var(--bw-orange)" }}>★</span>}
                        {c.name}
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(map.decision_driver?.name ||
        (map.allies?.length ?? 0) > 0 ||
        (map.conflicts?.length ?? 0) > 0 ||
        (map.grow?.length ?? 0) > 0 ||
        (map.shrink?.length ?? 0) > 0) && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              How your team plays together
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-sm">
            {map.decision_driver?.name && (
              <p>
                <span className="font-medium">Who tends to drive:</span> {map.decision_driver.name}
                {map.decision_driver.note ? ` — ${map.decision_driver.note}` : ""}
              </p>
            )}
            {(map.allies?.length ?? 0) > 0 && (
              <div>
                <p className="font-medium">Allies</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {map.allies!.map((p, i) => (
                    <li key={i}>{pairLine(p, "+")}</li>
                  ))}
                </ul>
              </div>
            )}
            {(map.conflicts?.length ?? 0) > 0 && (
              <div>
                <p className="font-medium">Tensions</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {map.conflicts!.map((p, i) => (
                    <li key={i}>{pairLine(p, "vs")}</li>
                  ))}
                </ul>
              </div>
            )}
            {((map.grow?.length ?? 0) > 0 || (map.shrink?.length ?? 0) > 0) && (
              <div className="grid gap-2 sm:grid-cols-2">
                {(map.grow?.length ?? 0) > 0 && (
                  <p>
                    <span className="font-medium" style={{ color: "var(--bw-orange)" }}>See more of:</span>{" "}
                    {map.grow!.join(", ")}
                  </p>
                )}
                {(map.shrink?.length ?? 0) > 0 && (
                  <p>
                    <span className="font-medium text-muted-foreground">See less of:</span>{" "}
                    {map.shrink!.join(", ")}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

