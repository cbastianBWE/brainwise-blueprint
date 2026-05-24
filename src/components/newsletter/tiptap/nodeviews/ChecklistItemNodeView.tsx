import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { cn } from "@/lib/utils";

/**
 * ChecklistItemNodeView — interactive checkbox + editable inline content.
 *
 * Click toggles `node.attrs.checked` via updateAttributes; the editable text
 * body is rendered through NodeViewContent so ProseMirror keeps managing the
 * `inline*` content (cursor, marks, IME). Strikethrough styling is applied
 * via a `--checked` modifier when toggled.
 */
export function ChecklistItemNodeView({
  node,
  updateAttributes,
}: NodeViewProps) {
  const checked = Boolean(node.attrs.checked);

  const toggle = () => updateAttributes({ checked: !checked });

  return (
    <NodeViewWrapper
      as="li"
      data-newsletter-checklist-item="true"
      data-checked={String(checked)}
      className="newsletter-checklist-item-view"
    >
      <button
        type="button"
        contentEditable={false}
        onMouseDown={(e) => {
          // Prevent the editor from stealing focus / shifting selection.
          e.preventDefault();
        }}
        onClick={toggle}
        aria-pressed={checked}
        aria-label={checked ? "Mark as not done" : "Mark as done"}
        className={cn(
          "newsletter-checklist-item-view__checkbox",
          checked && "newsletter-checklist-item-view__checkbox--checked",
        )}
      />
      <NodeViewContent
        as="div"
        className={cn(
          "newsletter-checklist-item-view__body",
          checked && "newsletter-checklist-item-view__body--checked",
        )}
      />
    </NodeViewWrapper>
  );
}
