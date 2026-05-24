import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT_COLORS = [
  { value: "orange", label: "Orange" },
  { value: "forest", label: "Forest" },
  { value: "teal", label: "Teal" },
  { value: "plum", label: "Plum" },
  { value: "mustard", label: "Mustard" },
  { value: "navy", label: "Navy" },
];

export function IndexCardNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const [tag, setTag] = useState<string>(node.attrs.tag ?? "");
  const [name, setName] = useState<string>(node.attrs.name ?? "");
  const [formula, setFormula] = useState<string>(node.attrs.formula ?? "");
  const [note, setNote] = useState<string>(node.attrs.note ?? "");
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateAttributes({
        tag,
        name,
        formula: formula.trim() ? formula : null,
        note,
      });
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag, name, formula, note]);

  const accent = (node.attrs.accent_color as string) || "orange";
  const setAccent = (v: string) => updateAttributes({ accent_color: v });

  return (
    <NodeViewWrapper
      as="div"
      data-newsletter-index-card="true"
      data-accent-color={accent}
      className={cn(
        "group/nl-ic relative my-2 rounded-md border border-[var(--border-1)] bg-white p-4 transition-shadow",
        selected && "ring-2 ring-[#F5741A] ring-offset-2 ring-offset-white",
      )}
      style={{
        borderTop: `3px solid var(--bw-accent-${accent}, var(--bw-orange))`,
      }}
    >
      <button
        type="button"
        onClick={deleteNode}
        className={cn(
          "absolute right-2 top-2 z-20 rounded-full bg-white/95 p-1.5 text-[var(--fg-2)] shadow-md transition-opacity hover:bg-red-50 hover:text-[var(--danger)]",
          selected ? "opacity-100" : "opacity-0 group-hover/nl-ic:opacity-100",
        )}
        aria-label="Delete index card"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <div
        className="absolute -left-7 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity group-hover/nl-ic:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2 pr-10">
        <input
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="TAG"
          className="h-6 flex-1 min-w-[80px] rounded-md border border-transparent bg-transparent px-2 text-[10px] uppercase tracking-wider focus:border-[#F5741A] focus:outline-none"
          style={{ fontFamily: "var(--bw-mono-font)" }}
        />
        <select
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
          className="h-6 rounded-md border border-[var(--border-1)] bg-transparent px-1 text-xs focus:border-[#F5741A] focus:outline-none"
          aria-label="Accent color"
        >
          {ACCENT_COLORS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Metric name"
        className="mb-2 h-10 w-full rounded-md border border-transparent bg-transparent px-2 text-2xl font-bold focus:border-[#F5741A] focus:outline-none"
        style={{ fontFamily: "var(--font-display)", color: "var(--bw-navy)" }}
      />

      <input
        type="text"
        value={formula}
        onChange={(e) => setFormula(e.target.value)}
        placeholder="Optional formula"
        className="mb-2 h-7 w-full rounded-md border border-transparent bg-transparent px-2 text-xs focus:border-[#F5741A] focus:outline-none"
        style={{ fontFamily: "var(--bw-mono-font)" }}
      />

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note"
        rows={2}
        className="w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1 text-sm focus:border-[#F5741A] focus:outline-none"
      />
    </NodeViewWrapper>
  );
}
