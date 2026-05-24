import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DISPLAY_OPTIONS: Array<{ value: "inline" | "block"; label: string }> = [
  { value: "block", label: "Block" },
  { value: "inline", label: "Inline" },
];

export function MathNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const [latex, setLatex] = useState<string>(node.attrs.latex ?? "");
  const display = (node.attrs.display as "inline" | "block") ?? "block";
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateAttributes({ latex });
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latex]);

  return (
    <NodeViewWrapper
      as="div"
      className={cn(
        "newsletter-math-editor group/nl-math relative my-4 rounded-md border p-3 transition-colors",
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
          selected ? "opacity-100" : "opacity-0 group-hover/nl-math:opacity-100",
        )}
        aria-label="Delete equation"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Display
        </span>
        {DISPLAY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              updateAttributes({ display: opt.value });
            }}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
              display === opt.value
                ? "bg-[#F5741A]/15 text-[#F5741A]"
                : "text-slate-600 hover:bg-slate-100",
            )}
            aria-pressed={display === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <textarea
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        rows={4}
        placeholder="\\frac{1}{2} \\cdot x^2 = ..."
        className="w-full resize-y rounded-md border border-slate-200 bg-white p-2 font-mono text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#F5741A] focus:ring-1 focus:ring-[#F5741A]/30"
        aria-label="LaTeX source"
      />

      <div className="mt-2 rounded-md bg-slate-50 p-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Source preview
        </div>
        <code className="block whitespace-pre-wrap break-all font-mono text-xs text-slate-700">
          {latex || <span className="text-slate-400">(empty)</span>}
        </code>
      </div>
    </NodeViewWrapper>
  );
}
