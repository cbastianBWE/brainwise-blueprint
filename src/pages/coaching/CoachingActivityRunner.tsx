import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft, ArrowRight, Plus, Trash2, Send, Share2, CheckCircle2, Check, X } from "lucide-react";
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
import { SynthesisView, AiAnalysisPanel, ChatTranscript } from "@/components/coaching/CoachingViews";

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
  questions?: string[];
  descriptionPrompt?: string;
  minDescribed?: number;
  subfieldLabels?: Record<string, string>;
  subfieldHelpers?: Record<string, string>;
  // text_select
  selectExactly?: number;
  reflectOnSelect?: { modal?: boolean; prompt?: string; maxLen?: number };
}

interface SelectedSaying {
  saying_id: string;
  text: string;
  author: string | null;
  description: string;
}

interface Activity {
  id: string;
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
        .select("id,title,tier,definition")
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
      return arr.length >= (step.min ?? 0) && arr.every((x) => x.trim().length > 0);
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
    return true;
  })();

  const goNext = async () => {
    const isRiskDetail =
      step?.widget === "risk_blocks" && (step.subfields?.length ?? 0) > 0;
    const wantsAnalysis = isRiskDetail || step?.onComplete?.touchpoint === "analysis";
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

            {step?.widget === "risk_blocks" && (
              <>
                {(step.subfields?.length ?? 0) > 0 && responses.positives && responses.positives.length > 0 && (
                  <Card className="bg-muted/30">
                    <CardContent className="p-3">
                      <p className="text-xs font-medium text-muted-foreground">Your goals</p>
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



            {/* Also show positives for step 3 (positiveAction) */}
            {step?.widget === "textarea" &&
              step.key === "positiveAction" &&
              responses.positives &&
              responses.positives.length > 0 && (
                <Card className="bg-muted/30">
                  <CardContent className="p-3">
                    <p className="text-xs font-medium text-muted-foreground">Your positives</p>
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
            <Button onClick={goNext} disabled={!canAdvance || analyzing}>
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
