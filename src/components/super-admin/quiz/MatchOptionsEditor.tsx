import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DraftOption } from "./MultipleChoiceOptionsEditor";

const MIN_PAIRS = 2;
const MAX_PAIRS = 6;
const MAX_TEXT = 200;

export interface MatchPair {
  key: string;
  prompt: DraftOption; // display_order=0, is_correct=false
  answer: DraftOption; // display_order=1, is_correct=true
}

export function optionsToPairs(options: DraftOption[]): MatchPair[] {
  const groups = new Map<string, DraftOption[]>();
  for (const o of options) {
    const k = (o as any).match_pair_key ?? null;
    if (!k) continue;
    const arr = groups.get(k) ?? [];
    arr.push(o);
    groups.set(k, arr);
  }
  const out: MatchPair[] = [];
  for (const [key, arr] of groups) {
    const prompt =
      arr.find((o) => o.display_order === 0) ?? { ...arr[0], is_correct: false, display_order: 0 };
    const answer =
      arr.find((o) => o.display_order === 1) ?? {
        ...(arr[1] ?? arr[0]),
        is_correct: true,
        display_order: 1,
      };
    out.push({ key, prompt, answer });
  }
  return out;
}

export function pairsToOptions(pairs: MatchPair[]): DraftOption[] {
  const out: DraftOption[] = [];
  for (const p of pairs) {
    out.push({ ...p.prompt, is_correct: false, display_order: 0 });
    out.push({ ...p.answer, is_correct: true, display_order: 1 });
  }
  return out;
}

export function buildPair(): MatchPair {
  const key = crypto.randomUUID();
  return {
    key,
    prompt: {
      client_id: crypto.randomUUID(),
      id: null,
      option_text: "",
      is_correct: false,
      display_order: 0,
    },
    answer: {
      client_id: crypto.randomUUID(),
      id: null,
      option_text: "",
      is_correct: true,
      display_order: 1,
    },
  };
}

interface Props {
  pairs: MatchPair[];
  onChange: (next: MatchPair[]) => void;
}

export function MatchOptionsEditor({ pairs, onChange }: Props) {
  const update = (key: string, patch: Partial<MatchPair>) => {
    onChange(pairs.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  };

  const addPair = () => {
    if (pairs.length >= MAX_PAIRS) return;
    onChange([...pairs, buildPair()]);
  };

  const removePair = (key: string) => {
    if (pairs.length <= MIN_PAIRS) return;
    onChange(pairs.filter((p) => p.key !== key));
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Define {MIN_PAIRS}-{MAX_PAIRS} pairs. Trainees see the right column shuffled and link each
        prompt to its correct answer.
      </p>
      <div className="space-y-2">
        {pairs.map((pair, idx) => (
          <div key={pair.key} className="space-y-2 rounded-md border bg-background p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Pair {idx + 1}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removePair(pair.key)}
                aria-label="Remove pair"
                disabled={pairs.length <= MIN_PAIRS}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Prompt (left)
                </Label>
                <Input
                  value={pair.prompt.option_text}
                  onChange={(e) =>
                    update(pair.key, {
                      prompt: { ...pair.prompt, option_text: e.target.value },
                    })
                  }
                  maxLength={MAX_TEXT}
                  placeholder="Prompt"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Answer (right)
                </Label>
                <Input
                  value={pair.answer.option_text}
                  onChange={(e) =>
                    update(pair.key, {
                      answer: { ...pair.answer, option_text: e.target.value },
                    })
                  }
                  maxLength={MAX_TEXT}
                  placeholder="Matching answer"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addPair}
        disabled={pairs.length >= MAX_PAIRS}
      >
        <Plus className="mr-1 h-4 w-4" />
        Add pair
      </Button>
      {pairs.length >= MAX_PAIRS && (
        <p className="text-xs text-muted-foreground">Max {MAX_PAIRS} pairs.</p>
      )}
    </div>
  );
}
