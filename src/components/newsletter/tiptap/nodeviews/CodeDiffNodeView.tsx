import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LANGUAGES: Array<{ value: string; label: string }> = [
  { value: "", label: "(no language)" },
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "json", label: "JSON" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "bash", label: "Bash" },
  { value: "sql", label: "SQL" },
  { value: "yaml", label: "YAML" },
  { value: "markdown", label: "Markdown" },
];

export function CodeDiffNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const [before, setBefore] = useState<string>(node.attrs.before_text ?? "");
  const [after, setAfter] = useState<string>(node.attrs.after_text ?? "");
  const [language, setLanguage] = useState<string>(node.attrs.language ?? "");
  const [filename, setFilename] = useState<string>(node.attrs.filename ?? "");
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateAttributes({
        before_text: before,
        after_text: after,
        language: language ? language : null,
        filename: filename.trim() ? filename : null,
      });
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [before, after, language, filename]);

  return (
    <NodeViewWrapper
      as="div"
      className={cn(
        "newsletter-code-diff-editor group/nl-diff relative my-4 overflow-hidden rounded-md border transition-colors",
        selected
          ? "border-[#F5741A] ring-2 ring-[#F5741A]/30"
          : "border-slate-200 hover:border-slate-300",
      )}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={deleteNode}
        className={cn(
          "absolute right-2 top-2 z-20 rounded-full bg-white/95 p-1.5 text-slate-600 shadow-md transition-opacity duration-150 hover:bg-red-50 hover:text-red-600",
          selected ? "opacity-100" : "opacity-0 group-hover/nl-diff:opacity-100",
        )}
        aria-label="Delete code diff"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
        <input
          type="text"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder="filename.ext"
          className="flex-1 border-none bg-transparent font-mono text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0"
          aria-label="Filename"
        />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="border-none bg-transparent text-xs text-slate-700 outline-none focus:ring-0"
          aria-label="Language"
        >
          {LANGUAGES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2">
        <div className="border-b border-slate-200 bg-red-50/50 p-2 sm:border-b-0 sm:border-r">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-700">
            Before
          </div>
          <textarea
            value={before}
            onChange={(e) => setBefore(e.target.value)}
            rows={6}
            placeholder="// before"
            className="w-full resize-y border-none bg-transparent p-0 font-mono text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0"
            aria-label="Before text"
          />
        </div>
        <div className="bg-green-50/50 p-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-green-700">
            After
          </div>
          <textarea
            value={after}
            onChange={(e) => setAfter(e.target.value)}
            rows={6}
            placeholder="// after"
            className="w-full resize-y border-none bg-transparent p-0 font-mono text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0"
            aria-label="After text"
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
