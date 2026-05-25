import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useFootnotesAggregator } from "@/components/newsletter/editor/useFootnotesAggregator";

export default function FootnotesReaderNodeView({ editor }: NodeViewProps) {
  const refs = useFootnotesAggregator(editor);

  if (refs.length === 0) return null;

  return (
    <NodeViewWrapper as="aside" data-newsletter-footnotes="true">
      <h4>Footnotes</h4>
      <ol data-newsletter-footnotes-list="true">
        {refs.map((ref, idx) => (
          <li
            key={`${ref.key}-${idx}`}
            data-newsletter-footnote-entry="true"
          >
            {ref.text}
          </li>
        ))}
      </ol>
    </NodeViewWrapper>
  );
}
