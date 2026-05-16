import { Check, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { QuizAnswerOption } from "./QuestionRendererMultipleChoice";

interface MatchOption extends QuizAnswerOption {
  match_pair_key?: string | null;
}

interface Props {
  prompts: MatchOption[];
  answers: MatchOption[];
  value: Record<string, string> | undefined; // promptId -> answerId
  onAnswer: (pairs: Record<string, string>) => void;
  locked?: boolean;
  disabled?: boolean;
}

const CHIP_COLORS = [
  "var(--bw-navy)",
  "var(--bw-teal)",
  "var(--bw-orange)",
  "var(--bw-plum)",
  "var(--bw-forest)",
  "var(--bw-mustard)",
];

export default function QuestionRendererMatch({
  prompts,
  answers,
  value,
  onAnswer,
  locked,
  disabled,
}: Props) {
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const pairs = value ?? {};

  // Build orderedPromptIds for stable chip colors (in pair-creation order)
  const promptOrder = prompts.map((p) => p.id);
  const colorFor = (promptId: string) => {
    const idx = promptOrder.indexOf(promptId);
    return CHIP_COLORS[idx % CHIP_COLORS.length];
  };

  const answerToPrompt: Record<string, string> = {};
  Object.entries(pairs).forEach(([p, a]) => {
    answerToPrompt[a] = p;
  });

  const handlePromptClick = (id: string) => {
    if (locked || disabled) return;
    if (pairs[id]) {
      // unpair
      const next = { ...pairs };
      delete next[id];
      onAnswer(next);
      setSelectedPromptId(null);
      return;
    }
    setSelectedPromptId((prev) => (prev === id ? null : id));
  };

  const handleAnswerClick = (id: string) => {
    if (locked || disabled) return;
    const pairedPrompt = answerToPrompt[id];
    if (pairedPrompt) {
      // unpair
      const next = { ...pairs };
      delete next[pairedPrompt];
      onAnswer(next);
      return;
    }
    if (!selectedPromptId) return;
    const next = { ...pairs, [selectedPromptId]: id };
    onAnswer(next);
    setSelectedPromptId(null);
  };

  const isPairCorrect = (promptId: string, answerId: string) => {
    const p = prompts.find((x) => x.id === promptId);
    const a = answers.find((x) => x.id === answerId);
    if (!p?.match_pair_key || !a?.match_pair_key) return null;
    return p.match_pair_key === a.match_pair_key;
  };

  const correctAnswerFor = (promptId: string): MatchOption | undefined => {
    const p = prompts.find((x) => x.id === promptId);
    if (!p?.match_pair_key) return undefined;
    return answers.find((a) => a.match_pair_key === p.match_pair_key);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Tap a prompt on the left, then tap its match on the right. Tap again to unpair.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          {prompts.map((p) => {
            const paired = pairs[p.id];
            const color = paired ? colorFor(p.id) : undefined;
            const isSelected = selectedPromptId === p.id;
            const correctness = locked && paired ? isPairCorrect(p.id, paired) : null;
            return (
              <div key={p.id} className="space-y-1">
                <button
                  type="button"
                  disabled={disabled || locked}
                  onClick={() => handlePromptClick(p.id)}
                  className={cn(
                    "w-full text-left rounded-lg border-2 bg-card px-4 py-3 transition-colors",
                    !paired && !isSelected && "border-border hover:border-[var(--bw-teal)]",
                    isSelected && "border-[var(--bw-teal)] bg-[var(--bw-teal)]/5",
                    paired && !locked && "border-transparent",
                    correctness === true && "border-[var(--bw-forest)]",
                    correctness === false && "border-destructive",
                    (disabled || locked) && "cursor-default",
                  )}
                  style={
                    paired && !locked
                      ? { borderColor: color, backgroundColor: `${color}10` }
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{p.option_text}</span>
                    {correctness === true && <Check className="h-4 w-4 text-[var(--bw-forest)]" />}
                    {correctness === false && <X className="h-4 w-4 text-destructive" />}
                  </div>
                </button>
                {locked && correctness === false && (
                  <p className="text-xs text-muted-foreground pl-4">
                    Correct match: {correctAnswerFor(p.id)?.option_text ?? "—"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="space-y-2">
          {answers.map((a) => {
            const pairedPrompt = answerToPrompt[a.id];
            const color = pairedPrompt ? colorFor(pairedPrompt) : undefined;
            return (
              <button
                key={a.id}
                type="button"
                disabled={disabled || locked || (!pairedPrompt && !selectedPromptId)}
                onClick={() => handleAnswerClick(a.id)}
                className={cn(
                  "w-full text-left rounded-lg border-2 bg-card px-4 py-3 transition-colors",
                  !pairedPrompt && "border-border",
                  !pairedPrompt && selectedPromptId && !locked && "hover:border-[var(--bw-teal)]",
                  pairedPrompt && !locked && "border-transparent",
                  (disabled || locked) && "cursor-default",
                )}
                style={
                  pairedPrompt && !locked
                    ? { borderColor: color, backgroundColor: `${color}10` }
                    : undefined
                }
              >
                <span className="font-medium">{a.option_text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
