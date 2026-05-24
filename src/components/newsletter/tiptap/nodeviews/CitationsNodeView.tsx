import { useEffect, useRef, useState } from "react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { Trash2, GripVertical, BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CitationsStyle } from "../nodes/Citations";

const STYLES: { value: CitationsStyle; label: string }[] = [
  { value: "numbered", label: "Numbered" },
  { value: "bracketed", label: "Bracketed" },
];

export function CitationsNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const style = (node.attrs.style as CitationsStyle) ?? "numbered";
  const initialTitle = (node.attrs.title as string | null) ?? "";
  const [title, setTitle] = useState(initialTitle);
  const titleRef = useRef(initialTitle);
  titleRef.current = title;
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setTitle((node.attrs.title as string | null) ?? "");
  }, [node.attrs.title]);

  const commitTitle = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateAttributes({
        title: titleRef.current.trim() ? titleRef.current : null,
      });
      debounceRef.current = null;
    }, 300);
  };

  useEffect(
    () => () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    },
    [],
  );

  return (
    <NodeViewWrapper
      as="section"
      data-newsletter-citations="true"
      data-style={style}
      className={cn(
        "newsletter-citations-editor group/nl-cit relative my-6 rounded-md border border-slate-200 bg-[var(--bw-cream-200)] p-4",
        selected && "ring-2 ring-[#F5741A]/40",
      )}
    >
      <button
        type="button"
        onClick={deleteNode}
        className={cn(
          "absolute right-2 top-2 z-20 rounded-full bg-white/95 p-1.5 text-[var(--fg-2)] shadow-md transition-opacity hover:bg-red-50 hover:text-[var(--danger)]",
          selected ? "opacity-100" : "opacity-0 group-hover/nl-cit:opacity-100",
        )}
        aria-label="Delete citations"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <div
        className="absolute -left-7 top-4 cursor-grab opacity-0 transition-opacity group-hover/nl-cit:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
      </div>

      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-4)]">
        <BookMarked className="h-3 w-3" />
        Citations
        <div className="ml-2 flex items-center gap-1">
          {STYLES.map((opt) => {
            const active = style === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  updateAttributes({ style: opt.value });
                }}
                aria-pressed={active}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                  active
                    ? "bg-white text-[#F5741A] ring-1 ring-inset ring-white outline-1 outline outline-[#F5741A]"
                    : "text-[var(--fg-2)] hover:bg-white/60",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          commitTitle();
        }}
        onBlur={() => {
          if (debounceRef.current) {
            window.clearTimeout(debounceRef.current);
            debounceRef.current = null;
          }
          updateAttributes({
            title: titleRef.current.trim() ? titleRef.current : null,
          });
        }}
        placeholder="Citations title (optional, e.g. 'References')"
        className="mb-3 w-full rounded border-0 bg-transparent px-1 text-xs uppercase tracking-wider text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-1 focus:ring-[#F5741A]"
        style={{ fontFamily: "var(--bw-mono-font)" }}
      />

      <NodeViewContent
        as={"ol" as any}
        data-newsletter-citations-list="true"
        className="m-0 list-none p-0"
      />
    </NodeViewWrapper>
  );
}
