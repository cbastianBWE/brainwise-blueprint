import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, GripVertical, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BLOCK_TYPE_META, type BlockType } from "../blockTypeMeta";
import { COST_ESTIMATES } from "./costEstimates";
import type { OutlineItem } from "./types";
import { IterationModal, type IterationTarget } from "./IterationModal";

interface Props {
  contentItemId: string;
  items: OutlineItem[];
  onItemsChange: (items: OutlineItem[]) => void;
  onBack: () => void;
  onApprove: () => void;
  approving: boolean;
  voicePresetKey: string | null;
  customVoiceGuidance: string;
  customVoiceExample: string;
  voiceDisplayName: string;
  attachedDocumentIds: string[];
  mode: "fresh" | "append" | "replace";
  conversationMessages: { role: "user" | "assistant"; content: string }[];
}

export function Stage2Outline(props: Props) {
  const {
    items,
    onItemsChange,
    onBack,
    onApprove,
    approving,
    voicePresetKey,
    customVoiceGuidance,
    customVoiceExample,
    voiceDisplayName,
    attachedDocumentIds,
    mode,
    conversationMessages,
    contentItemId,
  } = props;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [iterationOpen, setIterationOpen] = useState(false);
  const [iterationTarget, setIterationTarget] = useState<IterationTarget | null>(null);

  const ids = useMemo(() => items.map((i) => i.id), [items]);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onItemsChange(arrayMove(items, oldIndex, newIndex));
  };

  const updateItem = (id: string, patch: Partial<OutlineItem>) => {
    onItemsChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const deleteItem = (id: string) => {
    onItemsChange(items.filter((it) => it.id !== id));
  };

  const openIterate = (item: OutlineItem) => {
    setIterationTarget({ kind: "outline_item", item });
    setIterationOpen(true);
  };

  const openAdd = (afterId: string | null) => {
    setIterationTarget({ kind: "outline_add", afterId });
    setIterationOpen(true);
  };

  const handleApplyOutlineItem = (
    target: Extract<IterationTarget, { kind: "outline_item" } | { kind: "outline_add" }>,
    next: OutlineItem,
  ) => {
    if (target.kind === "outline_item") {
      onItemsChange(items.map((it) => (it.id === next.id ? next : it)));
    } else {
      const insertAt =
        target.afterId === null
          ? 0
          : items.findIndex((it) => it.id === target.afterId) + 1;
      const arr = [...items];
      arr.splice(insertAt, 0, next);
      onItemsChange(arr);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3 text-sm text-muted-foreground">
        Review the outline below. Iterate any item, reorder, add items, or remove items. When ready,
        generate the full content.
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Outline is empty. Add an item to get started.
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => openAdd(null)}>
                <Plus className="mr-1 h-4 w-4" />
                Add item
              </Button>
            </div>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                <AddDivider onClick={() => openAdd(null)} />
                {items.map((item) => (
                  <div key={item.id}>
                    <OutlineCard
                      item={item}
                      onUpdate={(p) => updateItem(item.id, p)}
                      onDelete={() => deleteItem(item.id)}
                      onIterate={() => openIterate(item)}
                    />
                    <AddDivider onClick={() => openAdd(item.id)} />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="space-y-2 border-t p-3">
        <p className="text-xs text-muted-foreground">{COST_ESTIMATES.expandFullContent(items.length)}</p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack} disabled={approving}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to chat
          </Button>
          <Button
            className="flex-1 shadow-cta"
            onClick={onApprove}
            disabled={approving || items.length === 0}
            style={{ backgroundColor: "#F5741A", color: "white" }}
          >
            {approving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-4 w-4" />
            )}
            Approve outline & generate full content
          </Button>
        </div>
        {approving && (
          <p className="text-xs text-muted-foreground">
            Building {items.length} block{items.length === 1 ? "" : "s"} — this usually takes ~30 seconds.
          </p>
        )}
      </div>

      <IterationModal
        open={iterationOpen}
        onOpenChange={setIterationOpen}
        target={iterationTarget}
        contentItemId={contentItemId}
        voicePresetKey={voicePresetKey}
        customVoiceGuidance={customVoiceGuidance || null}
        customVoiceExample={customVoiceExample || null}
        voiceDisplayName={voiceDisplayName}
        attachedDocumentIds={attachedDocumentIds}
        mode={mode}
        conversationMessages={conversationMessages}
        onApplyOutlineItem={handleApplyOutlineItem}
        onApplyFullBlock={() => {
          /* not used in stage 2 */
        }}
      />
    </div>
  );
}

function AddDivider({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-2 py-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <span className="h-px flex-1 bg-border transition-colors group-hover:bg-foreground/30" />
      <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 opacity-60 group-hover:opacity-100">
        <Plus className="h-3 w-3" /> Add item
      </span>
      <span className="h-px flex-1 bg-border transition-colors group-hover:bg-foreground/30" />
    </button>
  );
}

function OutlineCard(props: {
  item: OutlineItem;
  onUpdate: (patch: Partial<OutlineItem>) => void;
  onDelete: () => void;
  onIterate: () => void;
}) {
  const { item, onUpdate, onDelete, onIterate } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const meta = BLOCK_TYPE_META[item.block_type as BlockType];
  const Icon = meta?.icon;
  const label = meta?.label ?? item.block_type;

  const [editingSummary, setEditingSummary] = useState(false);
  const [editingObjective, setEditingObjective] = useState(false);

  return (
    <div ref={setNodeRef} style={style} className="rounded-md border bg-background p-3">
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#021F36" }}>
            {Icon && <Icon className="h-3.5 w-3.5" style={{ color: "#F5741A" }} />}
            {label}
          </div>
          {editingSummary ? (
            <Textarea
              autoFocus
              rows={3}
              className="w-full resize-none rounded border px-2 py-1 text-sm"
              defaultValue={item.summary_one_line}
              onBlur={(e) => {
                onUpdate({ summary_one_line: e.target.value });
                setEditingSummary(false);
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") (e.target as HTMLTextAreaElement).blur();
                if (e.key === "Escape") setEditingSummary(false);
              }}
            />
          ) : (
            <p
              className="cursor-text whitespace-pre-wrap rounded text-sm hover:bg-muted/40"
              onClick={() => setEditingSummary(true)}
              title="Click to edit"
            >
              {item.summary_one_line || <span className="italic text-muted-foreground">(empty summary)</span>}
            </p>
          )}
          {editingObjective ? (
            <Textarea
              autoFocus
              rows={2}
              className="w-full resize-none rounded border px-2 py-1 text-xs"
              defaultValue={item.learning_objective_fragment}
              onBlur={(e) => {
                onUpdate({ learning_objective_fragment: e.target.value });
                setEditingObjective(false);
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") (e.target as HTMLTextAreaElement).blur();
                if (e.key === "Escape") setEditingObjective(false);
              }}
            />
          ) : (
            <p
              className="cursor-text whitespace-pre-wrap rounded text-xs text-muted-foreground hover:bg-muted/40"
              onClick={() => setEditingObjective(true)}
              title="Click to edit"
            >
              {item.learning_objective_fragment || <span className="italic">(no objective)</span>}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Button size="sm" variant="ghost" onClick={onIterate} className="h-7 px-2 text-xs">
            <Sparkles className="mr-1 h-3 w-3" />
            Iterate
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
