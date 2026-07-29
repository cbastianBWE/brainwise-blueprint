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

import type { CoupleContext, CoupleStep } from "./coupleShared";

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
    />
  ),
  list_builder: ({ step, value, onChange, sessionId, activityCode }) => (
    <ListBuilderWidget
      step={asStep(step)}
      items={(value as MMValue[]) || []}
      onChange={(v) => onChange(v)}
      sessionId={sessionId}
      activityCode={activityCode}
    />
  ),
  risk_blocks: ({ step, value, onChange, sessionId, activityCode }) => (
    <RiskBlocksWidget
      step={asStep(step)}
      items={(value as any[]) || []}
      onChange={(v) => onChange(v)}
      sessionId={sessionId}
      activityCode={activityCode}
    />
  ),
  qa_multimodal: ({ step, value, onChange, sessionId, activityCode }) => (
    <QaMultimodalWidget
      step={asStep(step)}
      sessionId={sessionId}
      activityCode={activityCode}
      value={(value as any) || {}}
      onChange={(v) => onChange(v)}
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
  paired_qa: ({ step, couple, value, onChange, sessionId, activityCode }) => (
    <PairedQaWidget
      step={step}
      couple={couple}
      sessionId={sessionId}
      activityCode={activityCode}
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
