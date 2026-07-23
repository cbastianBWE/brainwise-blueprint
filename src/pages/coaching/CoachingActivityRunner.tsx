import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft, ArrowRight, Plus, Trash2, Send, Share2, CheckCircle2, Check, X, Mic, Video as VideoIcon, Square, Upload as UploadIcon, RotateCcw } from "lucide-react";
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
import { SynthesisView, AiAnalysisPanel, ChatTranscript, ResourceVideo, CoachingRecordingPlayer, IkigaiRegionsView, IKIGAI_LENSES, type IkigaiMap, type IkigaiLens, InnerTeamCircleView, TEAM_LAYERS, effectiveTeamLayer, type InnerTeamMap, type InnerTeamCharacter, type TeamLayer } from "@/components/coaching/CoachingViews";
import TransitionMapWalkthrough from "@/components/coaching/TransitionMapWalkthrough";
import {
  MultimodalField,
  MediaRecorderPane,
  DictateButton,
  uploadCoachingRecording,
  isMMRec,
  mmIsFilled,
  type MMValue,
} from "@/components/coaching/MultimodalField";



import {
  type Step,
  type SelectedSaying,
  type Activity,
  type Negative,
  type ChatMsg,
  type Responses,
  type Session,
  type LibraryImage,
  type SelectedImage,
  type SayingRow,
  type QaAnswer,
  type AssessmentFileType,
  type AssessmentUploadRow,
  buildUserPatch,
  useDebouncedSave,
  imgUrl,
  humanizeBand,
  inferFileType,
  extForFile,
} from "./runner/shared";
import { ListBuilderWidget } from "./runner/widgets/ListBuilderWidget";
import { IkigaiWidget } from "./runner/widgets/IkigaiWidget";
import { InnerTeamWidget } from "./runner/widgets/InnerTeamWidget";
import { PtpDisplayWidget } from "./runner/widgets/PtpDisplayWidget";
import { AssessmentUploadWidget } from "./runner/widgets/AssessmentUploadWidget";
import { ImageSelectWidget } from "./runner/widgets/ImageSelectWidget";
import { TextSelectWidget } from "./runner/widgets/TextSelectWidget";
import { ImageDescribeWidget } from "./runner/widgets/ImageDescribeWidget";
import { RecapWidget } from "./runner/widgets/RecapWidget";
import { TextareaWidget } from "./runner/widgets/TextareaWidget";
import { RiskBlocksWidget } from "./runner/widgets/RiskBlocksWidget";
import { ChatWidget } from "./runner/widgets/ChatWidget";
import { PrioritizePanel } from "./runner/widgets/PrioritizePanel";
import { SuggestionPanel } from "./runner/widgets/SuggestionPanel";
import { ContentWidget } from "./runner/widgets/ContentWidget";
import { QaMultimodalWidget } from "./runner/widgets/QaMultimodalWidget";
import { ScoredFactorsWidget } from "./runner/widgets/ScoredFactorsWidget";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";

async function startProductCheckout(productTier: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { mode: "product_purchase", product_tier: productTier },
  });
  if (error || !data?.url) {
    toast.error("Couldn't start checkout. Please try again.");
    return;
  }
  window.location.href = data.url as string;
}

function coachingProductTier(activityTier: string | null | undefined): string | null {
  const t = (activityTier || "").toLowerCase();
  if (t === "foundational" || t === "typical" || t === "advanced") return `coaching_${t}`;
  return null;
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
  const [accessDenial, setAccessDenial] = useState<string | null>(null);


  const freshHandledRef = useRef(false);

  // Load activity + session
  useEffect(() => {
    if (!user || !activityId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: act } = await supabase
        .from("coaching_activities_public")
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
        const reason = accRow?.reason || "not_available";
        setAccessDenial(reason);
        setLoading(false);
        return;
      }
      setAccessDenial(null);

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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (accessDenial) {
    const isPtp = accessDenial === "ptp_required";
    const isUpgrade = accessDenial === "upgrade_required" || accessDenial === "subscription_required";
    return (
      <div className="container mx-auto max-w-2xl space-y-4 p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/coaching")}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isPtp
                ? "Your Personal Threat Profile is needed first"
                : isUpgrade
                ? "Upgrade to access this activity"
                : "This activity isn't available"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isPtp
                ? "This coaching activity is built from your Personal Threat Profile. Take the PTP first so we can tailor the reflection to you — it takes about 15 minutes."
                : isUpgrade
                ? "This activity is part of a paid tier. Upgrade to unlock it."
                : "You don't have access to this activity right now."}
            </p>
            <div className="flex flex-wrap gap-2">
              {isPtp && (
                <Button onClick={() => navigate("/assessment")}>Take the PTP</Button>
              )}
              {isUpgrade && (
                <Button onClick={() => navigate("/pricing")}>Upgrade</Button>
              )}
              <Button variant="outline" onClick={() => navigate("/coaching")}>
                Back to coaching
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activity || !session) {
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
      return mmIsFilled(responses[step.key || ""]);
    }
    if (step.widget === "list_builder") {
      const arr = (responses[step.key || ""] as MMValue[]) || [];
      const listOk = arr.length >= (step.min ?? 0) && arr.every((x) => mmIsFilled(x));
      if (step.prioritize) {
        const picks = (responses[step.prioritize.priorityKey] as string[]) || [];
        return listOk && picks.length === step.prioritize.selectExactly;
      }
      return listOk;
    }
    if (step.widget === "risk_blocks") {
      const negs = (responses.negatives || []) as Negative[];
      if (!(step.subfields && step.subfields.length > 0)) {
        return negs.length > 0 && negs.every((n) => mmIsFilled(n.text));
      }
      return negs.every((n) => step.subfields!.every((sf) => mmIsFilled((n as any)[sf])));
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
      return sel.length === need && sel.every((s) => mmIsFilled(s.description));
    }
    if (step.widget === "content") {
      if (step.reflection && step.reflection.optional === false && step.key) {
        return mmIsFilled(responses[step.key]);
      }
      return true;
    }
    if (step.widget === "image_describe") {
      const items = (responses[step.fromKey || ""] as SelectedImage[]) || [];
      if (items.length === 0) return false;
      const need = step.minDescribed ?? items.length;
      const done = items.filter((it) => mmIsFilled(it.description)).length;
      return done >= need;
    }
    if (step.widget === "recap") return !!(responses.recap as { html?: string } | undefined)?.html;
    if (step.widget === "transition_map") return true;
    if (step.widget === "ptp_display") return true;
    if (step.widget === "assessment_upload") return true;
    if (step.widget === "ikigai") {
      const m = (responses as any)[step.mapKey || "ikigai_map"] as { items?: unknown[] } | undefined;
      return Array.isArray(m?.items) && (m!.items as unknown[]).length > 0;
    }
    if (step.widget === "inner_team") {
      const m = (responses as any)[step.mapKey || "inner_team_map"] as { characters?: unknown[] } | undefined;
      return Array.isArray(m?.characters) && (m!.characters as unknown[]).length > 0;
    }
    if (step.widget === "qa_multimodal") {
      const qs = (step.questions as Array<{ key: string }>) || [];
      const bag = (responses[step.key || ""] as Record<string, QaAnswer>) || {};
      return qs.every((qq) => {
        const a = bag[qq.key];
        return !!a && (a.skipped || !!a.text?.trim() || !!a.media_id);
      });
    }
    if (step.widget === "scored_factors") {
      const scores = (responses[step.key || ""] as Record<string, number>) || {};
      const factors = step.factors || [];
      return factors.length > 0 && factors.every((f) => typeof scores[f.key] === "number");
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
                value={(responses[step.key || ""] as MMValue) || ""}
                onChange={(v) =>
                  setResponses((r) => ({ ...r, [step.key || "text"]: v }))
                }
                sessionId={session.id}
                activityCode={activity.code || ""}
              />
            )}

            {step?.widget === "list_builder" && (
              <ListBuilderWidget
                step={step}
                items={(responses[step.key || ""] as MMValue[]) || []}
                onChange={(v) =>
                  setResponses((r) => ({ ...r, [step.key || "items"]: v }))
                }
                sessionId={session.id}
                activityCode={activity.code || ""}
              />
            )}

            {step?.widget === "list_builder" && step.suggest && step.key && (
              <SuggestionPanel
                sessionId={session.id}
                stepKey={step.key}
                suggest={step.suggest}
                existing={((responses[step.key] as MMValue[]) || []).filter((v): v is string => typeof v === "string")}
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
                    [step.key!]: [...((r[step.key!] as MMValue[]) || []), text],
                  }))
                }
              />
            )}

            {step?.widget === "list_builder" && step.prioritize && step.key && (
              <PrioritizePanel
                items={((responses[step.key] as MMValue[]) || []).filter((v): v is string => typeof v === "string")}
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
                          <li key={i}>{typeof v === "string" ? v : "(recording)"}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                <RiskBlocksWidget
                  step={step}
                  items={(responses.negatives as Negative[]) || []}
                  onChange={(v) => setResponses((r) => ({ ...r, negatives: v }))}
                  sessionId={session.id}
                  activityCode={activity.code || ""}
                />
              </>
            )}

            {step?.widget === "risk_blocks" && step.suggest && (step.subfields?.length ?? 0) === 0 && step.key && (
              <SuggestionPanel
                sessionId={session.id}
                stepKey={step.key}
                suggest={step.suggest}
                existing={((responses.negatives as Negative[]) || [])
                  .map((n) => n.text)
                  .filter((t): t is string => typeof t === "string" && t.length > 0)}
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
                sessionId={session.id}
                activityCode={activity.code || ""}
              />
            )}

            {step?.widget === "content" && (
              <ContentWidget
                step={step}
                value={step.key ? (responses[step.key] as MMValue | undefined) : undefined}
                onChange={(v) => {
                  if (!step.key) return;
                  setResponses((r) => ({ ...r, [step.key!]: v }));
                }}
                sessionId={session.id}
                activityCode={activity.code || ""}
              />
            )}

            {step?.widget === "image_describe" && (
              <ImageDescribeWidget
                step={step}
                value={(responses[step.fromKey || ""] as SelectedImage[]) || []}
                onChange={(v) => setResponses((r) => ({ ...r, [step.fromKey!]: v }))}
                sessionId={session.id}
                activityCode={activity.code || ""}
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

            {step?.widget === "scored_factors" && step.key && (
              <ScoredFactorsWidget
                step={step}
                value={(responses[step.key] as Record<string, number>) || {}}
                onChange={(next) => setResponses((r) => ({ ...r, [step.key!]: next }))}
              />
            )}

            {step?.widget === "transition_map" && (
              <TransitionMapWalkthrough step={{ intro: step.intro, beats: step.beats || [] }} />
            )}

            {step?.widget === "ptp_display" && user && (
              <PtpDisplayWidget step={step} userId={user.id} />
            )}

            {step?.widget === "assessment_upload" && user && (
              <AssessmentUploadWidget
                step={step}
                session={session}
                userId={user.id}
                responses={responses}
                setResponses={setResponses}
                setCoachingRemaining={(n) => setCoachingRemaining(n)}
              />
            )}


            {step?.widget === "ikigai" && (
              <IkigaiWidget
                step={step}
                session={session}
                responses={responses}
                setResponses={setResponses}
                activityCode={activity.code || ""}
                setCoachingRemaining={setCoachingRemaining}
              />
            )}

            {step?.widget === "inner_team" && (
              <InnerTeamWidget
                step={step}
                session={session}
                responses={responses}
                setResponses={setResponses}
                activityCode={activity.code || ""}
                setCoachingRemaining={setCoachingRemaining}
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
