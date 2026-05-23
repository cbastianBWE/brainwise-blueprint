import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function TwoColumnNodeView({
  deleteNode,
  selected,
}: NodeViewProps) {
  return (
    <NodeViewWrapper
      as="div"
      data-newsletter-two-column="true"
      className={cn(
        "newsletter-two-column group/nl-twocol relative my-6 transition-shadow duration-150",
        selected && "ring-2 ring-[#F5741A] ring-offset-2 ring-offset-white",
      )}
    >
      <button
        type="button"
        onClick={deleteNode}
        className={cn(
          "absolute right-2 top-2 z-20 rounded-full bg-white/95 p-1.5 text-[var(--fg-2)] shadow-md transition-opacity duration-150 hover:bg-red-50 hover:text-[var(--danger)]",
          selected ? "opacity-100" : "opacity-0 group-hover/nl-twocol:opacity-100",
        )}
        aria-label="Delete two-column"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <div
        className="absolute -left-7 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity duration-150 group-hover/nl-twocol:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
      </div>

      <NodeViewContent
        className="newsletter-two-column__panes grid gap-8 sm:grid-cols-2"
      />
    </NodeViewWrapper>
  );
}
