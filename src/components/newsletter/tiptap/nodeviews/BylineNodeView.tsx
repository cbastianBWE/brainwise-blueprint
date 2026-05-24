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
import {
  GripVertical,
  X,
  Plus,
  Trash2,
  Bold as BoldIcon,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isSafeHttpUrl } from "@/lib/safeUrl";
import type {
  BylineEntry,
  NewsletterBylineSeparatorStyle,
} from "../types";

// ============================================================
// LinkEditor
// ============================================================
interface LinkEditorProps {
  initialUrl: string;
  onApply: (url: string) => void;
  onRemove: () => void;
  onCancel: () => void;
}

function LinkEditor({ initialUrl, onApply, onRemove, onCancel }: LinkEditorProps) {
  const [url, setUrl] = useState(initialUrl);

  const apply = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      onRemove();
    } else if (isSafeHttpUrl(trimmed)) {
      onApply(trimmed);
    }
  };

  return (
    <div className="mt-1 flex items-center gap-1 rounded-md bg-[var(--bw-cream-200)] p-1.5 pl-7">
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        placeholder="https://..."
        autoFocus
        className="h-7 flex-1 rounded border-0 bg-white px-2 text-xs text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-1 focus:ring-[#F5741A]"
      />
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          apply();
        }}
        className="rounded bg-[#F5741A] px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-[#E06714]"
      >
        Apply
      </button>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          onRemove();
        }}
        className="rounded px-2 py-0.5 text-[11px] font-medium text-[var(--fg-2)] hover:bg-white"
      >
        Remove
      </button>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          onCancel();
        }}
        className="rounded px-2 py-0.5 text-[11px] text-[var(--fg-3)] hover:bg-white"
      >
        Cancel
      </button>
    </div>
  );
}

// ============================================================
// EntryRow
// ============================================================
interface EntryRowProps {
  id: string;
  entry: BylineEntry;
  isLinkEditing: boolean;
  canRemove: boolean;
  onChange: (next: BylineEntry) => void;
  onRemove: () => void;
  onOpenLinkEditor: () => void;
  onCloseLinkEditor: () => void;
}

function EntryRow({
  id,
  entry,
  isLinkEditing,
  onChange,
  onRemove,
  onOpenLinkEditor,
  onCloseLinkEditor,
}: EntryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-[var(--fg-4)] hover:text-[var(--fg-2)]"
          aria-label="Drag entry"
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <input
          type="text"
          value={entry.text}
          onChange={(e) => onChange({ ...entry, text: e.target.value })}
          placeholder="Author or meta"
          className="flex-1 rounded border-0 bg-transparent px-1 py-1 text-sm text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-1 focus:ring-[#F5741A]"
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onChange({ ...entry, bold: !entry.bold });
          }}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
            entry.bold
              ? "bg-[#F5741A]/15 text-[#F5741A]"
              : "text-[var(--fg-3)] hover:bg-[var(--bw-cream-200)]",
          )}
          aria-label="Bold"
          aria-pressed={entry.bold}
        >
          <BoldIcon className="h-3 w-3" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            if (isLinkEditing) onCloseLinkEditor();
            else onOpenLinkEditor();
          }}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
            entry.link
              ? "bg-[#F5741A]/15 text-[#F5741A]"
              : "text-[var(--fg-3)] hover:bg-[var(--bw-cream-200)]",
          )}
          aria-label="Link"
          aria-pressed={!!entry.link}
        >
          <Link2 className="h-3 w-3" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onRemove();
          }}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--fg-3)] hover:bg-red-50 hover:text-[var(--danger)]"
          aria-label="Remove entry"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {isLinkEditing && (
        <LinkEditor
          initialUrl={entry.link ?? ""}
          onApply={(url) => {
            onChange({ ...entry, link: url });
            onCloseLinkEditor();
          }}
          onRemove={() => {
            onChange({ ...entry, link: null });
            onCloseLinkEditor();
          }}
          onCancel={onCloseLinkEditor}
        />
      )}
    </div>
  );
}

// ============================================================
// BylineNodeView
// ============================================================
const SEPARATOR_OPTIONS: { value: NewsletterBylineSeparatorStyle; label: string }[] = [
  { value: "dot", label: "·" },
  { value: "pipe", label: "|" },
  { value: "slash", label: "/" },
];

export function BylineNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const entries: BylineEntry[] = useMemo(
    () => (node.attrs.entries as BylineEntry[]) ?? [],
    [node.attrs.entries],
  );
  const separator_style: NewsletterBylineSeparatorStyle =
    (node.attrs.separator_style as NewsletterBylineSeparatorStyle) ?? "dot";

  const idsRef = useRef<string[]>([]);
  while (idsRef.current.length < entries.length) {
    idsRef.current.push(crypto.randomUUID());
  }
  if (idsRef.current.length > entries.length) {
    idsRef.current = idsRef.current.slice(0, entries.length);
  }

  const [linkEditingId, setLinkEditingId] = useState<string | null>(null);
  const [localEntries, setLocalEntries] = useState<BylineEntry[]>(entries);
  const localEntriesRef = useRef<BylineEntry[]>(entries);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalEntries(entries);
    localEntriesRef.current = entries;
  }, [entries]);

  // Auto-insert one empty entry on first mount if entries is empty.
  useEffect(() => {
    if (entries.length === 0) {
      updateAttributes({
        entries: [{ text: "", bold: false, link: null }],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commitDebounced = (next: BylineEntry[]) => {
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

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

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
    const reorderedEntries = arrayMove(localEntriesRef.current, fromIndex, toIndex);
    idsRef.current = arrayMove(idsRef.current, fromIndex, toIndex);
    updateAttributes({ entries: reorderedEntries });
    setLocalEntries(reorderedEntries);
    localEntriesRef.current = reorderedEntries;
  };

  const handleEntryChange = (index: number, next: BylineEntry) => {
    const updated = [...localEntriesRef.current];
    updated[index] = next;
    commitDebounced(updated);
  };

  const handleEntryRemove = (index: number) => {
    if (localEntriesRef.current.length <= 1) {
      const reset: BylineEntry[] = [{ text: "", bold: false, link: null }];
      idsRef.current = [crypto.randomUUID()];
      updateAttributes({ entries: reset });
      setLocalEntries(reset);
      localEntriesRef.current = reset;
      setLinkEditingId(null);
      return;
    }
    const removedId = idsRef.current[index];
    const updated = localEntriesRef.current.filter((_, i) => i !== index);
    idsRef.current = idsRef.current.filter((_, i) => i !== index);
    updateAttributes({ entries: updated });
    setLocalEntries(updated);
    localEntriesRef.current = updated;
    if (linkEditingId === removedId) setLinkEditingId(null);
  };

  const handleAdd = () => {
    flushDebounce();
    const newEntry: BylineEntry = { text: "", bold: false, link: null };
    idsRef.current.push(crypto.randomUUID());
    const updated = [...localEntriesRef.current, newEntry];
    updateAttributes({ entries: updated });
    setLocalEntries(updated);
    localEntriesRef.current = updated;
  };

  const handleSeparatorChange = (next: NewsletterBylineSeparatorStyle) => {
    updateAttributes({ separator_style: next });
  };

  return (
    <NodeViewWrapper
      as="div"
      data-newsletter-byline="true"
      className={cn(
        "newsletter-byline-editor group/nl-byline relative my-6 rounded-md border border-transparent p-3 transition-colors",
        selected
          ? "border-[#F5741A] ring-2 ring-[#F5741A]/30"
          : "hover:border-[var(--border-1)]",
      )}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={deleteNode}
        className={cn(
          "absolute right-2 top-2 z-20 rounded-full bg-white/95 p-1.5 text-[var(--fg-2)] shadow-md transition-opacity duration-150 hover:bg-red-50 hover:text-[var(--danger)]",
          selected ? "opacity-100" : "opacity-0 group-hover/nl-byline:opacity-100",
        )}
        aria-label="Delete byline"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <div
        className="absolute -left-7 top-3 cursor-grab opacity-0 transition-opacity duration-150 group-hover/nl-byline:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
      </div>

      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-4)]">
          Separator
        </span>
        {SEPARATOR_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSeparatorChange(opt.value);
            }}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
              separator_style === opt.value
                ? "bg-[#F5741A]/15 text-[#F5741A]"
                : "text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]",
            )}
            aria-label={opt.value}
            aria-pressed={separator_style === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>

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
          <div className="space-y-1">
            {localEntries.map((entry, i) => (
              <EntryRow
                key={idsRef.current[i]}
                id={idsRef.current[i]}
                entry={entry}
                isLinkEditing={linkEditingId === idsRef.current[i]}
                canRemove={localEntries.length > 1}
                onChange={(next) => handleEntryChange(i, next)}
                onRemove={() => handleEntryRemove(i)}
                onOpenLinkEditor={() => setLinkEditingId(idsRef.current[i])}
                onCloseLinkEditor={() => setLinkEditingId(null)}
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
