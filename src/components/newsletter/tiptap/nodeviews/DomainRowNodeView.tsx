import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const TAG_VARIANTS = [
  { value: "", label: "(no tag)" },
  { value: "threat", label: "Threat" },
  { value: "reward", label: "Reward" },
  { value: "neutral", label: "Neutral" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
];

export function DomainRowNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const [number, setNumber] = useState<string>(node.attrs.number ?? "");
  const [label, setLabel] = useState<string>(node.attrs.label ?? "");
  const [tagText, setTagText] = useState<string>(node.attrs.tag_text ?? "");
  const [description, setDescription] = useState<string>(
    node.attrs.description ?? "",
  );
  const [countValue, setCountValue] = useState<string>(
    node.attrs.count_value ?? "",
  );
  const [countLabel, setCountLabel] = useState<string>(
    node.attrs.count_label ?? "",
  );
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateAttributes({
        number,
        label,
        tag_text: tagText.trim() ? tagText : null,
        description,
        count_value: countValue,
        count_label: countLabel,
      });
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number, label, tagText, description, countValue, countLabel]);

  const tagVariant = (node.attrs.tag_variant as string | null) ?? "";
  const setTagVariant = (v: string) =>
    updateAttributes({ tag_variant: v || null });

  const previewVariant = tagVariant || "neutral";
  const showTagPreview = Boolean(tagText.trim()) || Boolean(tagVariant);

  return (
    <NodeViewWrapper
      as="div"
      data-newsletter-domain-row="true"
      className={cn(
        "group/nl-dr relative my-2 rounded-md p-3 transition-shadow",
        selected && "ring-2 ring-[#F5741A] ring-offset-2 ring-offset-white",
      )}
    >
      <button
        type="button"
        onClick={deleteNode}
        className={cn(
          "absolute right-2 top-2 z-20 rounded-full bg-white/95 p-1.5 text-[var(--fg-2)] shadow-md transition-opacity hover:bg-red-50 hover:text-[var(--danger)]",
          selected ? "opacity-100" : "opacity-0 group-hover/nl-dr:opacity-100",
        )}
        aria-label="Delete domain row"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <div
        className="absolute -left-7 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity group-hover/nl-dr:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
      </div>

      <div
        className="grid items-start gap-3"
        style={{ gridTemplateColumns: "48px 1fr auto" }}
      >
        {/* Col 1: number */}
        <input
          type="text"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="01"
          className="h-7 w-12 rounded-md border border-transparent bg-transparent px-1 text-sm focus:border-[#F5741A] focus:outline-none"
          style={{ fontFamily: "var(--bw-mono-font)" }}
        />

        {/* Col 2: main */}
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Domain label"
              className="h-7 flex-1 min-w-[120px] rounded-md border border-transparent bg-transparent px-2 text-sm font-semibold focus:border-[#F5741A] focus:outline-none"
              style={{ fontFamily: "var(--font-display)" }}
            />
            <input
              type="text"
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              placeholder="Tag"
              className="h-7 w-20 rounded-md border border-transparent bg-transparent px-2 text-xs uppercase tracking-wider focus:border-[#F5741A] focus:outline-none"
              style={{ fontFamily: "var(--bw-mono-font)" }}
            />
            <select
              value={tagVariant}
              onChange={(e) => setTagVariant(e.target.value)}
              className="h-7 rounded-md border border-[var(--border-1)] bg-transparent px-1 text-xs focus:border-[#F5741A] focus:outline-none"
              aria-label="Tag variant"
            >
              {TAG_VARIANTS.map((v) => (
                <option key={v.value || "none"} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
            {showTagPreview && tagText.trim() && (
              <span
                className={`newsletter-domain-row__tag newsletter-domain-row__tag--${previewVariant}`}
              >
                {tagText}
              </span>
            )}
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            className="h-7 w-full rounded-md border border-transparent bg-transparent px-2 text-sm focus:border-[#F5741A] focus:outline-none"
          />
        </div>

        {/* Col 3: count */}
        <div className="flex flex-col items-end" style={{ minWidth: 96 }}>
          <input
            type="text"
            value={countValue}
            onChange={(e) => setCountValue(e.target.value)}
            placeholder="42"
            className="h-8 w-24 rounded-md border border-transparent bg-transparent px-2 text-right text-2xl font-bold focus:border-[#F5741A] focus:outline-none"
            style={{ fontFamily: "var(--font-display)", color: "var(--bw-navy)" }}
          />
          <input
            type="text"
            value={countLabel}
            onChange={(e) => setCountLabel(e.target.value)}
            placeholder="units"
            className="h-6 w-24 rounded-md border border-transparent bg-transparent px-2 text-right text-[10px] uppercase tracking-wider focus:border-[#F5741A] focus:outline-none"
            style={{ fontFamily: "var(--bw-mono-font)", color: "var(--bw-slate-500)" }}
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
