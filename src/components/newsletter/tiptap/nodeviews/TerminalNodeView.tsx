import { useEffect, useRef, useState } from "react";
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
import { Trash2, GripVertical, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TerminalCommand, TerminalTheme } from "../types";

const THEME_OPTIONS: Array<{ value: TerminalTheme; label: string }> = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

interface CommandRowProps {
  id: string;
  command: TerminalCommand;
  onChange: (next: TerminalCommand) => void;
  onRemove: () => void;
}

function CommandRow({ id, command, onChange, onRemove }: CommandRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-md border border-slate-200 bg-white p-2"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-slate-400 hover:text-slate-600"
          aria-label="Drag command"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <input
          type="text"
          value={command.prompt}
          onChange={(e) => onChange({ ...command, prompt: e.target.value })}
          placeholder="$"
          className="w-12 rounded border-0 bg-slate-50 px-1.5 py-1 text-center font-mono text-xs text-slate-700 outline-none focus:ring-1 focus:ring-[#F5741A]"
          aria-label="Prompt"
        />
        <input
          type="text"
          value={command.command}
          onChange={(e) => onChange({ ...command, command: e.target.value })}
          placeholder="ls -la"
          className="flex-1 rounded border-0 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#F5741A]"
          aria-label="Command"
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onRemove();
          }}
          className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600"
          aria-label="Remove command"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <textarea
        value={command.output}
        onChange={(e) => onChange({ ...command, output: e.target.value })}
        rows={2}
        placeholder="Optional output..."
        className="mt-1 w-full resize-y rounded border-0 bg-slate-50 p-1.5 font-mono text-xs text-slate-600 outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-[#F5741A]"
        aria-label="Output"
      />
    </div>
  );
}

export function TerminalNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const commands: TerminalCommand[] =
    (node.attrs.commands as TerminalCommand[]) ?? [];
  const theme: TerminalTheme =
    (node.attrs.theme as TerminalTheme) ?? "dark";

  const idsRef = useRef<string[]>([]);
  while (idsRef.current.length < commands.length) {
    idsRef.current.push(crypto.randomUUID());
  }
  if (idsRef.current.length > commands.length) {
    idsRef.current = idsRef.current.slice(0, commands.length);
  }

  const [localCommands, setLocalCommands] =
    useState<TerminalCommand[]>(commands);
  const localCommandsRef = useRef<TerminalCommand[]>(commands);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalCommands(commands);
    localCommandsRef.current = commands;
  }, [commands]);

  // Seed first command on mount if empty.
  useEffect(() => {
    if (commands.length === 0) {
      updateAttributes({
        commands: [{ prompt: "$", command: "", output: "" }],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commitDebounced = (next: TerminalCommand[]) => {
    setLocalCommands(next);
    localCommandsRef.current = next;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateAttributes({ commands: next });
      debounceRef.current = null;
    }, 300);
  };

  const flushDebounce = () => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
      updateAttributes({ commands: localCommandsRef.current });
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
    const reordered = arrayMove(localCommandsRef.current, fromIndex, toIndex);
    idsRef.current = arrayMove(idsRef.current, fromIndex, toIndex);
    updateAttributes({ commands: reordered });
    setLocalCommands(reordered);
    localCommandsRef.current = reordered;
  };

  const handleCommandChange = (index: number, next: TerminalCommand) => {
    const updated = [...localCommandsRef.current];
    updated[index] = next;
    commitDebounced(updated);
  };

  const handleCommandRemove = (index: number) => {
    flushDebounce();
    if (localCommandsRef.current.length <= 1) {
      const reset: TerminalCommand[] = [
        { prompt: "$", command: "", output: "" },
      ];
      idsRef.current = [crypto.randomUUID()];
      updateAttributes({ commands: reset });
      setLocalCommands(reset);
      localCommandsRef.current = reset;
      return;
    }
    const updated = localCommandsRef.current.filter((_, i) => i !== index);
    idsRef.current = idsRef.current.filter((_, i) => i !== index);
    updateAttributes({ commands: updated });
    setLocalCommands(updated);
    localCommandsRef.current = updated;
  };

  const handleAdd = () => {
    flushDebounce();
    const newCmd: TerminalCommand = { prompt: "$", command: "", output: "" };
    idsRef.current.push(crypto.randomUUID());
    const updated = [...localCommandsRef.current, newCmd];
    updateAttributes({ commands: updated });
    setLocalCommands(updated);
    localCommandsRef.current = updated;
  };

  const handleThemeChange = (next: TerminalTheme) => {
    updateAttributes({ theme: next });
  };

  return (
    <NodeViewWrapper
      as="div"
      className={cn(
        "newsletter-terminal-editor group/nl-term relative my-4 rounded-md border p-3 transition-colors",
        selected
          ? "border-[#F5741A] ring-2 ring-[#F5741A]/30"
          : "border-slate-200 hover:border-slate-300",
      )}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={deleteNode}
        className={cn(
          "absolute right-2 top-2 z-20 rounded-full bg-white/95 p-1.5 text-slate-600 shadow-md transition-opacity duration-150 hover:bg-red-50 hover:text-red-600",
          selected ? "opacity-100" : "opacity-0 group-hover/nl-term:opacity-100",
        )}
        aria-label="Delete terminal"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <div
        className="absolute -left-7 top-3 cursor-grab opacity-0 transition-opacity duration-150 group-hover/nl-term:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-slate-400" />
      </div>

      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Theme
        </span>
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleThemeChange(opt.value);
            }}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
              theme === opt.value
                ? "bg-[#F5741A]/15 text-[#F5741A]"
                : "text-slate-600 hover:bg-slate-100",
            )}
            aria-pressed={theme === opt.value}
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
          <div className="space-y-2">
            {localCommands.map((c, i) => (
              <CommandRow
                key={idsRef.current[i]}
                id={idsRef.current[i]}
                command={c}
                onChange={(next) => handleCommandChange(i, next)}
                onRemove={() => handleCommandRemove(i)}
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
        className="mt-2 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
      >
        <Plus className="h-3 w-3" />
        Add command
      </button>
    </NodeViewWrapper>
  );
}
