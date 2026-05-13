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
import { GripVertical, X, Plus, Link2, ArrowDownToLine, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BLOCK_TYPE_META, extractTextFromTipTap, type EditorBlock } from "../blockTypeMeta";

type ActionType = "link" | "jump_to_block" | "continue";
type ButtonVariant = "primary" | "secondary";
type Layout = "stacked" | "inline";

type ButtonEntry = {
  client_id: string;
  label: string;
  action_type: ActionType;
  url: string | null;
  target_block_client_id: string | null;
  section_title: string | null;
  variant: ButtonVariant;
};

interface Props {
  value: {
    buttons: ButtonEntry[];
    layout: Layout;
    caption?: string | null;
  };
  onConfigChange: (next: Props["value"]) => void;
  siblingBlocks: EditorBlock[];
}

function friendlyBlockLabel(block: EditorBlock): string {
  const meta = BLOCK_TYPE_META[block.block_type];
  const typeLabel = meta?.label ?? block.block_type;
  const cfg: any = block.config ?? {};
  switch (block.block_type) {
    case "heading":
      return `${typeLabel}: ${cfg.text || "(empty)"}`.slice(0, 80);
    case "text":
    case "quote":
    case "callout": {
      const snippet = extractTextFromTipTap(cfg.body).slice(0, 60);
      return `${typeLabel}: ${snippet || "(empty)"}`;
    }
    case "stat_callout":
      return `${typeLabel}: ${cfg.stat || "(empty)"} — ${cfg.label || ""}`.slice(0, 80);
    case "statement_a_b":
      return `${typeLabel}: ${cfg.a_label || "A"} vs ${cfg.b_label || "B"}`;
    case "accordion":
      return `${typeLabel} (${(cfg.items ?? []).length} sections)`;
    case "tabs":
      return `${typeLabel} (${(cfg.tabs ?? []).length} tabs)`;
    case "list":
      return `${typeLabel} (${(cfg.items ?? []).length} items)`;
    case "image":
      return `${typeLabel}: ${cfg.alt || "(no alt)"}`;
    case "video_embed":
      return `${typeLabel}: ${cfg.title || "(untitled)"}`;
    case "embed_audio":
      return `${typeLabel}${cfg.transcript ? " (with transcript)" : ""}`;
    case "divider":
      return typeLabel;
    case "button_stack": {
      const btns = cfg.buttons ?? [];
      const continueBtns = btns.filter(
        (b: { action_type?: string }) => b?.action_type === "continue",
      );
      if (continueBtns.length > 0) {
        const firstContinue = continueBtns[0] as {
          section_title?: string | null;
          label?: string;
        };
        const namedSection =
          (firstContinue.section_title && firstContinue.section_title.trim()) ||
          (firstContinue.label && firstContinue.label.trim()) ||
          "";
        if (namedSection) {
          return `Continue: ${namedSection}`.slice(0, 80);
        }
        return `Continue (${continueBtns.length === 1 ? "section break" : `${continueBtns.length} section breaks`})`;
      }
      return `${typeLabel} (${btns.length} buttons)`;
    }
    default:
      return typeLabel;
  }
}

function SortableButton({
  btn,
  siblingBlocks,
  onChange,
  onDelete,
  canDelete,
}: {
  btn: ButtonEntry;
  siblingBlocks: EditorBlock[];
  onChange: (next: ButtonEntry) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: btn.client_id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-md border bg-background p-3">
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-2 cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          aria-label="Drag button"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 space-y-3">
          <Input
            value={btn.label}
            onChange={(e) => onChange({ ...btn, label: e.target.value })}
            placeholder="Button label"
            className="font-medium"
            maxLength={40}
          />

          <RadioGroup
            value={btn.action_type}
            onValueChange={(v) => {
              const next = v as ActionType;
              onChange({
                ...btn,
                action_type: next,
                url: next === "link" ? (btn.url ?? "") : null,
                target_block_client_id:
                  next === "jump_to_block" ? btn.target_block_client_id : null,
                section_title: next === "continue" ? (btn.section_title ?? null) : null,
              });
            }}
            className="grid grid-cols-3 gap-2"
          >
            <Label className="flex cursor-pointer items-center gap-1.5 rounded-md border p-2 text-xs">
              <RadioGroupItem value="link" />
              <Link2 className="h-3.5 w-3.5" />
              Link
            </Label>
            <Label className="flex cursor-pointer items-center gap-1.5 rounded-md border p-2 text-xs">
              <RadioGroupItem value="jump_to_block" />
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Jump
            </Label>
            <Label className="flex cursor-pointer items-center gap-1.5 rounded-md border p-2 text-xs">
              <RadioGroupItem value="continue" />
              <ChevronRight className="h-3.5 w-3.5" />
              Continue
            </Label>
          </RadioGroup>

          {btn.action_type === "link" && (
            <Input
              value={btn.url ?? ""}
              onChange={(e) => onChange({ ...btn, url: e.target.value })}
              placeholder="https://… or /internal/path"
              type="url"
            />
          )}
          {btn.action_type === "jump_to_block" && (
            <Select
              value={btn.target_block_client_id ?? ""}
              onValueChange={(v) =>
                onChange({ ...btn, target_block_client_id: v || null })
              }
              disabled={siblingBlocks.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    siblingBlocks.length === 0
                      ? "(no other blocks yet)"
                      : "Pick target block…"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {siblingBlocks.map((b) => (
                  <SelectItem key={b.client_id} value={b.client_id}>
                    {friendlyBlockLabel(b)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {btn.action_type === "continue" && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Section title (optional)
              </Label>
              <Input
                value={btn.section_title ?? ""}
                onChange={(e) =>
                  onChange({
                    ...btn,
                    section_title: e.target.value.length > 0 ? e.target.value : null,
                  })
                }
                placeholder='e.g. "Foundations" or "Reflect"'
                maxLength={80}
              />
              <p className="text-[10px] text-muted-foreground">
                Names the section this Continue button ends. Used by the trainee view to label the section in progress indicators. Leave blank if the section doesn't need a named label.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Style
            </Label>
            <RadioGroup
              value={btn.variant}
              onValueChange={(v) => onChange({ ...btn, variant: v as ButtonVariant })}
              className="grid grid-cols-2 gap-2"
            >
              <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-xs">
                <RadioGroupItem value="primary" />
                Primary
              </Label>
              <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-xs">
                <RadioGroupItem value="secondary" />
                Secondary
              </Label>
            </RadioGroup>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-1 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Remove button"
          disabled={!canDelete}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ButtonStackBlockForm({ value, onConfigChange, siblingBlocks }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const buttons = (value.buttons ?? []).map((b) => ({
    ...b,
    section_title: (b as { section_title?: string | null }).section_title ?? null,
  }));
  const layout: Layout = value.layout === "inline" ? "inline" : "stacked";

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = buttons.findIndex((b) => b.client_id === active.id);
    const to = buttons.findIndex((b) => b.client_id === over.id);
    if (from < 0 || to < 0) return;
    onConfigChange({ ...value, buttons: arrayMove(buttons, from, to) });
  };

  const handleChange = (next: ButtonEntry) => {
    onConfigChange({
      ...value,
      buttons: buttons.map((b) => (b.client_id === next.client_id ? next : b)),
    });
  };

  const handleDelete = (clientId: string) => {
    if (buttons.length <= 1) return;
    onConfigChange({
      ...value,
      buttons: buttons.filter((b) => b.client_id !== clientId),
    });
  };

  const handleAdd = () => {
    if (buttons.length >= 4) return;
    onConfigChange({
      ...value,
      buttons: [
        ...buttons,
        {
          client_id: crypto.randomUUID(),
          label: "",
          action_type: "link",
          url: "",
          target_block_client_id: null,
          section_title: null,
          variant: "primary",
        },
      ],
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Layout</Label>
        <RadioGroup
          value={layout}
          onValueChange={(v) => onConfigChange({ ...value, layout: v as Layout })}
          className="grid grid-cols-2 gap-2"
        >
          <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-xs">
            <RadioGroupItem value="stacked" />
            Stacked (full-width)
          </Label>
          <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-xs">
            <RadioGroupItem value="inline" />
            Inline (wrap row)
          </Label>
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label>Buttons</Label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={buttons.map((b) => b.client_id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {buttons.map((b) => (
                <SortableButton
                  key={b.client_id}
                  btn={b}
                  siblingBlocks={siblingBlocks}
                  onChange={handleChange}
                  onDelete={() => handleDelete(b.client_id)}
                  canDelete={buttons.length > 1}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAdd}
          disabled={buttons.length >= 4}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add button
        </Button>
        {buttons.length >= 4 && (
          <p className="text-xs text-muted-foreground">
            Max 4 buttons — split into multiple blocks if more are needed.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Caption (optional)</Label>
        <Textarea
          value={value.caption ?? ""}
          onChange={(e) =>
            onConfigChange({
              ...value,
              caption: e.target.value.length > 0 ? e.target.value : null,
            })
          }
          placeholder="Optional instructional text shown below the buttons (e.g. 'Click Continue when you've completed the reflection')"
          rows={2}
          maxLength={240}
        />
        <p className="text-xs text-muted-foreground">
          Helpful when buttons need context — explain what action the trainee should take, or what each button does.
        </p>
      </div>
    </div>
  );
}
