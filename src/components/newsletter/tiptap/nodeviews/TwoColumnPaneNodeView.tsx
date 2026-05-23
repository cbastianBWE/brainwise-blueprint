import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { cn } from "@/lib/utils";

export function TwoColumnPaneNodeView({ node }: NodeViewProps) {
  // Treat as empty if the pane contains only one empty paragraph.
  const isEmpty =
    node.content.size === 0 ||
    (node.childCount === 1 &&
      node.firstChild?.type.name === "paragraph" &&
      node.firstChild.content.size === 0);

  return (
    <NodeViewWrapper
      as="div"
      data-newsletter-two-column-pane="true"
      className={cn(
        "newsletter-two-column__pane group/nl-pane relative min-h-[80px] rounded-md border border-transparent p-3 transition-colors duration-150",
        "focus-within:border-[var(--border-2)] focus-within:bg-white",
        isEmpty && "bg-[var(--bw-cream-300)]",
      )}
    >
      {isEmpty && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center italic text-[var(--fg-4)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Type / for blocks
        </div>
      )}
      <NodeViewContent className="relative" />
    </NodeViewWrapper>
  );
}
