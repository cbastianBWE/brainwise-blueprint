import { createContext, useContext, useRef, useState } from "react";
import { useReportHighlights, type ReportHighlight } from "@/hooks/useReportHighlights";
import { HIGHLIGHT_COLORS, highlightCss, blockTextSha } from "@/lib/reportHighlightColors";

interface HighlightCtx {
  enabled: boolean;
  byBlock: Record<string, ReportHighlight[]>;
  addHighlight: (a: { blockKey: string; start: number; end: number; sha: string; quoted: string; color: string }) => void;
  removeHighlight: (id: string) => void;
}
const Ctx = createContext<HighlightCtx | null>(null);

export function ReportHighlightProvider({ assessmentResultId, contextTab, enabled, children }:
  { assessmentResultId: string | undefined; contextTab: string; enabled: boolean; children: React.ReactNode }) {
  const hl = useReportHighlights(assessmentResultId, contextTab, enabled);
  return <Ctx.Provider value={hl}>{children}</Ctx.Provider>;
}

export function HighlightableText({ blockKey, text }: { blockKey: string; text: string }) {
  const ctx = useContext(Ctx);
  const ref = useRef<HTMLSpanElement>(null);
  const [pop, setPop] = useState<{ x: number; y: number; start: number; end: number } | null>(null);
  const [removePop, setRemovePop] = useState<{ id: string; x: number; y: number } | null>(null);

  if (!ctx || !ctx.enabled) return <>{text}</>;

  const sha = blockTextSha(text);
  const ranges = (ctx.byBlock[blockKey] ?? [])
    .map((h) => {
      if (h.block_text_sha === sha) return { ...h, s: h.start_offset, e: h.end_offset };
      const idx = text.indexOf(h.quoted_text);
      if (idx >= 0) return { ...h, s: idx, e: idx + h.quoted_text.length };
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => (a!.s - b!.s)) as (ReportHighlight & { s: number; e: number })[];

  const segs: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((h, i) => {
    if (h.s < cursor) return;
    if (h.s > cursor) segs.push(<span key={`t${i}`}>{text.slice(cursor, h.s)}</span>);
    segs.push(
      <mark key={`m${i}`} style={{ background: highlightCss(h.color), color: "inherit", padding: "0 1px", borderRadius: 2, cursor: "pointer" }}
        onClick={(ev) => { ev.stopPropagation(); const r = (ev.target as HTMLElement).getBoundingClientRect(); setPop(null); setRemovePop({ id: h.id, x: r.left + r.width / 2, y: r.top }); }}>
        {text.slice(h.s, h.e)}
      </mark>
    );
    cursor = h.e;
  });
  if (cursor < text.length) segs.push(<span key="tend">{text.slice(cursor)}</span>);

  const onMouseUp = () => {
    const el = ref.current; const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) return;
    const pre = document.createRange(); pre.selectNodeContents(el); pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length; const end = start + range.toString().length;
    if (end <= start) return;
    const rect = range.getBoundingClientRect();
    setRemovePop(null);
    setPop({ x: rect.left + rect.width / 2, y: rect.top, start, end });
  };

  return (
    <span ref={ref} onMouseUp={onMouseUp} style={{ position: "relative" }}>
      {segs.length ? segs : text}
      {pop && (
        <span style={{ position: "fixed", left: pop.x, top: pop.y - 42, transform: "translateX(-50%)", zIndex: 60, display: "flex", gap: 6, background: "var(--bw-white)", border: "1px solid var(--border-1)", borderRadius: 8, padding: "6px 8px", boxShadow: "var(--shadow-md)" }}>
          {HIGHLIGHT_COLORS.map((c) => (
            <button key={c.key} aria-label={`Highlight ${c.label}`} onMouseDown={(e) => e.preventDefault()}
              onClick={() => { ctx.addHighlight({ blockKey, start: pop.start, end: pop.end, sha, quoted: text.slice(pop.start, pop.end), color: c.key }); setPop(null); window.getSelection()?.removeAllRanges(); }}
              style={{ width: 18, height: 18, borderRadius: "50%", border: "1px solid var(--border-1)", background: c.css, cursor: "pointer", padding: 0 }} />
          ))}
        </span>
      )}
      {removePop && (
        <span style={{ position: "fixed", left: removePop.x, top: removePop.y - 42, transform: "translateX(-50%)", zIndex: 60, background: "var(--bw-white)", border: "1px solid var(--border-1)", borderRadius: 8, padding: "4px 8px", boxShadow: "var(--shadow-md)" }}>
          <button onClick={() => { ctx.removeHighlight(removePop.id); setRemovePop(null); }}
            style={{ fontSize: 12, color: "var(--fg-1)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>Remove</button>
        </span>
      )}
    </span>
  );
}
