import { useRef } from "react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Disclosure NodeView.
 *
 * Native <details> click-collapse is suppressed in the editor (clicks inside
 * the <summary> editable area are preventDefault'd at the toggle event) so
 * authoring the summary text doesn't collapse the body the author is working
 * on. The "Toggle preview" affordance in the controls bar drives both the
 * `default_open` attr AND the live `open` HTML attribute (via React render),
 * giving authors an intentional way to preview state.
 *
 * In the reader path no NodeView mounts, so native click-toggle works.
 */
export function DisclosureNodeView({ node, updateAttributes }: NodeViewProps) {
  const open = !!node.attrs.default_open;
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  // Suppress the browser's native <summary> click-toggle inside the editor.
  // The `toggle` event fires AFTER state has changed, so the canonical way
  // to keep it from changing is to preventDefault on the click that targets
  // the summary element itself.
  const handleSummaryClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const summary = (e.target as HTMLElement).closest("summary");
    if (summary) e.preventDefault();
  };

  return (
    <NodeViewWrapper
      ref={detailsRef as unknown as React.Ref<HTMLDetailsElement>}
      as="details"
      data-newsletter-disclosure="true"
      data-default-open={open ? "true" : "false"}
      data-drag-handle
      open={open}
      className="newsletter-disclosure my-3"
      onClick={handleSummaryClick}
    >
      <div
        contentEditable={false}
        className="mb-1 flex items-center justify-between gap-2 rounded-md bg-[var(--bw-cream-200)]/70 px-2 py-1"
      >
        <span className="text-[10px] uppercase tracking-wider text-[var(--fg-3)]">
          Disclosure
        </span>
        <button
          type="button"
          onClick={(e) => {
            // Allowed: this control intentionally drives state.
            e.stopPropagation();
            updateAttributes({ default_open: !open });
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
            open
              ? "bg-[#F5741A]/15 text-[#F5741A]"
              : "text-[var(--fg-2)] hover:bg-white",
          )}
          title="Toggle default-open"
        >
          {open ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          {open ? "Open by default" : "Closed by default"}
        </button>
      </div>

      <NodeViewContent className="newsletter-disclosure-content" />
    </NodeViewWrapper>
  );
}
