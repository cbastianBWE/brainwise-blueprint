import { useEffect, useRef, useState } from "react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";

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

export function CodeBlockNodeView({ node, updateAttributes }: NodeViewProps) {
  const [filename, setFilename] = useState<string>(node.attrs.filename ?? "");
  const [language, setLanguage] = useState<string>(node.attrs.language ?? "");
  const [highlightLines, setHighlightLines] = useState<string>(
    node.attrs.highlight_lines ?? "",
  );
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateAttributes({
        filename: filename.trim() ? filename : null,
        language: language ? language : null,
        highlight_lines: highlightLines.trim() ? highlightLines : null,
      });
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filename, language, highlightLines]);

  return (
    <NodeViewWrapper
      as="div"
      className="newsletter-code-block my-4 overflow-hidden rounded-md border border-slate-200"
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
        <input
          type="text"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder="filename.ext"
          className="flex-1 border-none bg-transparent font-mono text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0"
          aria-label="Code filename"
        />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="border-none bg-transparent text-xs text-slate-700 outline-none focus:ring-0"
          aria-label="Code language"
        >
          {LANGUAGES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <input
        type="text"
        value={highlightLines}
        onChange={(e) => setHighlightLines(e.target.value)}
        placeholder="Highlight lines, e.g. 1,3-5"
        className="w-full border-b border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0"
        aria-label="Highlight lines"
      />
      <pre className="m-0 block bg-white px-3 py-3 font-mono text-sm text-slate-800 whitespace-pre-wrap">
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}
