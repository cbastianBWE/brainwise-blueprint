import { useState } from "react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import {
  Info,
  AlertTriangle,
  MessageSquare,
  ListChecks,
  Star,
  Trash2,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalloutVariant } from "../types";

const VARIANTS: Array<{
  value: CalloutVariant;
  label: string;
  icon: typeof Info;
}> = [
  { value: "info", label: "Info", icon: Info },
  { value: "warning", label: "Warning", icon: AlertTriangle },
  { value: "quote", label: "Quote", icon: MessageSquare },
  { value: "tldr", label: "TL;DR", icon: ListChecks },
  { value: "key_takeaway", label: "Key", icon: Star },
];

export function CalloutNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const variant: CalloutVariant = (node.attrs.variant ?? "info") as CalloutVariant;
  const title: string | null = node.attrs.title ?? null;
  const [titleDraft, setTitleDraft] = useState<string>(title ?? "");
  const [titleFocused, setTitleFocused] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const Active = VARIANTS.find((v) => v.value === variant) ?? VARIANTS[0];
  const ActiveIcon = Active.icon;

  return (
    <NodeViewWrapper
      as="aside"
      data-newsletter-callout="true"
      data-variant={variant}
      className={cn(
        `newsletter-callout newsletter-callout--${variant} group/nl-callout relative my-6 transition-shadow duration-150`,
        selected && "ring-2 ring-[#F5741A] ring-offset-2 ring-offset-white",
      )}
    >
      {/* Hover affordances */}
      <div
        className={cn(
          "absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full bg-white/95 px-1 py-1 shadow-md transition-opacity duration-150",
          selected ? "opacity-100" : "opacity-0 group-hover/nl-callout:opacity-100",
        )}
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen((s) => !s)}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-[var(--fg-2)] transition-colors hover:bg-[var(--bw-cream-200)]"
          >
            <ActiveIcon className="h-3 w-3" />
            {Active.label}
          </button>
          {pickerOpen && (
            <div
              className="absolute right-0 top-full z-30 mt-1 flex flex-col rounded-lg border border-[var(--border-1)] bg-white p-1 shadow-lg animate-in fade-in zoom-in-95 duration-150"
              onMouseLeave={() => setPickerOpen(false)}
            >
              {VARIANTS.map((v) => {
                const I = v.icon;
                return (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => {
                      updateAttributes({ variant: v.value });
                      setPickerOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded px-3 py-1.5 text-left text-xs font-medium transition-colors",
                      variant === v.value
                        ? "bg-[#F5741A]/15 text-[#F5741A]"
                        : "text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]",
                    )}
                  >
                    <I className="h-3.5 w-3.5" />
                    {v.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={deleteNode}
          className="rounded-full p-1 text-[var(--fg-2)] transition-colors hover:bg-red-50 hover:text-[var(--danger)]"
          aria-label="Delete callout"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Left drag handle */}
      <div
        className="absolute -left-7 top-4 cursor-grab opacity-0 transition-opacity duration-150 group-hover/nl-callout:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
      </div>

      {/* Title */}
      {(title || titleFocused) ? (
        <input
          type="text"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onFocus={() => setTitleFocused(true)}
          onBlur={() => {
            setTitleFocused(false);
            updateAttributes({ title: titleDraft.trim() ? titleDraft : null });
          }}
          placeholder="Add title (optional)"
          className="newsletter-callout__title w-full border-0 bg-transparent p-0 focus:outline-none focus:ring-0"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setTitleFocused(true)}
          className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--fg-4)] opacity-0 transition-opacity hover:text-[var(--fg-2)] group-hover/nl-callout:opacity-100"
        >
          + Add title
        </button>
      )}

      <div className="newsletter-callout__body">
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
}
