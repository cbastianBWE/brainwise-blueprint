import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCalloutNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const [value, setValue] = useState<string>(node.attrs.value ?? "");
  const [label, setLabel] = useState<string>(node.attrs.label ?? "");
  const [source, setSource] = useState<string>(node.attrs.source ?? "");
  const debounceRef = useRef<number | null>(null);

  // Debounced attr commits at 300ms
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateAttributes({
        value,
        label,
        source: source.trim() ? source : null,
      });
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, label, source]);

  return (
    <NodeViewWrapper
      as="figure"
      data-newsletter-stat-callout="true"
      className={cn(
        "newsletter-stat-callout group/nl-stat relative my-8 transition-shadow duration-150",
        selected && "ring-2 ring-[#F5741A] ring-offset-2 ring-offset-white",
      )}
    >
      <button
        type="button"
        onClick={deleteNode}
        className={cn(
          "absolute right-2 top-2 z-20 rounded-full bg-white/95 p-1.5 text-[var(--fg-2)] shadow-md transition-opacity duration-150 hover:bg-red-50 hover:text-[var(--danger)]",
          selected ? "opacity-100" : "opacity-0 group-hover/nl-stat:opacity-100",
        )}
        aria-label="Delete stat"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <div
        className="absolute -left-7 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity duration-150 group-hover/nl-stat:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="42%"
        className="newsletter-stat-callout__value block w-full border-0 bg-transparent text-center focus:outline-none focus:ring-0"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: 64,
          lineHeight: 1.05,
          color: "var(--bw-navy)",
        }}
      />
      <textarea
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Describe what this stat represents"
        rows={2}
        className="newsletter-stat-callout__label mx-auto block w-full max-w-[480px] resize-none border-0 bg-transparent text-center focus:outline-none focus:ring-0"
        style={{
          fontFamily: "var(--font-primary)",
          fontWeight: 600,
          fontSize: 16,
          lineHeight: 1.4,
          color: "var(--bw-slate-700)",
        }}
      />
      <input
        type="text"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="Source (optional)"
        className="newsletter-stat-callout__source mx-auto mt-2 block w-full max-w-[480px] border-0 bg-transparent text-center italic focus:outline-none focus:ring-0"
        style={{
          fontSize: 13,
          color: "var(--bw-slate-500)",
        }}
      />
    </NodeViewWrapper>
  );
}
