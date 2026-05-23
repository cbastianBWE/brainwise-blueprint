import { useState } from "react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function KeyMomentsNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const title: string | null = node.attrs.title ?? null;
  const [draft, setDraft] = useState<string>(title ?? "");
  const [focused, setFocused] = useState(false);

  const appendMoment = () => {
    if (typeof getPos !== "function") return;
    const pos = getPos();
    if (typeof pos !== "number") return;
    const endPos = pos + node.nodeSize - 1;
    editor
      .chain()
      .focus()
      .insertContentAt(endPos, {
        type: "newsletterKeyMoment",
        attrs: { title: "" },
        content: [{ type: "paragraph" }],
      })
      .run();
  };

  return (
    <NodeViewWrapper
      as="section"
      data-newsletter-key-moments="true"
      className={cn(
        "newsletter-key-moments group/nl-km relative my-8 rounded-lg bg-[var(--bw-cream-200)] p-8 transition-shadow duration-150",
        selected && "ring-2 ring-[#F5741A]",
      )}
    >
      <button
        type="button"
        onClick={deleteNode}
        className={cn(
          "absolute right-3 top-3 z-20 rounded-full bg-white/95 p-1.5 text-[var(--fg-2)] shadow-md transition-opacity duration-150 hover:bg-red-50 hover:text-[var(--danger)]",
          selected ? "opacity-100" : "opacity-0 group-hover/nl-km:opacity-100",
        )}
        aria-label="Delete key moments"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <div
        className="absolute -left-7 top-6 cursor-grab opacity-0 transition-opacity duration-150 group-hover/nl-km:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
      </div>

      {title || focused ? (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            updateAttributes({ title: draft.trim() ? draft : null });
          }}
          placeholder="Add section title (optional)"
          className="newsletter-key-moments__title mb-4 w-full border-0 bg-transparent p-0 focus:outline-none focus:ring-0"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 20,
            color: "var(--bw-navy)",
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setFocused(true)}
          className="mb-4 block text-sm italic text-[var(--fg-4)] opacity-0 transition-opacity hover:text-[var(--fg-2)] group-hover/nl-km:opacity-100"
        >
          + Add section title
        </button>
      )}

      <NodeViewContent
        className="newsletter-key-moments__list relative space-y-4 pl-6"
      />


      <div className="mt-4">
        <button
          type="button"
          onClick={appendMoment}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--border-2)] bg-white/60 px-3 py-1.5 text-xs font-medium text-[var(--fg-2)] transition-colors hover:border-[#F5741A] hover:bg-white hover:text-[#F5741A]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add moment
        </button>
      </div>
    </NodeViewWrapper>
  );
}
