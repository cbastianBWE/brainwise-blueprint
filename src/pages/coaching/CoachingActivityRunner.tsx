import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft, ArrowRight, Plus, Trash2, Send, Share2, CheckCircle2, Check, X, Mic, Video as VideoIcon, Square, Upload as UploadIcon, RotateCcw } from "lucide-react";
import * as UpChunk from "@mux/upchunk";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SynthesisView, AiAnalysisPanel, ChatTranscript, ResourceVideo } from "@/components/coaching/CoachingViews";
import TransitionMapWalkthrough from "@/components/coaching/TransitionMapWalkthrough";

// ---- Types ----
interface Step {
  widget: string;
  key?: string;
  min?: number;
  subfields?: string[];
  chat?: boolean;
  label?: string;
  title?: string;
  helper?: string;
  placeholder?: string;
  onComplete?: { touchpoint?: string };
  // image_select
  intro?: string;
  source?: { library?: string };
  pageSize?: number;
  selectMin?: number;
  softCap?: number;
  tagOnSelect?: { prompt?: string; maxLen?: number };
  overCapNudge?: string;
  // content
  body?: string;
  media?: { type: string; src: string; alt?: string; caption?: string };
  statements?: string[];
  reflection?: { prompt?: string; placeholder?: string; optional?: boolean; minRows?: number };
  // image_describe
  fromKey?: string;
  questions?: any;
  // qa_multimodal
  modes?: string[];
  allowSkip?: boolean;
  descriptionPrompt?: string;
  minDescribed?: number;
  subfieldLabels?: Record<string, string>;
  subfieldHelpers?: Record<string, string>;
  // text_select
  selectExactly?: number;
  reflectOnSelect?: { modal?: boolean; prompt?: string; maxLen?: number };
  // ai suggestions
  suggest?: { mode: "auto" | "on_demand"; count?: number; buttonLabel?: string; prompt?: string };
  // list_builder soft nudge + prioritize pass
  softTarget?: number;
  prioritize?: {
    selectExactly: number;
    title?: string;
    prompt?: string;
    helper?: string;
    priorityKey: string;
  };
}

interface SelectedSaying {
  saying_id: string;
  text: string;
  author: string | null;
  description: string;
}

interface Activity {
  id: string;
  code?: string | null;
  title: string;
  tier: string | null;
  definition: any;
}

interface Negative {
  text: string;
  a?: string;
  b?: string;
  c?: string;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface Responses {
  action?: string;
  positives?: string[];
  positiveAction?: string;
  negatives?: Negative[];
  analysis?: { html?: string; [k: string]: unknown };
  chat?: ChatMsg[];
  [k: string]: unknown;
}

interface Session {
  id: string;
  activity_id: string;
  status: string;
  current_step: number;
  responses: Responses;
  parent_session_id: string | null;
  completed_at: string | null;
}

// ---- Helpers ----
function buildUserPatch(responses: Responses): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const k of Object.keys(responses)) {
    if (k === "analysis" || k === "chat" || k === "recap") continue;
    patch[k] = (responses as any)[k];
  }
  return patch;
}

function useDebouncedSave(sessionId: string | null, current_step: number, responses: Responses) {
  const timer = useRef<number | null>(null);
  const pending = useRef<{ step: number; patch: Record<string, unknown> } | null>(null);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  useEffect(() => {
    if (!sessionId) return;
    if (timer.current) window.clearTimeout(timer.current);
    const patch = buildUserPatch(responses);
    pending.current = { step: current_step, patch };
    timer.current = window.setTimeout(async () => {
      pending.current = null;
      await supabase.rpc("coaching_session_save", {
        p_session_id: sessionId,
        p_current_step: current_step,
        p_patch: patch as any,
      });
    }, 600);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      const p = pending.current;
      const sid = sessionIdRef.current;
      if (p && sid) {
        pending.current = null;
        void supabase.rpc("coaching_session_save", {
          p_session_id: sid,
          p_current_step: p.step,
          p_patch: p.patch as any,
        });
      }
    };
  }, [sessionId, current_step, JSON.stringify(responses)]);
}

// ---- Widgets ----
function TextareaWidget({
  step,
  value,
  onChange,
}: {
  step: Step;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {step.label && <Label>{step.label}</Label>}
      {step.helper && <p className="text-sm text-muted-foreground">{step.helper}</p>}
      <Textarea
        rows={6}
        placeholder={step.placeholder || "Type here…"}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ListBuilderWidget({
  step,
  items,
  onChange,
  reference,
}: {
  step: Step;
  items: string[];
  onChange: (next: string[]) => void;
  reference?: { title: string; items: string[] };
}) {
  const min = step.min ?? 0;
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onChange([...(items || []), t]);
    setDraft("");
  };
  return (
    <div className="space-y-3">
      {reference && reference.items.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-muted-foreground">{reference.title}</p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {reference.items.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {step.helper && <p className="text-sm text-muted-foreground">{step.helper}</p>}
      <div className="space-y-2">
        {(items || []).map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={v}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder="Add an item…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" onClick={add}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      {min > 0 && (
        <p className="text-xs text-muted-foreground">
          {(items || []).length} of at least {min}
        </p>
      )}
    </div>
  );
}

function RiskBlocksWidget({
  step,
  items,
  onChange,
}: {
  step: Step;
  items: Negative[];
  onChange: (next: Negative[]) => void;
}) {
  const subfields = step.subfields || [];
  const editingSub = subfields.length > 0;
  const [draft, setDraft] = useState("");

  if (!editingSub) {
    const add = () => {
      const t = draft.trim();
      if (!t) return;
      onChange([...(items || []), { text: t }]);
      setDraft("");
    };
    return (
      <div className="space-y-3">
        {step.helper && <p className="text-sm text-muted-foreground">{step.helper}</p>}
        <div className="space-y-2">
          {(items || []).map((n, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={n.text}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], text: e.target.value };
                  onChange(next);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={draft}
            placeholder={step.placeholder || "Add a risk or concern…"}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button type="button" onClick={add}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
    );
  }

  const defaultLabels: Record<string, string> = {
    a: "Prevent",
    b: "In the moment",
    c: "Recover",
  };
  const defaultHelpers: Record<string, string> = {
    a: "How you can reduce the chance this happens.",
    b: "What you'll do if it starts to happen.",
    c: "How you'll recover if it does happen.",
  };
  const label = (sf: string) => step.subfieldLabels?.[sf] ?? defaultLabels[sf] ?? sf;
  const helper = (sf: string) => step.subfieldHelpers?.[sf] ?? defaultHelpers[sf] ?? "";

  return (
    <div className="space-y-4">
      {step.helper && <p className="text-sm text-muted-foreground">{step.helper}</p>}
      {(items || []).map((n, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{n.text || `Risk ${i + 1}`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subfields.map((sf) => (
              <div key={sf} className="space-y-1">
                <Label>{label(sf)}</Label>
                <p className="text-xs text-muted-foreground">{helper(sf)}</p>
                <Textarea
                  rows={2}
                  value={(n as any)[sf] || ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...next[i], [sf]: e.target.value };
                    onChange(next);
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


function ChatWidget({
  sessionId,
  chat,
  onChat,
  onRemainingChange,
}: {
  sessionId: string;
  chat: ChatMsg[];
  onChat: (next: ChatMsg[]) => void;
  onRemainingChange: (n: number | null) => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const text = message.trim();
    if (!text) return;
    setSending(true);
    const nextChat: ChatMsg[] = [...(chat || []), { role: "user", content: text }];
    onChat(nextChat);
    setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("coaching-activity-chat", {
        body: { session_id: sessionId, message: text },
      });
      if (error) {
        const status = (error as any).context?.status;
        if (status === 402) {
          toast.error("You've used your coaching runs.", {
            description: "Upgrade for more.",
            action: { label: "Upgrade", onClick: () => (window.location.href = "/pricing") },
          });
        } else if (status === 403) {
          toast.error("Access denied for this activity.");
        } else {
          toast.error("Chat failed. Please try again.");
        }
        return;
      }
      const reply: string = (data as any)?.reply || "";
      onChat([...nextChat, { role: "assistant", content: reply }]);
      if (typeof (data as any)?.coaching_remaining === "number") {
        onRemainingChange((data as any).coaching_remaining);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-[420px] overflow-y-auto rounded-lg border p-3">
        {(chat || []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask the AI coach anything about the plan above.
          </p>
        )}
        {(chat || []).map((m, i) => (
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
      <div className="flex gap-2">
        <Textarea
          rows={2}
          value={message}
          placeholder="Ask a question…"
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button onClick={send} disabled={sending || !message.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}


// ---- Image helpers ----
const imgUrl = (path: string, w: number, h: number) =>
  supabase.storage
    .from("coaching-media")
    .getPublicUrl(path, { transform: { width: w, height: h, resize: "cover" } }).data.publicUrl;

interface LibraryImage {
  id: string;
  storage_path: string;
  alt: string | null;
}

interface SelectedImage {
  library_id: string;
  storage_path: string;
  tag: string;
  description?: string;
}

function ImageDescribeWidget({
  step,
  value,
  onChange,
}: {
  step: Step;
  value: SelectedImage[];
  onChange: (next: SelectedImage[]) => void;
}) {
  const describedCount = value.filter((it) => (it.description || "").trim().length > 0).length;

  const updateDescription = (idx: number, description: string) => {
    const next = value.map((it, i) => (i === idx ? { ...it, description } : it));
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}
      {step.questions && step.questions.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {step.questions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      )}
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">Select some pictures first.</p>
      ) : (
        <>
          <div className="space-y-3">
            {value.map((item, idx) => {
              const labelId = `img-desc-${idx}`;
              return (
                <Card key={`${item.library_id}-${idx}`} className="p-4">
                  <div className="flex gap-4">
                    <img
                      src={imgUrl(item.storage_path, 200, 200)}
                      alt={item.tag || `Picture ${idx + 1}`}
                      className="h-24 w-24 flex-shrink-0 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div id={labelId} className="text-sm font-semibold">
                        {item.tag || `Picture ${idx + 1}`}
                      </div>
                      <Textarea
                        rows={3}
                        value={item.description || ""}
                        onChange={(e) => updateDescription(idx, e.target.value)}
                        placeholder={step.descriptionPrompt}
                        aria-label={`Why "${item.tag || `picture ${idx + 1}`}" matters`}
                        aria-labelledby={labelId}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">
            {describedCount} of {value.length} described
          </p>
        </>
      )}
    </div>
  );
}

function RecapWidget({
  sessionId,
  recap,
  onRecap,
}: {
  sessionId: string;
  recap?: { html?: string };
  onRecap: (html: string, error: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const firedRef = useRef(false);
  useEffect(() => {
    if (recap?.html || firedRef.current) return;
    firedRef.current = true;
    setLoading(true);
    supabase.functions
      .invoke("coaching-activity-recap", { body: { session_id: sessionId } })
      .then(({ data, error }) => {
        if (error || !(data as any)?.recap_html) {
          onRecap(
            "<p>Let's pick up from where you are. On the next step, add what you want to make sure is part of your future.</p>",
            true,
          );
        } else {
          onRecap((data as any).recap_html, false);
        }
      })
      .catch(() =>
        onRecap(
          "<p>Let's pick up from where you are. On the next step, add what you want to make sure is part of your future.</p>",
          true,
        ),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recap?.html, sessionId]);

  if (loading && !recap?.html) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>Gathering the future you've been building…</p>
      </div>
    );
  }
  if (recap?.html) return <AiAnalysisPanel html={recap.html} />;
  return null;
}

function PrioritizePanel({
  items,
  selectExactly,
  title,
  prompt,
  helper,
  selected,
  onChange,
}: {
  items: string[];
  selectExactly: number;
  title?: string;
  prompt?: string;
  helper?: string;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  // Keep selection a subset of current items (drop stale, dedupe).
  useEffect(() => {
    const filtered = selected.filter((t) => items.includes(t));
    // Dedupe while preserving order.
    const seen = new Set<string>();
    const deduped = filtered.filter((t) => (seen.has(t) ? false : (seen.add(t), true)));
    if (
      deduped.length !== selected.length ||
      deduped.some((t, i) => t !== selected[i])
    ) {
      onChange(deduped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.join("\u0001")]);

  const selectedSet = new Set(selected);
  const atCap = selected.length >= selectExactly;

  const toggle = (text: string) => {
    if (selectedSet.has(text)) {
      // Remove all occurrences of this text from selection.
      const next = selected.filter((t) => t !== text);
      onChange(next);
      return;
    }
    if (atCap) return;
    // Preserve list order.
    const next = items.filter((t) => selectedSet.has(t) || t === text);
    // Ensure uniqueness in case items has dupes.
    const seen = new Set<string>();
    onChange(next.filter((t) => (seen.has(t) ? false : (seen.add(t), true))));
  };

  if (items.length === 0) return null;

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-3">
        {title && <h3 className="text-sm font-semibold">{title}</h3>}
        {prompt && <p className="text-sm text-muted-foreground">{prompt}</p>}
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
        <ul className="space-y-2">
          {items.map((text, i) => {
            const checked = selectedSet.has(text);
            const disabled = !checked && atCap;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => toggle(text)}
                  className={`w-full text-left flex items-start gap-2 rounded-md border p-2 text-sm transition ${
                    checked
                      ? "border-[var(--bw-orange)] bg-[var(--bw-orange)]/10"
                      : disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-muted"
                  }`}
                  aria-pressed={checked}
                  aria-disabled={disabled}
                >
                  <span
                    className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border ${
                      checked ? "border-[var(--bw-orange)] bg-[var(--bw-orange)] text-white" : "border-muted-foreground/40"
                    }`}
                  >
                    {checked ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className="flex-1">{text}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">
          {selected.length} of {selectExactly} chosen
          {atCap ? "" : ` — you can pick ${selectExactly}`}
        </p>
      </CardContent>
    </Card>
  );
}



function SuggestionPanel({
  sessionId,
  stepKey,
  suggest,
  existing,
  pending,
  onPendingChange,
  onAdd,
}: {
  sessionId: string;
  stepKey: string;
  suggest: { mode: string; buttonLabel?: string };
  existing: string[];
  pending: string[] | undefined;
  onPendingChange: (next: string[]) => void;
  onAdd: (text: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const firedRef = useRef(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("coaching-activity-suggest", {
        body: { session_id: sessionId, key: stepKey, exclude: [...existing, ...(pending || [])] },
      });
      const list =
        !error && Array.isArray((data as any)?.suggestions)
          ? ((data as any).suggestions as string[])
          : [];
      const merged = [...(pending || [])];
      for (const s of list) {
        if (!merged.some((m) => m.toLowerCase().trim() === s.toLowerCase().trim())) merged.push(s);
      }
      onPendingChange(merged);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (suggest.mode === "auto" && pending === undefined && !firedRef.current) {
      firedRef.current = true;
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggest.mode, pending]);

  const items = pending || [];

  if (suggest.mode === "auto" && loading && items.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Thinking of a few ideas…</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="rounded-md border border-dashed p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Suggested for you</p>
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <p className="flex-1 text-sm">{item}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onAdd(item);
                  onPendingChange(items.filter((_, j) => j !== i));
                }}
              >
                Add
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPendingChange(items.filter((_, j) => j !== i))}
              >
                Dismiss
              </Button>
            </div>
          ))}
        </div>
      )}
      {suggest.mode === "on_demand" && (
        <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {suggest.buttonLabel || "Suggest a few more"}
        </Button>
      )}
    </div>
  );
}

function ImageSelectWidget({
  step,
  value,
  onChange,
}: {
  step: Step;
  value: SelectedImage[];
  onChange: (next: SelectedImage[]) => void;
}) {
  const [images, setImages] = useState<LibraryImage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(step.pageSize ?? 12);
  const [dialogRow, setDialogRow] = useState<LibraryImage | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const softCap = step.softCap ?? 30;
  const selectMin = step.selectMin ?? 3;
  const pageSize = step.pageSize ?? 12;
  const maxLen = step.tagOnSelect?.maxLen ?? 40;
  const promptText = step.tagOnSelect?.prompt || "Add a short tag";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const category = step.source?.library;
      if (!category) {
        setError("No image library configured.");
        return;
      }
      const { data, error: err } = await supabase
        .from("coaching_media_library")
        .select("id, storage_path, alt")
        .eq("category", category)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (err) {
        setError("Couldn't load images.");
        return;
      }
      setImages((data || []) as LibraryImage[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [step.source?.library]);

  const selectedByPath = useMemo(() => {
    const m = new Map<string, SelectedImage>();
    (value || []).forEach((s) => m.set(s.storage_path, s));
    return m;
  }, [value]);

  const openFor = (row: LibraryImage) => {
    const existing = selectedByPath.get(row.storage_path);
    setTagDraft(existing?.tag || "");
    setDialogRow(row);
  };

  const closeDialog = () => {
    setDialogRow(null);
    setTagDraft("");
  };

  const saveDialog = () => {
    if (!dialogRow) return;
    const trimmed = tagDraft.trim();
    if (!trimmed) return;
    const existing = selectedByPath.get(dialogRow.storage_path);
    let next: SelectedImage[];
    if (existing) {
      next = (value || []).map((s) =>
        s.storage_path === dialogRow.storage_path ? { ...s, tag: trimmed } : s,
      );
    } else {
      next = [
        ...(value || []),
        { library_id: dialogRow.id, storage_path: dialogRow.storage_path, tag: trimmed },
      ];
    }
    onChange(next);
    closeDialog();
  };

  const removeSelected = (path: string) => {
    onChange((value || []).filter((s) => s.storage_path !== path));
  };

  const removeFromDialog = () => {
    if (!dialogRow) return;
    removeSelected(dialogRow.storage_path);
    closeDialog();
  };

  const count = (value || []).length;
  const overCap = count > softCap;

  return (
    <div className="space-y-4">
      {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}

      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Selected</p>
          <p className="text-xs text-muted-foreground">
            {count} selected · cap {softCap}
          </p>
        </div>
        {count === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing selected yet.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {(value || []).map((s) => (
              <div key={s.storage_path} className="relative">
                <img
                  src={imgUrl(s.storage_path, 400, 400)}
                  alt={s.tag}
                  loading="lazy"
                  className="h-20 w-20 rounded-md object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeSelected(s.storage_path)}
                  aria-label={`Remove ${s.tag}`}
                  className="absolute -right-1 -top-1 rounded-full bg-background p-0.5 shadow-sm ring-1 ring-border"
                >
                  <X className="h-3 w-3" />
                </button>
                <p className="mt-1 max-w-[5rem] truncate text-xs text-muted-foreground">{s.tag}</p>
              </div>
            ))}
          </div>
        )}
        {overCap && step.overCapNudge && (
          <p className="mt-2 text-sm text-destructive">
            {step.overCapNudge.replace("{n}", String(count))}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!images && !error && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading images…
        </div>
      )}

      {images && images.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {images.slice(0, visible).map((row) => {
              const sel = selectedByPath.get(row.storage_path);
              const isSel = !!sel;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openFor(row)}
                  aria-label={`${row.alt || "Image"}${isSel ? " (selected)" : ""}`}
                  className={`relative overflow-hidden rounded-md border transition ${
                    isSel ? "ring-2 ring-primary" : "hover:opacity-90"
                  }`}
                >
                  <img
                    src={imgUrl(row.storage_path, 400, 400)}
                    alt={row.alt || ""}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                  {isSel && (
                    <>
                      <span className="absolute right-1 top-1 rounded-full bg-primary p-0.5 text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                      {sel?.tag && (
                        <span className="absolute inset-x-0 bottom-0 truncate bg-background/85 px-1.5 py-0.5 text-left text-xs">
                          {sel.tag}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
          {visible < images.length && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVisible((v) => v + pageSize)}
              >
                Show more
              </Button>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Choose at least {selectMin}.
      </p>

      <Dialog open={!!dialogRow} onOpenChange={(o) => (!o ? closeDialog() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedByPath.get(dialogRow?.storage_path || "") ? "Edit tag" : "Add a tag"}</DialogTitle>
          </DialogHeader>
          {dialogRow && (
            <div className="space-y-3">
              <img
                src={imgUrl(dialogRow.storage_path, 800, 800)}
                alt={dialogRow.alt || ""}
                loading="lazy"
                className="max-h-[50vh] w-full rounded-md object-contain"
              />
              <div className="space-y-1">
                <Label htmlFor="image-tag">Your tag</Label>
                <Input
                  id="image-tag"
                  autoFocus
                  value={tagDraft}
                  maxLength={maxLen}
                  placeholder={promptText}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveDialog();
                    }
                  }}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {dialogRow && selectedByPath.get(dialogRow.storage_path) && (
                <Button variant="outline" onClick={removeFromDialog}>
                  Remove
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={closeDialog}>
                Cancel
              </Button>
              <Button onClick={saveDialog} disabled={!tagDraft.trim()}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SayingRow {
  id: string;
  text: string;
  author: string | null;
}

function TextSelectWidget({
  step,
  value,
  onChange,
}: {
  step: Step;
  value: SelectedSaying[];
  onChange: (next: SelectedSaying[]) => void;
}) {
  const [rows, setRows] = useState<SayingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogRow, setDialogRow] = useState<SayingRow | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const selectExactly = step.selectExactly ?? 3;
  const promptText = step.reflectOnSelect?.prompt || "Why does this resonate?";
  const maxLen = step.reflectOnSelect?.maxLen ?? 400;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const category = step.source?.library;
      if (!category) {
        setError("No saying library configured.");
        return;
      }
      const { data, error: err } = await supabase
        .from("coaching_saying_library")
        .select("id, text, author")
        .eq("category", category)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (err) {
        setError("Couldn't load sayings.");
        return;
      }
      setRows((data || []) as SayingRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [step.source?.library]);

  const selectedById = useMemo(() => {
    const m = new Map<string, SelectedSaying>();
    (value || []).forEach((s) => m.set(s.saying_id, s));
    return m;
  }, [value]);

  const openFor = (row: SayingRow) => {
    const existing = selectedById.get(row.id);
    setReasonDraft(existing?.description || "");
    setDialogRow(row);
  };

  const closeDialog = () => {
    setDialogRow(null);
    setReasonDraft("");
  };

  const saveDialog = () => {
    if (!dialogRow) return;
    const trimmed = reasonDraft.trim();
    if (!trimmed) return;
    const existing = selectedById.get(dialogRow.id);
    let next: SelectedSaying[];
    if (existing) {
      next = (value || []).map((s) =>
        s.saying_id === dialogRow.id ? { ...s, description: trimmed } : s,
      );
    } else {
      next = [
        ...(value || []),
        {
          saying_id: dialogRow.id,
          text: dialogRow.text,
          author: dialogRow.author,
          description: trimmed,
        },
      ];
    }
    onChange(next);
    closeDialog();
  };

  const removeSelected = (id: string) => {
    onChange((value || []).filter((s) => s.saying_id !== id));
  };

  const removeFromDialog = () => {
    if (!dialogRow) return;
    removeSelected(dialogRow.id);
    closeDialog();
  };

  const count = (value || []).length;
  const atCap = count >= selectExactly;

  return (
    <div className="space-y-4">
      {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}

      <p className="text-sm text-muted-foreground">
        {count} of {selectExactly} chosen
      </p>

      <div className="rounded-lg border p-3">
        <p className="text-xs font-medium text-muted-foreground">Chosen</p>
        {count === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing chosen yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {(value || []).map((s) => (
              <li key={s.saying_id} className="flex items-start gap-2 rounded-md border bg-muted/30 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{s.text}</p>
                  {s.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSelected(s.saying_id)}
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!rows && !error && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading sayings…
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map((row) => {
            const sel = selectedById.get(row.id);
            const isSel = !!sel;
            const disabled = !isSel && atCap;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => !disabled && openFor(row)}
                disabled={disabled}
                aria-label={`${row.text}${isSel ? " (selected)" : ""}`}
                className={`relative rounded-lg border p-3 text-left transition ${
                  isSel ? "ring-2 ring-primary" : "hover:bg-muted/40"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isSel && (
                  <span className="absolute right-2 top-2 rounded-full bg-primary p-0.5 text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <blockquote className="text-sm italic">{row.text}</blockquote>
                {row.author && (
                  <p className="mt-1 text-xs text-muted-foreground">— {row.author}</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {atCap && (
        <p className="text-xs text-muted-foreground">Choose three. Remove one to swap.</p>
      )}

      <Dialog open={!!dialogRow} onOpenChange={(o) => (!o ? closeDialog() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogRow && selectedById.get(dialogRow.id) ? "Edit your reason" : "Why this one?"}
            </DialogTitle>
          </DialogHeader>
          {dialogRow && (
            <div className="space-y-3">
              <blockquote className="rounded-md border bg-muted/30 p-3 text-sm italic">
                {dialogRow.text}
                {dialogRow.author && (
                  <span className="mt-1 block text-xs not-italic text-muted-foreground">
                    — {dialogRow.author}
                  </span>
                )}
              </blockquote>
              <div className="space-y-1">
                <Label htmlFor="saying-reason">{promptText}</Label>
                <Textarea
                  id="saying-reason"
                  autoFocus
                  rows={4}
                  maxLength={maxLen}
                  placeholder={promptText}
                  value={reasonDraft}
                  onChange={(e) => setReasonDraft(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {dialogRow && selectedById.get(dialogRow.id) && (
                <Button variant="outline" onClick={removeFromDialog}>
                  Remove
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={closeDialog}>
                Cancel
              </Button>
              <Button onClick={saveDialog} disabled={!reasonDraft.trim()}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContentWidget({
  step,
  value,
  onChange,
}: {
  step: Step;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}
      {step.body && <p className="whitespace-pre-wrap text-sm leading-relaxed">{step.body}</p>}
      {step.media?.type === "image" && step.media.src && (
        <figure className="space-y-1">
          <img
            src={step.media.src}
            alt={step.media.alt || ""}
            loading="lazy"
            className="w-full rounded-md object-cover"
          />
          {step.media.caption && (
            <figcaption className="text-xs text-muted-foreground">{step.media.caption}</figcaption>
          )}
        </figure>
      )}
      {step.statements && step.statements.length > 0 && (
        <ul className="space-y-2">
          {step.statements.map((s, i) => (
            <li key={i} className="rounded-md border bg-muted/30 p-3 text-sm">
              {s}
            </li>
          ))}
        </ul>
      )}
      {step.reflection && step.key && (
        <div className="space-y-2">
          {step.reflection.prompt && <Label>{step.reflection.prompt}</Label>}
          <Textarea
            rows={step.reflection.minRows ?? 4}
            placeholder={step.reflection.placeholder || "Type here…"}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}


// ---- qa_multimodal widget ----
type QaAnswer = {
  mode: "text" | "dictate" | "audio" | "video";
  text?: string;
  media_id?: string;
  skipped?: boolean;
};

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

function MediaRecorderPane({
  kind,
  onConfirm,
  uploading,
  disabled,
}: {
  kind: "audio" | "video";
  onConfirm: (blob: Blob) => void;
  uploading: boolean;
  disabled?: boolean;
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

function DictateButton({ onFinal, disabled }: { onFinal: (text: string) => void; disabled?: boolean }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const supported =
    typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  if (!supported) return null;
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
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch { setListening(false); }
  };
  return (
    <Button
      type="button"
      variant={listening ? "default" : "outline"}
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

function QaMultimodalWidget({
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
      const { data, error } = await supabase.functions.invoke("coaching-response-upload", {
        body: {
          coaching_session_id: sessionId,
          activity_code: activityCode,
          question_key: q.key,
          kind,
        },
      });
      if (error) throw new Error(error.message);
      const { upload_url, media_id } = (data || {}) as { upload_url: string; upload_id?: string; media_id: string };
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


// ---- Main page ----

export default function CoachingActivityRunner() {
  const { activityId } = useParams<{ activityId: string }>();
  const [search] = useSearchParams();
  const forceFresh = search.get("fresh") === "1";
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [waitingForTranscripts, setWaitingForTranscripts] = useState(false);
  const [coachingRemaining, setCoachingRemaining] = useState<number | null>(null);

  const [coachUserId, setCoachUserId] = useState<string | null>(null);
  const [existingShare, setExistingShare] = useState<{ id: string; mode: string } | null>(null);
  const [alwaysShare, setAlwaysShare] = useState(false);

  const freshHandledRef = useRef(false);

  // Load activity + session
  useEffect(() => {
    if (!user || !activityId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: act } = await supabase
        .from("coaching_activities")
        .select("id,code,title,tier,definition")
        .eq("id", activityId)
        .maybeSingle();
      if (cancelled) return;
      if (!act) {
        toast.error("Activity not found");
        navigate("/coaching");
        return;
      }
      setActivity(act as Activity);

      // Check access
      const { data: accData } = await supabase.rpc("coaching_activity_access", {
        p_activity_id: activityId,
      });
      const accRow = Array.isArray(accData) ? accData[0] : (accData as any);
      if (!accRow?.allowed) {
        toast.error("You don't have access to this activity.");
        navigate("/coaching");
        return;
      }

      // Find or create session
      let s: Session | null = null;
      const doFresh = forceFresh && !freshHandledRef.current;
      if (!forceFresh) {
        const { data: existing } = await supabase
          .from("coaching_activity_sessions")
          .select("*")
          .eq("user_id", user.id)
          .eq("activity_id", activityId)
          .eq("status", "in_progress")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing) s = existing as Session;
      } else if (doFresh) {
        freshHandledRef.current = true;
        // Abandon any prior in-progress sessions for a clean restart
        await supabase
          .from("coaching_activity_sessions")
          .update({ status: "abandoned" })
          .eq("user_id", user.id)
          .eq("activity_id", activityId)
          .eq("status", "in_progress");
      } else {
        // forceFresh already handled this mount; do not abandon or create again
        return;
      }
      if (!s) {
        const { data: created } = await supabase
          .from("coaching_activity_sessions")
          .insert({
            user_id: user.id,
            activity_id: activityId,
            status: "in_progress",
            current_step: 0,
            responses: {},
          })
          .select("*")
          .single();
        s = created as Session;
      }
      if (cancelled) return;
      setSession(s);
      setLoading(false);
      if (doFresh) {
        navigate(`/coaching/${activityId}`, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, activityId, forceFresh, navigate]);

  // Load coach info + existing share
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cc } = await supabase
        .from("coach_clients")
        .select("coach_user_id")
        .eq("client_user_id", user.id)
        .limit(1)
        .maybeSingle();
      const cid = cc?.coach_user_id || null;
      setCoachUserId(cid);
      if (!cid) return;
      const { data: shares } = await supabase
        .from("coaching_activity_shares")
        .select("id,mode,revoked_at")
        .eq("owner_user_id", user.id)
        .eq("viewer_user_id", cid)
        .is("revoked_at", null);
      const always = (shares || []).find((s: any) => s.mode === "always");
      const snap = (shares || []).find((s: any) => s.mode === "snapshot");
      setAlwaysShare(!!always);
      setExistingShare(always || snap ? { id: (always || snap).id, mode: (always || snap).mode } : null);
    })();
  }, [user]);

  const steps: Step[] = useMemo(() => {
    const s = activity?.definition?.steps;
    return Array.isArray(s) ? s : [];
  }, [activity]);

  const responses = session?.responses || {};
  const currentStep = session?.current_step ?? 0;

  useDebouncedSave(session?.id ?? null, currentStep, responses);

  const setResponses = useCallback(
    (updater: (prev: Responses) => Responses) => {
      setSession((prev) => (prev ? { ...prev, responses: updater(prev.responses || {}) } : prev));
    },
    [],
  );

  const setStep = useCallback((n: number) => {
    setSession((prev) => (prev ? { ...prev, current_step: n } : prev));
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!session) return false;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("coaching-activity-analyze", {
        body: { session_id: session.id },
      });
      if (error) {
        const status = (error as any).context?.status;
        if (status === 402) {
          toast.error("You've used your coaching runs.", {
            description: "Upgrade for more.",
            action: { label: "Upgrade", onClick: () => (window.location.href = "/pricing") },
          });
        } else if (status === 403) {
          toast.error("Access denied for this activity.");
        } else {
          toast.error("Analysis failed. Please try again.");
        }
        return false;
      }
      const html = (data as any)?.analysis_html || "";
      const remaining = (data as any)?.coaching_remaining;
      if (typeof remaining === "number") setCoachingRemaining(remaining);
      setResponses((r) => ({ ...r, analysis: { ...(r.analysis || {}), html } }));
      return true;
    } finally {
      setAnalyzing(false);
    }
  }, [session, setResponses]);

  const finish = useCallback(async () => {
    if (!session) return;
    await supabase
      .from("coaching_activity_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        current_step: currentStep,
      })
      .eq("id", session.id);
    setSession((prev) =>
      prev ? { ...prev, status: "completed", completed_at: new Date().toISOString() } : prev,
    );
    // Fire and forget
    supabase.functions
      .invoke("coaching-activity-summary", { body: { session_id: session.id } })
      .catch(() => {});
    toast.success("Coaching activity completed.");
  }, [session, currentStep, responses]);

  const restart = useCallback(
    async (reuseAnswers: boolean) => {
      if (!session || !user || !activityId) return;
      const base: Responses = reuseAnswers
        ? (() => {
            const { analysis, chat, ...rest } = session.responses || {};
            return rest as Responses;
          })()
        : {};
      // Abandon the current session before starting a new one
      await supabase
        .from("coaching_activity_sessions")
        .update({ status: "abandoned" })
        .eq("id", session.id);
      const { data: created } = await supabase
        .from("coaching_activity_sessions")
        .insert({
          user_id: user.id,
          activity_id: activityId,
          status: "in_progress",
          current_step: 0,
          responses: base as any,
          parent_session_id: session.id,
        })
        .select("*")
        .single();
      if (created) {
        setSession(created as Session);
      }
    },
    [session, user, activityId],
  );

  const shareSnapshot = useCallback(async () => {
    if (!user || !coachUserId) return;
    const { data, error } = await supabase
      .from("coaching_activity_shares")
      .insert({
        owner_user_id: user.id,
        viewer_user_id: coachUserId,
        mode: "snapshot",
      })
      .select("id,mode")
      .single();
    if (error) {
      toast.error("Couldn't share with your coach.");
      return;
    }
    setExistingShare({ id: data.id, mode: data.mode });
    toast.success("Shared with your coach.");
  }, [user, coachUserId]);

  const toggleAlwaysShare = useCallback(
    async (checked: boolean) => {
      if (!user || !coachUserId) return;
      setAlwaysShare(checked);
      if (checked) {
        // Look for existing revoked or non-existent
        const { data: existing } = await supabase
          .from("coaching_activity_shares")
          .select("id")
          .eq("owner_user_id", user.id)
          .eq("viewer_user_id", coachUserId)
          .eq("mode", "always")
          .maybeSingle();
        if (existing) {
          await supabase
            .from("coaching_activity_shares")
            .update({ revoked_at: null, granted_at: new Date().toISOString() })
            .eq("id", existing.id);
        } else {
          await supabase.from("coaching_activity_shares").insert({
            owner_user_id: user.id,
            viewer_user_id: coachUserId,
            mode: "always",
          });
        }
      } else {
        await supabase
          .from("coaching_activity_shares")
          .update({ revoked_at: new Date().toISOString() })
          .eq("owner_user_id", user.id)
          .eq("viewer_user_id", coachUserId)
          .eq("mode", "always")
          .is("revoked_at", null);
      }
    },
    [user, coachUserId],
  );

  if (loading || !activity || !session) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const isCompleted = session.status === "completed";
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  // Determine whether "Next" is allowed based on current step's data
  const canAdvance = (() => {
    if (!step) return false;
    if (step.widget === "textarea") {
      const v = (responses[step.key || ""] as string) || "";
      return v.trim().length > 0;
    }
    if (step.widget === "list_builder") {
      const arr = (responses[step.key || ""] as string[]) || [];
      const listOk = arr.length >= (step.min ?? 0) && arr.every((x) => x.trim().length > 0);
      if (step.prioritize) {
        const picks = (responses[step.prioritize.priorityKey] as string[]) || [];
        return listOk && picks.length === step.prioritize.selectExactly;
      }
      return listOk;
    }
    if (step.widget === "risk_blocks") {
      const negs = (responses.negatives || []) as Negative[];
      if (!(step.subfields && step.subfields.length > 0)) {
        return negs.length > 0;
      }
      return negs.every((n) => step.subfields!.every((sf) => ((n as any)[sf] || "").trim().length > 0));
    }
    if (step.widget === "ai_panel") return !!responses.analysis?.html;
    if (step.widget === "synthesis") return true;
    if (step.widget === "image_select") {
      const sel = (responses[step.key || ""] as SelectedImage[]) || [];
      return sel.length >= (step.selectMin ?? 1) && sel.length <= (step.softCap ?? 30);
    }
    if (step.widget === "text_select") {
      const sel = (responses[step.key || ""] as SelectedSaying[]) || [];
      const need = step.selectExactly ?? 3;
      return sel.length === need && sel.every((s) => (s.description || "").trim().length > 0);
    }
    if (step.widget === "content") {
      if (step.reflection && step.reflection.optional === false && step.key) {
        return ((responses[step.key] as string) || "").trim().length > 0;
      }
      return true;
    }
    if (step.widget === "image_describe") {
      const items = (responses[step.fromKey || ""] as SelectedImage[]) || [];
      if (items.length === 0) return false;
      const need = step.minDescribed ?? items.length;
      const done = items.filter((it) => (it.description || "").trim().length > 0).length;
      return done >= need;
    }
    if (step.widget === "recap") return !!(responses.recap as { html?: string } | undefined)?.html;
    if (step.widget === "qa_multimodal") {
      const qs = (step.questions as Array<{ key: string }>) || [];
      const bag = (responses[step.key || ""] as Record<string, QaAnswer>) || {};
      return qs.every((qq) => {
        const a = bag[qq.key];
        return !!a && (a.skipped || !!a.text?.trim() || !!a.media_id);
      });
    }
    return true;
  })();

  const goNext = async () => {
    const isRiskDetail =
      step?.widget === "risk_blocks" && (step.subfields?.length ?? 0) > 0;
    const wantsAnalysis = isRiskDetail || step?.onComplete?.touchpoint === "analysis";
    if (step?.widget === "qa_multimodal" && wantsAnalysis && session) {
      const bag = (responses[step.key || ""] as Record<string, QaAnswer>) || {};
      const recordedKeys = Object.entries(bag)
        .filter(([, a]) => !a.skipped && !!a.media_id)
        .map(([k]) => k);
      if (recordedKeys.length > 0) {
        setWaitingForTranscripts(true);
        const deadline = Date.now() + 75_000;
        while (Date.now() < deadline) {
          const { data } = await supabase
            .from("coaching_response_media")
            .select("question_key, transcript_status")
            .eq("coaching_session_id", session.id);
          const rows = (data || []) as Array<{ question_key: string; transcript_status: string | null }>;
          const done = recordedKeys.every((qk) => {
            const st = rows.find((r) => r.question_key === qk)?.transcript_status;
            return st === "ready" || st === "failed";
          });
          if (done) break;
          await new Promise((r) => setTimeout(r, 2500));
        }
        setWaitingForTranscripts(false);
      }
    }
    if (wantsAnalysis && !responses.analysis?.html) {
      if (session) {
        await supabase.rpc("coaching_session_save", {
          p_session_id: session.id,
          p_current_step: currentStep,
          p_patch: buildUserPatch(responses) as any,
        });
      }
      const ok = await runAnalysis();
      if (!ok) return;
    }
    setStep(Math.min(currentStep + 1, steps.length - 1));
  };


  const goBack = () => setStep(Math.max(currentStep - 1, 0));

  const stepTitle = (s: Step) => {
    if (s.title) return s.title;
    if (s.widget === "textarea" && s.key === "action") return "What's the action you're considering?";
    if (s.widget === "list_builder" && s.key === "positives") return "What good could come of it?";
    if (s.widget === "textarea" && s.key === "positiveAction") return "How will you make the positives more likely?";
    if (s.widget === "risk_blocks" && (s.subfields?.length ?? 0) === 0) return "What could go wrong?";
    if (s.widget === "risk_blocks") return "For each risk: Prevent / In the moment / Recover";
    if (s.widget === "ai_panel") return "Your coaching plan";
    if (s.widget === "synthesis") return "Summary";
    return `Step ${currentStep + 1}`;
  };

  return (
    <div className="container mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/coaching")}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {activity.tier && <Badge variant="outline">{activity.tier}</Badge>}
        {coachingRemaining !== null && coachingRemaining >= 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {coachingRemaining} runs left
          </span>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-semibold">{activity.title}</h1>
        {!isCompleted && steps.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </p>
        )}
      </div>

      {isCompleted ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Completed</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {(() => {
                const imgStep = steps.find((s) => s.widget === "image_select" && s.key);
                const items = imgStep ? ((responses[imgStep.key!] as SelectedImage[]) || []) : [];
                if (!imgStep || items.length === 0) return null;
                return (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Your pictures</h3>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                      {items.map((s) => (
                        <figure key={s.storage_path} className="space-y-1">
                          <img
                            src={imgUrl(s.storage_path, 400, 400)}
                            alt={s.tag}
                            loading="lazy"
                            className="aspect-square w-full rounded-md object-cover"
                          />
                          <figcaption className="truncate text-xs text-muted-foreground">
                            {s.tag}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <SynthesisView responses={responses} steps={steps} />
              {responses.analysis?.html && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    Your coaching plan
                  </h3>
                  <AiAnalysisPanel html={responses.analysis.html} />
                </div>
              )}
              {responses.chat && responses.chat.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Conversation</h3>
                  <ChatTranscript chat={responses.chat} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Next steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => restart(false)}>Start fresh</Button>
                <Button variant="outline" onClick={() => restart(true)}>Reuse my answers</Button>
              </div>
              {coachUserId && (
                <div className="space-y-3 border-t pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={shareSnapshot} disabled={!!existingShare}>
                      <Share2 className="h-4 w-4" />
                      {existingShare ? "Shared" : "Share with my coach"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label htmlFor="always-share">Always share my coaching with my coach</Label>
                      <p className="text-xs text-muted-foreground">
                        New completed activities will be shared automatically.
                      </p>
                    </div>
                    <Switch
                      id="always-share"
                      checked={alwaysShare}
                      onCheckedChange={toggleAlwaysShare}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{stepTitle(step)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analyzing && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating your coaching plan…
              </div>
            )}

            {step?.widget === "textarea" && (
              <TextareaWidget
                step={step}
                value={(responses[step.key || ""] as string) || ""}
                onChange={(v) =>
                  setResponses((r) => ({ ...r, [step.key || "text"]: v }))
                }
              />
            )}

            {step?.widget === "list_builder" && (
              <ListBuilderWidget
                step={step}
                items={(responses[step.key || ""] as string[]) || []}
                onChange={(v) =>
                  setResponses((r) => ({ ...r, [step.key || "items"]: v }))
                }
              />
            )}

            {step?.widget === "list_builder" && step.suggest && step.key && (
              <SuggestionPanel
                sessionId={session.id}
                stepKey={step.key}
                suggest={step.suggest}
                existing={(responses[step.key] as string[]) || []}
                pending={(responses._suggest as any)?.[step.key]}
                onPendingChange={(next) =>
                  setResponses((r) => ({
                    ...r,
                    _suggest: { ...((r._suggest as any) || {}), [step.key!]: next },
                  }))
                }
                onAdd={(text) =>
                  setResponses((r) => ({
                    ...r,
                    [step.key!]: [...((r[step.key!] as string[]) || []), text],
                  }))
                }
              />
            )}

            {step?.widget === "list_builder" && step.prioritize && step.key && (
              <PrioritizePanel
                items={(responses[step.key] as string[]) || []}
                selectExactly={step.prioritize.selectExactly}
                title={step.prioritize.title}
                prompt={step.prioritize.prompt}
                helper={step.prioritize.helper}
                selected={(responses[step.prioritize.priorityKey] as string[]) || []}
                onChange={(next) =>
                  setResponses((r) => ({ ...r, [step.prioritize!.priorityKey]: next }))
                }
              />
            )}

            {step?.widget === "risk_blocks" && (
              <>
                {(step.subfields?.length ?? 0) > 0 && responses.positives && responses.positives.length > 0 && (
                  <Card className="bg-muted/30">
                    <CardContent className="p-3">
                      <p className="text-xs font-medium text-muted-foreground">Your measure of success</p>
                      <ul className="mt-1 list-disc pl-5 text-sm">
                        {responses.positives.map((v, i) => (
                          <li key={i}>{v}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                <RiskBlocksWidget
                  step={step}
                  items={(responses.negatives as Negative[]) || []}
                  onChange={(v) => setResponses((r) => ({ ...r, negatives: v }))}
                />
              </>
            )}

            {step?.widget === "risk_blocks" && step.suggest && (step.subfields?.length ?? 0) === 0 && step.key && (
              <SuggestionPanel
                sessionId={session.id}
                stepKey={step.key}
                suggest={step.suggest}
                existing={((responses.negatives as Negative[]) || []).map((n) => n.text).filter(Boolean)}
                pending={(responses._suggest as any)?.[step.key]}
                onPendingChange={(next) =>
                  setResponses((r) => ({
                    ...r,
                    _suggest: { ...((r._suggest as any) || {}), [step.key!]: next },
                  }))
                }
                onAdd={(text) =>
                  setResponses((r) => ({
                    ...r,
                    negatives: [...((r.negatives as Negative[]) || []), { text }],
                  }))
                }
              />
            )}

            {step?.widget === "ai_panel" && (
              <div className="space-y-4">
                <AiAnalysisPanel html={responses.analysis?.html} />
                {step.chat && (
                  <ChatWidget
                    sessionId={session.id}
                    chat={(responses.chat as ChatMsg[]) || []}
                    onChat={(next) => setResponses((r) => ({ ...r, chat: next }))}
                    onRemainingChange={(n) => n !== null && setCoachingRemaining(n)}
                  />
                )}
              </div>
            )}

            {step?.widget === "synthesis" && <SynthesisView responses={responses} steps={steps} />}

            {step?.widget === "image_select" && step.key && (
              <ImageSelectWidget
                step={step}
                value={(responses[step.key] as SelectedImage[]) || []}
                onChange={(v) => setResponses((r) => ({ ...r, [step.key!]: v }))}
              />
            )}

            {step?.widget === "text_select" && step.key && (
              <TextSelectWidget
                step={step}
                value={(responses[step.key] as SelectedSaying[]) || []}
                onChange={(v) => setResponses((r) => ({ ...r, [step.key!]: v }))}
              />
            )}

            {step?.widget === "content" && (
              <ContentWidget
                step={step}
                value={step.key ? ((responses[step.key] as string) || "") : ""}
                onChange={(v) => {
                  if (!step.key) return;
                  setResponses((r) => ({ ...r, [step.key!]: v }));
                }}
              />
            )}

            {step?.widget === "image_describe" && (
              <ImageDescribeWidget
                step={step}
                value={(responses[step.fromKey || ""] as SelectedImage[]) || []}
                onChange={(v) => setResponses((r) => ({ ...r, [step.fromKey!]: v }))}
              />
            )}

            {step?.widget === "recap" && (
              <RecapWidget
                sessionId={session.id}
                recap={responses.recap as { html?: string } | undefined}
                onRecap={(html, error) =>
                  setResponses((r) => ({ ...r, recap: { ...((r.recap as any) || {}), html, error } }))
                }
              />)}

            {step?.widget === "qa_multimodal" && step.key && (
              <QaMultimodalWidget
                step={step}
                sessionId={session.id}
                activityCode={activity.code || ""}
                value={(responses[step.key] as Record<string, QaAnswer>) || {}}
                onChange={(next) => setResponses((r) => ({ ...r, [step.key!]: next }))}
              />
            )}

            {waitingForTranscripts && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Putting your story together…
              </div>
            )}





            {/* Also show positives for step 3 (positiveAction) */}
            {step?.widget === "textarea" &&
              step.key === "positiveAction" &&
              responses.positives &&
              responses.positives.length > 0 && (
                <Card className="bg-muted/30">
                  <CardContent className="p-3">
                    <p className="text-xs font-medium text-muted-foreground">Your measure of success</p>
                    <ul className="mt-1 list-disc pl-5 text-sm">
                      {responses.positives.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
          </CardContent>
        </Card>
      )}

      {!isCompleted && (
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={goBack} disabled={currentStep === 0}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {isLast ? (
            <Button onClick={finish} disabled={!canAdvance}>
              <CheckCircle2 className="h-4 w-4" />
              Finish
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!canAdvance || analyzing || waitingForTranscripts}>
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
