import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, ArrowLeft, ArrowRight, Eye, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatWidget } from "@/pages/coaching/runner/widgets/ChatWidget";
import type { ChatMsg } from "@/pages/coaching/runner/shared";
import { widgetRegistry, UnknownWidget } from "./runner/widgetRegistry";
import { type CoupleContext, type CoupleStep, substituteNames, substituteStep } from "./runner/coupleShared";

interface JourneyRow {
  activity_id: string;
  code: string;
  title: string;
  allowed: boolean;
  reason: string | null;
  own_status: string | null;
  partner_status: string | null;
  barrier_cleared: boolean | null;
  reveal_pending: boolean | null;
}

type Responses = Record<string, unknown>;

function buildPatch(responses: Responses): Responses {
  const out: Responses = {};
  for (const k of Object.keys(responses || {})) {
    if (k === "analysis" || k === "chat") continue;
    out[k] = responses[k];
  }
  return out;
}

export default function RelationshipActivityRunner() {
  const { relationshipId, activityCode } = useParams<{ relationshipId: string; activityCode: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [activity, setActivity] = useState<{ id: string; title: string; definition: any } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [responses, setResponses] = useState<Responses>({});
  const [couple, setCouple] = useState<CoupleContext | null>(null);
  const [journeyRow, setJourneyRow] = useState<JourneyRow | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisHtml, setAnalysisHtml] = useState<string | undefined>(undefined);
  const [pendingReason, setPendingReason] = useState<string | undefined>(undefined);
  const [analysisError, setAnalysisError] = useState(false);

  const steps: CoupleStep[] = useMemo(
    () => (activity?.definition?.steps as CoupleStep[]) || [],
    [activity],
  );
  const step = steps[stepIndex];

  // ---- Context assembly (partnerView comes only from the RPC) ----
  const buildContext = useCallback(
    async (activityId: string) => {
      if (!relationshipId) return;
      const [names, state, pv] = await Promise.all([
        supabase.rpc("relationship_first_names", { p_relationship: relationshipId }),
        supabase.rpc("relationship_journey_state", { p_relationship: relationshipId }),
        supabase.rpc("relationship_partner_view", {
          p_relationship: relationshipId,
          p_activity: activityId,
          p_run: null,
        }),
      ]);
      const n = (names.data as any[])?.[0] || {};
      const row = ((state.data as JourneyRow[]) || []).find((r) => r.activity_id === activityId) || null;
      const view = (pv.data as any[])?.[0];
      setJourneyRow(row);
      setCouple({
        ownFirstName: n.active_first_name || "You",
        otherFirstName: n.other_first_name || "Your partner",
        partnerSubmitted: row?.partner_status === "done",
        barrierCleared: !!row?.barrier_cleared,
        partnerView:
          view?.visible
            ? { disclosure: (view.disclosure as "full" | "summary") || "full", responses: view.responses || {} }
            : null,
      });
      if (row?.own_status === "submitted" || row?.own_status === "completed") setReadOnly(true);
    },
    [relationshipId],
  );

  // ---- Load ----
  useEffect(() => {
    if (!relationshipId || !activityCode) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: act, error: actErr } = await supabase
        .from("relationship_activities")
        .select("*")
        .eq("code", activityCode)
        .single();
      if (cancelled) return;
      if (actErr || !act) {
        setBlocked("We couldn't find that activity.");
        setLoading(false);
        return;
      }
      setActivity({ id: (act as any).id, title: (act as any).title, definition: (act as any).definition });

      const { data: start, error: startErr } = await supabase.rpc("relationship_session_start", {
        p_relationship: relationshipId,
        p_activity: (act as any).id,
        p_run: null,
      });
      if (cancelled) return;
      if (startErr) {
        setBlocked(startErr.message);
        setLoading(false);
        return;
      }
      const s = (start as any[])?.[0];
      if (!s) {
        setBlocked("This activity isn't open yet.");
        setLoading(false);
        return;
      }
      setSessionId(s.session_id);
      setStepIndex(s.current_step || 0);
      const r = (s.responses as Responses) || {};
      setResponses(r);
      if ((r.analysis as any)?.html) setAnalysisHtml((r.analysis as any).html);
      await buildContext((act as any).id);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [relationshipId, activityCode, buildContext]);

  // ---- Debounced save ----
  const timer = useRef<number | null>(null);
  const roRef = useRef(readOnly);
  roRef.current = readOnly;
  useEffect(() => {
    if (!sessionId || readOnly) return;
    if (timer.current) window.clearTimeout(timer.current);
    const patch = buildPatch(responses);
    timer.current = window.setTimeout(async () => {
      const { data } = await supabase.rpc("relationship_session_save", {
        p_session_id: sessionId,
        p_current_step: stepIndex,
        p_patch: patch as any,
      });
      const row = (data as any[])?.[0];
      if (row && row.saved === false && row.reason === "already_submitted") {
        setReadOnly(true);
      }
    }, 600);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [sessionId, stepIndex, readOnly, JSON.stringify(responses)]);

  // ---- Analysis ----
  const runAnalysis = useCallback(async () => {
    if (!sessionId) return;
    setAnalyzing(true);
    setAnalysisError(false);
    const { data, error } = await supabase.functions.invoke("relationship-activity-analyze", {
      body: { session_id: sessionId },
    });
    setAnalyzing(false);
    if (error || (data as any)?.error) {
      setAnalysisError(true);
      return;
    }
    const d = data as any;
    if (d?.pending) {
      setPendingReason(d.reason || "waiting_for_partner");
      return;
    }
    if (d?.html) {
      setPendingReason(undefined);
      setAnalysisHtml(d.html);
      setResponses((r) => ({ ...r, analysis: { html: d.html } }));
    }
  }, [sessionId]);

  const analysisFiredRef = useRef<string | null>(null);
  const isAnalysisStep =
    !!step && ((step as any).touchpoint === "analysis" || step.onComplete?.touchpoint === "analysis");
  useEffect(() => {
    if (!isAnalysisStep || !sessionId) return;
    if (analysisHtml) return;
    const key = `${sessionId}:${stepIndex}`;
    if (analysisFiredRef.current === key) return;
    analysisFiredRef.current = key;
    void runAnalysis();
  }, [isAnalysisStep, sessionId, stepIndex, analysisHtml, runAnalysis]);

  // ---- Submit ----
  const submit = useCallback(async () => {
    if (!relationshipId || !activity) return;
    setSubmitting(true);
    await supabase.rpc("relationship_activity_submit", {
      p_relationship: relationshipId,
      p_activity: activity.id,
      p_run: null,
    });
    await buildContext(activity.id);
    setReadOnly(true);
    setSubmitting(false);
  }, [relationshipId, activity, buildContext]);

  const consumeReveal = useCallback(async () => {
    if (!relationshipId || !activity) return;
    await supabase.rpc("relationship_consume_reveal", {
      p_relationship: relationshipId,
      p_activity: activity.id,
      p_run: null,
    });
    await buildContext(activity.id);
  }, [relationshipId, activity, buildContext]);

  const goNext = async () => {
    if (step?.barrier && !readOnly) await submit();
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
    else if (!readOnly) await submit();
  };

  // ---- Render ----
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Not open yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{blocked}</p>
            <Button variant="outline" asChild>
              <Link to={`/couples/${relationshipId}`}>Back to your journey</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!step || !couple || !sessionId || !activity) return null;

  const localizedStep = substituteStep(step, couple);
  const renderer = widgetRegistry[step.widget];
  const valueKey = step.key || step.id || "value";
  const title = substituteNames(step.title || step.label || activity.title, couple);
  const nextLabel =
    ((localizedStep as any).buttonLabel as string | undefined) ||
    (stepIndex === steps.length - 1 ? "Finish" : "Next");

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/couples/${relationshipId}`)}>
          <ArrowLeft className="h-4 w-4" />
          Journey
        </Button>
        <span className="text-xs text-muted-foreground">
          Step {stepIndex + 1} of {steps.length}
        </span>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">{title}</CardTitle>
            {readOnly && <Badge variant="secondary">Locked in</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {journeyRow?.reveal_pending && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
              <p className="text-sm">There's something here for you now.</p>
              <Button size="sm" onClick={consumeReveal}>
                <Eye className="h-4 w-4" />
                See it
              </Button>
            </div>
          )}

          <div className={readOnly ? "pointer-events-none opacity-90" : undefined}>
            {renderer
              ? renderer({
                  step: localizedStep,
                  couple,
                  value: responses[valueKey],
                  onChange: (next) => setResponses((r) => ({ ...r, [valueKey]: next })),
                  sessionId,
                  activityCode: activityCode || "",
                  analysisHtml,
                  analyzing,
                  pendingReason,
                })
              : <UnknownWidget name={step.widget} />}
          </div>

          {analysisError && isAnalysisStep && (
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">That didn't come through. You can try again.</p>
              <Button size="sm" variant="outline" onClick={runAnalysis}>
                <RotateCcw className="h-4 w-4" />
                Try again
              </Button>
            </div>
          )}

          {(step as any).chat === true && (
            <ChatWidget
              sessionId={sessionId}
              chat={(responses.chat as ChatMsg[]) || []}
              onChat={(next) => setResponses((r) => ({ ...r, chat: next }))}
              onRemainingChange={() => {}}
              functionName="relationship-activity-chat"
            />
          )}

          <div className="flex items-center justify-between gap-2 border-t pt-4">
            <Button
              variant="outline"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={goNext} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {nextLabel}
              {stepIndex < steps.length - 1 && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
