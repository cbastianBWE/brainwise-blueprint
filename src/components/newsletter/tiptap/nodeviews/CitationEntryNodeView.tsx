import { useState } from "react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { Link2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSafeHttpUrl } from "@/lib/safeUrl";

export function CitationEntryNodeView({
  node,
  updateAttributes,
}: NodeViewProps) {
  const link = (node.attrs.link as string | null) ?? null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(link ?? "");

  const apply = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      updateAttributes({ link: null });
      setEditing(false);
      return;
    }
    if (isSafeHttpUrl(trimmed)) {
      updateAttributes({ link: trimmed });
      setEditing(false);
    }
  };

  return (
    <NodeViewWrapper
      as="li"
      data-newsletter-citation-entry="true"
      data-link={link ?? ""}
      className="group/nl-ce relative"
    >
      <div className="flex items-start gap-1">
        <span
          className="mt-1 cursor-grab opacity-0 transition-opacity group-hover/nl-ce:opacity-100"
          data-drag-handle
          contentEditable={false}
        >
          <GripVertical className="h-3 w-3 text-[var(--fg-4)]" />
        </span>
        <NodeViewContent
          as={"span" as any}
          data-newsletter-citation-entry-body="true"
          className="flex-1"
        />
        <button
          type="button"
          contentEditable={false}
          onMouseDown={(e) => {
            e.preventDefault();
            setDraft(link ?? "");
            setEditing((v) => !v);
          }}
          className={cn(
            "ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--fg-3)] transition-colors hover:bg-[var(--bw-cream-200)]",
            link && "text-[#F5741A]",
          )}
          aria-label="Edit citation link"
          aria-pressed={!!link}
        >
          <Link2 className="h-3 w-3" />
        </button>
      </div>
      {editing && (
        <div
          className="mt-1 flex items-center gap-1 rounded-md bg-white p-1.5 pl-7"
          contentEditable={false}
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
              }
            }}
            placeholder="https://..."
            autoFocus
            className="h-6 flex-1 rounded border-0 bg-[var(--bw-cream-200)] px-2 text-xs text-[var(--fg-1)] focus:outline-none focus:ring-1 focus:ring-[#F5741A]"
          />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              apply();
            }}
            className="rounded bg-[#F5741A] px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-[#E06714]"
          >
            Apply
          </button>
          {link && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                updateAttributes({ link: null });
                setEditing(false);
              }}
              className="rounded px-2 py-0.5 text-[11px] font-medium text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
}
