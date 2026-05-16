import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Archive, ChevronDown, ChevronRight, GripVertical, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MultipleChoiceOptionsEditor,
  type DraftOption,
} from "./MultipleChoiceOptionsEditor";
import { TrueFalseOptionsEditor } from "./TrueFalseOptionsEditor";
import {
  MatchOptionsEditor,
  buildPair,
  pairsToOptions,
  type MatchPair,
} from "./MatchOptionsEditor";

export type QuizQuestionType =
  | "multiple_choice"
  | "true_false"
  | "select_all"
  | "match_definition";

export interface DraftQuestion {
  client_id: string;
  id: string | null;
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  explanation: string;
  display_order: number;
  options: DraftOption[]; // for mc/tf/sa; for match these are flat (paired)
  pairs: MatchPair[]; // only used for match
  dirty: boolean;
  expanded: boolean;
}

const QUESTION_TYPE_OPTIONS: { value: QuizQuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True / False" },
  { value: "select_all", label: "Select all that apply" },
  { value: "match_definition", label: "Match definition" },
];

export function seedForType(type: QuizQuestionType): {
  options: DraftOption[];
  pairs: MatchPair[];
} {
  switch (type) {
    case "multiple_choice":
    case "select_all": {
      const options: DraftOption[] = Array.from({ length: 4 }, (_, i) => ({
        client_id: crypto.randomUUID(),
        id: null,
        option_text: "",
        is_correct: false,
        display_order: i,
      }));
      return { options, pairs: [] };
    }
    case "true_false":
      return {
        options: [
          {
            client_id: crypto.randomUUID(),
            id: null,
            option_text: "True",
            is_correct: false,
            display_order: 0,
          },
          {
            client_id: crypto.randomUUID(),
            id: null,
            option_text: "False",
            is_correct: false,
            display_order: 1,
          },
        ],
        pairs: [],
      };
    case "match_definition":
      return { options: [], pairs: [buildPair(), buildPair()] };
  }
}

function hasContentBeyondDefaults(q: DraftQuestion): boolean {
  if (q.question_text.trim().length > 0) return true;
  if (q.explanation.trim().length > 0) return true;
  if (q.question_type === "match_definition") {
    return q.pairs.some(
      (p) => p.prompt.option_text.trim().length > 0 || p.answer.option_text.trim().length > 0
    );
  }
  if (q.question_type === "true_false") {
    return q.options.some((o) => o.is_correct);
  }
  return q.options.some(
    (o) =>
      o.is_correct ||
      (o.option_text.trim().length > 0 && o.option_text !== "True" && o.option_text !== "False")
  );
}

function validateQuestion(q: DraftQuestion): string | null {
  if (q.question_text.trim().length === 0) return "Question text is required.";
  if (!Number.isInteger(q.points) || q.points < 0) return "Points must be an integer ≥ 0.";
  switch (q.question_type) {
    case "multiple_choice": {
      if (q.options.length < 2) return "At least 2 options required.";
      if (q.options.some((o) => o.option_text.trim() === "")) return "All options need text.";
      const correct = q.options.filter((o) => o.is_correct).length;
      if (correct !== 1) return "Exactly 1 option must be marked correct.";
      return null;
    }
    case "true_false": {
      const correct = q.options.filter((o) => o.is_correct).length;
      if (correct !== 1) return "Pick True or False as the correct answer.";
      return null;
    }
    case "select_all": {
      if (q.options.length < 2) return "At least 2 options required.";
      if (q.options.some((o) => o.option_text.trim() === "")) return "All options need text.";
      if (!q.options.some((o) => o.is_correct))
        return "At least 1 option must be marked correct.";
      return null;
    }
    case "match_definition": {
      if (q.pairs.length < 2) return "At least 2 pairs required.";
      if (
        q.pairs.some(
          (p) => p.prompt.option_text.trim() === "" || p.answer.option_text.trim() === ""
        )
      )
        return "All pairs need both a prompt and an answer.";
      return null;
    }
  }
}

interface Props {
  question: DraftQuestion;
  index: number;
  onChange: (next: DraftQuestion) => void;
  onSave: (q: DraftQuestion, reason: string) => Promise<void>;
  onArchive: (q: DraftQuestion, reason: string) => Promise<void>;
  busy: boolean;
}

export function QuestionCard({ question, index, onChange, onSave, onArchive, busy }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `q-card:${question.client_id}`,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveReason, setSaveReason] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [pendingType, setPendingType] = useState<QuizQuestionType | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const validationError = useMemo(() => validateQuestion(question), [question]);

  const setField = <K extends keyof DraftQuestion>(key: K, value: DraftQuestion[K]) => {
    onChange({ ...question, [key]: value, dirty: true });
  };

  const handleTypeChange = (next: QuizQuestionType) => {
    if (next === question.question_type) return;
    if (hasContentBeyondDefaults(question)) {
      setPendingType(next);
      return;
    }
    applyTypeChange(next);
  };

  const applyTypeChange = (next: QuizQuestionType) => {
    const seed = seedForType(next);
    onChange({
      ...question,
      question_type: next,
      options: seed.options,
      pairs: seed.pairs,
      dirty: true,
    });
    setPendingType(null);
  };

  const canSave =
    question.question_text.trim().length > 0 && !validationError && saveReason.trim().length >= 10;

  const doSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      let toCommit = question;
      if (question.question_type === "match_definition") {
        toCommit = { ...question, options: pairsToOptions(question.pairs) };
      }
      await onSave(toCommit, saveReason.trim());
      setSaveOpen(false);
      setSaveReason("");
    } finally {
      setSaving(false);
    }
  };

  const doArchive = async () => {
    if (archiveReason.trim().length < 10 || archiving) return;
    setArchiving(true);
    try {
      await onArchive(question, archiveReason.trim());
      setArchiveOpen(false);
      setArchiveReason("");
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("space-y-3 rounded-md border bg-muted/20 p-3", question.dirty && "border-primary/50")}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder question"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setField("expanded", !question.expanded)}
          aria-label={question.expanded ? "Collapse" : "Expand"}
        >
          {question.expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        <div className="flex-1 truncate text-sm font-medium">
          <span className="mr-2 text-muted-foreground">Q{index + 1}.</span>
          {question.question_text.trim() || (
            <span className="italic text-muted-foreground">Untitled question</span>
          )}
          {question.dirty && (
            <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase text-primary">
              Unsaved
            </span>
          )}
          {!question.id && (
            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] uppercase text-amber-800">
              New
            </span>
          )}
        </div>
        {question.id && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setArchiveOpen(true)}
            disabled={busy}
          >
            <Archive className="mr-1 h-4 w-4" />
            Archive
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          className="shadow-cta"
          onClick={() => setSaveOpen(true)}
          disabled={busy || !!validationError}
          title={validationError ?? undefined}
        >
          <Save className="mr-1 h-4 w-4" />
          Save question
        </Button>
      </div>

      {question.expanded && (
        <div className="space-y-3 pl-9">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_120px]">
            <div className="space-y-2">
              <Label>Question text *</Label>
              <Textarea
                rows={2}
                value={question.question_text}
                onChange={(e) => setField("question_text", e.target.value)}
                placeholder="Ask the trainee something..."
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label>Question type</Label>
              <Select
                value={question.question_type}
                onValueChange={(v) => handleTypeChange(v as QuizQuestionType)}
                disabled={busy}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Points</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={String(question.points)}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setField("points", Number.isFinite(n) && n >= 0 ? n : 0);
                }}
                disabled={busy}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {question.question_type === "match_definition" ? "Pairs" : "Options"}
            </Label>
            {question.question_type === "multiple_choice" && (
              <MultipleChoiceOptionsEditor
                mode="multiple_choice"
                options={question.options}
                onChange={(opts) => setField("options", opts)}
              />
            )}
            {question.question_type === "select_all" && (
              <MultipleChoiceOptionsEditor
                mode="select_all"
                options={question.options}
                onChange={(opts) => setField("options", opts)}
              />
            )}
            {question.question_type === "true_false" && (
              <TrueFalseOptionsEditor
                options={question.options}
                onChange={(opts) => setField("options", opts)}
              />
            )}
            {question.question_type === "match_definition" && (
              <MatchOptionsEditor
                pairs={question.pairs}
                onChange={(pairs) => setField("pairs", pairs)}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Explanation (optional)</Label>
            <Textarea
              rows={2}
              value={question.explanation}
              onChange={(e) => setField("explanation", e.target.value)}
              placeholder="Shown after the trainee answers (if quiz settings allow)."
              disabled={busy}
            />
          </div>

          {validationError && (
            <p className="text-xs text-destructive">{validationError}</p>
          )}
        </div>
      )}

      {/* Save dialog */}
      <AlertDialog open={saveOpen} onOpenChange={setSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save question</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for this change. Recorded in the super admin audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Textarea
              rows={3}
              value={saveReason}
              onChange={(e) => setSaveReason(e.target.value)}
              placeholder="Explain why you're saving this question."
              disabled={saving}
            />
            <p
              className={cn(
                "text-xs",
                saveReason.trim().length >= 10 ? "text-muted-foreground" : "text-destructive"
              )}
            >
              {saveReason.trim().length}/10 characters minimum.
            </p>
            {validationError && (
              <p className="text-xs text-destructive">{validationError}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!canSave || saving}
              onClick={(e) => {
                e.preventDefault();
                void doSave();
              }}
            >
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive dialog */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive question</AlertDialogTitle>
            <AlertDialogDescription>
              The question is hidden from trainees. Provide a reason (min 10 chars).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Textarea
              rows={3}
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              disabled={archiving}
            />
            <p
              className={cn(
                "text-xs",
                archiveReason.trim().length >= 10 ? "text-muted-foreground" : "text-destructive"
              )}
            >
              {archiveReason.trim().length}/10 characters minimum.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={archiveReason.trim().length < 10 || archiving}
              onClick={(e) => {
                e.preventDefault();
                void doArchive();
              }}
            >
              {archiving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Type-switch confirm */}
      <AlertDialog open={!!pendingType} onOpenChange={(o) => !o && setPendingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch question type?</AlertDialogTitle>
            <AlertDialogDescription>
              Switching question types will clear the current configuration. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingType && applyTypeChange(pendingType)}>
              Switch type
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
