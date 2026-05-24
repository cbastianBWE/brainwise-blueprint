import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const GLYPHS = [
  { value: "", label: "(none)" },
  { value: "▲", label: "▲" },
  { value: "◆", label: "◆" },
  { value: "●", label: "●" },
  { value: "■", label: "■" },
  { value: "★", label: "★" },
  { value: "✦", label: "✦" },
  { value: "◊", label: "◊" },
  { value: "▼", label: "▼" },
];

export function MastheadNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const [publication, setPublication] = useState<string>(
    node.attrs.publication ?? "",
  );
  const [issue, setIssue] = useState<string>(node.attrs.issue_label ?? "");
  const [date, setDate] = useState<string>(node.attrs.date_label ?? "");
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateAttributes({
        publication,
        issue_label: issue.trim() ? issue : null,
        date_label: date.trim() ? date : null,
      });
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publication, issue, date]);

  const glyph = (node.attrs.logo_glyph as string | null) ?? "";

  return (
    <NodeViewWrapper
      as="header"
      data-newsletter-masthead="true"
      className={cn(
        "newsletter-masthead group/nl-mh relative my-6 transition-shadow",
        selected && "ring-2 ring-[#F5741A] ring-offset-2 ring-offset-white",
      )}
    >
      <button
        type="button"
        onClick={deleteNode}
        className={cn(
          "absolute right-2 top-2 z-20 rounded-full bg-white/95 p-1.5 text-[var(--fg-2)] shadow-md transition-opacity hover:bg-red-50 hover:text-[var(--danger)]",
          selected ? "opacity-100" : "opacity-0 group-hover/nl-mh:opacity-100",
        )}
        aria-label="Delete masthead"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <div
        className="absolute -left-7 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity group-hover/nl-mh:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={glyph}
          onChange={(e) =>
            updateAttributes({ logo_glyph: e.target.value || null })
          }
          className="h-7 rounded-md border border-[var(--border-1)] bg-transparent px-1 text-sm focus:border-[#F5741A] focus:outline-none"
          aria-label="Glyph"
        >
          {GLYPHS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={publication}
          onChange={(e) => setPublication(e.target.value)}
          placeholder="Publication name"
          className="h-7 flex-1 min-w-[160px] rounded-md border border-transparent bg-transparent px-2 text-xs uppercase tracking-wider focus:border-[#F5741A] focus:outline-none"
          style={{ fontFamily: "var(--bw-mono-font)" }}
        />
        <input
          type="text"
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          placeholder="Issue 47"
          className="h-7 w-28 rounded-md border border-transparent bg-transparent px-2 text-xs uppercase tracking-wider focus:border-[#F5741A] focus:outline-none"
          style={{ fontFamily: "var(--bw-mono-font)" }}
        />
        <input
          type="text"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          placeholder="May 24, 2026"
          className="h-7 w-36 rounded-md border border-transparent bg-transparent px-2 text-xs uppercase tracking-wider focus:border-[#F5741A] focus:outline-none"
          style={{ fontFamily: "var(--bw-mono-font)" }}
        />
      </div>
    </NodeViewWrapper>
  );
}
