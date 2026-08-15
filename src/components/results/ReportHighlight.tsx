import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReportHighlights, type ReportHighlight } from "@/hooks/useReportHighlights";
import { usePairedReportHighlights, useTeamReportHighlights } from "@/hooks/useProfileReportHighlights";
import { HIGHLIGHT_COLORS, highlightCss, blockTextSha } from "@/lib/reportHighlightColors";

interface HighlightCtx {
  enabled: boolean;
  byBlock: Record<string, ReportHighlight[]>;
  addHighlight: (a: { blockKey: string; start: number; end: number; sha: string; quoted: string; color: string; note?: string | null }) => void;
  updateHighlightNote: (id: string, note: string | null) => void;
  removeHighlight: (id: string) => void;
  orphans: ReportHighlight[];
  reportBlockResolved: (blockKey: string, ids: string[]) => void;
}
const Ctx = createContext<HighlightCtx | null>(null);

export function ReportHighlightProvider({ assessmentResultId, contextTab, enabled, children }:
  { assessmentResultId: string | undefined; contextTab: string; enabled: boolean; children: React.ReactNode }) {
  const hl = useReportHighlights(assessmentResultId, contextTab, enabled);
  return <Ctx.Provider value={hl}><HighlightOrphanNotice />{children}</Ctx.Provider>;
}

export function PairedReportHighlightProvider({ pairedProfileId, enabled, children }:
  { pairedProfileId: string | undefined; enabled: boolean; children: React.ReactNode }) {
  const hl = usePairedReportHighlights(pairedProfileId, enabled);
  return <Ctx.Provider value={hl}><HighlightOrphanNotice />{children}</Ctx.Provider>;
}

export function TeamReportHighlightProvider({ teamProfileId, enabled, children }:
  { teamProfileId: string | undefined; enabled: boolean; children: React.ReactNode }) {
  const hl = useTeamReportHighlights(teamProfileId, enabled);
  return <Ctx.Provider value={hl}><HighlightOrphanNotice />{children}</Ctx.Provider>;
}


export function HighlightableText({ blockKey, text }: { blockKey: string; text: string }) {
  const ctx = useContext(Ctx);
  const ref = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  const editRef = useRef<HTMLSpanElement>(null);
  const [pop, setPop] = useState<{ x: number; y: number; start: number; end: number } | null>(null);
  const [createNote, setCreateNote] = useState("");
  const [editPop, setEditPop] = useState<{ id: string; x: number; y: number } | null>(null);
  const [editNote, setEditNote] = useState("");
  const selTimer = useRef<number | null>(null);
  const enabled = !!ctx && ctx.enabled;

  useEffect(() => {
    if (!pop && !editPop) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (t && popRef.current?.contains(t)) return;
      if (t && editRef.current?.contains(t)) return;
      setPop(null);
      setCreateNote("");
      setEditPop(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPop(null); setCreateNote(""); setEditPop(null); }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pop, editPop]);

  const detectSelection = useCallback(() => {
    const el = ref.current; const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) return;
    const pre = document.createRange(); pre.selectNodeContents(el); pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length; const end = start + range.toString().length;
    if (end <= start) return;
    const rect = range.getBoundingClientRect();
    const POP_H = 130;
    let top = rect.top - POP_H; if (top < 8) top = rect.bottom + 8;
    let x = rect.left + rect.width / 2;
    x = Math.min(Math.max(x, 120), window.innerWidth - 120);
    setEditPop(null);
    setCreateNote("");
    setPop({ x, y: top, start, end });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onUp = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (t && (popRef.current?.contains(t) || editRef.current?.contains(t))) return;
      detectSelection();
    };
    const onTouch = () => setTimeout(detectSelection, 80);
    // iOS: after lifting the finger the user drags the selection handles, and
    // no further touchend fires. selectionchange is the only reliable signal
    // that the range grew or shrank. Debounced because it fires continuously
    // while dragging.
    const onSelChange = () => {
      if (selTimer.current !== null) window.clearTimeout(selTimer.current);
      selTimer.current = window.setTimeout(detectSelection, 150);
    };
    // Only on coarse pointers. A fully expanded report mounts hundreds of
    // these, and desktop already has mouseup, so attaching selectionchange
    // everywhere would be pure cost.
    const isCoarse = typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(pointer: coarse)").matches;
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onTouch);
    if (isCoarse) document.addEventListener("selectionchange", onSelChange);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onTouch);
      if (isCoarse) document.removeEventListener("selectionchange", onSelChange);
      if (selTimer.current !== null) {
        window.clearTimeout(selTimer.current);
        selTimer.current = null;
      }
    };
  }, [detectSelection, enabled]);

  const blockRows = ctx?.byBlock[blockKey];
  const ranges = useMemo(() => {
    if (!enabled || !ctx) return [];
    const s = blockTextSha(text);
    return (blockRows ?? [])
      .map((h) => {
        if (h.block_text_sha === s) return { ...h, s: h.start_offset, e: h.end_offset };
        const idx = text.indexOf(h.quoted_text);
        if (idx >= 0) return { ...h, s: idx, e: idx + h.quoted_text.length };
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => (a!.s - b!.s)) as (ReportHighlight & { s: number; e: number })[];
  }, [enabled, blockRows, blockKey, text]);

  const report = ctx?.reportBlockResolved;
  const resolvedKey = ranges.map((h) => h.id).join(",");
  useEffect(() => {
    if (!enabled || !report) return;
    report(blockKey, resolvedKey ? resolvedKey.split(",") : []);
  }, [enabled, report, blockKey, resolvedKey]);

  if (!enabled) return <>{text}</>;

  const sha = blockTextSha(text);


  const segs: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((h, i) => {
    if (h.s < cursor) return;
    if (h.s > cursor) segs.push(<span key={`t${i}`}>{text.slice(cursor, h.s)}</span>);
    const hasNote = !!(h.note && h.note.trim());
    segs.push(
      <mark key={`m${i}`} title={hasNote ? h.note! : undefined}
        style={{ background: highlightCss(h.color), color: "inherit", padding: "0 1px", borderRadius: 2, cursor: "pointer", borderBottom: hasNote ? "2px dotted currentColor" : undefined }}
        onClick={(ev) => { ev.stopPropagation(); const r = (ev.target as HTMLElement).getBoundingClientRect(); setPop(null); setEditNote(h.note ?? ""); let etop = r.top - 140; if (etop < 8) etop = r.bottom + 8; let ex = r.left + r.width / 2; ex = Math.min(Math.max(ex, 120), window.innerWidth - 120); setEditPop({ id: h.id, x: ex, y: etop }); }}>
        {text.slice(h.s, h.e)}
      </mark>
    );
    cursor = h.e;
  });
  if (cursor < text.length) segs.push(<span key="tend">{text.slice(cursor)}</span>);


  const popStyle: React.CSSProperties = { position: "fixed", transform: "translateX(-50%)", zIndex: 100, background: "var(--bw-white)", border: "1px solid var(--border-1)", borderRadius: 8, padding: "8px", boxShadow: "var(--shadow-md)" };
  const taStyle: React.CSSProperties = { width: 200, minHeight: 48, resize: "vertical", fontSize: 12, fontFamily: "inherit", color: "var(--fg-1)", border: "1px solid var(--border-1)", borderRadius: 6, padding: "4px 6px", boxSizing: "border-box" };

  return (
    <span ref={ref} style={{ position: "relative" }}>
      {segs.length ? segs : text}
      {pop && createPortal(
        <span ref={popRef} style={{ ...popStyle, left: pop.x, top: pop.y, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ display: "flex", gap: 6, justifyContent: "center" }}>
            {HIGHLIGHT_COLORS.map((c) => (
              <button key={c.key} aria-label={`Highlight ${c.label}`} onMouseDown={(e) => e.preventDefault()}
                onClick={() => { ctx.addHighlight({ blockKey, start: pop.start, end: pop.end, sha, quoted: text.slice(pop.start, pop.end), color: c.key, note: createNote.trim() || null }); setPop(null); setCreateNote(""); window.getSelection()?.removeAllRanges(); }}
                style={{ width: 18, height: 18, borderRadius: "50%", border: "1px solid var(--border-1)", background: c.css, cursor: "pointer", padding: 0 }} />
            ))}
          </span>
          <textarea value={createNote} onChange={(e) => setCreateNote(e.target.value)} onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}
            placeholder="Add a comment (optional)" aria-label="Highlight comment" style={taStyle} />
          <span style={{ fontSize: 10, color: "var(--fg-1)", opacity: 0.6, textAlign: "center" }}>Pick a color to save, or click away to cancel</span>
        </span>,
        document.body,
      )}
      {editPop && createPortal(
        <span ref={editRef} style={{ ...popStyle, left: editPop.x, top: editPop.y, display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}
            placeholder="Add a comment" aria-label="Edit highlight comment" style={taStyle} />
          <span style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => { ctx.removeHighlight(editPop.id); setEditPop(null); }}
              style={{ fontSize: 12, color: "var(--fg-1)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>Remove</button>
            <span style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditPop(null)}
                style={{ fontSize: 12, color: "var(--fg-1)", opacity: 0.7, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>Cancel</button>
              <button onClick={() => { ctx.updateHighlightNote(editPop.id, editNote.trim() || null); setEditPop(null); }}
                style={{ fontSize: 12, fontWeight: 600, color: "var(--bw-teal)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>Save</button>
            </span>
          </span>
        </span>
      )}
    </span>
  );
}

export function HighlightOrphanNotice() {
  const ctx = useContext(Ctx);
  const [open, setOpen] = useState(false);
  if (!ctx || !ctx.enabled || ctx.orphans.length === 0) return null;
  const n = ctx.orphans.length;
  return (
    <div style={{ margin: "0 0 16px", padding: "10px 14px", border: "1px solid var(--border-1)", borderRadius: 8, background: "var(--bw-cream-200)", fontSize: 13, color: "var(--fg-1)" }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", color: "inherit", fontSize: 13, textAlign: "left" }}>
        {n === 1 ? "1 highlight could not be placed" : `${n} highlights could not be placed`} after this report was updated. {open ? "Hide" : "Show"}
      </button>
      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          {ctx.orphans.map((h) => (
            <div key={h.id} style={{ borderLeft: "3px solid var(--border-1)", paddingLeft: 10 }}>
              <div style={{ fontStyle: "italic", opacity: 0.85 }}>"{h.quoted_text}"</div>
              {h.note && h.note.trim() && (
                <div style={{ marginTop: 4 }}><strong>Your note:</strong> {h.note}</div>
              )}
              <button type="button" onClick={() => ctx.removeHighlight(h.id)}
                style={{ marginTop: 4, background: "transparent", border: "none", padding: 0, cursor: "pointer", fontSize: 12, color: "var(--bw-teal)" }}>
                Delete this highlight
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
