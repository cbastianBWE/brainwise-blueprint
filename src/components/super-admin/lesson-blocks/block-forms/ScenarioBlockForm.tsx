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
import {
  GripVertical,
  X,
  Plus,
  MessageSquare,
  ListChecks,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RichTextEditor } from "../RichTextEditor";
import { FileUploadField } from "@/components/super-admin/FileUploadField";
import type { TipTapDocJSON } from "../blockTypeMeta";

type PromptType = "multiple_choice" | "reflection";

type Choice = {
  client_id: string;
  choice_text: string;
  outcome_markdown: TipTapDocJSON;
};

type Moment = {
  client_id: string;
  moment_label: string | null;
  setup_markdown: TipTapDocJSON;
  setup_image_asset_id: string | null;
  prompt_type: PromptType;
  choices: Choice[] | null;
  reflection_prompt: string | null;
  outcome_markdown: TipTapDocJSON | null;
};

interface Props {
  value: {
    title: string | null;
    intro_markdown: TipTapDocJSON | null;
    moments: Moment[];
    gating_required: boolean;
  };
  onConfigChange: (next: {
    title: string | null;
    intro_markdown: TipTapDocJSON | null;
    moments: Moment[];
    gating_required: boolean;
  }) => void;
  contentItemId: string;
}

const emptyDoc = (): TipTapDocJSON => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

const MIN_MOMENTS = 1;
const MAX_MOMENTS = 12;
const MIN_CHOICES = 2;
const MAX_CHOICES = 4;
const MAX_TITLE = 120;
const MAX_MOMENT_LABEL = 80;
const MAX_CHOICE_TEXT = 200;
const MAX_REFLECTION_PROMPT = 300;

function tipTapHasContent(doc: TipTapDocJSON | null | undefined): boolean {
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
}

function hasContentOnSide(moment: Moment, side: PromptType): boolean {
  if (side === "multiple_choice") {
    const choices = moment.choices ?? [];
    return choices.some(
      (c) => c.choice_text.trim().length > 0 || tipTapHasContent(c.outcome_markdown),
    );
  }
  return (
    (moment.reflection_prompt ?? "").trim().length > 0 ||
    tipTapHasContent(moment.outcome_markdown)
  );
}

function isMomentComplete(moment: Moment): boolean {
  if (!tipTapHasContent(moment.setup_markdown)) return false;
  if (moment.prompt_type === "multiple_choice") {
    const choices = moment.choices ?? [];
    if (choices.length < MIN_CHOICES) return false;
    return choices.every(
      (c) => c.choice_text.trim().length > 0 && tipTapHasContent(c.outcome_markdown),
    );
  }
  return (
    (moment.reflection_prompt ?? "").trim().length > 0 &&
    tipTapHasContent(moment.outcome_markdown)
  );
}

// ===== Sortable choice =====

function SortableChoice({
  choice,
  index,
  onChange,
  onDelete,
  canDelete,
}: {
  choice: Choice;
  index: number;
  onChange: (next: Choice) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `choice:${choice.client_id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-md border bg-background p-2"
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground"
          aria-label="Drag choice"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Choice {index + 1}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              Choice text (max {MAX_CHOICE_TEXT} chars)
            </Label>
            <Input
              value={choice.choice_text}
              onChange={(e) => onChange({ ...choice, choice_text: e.target.value })}
              maxLength={MAX_CHOICE_TEXT}
              placeholder="What the trainee sees as an option"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Outcome (shown when this choice is picked)</Label>
            <RichTextEditor
              value={choice.outcome_markdown}
              onChange={(next) => onChange({ ...choice, outcome_markdown: next })}
              placeholder="What happens when the trainee picks this choice"
              compact
            />
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-1 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Remove choice"
          disabled={!canDelete}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ===== Sortable moment =====

function SortableMoment({
  moment,
  index,
  onChange,
  onDelete,
  canDelete,
  contentItemId,
}: {
  moment: Moment;
  index: number;
  onChange: (next: Moment) => void;
  onDelete: () => void;
  canDelete: boolean;
  contentItemId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `moment:${moment.client_id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const choiceSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const complete = isMomentComplete(moment);
  const choices = moment.choices ?? [];

  const handlePromptTypeChange = (next: PromptType) => {
    if (next === moment.prompt_type) return;
    const inactiveSide: PromptType =
      next === "multiple_choice" ? "reflection" : "multiple_choice";
    if (hasContentOnSide(moment, inactiveSide)) {
      const sideLabel = inactiveSide === "multiple_choice" ? "choices" : "reflection";
      const ok = window.confirm(
        `Discard the current ${sideLabel}? Switching prompt types will clear that content.`,
      );
      if (!ok) return;
    }
    if (next === "multiple_choice") {
      onChange({
        ...moment,
        prompt_type: "multiple_choice",
        choices:
          moment.choices && moment.choices.length >= MIN_CHOICES
            ? moment.choices
            : [
                { client_id: crypto.randomUUID(), choice_text: "", outcome_markdown: emptyDoc() },
                { client_id: crypto.randomUUID(), choice_text: "", outcome_markdown: emptyDoc() },
              ],
        reflection_prompt: null,
        outcome_markdown: null,
      });
    } else {
      onChange({
        ...moment,
        prompt_type: "reflection",
        choices: null,
        reflection_prompt: moment.reflection_prompt ?? "",
        outcome_markdown: moment.outcome_markdown ?? emptyDoc(),
      });
    }
  };

  const handleChoiceDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id).replace(/^choice:/, "");
    const overId = String(over.id).replace(/^choice:/, "");
    const from = choices.findIndex((c) => c.client_id === activeId);
    const to = choices.findIndex((c) => c.client_id === overId);
    if (from < 0 || to < 0) return;
    onChange({ ...moment, choices: arrayMove(choices, from, to) });
  };

  const handleChoiceChange = (next: Choice) => {
    onChange({
      ...moment,
      choices: choices.map((c) => (c.client_id === next.client_id ? next : c)),
    });
  };

  const handleChoiceDelete = (clientId: string) => {
    if (choices.length <= MIN_CHOICES) return;
    onChange({ ...moment, choices: choices.filter((c) => c.client_id !== clientId) });
  };

  const handleChoiceAdd = () => {
    if (choices.length >= MAX_CHOICES) return;
    onChange({
      ...moment,
      choices: [
        ...choices,
        { client_id: crypto.randomUUID(), choice_text: "", outcome_markdown: emptyDoc() },
      ],
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-md border bg-muted/10 p-3"
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground"
          aria-label="Drag moment"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Moment {index + 1}
            </div>
            <div className="flex items-center gap-2">
              {moment.prompt_type === "multiple_choice" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <ListChecks className="h-3 w-3" />
                  Multiple choice
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  Reflection
                </span>
              )}
              {complete ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: "#2D6A4F" }}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Complete
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <Circle className="h-3 w-3" />
                  Needs setup
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              Moment label (optional, max {MAX_MOMENT_LABEL} chars)
            </Label>
            <Input
              value={moment.moment_label ?? ""}
              onChange={(e) =>
                onChange({ ...moment, moment_label: e.target.value || null })
              }
              maxLength={MAX_MOMENT_LABEL}
              placeholder='e.g. "The Performance Review" or "Day 3"'
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Setup image (optional)</Label>
            <FileUploadField
              assetKind="image"
              contentItemId={contentItemId}
              lessonBlockId={null}
              refField={`scenario.moments.${moment.client_id}.setup_image_asset_id`}
              value={moment.setup_image_asset_id}
              onChange={(newAssetId) =>
                onChange({ ...moment, setup_image_asset_id: newAssetId })
              }
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Setup</Label>
            <RichTextEditor
              value={moment.setup_markdown}
              onChange={(next) => onChange({ ...moment, setup_markdown: next })}
              placeholder="What the trainee reads at the start of this moment"
              compact
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Prompt type</Label>
            <RadioGroup
              value={moment.prompt_type}
              onValueChange={(v) => handlePromptTypeChange(v as PromptType)}
              className="grid grid-cols-2 gap-2"
            >
              <Label
                htmlFor={`pt-mc-${moment.client_id}`}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-background p-2 text-sm"
              >
                <RadioGroupItem id={`pt-mc-${moment.client_id}`} value="multiple_choice" />
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                Multiple choice
              </Label>
              <Label
                htmlFor={`pt-rf-${moment.client_id}`}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-background p-2 text-sm"
              >
                <RadioGroupItem id={`pt-rf-${moment.client_id}`} value="reflection" />
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Reflection
              </Label>
            </RadioGroup>
          </div>

          {moment.prompt_type === "multiple_choice" && (
            <div className="space-y-2">
              <Label className="text-xs">
                Choices ({MIN_CHOICES}-{MAX_CHOICES})
              </Label>
              <DndContext
                sensors={choiceSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleChoiceDragEnd}
              >
                <SortableContext
                  items={choices.map((c) => `choice:${c.client_id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {choices.map((choice, ci) => (
                      <SortableChoice
                        key={choice.client_id}
                        choice={choice}
                        index={ci}
                        onChange={handleChoiceChange}
                        onDelete={() => handleChoiceDelete(choice.client_id)}
                        canDelete={choices.length > MIN_CHOICES}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleChoiceAdd}
                disabled={choices.length >= MAX_CHOICES}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add choice
              </Button>
              {choices.length >= MAX_CHOICES && (
                <p className="text-[11px] text-muted-foreground">
                  Max {MAX_CHOICES} choices.
                </p>
              )}
              {choices.length <= MIN_CHOICES && (
                <p className="text-[11px] text-muted-foreground">
                  Minimum {MIN_CHOICES} choices required.
                </p>
              )}
            </div>
          )}

          {moment.prompt_type === "reflection" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">
                  Reflection prompt (max {MAX_REFLECTION_PROMPT} chars)
                </Label>
                <Textarea
                  value={moment.reflection_prompt ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...moment,
                      reflection_prompt: e.target.value || "",
                    })
                  }
                  maxLength={MAX_REFLECTION_PROMPT}
                  rows={3}
                  placeholder="What you're asking the trainee to reflect on"
                />
                <p className="text-[10px] text-muted-foreground">
                  {(moment.reflection_prompt ?? "").length} / {MAX_REFLECTION_PROMPT}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  Outcome (shown after the trainee submits)
                </Label>
                <RichTextEditor
                  value={moment.outcome_markdown ?? emptyDoc()}
                  onChange={(next) => onChange({ ...moment, outcome_markdown: next })}
                  placeholder="The teaching point that lands after reflection"
                  compact
                />
              </div>
            </div>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-1 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Remove moment"
          disabled={!canDelete}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ===== Main form =====

export function ScenarioBlockForm({ value, onConfigChange, contentItemId }: Props) {
  const momentSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const title = value.title ?? null;
  const introMarkdown = value.intro_markdown ?? null;
  const moments = value.moments ?? [];
  const gatingRequired = value.gating_required === true;

  const emit = (next: Partial<typeof value>) => {
    onConfigChange({
      title: next.title !== undefined ? next.title : title,
      intro_markdown:
        next.intro_markdown !== undefined ? next.intro_markdown : introMarkdown,
      moments: next.moments ?? moments,
      gating_required: next.gating_required ?? gatingRequired,
    });
  };

  const handleMomentDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id).replace(/^moment:/, "");
    const overId = String(over.id).replace(/^moment:/, "");
    const from = moments.findIndex((m) => m.client_id === activeId);
    const to = moments.findIndex((m) => m.client_id === overId);
    if (from < 0 || to < 0) return;
    emit({ moments: arrayMove(moments, from, to) });
  };

  const handleMomentChange = (next: Moment) => {
    emit({ moments: moments.map((m) => (m.client_id === next.client_id ? next : m)) });
  };

  const handleMomentDelete = (clientId: string) => {
    if (moments.length <= MIN_MOMENTS) return;
    emit({ moments: moments.filter((m) => m.client_id !== clientId) });
  };

  const handleMomentAdd = () => {
    if (moments.length >= MAX_MOMENTS) return;
    emit({
      moments: [
        ...moments,
        {
          client_id: crypto.randomUUID(),
          moment_label: null,
          setup_markdown: emptyDoc(),
          setup_image_asset_id: null,
          prompt_type: "multiple_choice",
          choices: [
            { client_id: crypto.randomUUID(), choice_text: "", outcome_markdown: emptyDoc() },
            { client_id: crypto.randomUUID(), choice_text: "", outcome_markdown: emptyDoc() },
          ],
          reflection_prompt: null,
          outcome_markdown: null,
        },
      ],
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Label className="text-xs">
          Block title (optional, max {MAX_TITLE} chars)
        </Label>
        <Input
          value={title ?? ""}
          onChange={(e) => emit({ title: e.target.value || null })}
          maxLength={MAX_TITLE}
          placeholder="e.g. The Difficult Conversation"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">
          Intro (optional, shown above the first moment)
        </Label>
        <RichTextEditor
          value={introMarkdown ?? emptyDoc()}
          onChange={(next) =>
            emit({ intro_markdown: tipTapHasContent(next) ? next : null })
          }
          placeholder="Optional context before the scenario begins"
          compact
        />
      </div>

      <div className="space-y-3">
        <Label>
          Moments ({MIN_MOMENTS}-{MAX_MOMENTS})
        </Label>

        <DndContext
          sensors={momentSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleMomentDragEnd}
        >
          <SortableContext
            items={moments.map((m) => `moment:${m.client_id}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {moments.map((moment, idx) => (
                <SortableMoment
                  key={moment.client_id}
                  moment={moment}
                  index={idx}
                  onChange={handleMomentChange}
                  onDelete={() => handleMomentDelete(moment.client_id)}
                  canDelete={moments.length > MIN_MOMENTS}
                  contentItemId={contentItemId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleMomentAdd}
          disabled={moments.length >= MAX_MOMENTS}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add moment
        </Button>

        {moments.length >= MAX_MOMENTS && (
          <p className="text-xs text-muted-foreground">Max {MAX_MOMENTS} moments.</p>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-md border bg-muted/20 p-3">
        <Checkbox
          id="scenario-gating"
          checked={gatingRequired}
          onCheckedChange={(checked) => emit({ gating_required: checked === true })}
        />
        <div className="space-y-1">
          <Label htmlFor="scenario-gating" className="cursor-pointer text-sm font-medium">
            Require completion before continuing
          </Label>
          <p className="text-xs text-muted-foreground">
            When on, trainees must reach the end of the scenario before the next Continue button is enabled.
          </p>
        </div>
      </div>
    </div>
  );
}
