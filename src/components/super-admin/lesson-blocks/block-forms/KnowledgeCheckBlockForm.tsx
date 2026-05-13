import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "../RichTextEditor";
import type { TipTapDocJSON } from "../blockTypeMeta";

type QuestionType =
  | "multiple_choice"
  | "multi_select"
  | "true_false"
  | "fill_in_blank"
  | "match"
  | "ranking"
  | "timeline";

type Choice = { client_id: string; choice_text: string; is_correct: boolean };
type Blank = { client_id: string; correct_value: string; acceptable_alternatives: string[] };
type Pair = { client_id: string; left: string; right: string };
type RankItem = { client_id: string; item_text: string };
type TimelineEvent = { client_id: string; event_label: string };

type Question = {
  client_id: string;
  question_type: QuestionType;
  prompt_markdown: TipTapDocJSON;
  explanation_markdown: TipTapDocJSON;
  choices?: Choice[];
  blanks?: Blank[];
  pairs?: Pair[];
  items?: RankItem[];
  events?: TimelineEvent[];
};

interface Props {
  value: { questions: Question[]; gating_required: boolean };
  onConfigChange: (next: { questions: Question[]; gating_required: boolean }) => void;
}

const emptyDoc = (): TipTapDocJSON => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

const MIN_QUESTIONS = 1;
const MAX_QUESTIONS = 5;
const MAX_CHOICE_TEXT = 200;

const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "multi_select", label: "Multi-select" },
  { value: "true_false", label: "True / False" },
  { value: "fill_in_blank", label: "Fill in the blank" },
  { value: "match", label: "Match" },
  { value: "ranking", label: "Ranking" },
  { value: "timeline", label: "Timeline" },
];

const IMPLEMENTED_TYPES: QuestionType[] = [
  "multiple_choice",
  "multi_select",
  "true_false",
  "fill_in_blank",
  "match",
  "ranking",
  "timeline",
];

const MAX_BLANK_VALUE = 120;
const MIN_BLANKS = 1;
const MAX_BLANKS = 5;
const MAX_PAIR_TEXT = 120;
const MIN_PAIRS = 2;
const MAX_PAIRS = 6;
const MAX_RANK_ITEM_TEXT = 150;
const MIN_RANK_ITEMS = 3;
const MAX_RANK_ITEMS = 7;
const MAX_EVENT_LABEL = 150;
const MIN_EVENTS = 3;
const MAX_EVENTS = 7;

function seedForQuestionType(qType: QuestionType): Partial<Question> {
  switch (qType) {
    case "multiple_choice":
    case "multi_select":
      return {
        choices: [
          { client_id: crypto.randomUUID(), choice_text: "", is_correct: false },
          { client_id: crypto.randomUUID(), choice_text: "", is_correct: false },
        ],
        blanks: undefined,
        pairs: undefined,
        items: undefined,
        events: undefined,
      };
    case "true_false":
      return {
        choices: [
          { client_id: crypto.randomUUID(), choice_text: "True", is_correct: false },
          { client_id: crypto.randomUUID(), choice_text: "False", is_correct: false },
        ],
        blanks: undefined,
        pairs: undefined,
        items: undefined,
        events: undefined,
      };
    case "fill_in_blank":
      return {
        choices: undefined,
        blanks: [
          { client_id: crypto.randomUUID(), correct_value: "", acceptable_alternatives: [] },
        ],
        pairs: undefined,
        items: undefined,
        events: undefined,
      };
    case "match":
      return {
        choices: undefined,
        blanks: undefined,
        pairs: [
          { client_id: crypto.randomUUID(), left: "", right: "" },
          { client_id: crypto.randomUUID(), left: "", right: "" },
        ],
        items: undefined,
        events: undefined,
      };
    case "ranking":
      return {
        choices: undefined,
        blanks: undefined,
        pairs: undefined,
        items: [
          { client_id: crypto.randomUUID(), item_text: "" },
          { client_id: crypto.randomUUID(), item_text: "" },
          { client_id: crypto.randomUUID(), item_text: "" },
        ],
        events: undefined,
      };
    case "timeline":
      return {
        choices: undefined,
        blanks: undefined,
        pairs: undefined,
        items: undefined,
        events: [
          { client_id: crypto.randomUUID(), event_label: "" },
          { client_id: crypto.randomUUID(), event_label: "" },
          { client_id: crypto.randomUUID(), event_label: "" },
        ],
      };
  }
}

function hasContentBeyondDefaults(q: Question): boolean {
  const docHasText = (doc: TipTapDocJSON | null | undefined): boolean => {
    if (!doc) return false;
    let found = false;
    const walk = (node: any) => {
      if (found || !node) return;
      if (typeof node.text === "string" && node.text.trim().length > 0) {
        found = true;
        return;
      }
      if (Array.isArray(node.content)) node.content.forEach(walk);
    };
    walk(doc);
    return found;
  };
  if (docHasText(q.prompt_markdown) || docHasText(q.explanation_markdown)) return true;
  if (
    q.choices &&
    q.choices.some(
      (c) => c.choice_text.trim().length > 0 && c.choice_text !== "True" && c.choice_text !== "False",
    )
  )
    return true;
  if (q.choices && q.choices.some((c) => c.is_correct === true)) return true;
  if (q.blanks && q.blanks.length > 0) return true;
  if (q.pairs && q.pairs.length > 0) return true;
  if (q.items && q.items.length > 0) return true;
  if (q.events && q.events.length > 0) return true;
  return false;
}

function SortableChoice({
  choice,
  index,
  questionType,
  onChange,
  onDelete,
  canDelete,
}: {
  choice: Choice;
  index: number;
  questionType: "multiple_choice" | "multi_select";
  onChange: (next: Choice) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `kc-choice:${choice.client_id}`,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 rounded-md border bg-background p-2">
      <button
        type="button"
        className="mt-2 cursor-grab text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder choice"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Choice {index + 1}</span>
          <label className="flex items-center gap-1.5 text-xs">
            <Checkbox
              checked={choice.is_correct}
              onCheckedChange={(checked) => onChange({ ...choice, is_correct: checked === true })}
            />
            Correct
          </label>
        </div>
        <Input
          value={choice.choice_text}
          onChange={(e) => onChange({ ...choice, choice_text: e.target.value })}
          maxLength={MAX_CHOICE_TEXT}
          placeholder="Choice text"
        />
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="mt-1 h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        disabled={!canDelete}
        aria-label="Delete choice"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ChoicesEditor({
  question,
  questionType,
  onChange,
}: {
  question: Question;
  questionType: "multiple_choice" | "multi_select";
  onChange: (next: Question) => void;
}) {
  const choices = question.choices ?? [];
  const min = 2;
  const max = questionType === "multiple_choice" ? 5 : 6;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id).replace(/^kc-choice:/, "");
    const overId = String(over.id).replace(/^kc-choice:/, "");
    const from = choices.findIndex((c) => c.client_id === activeId);
    const to = choices.findIndex((c) => c.client_id === overId);
    if (from < 0 || to < 0) return;
    onChange({ ...question, choices: arrayMove(choices, from, to) });
  };

  const handleChoiceChange = (next: Choice) => {
    let updated: Choice[];
    if (questionType === "multiple_choice" && next.is_correct === true) {
      updated = choices.map((c) =>
        c.client_id === next.client_id ? { ...next } : { ...c, is_correct: false },
      );
    } else {
      updated = choices.map((c) => (c.client_id === next.client_id ? next : c));
    }
    onChange({ ...question, choices: updated });
  };

  const handleDelete = (clientId: string) => {
    if (choices.length <= min) return;
    onChange({ ...question, choices: choices.filter((c) => c.client_id !== clientId) });
  };

  const handleAdd = () => {
    if (choices.length >= max) return;
    onChange({
      ...question,
      choices: [
        ...choices,
        { client_id: crypto.randomUUID(), choice_text: "", is_correct: false },
      ],
    });
  };

  const correctCount = choices.filter((c) => c.is_correct).length;
  const hint =
    questionType === "multiple_choice"
      ? correctCount === 0
        ? "Pick the one correct answer."
        : correctCount > 1
          ? "Only one answer can be correct in multiple choice."
          : null
      : correctCount === 0
        ? "Pick at least one correct answer."
        : null;

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={choices.map((c) => `kc-choice:${c.client_id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {choices.map((choice, idx) => (
              <SortableChoice
                key={choice.client_id}
                choice={choice}
                index={idx}
                questionType={questionType}
                onChange={handleChoiceChange}
                onDelete={() => handleDelete(choice.client_id)}
                canDelete={choices.length > min}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        disabled={choices.length >= max}
      >
        <Plus className="mr-1 h-4 w-4" />
        Add choice
      </Button>
      {choices.length >= max && (
        <p className="text-xs text-muted-foreground">
          Max {max} choices for {questionType.replace("_", " ")}.
        </p>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TrueFalseEditor({
  question,
  onChange,
}: {
  question: Question;
  onChange: (next: Question) => void;
}) {
  const choices = question.choices ?? [];
  const correctId = choices.find((c) => c.is_correct)?.client_id ?? "";

  const handleCorrectChange = (newCorrectId: string) => {
    onChange({
      ...question,
      choices: choices.map((c) => ({ ...c, is_correct: c.client_id === newCorrectId })),
    });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Correct answer</Label>
      <RadioGroup value={correctId} onValueChange={handleCorrectChange}>
        {choices.map((c) => (
          <label key={c.client_id} className="flex items-center gap-2 text-sm">
            <RadioGroupItem value={c.client_id} />
            {c.choice_text}
          </label>
        ))}
      </RadioGroup>
      {!correctId && (
        <p className="text-xs text-muted-foreground">Pick True or False as the correct answer.</p>
      )}
    </div>
  );
}

function FillInBlankEditor({
  question,
  onChange,
}: {
  question: Question;
  onChange: (next: Question) => void;
}) {
  const blanks = question.blanks ?? [];

  const handleBlankChange = (next: Blank) => {
    onChange({
      ...question,
      blanks: blanks.map((b) => (b.client_id === next.client_id ? next : b)),
    });
  };

  const handleAddBlank = () => {
    if (blanks.length >= MAX_BLANKS) return;
    onChange({
      ...question,
      blanks: [
        ...blanks,
        { client_id: crypto.randomUUID(), correct_value: "", acceptable_alternatives: [] },
      ],
    });
  };

  const handleDeleteBlank = (clientId: string) => {
    if (blanks.length <= MIN_BLANKS) return;
    onChange({ ...question, blanks: blanks.filter((b) => b.client_id !== clientId) });
  };

  const handleAlternativesChange = (blank: Blank, raw: string) => {
    const list = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    handleBlankChange({ ...blank, acceptable_alternatives: list });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Use ___ (three underscores) in the question prompt to mark each blank. Add one row below per blank in order of appearance.
      </p>
      <div className="space-y-2">
        {blanks.map((blank, idx) => (
          <div key={blank.client_id} className="space-y-2 rounded-md border bg-background p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Blank {idx + 1}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleDeleteBlank(blank.client_id)}
                aria-label="Remove blank"
                disabled={blanks.length <= MIN_BLANKS}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Correct value (case-insensitive match)
              </Label>
              <Input
                value={blank.correct_value}
                onChange={(e) => handleBlankChange({ ...blank, correct_value: e.target.value })}
                maxLength={MAX_BLANK_VALUE}
                placeholder="The exact answer expected"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Acceptable alternatives (comma-separated, optional)
              </Label>
              <Input
                value={blank.acceptable_alternatives.join(", ")}
                onChange={(e) => handleAlternativesChange(blank, e.target.value)}
                placeholder="e.g. synonym1, synonym2"
              />
              <p className="text-xs text-muted-foreground">
                Each alternative is also case-insensitive. Use for valid synonyms or alternate spellings.
              </p>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddBlank}
        disabled={blanks.length >= MAX_BLANKS}
      >
        <Plus className="mr-1 h-4 w-4" />
        Add blank
      </Button>
      {blanks.length >= MAX_BLANKS && (
        <p className="text-xs text-muted-foreground">Max {MAX_BLANKS} blanks per question.</p>
      )}
    </div>
  );
}

function MatchEditor({
  question,
  onChange,
}: {
  question: Question;
  onChange: (next: Question) => void;
}) {
  const pairs = question.pairs ?? [];

  const handlePairChange = (next: Pair) => {
    onChange({
      ...question,
      pairs: pairs.map((p) => (p.client_id === next.client_id ? next : p)),
    });
  };

  const handleAddPair = () => {
    if (pairs.length >= MAX_PAIRS) return;
    onChange({
      ...question,
      pairs: [
        ...pairs,
        { client_id: crypto.randomUUID(), left: "", right: "" },
      ],
    });
  };

  const handleDeletePair = (clientId: string) => {
    if (pairs.length <= MIN_PAIRS) return;
    onChange({ ...question, pairs: pairs.filter((p) => p.client_id !== clientId) });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Define {MIN_PAIRS}-{MAX_PAIRS} pairs. Trainees see the right column shuffled and link each right item to its left match.
      </p>
      <div className="space-y-2">
        {pairs.map((pair, idx) => (
          <div key={pair.client_id} className="space-y-2 rounded-md border bg-background p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Pair {idx + 1}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleDeletePair(pair.client_id)}
                aria-label="Remove pair"
                disabled={pairs.length <= MIN_PAIRS}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Left</Label>
                <Input
                  value={pair.left}
                  onChange={(e) => handlePairChange({ ...pair, left: e.target.value })}
                  maxLength={MAX_PAIR_TEXT}
                  placeholder="Left item"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Right (correct match)
                </Label>
                <Input
                  value={pair.right}
                  onChange={(e) => handlePairChange({ ...pair, right: e.target.value })}
                  maxLength={MAX_PAIR_TEXT}
                  placeholder="Matching right item"
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
        onClick={handleAddPair}
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

function SortableQuestion({
  question,
  index,
  onChange,
  onDelete,
  canDelete,
}: {
  question: Question;
  index: number;
  onChange: (next: Question) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `kc-question:${question.client_id}`,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleQuestionTypeChange = (nextType: QuestionType) => {
    if (nextType === question.question_type) return;
    if (hasContentBeyondDefaults(question)) {
      const ok = window.confirm(
        "Switching question types will clear the current configuration. Continue?",
      );
      if (!ok) return;
    }
    const seed = seedForQuestionType(nextType);
    onChange({ ...question, question_type: nextType, ...seed });
  };

  const isImplemented = IMPLEMENTED_TYPES.includes(question.question_type);

  return (
    <div ref={setNodeRef} style={style} className="rounded-md border bg-muted/20 p-3">
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-1 cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder question"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Question {index + 1}
            </span>
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Question type
            </Label>
            <Select
              value={question.question_type}
              onValueChange={(v) => handleQuestionTypeChange(v as QuestionType)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Question prompt
            </Label>
            <RichTextEditor
              value={question.prompt_markdown}
              onChange={(next) => onChange({ ...question, prompt_markdown: next })}
              placeholder="The question the trainee is answering"
              compact
            />
          </div>

          {isImplemented ? (
            <>
              {(question.question_type === "multiple_choice" ||
                question.question_type === "multi_select") && (
                <ChoicesEditor
                  question={question}
                  questionType={question.question_type}
                  onChange={onChange}
                />
              )}
              {question.question_type === "true_false" && (
                <TrueFalseEditor question={question} onChange={onChange} />
              )}
              {question.question_type === "fill_in_blank" && (
                <FillInBlankEditor question={question} onChange={onChange} />
              )}
              {question.question_type === "match" && (
                <MatchEditor question={question} onChange={onChange} />
              )}
            </>
          ) : (
            <div className="rounded-md border border-dashed bg-background p-3 text-xs text-muted-foreground">
              <strong>
                {QUESTION_TYPE_OPTIONS.find((o) => o.value === question.question_type)?.label}
              </strong>{" "}
              support lands in a follow-up session. Pick from the implemented types for now.
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Explanation (shown after the trainee answers)
            </Label>
            <RichTextEditor
              value={question.explanation_markdown}
              onChange={(next) => onChange({ ...question, explanation_markdown: next })}
              placeholder="The teaching point that explains the correct answer"
              compact
            />
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          disabled={!canDelete}
          aria-label="Delete question"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function KnowledgeCheckBlockForm({ value, onConfigChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const questions = value.questions ?? [];
  const gatingRequired = value.gating_required === true;

  const emit = (next: Partial<{ questions: Question[]; gating_required: boolean }>) => {
    onConfigChange({
      questions: next.questions ?? questions,
      gating_required: next.gating_required ?? gatingRequired,
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id).replace(/^kc-question:/, "");
    const overId = String(over.id).replace(/^kc-question:/, "");
    const from = questions.findIndex((q) => q.client_id === activeId);
    const to = questions.findIndex((q) => q.client_id === overId);
    if (from < 0 || to < 0) return;
    emit({ questions: arrayMove(questions, from, to) });
  };

  const handleQuestionChange = (next: Question) => {
    emit({ questions: questions.map((q) => (q.client_id === next.client_id ? next : q)) });
  };

  const handleQuestionDelete = (clientId: string) => {
    if (questions.length <= MIN_QUESTIONS) return;
    emit({ questions: questions.filter((q) => q.client_id !== clientId) });
  };

  const handleQuestionAdd = () => {
    if (questions.length >= MAX_QUESTIONS) return;
    emit({
      questions: [
        ...questions,
        {
          client_id: crypto.randomUUID(),
          question_type: "multiple_choice",
          prompt_markdown: emptyDoc(),
          explanation_markdown: emptyDoc(),
          choices: [
            { client_id: crypto.randomUUID(), choice_text: "", is_correct: false },
            { client_id: crypto.randomUUID(), choice_text: "", is_correct: false },
          ],
        },
      ],
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Questions ({MIN_QUESTIONS}-{MAX_QUESTIONS})
        </Label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={questions.map((q) => `kc-question:${q.client_id}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <SortableQuestion
                  key={q.client_id}
                  question={q}
                  index={idx}
                  onChange={handleQuestionChange}
                  onDelete={() => handleQuestionDelete(q.client_id)}
                  canDelete={questions.length > MIN_QUESTIONS}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleQuestionAdd}
          disabled={questions.length >= MAX_QUESTIONS}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add question
        </Button>
        {questions.length >= MAX_QUESTIONS && (
          <p className="text-xs text-muted-foreground">Max {MAX_QUESTIONS} questions per block.</p>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-md border bg-muted/20 p-3">
        <Checkbox
          checked={gatingRequired}
          onCheckedChange={(checked) => emit({ gating_required: checked === true })}
        />
        <div className="space-y-1">
          <Label className="text-sm font-medium">Require completion before continuing</Label>
          <p className="text-xs text-muted-foreground">
            Default ON for knowledge checks — the trainee must answer every question correctly before
            the next Continue button is enabled.
          </p>
        </div>
      </div>
    </div>
  );
}
