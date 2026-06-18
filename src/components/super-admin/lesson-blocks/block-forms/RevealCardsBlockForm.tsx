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
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "../RichTextEditor";
import { FileUploadField } from "@/components/super-admin/FileUploadField";
import { BrandColorSwatch } from "../BrandColorSwatch";
import type { TipTapDocJSON } from "../blockTypeMeta";

type RevealItem = {
  client_id: string;
  front: TipTapDocJSON;
  back: TipTapDocJSON;
  front_image_asset_id: string | null;
  front_caption: string | null;
  front_color: string | null;
  back_color: string | null;
};

interface RevealCardsValue {
  instructions: string | null;
  items: RevealItem[];
  gating_required: boolean;
  [key: string]: unknown;
}

interface Props {
  value: RevealCardsValue;
  onConfigChange: (next: RevealCardsValue) => void;
  contentItemId: string;
}

const emptyDoc = (): TipTapDocJSON => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

const MIN_ITEMS = 2;
const MAX_ITEMS = 12;
const MAX_CAPTION_LENGTH = 80;

function SortableRevealCard({
  item,
  index,
  onChange,
  onDelete,
  canDelete,
  contentItemId,
}: {
  item: RevealItem;
  index: number;
  onChange: (next: RevealItem) => void;
  onDelete: () => void;
  canDelete: boolean;
  contentItemId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.client_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-md border bg-background p-2">
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-2 cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          aria-label="Drag card"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Card {index + 1}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Front image (optional)</Label>
            <FileUploadField
              assetKind="image"
              contentItemId={contentItemId}
              lessonBlockId={null}
              refField={`reveal_cards.items.${item.client_id}.front_image_asset_id`}
              value={item.front_image_asset_id}
              onChange={(newAssetId) =>
                onChange({ ...item, front_image_asset_id: newAssetId })
              }
            />
          </div>

          {item.front_image_asset_id && (
            <div className="space-y-1">
              <Label className="text-xs">
                Front caption (optional, max {MAX_CAPTION_LENGTH} chars)
              </Label>
              <Input
                value={item.front_caption ?? ""}
                onChange={(e) =>
                  onChange({ ...item, front_caption: e.target.value || null })
                }
                maxLength={MAX_CAPTION_LENGTH}
                placeholder="Short caption shown below the front image"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Front</Label>
            <RichTextEditor
              value={item.front}
              onChange={(next) => onChange({ ...item, front: next })}
              placeholder="What the trainee sees first"
              compact
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Back (revealed on click)</Label>
            <RichTextEditor
              value={item.back}
              onChange={(next) => onChange({ ...item, back: next })}
              placeholder="What's revealed when the card flips"
              compact
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Front color</Label>
              <BrandColorSwatch
                value={item.front_color}
                onChange={(hex) => onChange({ ...item, front_color: hex })}
                palette="full"
                allowDefault
                allowCustomHex
                defaultLabel="Default"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Back color</Label>
              <BrandColorSwatch
                value={item.back_color}
                onChange={(hex) => onChange({ ...item, back_color: hex })}
                palette="full"
                allowDefault
                allowCustomHex
                defaultLabel="Default"
              />
            </div>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-1 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Remove card"
          disabled={!canDelete}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function RevealCardsBlockForm({ value, onConfigChange, contentItemId }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const items = value.items ?? [];
  const gatingRequired = value.gating_required === true;

  const emit = (patch: Partial<RevealCardsValue>) =>
    onConfigChange({ ...value, items, gating_required: gatingRequired, ...patch });

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((c) => c.client_id === active.id);
    const to = items.findIndex((c) => c.client_id === over.id);
    if (from < 0 || to < 0) return;
    emit({ items: arrayMove(items, from, to) });
  };

  const handleItemChange = (next: RevealItem) =>
    emit({ items: items.map((c) => (c.client_id === next.client_id ? next : c)) });

  const handleDelete = (clientId: string) => {
    if (items.length <= MIN_ITEMS) return;
    emit({ items: items.filter((c) => c.client_id !== clientId) });
  };

  const handleAdd = () => {
    if (items.length >= MAX_ITEMS) return;
    emit({
      items: [
        ...items,
        {
          client_id: crypto.randomUUID(),
          front: emptyDoc(),
          back: emptyDoc(),
          front_image_asset_id: null,
          front_caption: null,
          front_color: null,
          back_color: null,
        },
      ],
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Instructions (optional)</Label>
        <Input
          value={value.instructions ?? ""}
          onChange={(e) =>
            emit({ instructions: e.target.value.trim() === "" ? null : e.target.value })
          }
          placeholder="e.g. Click each card to reveal the answer"
        />
      </div>

      <Label>Cards</Label>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={items.map((c) => c.client_id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((item, idx) => (
              <SortableRevealCard
                key={item.client_id}
                item={item}
                index={idx}
                onChange={handleItemChange}
                onDelete={() => handleDelete(item.client_id)}
                canDelete={items.length > MIN_ITEMS}
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
        onClick={handleAdd}
        disabled={items.length >= MAX_ITEMS}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add card
      </Button>

      {items.length >= MAX_ITEMS && (
        <p className="text-xs text-muted-foreground">
          Max {MAX_ITEMS} cards. Split into multiple blocks for larger grids.
        </p>
      )}
      {items.length <= MIN_ITEMS && (
        <p className="text-xs text-muted-foreground">
          Minimum {MIN_ITEMS} cards required.
        </p>
      )}

      <div className="flex items-start gap-3 rounded-md border bg-muted/20 p-3">
        <Switch
          id="reveal-cards-gating"
          checked={gatingRequired}
          onCheckedChange={(checked) => emit({ gating_required: checked === true })}
        />
        <div className="space-y-1">
          <Label htmlFor="reveal-cards-gating" className="cursor-pointer text-sm font-medium">
            Require completion before continuing
          </Label>
          <p className="text-xs text-muted-foreground">
            When on, trainees must reveal every card before the next Continue button is enabled.
          </p>
        </div>
      </div>
    </div>
  );
}
