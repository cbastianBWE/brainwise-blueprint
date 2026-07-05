import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft, ArrowRight, Plus, Trash2, Send, Share2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
const USER_INPUT_KEYS = ["action", "positives", "positiveAction", "negatives"] as const;

function buildUserPatch(responses: Responses): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const k of USER_INPUT_KEYS) {
    if (responses[k] !== undefined) patch[k] = responses[k];
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
            placeholder="Add a risk or concern…"
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

  const labels: Record<string, string> = {
    a: "Prevent",
    b: "In the moment",
    c: "Recover",
  };
  const helpers: Record<string, string> = {
    a: "How you can reduce the chance this happens.",
    b: "What you'll do if it starts to happen.",
    c: "How you'll recover if it does happen.",
  };

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
                <Label>{labels[sf] || sf}</Label>
                <p className="text-xs text-muted-foreground">{helpers[sf] || ""}</p>
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

function AiAnalysisPanel({ html }: { html?: string }) {
  if (!html) return null;
  const clean = DOMPurify.sanitize(html, {
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

function SynthesisView({ responses }: { responses: Responses }) {
  return (
    <div className="space-y-6">
      {responses.action && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">Your action</h3>
          <p className="mt-1 text-sm">{responses.action}</p>
        </div>
      )}
      {responses.positiveAction && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">Positive action</h3>
          <p className="mt-1 text-sm">{responses.positiveAction}</p>
        </div>
      )}
      {(responses.positives || []).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">Goals</h3>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {responses.positives!.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {(responses.negatives || []).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Safeguards</h3>
          {responses.negatives!.map((n, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{n.text}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {n.a && (
                  <div>
                    <span className="font-medium">Prevent: </span>
                    {n.a}
                  </div>
                )}
                {n.b && (
                  <div>
                    <span className="font-medium">In the moment: </span>
                    {n.b}
                  </div>
                )}
                {n.c && (
                  <div>
                    <span className="font-medium">Recover: </span>
                    {n.c}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
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
      } else {
        // Abandon any prior in-progress sessions for a clean restart
        await supabase
          .from("coaching_activity_sessions")
          .update({ status: "abandoned" })
          .eq("user_id", user.id)
          .eq("activity_id", activityId)
          .eq("status", "in_progress");
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
    return true;
  })();

  const goNext = async () => {
    // Trigger analysis when leaving the last risk_blocks step with subfields (step 5)
    const isRiskDetail =
      step?.widget === "risk_blocks" && (step.subfields?.length ?? 0) > 0;
    if (isRiskDetail && !responses.analysis?.html) {
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
              <SynthesisView responses={responses} />
              {responses.analysis?.html && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    Your coaching plan
                  </h3>
                  <AiAnalysisPanel html={responses.analysis.html} />
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

            {step?.widget === "synthesis" && <SynthesisView responses={responses} />}

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
