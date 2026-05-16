import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizAnswerOption } from "./QuestionRendererMultipleChoice";

interface Props {
  options: QuizAnswerOption[];
  value: string | undefined;
  onAnswer: (id: string) => void;
  locked?: boolean;
  disabled?: boolean;
}

export default function QuestionRendererTrueFalse({
  options,
  value,
  onAnswer,
  locked,
  disabled,
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((opt) => {
        const selected = value === opt.id;
        const isCorrect = opt.is_correct === true;
        const showCorrect = locked && isCorrect;
        const showWrong = locked && selected && !isCorrect;
        const dim = locked && !selected && !isCorrect;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled || locked}
            onClick={() => onAnswer(opt.id)}
            className={cn(
              "rounded-xl border-2 bg-card px-6 py-8 text-lg font-semibold transition-colors",
              "hover:border-[var(--bw-teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-teal)]",
              selected && !locked && "border-[var(--bw-teal)] bg-[var(--bw-teal)]/5",
              !selected && !locked && "border-border",
              showCorrect && "border-[var(--bw-forest)]",
              showWrong && "border-destructive",
              dim && "opacity-60",
              (disabled || locked) && "cursor-default",
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <span>{opt.option_text}</span>
              {showCorrect && <Check className="h-5 w-5 text-[var(--bw-forest)]" />}
              {showWrong && <X className="h-5 w-5 text-destructive" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
