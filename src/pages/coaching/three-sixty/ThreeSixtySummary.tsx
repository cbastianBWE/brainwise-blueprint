// The 360 summary. Two overall scopes, rendered as two separate sections and
// never merged: six of the fourteen questions are about the team, not the
// subject. Nothing here is ever attributed to a named person.
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CoachingRecordingPlayer } from "@/components/coaching/CoachingViews";
import type { ThreeSixtyQuestion } from "./AnswerFlow";

interface Theme {
  title?: string;
  body?: string;
}
// Exactly what three-sixty-summarise v2 writes. No other shape is handled.
interface OverallContent {
  themes?: Theme[];
  strengths?: Theme[];
  opportunities?: Theme[];
}

interface SummaryRow {
  scope: string;
  question_key: string | null;
  content: any;
}

function ThemeList({ items }: { items: Theme[] }) {
  return (
    <div className="space-y-3">
      {items.map((t, i) => (
        <div key={i} className="rounded-xl border-l-4 bg-background p-4" style={{ borderLeftColor: "var(--bw-orange)" }}>
          {t.title && <div className="text-sm font-semibold">{t.title}</div>}
          {t.body && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{t.body}</p>}
        </div>
      ))}
    </div>
  );
}

function SelfAnswer({ answer }: { answer: any }) {
  if (!answer) return <p className="text-sm text-muted-foreground">You did not answer this one.</p>;
  if (typeof answer.value === "number") return <p className="text-sm">You said {answer.value}.</p>;
  if (answer.media_id) {
    return (
      <div className="rounded-md border bg-background p-2">
        <CoachingRecordingPlayer mediaId={answer.media_id} />
      </div>
    );
  }
  if (typeof answer.text === "string") {
    return <p className="text-sm whitespace-pre-wrap">{answer.text}</p>;
  }
  return null;
}

export function ThreeSixtySummary({
  cycleId,
  sessionId,
  canAddToPlan = true,
  viewerIsCoach = false,
}: {
  cycleId: string;
  sessionId?: string | null;
  canAddToPlan?: boolean;
  viewerIsCoach?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [questions, setQuestions] = useState<ThreeSixtyQuestion[]>([]);
  const [selfAnswers, setSelfAnswers] = useState<Record<string, any>>({});
  const [addedKeys, setAddedKeys] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState<string | null>(null);
  const rolledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: sums } = await supabase
        .from("three_sixty_summaries")
        .select("scope, question_key, content")
        .eq("cycle_id", cycleId);
      // The subject's own answers, so the self-against-others comparison shows.
      const { data: sub } = await supabase
        .from("three_sixty_submissions")
        .select("id")
        .eq("cycle_id", cycleId)
        .eq("is_self", true)
        .maybeSingle();
      let qs: ThreeSixtyQuestion[] = [];
      const answers: Record<string, any> = {};
      if (sub?.id) {
        const [{ data: qdata }, { data: rdata }] = await Promise.all([
          supabase.rpc("bw_360_question_set", { p_submission: sub.id }),
          supabase.from("three_sixty_responses").select("question_key, answer").eq("submission_id", sub.id),
        ]);
        qs = ((qdata || []) as any[]) as ThreeSixtyQuestion[];
        for (const r of (rdata || []) as any[]) answers[r.question_key] = r.answer;
      }
      if (cancelled) return;
      setRows((sums || []) as SummaryRow[]);
      setQuestions(qs);
      setSelfAnswers(answers);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [cycleId]);

  // Folds the 360's themes into the rolling coaching summary. Fire and forget.
  useEffect(() => {
    if (!sessionId || rolledRef.current || loading || rows.length === 0) return;
    rolledRef.current = true;
    supabase.functions
      .invoke("coaching-activity-summary", { body: { session_id: sessionId } })
      .catch((e) => console.error("[360] rolling summary update failed", e));
  }, [sessionId, loading, rows.length]);

  const client = useMemo(
    () => (rows.find((r) => r.scope === "overall_client")?.content || {}) as OverallContent,
    [rows],
  );
  const team = useMemo(
    () => (rows.find((r) => r.scope === "overall_team")?.content || {}) as OverallContent,
    [rows],
  );
  const perQuestion = useMemo(() => {
    const map: Record<string, any> = {};
    for (const r of rows) if (r.scope === "question" && r.question_key) map[r.question_key] = r.content;
    return map;
  }, [rows]);

  const addToPlan = async (item: Theme) => {
    const key = (item.title || "") + (item.body || "");
    setAdding(key);
    const action = [item.title, item.body].filter(Boolean).join(": ");
    const { data, error } = await supabase.rpc("bw_360_add_plan_items", {
      p_cycle: cycleId,
      p_items: [{ action_text: action, card_title: "From your 360", dimension_tags: [] }] as never,
    });
    setAdding(null);
    if (error) {
      toast.error("That could not be added to your plan.");
      return;
    }
    const res = (data || {}) as { ok?: boolean; error?: string; added?: number };
    if (!res.ok) {
      toast.error(res.error === "no_summary_yet" ? "There is no summary yet." : "That could not be added.");
      return;
    }
    setAddedKeys((prev) => ({ ...prev, [key]: true }));
    toast.success(res.added ? "Added to your development plan." : "Already on your plan.");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your 360…
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Your summary is not available yet.</p>;
  }

  const opportunities = Array.isArray(client.opportunities) ? client.opportunities : [];
  const strengths = Array.isArray(client.strengths) ? client.strengths : [];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">What came back about you</h3>
        {Array.isArray(client.themes) && client.themes.length > 0 && <ThemeList items={client.themes} />}

        {strengths.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-semibold">What people said you do well</h4>
            {/* Strengths are read only. The plan button belongs to opportunities. */}
            <ThemeList items={strengths} />
          </div>
        )}

        {opportunities.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-semibold">Development opportunities</h4>
            {opportunities.map((o, i) => {
              const key = (o.title || "") + (o.body || "");
              const done = !!addedKeys[key];
              return (
                <Card key={i} className="space-y-2 p-4">
                  {o.title && <div className="text-sm font-semibold">{o.title}</div>}
                  {o.body && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{o.body}</p>}
                  {canAddToPlan && !viewerIsCoach && (
                    <Button
                      type="button"
                      size="sm"
                      variant={done ? "outline" : "default"}
                      disabled={adding === key || done}
                      onClick={() => addToPlan(o)}
                    >
                      {adding === key ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : done ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {done ? "On your plan" : "Add to my development plan"}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {Array.isArray(team.themes) && team.themes.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">What came back about the team</h3>
          <p className="text-sm text-muted-foreground">
            These themes are about the team, not about you.
          </p>
          <ThemeList items={team.themes} />
        </section>
      ) : null}

      {questions.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Question by question</h3>
          {questions.map((q) => {
            const content = perQuestion[q.question_key];
            // The summariser writes { themes: [{title, body}] }, and q01 gets no row.
            const themes: Theme[] = Array.isArray(content?.themes) ? content.themes : [];
            if (themes.length === 0 && (viewerIsCoach || !selfAnswers[q.question_key])) return null;
            return (
              <Card key={q.question_key} className="space-y-3 p-4">
                <p className="text-sm font-medium whitespace-pre-wrap">{q.prompt}</p>
                {themes.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">What others said</div>
                    <div className="mt-1">
                      <ThemeList items={themes} />
                    </div>
                  </div>
                )}
                {/* A practitioner never sees anyone's individual answer, the subject's included. */}
                {!viewerIsCoach && (
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Your own answer</div>
                    <div className="mt-1">
                      <SelfAnswer answer={selfAnswers[q.question_key]} />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default ThreeSixtySummary;
