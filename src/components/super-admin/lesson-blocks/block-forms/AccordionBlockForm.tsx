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
import { RichTextEditor } from "../RichTextEditor";
import type { TipTapDocJSON } from "../blockTypeMeta";

type Item = { client_id: string; title: string; body: TipTapDocJSON };

interface Props {
  value: { items: Item[] };
  onConfigChange: (next: { items: Item[] }) => void;
}

const emptyDoc = (): TipTapDocJSON => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

function SortableItem({
  item,
  onChange,
  onDelete,
  onEnterAtEnd,
  canDelete,
}: {
  item: Item;
  onChange: (next: Item) => void;
  onDelete: () => void;
  onEnterAtEnd: () => void;
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
    <div ref={setNodeRef} style={style} className="rounded-md border bg-background p-2">
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-2 cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          aria-label="Drag section"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 space-y-2">
          <Input
            value={item.title}
            onChange={(e) => onChange({ ...item, title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && item.title.trim().length > 0) {
                e.preventDefault();
                onEnterAtEnd();
              }
            }}
            placeholder="Section title"
            className="font-medium"
          />
          <RichTextEditor
            value={item.body}
            onChange={(next) => onChange({ ...item, body: next })}
            placeholder="Section body — revealed when this section is opened"
            compact
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-1 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Remove section"
          disabled={!canDelete}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function AccordionBlockForm({ value, onConfigChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const items = value.items ?? [];

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.client_id === active.id);
    const to = items.findIndex((i) => i.client_id === over.id);
    if (from < 0 || to < 0) return;
    onConfigChange({ items: arrayMove(items, from, to) });
  };

  const handleItemChange = (next: Item) => {
    onConfigChange({
      items: items.map((i) => (i.client_id === next.client_id ? next : i)),
    });
  };

  const handleDelete = (clientId: string) => {
    if (items.length <= 1) {
      onConfigChange({ items: [{ client_id: crypto.randomUUID(), title: "", body: emptyDoc() }] });
      return;
    }
    onConfigChange({ items: items.filter((i) => i.client_id !== clientId) });
  };

  const handleAdd = () => {
    if (items.length >= 6) return;
    onConfigChange({
      items: [...items, { client_id: crypto.randomUUID(), title: "", body: emptyDoc() }],
    });
  };

  return (
    <div className="space-y-3">
      <Label>Sections</Label>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.client_id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item) => (
              <SortableItem
                key={item.client_id}
                item={item}
                onChange={handleItemChange}
                onDelete={() => handleDelete(item.client_id)}
                onEnterAtEnd={handleAdd}
                canDelete={items.length > 1}
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
        disabled={items.length >= 6}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add section
      </Button>
      {items.length >= 6 && (
        <p className="text-xs text-muted-foreground">
          Max 6 sections — split into multiple blocks if needed.
        </p>
      )}
    </div>
  );
}
