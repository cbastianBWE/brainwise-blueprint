import { useState } from "react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { Trash2, GripVertical, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PullquoteNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const attribution: string | null = node.attrs.attribution ?? null;
  const [draft, setDraft] = useState<string>(attribution ?? "");
  const [focused, setFocused] = useState(false);

  return (
    <NodeViewWrapper
      as="blockquote"
      data-newsletter-pullquote="true"
      className={cn(
        "newsletter-pullquote group/nl-pq relative my-8 transition-shadow duration-150",
        selected && "ring-2 ring-[#F5741A] ring-offset-2 ring-offset-white",
      )}
    >
      <div
        className={cn(
          "absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full bg-white/95 px-1 py-1 shadow-md transition-opacity duration-150",
          selected ? "opacity-100" : "opacity-0 group-hover/nl-pq:opacity-100",
        )}
      >
        {([
          { value: "left", Icon: AlignLeft, label: "Align left" },
          { value: "center", Icon: AlignCenter, label: "Align center" },
          { value: "right", Icon: AlignRight, label: "Align right" },
        ] as const).map(({ value: av, Icon, label }) => {
          const active = (node.attrs.alignment ?? "center") === av;
          return (
            <button
              key={av}
              type="button"
              onClick={() => updateAttributes({ alignment: av })}
              aria-label={label}
              title={label}
              className={cn(
                "rounded-full p-1 transition-colors",
                active
                  ? "bg-[#F5741A] text-white"
                  : "text-[var(--bw-slate-500)] hover:bg-[var(--bw-cream-200)]",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          );
        })}
        <div className="mx-1 h-4 w-px bg-[var(--border-1)]" />
        <button
          type="button"
          onClick={deleteNode}
          className="rounded-full p-1 text-[var(--fg-2)] transition-colors hover:bg-red-50 hover:text-[var(--danger)]"
          aria-label="Delete pullquote"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div
        className="absolute -left-7 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity duration-150 group-hover/nl-pq:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
      </div>

      <NodeViewContent
        className="newsletter-pullquote__text"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 28,
          lineHeight: 1.35,
          color: "var(--bw-navy)",
        }}
      />


      {attribution || focused ? (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            updateAttributes({
              attribution: draft.trim() ? draft : null,
            });
          }}
          placeholder="Add attribution (optional)"
          className="newsletter-pullquote__attribution mt-3 w-full border-0 bg-transparent text-sm italic focus:outline-none focus:ring-0"
          style={{ color: "var(--bw-slate-700)" }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setFocused(true)}
          className="mt-3 text-xs italic text-[var(--fg-4)] opacity-0 transition-opacity hover:text-[var(--fg-2)] group-hover/nl-pq:opacity-100"
        >
          + Add attribution
        </button>
      )}
    </NodeViewWrapper>
  );
}
