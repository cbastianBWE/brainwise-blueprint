import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { CascadeResult } from "@/hooks/useCompletionReporter";
import QuizProgressBar, { type DotState } from "./QuizProgressBar";
import QuestionRendererMultipleChoice, {
  type QuizAnswerOption,
} from "./QuestionRendererMultipleChoice";
import QuestionRendererTrueFalse from "./QuestionRendererTrueFalse";
import QuestionRendererSelectAll from "./QuestionRendererSelectAll";
import QuestionRendererMatch from "./QuestionRendererMatch";
import QuizSummaryScreen from "./QuizSummaryScreen";

type AnswerValue = string | string[] | Record<string, string>;

interface QuizQuestion {
  id: string;
  question_type:
    | "multiple_choice"
    | "true_false"
    | "select_all"
    | "match_definition"
    | "match_picture";
  question_text: string;
  question_image_url: string | null;
  display_order: number;
  points: number;
  explanation: string | null;
  options?: QuizAnswerOption[];
  prompts?: QuizAnswerOption[];
  answers?: QuizAnswerOption[];
}

interface QuizPayload {
  content_item: {
    id: string;
    title: string;
    description: string | null;
    quiz_pass_threshold_pct: number;
    quiz_show_correct_mode:
      | "never"
      | "after_pass"
      | "after_each_attempt"
      | "always";
  };
  questions: QuizQuestion[];
  last_attempt: any | null;
  best_score_pct: number | null;
  ever_passed: boolean;
  attempts_count: number;
}

interface ViewerProps {
  contentItem: any;
  completion: any | null;
  viewerRole: "self" | "mentor" | "super_admin";
  reportCompletion: (
    rpcName: string,
    rpcArgs: Record<string, unknown>,
  ) => Promise<{
    ok: boolean;
    cascade: CascadeResult | null;
    error?: string;
    result?: unknown;
  }>;
  isReporting: boolean;
}

function mapQuizViewerRpcError(error: any): string {
  const msg: string = error?.message ?? "";
  if (msg.includes("authentication_required")) return "Please sign in to take this quiz.";
  if (msg.includes("content_item_not_found")) return "This quiz could not be found.";
  if (msg.includes("content_item_not_quiz")) return "This content item is not a quiz.";
  if (msg.includes("content_item_archived")) return "This quiz is no longer available.";
  if (msg.includes("parent_module_not_found"))
    return "The module this quiz belongs to could not be found.";
  if (msg.includes("parent_module_archived"))
    return "The module this quiz belongs to is no longer available.";
  if (msg.includes("parent_module_not_published")) return "This quiz is not yet published.";
  if (msg.includes("attempt_not_found")) return "Quiz attempt could not be found.";
  if (msg.includes("forbidden")) return "You do not have permission to view this attempt.";
  if (msg.includes("IMPERSONATION_DENIED"))
    return "Quiz submission is not allowed during impersonation.";
  return msg || "Could not load or submit the quiz.";
}

function isAnswerComplete(q: QuizQuestion, a: AnswerValue | undefined): boolean {
  if (a === undefined || a === null) return false;
  switch (q.question_type) {
    case "multiple_choice":
    case "true_false":
      return typeof a === "string" && a.length > 0;
    case "select_all":
      return Array.isArray(a) && a.length > 0;
    case "match_definition":
      if (typeof a !== "object" || Array.isArray(a)) return false;
      return (q.prompts ?? []).every((p) => !!(a as Record<string, string>)[p.id]);
    case "match_picture":
      return false;
    default:
      return false;
  }
}

type Stage = "intro" | "in_progress" | "submitting" | "summary" | "submit_error";

export default function QuizViewer({
  contentItem,
  viewerRole,
  reportCompletion,
}: ViewerProps) {
  const navigate = useNavigate();
  const contentItemId: string = contentItem.id;
  const moduleId: string | null = contentItem.module_id ?? null;

  const quizQuery = useQuery({
    queryKey: ["quiz-for-trainee", contentItemId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_quiz_for_trainee" as never,
        { p_content_item_id: contentItemId } as never,
      );
      if (error) throw error;
      return data as unknown as QuizPayload;
    },
  });

  const [stage, setStage] = useState<Stage>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [lockedQuestions, setLockedQuestions] = useState<Set<string>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<any | null>(null);

  const resultsQuery = useQuery({
    queryKey: ["quiz-attempt-results", submitResult?.attempt_id],
    enabled: stage === "summary" && !!submitResult?.attempt_id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_quiz_attempt_results" as never,
        { p_attempt_id: submitResult.attempt_id } as never,
      );
      if (error) throw error;
      return data as any;
    },
  });

  const quiz = quizQuery.data;
  const mode = quiz?.content_item.quiz_show_correct_mode;
  const isAlways = mode === "always";

  const sortedQuestions = useMemo(
    () =>
      (quiz?.questions ?? [])
        .slice()
        .sort((a, b) => a.display_order - b.display_order),
    [quiz],
  );

  const resetAttemptState = () => {
    setCurrentIndex(0);
    setAnswers({});
    setLockedQuestions(new Set());
    setSubmitError(null);
    setSubmitResult(null);
  };

  if (quizQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (quizQuery.isError || !quiz) {
    return (
      <div className="rounded-md border border-destructive/30 bg-card p-6 text-destructive">
        {mapQuizViewerRpcError(quizQuery.error)}
      </div>
    );
  }

  const goModule = () =>
    moduleId ? navigate(`/learning/module/${moduleId}`) : navigate(-1);

  // Zero-question state
  if (sortedQuestions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border bg-card p-8 text-center space-y-4">
        <h2 className="text-xl font-semibold">This quiz isn't ready yet</h2>
        <p className="text-sm text-muted-foreground">
          Check back later — your instructor is still preparing the questions.
        </p>
        <Button variant="outline" onClick={goModule}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to module
        </Button>
      </div>
    );
  }

  // INTRO
  if (stage === "intro") {
    const readOnly = viewerRole !== "self";
    let heading = "Ready to start?";
    let body: React.ReactNode = null;
    let ctaLabel = "Start quiz";
    if (quiz.attempts_count === 0) {
      heading = quiz.content_item.title;
      body = (
        <>
          {quiz.content_item.description && (
            <p className="text-muted-foreground">{quiz.content_item.description}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {sortedQuestions.length} question{sortedQuestions.length === 1 ? "" : "s"} ·
            pass threshold {quiz.content_item.quiz_pass_threshold_pct}%
          </p>
        </>
      );
    } else if (quiz.ever_passed) {
      heading = `You've passed this quiz with ${quiz.best_score_pct ?? 0}%`;
      body = (
        <p className="text-sm text-muted-foreground">
          Would you like to retake? Your score won't go down — your best result stays.
        </p>
      );
      ctaLabel = "Retake";
    } else {
      heading = `Try again — your best so far was ${quiz.best_score_pct ?? 0}%`;
      body = (
        <p className="text-sm text-muted-foreground">
          {sortedQuestions.length} question{sortedQuestions.length === 1 ? "" : "s"} ·
          pass threshold {quiz.content_item.quiz_pass_threshold_pct}%
        </p>
      );
      ctaLabel = `Start attempt ${quiz.attempts_count + 1}`;
    }

    return (
      <div className="mx-auto max-w-2xl rounded-xl border bg-card p-8 space-y-5 text-center">
        <h2 className="text-2xl font-semibold">{heading}</h2>
        <div className="space-y-2">{body}</div>
        {readOnly ? (
          <p className="text-sm text-muted-foreground italic">
            Review mode — you cannot submit an attempt as {viewerRole.replace("_", " ")}.
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => {
                resetAttemptState();
                setStage("in_progress");
              }}
              className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
            >
              {ctaLabel}
            </Button>
            <Button variant="outline" onClick={goModule}>
              Back to module
            </Button>
          </div>
        )}
      </div>
    );
  }

  // SUMMARY
  if (stage === "summary" && submitResult) {
    return (
      <QuizSummaryScreen
        submitResult={submitResult}
        results={resultsQuery.data ?? null}
        isLoading={resultsQuery.isLoading}
        moduleId={moduleId}
        onTryAgain={() => {
          resetAttemptState();
          setStage("intro");
        }}
      />
    );
  }

  // IN PROGRESS / SUBMITTING / ERROR
  const currentQuestion = sortedQuestions[currentIndex];
  const currentAnswer = answers[currentQuestion.id];
  const isLocked = isAlways && lockedQuestions.has(currentQuestion.id);
  const complete = isAnswerComplete(currentQuestion, currentAnswer);
  const isLast = currentIndex === sortedQuestions.length - 1;
  const isUnsupported = currentQuestion.question_type === "match_picture";

  const setAnswerFor = (val: AnswerValue) =>
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }));

  const dotStates: DotState[] = sortedQuestions.map((q, i) => {
    if (i === currentIndex) return "current";
    if (isAlways && lockedQuestions.has(q.id)) {
      // Determine correctness based on payload's is_correct flags
      const a = answers[q.id];
      if (a === undefined) return "answered";
      let correct = false;
      if (q.question_type === "multiple_choice" || q.question_type === "true_false") {
        const opt = q.options?.find((o) => o.id === a);
        correct = !!opt?.is_correct;
      } else if (q.question_type === "select_all") {
        const picked = new Set(Array.isArray(a) ? a : []);
        const correctIds = new Set(q.options?.filter((o) => o.is_correct).map((o) => o.id));
        correct =
          picked.size === correctIds.size &&
          [...picked].every((id) => correctIds.has(id));
      } else if (q.question_type === "match_definition") {
        const pairs = (a as Record<string, string>) ?? {};
        correct = (q.prompts ?? []).every((p) => {
          const aid = pairs[p.id];
          const ans = q.answers?.find((x) => x.id === aid);
          return (
            !!p.match_pair_key && !!ans?.match_pair_key && p.match_pair_key === ans.match_pair_key
          );
        });
      }
      return correct ? "correct" : "incorrect";
    }
    if (answers[q.id] !== undefined) return "answered";
    return "empty";
  });

  const doSubmit = async () => {
    setStage("submitting");
    setSubmitError(null);
    const res = await reportCompletion("submit_quiz_attempt", {
      p_content_item_id: contentItemId,
      p_answers: answers,
    });
    if (res.ok && res.result) {
      setSubmitResult(res.result);
      setStage("summary");
    } else {
      setSubmitError(mapQuizViewerRpcError({ message: res.error }));
      setStage("submit_error");
    }
  };

  const handleAdvance = async () => {
    if (isAlways && !isLocked) {
      // First press in always mode locks + reveals
      setLockedQuestions((prev) => new Set(prev).add(currentQuestion.id));
      return;
    }
    if (isLast) {
      await doSubmit();
      return;
    }
    setCurrentIndex((i) => i + 1);
  };

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const renderQuestion = () => {
    if (isUnsupported) {
      return (
        <div className="rounded-lg border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          This question type isn't supported yet — contact your administrator. You can
          continue to the next question.
        </div>
      );
    }
    switch (currentQuestion.question_type) {
      case "multiple_choice":
        return (
          <QuestionRendererMultipleChoice
            options={currentQuestion.options ?? []}
            value={typeof currentAnswer === "string" ? currentAnswer : undefined}
            onAnswer={(id) => setAnswerFor(id)}
            locked={isLocked}
            disabled={viewerRole !== "self" || stage === "submitting"}
          />
        );
      case "true_false":
        return (
          <QuestionRendererTrueFalse
            options={currentQuestion.options ?? []}
            value={typeof currentAnswer === "string" ? currentAnswer : undefined}
            onAnswer={(id) => setAnswerFor(id)}
            locked={isLocked}
            disabled={viewerRole !== "self" || stage === "submitting"}
          />
        );
      case "select_all":
        return (
          <QuestionRendererSelectAll
            options={currentQuestion.options ?? []}
            value={Array.isArray(currentAnswer) ? currentAnswer : undefined}
            onAnswer={(ids) => setAnswerFor(ids)}
            locked={isLocked}
            disabled={viewerRole !== "self" || stage === "submitting"}
          />
        );
      case "match_definition":
        return (
          <QuestionRendererMatch
            prompts={currentQuestion.prompts ?? []}
            answers={currentQuestion.answers ?? []}
            value={
              currentAnswer && typeof currentAnswer === "object" && !Array.isArray(currentAnswer)
                ? (currentAnswer as Record<string, string>)
                : undefined
            }
            onAnswer={(pairs) => setAnswerFor(pairs)}
            locked={isLocked}
            disabled={viewerRole !== "self" || stage === "submitting"}
          />
        );
      default:
        return null;
    }
  };

  const primaryLabel = isUnsupported
    ? isLast
      ? "Skip and submit"
      : "Skip"
    : isAlways && !isLocked
      ? "Submit this question"
      : isLast
        ? "Submit quiz"
        : "Save and continue";

  const primaryDisabled =
    viewerRole !== "self" ||
    stage === "submitting" ||
    (!isUnsupported && !isLocked && !complete);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <QuizProgressBar states={dotStates} currentIndex={currentIndex} />

      <div className="rounded-xl border bg-card p-6 sm:p-8 space-y-6">
        <h2 className="text-xl sm:text-2xl font-semibold leading-snug">
          {currentQuestion.question_text}
        </h2>
        {renderQuestion()}

        {isLocked && currentQuestion.explanation && (
          <div className="rounded-md border bg-muted/50 p-4 text-sm">
            <p className="font-medium mb-1">Explanation</p>
            <p className="text-muted-foreground">{currentQuestion.explanation}</p>
          </div>
        )}
      </div>

      {stage === "submit_error" && submitError && (
        <div className="rounded-md border border-destructive/30 bg-card p-4 text-sm space-y-2">
          <p className="text-destructive">{submitError}</p>
          <Button
            size="sm"
            onClick={doSubmit}
            className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
          >
            Retry
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={handleBack} disabled={currentIndex === 0}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <Button
          onClick={handleAdvance}
          disabled={primaryDisabled}
          className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
        >
          {stage === "submitting" ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Submitting…
            </>
          ) : (
            isAlways && isLocked && !isLast ? "Continue" : primaryLabel
          )}
        </Button>
      </div>
    </div>
  );
}
