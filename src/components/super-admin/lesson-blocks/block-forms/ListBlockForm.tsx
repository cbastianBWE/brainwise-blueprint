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
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "../RichTextEditor";
import { BrandColorSwatch } from "../BrandColorSwatch";
import type { TipTapDocJSON } from "../blockTypeMeta";

type Item = { client_id: string; body: TipTapDocJSON };

interface Props {
  value: { items: Item[]; ordered: boolean; marker_color?: string | null };
  onConfigChange: (next: {
    items: Item[];
    ordered: boolean;
    marker_color?: string | null;
  }) => void;
}

const emptyDoc = (): TipTapDocJSON => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

function SortableItem({
  item,
  onChange,
  onDelete,
  canDelete,
}: {
  item: Item;
  onChange: (next: Item) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.client_id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      <button
        type="button"
        className="mt-2 cursor-grab text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Drag item"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">
        <RichTextEditor
          value={item.body}
          onChange={(next) => onChange({ ...item, body: next })}
          compact
          placeholder="List item"
        />
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="mt-1 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        aria-label="Remove item"
        disabled={!canDelete}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ListBlockForm({ value, onConfigChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const items = value.items ?? [];

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.client_id === active.id);
    const to = items.findIndex((i) => i.client_id === over.id);
    if (from < 0 || to < 0) return;
    onConfigChange({ ...value, items: arrayMove(items, from, to) });
  };

  const handleItemChange = (next: Item) => {
    onConfigChange({
      ...value,
      items: items.map((i) => (i.client_id === next.client_id ? next : i)),
    });
  };

  const handleDelete = (clientId: string) => {
    if (items.length <= 1) {
      onConfigChange({
        ...value,
        items: [{ client_id: crypto.randomUUID(), body: emptyDoc() }],
      });
      return;
    }
    onConfigChange({
      ...value,
      items: items.filter((i) => i.client_id !== clientId),
    });
  };

  const handleAdd = () => {
    onConfigChange({
      ...value,
      items: [...items, { client_id: crypto.randomUUID(), body: emptyDoc() }],
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Numbered list</Label>
        <Switch
          checked={!!value.ordered}
          onCheckedChange={(c) => onConfigChange({ ...value, ordered: c })}
        />
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={items.map((i) => i.client_id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((item) => (
              <SortableItem
                key={item.client_id}
                item={item}
                onChange={handleItemChange}
                onDelete={() => handleDelete(item.client_id)}
                canDelete={items.length > 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button type="button" size="sm" variant="outline" onClick={handleAdd}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add item
      </Button>
    </div>
  );
}
