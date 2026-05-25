import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { useFootnotesAggregator } from "@/components/newsletter/editor/useFootnotesAggregator";

export function FootnotesNodeView({ editor, selected }: NodeViewProps) {
  const refs = useFootnotesAggregator(editor);

  return (
    <NodeViewWrapper
      as="aside"
      data-drag-handle
      data-newsletter-footnotes="true"
      className={cn(
        "newsletter-footnotes my-6 rounded-md border bg-[var(--bw-cream)] p-4 transition-colors",
        selected ? "border-[#F5741A]" : "border-[var(--border-1)]",
      )}
    >
      <h4>Footnotes</h4>
      {refs.length === 0 ? (
        <p className="text-sm italic text-[var(--fg-3)]">
          No footnotes yet. Use the bubble menu on a text selection to add a
          footnote reference.
        </p>
      ) : (
        <ol data-newsletter-footnotes-list="true">
          {refs.map((ref, idx) => (
            <li
              key={`${ref.key}-${idx}`}
              data-newsletter-footnote-entry="true"
            >
              {ref.text || (
                <span className="italic text-[var(--fg-4)]">(empty)</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </NodeViewWrapper>
  );
}
