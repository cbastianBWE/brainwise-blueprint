import { useState } from "react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function KeyMomentNodeView({
  node,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const [draft, setDraft] = useState<string>(node.attrs.title ?? "");

  return (
    <NodeViewWrapper
      as="li"
      data-newsletter-key-moment="true"
      className={cn(
        "newsletter-key-moment group/nl-moment relative rounded-md p-2 transition-colors duration-150",
        "focus-within:bg-white/60",
      )}
    >
      <div
        className="absolute -left-7 top-3 cursor-grab opacity-0 transition-opacity duration-150 group-hover/nl-moment:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-3.5 w-3.5 text-[var(--fg-4)]" />
      </div>
      <button
        type="button"
        onClick={deleteNode}
        className="absolute right-1 top-2 rounded-full p-1 text-[var(--fg-4)] opacity-0 transition-all duration-150 hover:bg-red-50 hover:text-[var(--danger)] group-hover/nl-moment:opacity-100"
        aria-label="Delete moment"
      >
        <Trash2 className="h-3 w-3" />
      </button>

      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => updateAttributes({ title: draft })}
        placeholder="Moment title"
        className="newsletter-key-moment__title mb-1 w-full border-0 bg-transparent p-0 focus:outline-none focus:ring-0"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 15,
          color: "var(--bw-navy)",
        }}
      />
      <NodeViewContent
        className="newsletter-key-moment__body text-sm leading-relaxed text-[var(--fg-2)]"
      />
    </NodeViewWrapper>
  );
}
