import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { X, ChevronLeft, ChevronRight, Check, AlertTriangle } from "lucide-react";
import PreAssessmentAcknowledgment from "./PreAssessmentAcknowledgment";

interface Item {
  item_id: string;
  item_number: number | null;
  item_text: string;
  anchor_low: string | null;
  anchor_high: string | null;
  scale_type: string | null;
  dimension_id: string | null;
}

interface ResponseScale {
  response_value: string | null;
  numeric_equivalent: number | null;
  display_label: string | null;
  readiness_translation: string | null;
}

interface Props {
  instrument: {
    instrument_id: string;
    instrument_name: string;
    instrument_version: string;
    short_name: string;
  };
  onExit: () => void;
  contextType?: 'professional' | 'personal' | 'both' | null;
  preexistingAssessmentId?: string;
  epnAssignmentId?: string;
  raterType?: 'self' | 'manager';
  targetUserName?: string;
  entitlementSource?: 'free_cert_pool' | 'paid_purchase' | 'coach_paid_client' | 'self_pay_coach_invite' | null;
}

export default function AssessmentFlow({ instrument, onExit, contextType, preexistingAssessmentId, epnAssignmentId, raterType = 'self', targetUserName, entitlementSource }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewingUnanswered, setReviewingUnanswered] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [responses, setResponses] = useState<Record<string, { numeric: number; text: string | null; readiness: string | null }>>({});
  const [unsavedItems, setUnsavedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [responseScales, setResponseScales] = useState<ResponseScale[]>([]);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadedAssessmentRef = useRef<string | null>(null);
  const responsesRef = useRef(responses);
  const itemsRef = useRef(items);
  const jumpCursor = useRef(0);
  useEffect(() => { responsesRef.current = responses; }, [responses]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  

  const [needsAck, setNeedsAck] = useState(false);
  const [confirmingAck, setConfirmingAck] = useState(false);
  const [initChecked, setInitChecked] = useState(false);

  // Phase 1: determine whether the acknowledgment screen is required.
  useEffect(() => {
    if (!user || initChecked) return;
    const check = async () => {
      if (raterType === 'manager' && !preexistingAssessmentId) {
        toast({ title: "Error", description: "Manager assessment requires a preexisting assessment ID.", variant: "destructive" });
        onExit();
        return;
      }

      let candidateId: string | null = preexistingAssessmentId ?? null;
      if (!candidateId && !epnAssignmentId) {
        const { data: existing } = await supabase
          .from("assessments")
          .select("id")
          .eq("user_id", user.id)
          .eq("instrument_id", instrument.instrument_id)
          .eq("status", "in_progress")
          .limit(1);
        if (existing && existing.length > 0) candidateId = existing[0].id;
      }

      if (candidateId) {
        const { data: existingAck } = await supabase
          .from("assessment_acknowledgments")
          .select("id")
          .eq("user_id", user.id)
          .eq("assessment_id", candidateId)
          .eq("acknowledgment_kind", "pre_instrument")
          .limit(1)
          .maybeSingle();

        if (existingAck) {
          if (contextType && !preexistingAssessmentId) {
            await supabase
              .from('assessments')
              .update({ context_type: contextType })
              .eq('id', candidateId);
          }
          setAssessmentId(candidateId);
          if (entitlementSource && !epnAssignmentId && raterType !== 'manager') {
            supabase
              .from("assessments")
              .update({ entitlement_source: entitlementSource })
              .eq("id", candidateId)
              .is("entitlement_source", null)
              .then(({ error }) => {
                if (error) console.error("Failed to stamp entitlement_source on resume (non-fatal):", error);
              });
          }
          setInitChecked(true);
          return;
        }
      }

      setNeedsAck(true);
      setLoading(false);
      setInitChecked(true);
    };
    check();
  }, [user, initChecked, raterType, preexistingAssessmentId, epnAssignmentId, instrument.instrument_id, contextType, onExit, toast]);

  const handleAcknowledgmentConfirm = async (versionHash: string) => {
    if (!user) return;
    setConfirmingAck(true);
    try {
      let newId: string;
      if (epnAssignmentId) {
        const { data, error } = await supabase.rpc('start_epn_assessment', {
          p_assignment_id: epnAssignmentId,
          p_acknowledgment_version_hash: versionHash,
        });
        if (error || !data) throw error || new Error('Failed to start assessment');
        newId = data as unknown as string;
      } else {
        const { data, error } = await supabase.rpc('start_assessment', {
          p_instrument_id: instrument.instrument_id,
          p_rater_type: raterType,
          p_preexisting_assessment_id: preexistingAssessmentId ?? undefined,
          p_acknowledgment_version_hash: versionHash,
          p_context_type: contextType ?? undefined,
        });
        if (error) throw error;
        const result = (data ?? {}) as { assessment_id?: string; error?: string };
        if (result.error || !result.assessment_id) {
          throw new Error(result.error || 'Failed to start assessment');
        }
        newId = result.assessment_id;
      }
      setNeedsAck(false);
      setLoading(true);
      setAssessmentId(newId);
      if (entitlementSource && !epnAssignmentId && raterType !== 'manager') {
        supabase
          .from("assessments")
          .update({ entitlement_source: entitlementSource })
          .eq("id", newId)
          .then(({ error }) => {
            if (error) console.error("Failed to stamp entitlement_source (non-fatal):", error);
          });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not start assessment';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      setConfirmingAck(false);
    }
  };

  // Phase 2: load items + existing responses once we have an assessment_id.
  useEffect(() => {
    if (!user || !assessmentId) return;
    const load = async () => {
      if (loadedAssessmentRef.current === assessmentId) return;

      let itemsQuery = supabase
        .from("items_presentation")
        .select("item_id, item_number, item_text, anchor_low, anchor_high, dimension_id, scale_type")
        .eq("instrument_id", instrument.instrument_id)
        .eq("rater_type", raterType === "manager" ? "Manager" : "Self")
        .order("item_number", { ascending: true });

      if (instrument.instrument_id === "INST-001" && contextType && contextType !== "both") {
        itemsQuery = itemsQuery.eq("context_type", contextType);
      }

      const { data: itemsData } = await itemsQuery;

      if (!itemsData || itemsData.length === 0) {
        toast({ title: "No items found", description: "This instrument has no items configured yet.", variant: "destructive" });
        onExit();
        return;
      }
      setItems(itemsData);

      const { data: existingResponses } = await supabase
        .from("assessment_responses")
        .select("item_id, response_value_numeric, response_value_text, readiness_level")
        .eq("assessment_id", assessmentId);

      if (existingResponses && existingResponses.length > 0) {
        const map: Record<string, { numeric: number; text: string | null; readiness: string | null }> = {};
        existingResponses.forEach((r) => {
          map[r.item_id] = { numeric: r.response_value_numeric, text: r.response_value_text, readiness: r.readiness_level };
        });
        setResponses(map);
        const firstUnanswered = itemsData.findIndex((it) => !map[it.item_id]);
        if (firstUnanswered > 0) setCurrentIndex(firstUnanswered);
      }

      if (instrument.instrument_id === "INST-003") {
        const { data: scales } = await supabase
          .from("response_scales")
          .select("response_value, numeric_equivalent, display_label, readiness_translation")
          .eq("scale_type", "Never/Rarely/Often/Consistently");
        if (scales) setResponseScales(scales);
      }

      loadedAssessmentRef.current = assessmentId;
      setLoading(false);
      setConfirmingAck(false);
    };
    load();

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, assessmentId, instrument.instrument_id, raterType, contextType]);

  const showSavedIndicator = () => {
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2000);
  };

  const flushUnsaved = useCallback(async () => {
    if (!assessmentId) return;
    const ids = Array.from(unsavedItems);
    if (ids.length === 0) return;
    for (const itemId of ids) {
      const item = itemsRef.current.find((i) => i.item_id === itemId);
      const resp = responsesRef.current[itemId];
      if (!item || !resp) continue;
      const { error } = await supabase
        .from("assessment_responses")
        .upsert(
          {
            assessment_id: assessmentId,
            item_id: itemId,
            response_value_numeric: resp.numeric,
            response_value_text: resp.text,
            readiness_level: resp.readiness,
          },
          { onConflict: "assessment_id,item_id" }
        );
      if (!error) {
        setUnsavedItems((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }
    }
  }, [assessmentId, unsavedItems]);

  // Auto-save every 60s — silently retries anything still unsaved
  useEffect(() => {
    if (!assessmentId) return;
    autoSaveTimer.current = setInterval(() => {
      flushUnsaved();
    }, 60000);
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [assessmentId, flushUnsaved]);

  const saveResponse = useCallback(
    async (itemId: string, numeric: number, text: string | null, readinessLevel: string | null) => {
      if (!assessmentId) return;
      const item = items.find((i) => i.item_id === itemId);
      if (!item) return;

      setResponses((prev) => ({ ...prev, [itemId]: { numeric, text, readiness: readinessLevel } }));

      const { error } = await supabase
        .from("assessment_responses")
        .upsert(
          {
            assessment_id: assessmentId,
            item_id: itemId,
            response_value_numeric: numeric,
            response_value_text: text,
            readiness_level: readinessLevel,
          },
          { onConflict: "assessment_id,item_id" }
        );

      if (error) {
        setUnsavedItems((prev) => {
          const next = new Set(prev);
          next.add(itemId);
          return next;
        });
        toast({
          title: "Save failed",
          description: "Your last answer didn't save. Check your connection — we'll keep retrying.",
          variant: "destructive",
        });
      } else {
        setUnsavedItems((prev) => {
          if (!prev.has(itemId)) return prev;
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
        showSavedIndicator();
      }
    },
    [assessmentId, items, toast]
  );

  const handleSubmit = async () => {
    if (!assessmentId || !user) return;
    setSubmitting(true);

    await flushUnsaved();
    if (unsavedItems.size > 0) {
      toast({
        title: "Please wait",
        description: "Some answers still haven't saved. Please wait a moment and try again.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }


    if (epnAssignmentId) {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-epn-assessment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            assessment_id: assessmentId,
            assignment_id: epnAssignmentId,
          }),
        }
      );
      const result = await response.json();

      if (!response.ok || result.error) {
        toast({ title: "Error", description: result.error || "Failed to submit EPN.", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      navigate(`/epn-complete/${epnAssignmentId}`);
      return;
    }

    const { data, error } = await supabase.functions.invoke("calculate-scores", {
      body: { assessment_id: assessmentId },
    });

    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || "Failed to calculate results.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    if (raterType === 'manager') {
      navigate(`/airsa-manager-complete/${assessmentId}`);
      return;
    }

    // Consume an unconsumed per-assessment purchase for this instrument, if one exists.
    // Non-blocking: returns NULL when user is on a subscription or coach-paid, which is fine.
    try {
      await supabase.rpc("consume_assessment_purchase", {
        p_user_id: user.id,
        p_instrument_short_name: instrument.short_name,
        p_assessment_id: assessmentId,
        p_context_type: contextType ?? null,
      } as never);
    } catch (err) {
      console.error("consume_assessment_purchase failed (non-fatal):", err);
    }

    navigate(`/my-results`);
  };

  const allAnswered = items.length > 0 && items.every((it) => responses[it.item_id] != null);
  useEffect(() => { if (allAnswered) setReviewingUnanswered(false); }, [allAnswered]);

  if (needsAck) {
    return (
      <PreAssessmentAcknowledgment
        instrumentId={instrument.instrument_id}
        raterType={raterType}
        loading={confirmingAck}
        onConfirm={handleAcknowledgmentConfirm}
        onCancel={onExit}
      />
    );
  }

  if (loading || submitting) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        {submitting && <p className="text-muted-foreground">Calculating your results...</p>}
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const isLast = currentIndex === items.length - 1;
  const progress = ((currentIndex + 1) / items.length) * 100;
  const currentResponse = responses[currentItem?.item_id];
  const goToNextUnanswered = () => {
    let next = items.findIndex((it, i) => i > currentIndex && responses[it.item_id] == null);
    if (next === -1) next = items.findIndex((it) => responses[it.item_id] == null);
    if (next === -1) { setReviewingUnanswered(false); setCurrentIndex(items.length - 1); }
    else setCurrentIndex(next);
  };

  const renderItemControl = (item: Item) => {
    const resp = responses[item.item_id];
    if (item.scale_type === "Level 1-4 behavioral match") {
      return (
        <LevelMatchControl
          item={item}
          value={resp?.numeric ?? null}
          raterType={raterType}
          targetUserName={targetUserName}
          onSelect={(val, text) => saveResponse(item.item_id, val, text, null)}
        />
      );
    }
    if (item.scale_type === "Never/Rarely/Often/Consistently") {
      return (
        <FrequencyControl
          item={item}
          value={resp?.numeric ?? null}
          responseScales={responseScales}
          raterType={raterType}
          targetUserName={targetUserName}
          onSelect={(val, text, readiness) => saveResponse(item.item_id, val, text, readiness)}
        />
      );
    }
    return (
      <SliderControl
        item={item}
        value={resp?.numeric ?? null}
        raterType={raterType}
        targetUserName={targetUserName}
        onSelect={(val) => saveResponse(item.item_id, val, null, null)}
      />
    );
  };

  if (reviewing) {
    const answeredCount = items.filter((it) => responses[it.item_id] != null).length;
    const jumpToNextUnanswered = () => {
      const unansweredIdx = items
        .map((it, i) => (responses[it.item_id] == null ? i : -1))
        .filter((i) => i !== -1);
      if (unansweredIdx.length === 0) return;
      const target = unansweredIdx[jumpCursor.current % unansweredIdx.length];
      jumpCursor.current += 1;
      const el = document.getElementById(`review-item-${target}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const thumb = el.querySelector<HTMLElement>('[role="slider"]');
        if (thumb) thumb.focus({ preventScroll: true });
      }
    };
    return (
      <div className="fixed inset-0 bg-background flex flex-col z-50">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-medium">Review your responses</div>
          <div className="flex items-center gap-2">
            {savedIndicator && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 animate-in fade-in">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={() => setShowExitDialog(true)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-4 py-6">
          <div className="w-full max-w-2xl mx-auto space-y-4">
            {answeredCount < items.length && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-[#FFB703] bg-[#FFB703]/10 px-4 py-3">
                <div className="text-sm text-[#7a5800]">
                  <span className="font-semibold">{items.length - answeredCount} unanswered.</span>{" "}
                  You must answer every item before you can submit.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#FFB703] text-[#7a5800] shrink-0"
                  onClick={jumpToNextUnanswered}
                >
                  Jump to next unanswered
                </Button>
              </div>
            )}
            {items.map((it, idx) => {
              const answered = responses[it.item_id] != null;
              return (
                <Card key={it.item_id} id={`review-item-${idx}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-muted-foreground">
                        Item {idx + 1} of {items.length}
                      </div>
                      {!answered && (
                        <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-[#FFB703]/10 text-[#7a5800] border border-[#FFB703]">
                          Not answered
                        </span>
                      )}
                    </div>
                    {renderItemControl(it)}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="border-t px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Answered {answeredCount} of {items.length}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setReviewing(false)}>
              Back to questions
            </Button>
            <Button
              onClick={() => setShowSubmitDialog(true)}
              disabled={!allAnswered || unsavedItems.size > 0}
            >
              Submit Assessment
            </Button>
          </div>
        </div>

        <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Exit Assessment?</AlertDialogTitle>
              <AlertDialogDescription>
                Your progress has been saved. You can resume this assessment at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continue Assessment</AlertDialogCancel>
              <AlertDialogAction onClick={onExit}>Exit</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit Assessment?</AlertDialogTitle>
              <AlertDialogDescription>
                {Object.keys(responses).length < items.length
                  ? `You have answered ${Object.keys(responses).length} of ${items.length} items. You must answer all ${items.length} items before you can submit.`
                  : "All items have been answered. Once submitted, responses cannot be changed."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Go Back</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSubmit}
                disabled={submitting || !allAnswered || unsavedItems.size > 0}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <div>Item {currentIndex + 1} of {items.length}</div>
          {raterType === 'manager' && targetUserName && (
            <div className="text-xs mt-0.5">Rating: {targetUserName}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {savedIndicator && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 animate-in fade-in">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={() => setShowExitDialog(true)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 pt-2">
        <Progress value={progress} className="h-2" />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 overflow-auto">
        <div className="w-full max-w-2xl">
          {currentItem.reverse_scored && (
            <div className="mb-6 flex gap-3 rounded-lg border border-[#FFB703] bg-[#FFB703]/10 px-4 py-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-[#7a5800] mt-0.5" />
              <div className="text-sm text-[#7a5800]">
                <p className="font-semibold">Read this one carefully.</p>
                <p className="mt-0.5">
                  The scale labels on this question may run in the opposite direction from the
                  previous ones. Check both endpoint labels before you respond.
                </p>
              </div>
            </div>
          )}
          {currentItem.scale_type === "Level 1-4 behavioral match" ? (
            <LevelMatchControl
              item={currentItem}
              value={currentResponse?.numeric ?? null}
              raterType={raterType}
              targetUserName={targetUserName}
              onSelect={(val, text) => saveResponse(currentItem.item_id, val, text, null)}
            />
          ) : currentItem.scale_type === "Never/Rarely/Often/Consistently" ? (
            <FrequencyControl
              item={currentItem}
              value={currentResponse?.numeric ?? null}
              responseScales={responseScales}
              raterType={raterType}
              targetUserName={targetUserName}
              onSelect={(val, text, readiness) => saveResponse(currentItem.item_id, val, text, readiness)}
            />
          ) : (
            <SliderControl
              item={currentItem}
              value={currentResponse?.numeric ?? null}
              raterType={raterType}
              targetUserName={targetUserName}
              onSelect={(val) => saveResponse(currentItem.item_id, val, null, null)}
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t px-4 py-3 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>

        {isLast ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setReviewing(true)}>
              Review your responses
            </Button>
            <Button onClick={() => setShowSubmitDialog(true)} disabled={!currentResponse}>
              Submit Assessment
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => reviewingUnanswered ? goToNextUnanswered() : setCurrentIndex((p) => Math.min(items.length - 1, p + 1))}
          >
            {reviewingUnanswered ? "Next Unanswered" : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Footer info */}
      <div className="text-center text-xs text-muted-foreground pb-2">
        {instrument.instrument_name} · v{instrument.instrument_version}
      </div>

      {/* Exit dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress has been saved. You can resume this assessment at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Assessment</AlertDialogCancel>
            <AlertDialogAction onClick={onExit}>Exit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              {Object.keys(responses).length < items.length
                ? `You have answered ${Object.keys(responses).length} of ${items.length} items. You must answer all ${items.length} items before you can submit.`
                : "All items have been answered. Once submitted, responses cannot be changed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            {Object.keys(responses).length < items.length && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowSubmitDialog(false);
                  const firstUnanswered = items.findIndex((it) => !responses[it.item_id]);
                  if (firstUnanswered >= 0) { setReviewingUnanswered(true); setCurrentIndex(firstUnanswered); }
                }}
              >
                Go to First Unanswered
              </Button>
            )}
            <AlertDialogAction onClick={handleSubmit} disabled={submitting || !allAnswered || unsavedItems.size > 0}>
              {submitting ? 'Submitting...' : 'Submit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Scale controls ──

function ManagerContextLine({ raterType, targetUserName }: { raterType?: 'self' | 'manager'; targetUserName?: string }) {
  if (raterType !== 'manager' || !targetUserName) return null;
  return <p className="text-sm italic text-muted-foreground text-center">Thinking about {targetUserName}...</p>;
}

function SliderControl({
  item,
  value,
  raterType,
  targetUserName,
  onSelect,
}: {
  item: Item;
  value: number | null;
  raterType?: 'self' | 'manager';
  targetUserName?: string;
  onSelect: (val: number) => void;
}) {
  const [localVal, setLocalVal] = useState(value ?? 50);
  const [touched, setTouched] = useState(value !== null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<(() => void) | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const clearTimer = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  const flushPending = () => {
    clearTimer();
    if (pendingSave.current) {
      const run = pendingSave.current;
      pendingSave.current = null;
      run();
    }
  };

  const scheduleSave = (v: number) => {
    const persist = () => onSelect(v);
    pendingSave.current = persist;
    clearTimer();
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      pendingSave.current = null;
      persist();
    }, 250);
  };

  const commitNow = (v: number) => {
    clearTimer();
    pendingSave.current = null;
    onSelect(v);
  };

  useEffect(() => {
    return () => {
      flushPending();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.item_id]);

  useEffect(() => {
    return () => {
      flushPending();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (value !== null) {
      setLocalVal(value);
      setTouched(true);
    } else {
      setLocalVal(50);
      setTouched(false);
    }
  }, [item.item_id, value]);

  // Focus the slider thumb on mount and on each new item, so arrow keys work
  // immediately without a manual click. Scoped to this control's wrapper.
  useEffect(() => {
    const thumb = wrapperRef.current?.querySelector<HTMLElement>('[role="slider"]');
    if (thumb) thumb.focus({ preventScroll: true });
  }, [item.item_id]);

  return (
    <div ref={wrapperRef} className="space-y-8 text-center">
      <style>{`
        .assessment-slider [role="slider"] {
          width: 22px;
          height: 22px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          cursor: grab;
        }
        .assessment-slider [role="slider"]:hover {
          transform: scale(1.25);
          box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.15);
        }
        .assessment-slider [role="slider"]:active {
          cursor: grabbing;
          transform: scale(1.1);
          box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.2);
        }
        .assessment-slider [data-orientation="horizontal"] {
          height: 8px;
        }
        .assessment-slider[data-untouched="true"] .bg-primary {
          background-color: transparent;
        }
      `}</style>
      <ManagerContextLine raterType={raterType} targetUserName={targetUserName} />
      <p className="text-xl font-medium text-foreground leading-relaxed">{item.item_text}</p>
      <div className="space-y-4 px-2">
        <div className="flex items-center gap-4">
          <span className="w-6 flex-shrink-0" />
          <div className="flex-1 flex justify-center">
            <span className="text-3xl font-bold text-primary min-w-16">
              {touched ? localVal : '—'}
            </span>
          </div>
          <span className="w-8 flex-shrink-0" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground w-6 text-center flex-shrink-0">0</span>
          <div className="flex-1 assessment-slider" data-untouched={!touched ? "true" : "false"}>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[localVal]}
              onValueChange={([v]) => {
                setLocalVal(v);
                setTouched(true);
                scheduleSave(v);
              }}
              onValueCommit={([v]) => commitNow(v)}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground w-8 text-center flex-shrink-0">100</span>
        </div>
        <div className="flex items-start gap-4">
          <div className="w-6 flex-shrink-0" />
          <div className="flex-1 flex justify-between gap-4">
            <span className="text-sm text-muted-foreground text-left w-1/2">{item.anchor_low || 'Low'}</span>
            <span className="text-sm text-muted-foreground text-right w-1/2">{item.anchor_high || 'High'}</span>
          </div>
          <div className="w-8 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}

function LevelMatchControl({
  item,
  value,
  raterType,
  targetUserName,
  onSelect,
}: {
  item: Item;
  value: number | null;
  raterType?: 'self' | 'manager';
  targetUserName?: string;
  onSelect: (val: number, text: string) => void;
}) {
  // Parse behavioral descriptions from item_text
  // Expected format: dimension description followed by level descriptions
  const levels = [
    { level: 1, label: "Level 1" },
    { level: 2, label: "Level 2" },
    { level: 3, label: "Level 3" },
    { level: 4, label: "Level 4" },
  ];

  // Try parsing anchor_low and anchor_high as level descriptions
  const descriptions = item.item_text.split("\n").filter(Boolean);
  const dimensionDesc = descriptions[0] || item.item_text;
  const levelDescriptions = descriptions.slice(1);

  return (
    <div className="space-y-6">
      <ManagerContextLine raterType={raterType} targetUserName={targetUserName} />
      <p className="text-xl font-medium text-foreground text-center leading-relaxed">{dimensionDesc}</p>
      <div className="space-y-3">
        {levels.map((lvl, idx) => (
          <Card
            key={lvl.level}
            className={`cursor-pointer transition-all ${value === lvl.level ? "ring-2 ring-primary bg-primary/5" : "hover:border-primary/50"}`}
            onClick={() => onSelect(lvl.level, lvl.label)}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  value === lvl.level ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {lvl.level}
              </div>
              <div>
                <div className="font-medium text-foreground">{lvl.label}</div>
                {levelDescriptions[idx] && (
                  <p className="text-sm text-muted-foreground mt-1">{levelDescriptions[idx]}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FrequencyControl({
  item,
  value,
  responseScales,
  raterType,
  targetUserName,
  onSelect,
}: {
  item: Item;
  value: number | null;
  responseScales: ResponseScale[];
  raterType?: 'self' | 'manager';
  targetUserName?: string;
  onSelect: (val: number, text: string, readiness: string | null) => void;
}) {
  const options = [
    { label: "Never", numeric: 0 },
    { label: "Rarely", numeric: 1 },
    { label: "Often", numeric: 2 },
    { label: "Consistently", numeric: 3 },
  ];

  const getReadiness = (label: string): string | null => {
    const scale = responseScales.find(
      (s) => s.display_label?.toLowerCase() === label.toLowerCase() || s.response_value?.toLowerCase() === label.toLowerCase()
    );
    return scale?.readiness_translation || null;
  };

  return (
    <div className="space-y-8 text-center">
      <ManagerContextLine raterType={raterType} targetUserName={targetUserName} />
      <p className="text-xl font-medium text-foreground leading-relaxed">{item.item_text}</p>
      <div className="flex gap-3 justify-center flex-wrap">
        {options.map((opt) => (
          <Button
            key={opt.label}
            variant={value === opt.numeric ? "default" : "outline"}
            className="min-w-[120px]"
            onClick={() => onSelect(opt.numeric, opt.label, getReadiness(opt.label))}
          >
            {opt.label}
          </Button>
        ))}
      </div>
      {item.anchor_low && item.anchor_high && (
        <div className="flex justify-between text-sm text-muted-foreground px-4">
          <span>{item.anchor_low}</span>
          <span>{item.anchor_high}</span>
        </div>
      )}
    </div>
  );
}
