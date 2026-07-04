import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useTeamProfile, type TeamFacetResult } from "@/hooks/useTeamProfile";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNarrativeGenerator } from "@/hooks/useNarrativeGenerator";
import { HighlightableText, TeamReportHighlightProvider } from "@/components/results/ReportHighlight";
import ExportPdfModal, { type TeamPdfSectionsUi } from "@/components/results/ExportPdfModal";
import { assembleTeamPdfData } from "@/lib/assembleTeamPdfData";
import { generateTeamProfilePdf } from "@/lib/generateTeamProfilePdf";


/* ---------- palette ---------- */
const NAVY = "#021F36";
const ORANGE = "#F5741A";
const SAND = "#F9F7F1";
const TEAL = "#006D77";
const GRAY = "#6D6875";
const PURPLE = "#3C096C";
const GREEN = "#2D6A4F";
const MUSTARD = "#7a5800";
const AMBER = "#FFB703";
const INK = "#6D6875";
const MUTED = "#6D6875";
const LINE = "rgba(2,31,54,0.12)";
const CARD_BG = "#ffffff";
const SHAPE_KEYS = ["allHigh", "allLow", "two", "even", "together"] as const;
type ShapeKey = (typeof SHAPE_KEYS)[number];
const GC: Record<ShapeKey, string> = {
  allHigh: ORANGE,
  allLow: NAVY,
  two: MUSTARD,
  even: TEAL,
  together: GREEN,
};
const DOMAIN_COLOR: Record<string, string> = {
  Protection: NAVY,
  Participation: TEAL,
  Prediction: GRAY,
};

const PRIVILEGED_ACCOUNT_TYPES = new Set([
  "org_admin",
  "company_admin",
  "brainwise_super_admin",
]);

function shapeKey(shape: string | null | undefined): ShapeKey {
  switch (shape) {
    case "Everyone high":
      return "allHigh";
    case "Everyone low":
      return "allLow";
    case "Two groups":
      return "two";
    case "Together (mid)":
      return "together";
    case "Even spread":
    case "Mild":
    default:
      return "even";
  }
}

/* ---------- section types ---------- */
interface TeamInThreeItem { headline: string; detail: string; action: string; }
interface DrivingItem {
  item: number;
  why: string;
  actions?: string[];
  action?: string;
}
interface DrivingFacetsSection {
  opening: string;
  strengths: DrivingItem[];
  focus: DrivingItem[];
}
interface CommunicationSection {
  general: string | string[];
  under_pressure: string | string[];
  avoid_conflict: string[];
}
interface ConflictSection { summary: string; mitigate: string | string[]; promote_healthy: string | string[]; }
interface LeaderBriefRow { item: number; risk_to_work: string; the_move: string; potential_owner: string; }
interface LeaderBriefSection { rows: LeaderBriefRow[]; lean_on: string; }
interface CoachSection {
  why: { item: number; rationale: string }[];
  debrief_prompts: string[];
}

/* ---------- prose helpers ---------- */
function splitParas(text: string): string[] {
  if (!text) return [];
  const t = text.trim();
  if (/\n\s*\n/.test(t)) return t.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  // Sentence split nearest to midpoint
  const sentences = t.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [t];
  if (sentences.length < 2) return [t];
  const total = t.length;
  let acc = 0, bestIdx = 0, bestDiff = Infinity;
  for (let i = 0; i < sentences.length - 1; i++) {
    acc += sentences[i].length + 1;
    const diff = Math.abs(acc - total / 2);
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
  }
  const first = sentences.slice(0, bestIdx + 1).join(" ");
  const second = sentences.slice(bestIdx + 1).join(" ");
  return [first, second].filter(Boolean);
}
function Paras({ text, style, blockKey }: { text: string; style?: React.CSSProperties; blockKey?: string }) {
  const paras = splitParas(text);
  if (paras.length === 0) return null;
  const base: React.CSSProperties = { color: GRAY, fontSize: 16, lineHeight: 1.6, maxWidth: "70ch", margin: 0, ...style };
  return (
    <>
      {paras.map((p, i) => (
        <p key={i} style={{ ...base, marginTop: i === 0 ? 0 : 12 }}>
          {blockKey ? <HighlightableText blockKey={`${blockKey}:${i}`} text={p} /> : p}
        </p>
      ))}
    </>
  );
}
function IdeaBullets({ items, style, blockKey }: { items: string | string[]; style?: React.CSSProperties; blockKey?: string }) {
  if (Array.isArray(items)) {
    const list = items.filter(Boolean);
    if (!list.length) return null;
    return (
      <ul style={{ margin: 0, paddingLeft: 22, color: GRAY, fontSize: 16, lineHeight: 1.6, listStyleType: "disc", ...style }}>
        {list.map((s, i) => (
          <li key={i} style={{ margin: "4px 0" }}>
            {blockKey ? <HighlightableText blockKey={`${blockKey}:${i}`} text={s} /> : s}
          </li>
        ))}
      </ul>
    );
  }
  return <Paras text={items} style={style} blockKey={blockKey} />;
}


/* ---------- tooltip ---------- */
type Tip = { x: number; y: number; text: string } | null;
const TipCtx = { current: null as null | ((t: Tip) => void) };
function useTipController() {
  const [tip, setTip] = useState<Tip>(null);
  useEffect(() => {
    TipCtx.current = setTip;
    return () => { TipCtx.current = null; };
  }, []);
  return tip;
}
function showTip(e: React.MouseEvent, text: string) {
  TipCtx.current?.({
    x: Math.min(e.clientX + 12, window.innerWidth - 310),
    y: e.clientY + 14,
    text,
  });
}
function hideTip() { TipCtx.current?.(null); }

/* ---------- Distribution glyph + modal ---------- */
function DistGlyph({
  scores,
  color,
  onOpen,
}: { scores: number[]; color: string; onOpen: () => void }) {
  if (!scores || scores.length === 0) return null;
  const W = 150, H = 46, y = 23, L = 12, Rr = W - 12, span = Rr - L;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const mx = L + span * (mean / 100);
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      title="Click to enlarge"
      style={{ cursor: "zoom-in", display: "inline-block", borderRadius: 8, padding: 2 }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        <line x1={L} y1={y} x2={Rr} y2={y} stroke="rgba(2,31,54,0.12)" />
        <line x1={mx} y1={y - 12} x2={mx} y2={y + 12} stroke={NAVY} strokeWidth={1.5} opacity={0.45} />
        {scores.map((sc, i) => {
          const x = L + span * (sc / 100);
          const jit = ((i % 3) - 1) * 5.5;
          return <circle key={i} cx={x} cy={y + jit} r={3.4} fill={color} opacity={0.8} />;
        })}
      </svg>
    </span>
  );
}

function DistModal({
  open, onClose, scores, color, title,
}: { open: boolean; onClose: () => void; scores: number[]; color: string; title: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const W = 600, H = 210, L = 48, Rr = W - 24, span = Rr - L, base = H - 44;
  const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const mx = L + span * (mean / 100);
  const sorted = [...scores].sort((a, b) => a - b);
  let lastX = -99, lvl = 0;
  const dots = sorted.map((sc, i) => {
    const x = L + span * (sc / 100);
    lvl = (x - lastX < 16) ? lvl + 1 : 0;
    lastX = x;
    const cy = base - 12 - lvl * 15;
    return { x, cy, sc, key: i };
  });
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(2,31,54,.55)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20,
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 16, maxWidth: 680, width: "100%",
        padding: "22px 24px 26px", boxShadow: "0 24px 60px rgba(2,31,54,.35)", position: "relative",
      }}>
        <button onClick={onClose} aria-label="Close" style={{
          position: "absolute", top: 12, right: 16, border: 0, background: "none",
          fontSize: 24, lineHeight: 1, color: GRAY, cursor: "pointer",
        }}>×</button>
        <h3 style={{ margin: "0 0 2px", fontSize: 17, color: NAVY }}>{title}</h3>
        <div style={{ fontSize: 13, color: GRAY, marginBottom: 14 }}>
          {scores.length === 2
            ? "Person A and Person B. Hover a dot to see its score."
            : `Each dot is one team member (${scores.length}). Hover a dot to see its score.`}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
          <line x1={L} y1={base} x2={Rr} y2={base} stroke="rgba(2,31,54,0.18)" />
          {[0, 25, 50, 75, 100].map((t) => {
            const x = L + span * (t / 100);
            return (
              <g key={t}>
                <line x1={x} y1={base} x2={x} y2={base + 6} stroke="rgba(2,31,54,0.18)" />
                <text x={x} y={base + 20} fontSize={11} fill={GRAY} textAnchor="middle">{t}</text>
              </g>
            );
          })}
          <line x1={mx} y1={28} x2={mx} y2={base} stroke={NAVY} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5} />
          <text x={mx} y={20} fontSize={11} fill={NAVY} textAnchor="middle">team avg {Math.round(mean)}</text>
          {dots.map((d) => (
            <circle
              key={d.key}
              cx={d.x} cy={d.cy} r={6} fill={color} opacity={0.85}
              onMouseMove={(e) => showTip(e, `Score: ${d.sc}`)}
              onMouseLeave={hideTip}
              style={{ cursor: "pointer" }}
            />
          ))}
        </svg>
        <div style={{ fontSize: 12, color: GRAY, marginTop: 10, textAlign: "center" }}>
          Anonymous: dots are not linked to names.
        </div>
      </div>
    </div>
  );
}

/* ---------- Radial ---------- */
function Radial({ domains }: { domains: { name: string; mean: number; high: number; low: number; color: string }[] }) {
  const C = 200, R = 150, ang = [-90, 30, 150];
  const pol = (d: number, r: number): [number, number] => [
    C + r * Math.cos((d * Math.PI) / 180),
    C + r * Math.sin((d * Math.PI) / 180),
  ];
  const pt = (v: number, i: number) => pol(ang[i], (R * v) / 100);
  const polyPoints = (k: "mean" | "high" | "low") =>
    domains.map((d, i) => pt(d[k], i).map((n) => n.toFixed(1)).join(",")).join(" ");
  const sectors = ang.map((a, i) => {
    const p0 = pol(a - 60, R), p1 = pol(a + 60, R);
    return (
      <path key={i}
        d={`M${C},${C} L${p0[0].toFixed(1)},${p0[1].toFixed(1)} A${R},${R} 0 0 1 ${p1[0].toFixed(1)},${p1[1].toFixed(1)} Z`}
        fill={domains[i].color} opacity={0.08} />
    );
  });
  return (
    <svg viewBox="0 0 400 400" width="100%" style={{ maxWidth: 440, display: "block" }}>
      {sectors}
      {[25, 50, 75, 100].map((v) => (
        <circle key={v} cx={C} cy={C} r={(R * v) / 100} fill="none" stroke="rgba(2,31,54,0.12)" />
      ))}
      {ang.map((a, i) => {
        const e = pol(a, R);
        return <line key={i} x1={C} y1={C} x2={e[0]} y2={e[1]} stroke="rgba(2,31,54,0.12)" />;
      })}
      <polygon points={polyPoints("high")} fill="none" stroke={PURPLE} strokeWidth={1.6} strokeDasharray="5 4" />
      <polygon points={polyPoints("low")} fill="none" stroke={MUSTARD} strokeWidth={1.6} strokeDasharray="5 4" />
      <polygon points={polyPoints("mean")} fill={NAVY} opacity={0.1} />
      <polygon points={polyPoints("mean")} fill="none" stroke={NAVY} strokeWidth={2.5} />
      {domains.map((d, i) => {
        const hp = pt(d.high, i), lp = pt(d.low, i);
        return (
          <g key={`hl${i}`}>
            <circle cx={hp[0]} cy={hp[1]} r={4.5} fill={PURPLE} stroke="#fff" strokeWidth={1.5}
              onMouseMove={(e) => showTip(e, `${d.name} team high: ${d.high}`)} onMouseLeave={hideTip}
              style={{ cursor: "pointer" }} />
            <circle cx={lp[0]} cy={lp[1]} r={4.5} fill={MUSTARD} stroke="#fff" strokeWidth={1.5}
              onMouseMove={(e) => showTip(e, `${d.name} team low: ${d.low}`)} onMouseLeave={hideTip}
              style={{ cursor: "pointer" }} />
          </g>
        );
      })}
      {domains.map((d, i) => {
        const p = pt(d.mean, i);
        return (
          <g key={`m${i}`}>
            <circle cx={p[0]} cy={p[1]} r={6} fill={d.color} stroke="#fff" strokeWidth={2}
              onMouseMove={(e) => showTip(e, `${d.name} team average: ${d.mean}`)} onMouseLeave={hideTip}
              style={{ cursor: "pointer" }} />
            <text x={p[0]} y={p[1] - 12} textAnchor="middle" fontSize={12} fontWeight={800} fill={d.color}>{d.mean}</text>
          </g>
        );
      })}
      {domains.map((d, i) => {
        const offset = i === 0 ? R + 22 : R + 30;
        const lp = pol(ang[i], offset);
        return (
          <text key={`lab${i}`} x={lp[0]} y={lp[1]} textAnchor="middle" fontSize={13} fontWeight={800} fill={d.color}>
            {d.name}
          </text>
        );
      })}
    </svg>
  );
}

/* ---------- Agreement bar ---------- */
function AgreementBar({ d }: { d: { name: string; mean: number; high: number; low: number; color: string; desc: string } }) {
  const w = Math.max(0, d.high - d.low);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontWeight: 700, color: d.color }}>{d.name}</span>
        <span style={{ fontSize: 12, color: MUTED }}>{d.desc}</span>
      </div>
      <div style={{ position: "relative", height: 16, background: "rgba(2,31,54,0.10)", borderRadius: 999 }}>
        <div style={{ position: "absolute", top: 0, height: 16, borderRadius: 999, opacity: 0.45, left: `${d.low}%`, width: `${w}%`, background: d.color }} />
        <div onMouseMove={(e) => showTip(e, `${d.name} low: ${d.low}`)} onMouseLeave={hideTip}
          style={{ position: "absolute", top: 1, width: 14, height: 14, borderRadius: "50%", border: "2px solid #fff", transform: "translateX(-50%)", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,.18)", left: `${d.low}%`, background: MUSTARD }} />
        <div onMouseMove={(e) => showTip(e, `${d.name} high: ${d.high}`)} onMouseLeave={hideTip}
          style={{ position: "absolute", top: 1, width: 14, height: 14, borderRadius: "50%", border: "2px solid #fff", transform: "translateX(-50%)", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,.18)", left: `${d.high}%`, background: PURPLE }} />
        <div style={{ position: "absolute", top: -26, transform: "translateX(-50%)", fontWeight: 800, color: NAVY, fontSize: 13, left: `${d.mean}%` }}>{d.mean}</div>
        <div onMouseMove={(e) => showTip(e, `${d.name}: low ${d.low}, avg ${d.mean}, high ${d.high}`)} onMouseLeave={hideTip}
          style={{ position: "absolute", top: -3, width: 22, height: 22, borderRadius: "50%", background: NAVY, border: "3px solid #fff", transform: "translateX(-50%)", cursor: "pointer", zIndex: 2, left: `${d.mean}%`, boxShadow: "0 1px 2px rgba(2,31,54,.06),0 8px 24px rgba(2,31,54,.06)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(2,31,54,0.35)", marginTop: 4 }}>
        <span>0</span><span>50</span><span>100</span>
      </div>
    </div>
  );
}

function agreementDesc(range: number) {
  if (range <= 15) return "tight agreement";
  if (range <= 30) return "some variation";
  return "members vary a lot";
}

/* ---------- Teaching archetype glyph ---------- */
function ArchGlyph({ k }: { k: ShapeKey }) {
  const W = 130, H = 40, y = 20, L = 14, Rr = W - 14, span = Rr - L;
  const c = GC[k];
  const dot = (x: number, cc?: string) => <circle key={`${x}-${cc ?? ""}`} cx={x} cy={y} r={4.2} fill={cc ?? c} />;
  const dbox = (x0: number, x1: number, key: string) => (
    <rect key={key} x={x0} y={y - 7} width={x1 - x0} height={14} rx={4} fill="none" stroke={c} strokeDasharray="3 3" opacity={0.6} />
  );
  const els: React.ReactNode[] = [<line key="ax" x1={L} y1={y} x2={Rr} y2={y} stroke="rgba(2,31,54,0.12)" />];
  if (k === "together") [0.58, 0.63, 0.67, 0.6].forEach((t) => els.push(dot(L + span * t)));
  else if (k === "even") for (let i = 0; i < 7; i++) els.push(dot(L + span * (i / 6)));
  else if (k === "two") {
    [0.18, 0.23, 0.28].forEach((t) => els.push(dot(L + span * t)));
    [0.72, 0.77, 0.82].forEach((t) => els.push(dot(L + span * t)));
    els.push(<line key="div" x1={L + span * 0.5} y1={y - 9} x2={L + span * 0.5} y2={y + 9} stroke="rgba(2,31,54,0.25)" strokeDasharray="2 2" />);
  } else if (k === "allHigh") {
    els.push(dbox(L, L + span * 0.4, "box"));
    [0.78, 0.84, 0.9].forEach((t) => els.push(dot(L + span * t)));
  } else if (k === "allLow") {
    [0.08, 0.14, 0.2].forEach((t) => els.push(dot(L + span * t)));
    els.push(dbox(L + span * 0.6, Rr, "box"));
  }
  return <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>{els}</svg>;
}

/* ---------- meter ---------- */
function Meter({ tier, kind }: { tier: number; kind: "strength" | "watch" }) {
  const color = kind === "strength" ? GREEN : AMBER;
  return (
    <span style={{ display: "inline-flex", gap: 3, marginLeft: 8 }}>
      {[0, 1, 2, 3].map((i) => (
        <i key={i} style={{ width: 5, height: 12, borderRadius: 1, display: "inline-block", background: i < tier ? color : "rgba(2,31,54,0.15)" }} />
      ))}
    </span>
  );
}

function tierFromDriver(score: number | null | undefined): number {
  if (!score || score <= 0) return 1;
  if (score < 0.4) return 2;
  if (score < 0.7) return 3;
  return 4;
}

/* ---------- driver card ---------- */
function DriverCard({
  idx, kind, rank, shape, label, name, why, actions, question, scores, onOpenDist,
}: {
  idx: number;
  kind: "strength" | "watch";
  rank?: number;
  shape: ShapeKey;
  label: string;
  name: string;
  why: string;
  actions: string[];
  question: string;
  scores: number[];
  onOpenDist: (scores: number[], color: string, title: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const accent = kind === "strength" ? GREEN : GC[shape];
  const tier = 4;
  const distColor = kind === "strength" ? GREEN : accent;
  return (
    <div
      onMouseMove={question ? (e) => showTip(e, `Question answered: ${question}`) : undefined}
      onMouseLeave={hideTip}
      style={{
        background: kind === "strength" ? "linear-gradient(0deg,rgba(45,106,79,.05),rgba(45,106,79,.05)),#fff" : CARD_BG,
        border: `1px solid ${LINE}`,
        borderLeft: `6px solid ${accent}`,
        borderRadius: 16,
        boxShadow: "0 1px 2px rgba(2,31,54,.06),0 8px 24px rgba(2,31,54,.06)",
        padding: "18px 20px",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 18 }} className="dr-grid">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {kind === "strength"
            ? <span style={{ color: GREEN, fontSize: 22 }}>★</span>
            : <span style={{ fontSize: 26, fontWeight: 800, color: GRAY }}>{rank}</span>}
          {scores.length > 0 && (
            <DistGlyph
              scores={scores}
              color={distColor}
              onOpen={() => onOpenDist(scores, distColor, name)}
            />
          )}
        </div>
        <div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontSize: 13, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase",
            padding: "4px 9px", borderRadius: 999, marginBottom: 8,
            background: kind === "strength" ? "rgba(45,106,79,.12)" : "rgba(255,183,3,.16)",
            color: kind === "strength" ? GREEN : MUSTARD,
          }}>
            {label}
            <Meter tier={tier} kind={kind} />
          </span>
          <div style={{ fontWeight: 800, color: NAVY, margin: "4px 0 8px", fontSize: 18 }}>{name}</div>
          <div style={{ color: GRAY, fontSize: 16, lineHeight: 1.6, maxWidth: "70ch" }}>{why}</div>
          {actions.length > 0 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
                style={{
                  marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6,
                  fontWeight: 700, fontSize: 14, cursor: "pointer", color: TEAL,
                  background: "none", border: 0, padding: 0,
                }}
              >
                <span style={{ display: "inline-block", transition: ".2s", transform: open ? "rotate(90deg)" : "none" }}>▸</span>
                See three things to {kind === "strength" ? "keep doing" : "try"}
              </button>
              <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows .3s ease", marginTop: open ? 12 : 0 }}>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 800, color: GRAY, marginBottom: 8 }}>
                    {kind === "strength" ? "Three things to keep doing" : "Three things to try"}
                  </div>
                  <ol style={{ margin: 0, paddingLeft: 24, color: GRAY, listStyleType: "decimal", fontSize: 16, lineHeight: 1.6 }}>
                    {actions.map((a, i) => <li key={i} style={{ marginBottom: 8, paddingLeft: 4 }}>{a}</li>)}
                  </ol>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- accordion ---------- */
function Acc({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 16, boxShadow: "0 1px 2px rgba(2,31,54,.06),0 8px 24px rgba(2,31,54,.06)", marginBottom: 12, overflow: "hidden" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{
        width: "100%", textAlign: "left", background: "none", border: 0, padding: "16px 18px",
        fontSize: 18, fontWeight: 800, color: NAVY, cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{title}</span>
        <span style={{ color: TEAL, transition: ".25s", transform: open ? "rotate(90deg)" : "none" }}>▸</span>
      </button>
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows .3s ease", color: "#6D6875" }}>
        <div style={{ overflow: "hidden" }}>
          <div style={{ padding: "0 18px 18px" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- page ---------- */
export default function TeamReport() {
  const { teamProfileId } = useParams<{ teamProfileId: string }>();
  const {
    loading, noAccess, profile, sections, status,
    refetchSections, refetchProfile,
  } = useTeamProfile(teamProfileId);
  const { profile: userProfile } = useUserProfile();

  const canSeePrivileged =
    !!userProfile &&
    (userProfile.is_practitioner_coach ||
      PRIVILEGED_ACCOUNT_TYPES.has(userProfile.account_type ?? ""));
  const canHighlight = !noAccess;
  const [exportOpen, setExportOpen] = useState(false);
  const handleExportTeam = useCallback(
    async (secs: TeamPdfSectionsUi) => {
      if (!teamProfileId) return;
      const data = await assembleTeamPdfData({ teamProfileId, canSeePrivileged });
      if (!data) {
        toast.error("Report is still generating.");
        return;
      }
      await generateTeamProfilePdf(data, secs);
    },
    [teamProfileId, canSeePrivileged],
  );


  const generator = useNarrativeGenerator({
    kind: "team",
    id: teamProfileId,
    status,
    enabled: canSeePrivileged,
    onSectionDone: async () => {
      await refetchSections();
      await refetchProfile();
    },
  });

  /* distributions */
  const [scoresByItem, setScoresByItem] = useState<Map<number, number[]>>(new Map());
  const [questionByItem, setQuestionByItem] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    if (!teamProfileId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("bw_team_profile_distribution" as never, { p_profile: teamProfileId } as never);
      if (cancelled) return;
      const rows = (data ?? []) as Array<{ item_number: number; scores: number[] }>;
      setScoresByItem(new Map(rows.map((r) => [r.item_number, (r.scores ?? []).slice().sort((a, b) => a - b)])));
    })();
    return () => { cancelled = true; };
  }, [teamProfileId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("items").select("item_number,item_text").eq("instrument_id", "INST-001");
      if (cancelled) return;
      const rows = (data ?? []) as Array<{ item_number: number | null; item_text: string }>;
      setQuestionByItem(new Map(rows.filter((r) => r.item_number != null).map((r) => [r.item_number as number, r.item_text])));
    })();
    return () => { cancelled = true; };
  }, []);

  /* tooltip & modal state */
  const tip = useTipController();
  const [distOpen, setDistOpen] = useState<{ scores: number[]; color: string; title: string } | null>(null);
  const openDist = useCallback((scores: number[], color: string, title: string) => {
    setDistOpen({ scores, color, title });
  }, []);

  /* responsive override for dr-grid */
  const gridStyleRef = useRef<HTMLStyleElement | null>(null);
  useEffect(() => {
    const s = document.createElement("style");
    s.innerHTML = `
      @media (max-width: 780px) {
        .dr-grid { grid-template-columns: 1fr !important; }
        .facets-grid { grid-template-columns: 1fr !important; }
        .pair-grid { grid-template-columns: 1fr !important; }
        .glyphrow-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .meta-grid { gap: 18px !important; }
        .leader-tbl, .leader-tbl tbody, .leader-tbl tr, .leader-tbl td { display: block !important; width: 100% !important; }
        .leader-thead { display: none !important; }
        .leader-tbl .leader-row { border: 1px solid ${LINE}; border-radius: 12px; margin-bottom: 12px; padding: 8px 4px; background: #fff; }
        .leader-tbl td { border-top: 0 !important; padding: 8px 14px !important; }
        .leader-tbl td::before { content: attr(data-label); display: block; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: ${GRAY}; font-weight: 700; margin-bottom: 4px; }
      }
    `;
    document.head.appendChild(s);
    gridStyleRef.current = s;
    return () => { s.remove(); };
  }, []);

  /* derived data */
  const teamInThree = sections["team_in_three"] as TeamInThreeItem[] | undefined;
  const driving = sections["driving_facets"] as DrivingFacetsSection | undefined;
  const communication = sections["communication"] as CommunicationSection | undefined;
  const conflict = sections["conflict"] as ConflictSection | undefined;
  const leader = sections["leader_brief"] as LeaderBriefSection | undefined;
  const coach = sections["coach"] as CoachSection | undefined;

  const facetLookup = (item: number): TeamFacetResult | undefined =>
    profile?.structured?.facets?.find((f) => f.itemNumber === item) ??
    profile?.structured?.strengths?.find((f) => f.itemNumber === item) ??
    profile?.structured?.focusAreas?.find((f) => f.itemNumber === item) ??
    profile?.structured?.fullMap?.find((f) => f.itemNumber === item);

  const domains = useMemo(() => {
    const dims = profile?.structured?.dimensions ?? {};
    return ["Protection", "Participation", "Prediction"].map((name) => {
      const d = dims[name] ?? { mean: 0, high: 0, low: 0 };
      const mean = Math.round(d.mean ?? 0);
      const high = Math.round(d.high ?? 0);
      const low = Math.round(d.low ?? 0);
      return { name, mean, high, low, color: DOMAIN_COLOR[name], desc: agreementDesc(high - low) };
    });
  }, [profile]);

  /* full-map groups */
  const fullMapGroups = useMemo(() => {
    const full = profile?.structured?.fullMap ?? profile?.structured?.facets ?? [];
    const buckets: Record<ShapeKey, TeamFacetResult[]> = {
      allHigh: [], allLow: [], two: [], even: [], together: [],
    };
    for (const f of full) buckets[shapeKey(f.shape)].push(f);
    const titles: Record<ShapeKey, string> = {
      allHigh: "Nobody down there (everyone high)",
      allLow: "Nobody up here (everyone low)",
      two: "Two groups (a split)",
      even: "Even spread (a spectrum)",
      together: "Together (common ground)",
    };
    return SHAPE_KEYS.filter((k) => buckets[k].length > 0).map((k) => ({
      k, title: titles[k], items: buckets[k],
    }));
  }, [profile]);

  const [activeShape, setActiveShape] = useState<ShapeKey | null>(null);

  /* ---------- early returns ---------- */
  if (loading) {
    return (
      <div style={{ background: SAND, minHeight: "100vh", padding: 24 }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }} className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }
  if (noAccess || !profile) {
    return (
      <div style={{ background: SAND, minHeight: "100vh", padding: 24 }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 16, padding: 24, textAlign: "center", color: MUTED }}>
          You do not have access to this team report.
        </div>
      </div>
    );
  }

  /* driver lists (strengths + ranked focus areas) */
  const strengthFacets = (profile.structured?.strengths ?? []).slice(0, 1);
  const focusFacets = profile.structured?.focusAreas ?? [];

  const strengthDrivers = strengthFacets.map((f, i) => {
    const src = driving?.strengths?.[i];
    const actions = src?.actions ?? (src?.action ? [src.action] : []);
    return {
      kind: "strength" as const,
      shape: shapeKey(f.shape),
      label: "Start here · your strength",
      name: f.facetName,
      why: src?.why ?? "",
      actions,
      question: questionByItem.get(f.itemNumber) ?? "",
      scores: scoresByItem.get(f.itemNumber) ?? [],
    };
  });
  const focusDrivers = focusFacets.map((f, idx) => {
    const src = driving?.focus?.[idx];
    const actions = src?.actions ?? (src?.action ? [src.action] : []);
    const sev = (f.driverScore ?? 0);
    let label = "Worth watching";
    if (sev >= 0.7) label = "Drives strongly";
    else if (sev >= 0.4) label = "Quiet but real";
    return {
      kind: "watch" as const,
      rank: idx + 1,
      shape: shapeKey(f.shape),
      label,
      name: f.facetName,
      why: src?.why ?? "",
      actions,
      question: questionByItem.get(f.itemNumber) ?? "",
      scores: scoresByItem.get(f.itemNumber) ?? [],
    };
  });

  const teamName = profile?.report_label
    ?? (profile as unknown as { team_name?: string | null })?.team_name
    ?? "Team";

  return (
    <div style={{ background: SAND, color: GRAY, fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: 16, lineHeight: 1.6, minHeight: "100vh" }}>
      <TeamReportHighlightProvider teamProfileId={teamProfileId} enabled={canHighlight}>
      {/* Hero */}
      <header style={{ background: NAVY, color: "#ffffff", padding: "54px 0 110px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 20px" }}>
          <img src="/brain-icon.png" alt="" style={{ height: 26, width: "auto", display: "block", marginBottom: 14 }} />
          <div style={{ fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 700, color: ORANGE }}>
            Team Threat Profile
          </div>
          <h1 style={{ fontSize: 46, fontWeight: 800, color: "#fff", margin: "6px 0 14px", lineHeight: 1.15 }}>
            {teamName === "Team" ? null : <>{teamName} </>}Team <span style={{ color: ORANGE }}>Report</span>
          </h1>
          <p style={{ maxWidth: 560, color: "rgba(255,255,255,0.75)", margin: "0 0 26px", fontSize: 16, lineHeight: 1.6 }}>
            The patterns that shape how this team works under pressure, ranked so the few that matter most come first. Built from every member&apos;s Personal Threat Profile.
          </p>
          <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }} className="meta-grid">
            <div>
              <div style={{ fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase", color: ORANGE, fontWeight: 700, marginBottom: 4 }}>Members</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>{profile.member_count}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase", color: ORANGE, fontWeight: 700, marginBottom: 4 }}>Generated</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>{new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</div>
            </div>
          </div>
          {status === "complete" && (
            <div style={{ marginTop: 20 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportOpen(true)}
                style={{ background: "#fff", color: NAVY, borderColor: "transparent" }}
              >
                <FileText className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          )}

        </div>
      </header>


      {/* Team in three (overlap) */}
      {Array.isArray(teamInThree) && teamInThree.length > 0 && (
        <div style={{ maxWidth: 1040, margin: "-78px auto 0", padding: "0 20px" }}>
          <div style={{ background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 16, boxShadow: "0 1px 2px rgba(2,31,54,.06),0 8px 24px rgba(2,31,54,.06)" }}>
            <div style={{ padding: "16px 18px", borderBottom: `1px solid ${LINE}`, fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase", color: GRAY, fontWeight: 700 }}>
              Your team in three · the whole report in 30 seconds
            </div>
            {teamInThree.map((it, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "54px 1fr", gap: 8, padding: 18, borderBottom: i === teamInThree.length - 1 ? "none" : `1px solid ${LINE}` }}>
                <div style={{ fontSize: 34, fontWeight: 800, color: ORANGE, lineHeight: 1 }}>{i + 1}</div>
                <div>
                  <div style={{ fontWeight: 800, color: NAVY, marginBottom: 6, fontSize: 18 }}>{it.headline}</div>
                  <Paras text={it.detail} blockKey={`team_in_three:${i}:detail`} />
                  <div style={{ color: TEAL, fontWeight: 700, marginTop: 10, fontSize: 16 }}>{it.action}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canHighlight && (
        <div style={{ maxWidth: 1040, margin: "16px auto 0", padding: "0 20px", color: MUTED, fontSize: 13 }}>
          Tip: select any text in this report to highlight it, and add a comment to anything you want to remember or discuss. Your highlights and notes are saved to your view.
        </div>
      )}
      {/* status banner */}
      {status !== "complete" && (
        <div style={{ maxWidth: 1040, margin: "20px auto 0", padding: "0 20px" }}>
          <GenerationBanner
            status={status}
            running={generator.running}
            expected={generator.expected}
            done={generator.done}
            current={generator.current}
            failed={generator.failed}
            onRetry={generator.retry}
            canDrive={canSeePrivileged}
          />
        </div>
      )}

      {/* Three domains */}
      <section style={{ padding: "34px 0" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 700, color: ORANGE }}>Team Profile</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>The three threat domains</h2>
          <p style={{ color: MUTED, margin: "0 0 18px" }}>
            Center is zero, the outer ring is 100. Each sector is one domain. The solid line is the team average; the dashed lines and their dots are the team&apos;s high and low edges. The bars below show how much members agree.
          </p>
          <div style={{ background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 16, padding: 22, boxShadow: "0 1px 2px rgba(2,31,54,.06),0 8px 24px rgba(2,31,54,.06)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Radial domains={domains} />
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center", fontSize: 12, color: "#6D6875", margin: "4px 0" }}>
                {domains.map((d) => (
                  <span key={d.name}>
                    <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", verticalAlign: -1, marginRight: 6, background: d.color }} />
                    {d.name}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: MUTED, marginTop: 8, justifyContent: "center" }}>
                <span><span style={{ display: "inline-block", width: 14, height: 0, borderTop: `3px solid ${NAVY}`, verticalAlign: 3, marginRight: 6 }} />Team average</span>
                <span><span style={{ display: "inline-block", width: 14, height: 0, borderTop: `3px dashed ${PURPLE}`, verticalAlign: 3, marginRight: 6 }} />Team high</span>
                <span><span style={{ display: "inline-block", width: 14, height: 0, borderTop: `3px dashed ${MUSTARD}`, verticalAlign: 3, marginRight: 6 }} />Team low</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 24, width: "100%", maxWidth: 760 }}>
                {domains.map((d) => <AgreementBar key={d.name} d={d} />)}
              </div>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: MUTED, marginTop: 8, justifyContent: "center" }}>
                <span><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", verticalAlign: -1, marginRight: 6, background: "rgba(2,31,54,0.15)" }} />Range, low to high member</span>
                <span><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", verticalAlign: -1, marginRight: 6, background: NAVY }} />Team average</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to read the shapes */}
      <section style={{ padding: "34px 0" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 20px" }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>How to read the shapes</h2>
          <p style={{ color: MUTED, margin: "0 0 18px" }}>
            Every card below is one of five pictures. A dot is a teammate, placed lower to higher. Click a shape to highlight it in the full map.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }} className="glyphrow-grid">
            {([
              { k: "allHigh", t: "Nobody down there", s: "everyone is high here" },
              { k: "allLow", t: "Nobody up here", s: "no one is high, unwatched" },
              { k: "two", t: "Two groups", s: "the team is split" },
              { k: "even", t: "Even spread", s: "a full spectrum" },
              { k: "together", t: "Together", s: "real common ground" },
            ] as { k: ShapeKey; t: string; s: string }[]).map((sh) => (
              <div
                key={sh.k}
                onClick={() => setActiveShape((a) => (a === sh.k ? null : sh.k))}
                style={{
                  background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 16,
                  boxShadow: "0 1px 2px rgba(2,31,54,.06),0 8px 24px rgba(2,31,54,.06)",
                  padding: 14, textAlign: "center", cursor: "pointer", transition: ".15s",
                  outline: activeShape === sh.k ? `2px solid ${TEAL}` : "none",
                }}
              >
                <ArchGlyph k={sh.k} />
                <div style={{ fontWeight: 700, color: NAVY, fontSize: 16, marginTop: 8 }}>{sh.t}</div>
                <div style={{ fontSize: 13, color: MUTED }}>{sh.s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Drivers */}
      {(strengthDrivers.length > 0 || focusDrivers.length > 0) && (
        <section style={{ padding: "34px 0" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 20px" }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>What is driving your team</h2>
            <p style={{ color: GRAY, margin: "0 0 18px", fontSize: 16, lineHeight: 1.6 }}>
              We open with the team&apos;s strength, then the areas to watch in priority order. The picture on each card is your team&apos;s real spread on that trait. Click any card for three specific moves; hover to see the question the team answered.
            </p>
            {driving?.opening && <div style={{ marginBottom: 14 }}><Paras text={driving.opening} style={{ maxWidth: "none" }} blockKey="driving:opening" /></div>}
            {[...strengthDrivers, ...focusDrivers].map((d, i) => (
              <DriverCard key={i} idx={i} {...d} onOpenDist={openDist} />
            ))}
          </div>
        </section>
      )}

      {/* Communication */}
      {communication && (
        <section style={{ padding: "34px 0" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 20px" }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>How this team communicates</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="pair-grid">
              <div style={{ background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 16, padding: 18, boxShadow: "0 1px 2px rgba(2,31,54,.06),0 8px 24px rgba(2,31,54,.06)" }}>
                <div style={{ fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 800, marginBottom: 10, color: TEAL }}>In general</div>
                <IdeaBullets items={communication.general} blockKey="communication:general" />
              </div>
              <div style={{ background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 16, padding: 18, boxShadow: "0 1px 2px rgba(2,31,54,.06),0 8px 24px rgba(2,31,54,.06)" }}>
                <div style={{ fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 800, marginBottom: 10, color: MUSTARD }}>Under pressure</div>
                <IdeaBullets items={communication.under_pressure} blockKey="communication:under_pressure" />
              </div>
            </div>
            {Array.isArray(communication.avoid_conflict) && communication.avoid_conflict.length > 0 && (
              <div style={{ marginTop: 14, background: "rgba(255,183,3,.10)", border: "1px solid rgba(255,183,3,.35)", borderRadius: 12, padding: 16 }}>
                <h4 style={{ margin: "0 0 10px", color: NAVY, fontSize: 18 }}>Avoiding communication conflict</h4>
                <ol style={{ margin: 0, paddingLeft: 22, color: GRAY, fontSize: 16, lineHeight: 1.6, listStyleType: "decimal" }}>
                  {communication.avoid_conflict.map((t, i) => <li key={i} style={{ marginBottom: 6 }}><HighlightableText blockKey={`communication:avoid_conflict:${i}`} text={t} /></li>)}
                </ol>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Conflict */}
      {conflict && (
        <section style={{ padding: "34px 0" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 20px" }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>How this team handles conflict</h2>
            <div style={{ margin: "0 0 18px" }}><Paras text={conflict.summary} style={{ maxWidth: "none" }} blockKey="conflict:summary" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="pair-grid">
              <div style={{ background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 16, padding: 18, boxShadow: "0 1px 2px rgba(2,31,54,.06),0 8px 24px rgba(2,31,54,.06)" }}>
                <div style={{ fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 800, marginBottom: 10, color: TEAL }}>Mitigate unhealthy conflict</div>
                <IdeaBullets items={conflict.mitigate} blockKey="conflict:mitigate" />
              </div>
              <div style={{ background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 16, padding: 18, boxShadow: "0 1px 2px rgba(2,31,54,.06),0 8px 24px rgba(2,31,54,.06)" }}>
                <div style={{ fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 800, marginBottom: 10, color: MUSTARD }}>Promote healthy conflict</div>
                <IdeaBullets items={conflict.promote_healthy} blockKey="conflict:promote" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Leader brief (privileged) */}
      {canSeePrivileged && leader && (
        <section style={{ padding: "34px 0" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 20px" }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>For the leader: the moves</h2>
            <p style={{ color: MUTED, margin: "0 0 18px" }}>One page. The top drivers, what each costs the work, the lever, and who owns it.</p>
            <div style={{ background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 16, padding: 18, boxShadow: "0 1px 2px rgba(2,31,54,.06),0 8px 24px rgba(2,31,54,.06)" }}>
              <div style={{ overflowX: "auto" }} className="leader-tbl-wrap">
                <table style={{ width: "100%", borderCollapse: "collapse", overflow: "hidden", borderRadius: 12, border: `1px solid ${LINE}` }} className="leader-tbl">
                  <thead className="leader-thead">
                    <tr>
                      {["Driver", "Risk to the work", "The move", "Owner"].map((h) => (
                        <th key={h} style={{ background: NAVY, color: "#fff", textAlign: "left", fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", padding: "14px 16px", fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(leader.rows ?? []).map((r, i) => {
                      const f = facetLookup(r.item);
                      const driverName = f?.facetName ?? `Item ${r.item}`;
                      return (
                        <tr key={i} className="leader-row">
                          <td style={tdStyle} data-label="Driver"><b style={{ color: NAVY, fontSize: 16 }}>{driverName}</b></td>
                          <td style={tdStyle} data-label="Risk"><HighlightableText blockKey={`leader:risk:${i}`} text={r.risk_to_work} /></td>
                          <td style={tdStyle} data-label="The move"><HighlightableText blockKey={`leader:move:${i}`} text={r.the_move} /></td>
                          <td style={{ ...tdStyle, color: GRAY }} data-label="Owner">{r.potential_owner}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {leader.lean_on && (
                <div style={{ marginTop: 14, border: "1px solid rgba(45,106,79,.4)", background: "rgba(45,106,79,.07)", borderRadius: 12, padding: 16, color: NAVY, fontSize: 16, lineHeight: 1.6 }}>
                  <b style={{ color: GREEN }}>Lean on:</b> <HighlightableText blockKey="leader:lean_on" text={leader.lean_on} />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Full map */}
      {fullMapGroups.length > 0 && (
        <section style={{ padding: "34px 0" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 20px" }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>Every pattern we found</h2>
            <p style={{ color: MUTED, margin: "0 0 18px" }}>The full map, grouped by the five shapes above. The picture on each is the team&apos;s real spread. Hover any trait to see the question the team answered.</p>
            {fullMapGroups.map((g) => {
              const dim = activeShape && activeShape !== g.k;
              return (
                <div key={g.k} style={{ marginBottom: 22, opacity: dim ? 0.25 : 1, filter: dim ? "grayscale(.4)" : "none" }}>
                  <h4 style={{ display: "flex", alignItems: "center", gap: 10, color: NAVY, fontSize: 18, margin: "0 0 12px" }}>
                    <span style={{ width: 12, height: 12, borderRadius: "50%", background: GC[g.k] }} />
                    {g.title}
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} className="facets-grid">
                    {g.items.map((f) => {
                      const q = questionByItem.get(f.itemNumber) ?? "";
                      const scores = scoresByItem.get(f.itemNumber) ?? [];
                      return (
                        <div
                          key={f.itemNumber}
                          onMouseMove={q ? (e) => showTip(e, `Question answered: ${q}`) : undefined}
                          onMouseLeave={hideTip}
                          style={{
                            background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 16,
                            boxShadow: "0 1px 2px rgba(2,31,54,.06),0 8px 24px rgba(2,31,54,.06)",
                            padding: 12, borderTop: `3px solid ${GC[g.k]}`, cursor: "help",
                          }}
                        >
                          {scores.length > 0 && (
                            <DistGlyph
                              scores={scores}
                              color={GC[g.k]}
                              onOpen={() => openDist(scores, GC[g.k], f.facetName)}
                            />
                          )}
                          <div style={{ fontWeight: 700, color: NAVY, fontSize: 14, marginTop: 6 }}>{f.facetName}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Coach (privileged) */}
      {canSeePrivileged && coach && (
        <section style={{ padding: "34px 0" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 20px" }}>
            <div style={{
              display: "inline-block", border: `1px solid ${TEAL}`, color: TEAL, fontSize: 13,
              fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase",
              padding: "5px 12px", borderRadius: 999, marginBottom: 10,
            }}>For the coach, org admin &amp; super admin</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>Running the debrief</h2>
            <p style={{ color: MUTED, margin: "0 0 18px" }}>Facilitation material, shown to coaches and administrators.</p>
            {Array.isArray(coach.why) && coach.why.length > 0 && (
              <Acc title="The why behind each call">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {coach.why.map((w, i) => {
                    const f = facetLookup(w.item);
                    return (
                      <li key={i} style={{ marginBottom: 8 }}>
                        <b style={{ color: NAVY }}>{f?.facetName ?? `Item ${w.item}`}:</b> <HighlightableText blockKey={`coach:why:${i}`} text={w.rationale} />
                      </li>
                    );
                  })}
                </ul>
              </Acc>
            )}
            {Array.isArray(coach.debrief_prompts) && coach.debrief_prompts.length > 0 && (
              <Acc title="Conversation prompts for the debrief">
                <ol style={{ margin: 0, paddingLeft: 24, listStyleType: "decimal", listStylePosition: "outside" }}>
                  {coach.debrief_prompts.map((p, i) => <li key={i} style={{ marginBottom: 8, listStyleType: "decimal" }}><HighlightableText blockKey={`coach:debrief:${i}`} text={p} /></li>)}
                </ol>
              </Acc>
            )}
            <div style={{ color: MUTED, fontSize: 12, padding: "30px 0 60px", borderTop: `1px solid ${LINE}`, marginTop: 20 }}>
              Personal Threat Profile and the 5P model are the property of BrainWise Enterprises. Confidential.
            </div>
          </div>
        </section>
      )}

      {/* Distribution modal */}
      <DistModal
        open={!!distOpen}
        onClose={() => setDistOpen(null)}
        scores={distOpen?.scores ?? []}
        color={distOpen?.color ?? NAVY}
        title={distOpen?.title ?? "Distribution"}
      />

      {/* Tooltip */}
      {tip && (
        <div style={{
          position: "fixed", pointerEvents: "none", background: NAVY, color: "#fff",
          fontSize: 12, lineHeight: 1.4, padding: "8px 11px", borderRadius: 8,
          zIndex: 9999, maxWidth: 300, left: tip.x, top: tip.y,
        }}>{tip.text}</div>
      )}
      </TeamReportHighlightProvider>
    </div>
  );
}

const tdStyle: React.CSSProperties = {
  padding: "16px 18px", borderTop: `1px solid ${LINE}`, fontSize: 16, lineHeight: 1.6, verticalAlign: "top", color: GRAY,
};


function GenerationBanner({
  status, running, expected, done, current, failed, onRetry, canDrive,
}: {
  status: string | null;
  running: boolean;
  expected: string[];
  done: string[];
  current: string | null;
  failed: string[];
  onRetry: () => void;
  canDrive: boolean;
}) {
  if (status === "complete") return null;
  const baseCard: React.CSSProperties = {
    background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 16,
    boxShadow: "0 1px 2px rgba(2,31,54,.06),0 8px 24px rgba(2,31,54,.06)",
    padding: 16, fontSize: 16, color: "#6D6875",
  };
  if (!canDrive) {
    return <div style={baseCard}>This report is still generating. Please check back shortly.</div>;
  }
  if (running) {
    const total = expected.length || 0;
    const idx = Math.min(done.length + 1, total);
    return (
      <div style={baseCard}>
        Generating section {total > 0 ? `${idx} of ${total}` : ""}
        {current ? `: ${current.replace(/_/g, " ")}` : ""}…
      </div>
    );
  }
  if (failed.length > 0) {
    return (
      <div style={{ ...baseCard, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <span>Some sections didn&apos;t finish ({failed.join(", ")}). You can retry the missing ones.</span>
        <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
      </div>
    );
  }
  return null;
}
