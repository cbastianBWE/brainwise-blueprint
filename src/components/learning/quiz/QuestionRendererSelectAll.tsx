import { Check, X, Square, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizAnswerOption } from "./QuestionRendererMultipleChoice";

interface Props {
  options: QuizAnswerOption[];
  value: string[] | undefined;
  onAnswer: (ids: string[]) => void;
  locked?: boolean;
  disabled?: boolean;
}

export default function QuestionRendererSelectAll({
  options,
  value,
  onAnswer,
  locked,
  disabled,
}: Props) {
  const selected = new Set(value ?? []);
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onAnswer(Array.from(next));
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Select all that apply — you must select every correct option to get credit.
      </p>
      {options.map((opt) => {
        const picked = selected.has(opt.id);
        const isCorrect = opt.is_correct === true;
        const missedCorrect = locked && isCorrect && !picked;
        const wrongPicked = locked && picked && !isCorrect;
        const rightPicked = locked && picked && isCorrect;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled || locked}
            onClick={() => toggle(opt.id)}
            className={cn(
              "w-full text-left rounded-xl border-2 bg-card px-5 py-4 text-base transition-colors",
              "hover:border-[var(--bw-teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-teal)]",
              picked && !locked && "border-[var(--bw-teal)] bg-[var(--bw-teal)]/5",
              !picked && !locked && "border-border",
              rightPicked && "border-[var(--bw-forest)]",
              wrongPicked && "border-destructive",
              missedCorrect && "border-[var(--bw-forest)] border-dashed",
              (disabled || locked) && "cursor-default",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-3 font-medium">
                {picked ? (
                  <CheckSquare className="h-5 w-5 text-[var(--bw-teal)] shrink-0" />
                ) : (
                  <Square className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                {opt.option_text}
              </span>
              {rightPicked && <Check className="h-5 w-5 text-[var(--bw-forest)] shrink-0" />}
              {wrongPicked && <X className="h-5 w-5 text-destructive shrink-0" />}
              {missedCorrect && (
                <span className="text-xs text-muted-foreground italic">you missed this</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
