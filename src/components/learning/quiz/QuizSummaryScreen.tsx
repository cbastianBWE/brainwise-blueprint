import { Check, X, CircleCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuestionResult {
  question_id: string;
  question_type: string;
  question_text: string;
  points: number;
  explanation: string | null;
  user_answer: any;
  is_question_correct: boolean | null;
  options: any;
}

interface AttemptResults {
  attempt_id: string;
  attempt_number: number;
  score_pct: number;
  passed: boolean;
  pass_threshold_pct: number;
  submitted_at: string;
  reveal_correctness: boolean;
  quiz_show_correct_mode: string;
  question_results: QuestionResult[] | null;
}

interface SubmitResult {
  attempt_id: string;
  attempt_number: number;
  score_pct: number;
  passed: boolean;
  pass_threshold_pct: number;
  earned_points: number;
  total_points: number;
}

interface Props {
  submitResult: SubmitResult;
  results: AttemptResults | null;
  isLoading: boolean;
  moduleId: string | null;
  onTryAgain: () => void;
}

function formatAnswer(qr: QuestionResult, ids: any): string {
  if (!ids) return "—";
  const opts: any[] = Array.isArray(qr.options) ? qr.options : [];
  const findText = (id: string) =>
    opts.find((o) => o.id === id)?.option_text ?? id;

  if (typeof ids === "string") return findText(ids);
  if (Array.isArray(ids)) return ids.map(findText).join(", ") || "—";
  if (typeof ids === "object") {
    return (
      Object.entries(ids)
        .map(([pid, aid]) => `${findText(pid)} → ${findText(String(aid))}`)
        .join("; ") || "—"
    );
  }
  return String(ids);
}

function correctAnswerSummary(qr: QuestionResult): string {
  const opts: any[] = Array.isArray(qr.options) ? qr.options : [];
  if (qr.question_type === "match_definition" || qr.question_type === "match_picture") {
    // Group by match_pair_key
    const byKey: Record<string, any[]> = {};
    opts.forEach((o) => {
      const k = o.match_pair_key;
      if (!k) return;
      (byKey[k] ??= []).push(o);
    });
    return (
      Object.values(byKey)
        .map((pair) => pair.map((p) => p.option_text).join(" → "))
        .join("; ") || "—"
    );
  }
  const correctOpts = opts.filter((o) => o.is_correct);
  if (correctOpts.length === 0) return "—";
  return correctOpts.map((o) => o.option_text).join(", ");
}

export default function QuizSummaryScreen({
  submitResult,
  results,
  isLoading,
  moduleId,
  onTryAgain,
}: Props) {
  const navigate = useNavigate();
  const passed = submitResult.passed;
  const reveal = results?.reveal_correctness === true;
  const mode = results?.quiz_show_correct_mode;

  const goModule = () =>
    moduleId ? navigate(`/learning/module/${moduleId}`) : navigate(-1);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div
        className={cn(
          "rounded-2xl border p-8 text-center",
          passed
            ? "bg-[var(--bw-forest)]/10 border-[var(--bw-forest)]/30"
            : "bg-[var(--bw-sand,#F9F7F1)] border-border",
        )}
      >
        <h2 className="text-xl font-semibold mb-2">
          {passed ? "Nice work — you passed!" : "Nice try — let's see how you did"}
        </h2>
        {passed && (
          <CircleCheck className="mx-auto h-10 w-10 text-[var(--bw-forest)] mb-2" />
        )}
        <div className="text-6xl font-display font-bold tracking-tight">
          {Math.round(submitResult.score_pct)}%
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {submitResult.earned_points} of {submitResult.total_points} points · pass
          threshold {submitResult.pass_threshold_pct}%
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center">Loading details…</p>
      )}

      {!reveal && !isLoading && (
        <p className="text-sm text-muted-foreground text-center">
          {mode === "never"
            ? "Your instructor has set this quiz to hide correct answers."
            : mode === "after_pass"
              ? "Correct answers will be revealed once you pass."
              : ""}
        </p>
      )}

      {reveal && results?.question_results && (
        <div className="space-y-3">
          {results.question_results.map((qr, idx) => {
            const correct = qr.is_question_correct === true;
            return (
              <div
                key={qr.question_id}
                className={cn(
                  "rounded-xl border p-4",
                  correct
                    ? "bg-[var(--bw-forest)]/5 border-[var(--bw-forest)]/30"
                    : "bg-card border-border",
                )}
              >
                <div className="flex items-start gap-3">
                  {correct ? (
                    <Check className="h-5 w-5 text-[var(--bw-forest)] shrink-0 mt-0.5" />
                  ) : (
                    <X className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="font-medium">
                      {idx + 1}. {qr.question_text}
                    </p>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Your answer: </span>
                      <span>{formatAnswer(qr, qr.user_answer)}</span>
                    </div>
                    {!correct && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Correct: </span>
                        <span>{correctAnswerSummary(qr)}</span>
                      </div>
                    )}
                    {qr.explanation && (
                      <p className="text-sm text-muted-foreground italic">
                        {qr.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {passed ? (
          <Button
            onClick={goModule}
            className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
          >
            Continue
          </Button>
        ) : (
          <Button
            onClick={onTryAgain}
            className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
          >
            Try again
          </Button>
        )}
        <Button variant="outline" onClick={goModule}>
          Back to module
        </Button>
      </div>
    </div>
  );
}
