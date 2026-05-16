import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2, Plus } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  QuestionCard,
  seedForType,
  type DraftQuestion,
} from "@/components/super-admin/quiz/QuestionCard";
import {
  optionsToPairs,
  pairsToOptions,
  type MatchPair,
} from "@/components/super-admin/quiz/MatchOptionsEditor";
import type { DraftOption } from "@/components/super-admin/quiz/MultipleChoiceOptionsEditor";
import { mapQuizRpcError, useQuizAuthoring } from "@/components/super-admin/quiz/useQuizAuthoring";

const MAX_QUESTIONS_PER_QUIZ = 20;

function rowsToDraft(qRows: any[], oRows: any[]): DraftQuestion[] {
  const byQuestion = new Map<string, any[]>();
  for (const o of oRows) {
    const arr = byQuestion.get(o.question_id) ?? [];
    arr.push(o);
    byQuestion.set(o.question_id, arr);
  }
  return qRows.map((q) => {
    const opts = (byQuestion.get(q.id) ?? [])
      .slice()
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    const options: DraftOption[] = opts.map((o) => ({
      client_id: crypto.randomUUID(),
      id: o.id,
      option_text: o.option_text ?? "",
      is_correct: !!o.is_correct,
      display_order: o.display_order ?? 0,
      // carry match_pair_key piggybacked
      ...({ match_pair_key: o.match_pair_key ?? null } as any),
    }));
    const pairs: MatchPair[] =
      q.question_type === "match_definition" ? optionsToPairs(options) : [];
    return {
      client_id: crypto.randomUUID(),
      id: q.id,
      question_text: q.question_text ?? "",
      question_type: q.question_type,
      points: q.points ?? 1,
      explanation: q.explanation ?? "",
      display_order: q.display_order ?? 0,
      options,
      pairs,
      dirty: false,
      expanded: false,
    };
  });
}

export default function QuizQuestionsEditor() {
  const { contentItemId } = useParams<{ contentItemId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const rpcs = useQuizAuthoring();

  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);

  const itemQuery = useQuery({
    queryKey: ["quiz-editor-item", contentItemId],
    enabled: !!contentItemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items")
        .select("id, title, item_type, archived_at")
        .eq("id", contentItemId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (itemQuery.isLoading || !contentItemId) return;
    const item = itemQuery.data as any;
    if (!item || item.archived_at || item.item_type !== "quiz") {
      toast({
        title: "Not editable",
        description: "That content item is not editable as a quiz.",
        variant: "destructive",
      });
      navigate("/super-admin/content-authoring", { replace: true });
    }
  }, [itemQuery.isLoading, itemQuery.data, contentItemId, navigate, toast]);

  const loadAll = useCallback(async () => {
    if (!contentItemId) return;
    const { data: qRows, error: qErr } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("content_item_id", contentItemId)
      .is("archived_at", null)
      .order("display_order", { ascending: true });
    if (qErr) {
      toast({ title: "Failed to load questions", description: qErr.message, variant: "destructive" });
      return;
    }
    const ids = (qRows ?? []).map((q: any) => q.id);
    let oRows: any[] = [];
    if (ids.length > 0) {
      const { data: opts, error: oErr } = await supabase
        .from("quiz_answer_options")
        .select("*")
        .in("question_id", ids)
        .is("archived_at", null)
        .order("display_order", { ascending: true });
      if (oErr) {
        toast({
          title: "Failed to load options",
          description: oErr.message,
          variant: "destructive",
        });
        return;
      }
      oRows = opts ?? [];
    }
    setQuestions(rowsToDraft(qRows ?? [], oRows));
    setLoaded(true);
  }, [contentItemId, toast]);

  useEffect(() => {
    if (!contentItemId || !itemQuery.data || (itemQuery.data as any).item_type !== "quiz") return;
    void loadAll();
  }, [contentItemId, itemQuery.data, loadAll]);

  const isDirty = useMemo(
    () => questions.some((q) => q.dirty || !q.id),
    [questions]
  );

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id || !contentItemId) return;
    const aId = String(active.id).replace(/^q-card:/, "");
    const oId = String(over.id).replace(/^q-card:/, "");
    const from = questions.findIndex((q) => q.client_id === aId);
    const to = questions.findIndex((q) => q.client_id === oId);
    if (from < 0 || to < 0) return;
    const next = arrayMove(questions, from, to).map((q, idx) => ({ ...q, display_order: idx }));
    const prev = questions;
    setQuestions(next);

    // Only commit reorder if every question has an id
    const orderedIds = next.map((q) => q.id).filter((x): x is string => !!x);
    if (orderedIds.length !== next.length) return; // skip server reorder until all saved
    try {
      await rpcs.reorderQuestions(contentItemId, orderedIds, "Reordered quiz questions in editor");
      toast({ title: "Questions reordered." });
    } catch (err: any) {
      setQuestions(prev);
      toast({
        title: "Reorder failed",
        description: mapQuizRpcError(err),
        variant: "destructive",
      });
    }
  };

  const handleAddQuestion = () => {
    if (questions.length >= MAX_QUESTIONS_PER_QUIZ) return;
    const seed = seedForType("multiple_choice");
    const newQ: DraftQuestion = {
      client_id: crypto.randomUUID(),
      id: null,
      question_text: "",
      question_type: "multiple_choice",
      points: 1,
      explanation: "",
      display_order: questions.length,
      options: seed.options,
      pairs: seed.pairs,
      dirty: true,
      expanded: true,
    };
    setQuestions([...questions, newQ]);
  };

  const updateQuestion = (next: DraftQuestion) => {
    setQuestions((prev) => prev.map((q) => (q.client_id === next.client_id ? next : q)));
  };

  const saveQuestion = async (q: DraftQuestion, reason: string) => {
    if (!contentItemId) return;
    setBusyQuestionId(q.client_id);
    try {
      // 1. upsert the question row
      const newId = await rpcs.upsertQuestion({
        id: q.id,
        content_item_id: contentItemId,
        question_type: q.question_type,
        question_text: q.question_text.trim(),
        display_order: q.display_order,
        points: q.points,
        explanation: q.explanation.trim() ? q.explanation.trim() : null,
        reason,
      });

      // 2. compute target option set
      const targetOptions: DraftOption[] =
        q.question_type === "match_definition" ? pairsToOptions(q.pairs) : q.options;

      // map old options for this card (those that had a persisted id)
      const previous: DraftOption[] = q.options.filter((o) => !!o.id);
      const targetById = new Map<string, DraftOption>();
      for (const o of targetOptions) if (o.id) targetById.set(o.id, o);

      // 3. archive options that are no longer present
      for (const prevOpt of previous) {
        if (prevOpt.id && !targetById.has(prevOpt.id)) {
          await rpcs.archiveOption(prevOpt.id, reason);
        }
      }

      // 4. upsert each remaining option
      for (let i = 0; i < targetOptions.length; i++) {
        const opt = targetOptions[i];
        const matchKey =
          q.question_type === "match_definition"
            ? // find the pair key for this option
              (q.pairs.find((p) => p.prompt.client_id === opt.client_id)?.key ??
                q.pairs.find((p) => p.answer.client_id === opt.client_id)?.key ??
                null)
            : null;
        await rpcs.upsertOption({
          id: opt.id,
          question_id: newId,
          option_text: opt.option_text.trim(),
          is_correct: opt.is_correct,
          match_pair_key: matchKey,
          display_order: q.question_type === "match_definition" ? opt.display_order : i,
          reason,
        });
      }

      toast({ title: "Question saved." });
      await loadAll();
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: mapQuizRpcError(err),
        variant: "destructive",
      });
    } finally {
      setBusyQuestionId(null);
    }
  };

  const archiveQuestion = async (q: DraftQuestion, reason: string) => {
    if (!q.id) {
      // unsaved new question — just drop locally
      setQuestions((prev) => prev.filter((x) => x.client_id !== q.client_id));
      return;
    }
    setBusyQuestionId(q.client_id);
    try {
      await rpcs.archiveQuestion(q.id, reason);
      toast({ title: "Question archived." });
      await loadAll();
    } catch (err: any) {
      toast({
        title: "Archive failed",
        description: mapQuizRpcError(err),
        variant: "destructive",
      });
    } finally {
      setBusyQuestionId(null);
    }
  };

  const item = itemQuery.data as any;

  if (itemQuery.isLoading || !loaded) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/super-admin/content-authoring")}
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1
              className="font-display text-3xl font-bold tracking-tight"
              style={{ color: "#021F36" }}
            >
              {item?.title ?? "Quiz"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Author the questions and answers for this quiz.
            </p>
          </div>
        </div>
      </div>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8">
            <div className="text-sm text-muted-foreground">No questions yet</div>
            <Button onClick={handleAddQuestion}>
              <Plus className="mr-1 h-4 w-4" />
              Add your first question
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={questions.map((q) => `q-card:${q.client_id}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <QuestionCard
                    key={q.client_id}
                    question={q}
                    index={idx}
                    onChange={updateQuestion}
                    onSave={saveQuestion}
                    onArchive={archiveQuestion}
                    busy={busyQuestionId === q.client_id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div>
            <Button
              variant="outline"
              onClick={handleAddQuestion}
              disabled={questions.length >= MAX_QUESTIONS_PER_QUIZ}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add question
            </Button>
            {questions.length >= MAX_QUESTIONS_PER_QUIZ && (
              <span className="ml-2 text-xs text-muted-foreground">
                Max {MAX_QUESTIONS_PER_QUIZ} questions per quiz.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
