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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export interface DraftOption {
  client_id: string;
  id: string | null; // null = new
  option_text: string;
  is_correct: boolean;
  display_order: number;
}

const MAX_TEXT = 200;

function SortableRow({
  opt,
  index,
  mode,
  onChange,
  onDelete,
  canDelete,
}: {
  opt: DraftOption;
  index: number;
  mode: "multiple_choice" | "select_all";
  onChange: (next: DraftOption) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `q-opt:${opt.client_id}`,
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
        aria-label="Drag to reorder option"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Option {index + 1}</span>
          <label className="flex items-center gap-1.5 text-xs">
            <Checkbox
              checked={opt.is_correct}
              onCheckedChange={(checked) => onChange({ ...opt, is_correct: checked === true })}
            />
            Correct
          </label>
        </div>
        <Input
          value={opt.option_text}
          onChange={(e) => onChange({ ...opt, option_text: e.target.value })}
          maxLength={MAX_TEXT}
          placeholder="Option text"
        />
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="mt-1 h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        disabled={!canDelete}
        aria-label="Delete option"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface Props {
  mode: "multiple_choice" | "select_all";
  options: DraftOption[];
  onChange: (next: DraftOption[]) => void;
}

export function MultipleChoiceOptionsEditor({ mode, options, onChange }: Props) {
  const min = 2;
  const max = mode === "multiple_choice" ? 5 : 6;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const aId = String(active.id).replace(/^q-opt:/, "");
    const oId = String(over.id).replace(/^q-opt:/, "");
    const from = options.findIndex((o) => o.client_id === aId);
    const to = options.findIndex((o) => o.client_id === oId);
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(options, from, to).map((o, idx) => ({ ...o, display_order: idx }));
    onChange(reordered);
  };

  const handleRowChange = (next: DraftOption) => {
    let updated: DraftOption[];
    if (mode === "multiple_choice" && next.is_correct) {
      updated = options.map((o) =>
        o.client_id === next.client_id ? next : { ...o, is_correct: false }
      );
    } else {
      updated = options.map((o) => (o.client_id === next.client_id ? next : o));
    }
    onChange(updated);
  };

  const handleDelete = (cid: string) => {
    if (options.length <= min) return;
    const filtered = options
      .filter((o) => o.client_id !== cid)
      .map((o, idx) => ({ ...o, display_order: idx }));
    onChange(filtered);
  };

  const handleAdd = () => {
    if (options.length >= max) return;
    onChange([
      ...options,
      {
        client_id: crypto.randomUUID(),
        id: null,
        option_text: "",
        is_correct: false,
        display_order: options.length,
      },
    ]);
  };

  const correctCount = options.filter((o) => o.is_correct).length;
  const hint =
    mode === "multiple_choice"
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
          items={options.map((o) => `q-opt:${o.client_id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <SortableRow
                key={opt.client_id}
                opt={opt}
                index={idx}
                mode={mode}
                onChange={handleRowChange}
                onDelete={() => handleDelete(opt.client_id)}
                canDelete={options.length > min}
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
        disabled={options.length >= max}
      >
        <Plus className="mr-1 h-4 w-4" />
        Add option
      </Button>
      {options.length >= max && (
        <p className="text-xs text-muted-foreground">
          Max {max} options for {mode === "multiple_choice" ? "multiple choice" : "select all"}.
        </p>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
