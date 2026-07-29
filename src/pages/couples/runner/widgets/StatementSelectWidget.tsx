import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultimodalField, type MMValue } from "@/components/coaching/MultimodalField";
import type { CoupleStep } from "../coupleShared";

export function StatementSelectWidget({
  step,
  value,
  onChange,
  sessionId,
  activityCode,
}: {
  step: CoupleStep;
  value: string[];
  onChange: (next: string[]) => void;
  sessionId: string;
  activityCode: string;
}) {
  const [draft, setDraft] = useState<MMValue | undefined>("");
  const options = Array.isArray(step.options) ? step.options.filter((o) => typeof o === "string" && o.trim()) : [];
  const selected = Array.isArray(value) ? value : [];
  const max = typeof step.selectMax === "number" ? step.selectMax : undefined;

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
      return;
    }
    if (max !== undefined && selected.length >= max) return;
    onChange([...selected, opt]);
  };

  const addCustom = () => {
    const text = typeof draft === "string" ? draft.trim() : "";
    if (!text || selected.includes(text)) return;
    if (max !== undefined && selected.length >= max) return;
    onChange([...selected, text]);
    setDraft("");
  };

  const extras = selected.filter((s) => !options.includes(s));

  return (
    <div className="space-y-4">
      {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}

      {options.length === 0 && extras.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing to choose here yet.</p>
      ) : (
        <ul className="space-y-2">
          {[...options, ...extras].map((opt) => {
            const isOn = selected.includes(opt);
            return (
              <li key={opt}>
                <button
                  type="button"
                  aria-pressed={isOn}
                  onClick={() => toggle(opt)}
                  className={
                    "flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors " +
                    (isOn ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50")
                  }
                >
                  <span
                    className={
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border " +
                      (isOn ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")
                    }
                  >
                    {isOn && <Check className="h-3 w-3" />}
                  </span>
                  <span>{opt}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {max !== undefined && (
        <p className="text-xs text-muted-foreground">
          {selected.length} of {max} selected.
        </p>
      )}

      {step.allowCustom && (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Add your own</p>
          <MultimodalField
            value={draft}
            onChange={setDraft}
            sessionId={sessionId}
            activityCode={activityCode}
            questionKey={`${step.key || step.id || "statement_select"}__custom`}
            sessionKind="relationship"
            modes={["text", "dictate"]}
            minRows={2}
          />
          <Button variant="outline" size="sm" onClick={addCustom} disabled={!(typeof draft === "string" && draft.trim())}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      )}
    </div>
  );
}
