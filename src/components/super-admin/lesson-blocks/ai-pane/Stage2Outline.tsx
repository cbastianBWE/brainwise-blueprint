import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { mapAiError } from "./mapAiError";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, GripVertical, Loader2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BLOCK_TYPE_META, type BlockType } from "../blockTypeMeta";

import type { LengthLevel, OutlineItem } from "./types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  lengthPreference: LengthLevel;
  onLengthChange: (next: LengthLevel) => void;
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
    lengthPreference,
    onLengthChange,
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
    <div className="flex flex-1 min-h-0 flex-col">
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
                      contentItemId={contentItemId}
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

      <div className="flex-shrink-0 space-y-2 border-t p-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Length</Label>
          <Select value={lengthPreference} onValueChange={(v) => onLengthChange(v as LengthLevel)}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="concise">Concise</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(() => {
          const unresolvedImages = items.filter(
            (i) => (i.block_type === "image" || i.block_type === "hotspot") && !i.image_resolved && !i.image_skipped,
          );
          const blocked = unresolvedImages.length > 0;
          return (
            <>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onBack} disabled={approving}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back to chat
                </Button>
                <Button
                  className="flex-1 shadow-cta"
                  onClick={onApprove}
                  disabled={approving || items.length === 0 || blocked}
                  style={{ backgroundColor: "#F5741A", color: "white" }}
                >
                  {approving ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-4 w-4" />
                  )}
                  Approve outline & start building
                </Button>
              </div>
              {blocked && (
                <p className="text-xs text-amber-700">
                  Resolve {unresolvedImages.length} image
                  {unresolvedImages.length === 1 ? "" : "s"} above (pick one or leave empty) to continue.
                </p>
              )}
              {approving && (
                <p className="text-xs text-muted-foreground">Starting the build…</p>
              )}
            </>
          );
        })()}
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
        lengthPreference={lengthPreference}
        onLengthChange={onLengthChange}
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
  contentItemId: string;
  onUpdate: (patch: Partial<OutlineItem>) => void;
  onDelete: () => void;
  onIterate: () => void;
}) {
  const { item, contentItemId, onUpdate, onDelete, onIterate } = props;
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
          {(item.block_type === "image" || item.block_type === "hotspot") && (
            <ImageResolutionSection
              item={item}
              contentItemId={contentItemId}
              onUpdate={onUpdate}
            />
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

type PexelsCandidate = {
  pexels_id: number | string;
  src_large: string;
  src_thumb: string;
  photographer_name: string;
  photographer_url: string;
  photo_page_url: string;
  alt: string;
};

function ImageResolutionSection(props: {
  item: OutlineItem;
  contentItemId: string;
  onUpdate: (patch: Partial<OutlineItem>) => void;
}) {
  const { item, contentItemId, onUpdate } = props;
  const [candidates, setCandidates] = useState<PexelsCandidate[]>([]);
  const [candidateIdx, setCandidateIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const autoSearchedRef = useRef(false);

  const effectiveQuery =
    typeof item.image_query === "string" ? item.image_query : item.summary_one_line ?? "";

  async function runSearch(q: string) {
    if (!contentItemId || !q.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("newsletter-image-search", {
        body: { query: q.trim(), count: 4 },
      });
      if (error) throw error;
      const list = ((data as any)?.candidates ?? []) as PexelsCandidate[];
      setCandidates(list);
      setCandidateIdx(0);
      if (!list.length) setErr("No results found.");
    } catch (e) {
      const info = mapAiError(e);
      setErr(info.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoSearchedRef.current) return;
    if (item.image_resolved || item.image_skipped) return;
    if (!contentItemId) return;
    autoSearchedRef.current = true;
    void runSearch(effectiveQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function useCurrent() {
    const candidate = candidates[candidateIdx];
    if (!candidate || !contentItemId) return;
    setIngesting(true);
    setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("lesson-ingest-pexels-asset", {
        body: {
          content_item_id: contentItemId,
          pexels_id: candidate.pexels_id,
          src_large_url: candidate.src_large,
          photo_page_url: candidate.photo_page_url,
          photographer_name: candidate.photographer_name,
          photographer_url: candidate.photographer_url,
          alt: candidate.alt,
        },
      });
      if (error) throw error;
      const assetId = (data as any)?.asset_id;
      if (!assetId) throw new Error("No asset returned");
      onUpdate({
        image_resolved: {
          asset_id: assetId,
          attribution: `Photo by ${candidate.photographer_name} on Pexels`,
          thumb_url: candidate.src_thumb,
        },
        image_query: effectiveQuery,
      });
    } catch (e) {
      const info = mapAiError(e);
      setErr(info.message);
    } finally {
      setIngesting(false);
    }
  }

  async function showAnother() {
    if (candidates.length === 0) {
      await runSearch(effectiveQuery);
      return;
    }
    const next = candidateIdx + 1;
    if (next >= candidates.length) {
      await runSearch(effectiveQuery);
    } else {
      setCandidateIdx(next);
    }
  }

  if (item.image_resolved) {
    return (
      <div className="mt-2 rounded border bg-muted/30 p-2">
        <div className="flex items-start gap-2">
          <img
            src={item.image_resolved.thumb_url}
            alt=""
            className="h-14 w-20 flex-shrink-0 rounded object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="truncate text-[10px] italic text-muted-foreground">
              {item.image_resolved.attribution}
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="mt-1 h-6 px-2 text-[11px]"
              onClick={() => onUpdate({ image_resolved: null })}
            >
              Change image
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (item.image_skipped) {
    return (
      <div className="mt-2 flex items-center justify-between rounded border border-dashed bg-muted/20 px-2 py-1.5">
        <p className="text-[11px] text-muted-foreground italic">
          Image left empty — you'll add one later
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[11px]"
          onClick={() => onUpdate({ image_skipped: false })}
        >
          Add an image
        </Button>
      </div>
    );
  }

  const current = candidates[candidateIdx];

  return (
    <div className="mt-2 space-y-2 rounded border bg-muted/20 p-2">
      <div className="flex gap-1">
        <Input
          value={effectiveQuery}
          onChange={(e) => onUpdate({ image_query: e.target.value })}
          placeholder="Image search query"
          className="h-7 text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => void runSearch(effectiveQuery)}
          disabled={loading || !contentItemId}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Search"}
        </Button>
      </div>
      {current && (
        <div className="flex items-start gap-2">
          <img
            src={current.src_thumb}
            alt=""
            className="h-14 w-20 flex-shrink-0 rounded object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="truncate text-[10px] text-muted-foreground">
              Photo by {current.photographer_name}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              <Button
                size="sm"
                className="h-6 px-2 text-[11px]"
                style={{ backgroundColor: "#F5741A", color: "white" }}
                onClick={() => void useCurrent()}
                disabled={ingesting}
              >
                {ingesting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                Use this image
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px]"
                onClick={() => void showAnother()}
                disabled={loading || ingesting}
              >
                Show another
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px] text-muted-foreground"
                onClick={() => onUpdate({ image_skipped: true })}
              >
                Leave empty
              </Button>
            </div>
          </div>
        </div>
      )}
      {!current && !loading && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground italic">No candidate yet.</p>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px] text-muted-foreground"
            onClick={() => onUpdate({ image_skipped: true })}
          >
            Leave empty
          </Button>
        </div>
      )}
      {err && <p className="text-[11px] text-destructive">{err}</p>}
    </div>
  );
}
