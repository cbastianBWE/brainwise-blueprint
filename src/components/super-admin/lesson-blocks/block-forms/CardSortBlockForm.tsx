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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "../RichTextEditor";
import { FileUploadField } from "@/components/super-admin/FileUploadField";
import { BrandColorSwatch } from "../BrandColorSwatch";
import type { TipTapDocJSON } from "../blockTypeMeta";

type Bucket = {
  client_id: string;
  title: string;
  description: string | null;
  outline_color: string | null;
};

type Card = {
  client_id: string;
  content: TipTapDocJSON;
  correct_bucket_id: string | null;
  image_asset_id: string | null;
  caption: string | null;
  background_color: string | null;
};

interface Props {
  value: {
    buckets: Bucket[];
    cards: Card[];
    gating_required: boolean;
  };
  onConfigChange: (next: {
    buckets: Bucket[];
    cards: Card[];
    gating_required: boolean;
  }) => void;
  contentItemId: string;
}

const emptyDoc = (): TipTapDocJSON => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

const MIN_BUCKETS = 2;
const MAX_BUCKETS = 4;
const MIN_CARDS = 4;
const MAX_CARDS = 12;
const MAX_BUCKET_TITLE = 40;
const MAX_BUCKET_DESCRIPTION = 120;
const MAX_CARD_CAPTION = 80;

const BUCKET_OUTLINE_COLORS = [
  "#2D6A4F",
  "#F5741A",
  "#3C096C",
  "#021F36",
];

function SortableBucket({
  bucket,
  index,
  onChange,
  onDelete,
  canDelete,
}: {
  bucket: Bucket;
  index: number;
  onChange: (next: Bucket) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bucket.client_id });

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
          aria-label="Drag bucket"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Bucket {index + 1}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Title (1-4 words)</Label>
            <Input
              value={bucket.title}
              onChange={(e) => onChange({ ...bucket, title: e.target.value })}
              maxLength={MAX_BUCKET_TITLE}
              placeholder="e.g. Stable, Volatile"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              Description (optional, max {MAX_BUCKET_DESCRIPTION} chars)
            </Label>
            <Textarea
              value={bucket.description ?? ""}
              onChange={(e) =>
                onChange({
                  ...bucket,
                  description: e.target.value || null,
                })
              }
              maxLength={MAX_BUCKET_DESCRIPTION}
              rows={2}
              placeholder="Short explanation of what goes in this bucket"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Outline color</Label>
            <BrandColorSwatch
              value={bucket.outline_color}
              onChange={(hex) => onChange({ ...bucket, outline_color: hex })}
              palette="full"
              allowedHexes={BUCKET_OUTLINE_COLORS}
              allowDefault
              defaultLabel="Default"
            />
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-1 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Remove bucket"
          disabled={!canDelete}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SortableCard({
  card,
  index,
  buckets,
  onChange,
  onDelete,
  canDelete,
  contentItemId,
}: {
  card: Card;
  index: number;
  buckets: Bucket[];
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

  const selectedBucketStillExists =
    card.correct_bucket_id !== null &&
    buckets.some((b) => b.client_id === card.correct_bucket_id);

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
            <Label className="text-xs">Card image (optional)</Label>
            <FileUploadField
              assetKind="image"
              contentItemId={contentItemId}
              lessonBlockId={null}
              refField={`card_sort.cards.${card.client_id}.image_asset_id`}
              value={card.image_asset_id}
              onChange={(newAssetId) =>
                onChange({ ...card, image_asset_id: newAssetId })
              }
            />
          </div>

          {card.image_asset_id && (
            <div className="space-y-1">
              <Label className="text-xs">
                Caption (optional, max {MAX_CARD_CAPTION} chars)
              </Label>
              <Input
                value={card.caption ?? ""}
                onChange={(e) =>
                  onChange({
                    ...card,
                    caption: e.target.value || null,
                  })
                }
                maxLength={MAX_CARD_CAPTION}
                placeholder="Short caption shown below the image"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Card content</Label>
            <RichTextEditor
              value={card.content}
              onChange={(next) => onChange({ ...card, content: next })}
              placeholder="What the trainee reads on this card"
              compact
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Card color</Label>
            <BrandColorSwatch
              value={card.background_color}
              onChange={(hex) => onChange({ ...card, background_color: hex })}
              palette="full"
              allowDefault
              defaultLabel="Default"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Correct bucket</Label>
            <Select
              value={selectedBucketStillExists ? (card.correct_bucket_id as string) : ""}
              onValueChange={(v) =>
                onChange({ ...card, correct_bucket_id: v || null })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Pick the bucket this card belongs in" />
              </SelectTrigger>
              <SelectContent>
                {buckets.map((b, bi) => (
                  <SelectItem key={b.client_id} value={b.client_id}>
                    {b.title || `Bucket ${bi + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedBucketStillExists && card.correct_bucket_id !== null && (
              <p className="text-xs text-destructive">
                The previously-selected bucket no longer exists. Pick a new one.
              </p>
            )}
            {card.correct_bucket_id === null && (
              <p className="text-xs text-amber-600">
                Unassigned — trainees won't be able to place this card correctly.
              </p>
            )}
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

export function CardSortBlockForm({ value, onConfigChange, contentItemId }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const buckets = value.buckets ?? [];
  const cards = value.cards ?? [];
  const gatingRequired = value.gating_required === true;

  const emit = (next: Partial<{ buckets: Bucket[]; cards: Card[]; gating_required: boolean }>) => {
    onConfigChange({
      buckets: next.buckets ?? buckets,
      cards: next.cards ?? cards,
      gating_required: next.gating_required ?? gatingRequired,
    });
  };

  const handleBucketDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = buckets.findIndex((b) => b.client_id === active.id);
    const to = buckets.findIndex((b) => b.client_id === over.id);
    if (from < 0 || to < 0) return;
    emit({ buckets: arrayMove(buckets, from, to) });
  };

  const handleBucketChange = (next: Bucket) => {
    emit({ buckets: buckets.map((b) => (b.client_id === next.client_id ? next : b)) });
  };

  const handleBucketDelete = (clientId: string) => {
    if (buckets.length <= MIN_BUCKETS) return;
    const nextCards = cards.map((c) =>
      c.correct_bucket_id === clientId ? { ...c, correct_bucket_id: null } : c,
    );
    emit({
      buckets: buckets.filter((b) => b.client_id !== clientId),
      cards: nextCards,
    });
  };

  const handleBucketAdd = () => {
    if (buckets.length >= MAX_BUCKETS) return;
    emit({
      buckets: [
        ...buckets,
        { client_id: crypto.randomUUID(), title: "", description: null, outline_color: null },
      ],
    });
  };

  const handleCardDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = cards.findIndex((c) => c.client_id === active.id);
    const to = cards.findIndex((c) => c.client_id === over.id);
    if (from < 0 || to < 0) return;
    emit({ cards: arrayMove(cards, from, to) });
  };

  const handleCardChange = (next: Card) => {
    emit({ cards: cards.map((c) => (c.client_id === next.client_id ? next : c)) });
  };

  const handleCardDelete = (clientId: string) => {
    if (cards.length <= MIN_CARDS) return;
    emit({ cards: cards.filter((c) => c.client_id !== clientId) });
  };

  const handleCardAdd = () => {
    if (cards.length >= MAX_CARDS) return;
    emit({
      cards: [
        ...cards,
        {
          client_id: crypto.randomUUID(),
          content: emptyDoc(),
          correct_bucket_id: null,
          image_asset_id: null,
          caption: null,
          background_color: null,
        },
      ],
    });
  };

  const handleGatingChange = (next: boolean) => {
    emit({ gating_required: next });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Label>Buckets</Label>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleBucketDragEnd}
        >
          <SortableContext
            items={buckets.map((b) => b.client_id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {buckets.map((bucket, idx) => (
                <SortableBucket
                  key={bucket.client_id}
                  bucket={bucket}
                  index={idx}
                  onChange={handleBucketChange}
                  onDelete={() => handleBucketDelete(bucket.client_id)}
                  canDelete={buckets.length > MIN_BUCKETS}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleBucketAdd}
          disabled={buckets.length >= MAX_BUCKETS}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add bucket
        </Button>

        {buckets.length >= MAX_BUCKETS && (
          <p className="text-xs text-muted-foreground">
            Max {MAX_BUCKETS} buckets.
          </p>
        )}
        {buckets.length <= MIN_BUCKETS && (
          <p className="text-xs text-muted-foreground">
            Minimum {MIN_BUCKETS} buckets required.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Label>Cards</Label>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCardDragEnd}
        >
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
                  buckets={buckets}
                  onChange={handleCardChange}
                  onDelete={() => handleCardDelete(card.client_id)}
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
          onClick={handleCardAdd}
          disabled={cards.length >= MAX_CARDS}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add card
        </Button>

        {cards.length >= MAX_CARDS && (
          <p className="text-xs text-muted-foreground">
            Max {MAX_CARDS} cards.
          </p>
        )}
        {cards.length <= MIN_CARDS && (
          <p className="text-xs text-muted-foreground">
            Minimum {MIN_CARDS} cards required.
          </p>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-md border bg-muted/20 p-3">
        <Checkbox
          id="card-sort-gating"
          checked={gatingRequired}
          onCheckedChange={(checked) => handleGatingChange(checked === true)}
        />
        <div className="space-y-1">
          <Label htmlFor="card-sort-gating" className="cursor-pointer text-sm font-medium">
            Require completion before continuing
          </Label>
          <p className="text-xs text-muted-foreground">
            When on, trainees must place every card in its correct bucket before the next Continue button is enabled.
          </p>
        </div>
      </div>
    </div>
  );
}
