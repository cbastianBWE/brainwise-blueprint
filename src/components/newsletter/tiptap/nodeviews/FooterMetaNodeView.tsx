import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2, GripVertical, X, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_TAG_LEN = 32;

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().slice(0, MAX_TAG_LEN);
}

export function FooterMetaNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const tags: string[] = (node.attrs.tags as string[]) ?? [];
  const initialIssue = (node.attrs.issue_label as string | null) ?? "";
  const initialPublished = (node.attrs.published_label as string | null) ?? "";

  const [issue, setIssue] = useState(initialIssue);
  const [published, setPublished] = useState(initialPublished);
  const [draft, setDraft] = useState("");

  const issueRef = useRef(issue);
  const publishedRef = useRef(published);
  issueRef.current = issue;
  publishedRef.current = published;

  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setIssue((node.attrs.issue_label as string | null) ?? "");
    setPublished((node.attrs.published_label as string | null) ?? "");
  }, [node.attrs.issue_label, node.attrs.published_label]);

  const commit = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateAttributes({
        issue_label: issueRef.current.trim() ? issueRef.current : null,
        published_label: publishedRef.current.trim()
          ? publishedRef.current
          : null,
      });
      debounceRef.current = null;
    }, 300);
  };

  const flush = () => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    updateAttributes({
      issue_label: issueRef.current.trim() ? issueRef.current : null,
      published_label: publishedRef.current.trim()
        ? publishedRef.current
        : null,
    });
  };

  useEffect(
    () => () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    },
    [],
  );

  const commitTag = () => {
    const t = normalizeTag(draft);
    if (!t) {
      setDraft("");
      return;
    }
    if (tags.includes(t)) {
      setDraft("");
      return;
    }
    updateAttributes({ tags: [...tags, t] });
    setDraft("");
  };

  const removeTag = (idx: number) => {
    updateAttributes({ tags: tags.filter((_, i) => i !== idx) });
  };

  return (
    <NodeViewWrapper
      as="div"
      data-newsletter-footer-meta="true"
      className={cn(
        "newsletter-footer-meta-editor group/nl-fm relative my-6 rounded-md border border-slate-200 bg-white p-3",
        selected && "ring-2 ring-[#F5741A]/40",
      )}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={deleteNode}
        className={cn(
          "absolute right-2 top-2 z-20 rounded-full bg-white/95 p-1.5 text-[var(--fg-2)] shadow-md transition-opacity hover:bg-red-50 hover:text-[var(--danger)]",
          selected ? "opacity-100" : "opacity-0 group-hover/nl-fm:opacity-100",
        )}
        aria-label="Delete footer meta"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <div
        className="absolute -left-7 top-3 cursor-grab opacity-0 transition-opacity group-hover/nl-fm:opacity-100"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4 text-[var(--fg-4)]" />
      </div>

      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-4)]">
        <Tags className="h-3 w-3" />
        Footer meta
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {tags.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--bw-cream-200)] px-2 py-0.5 text-[11px] font-medium text-[var(--fg-1)]"
          >
            {t}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="text-[var(--fg-3)] hover:text-[var(--danger)]"
              aria-label={`Remove ${t}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commitTag();
            } else if (
              e.key === "Backspace" &&
              draft === "" &&
              tags.length > 0
            ) {
              e.preventDefault();
              removeTag(tags.length - 1);
            }
          }}
          onBlur={() => {
            if (draft.trim()) commitTag();
          }}
          placeholder={tags.length === 0 ? "Add tag, press Enter" : "Add tag"}
          className="h-6 min-w-[110px] flex-1 rounded border-0 bg-transparent px-1 text-[11px] text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-1 focus:ring-[#F5741A]"
        />
      </div>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <input
          type="text"
          value={issue}
          onChange={(e) => {
            setIssue(e.target.value);
            commit();
          }}
          onBlur={flush}
          placeholder="Issue label (e.g. Issue 12 · Spring 2026)"
          className="h-7 rounded border border-transparent bg-transparent px-2 text-xs uppercase tracking-wider text-[var(--fg-2)] placeholder:text-[var(--fg-4)] focus:border-[#F5741A] focus:outline-none"
          style={{ fontFamily: "var(--bw-mono-font)" }}
        />
        <input
          type="text"
          value={published}
          onChange={(e) => {
            setPublished(e.target.value);
            commit();
          }}
          onBlur={flush}
          placeholder="Published label (e.g. May 24, 2026)"
          className="h-7 rounded border border-transparent bg-transparent px-2 text-xs uppercase tracking-wider text-[var(--fg-2)] placeholder:text-[var(--fg-4)] focus:border-[#F5741A] focus:outline-none"
          style={{ fontFamily: "var(--bw-mono-font)" }}
        />
      </div>
    </NodeViewWrapper>
  );
}
