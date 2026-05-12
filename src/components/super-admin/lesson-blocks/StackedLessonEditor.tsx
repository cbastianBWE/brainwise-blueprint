import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { BlockRenderer } from "./BlockRenderer";
import { BlockHoverToolbar } from "./BlockHoverToolbar";
import { InlineAddButton } from "./InlineAddButton";
import { BLOCK_TYPE_META, type BlockType, type EditorBlock } from "./blockTypeMeta";

export type EditorMode = "edit" | "manage";

interface Props {
  blocks: EditorBlock[];
  selectedClientId: string | null;
  selectedClientIds: Set<string>;
  mode: EditorMode;
  assetUrlMap: Map<string, string>;
  onSelectBlock: (clientId: string) => void;
  onToggleSelect: (clientId: string, e: React.MouseEvent) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onGroupReorder: (activeClientId: string, overClientId: string) => void;
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
  manageSelected,
  isGroupMember,
  mode,
  assetUrlMap,
  onSelect,
  onToggleSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: {
  block: EditorBlock;
  index: number;
  total: number;
  selected: boolean;
  manageSelected: boolean;
  isGroupMember: boolean;
  mode: EditorMode;
  assetUrlMap: Map<string, string>;
  onSelect: () => void;
  onToggleSelect: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.client_id });

  const fadeOpacity = isDragging || isGroupMember ? 0.4 : 1;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: fadeOpacity,
  };

  const isManage = mode === "manage";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "stacked-block group relative -mx-4 cursor-pointer rounded-md px-4 py-4",
        !isManage && selected && "is-selected",
        isManage && manageSelected && "is-manage-selected",
      )}
      onClick={(e) => {
        if (isManage) {
          onToggleSelect(e);
        } else {
          onSelect();
        }
      }}
      {...(isManage ? attributes : {})}
      {...(isManage ? listeners : {})}
    >
      {isManage && (
        <div className="absolute left-1 top-4 z-10">
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-sm border-2 transition-colors",
              manageSelected
                ? "border-[#F5741A] bg-[#F5741A] text-white"
                : "border-muted-foreground/40 bg-background",
            )}
          >
            {manageSelected && <Check className="h-3.5 w-3.5" />}
          </div>
        </div>
      )}

      {!isManage && (
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
      )}

      <BlockRenderer block={block} assetUrlMap={assetUrlMap} mode="editor" />
    </div>
  );
}

export function StackedLessonEditor({
  blocks,
  selectedClientId,
  selectedClientIds,
  mode,
  assetUrlMap,
  onSelectBlock,
  onToggleSelect,
  onReorder,
  onGroupReorder,
  onDelete,
  onDuplicate,
  onInsert,
  onMoveUp,
  onMoveDown,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  const isGroupDragActive =
    activeId !== null &&
    selectedClientIds.size >= 2 &&
    selectedClientIds.has(activeId);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const activeStr = String(active.id);
    const overStr = String(over.id);

    if (selectedClientIds.size >= 2 && selectedClientIds.has(activeStr)) {
      onGroupReorder(activeStr, overStr);
      return;
    }

    const from = blocks.findIndex((b) => b.client_id === activeStr);
    const to = blocks.findIndex((b) => b.client_id === overStr);
    if (from < 0 || to < 0) return;
    onReorder(from, to);
  };

  const isManage = mode === "manage";

  const topmostSelectedBlock = (() => {
    if (!isGroupDragActive) return null;
    for (const b of blocks) {
      if (selectedClientIds.has(b.client_id)) return b;
    }
    return null;
  })();

  const TopmostIcon =
    topmostSelectedBlock != null
      ? BLOCK_TYPE_META[topmostSelectedBlock.block_type].icon
      : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={blocks.map((b) => b.client_id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          {!isManage && <InlineAddButton atIndex={0} onInsert={onInsert} />}
          {blocks.map((b, i) => {
            const isGroupMember =
              isGroupDragActive &&
              selectedClientIds.has(b.client_id) &&
              b.client_id !== activeId;
            return (
              <div key={b.client_id} className="space-y-1">
                <SortableStackBlock
                  block={b}
                  index={i}
                  total={blocks.length}
                  selected={selectedClientId === b.client_id}
                  manageSelected={selectedClientIds.has(b.client_id)}
                  isGroupMember={isGroupMember}
                  mode={mode}
                  assetUrlMap={assetUrlMap}
                  onSelect={() => onSelectBlock(b.client_id)}
                  onToggleSelect={(e) => onToggleSelect(b.client_id, e)}
                  onDelete={() => onDelete(b.client_id)}
                  onDuplicate={() => onDuplicate(b.client_id)}
                  onMoveUp={() => onMoveUp(b.client_id)}
                  onMoveDown={() => onMoveDown(b.client_id)}
                />
                {!isManage && <InlineAddButton atIndex={i + 1} onInsert={onInsert} />}
              </div>
            );
          })}
        </div>
      </SortableContext>

      <DragOverlay>
        {isGroupDragActive && TopmostIcon && (
          <div
            className="flex items-center gap-2 rounded-md border-l-4 px-3 py-2 shadow-lg"
            style={{
              width: 240,
              backgroundColor: "#FAF6F0",
              borderLeftColor: "#F5741A",
            }}
          >
            <TopmostIcon className="h-4 w-4 shrink-0" style={{ color: "#F5741A" }} />
            <span
              className="font-display text-sm font-medium"
              style={{ color: "#021F36" }}
            >
              Moving {selectedClientIds.size} blocks
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
