import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { type Step } from "../shared";

export function ScoredFactorsWidget({
  step,
  value,
  onChange,
}: {
  step: Step;
  value: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
}) {
  const scores = value || {};
  const min = step.scale?.min ?? 0;
  const max = step.scale?.max ?? 10;
  const factors = step.factors || [];
  const sides = step.sides && step.sides.length > 0 ? step.sides : null;
  const opts: number[] = [];
  for (let i = min; i <= max; i++) opts.push(i);
  const setScore = (fk: string, n: number) => onChange({ ...scores, [fk]: n });

  const Scale = ({ fk }: { fk: string }) => (
    <div className="flex flex-wrap gap-1.5">
      {opts.map((n) => {
        const selected = scores[fk] === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => setScore(fk, n)}
            aria-pressed={selected}
            className={
              "h-8 w-8 rounded-md border text-sm transition-colors " +
              (selected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent hover:text-accent-foreground border-input")
            }
          >
            {n}
          </button>
        );
      })}
    </div>
  );

  const Factor = ({ f }: { f: NonNullable<Step["factors"]>[number] }) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{f.label}</Label>
      {f.helper && <p className="text-xs text-muted-foreground">{f.helper}</p>}
      <Scale fk={f.key} />
    </div>
  );

  const sumFor = (sideKey: string) =>
    factors
      .filter((f) => f.side === sideKey)
      .reduce((t, f) => t + (typeof scores[f.key] === "number" ? scores[f.key] : 0), 0);

  if (sides) {
    return (
      <div className="space-y-4">
        {step.helper && <p className="text-sm text-muted-foreground">{step.helper}</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {sides.map((side) => (
            <Card key={side.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{side.label}</CardTitle>
                  <span className="text-xs text-muted-foreground">sum {sumFor(side.key)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {factors.filter((f) => f.side === side.key).map((f) => (
                  <Factor key={f.key} f={f} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {step.helper && <p className="text-sm text-muted-foreground">{step.helper}</p>}
      {factors.map((f) => (
        <Factor key={f.key} f={f} />
      ))}
    </div>
  );
}
