import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MultimodalField, isMMRec, type MMValue } from "@/components/coaching/MultimodalField";
import type { CoupleContext, CoupleStep } from "../coupleShared";
import { allowedModes } from "../coupleShared";

/**
 * couple_molecule — 5.7. Reworked from the single-person coaching molecule
 * (lifes-tools-dialogue-personal-molecule), which is left untouched.
 * Two people at the centre instead of one. Capture only: the reveal is a later step.
 */

export interface MoleculeNode {
  label: string;
  /** 1 = closest to the couple, 5 = furthest out. The person places it. */
  closeness: number;
  effect?: string;
}

const EFFECT_LABELS: Record<string, string> = {
  strengthen: "Strengthens us",
  strain: "Strains us",
  pull_apart: "Pulls us apart",
};

/** Three genuinely distinct treatments, readable at a glance. */
const EFFECT_STYLES: Record<string, { chip: string; node: string; edge: string; dash?: string }> = {
  strengthen: {
    chip: "border-primary bg-primary/10 text-primary",
    node: "border-primary bg-primary/10",
    edge: "hsl(var(--primary))",
  },
  strain: {
    chip: "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    node: "border-amber-500 bg-amber-500/10",
    edge: "hsl(38 92% 50%)",
    dash: "6 4",
  },
  pull_apart: {
    chip: "border-destructive bg-destructive/10 text-destructive",
    node: "border-destructive bg-destructive/10 border-dashed",
    edge: "hsl(var(--destructive))",
    dash: "2 5",
  },
};

const mmText = (v: MMValue | undefined): string =>
  isMMRec(v) ? String((v as any).transcript || "").trim() : typeof v === "string" ? v.trim() : "";

function Diagram({ nodes, couple }: { nodes: MoleculeNode[]; couple: CoupleContext }) {
  const cx = 200;
  const cy = 150;
  return (
    <svg viewBox="0 0 400 300" className="h-auto w-full" role="img" aria-label="Your molecule">
      {nodes.map((n, i) => {
        const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const radius = 45 + (Math.min(Math.max(n.closeness || 3, 1), 5) - 1) * 24;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius * 0.8;
        const style = EFFECT_STYLES[n.effect || ""] || { edge: "hsl(var(--muted-foreground))" };
        return (
          <g key={`${n.label}-${i}`}>
            <line
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={style.edge}
              strokeWidth={n.effect === "strengthen" ? 2.5 : 1.5}
              strokeDasharray={(style as any).dash}
            />
            <circle cx={x} cy={y} r={16} fill="hsl(var(--background))" stroke={style.edge} strokeWidth={1.5} />
            <text x={x} y={y + 30} textAnchor="middle" className="fill-foreground" fontSize="9">
              {n.label.length > 18 ? `${n.label.slice(0, 17)}…` : n.label}
            </text>
          </g>
        );
      })}
      <ellipse cx={cx} cy={cy} rx={44} ry={26} fill="hsl(var(--primary))" opacity={0.12} />
      <ellipse cx={cx} cy={cy} rx={44} ry={26} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" className="fill-foreground">
        {couple.ownFirstName} &amp; {couple.otherFirstName}
      </text>
    </svg>
  );
}

export function CoupleMoleculeWidget({
  step,
  couple,
  value,
  onChange,
  sessionId,
  activityCode,
  readOnly,
}: {
  step: CoupleStep;
  couple: CoupleContext;
  value: MoleculeNode[];
  onChange: (next: MoleculeNode[]) => void;
  sessionId: string;
  activityCode: string;
  readOnly?: boolean;
}) {
  const nodes = Array.isArray(value) ? value : [];
  const [draft, setDraft] = useState<MMValue | undefined>("");
  const effects = step.bondEffects && step.bondEffects.length > 0
    ? step.bondEffects
    : ["strengthen", "strain", "pull_apart"];
  const modes = allowedModes(step);

  const add = () => {
    const label = mmText(draft);
    if (!label) return;
    onChange([...nodes, { label, closeness: 3 }]);
    setDraft("");
  };

  const patch = (i: number, p: Partial<MoleculeNode>) =>
    onChange(nodes.map((n, idx) => (idx === i ? { ...n, ...p } : n)));

  return (
    <div className="space-y-4">
      {step.intro && <p className="whitespace-pre-line text-sm text-muted-foreground">{step.intro}</p>}

      <div className="rounded-lg border bg-muted/20 p-3">
        <Diagram nodes={nodes} couple={couple} />
      </div>

      {!readOnly && (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Add a person or group</p>
          <p className="text-xs text-muted-foreground">
            Friends, exes, colleagues, family, group chats — anyone whose presence is felt.
          </p>
          <MultimodalField
            value={draft}
            onChange={setDraft}
            sessionId={sessionId}
            activityCode={activityCode}
            questionKey={`${step.key || step.id || "molecule"}__new`}
            modes={modes}
            sessionKind="relationship"
            placeholder="A name, or a group"
            minRows={1}
          />
          <Button size="sm" onClick={add} disabled={!mmText(draft)}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      )}

      <ul className="space-y-3">
        {nodes.map((n, i) => (
          <li key={`${n.label}-${i}`} className="space-y-3 rounded-md border p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{n.label}</p>
              {!readOnly && (
                <Button variant="ghost" size="sm" aria-label={`Remove ${n.label}`} onClick={() => onChange(nodes.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">How close are they to the two of you?</p>
              <Slider
                value={[n.closeness || 3]}
                min={1}
                max={5}
                step={1}
                disabled={readOnly}
                onValueChange={(v) => patch(i, { closeness: v[0] })}
                aria-label={`Closeness of ${n.label}`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Right beside us</span>
                <span>Far out</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {effects.map((e) => {
                const on = n.effect === e;
                const s = EFFECT_STYLES[e];
                return (
                  <button
                    key={e}
                    type="button"
                    aria-pressed={on}
                    disabled={readOnly}
                    onClick={() => patch(i, { effect: on ? undefined : e })}
                    className={
                      "rounded-full border px-3 py-1 text-xs transition-colors " +
                      (on && s ? s.chip : "border-border text-muted-foreground hover:bg-muted/50")
                    }
                  >
                    {EFFECT_LABELS[e] || e}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      {nodes.length === 0 && (
        <p className="text-sm text-muted-foreground">Nobody added yet. Start with whoever comes to mind first.</p>
      )}
    </div>
  );
}
