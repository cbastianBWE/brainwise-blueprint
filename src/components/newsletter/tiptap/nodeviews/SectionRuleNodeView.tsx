import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NewsletterSectionRuleStyle } from "../types";

const STYLES: { value: NewsletterSectionRuleStyle; label: string }[] = [
  { value: "numbered", label: "Numbered" },
  { value: "plain", label: "Plain" },
  { value: "titled", label: "Titled" },
  { value: "dot", label: "Dot" },
];

export function SectionRuleNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const style = (node.attrs.style as NewsletterSectionRuleStyle) ?? "plain";
  const [number, setNumber] = useState<string>(node.attrs.number ?? "");
  const [title, setTitle] = useState<string>(node.attrs.title ?? "");
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateAttributes({
        number,
        title: title.trim() ? title : null,
      });
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number, title]);

  const setStyle = (s: NewsletterSectionRuleStyle) => updateAttributes({ style: s });

  return (
    <NodeViewWrapper
      as="div"
      data-newsletter-section-rule="true"
      data-style={style}
      className={cn(
        "group/nl-sr relative my-6 rounded-md p-3 transition-shadow",
        selected && "ring-2 ring-[#F5741A] ring-offset-2 ring-offset-white",
      )}
    >
      <button
        type="button"
        onClick={deleteNode}
        className={cn(
          "absolute right-2 top-2 z-20 rounded-full bg-white/95 p-1.5 text-[var(--fg-2)] shadow-md transition-opacity hover:bg-red-50 hover:text-[var(--danger)]",
          selected ? "opacity-100" : "opacity-0 group-hover/nl-sr:opacity-100",
        )}
        aria-label="Delete section rule"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <div
        className="absolute -left-7 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity group-hover/nl-sr:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1">
        {STYLES.map((s) => (
          <button
            key={s.value}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setStyle(s.value);
            }}
            className={cn(
              "rounded-full px-3 py-0.5 text-[11px] font-medium transition-colors",
              style === s.value
                ? "bg-[#F5741A]/15 text-[#F5741A]"
                : "text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {style === "numbered" && (
        <input
          type="text"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="01"
          className="mb-3 block w-32 rounded-md border border-[var(--border-1)] bg-white px-2 py-1 text-xs focus:border-[#F5741A] focus:outline-none"
        />
      )}
      {style === "titled" && (
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Section title"
          className="mb-3 block w-full max-w-md rounded-md border border-[var(--border-1)] bg-white px-2 py-1 text-xs focus:border-[#F5741A] focus:outline-none"
        />
      )}

      {/* Preview */}
      <div
        className={`newsletter-section-rule newsletter-section-rule--${style}`}
        style={{ margin: 0 }}
      >
        {style === "numbered" && (
          <>
            <hr className="newsletter-section-rule__rule" />
            <span className="newsletter-section-rule__number">
              [ {number || "00"} ]
            </span>
            <hr className="newsletter-section-rule__rule" />
          </>
        )}
        {style === "titled" && (
          <>
            <span className="newsletter-section-rule__title">
              {title || "Section title"}
            </span>
            <hr className="newsletter-section-rule__rule" />
          </>
        )}
        {style === "plain" && <hr className="newsletter-section-rule__rule" />}
        {style === "dot" && (
          <>
            <span className="newsletter-section-rule__dot">·</span>
            <span className="newsletter-section-rule__dot">·</span>
            <span className="newsletter-section-rule__dot">·</span>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}
