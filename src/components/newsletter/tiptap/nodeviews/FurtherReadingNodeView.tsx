import { useEffect, useMemo, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, GripVertical, Plus, BookOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSafeHttpUrl } from "@/lib/safeUrl";
import type { NewsletterFurtherReadingEntry } from "../types";

function emptyEntry(): NewsletterFurtherReadingEntry {
  return { title: "", url: "", source: null, description: null };
}

// ============================================================
// EntryRow
// ============================================================
interface EntryRowProps {
  id: string;
  entry: NewsletterFurtherReadingEntry;
  onChange: (next: NewsletterFurtherReadingEntry) => void;
  onRemove: () => void;
}

function EntryRow({ id, entry, onChange, onRemove }: EntryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const urlInvalid =
    entry.url.length > 0 && !isSafeHttpUrl(entry.url);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded border border-slate-200 bg-white p-2"
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab touch-none text-[var(--fg-4)] hover:text-[var(--fg-2)]"
          aria-label="Drag entry"
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <div className="flex-1 space-y-1">
          <input
            type="text"
            value={entry.title}
            onChange={(e) => onChange({ ...entry, title: e.target.value })}
            placeholder="Title"
            className="w-full rounded border-0 bg-transparent px-1 py-0.5 text-sm font-medium text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-1 focus:ring-[#F5741A]"
          />
          <input
            type="text"
            value={entry.url}
            onChange={(e) => onChange({ ...entry, url: e.target.value })}
            placeholder="https://..."
            className={cn(
              "w-full rounded border-0 bg-transparent px-1 py-0.5 text-xs text-[var(--fg-2)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-1",
              urlInvalid ? "focus:ring-[var(--danger)]" : "focus:ring-[#F5741A]",
            )}
          />
          <input
            type="text"
            value={entry.source ?? ""}
            onChange={(e) =>
              onChange({
                ...entry,
                source: e.target.value.trim() ? e.target.value : null,
              })
            }
            placeholder="Source (optional, e.g. 'The Atlantic')"
            className="w-full rounded border-0 bg-transparent px-1 py-0.5 text-[11px] uppercase tracking-wider text-[var(--fg-3)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-1 focus:ring-[#F5741A]"
            style={{ fontFamily: "var(--bw-mono-font)" }}
          />
          <input
            type="text"
            value={entry.description ?? ""}
            onChange={(e) =>
              onChange({
                ...entry,
                description: e.target.value.trim() ? e.target.value : null,
              })
            }
            placeholder="Description (optional, one line)"
            className="w-full rounded border-0 bg-transparent px-1 py-0.5 text-xs text-[var(--fg-3)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-1 focus:ring-[#F5741A]"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="mt-1 flex h-6 w-6 items-center justify-center rounded-full text-[var(--fg-3)] hover:bg-red-50 hover:text-[var(--danger)]"
          aria-label="Remove entry"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// FurtherReadingNodeView
// ============================================================
export function FurtherReadingNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const entries: NewsletterFurtherReadingEntry[] = useMemo(
    () =>
      (node.attrs.entries as NewsletterFurtherReadingEntry[] | undefined) ?? [],
    [node.attrs.entries],
  );
  const initialTitle = (node.attrs.title as string | null) ?? "";

  const idsRef = useRef<string[]>([]);
  while (idsRef.current.length < entries.length) {
    idsRef.current.push(crypto.randomUUID());
  }
  if (idsRef.current.length > entries.length) {
    idsRef.current = idsRef.current.slice(0, entries.length);
  }

  const [title, setTitle] = useState(initialTitle);
  const titleRef = useRef(initialTitle);
  titleRef.current = title;

  const [localEntries, setLocalEntries] = useState(entries);
  const localEntriesRef = useRef(entries);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalEntries(entries);
    localEntriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    setTitle((node.attrs.title as string | null) ?? "");
  }, [node.attrs.title]);

  // Auto-insert one empty entry on first mount if empty.
  useEffect(() => {
    if (entries.length === 0) {
      updateAttributes({ entries: [emptyEntry()] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commitDebounced = (next: NewsletterFurtherReadingEntry[]) => {
    setLocalEntries(next);
    localEntriesRef.current = next;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateAttributes({ entries: next });
      debounceRef.current = null;
    }, 300);
  };

  const flushDebounce = () => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
      updateAttributes({ entries: localEntriesRef.current });
    }
  };

  useEffect(
    () => () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    },
    [],
  );

  const commitTitleDebounced = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateAttributes({
        title: titleRef.current.trim() ? titleRef.current : null,
      });
      debounceRef.current = null;
    }, 300);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const handleDragStart = (_e: DragStartEvent) => {
    flushDebounce();
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const fromIndex = idsRef.current.indexOf(active.id as string);
    const toIndex = idsRef.current.indexOf(over.id as string);
    if (fromIndex < 0 || toIndex < 0) return;
    const reordered = arrayMove(localEntriesRef.current, fromIndex, toIndex);
    idsRef.current = arrayMove(idsRef.current, fromIndex, toIndex);
    updateAttributes({ entries: reordered });
    setLocalEntries(reordered);
    localEntriesRef.current = reordered;
  };

  const handleChange = (index: number, next: NewsletterFurtherReadingEntry) => {
    const updated = [...localEntriesRef.current];
    updated[index] = next;
    commitDebounced(updated);
  };

  const handleRemove = (index: number) => {
    if (localEntriesRef.current.length <= 1) {
      const reset = [emptyEntry()];
      idsRef.current = [crypto.randomUUID()];
      updateAttributes({ entries: reset });
      setLocalEntries(reset);
      localEntriesRef.current = reset;
      return;
    }
    const updated = localEntriesRef.current.filter((_, i) => i !== index);
    idsRef.current = idsRef.current.filter((_, i) => i !== index);
    updateAttributes({ entries: updated });
    setLocalEntries(updated);
    localEntriesRef.current = updated;
  };

  const handleAdd = () => {
    flushDebounce();
    idsRef.current.push(crypto.randomUUID());
    const updated = [...localEntriesRef.current, emptyEntry()];
    updateAttributes({ entries: updated });
    setLocalEntries(updated);
    localEntriesRef.current = updated;
  };

  return (
    <NodeViewWrapper
      as="section"
      data-newsletter-further-reading="true"
      className={cn(
        "newsletter-further-reading-editor group/nl-fr relative my-6 rounded-md border border-slate-200 bg-white p-4",
        selected && "ring-2 ring-[#F5741A]/40",
      )}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={deleteNode}
        className={cn(
          "absolute right-2 top-2 z-20 rounded-full bg-white/95 p-1.5 text-[var(--fg-2)] shadow-md transition-opacity hover:bg-red-50 hover:text-[var(--danger)]",
          selected ? "opacity-100" : "opacity-0 group-hover/nl-fr:opacity-100",
        )}
        aria-label="Delete further reading"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <div
        className="absolute -left-7 top-4 cursor-grab opacity-0 transition-opacity group-hover/nl-fr:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
      </div>

      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-4)]">
        <BookOpen className="h-3 w-3" />
        Further reading
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          commitTitleDebounced();
        }}
        onBlur={() => {
          if (debounceRef.current) {
            window.clearTimeout(debounceRef.current);
            debounceRef.current = null;
          }
          updateAttributes({
            title: titleRef.current.trim() ? titleRef.current : null,
          });
        }}
        placeholder="Further reading title (optional, default 'Further reading')"
        className="mb-3 w-full rounded border-0 bg-transparent px-1 text-xs uppercase tracking-wider text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-1 focus:ring-[#F5741A]"
        style={{ fontFamily: "var(--bw-mono-font)" }}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={idsRef.current}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {localEntries.map((entry, i) => (
              <EntryRow
                key={idsRef.current[i]}
                id={idsRef.current[i]}
                entry={entry}
                onChange={(next) => handleChange(i, next)}
                onRemove={() => handleRemove(i)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          handleAdd();
        }}
        className="mt-2 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]"
      >
        <Plus className="h-3 w-3" />
        Add entry
      </button>
    </NodeViewWrapper>
  );
}
