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
import { RichTextEditor } from "../RichTextEditor";
import { FileUploadField } from "@/components/super-admin/FileUploadField";
import { BrandColorSwatch } from "../BrandColorSwatch";
import type { TipTapDocJSON } from "../blockTypeMeta";

type Card = {
  client_id: string;
  front: TipTapDocJSON;
  back: TipTapDocJSON;
  front_image_asset_id: string | null;
  front_caption: string | null;
  background_color: string | null;
};

interface Props {
  value: {
    cards: Card[];
    gating_required: boolean;
  };
  onConfigChange: (next: { cards: Card[]; gating_required: boolean }) => void;
  contentItemId: string;
}

const emptyDoc = (): TipTapDocJSON => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

const MIN_CARDS = 2;
const MAX_CARDS = 20;
const MAX_CAPTION_LENGTH = 80;

function SortableCard({
  card,
  index,
  onChange,
  onDelete,
  canDelete,
  contentItemId,
}: {
  card: Card;
  index: number;
  onChange: (next: Card) => void;
  onDelete: () => void;
  canDelete: boolean;
  contentItemId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.client_id });

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
              refField={`flashcards.cards.${card.client_id}.front_image_asset_id`}
              value={card.front_image_asset_id}
              onChange={(newAssetId) =>
                onChange({ ...card, front_image_asset_id: newAssetId })
              }
            />
          </div>

          {card.front_image_asset_id && (
            <div className="space-y-1">
              <Label className="text-xs">
                Front caption (optional, max {MAX_CAPTION_LENGTH} chars)
              </Label>
              <Input
                value={card.front_caption ?? ""}
                onChange={(e) =>
                  onChange({
                    ...card,
                    front_caption: e.target.value || null,
                  })
                }
                maxLength={MAX_CAPTION_LENGTH}
                placeholder="Short caption shown below the image"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Front</Label>
            <RichTextEditor
              value={card.front}
              onChange={(next) => onChange({ ...card, front: next })}
              placeholder="What the trainee sees first"
              compact
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Back</Label>
            <RichTextEditor
              value={card.back}
              onChange={(next) => onChange({ ...card, back: next })}
              placeholder="What's revealed when the card flips"
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
          aria-label="Remove card"
          disabled={!canDelete}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function FlashcardsBlockForm({ value, onConfigChange, contentItemId }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const cards = value.cards ?? [];
  const gatingRequired = value.gating_required === true;

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = cards.findIndex((c) => c.client_id === active.id);
    const to = cards.findIndex((c) => c.client_id === over.id);
    if (from < 0 || to < 0) return;
    onConfigChange({
      cards: arrayMove(cards, from, to),
      gating_required: gatingRequired,
    });
  };

  const handleCardChange = (next: Card) => {
    onConfigChange({
      cards: cards.map((c) => (c.client_id === next.client_id ? next : c)),
      gating_required: gatingRequired,
    });
  };

  const handleDelete = (clientId: string) => {
    if (cards.length <= MIN_CARDS) return;
    onConfigChange({
      cards: cards.filter((c) => c.client_id !== clientId),
      gating_required: gatingRequired,
    });
  };

  const handleAdd = () => {
    if (cards.length >= MAX_CARDS) return;
    onConfigChange({
      cards: [
        ...cards,
        {
          client_id: crypto.randomUUID(),
          front: emptyDoc(),
          back: emptyDoc(),
          front_image_asset_id: null,
          front_caption: null,
        },
      ],
      gating_required: gatingRequired,
    });
  };

  const handleGatingChange = (next: boolean) => {
    onConfigChange({
      cards,
      gating_required: next,
    });
  };

  return (
    <div className="space-y-3">
      <Label>Cards</Label>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={cards.map((c) => c.client_id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {cards.map((card, idx) => (
              <SortableCard
                key={card.client_id}
                card={card}
                index={idx}
                onChange={handleCardChange}
                onDelete={() => handleDelete(card.client_id)}
                canDelete={cards.length > MIN_CARDS}
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
        disabled={cards.length >= MAX_CARDS}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add card
      </Button>

      {cards.length >= MAX_CARDS && (
        <p className="text-xs text-muted-foreground">
          Max {MAX_CARDS} cards — split into multiple blocks for longer decks.
        </p>
      )}
      {cards.length <= MIN_CARDS && (
        <p className="text-xs text-muted-foreground">
          Minimum {MIN_CARDS} cards required.
        </p>
      )}

      <div className="flex items-start gap-2 rounded-md border bg-muted/20 p-3">
        <Checkbox
          id="flashcards-gating"
          checked={gatingRequired}
          onCheckedChange={(checked) => handleGatingChange(checked === true)}
        />
        <div className="space-y-1">
          <Label htmlFor="flashcards-gating" className="cursor-pointer text-sm font-medium">
            Require completion before continuing
          </Label>
          <p className="text-xs text-muted-foreground">
            When on, trainees must rate every card "Got it" before the next
            Continue button is enabled.
          </p>
        </div>
      </div>
    </div>
  );
}
