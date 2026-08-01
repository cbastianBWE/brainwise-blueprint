import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AiAnalysisPanel } from "@/components/coaching/CoachingViews";
import type { Step } from "@/pages/coaching/runner/shared";
import type { MMValue } from "@/components/coaching/MultimodalField";
import { ContentWidget } from "@/pages/coaching/runner/widgets/ContentWidget";
import { ListBuilderWidget } from "@/pages/coaching/runner/widgets/ListBuilderWidget";
import { RiskBlocksWidget } from "@/pages/coaching/runner/widgets/RiskBlocksWidget";
import { QaMultimodalWidget } from "@/pages/coaching/runner/widgets/QaMultimodalWidget";
import { ScoredFactorsWidget } from "@/pages/coaching/runner/widgets/ScoredFactorsWidget";
import { TextSelectWidget } from "@/pages/coaching/runner/widgets/TextSelectWidget";
import { ImageSelectWidget } from "@/pages/coaching/runner/widgets/ImageSelectWidget";
import { RecapWidget } from "@/pages/coaching/runner/widgets/RecapWidget";
import { InnerTeamWidget } from "@/pages/coaching/runner/widgets/InnerTeamWidget";
import { PairedQaWidget } from "./widgets/PairedQaWidget";
import { CoupleAgreementWidget } from "./widgets/CoupleAgreementWidget";
import { JointSessionWidget } from "./widgets/JointSessionWidget";
import { StatementSelectWidget } from "./widgets/StatementSelectWidget";
import { JourneyMapWidget } from "./widgets/JourneyMapWidget";
import { VisibilityExplainerWidget } from "./widgets/VisibilityExplainerWidget";
import { GuessLockWidget, type GuessValue } from "./widgets/GuessLockWidget";
import { ProfileRevealWidget } from "./widgets/ProfileRevealWidget";
import { SafetyScreenWidget } from "./widgets/SafetyScreenWidget";
import { IkigaiWidget } from "@/pages/coaching/runner/widgets/IkigaiWidget";
import { ImageDescribeWidget } from "@/pages/coaching/runner/widgets/ImageDescribeWidget";
import { CoupleTimelineWidget, type TimelineEvent } from "./widgets/CoupleTimelineWidget";
import { SynthesisWidget } from "./widgets/SynthesisWidget";
import { OverlapRevealWidget } from "./widgets/OverlapRevealWidget";
import { OwnReadbackWidget } from "./widgets/OwnReadbackWidget";
import { ReusedStepsWidget } from "./widgets/ReusedStepsWidget";
import { DesireGridWidget } from "./widgets/DesireGridWidget";
import { CoupleMoleculeWidget, type MoleculeNode } from "./widgets/CoupleMoleculeWidget";


import { allowedModes, type CoupleContext, type CoupleStep } from "./coupleShared";

export interface WidgetCtx {
  step: CoupleStep;
  couple: CoupleContext;
  value: unknown;
  onChange: (next: unknown) => void;
  sessionId: string;
  activityCode: string;
  analysisHtml?: string;
  analyzing?: boolean;
  pendingReason?: string;
  responses?: Record<string, unknown>;
  readOnly?: boolean;
  relationshipId?: string;
  activityId?: string;
}


export type WidgetRenderer = (ctx: WidgetCtx) => JSX.Element | null;

/**
 * The coaching widgets take `Step`. `CoupleStep` is structurally compatible for
 * every field they read. Cast here and nowhere else.
 */
const asStep = (s: CoupleStep): Step => s as unknown as Step;

export const widgetRegistry: Record<string, WidgetRenderer> = {
  content: ({ step, value, onChange, sessionId, activityCode }) => (
    <ContentWidget
      step={asStep(step)}
      value={value as MMValue | undefined}
      onChange={(v) => onChange(v)}
      sessionId={sessionId}
      activityCode={activityCode}
          sessionKind="relationship"
    />
  ),
  list_builder: ({ step, value, onChange, sessionId, activityCode }) => (
    <ListBuilderWidget
      step={asStep(step)}
      items={(value as MMValue[]) || []}
      onChange={(v) => onChange(v)}
      sessionId={sessionId}
      activityCode={activityCode}
          sessionKind="relationship"
    />
  ),
  risk_blocks: ({ step, value, onChange, sessionId, activityCode }) => (
    <RiskBlocksWidget
      step={asStep(step)}
      items={(value as any[]) || []}
      onChange={(v) => onChange(v)}
      sessionId={sessionId}
      activityCode={activityCode}
          sessionKind="relationship"
    />
  ),
  qa_multimodal: ({ step, value, onChange, sessionId, activityCode }) => (
    <QaMultimodalWidget
      step={asStep({ ...step, modes: allowedModes(step) })}
      sessionId={sessionId}
      activityCode={activityCode}
      value={(value as any) || {}}
      onChange={(v) => onChange(v)}
          sessionKind="relationship"
    />
  ),
  scored_factors: ({ step, value, onChange }) => (
    <ScoredFactorsWidget
      step={asStep(step)}
      value={(value as Record<string, number>) || {}}
      onChange={(v) => onChange(v)}
    />
  ),
  text_select: ({ step, value, onChange, sessionId, activityCode }) => (
    <TextSelectWidget
      step={asStep(step)}
      value={(value as any[]) || []}
      onChange={(v) => onChange(v)}
      sessionId={sessionId}
      activityCode={activityCode}
          sessionKind="relationship"
    />
  ),
  image_select: ({ step, value, onChange }) => (
    <ImageSelectWidget step={asStep(step)} value={(value as any[]) || []} onChange={(v) => onChange(v)} />
  ),
  recap: ({ sessionId, value, onChange }) => (
    <RecapWidget
      sessionId={sessionId}
      recap={(value as { html?: string }) || undefined}
      onRecap={(html) => onChange({ html })}
    />
  ),
  paired_qa: ({ step, couple, value, onChange, sessionId, activityCode, relationshipId }) => (
    <PairedQaWidget
      step={step}
      couple={couple}
      sessionId={sessionId}
      activityCode={activityCode}
      relationshipId={relationshipId}
      value={(value as Record<string, unknown>) || {}}
      onChange={(v) => onChange(v)}
    />
  ),
  couple_agreement: ({ step, couple, value, onChange, sessionId, activityCode }) => (
    <CoupleAgreementWidget
      step={step}
      couple={couple}
      sessionId={sessionId}
      activityCode={activityCode}
      value={(value as Record<string, unknown>) || {}}
      onChange={(v) => onChange(v)}
    />
  ),
  joint_session: ({ step, couple, value, onChange, sessionId, activityCode }) => (
    <JointSessionWidget
      step={step}
      couple={couple}
      sessionId={sessionId}
      activityCode={activityCode}
      value={(value as Record<string, unknown>) || {}}
      onChange={(v) => onChange(v)}
    />
  ),
  statement_select: ({ step, value, onChange, sessionId, activityCode }) => (
    <StatementSelectWidget
      step={step}
      value={(value as string[]) || []}
      onChange={(v) => onChange(v)}
      sessionId={sessionId}
      activityCode={activityCode}
    />
  ),
  inner_team: ({ step, value, onChange, sessionId, activityCode }) => (
    <InnerTeamWidget
      step={asStep(step)}
      session={{ id: sessionId, current_step: 0 } as any}
      responses={(value as any) || {}}
      setResponses={(u) => onChange(u(((value as any) || {}) as any))}
      activityCode={activityCode}
      setCoachingRemaining={() => {}}
    />
  ),

  journey_map: ({ step, value, onChange }) => (
    <JourneyMapWidget step={step} value={(value as string[]) || []} onChange={(v) => onChange(v)} />
  ),
  visibility_explainer: ({ step }) => <VisibilityExplainerWidget step={step} />,
  guess_lock: ({ step, couple, value, onChange, readOnly }) => (
    <GuessLockWidget
      step={step}
      couple={couple}
      value={(value as GuessValue) || {}}
      onChange={(v) => onChange(v)}
      readOnly={readOnly}
    />
  ),
  profile_reveal: ({ step, couple, responses, analysisHtml }) => (
    <ProfileRevealWidget step={step} couple={couple} responses={responses || {}} analysisHtml={analysisHtml} />
  ),
  safety_screen: ({ step, value, onChange, responses, relationshipId, activityId }) => (
    <SafetyScreenWidget
      step={step}
      value={value}
      onChange={onChange}
      responses={responses || {}}
      relationshipId={relationshipId}
      activityId={activityId}
    />
  ),

  ikigai: ({ step, value, onChange, sessionId, activityCode }) => {
    // The coaching component cannot express a couple overlay; don't fake one.
    if (step.mode === "couple_overlay" || step.dualLayer) return <UnknownWidget name="ikigai (couple_overlay)" />;
    return (
      <IkigaiWidget
        step={asStep(step)}
        session={{ id: sessionId, current_step: 0 } as any}
        responses={(value as any) || {}}
        setResponses={(u) => onChange(u(((value as any) || {}) as any))}
        activityCode={activityCode}
        setCoachingRemaining={() => {}}
            sessionKind="relationship"
    />
    );
  },

  image_describe: ({ step, value, onChange, sessionId, activityCode }) => (
    <ImageDescribeWidget
      step={asStep(step)}
      value={(value as any[]) || []}
      onChange={(v) => onChange(v)}
      sessionId={sessionId}
      activityCode={activityCode}
          sessionKind="relationship"
    />
  ),
  couple_timeline: ({ step, couple, value, onChange, sessionId, activityCode, readOnly }) => (
    <CoupleTimelineWidget
      step={step}
      couple={couple}
      value={(value as TimelineEvent[]) || []}
      onChange={(v) => onChange(v)}
      sessionId={sessionId}
      activityCode={activityCode}
      readOnly={readOnly}
    />
  ),
  synthesis: ({ step, couple, responses, analysisHtml }) => (
    <SynthesisWidget step={step} couple={couple} responses={responses || {}} analysisHtml={analysisHtml} />
  ),
  overlap_reveal: ({ step, couple, analysisHtml, analyzing }) => (
    <OverlapRevealWidget step={step} couple={couple} analysisHtml={analysisHtml} analyzing={analyzing} />
  ),
  own_readback: ({ step, relationshipId }) => (
    <OwnReadbackWidget step={step} relationshipId={relationshipId} />
  ),
  reused_steps: ({ step, couple, value, onChange, sessionId, activityCode, readOnly, relationshipId, activityId }) => (
    <ReusedStepsWidget
      step={step}
      couple={couple}
      value={(value as Record<string, unknown>) || {}}
      onChange={(v) => onChange(v)}
      sessionId={sessionId}
      activityCode={activityCode}
      readOnly={readOnly}
      relationshipId={relationshipId}
      activityId={activityId}
    />
  ),



  // Picks live in relationship_desire_picks, never in session responses: no onChange here.
  desire_grid: ({ step, couple, relationshipId, activityId, readOnly }) => (
    <DesireGridWidget
      step={step}
      couple={couple}
      relationshipId={relationshipId}
      activityId={activityId}
      readOnly={readOnly}
    />
  ),
  couple_molecule: ({ step, couple, value, onChange, sessionId, activityCode, readOnly }) => (
    <CoupleMoleculeWidget
      step={step}
      couple={couple}
      value={(value as MoleculeNode[]) || []}
      onChange={(v) => onChange(v)}
      sessionId={sessionId}
      activityCode={activityCode}
      readOnly={readOnly}
    />
  ),

  ai_panel: ({ couple, analysisHtml, analyzing, pendingReason }) => {
    if (pendingReason) {
      return (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm">
            This piece is written for the two of you together, so it waits until {couple.otherFirstName} has
            finished their side.
          </p>
        </div>
      );
    }
    if (analyzing && !analysisHtml) {
      return (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Writing this for the two of you…
        </div>
      );
    }
    if (analysisHtml) return <AiAnalysisPanel html={analysisHtml} />;
    return null;
  },
};

export function UnknownWidget({ name }: { name: string }) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">This step type isn't built yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">{name}</p>
      </CardContent>
    </Card>
  );
}
