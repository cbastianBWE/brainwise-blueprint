import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const GAP_OPTIONS = [
  { value: "tight", label: "Tight" },
  { value: "normal", label: "Normal" },
  { value: "wide", label: "Wide" },
] as const;

const GAP_CLASS: Record<string, string> = {
  tight: "gap-3",
  normal: "gap-8",
  wide: "gap-16",
};

export function TwoColumnNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const gap = (node.attrs.gap as string) || "normal";
  const gapClass = GAP_CLASS[gap] || "gap-8";

  return (
    <NodeViewWrapper
      as="div"
      data-newsletter-two-column="true"
      data-gap={gap}
      className={cn(
        "newsletter-two-column group/nl-twocol relative my-6 transition-shadow duration-150",
        selected && "ring-2 ring-[#F5741A] ring-offset-2 ring-offset-white",
      )}
    >
      <div
        className={cn(
          "absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-1 shadow-md transition-opacity duration-150",
          selected ? "opacity-100" : "opacity-0 group-hover/nl-twocol:opacity-100",
        )}
      >
        {GAP_OPTIONS.map((opt) => {
          const active = gap === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateAttributes({ gap: opt.value })}
              className={cn(
                "rounded-full px-2 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-[#F5741A] text-white"
                  : "text-[var(--bw-slate-500)] hover:bg-[var(--bw-cream-200)]",
              )}
              aria-label={`Gap ${opt.label}`}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
        <span className="mx-1 h-4 w-px bg-[var(--border-2)]" aria-hidden />
        <button
          type="button"
          onClick={deleteNode}
          className="rounded-full p-1 text-[var(--fg-2)] hover:bg-red-50 hover:text-[var(--danger)]"
          aria-label="Delete two-column"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div
        className="absolute -left-7 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity duration-150 group-hover/nl-twocol:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
      </div>

      <NodeViewContent
        className={cn("newsletter-two-column__panes grid sm:grid-cols-2", gapClass)}
      />
    </NodeViewWrapper>
  );
}
