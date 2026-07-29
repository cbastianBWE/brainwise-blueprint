import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PairedQaWidget } from "./runner/widgets/PairedQaWidget";
import { CoupleAgreementWidget } from "./runner/widgets/CoupleAgreementWidget";
import { JointSessionWidget } from "./runner/widgets/JointSessionWidget";
import {
  waitingContext,
  revealedContext,
  summaryContext,
  pairedQaTwoPass,
  pairedQaSubfields,
  pairedQaDualRater,
  pairedQaRevealOnly,
  pairedQaGuess,
  pairedQaCompare,
  pairedQaRevealsNothing,
  agreementStarters,
  agreementFullRequirements,
  agreementOutcomes,
  agreementPersonal,
  agreementNoStarters,
  jointTurns,
  jointScaffold,
  jointBare,
} from "./runner/__fixtures__/coupleFixtures";
import type { CoupleStep } from "./runner/coupleShared";

type Mode = "waiting" | "revealed" | "summary";

/**
 * TEMPORARY dev harness for the couple widgets.
 * Not linked from any nav. Fixtures only — nothing here touches the backend.
 */
export default function WidgetPreview() {
  const [mode, setMode] = useState<Mode>("waiting");
  const [values, setValues] = useState<Record<string, Record<string, unknown>>>({
    // seed the earlier captures these steps compare against
    "pq-guess": { owned_moves: ["I go quiet.", "I get sharp about small things."] },
    "pq-compare": { share_estimate: "Feels closer to 50/50 to me, most weeks." },
  });

  const couple = mode === "waiting" ? waitingContext : mode === "revealed" ? revealedContext : summaryContext;

  const valueFor = (id: string) => values[id] || {};
  const setValueFor = (id: string) => (next: Record<string, unknown>) =>
    setValues((prev) => ({ ...prev, [id]: next }));

  const Section = ({ title, step, children }: { title: string; step: CoupleStep; children: React.ReactNode }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {title} <span className="text-xs font-normal text-muted-foreground">{step.id}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto space-y-8 p-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Couple Widget Preview (dev)</h1>
        <div className="flex flex-wrap gap-2">
          {(["waiting", "revealed", "summary"] as Mode[]).map((m) => (
            <Button key={m} size="sm" variant={mode === m ? "default" : "outline"} onClick={() => setMode(m)}>
              {m}
            </Button>
          ))}
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">paired_qa</h2>
        {[pairedQaTwoPass, pairedQaSubfields, pairedQaDualRater, pairedQaRevealOnly].map((step) => (
          <Section key={step.id} title="PairedQaWidget" step={step}>
            <PairedQaWidget
              step={step}
              couple={couple}
              value={valueFor(step.id!)}
              onChange={setValueFor(step.id!)}
            />
          </Section>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">couple_agreement</h2>
        {[agreementStarters, agreementFullRequirements, agreementOutcomes].map((step) => (
          <Section key={step.id} title="CoupleAgreementWidget" step={step}>
            <CoupleAgreementWidget
              step={step}
              couple={couple}
              value={valueFor(step.id!)}
              onChange={setValueFor(step.id!)}
            />
          </Section>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">joint_session</h2>
        {[jointTurns, jointScaffold, jointBare].map((step) => (
          <Section key={step.id} title="JointSessionWidget" step={step}>
            <JointSessionWidget
              step={step}
              couple={couple}
              value={valueFor(step.id!)}
              onChange={setValueFor(step.id!)}
            />
          </Section>
        ))}
      </section>
    </div>
  );
}
