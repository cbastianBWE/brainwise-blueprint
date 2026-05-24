import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChartType } from "../types";

const CHART_TYPE_OPTIONS: Array<{ value: ChartType; label: string }> = [
  { value: "line", label: "Line chart" },
  { value: "bar", label: "Bar chart" },
  { value: "pie", label: "Pie chart" },
  { value: "donut", label: "Donut chart" },
  { value: "area", label: "Area chart" },
  { value: "image", label: "Image fallback" },
];

export function ChartNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const chartType = (node.attrs.chart_type as ChartType) ?? "line";
  const [dataJson, setDataJson] = useState<string>(node.attrs.data_json ?? "");
  const [caption, setCaption] = useState<string>(node.attrs.caption ?? "");
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateAttributes({
        data_json: dataJson,
        caption: caption.trim() ? caption : null,
      });
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataJson, caption]);

  return (
    <NodeViewWrapper
      as="div"
      className={cn(
        "newsletter-chart-editor group/nl-chart relative my-4 rounded-md border p-3 transition-colors",
        selected
          ? "border-[#F5741A] ring-2 ring-[#F5741A]/30"
          : "border-slate-200 hover:border-slate-300",
      )}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <select
          value={chartType}
          onChange={(e) =>
            updateAttributes({ chart_type: e.target.value as ChartType })
          }
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-[#F5741A]"
          aria-label="Chart type"
        >
          {CHART_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={deleteNode}
          className={cn(
            "rounded-full bg-white/95 p-1.5 text-slate-600 shadow-sm transition-opacity duration-150 hover:bg-red-50 hover:text-red-600",
            selected ? "opacity-100" : "opacity-0 group-hover/nl-chart:opacity-100",
          )}
          aria-label="Delete chart"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <textarea
        value={dataJson}
        onChange={(e) => setDataJson(e.target.value)}
        rows={8}
        placeholder={'{ "labels": ["Q1", "Q2"], "datasets": [...] }'}
        className="w-full resize-y rounded-md border border-slate-200 bg-white p-2 font-mono text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#F5741A] focus:ring-1 focus:ring-[#F5741A]/30"
        aria-label="Chart config JSON"
      />

      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Optional caption"
        className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm italic text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#F5741A] focus:ring-1 focus:ring-[#F5741A]/30"
        aria-label="Caption"
      />

      <div className="mt-2 rounded bg-slate-50 px-2 py-1.5 text-center text-[11px] italic text-slate-500">
        Chart type: {chartType.toUpperCase()} — preview in phase 2
      </div>
    </NodeViewWrapper>
  );
}
