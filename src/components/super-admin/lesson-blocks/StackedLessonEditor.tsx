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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { BlockRenderer } from "./BlockRenderer";
import { BlockHoverToolbar } from "./BlockHoverToolbar";
import { InlineAddButton } from "./InlineAddButton";
import type { BlockType, EditorBlock } from "./blockTypeMeta";

interface Props {
  blocks: EditorBlock[];
  selectedClientId: string | null;
  assetUrlMap: Map<string, string>;
  onSelectBlock: (clientId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDelete: (clientId: string) => void;
  onDuplicate: (clientId: string) => void;
  onInsert: (atIndex: number, blockType: BlockType) => void;
  onMoveUp: (clientId: string) => void;
  onMoveDown: (clientId: string) => void;
}

function SortableStackBlock({
  block,
  index,
  total,
  selected,
  assetUrlMap,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: {
  block: EditorBlock;
  index: number;
  total: number;
  selected: boolean;
  assetUrlMap: Map<string, string>;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.client_id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "stacked-block group relative -mx-4 cursor-pointer rounded-md px-4 py-4",
        selected && "is-selected",
      )}
      onClick={onSelect}
    >
      <div
        className={cn(
          "absolute right-2 top-2 z-10 transition-opacity",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <BlockHoverToolbar
          isFirst={index === 0}
          isLast={index === total - 1}
          dragAttributes={attributes}
          dragListeners={listeners}
          onEdit={onSelect}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </div>
      <BlockRenderer block={block} assetUrlMap={assetUrlMap} mode="editor" />
    </div>
  );
}

export function StackedLessonEditor({
  blocks,
  selectedClientId,
  assetUrlMap,
  onSelectBlock,
  onReorder,
  onDelete,
  onDuplicate,
  onInsert,
  onMoveUp,
  onMoveDown,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((b) => b.client_id === active.id);
    const to = blocks.findIndex((b) => b.client_id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(from, to);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={blocks.map((b) => b.client_id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          <InlineAddButton atIndex={0} onInsert={onInsert} />
          {blocks.map((b, i) => (
            <div key={b.client_id} className="space-y-1">
              <SortableStackBlock
                block={b}
                index={i}
                total={blocks.length}
                selected={selectedClientId === b.client_id}
                assetUrlMap={assetUrlMap}
                onSelect={() => onSelectBlock(b.client_id)}
                onDelete={() => onDelete(b.client_id)}
                onDuplicate={() => onDuplicate(b.client_id)}
                onMoveUp={() => onMoveUp(b.client_id)}
                onMoveDown={() => onMoveDown(b.client_id)}
              />
              <InlineAddButton atIndex={i + 1} onInsert={onInsert} />
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
