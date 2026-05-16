import { cn } from "@/lib/utils";

export type DotState = "empty" | "answered" | "current" | "correct" | "incorrect";

interface Props {
  states: DotState[];
  currentIndex: number;
}

export default function QuizProgressBar({ states, currentIndex }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {states.map((s, i) => (
          <span
            key={i}
            className={cn(
              "h-3 w-3 rounded-full transition-colors border",
              s === "empty" && "bg-transparent border-border",
              s === "answered" && "bg-[var(--bw-teal)] border-[var(--bw-teal)]",
              s === "current" && "bg-transparent border-[var(--bw-teal)] ring-2 ring-[var(--bw-teal)]/40",
              s === "correct" && "bg-[var(--bw-forest)] border-[var(--bw-forest)]",
              s === "incorrect" && "bg-destructive border-destructive",
            )}
            aria-label={`Question ${i + 1}: ${s}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Question {currentIndex + 1} of {states.length}
      </p>
    </div>
  );
}
