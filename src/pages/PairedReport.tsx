import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { usePairedProfile, type PairedFacetResult } from "@/hooks/usePairedProfile";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNarrativeGenerator } from "@/hooks/useNarrativeGenerator";

/* ---------- palette (brand-only) ---------- */
const NAVY = "#021F36";
const TEAL = "#006D77";
const GRAY = "#6D6875";
const PURPLE = "#3C096C";
const AMBER = "#FFB703";
const GREEN = "#2D6A4F";
const MUSTARD = "#7a5800";
const ORANGE = "#F5741A";
const SAND = "#F9F7F1";
const CARD_BG = "#ffffff";
const LINE = "rgba(2,31,54,.10)";
const LINE_STRONG = "rgba(2,31,54,.18)";

const COLOR_A = NAVY;
const COLOR_B = MUSTARD;

/* dimension colors (matches PTP_DIMENSION_COLORS) */
const DIM_COLOR: Record<string, string> = {
  Protection: NAVY,
  Participation: TEAL,
  Prediction: GRAY,
  Purpose: PURPLE,
  Pleasure: AMBER,
};
/* pale tint for Pleasure radial sector and pills so amber doesn't compete with the meter */
const DIM_SECTOR_OPACITY: Record<string, number> = {
  Protection: 0.08,
  Participation: 0.08,
  Prediction: 0.08,
  Purpose: 0.08,
  Pleasure: 0.05,
};

/* pair shape mapping */
const PAIR_SHAPE_KEYS = ["farApart", "bothHigh", "bothLow", "bothMedium", "mild"] as const;
type PairShapeKey = (typeof PAIR_SHAPE_KEYS)[number];
const PSC: Record<PairShapeKey, string> = {
  farApart: MUSTARD,
  bothHigh: GREEN,
  bothLow: NAVY,
  bothMedium: TEAL,
  mild: GRAY,
};
const PAIR_SHAPE_TITLE: Record<PairShapeKey, string> = {
  farApart: "Far apart (opposite ends)",
  bothHigh: "Both high",
  bothLow: "Both low",
  bothMedium: "Both medium",
  mild: "Mild (small, soft difference)",
};
const PAIR_SHAPE_SHORT: Record<PairShapeKey, { t: string; s: string }> = {
  farApart: { t: "Far apart", s: "opposite ends" },
  bothHigh: { t: "Both high", s: "both up here" },
  bothLow: { t: "Both low", s: "neither is high" },
  bothMedium: { t: "Both medium", s: "meet in the middle" },
  mild: { t: "Mild", s: "a soft difference" },
};

function pairShapeKey(shape: string | null | undefined, a?: number, b?: number): PairShapeKey {
  const s = (shape ?? "").toLowerCase();
  if (s.includes("far apart") || s === "farapart") return "farApart";
  if (s.includes("both high")) return "bothHigh";
  if (s.includes("both low")) return "bothLow";
  if (s.includes("both medium") || s.includes("medium")) return "bothMedium";
  if (s.includes("mild")) return "mild";
  // fallback inference
  if (typeof a === "number" && typeof b === "number") {
    const diff = Math.abs(a - b);
    const mean = (a + b) / 2;
    if (diff >= 35) return "farApart";
    if (mean >= 65 && diff < 20) return "bothHigh";
    if (mean <= 35 && diff < 20) return "bothLow";
    if (diff < 12) return "bothMedium";
    return "mild";
  }
  return "mild";
}

const PRIVILEGED_ACCOUNT_TYPES = new Set([
  "org_admin",
  "company_admin",
  "brainwise_super_admin",
]);

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

/* ---------- Pair distribution glyph (two dots) ---------- */
function PairGlyph({ a, b, onOpen }: { a: number; b: number; onOpen: () => void }) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const ax = clamp(a), bx = clamp(b);
  const W = 150, H = 28, y = 14, L = 12, Rr = W - 12, span = Rr - L;
  const xa = L + span * (ax / 100), xb = L + span * (bx / 100);
  const lo = Math.min(xa, xb), hi = Math.max(xa, xb);
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      title="Click to enlarge"
      style={{ cursor: "zoom-in", display: "inline-block", borderRadius: 8, padding: 2 }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        <line x1={L} y1={y} x2={Rr} y2={y} stroke={LINE} />
        <line x1={lo.toFixed(1)} y1={y} x2={hi.toFixed(1)} y2={y} stroke={LINE_STRONG} strokeWidth={3} />
        <circle cx={xa.toFixed(1)} cy={y} r={5} fill={COLOR_A} />
        <circle cx={xb.toFixed(1)} cy={y} r={5} fill={COLOR_B} />
      </svg>
    </span>
  );
}

/* ---------- enlarge modal (labelled A and B) ---------- */
function PairDistModal({
  open, onClose, a, b, title, labA, labB,
}: { open: boolean; onClose: () => void; a: number; b: number; title: string; labA: string; labB: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const W = 600, H = 200, L = 60, Rr = W - 30, span = Rr - L, base = H - 48;
  const pts: { lab: string; v: number; c: string }[] = [
    { lab: labA, v: a, c: COLOR_A },
    { lab: labB, v: b, c: COLOR_B },
  ];
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
        <h3 style={{ margin: "0 0 2px", fontSize: 18, color: NAVY }}>{title}</h3>
        <div style={{ fontSize: 13, color: GRAY, marginBottom: 14 }}>
          {labA} and {labB}. Hover a dot to see its score.
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
          <line x1={L} y1={base} x2={Rr} y2={base} stroke={LINE_STRONG} />
          {[0, 25, 50, 75, 100].map((t) => {
            const x = L + span * (t / 100);
            return (
              <g key={t}>
                <line x1={x} y1={base} x2={x} y2={base + 6} stroke={LINE_STRONG} />
                <text x={x} y={base + 20} fontSize={11} fill={GRAY} textAnchor="middle">{t}</text>
              </g>
            );
          })}
          {pts.map(({ lab, v, c }) => {
            const x = L + span * (Math.max(0, Math.min(100, v)) / 100);
            return (
              <g key={lab}>
                <line x1={x.toFixed(1)} y1={44} x2={x.toFixed(1)} y2={base} stroke={c} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
                <circle cx={x.toFixed(1)} cy={(base - 34).toFixed(1)} r={9} fill={c}
                  onMouseMove={(e) => showTip(e, `${lab}: ${Math.round(v)}`)} onMouseLeave={hideTip}
                  style={{ cursor: "pointer" }} />
                <text x={x.toFixed(1)} y={36} fontSize={12} fill={c} textAnchor="middle" fontWeight={600}>
                  {lab} {Math.round(v)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ---------- Radial (polygon, 3 or 5 dims) ---------- */
function Radial({ dims, labA, labB }: { dims: { name: string; a: number; b: number; color: string }[]; labA: string; labB: string }) {
  const W = 380, H = 360, cx = 190, cy = 180, R = 122, N = dims.length;
  if (N < 3) return null;
  const ang = (i: number) => (-90 + i * (360 / N)) * Math.PI / 180;
  const pt = (v: number, i: number): [number, number] => [
    cx + R * (Math.max(0, Math.min(100, v)) / 100) * Math.cos(ang(i)),
    cy + R * (Math.max(0, Math.min(100, v)) / 100) * Math.sin(ang(i)),
  ];
  const sectors = dims.map((d, i) => {
    const a0 = ang(i) - Math.PI / N, a1 = ang(i) + Math.PI / N;
    const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    return (
      <path key={`s${i}`}
        d={`M${cx},${cy} L${x0.toFixed(1)},${y0.toFixed(1)} A${R},${R} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)} Z`}
        fill={d.color} opacity={DIM_SECTOR_OPACITY[d.name] ?? 0.08} />
    );
  });
  const rings = [0.33, 0.66, 1].map((r, ri) => {
    const pts = dims.map((_, i) => {
      const x = cx + R * r * Math.cos(ang(i)), y = cy + R * r * Math.sin(ang(i));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return <polygon key={`r${ri}`} points={pts} fill="none" stroke={LINE} />;
  });
  const spokes = dims.map((d, i) => {
    const x = cx + R * Math.cos(ang(i)), y = cy + R * Math.sin(ang(i));
    const lx = cx + (R + 22) * Math.cos(ang(i)), ly = cy + (R + 22) * Math.sin(ang(i));
    return (
      <g key={`sp${i}`}>
        <line x1={cx} y1={cy} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke={LINE} />
        <text x={lx.toFixed(1)} y={ly.toFixed(1)} fontSize={11} fill={d.color}
          textAnchor="middle" dominantBaseline="middle" fontWeight={600}>{d.name}</text>
      </g>
    );
  });
  const poly = (key: "a" | "b", color: string, lab: string) => {
    const pts = dims.map((d, i) => {
      const [x, y] = pt(d[key], i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return (
      <g>
        <polygon points={pts} fill={color} fillOpacity={0.10} stroke={color} strokeWidth={2} />
        {dims.map((d, i) => {
          const [x, y] = pt(d[key], i);
          return (
            <circle key={`${key}${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r={3.8} fill={color}
              onMouseMove={(e) => showTip(e, `${d.name} ${lab}: ${Math.round(d[key])}`)}
              onMouseLeave={hideTip}
              style={{ cursor: "pointer" }} />
          );
        })}
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 400, display: "block" }}>
      {sectors}
      {rings}
      {spokes}
      {poly("a", COLOR_A, labA)}
      {poly("b", COLOR_B, labB)}
    </svg>
  );
}

/* ---------- Agreement bar (A to B span) ---------- */
function AgreementBar({ d, labA, labB }: { d: { name: string; a: number; b: number; color: string }; labA: string; labB: string }) {
  const a = Math.max(0, Math.min(100, d.a));
  const b = Math.max(0, Math.min(100, d.b));
  const lo = Math.min(a, b), hi = Math.max(a, b), gap = Math.round(Math.abs(a - b));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 36px", alignItems: "center", gap: 10, margin: "8px 0" }}>
      <div style={{ fontSize: 13, fontWeight: 600, textAlign: "right", color: d.color }}>{d.name}</div>
      <div
        style={{ position: "relative", height: 16 }}
        onMouseMove={(e) => showTip(e, `${d.name}: ${labA} ${Math.round(a)}, ${labB} ${Math.round(b)} (gap ${gap})`)}
        onMouseLeave={hideTip}
      >
        <div style={{ position: "absolute", top: 7, left: 0, right: 0, height: 2, background: LINE, borderRadius: 2 }} />
        <div style={{ position: "absolute", top: 6, left: `${lo}%`, width: `${hi - lo}%`, height: 4, background: LINE_STRONG, borderRadius: 2 }} />
        <div style={{ position: "absolute", top: 3, left: `${a}%`, width: 10, height: 10, borderRadius: "50%", background: COLOR_A, transform: "translateX(-5px)" }} />
        <div style={{ position: "absolute", top: 3, left: `${b}%`, width: 10, height: 10, borderRadius: "50%", background: COLOR_B, transform: "translateX(-5px)" }} />
      </div>
      <div style={{ fontSize: 13, color: GRAY, textAlign: "right" }}>{gap}</div>
    </div>
  );
}

/* ---------- meter ---------- */
function Meter({ tier, kind }: { tier: number; kind: "strength" | "watch" }) {
  const color = kind === "strength" ? GREEN : AMBER;
  return (
    <span style={{ display: "inline-flex", gap: 3, marginLeft: 8, verticalAlign: "middle" }}>
      {[0, 1, 2, 3].map((i) => (
        <i key={i} style={{ width: 9, height: 5, borderRadius: 1, display: "inline-block", background: i < tier ? color : LINE }} />
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
interface DriverCardProps {
  kind: "strength" | "watch";
  rank?: number;
  shape: PairShapeKey;
  label: string;
  name: string;
  why: string;
  actions: string[];
  question: string;
  a?: number;
  b?: number;
  tier: number;
  onOpenDist: (a: number, b: number, title: string) => void;
}
function DriverCard({
  kind, rank, shape, label, name, why, actions, question, a, b, tier, onOpenDist,
}: DriverCardProps) {
  const [open, setOpen] = useState(false);
  const accent = kind === "strength" ? GREEN : PSC[shape];
  return (
    <div
      onMouseMove={question ? (e) => showTip(e, `Question answered: ${question}`) : undefined}
      onMouseLeave={hideTip}
      style={{
        background: kind === "strength" ? "linear-gradient(0deg,rgba(45,106,79,.05),rgba(45,106,79,.05)),#fff" : CARD_BG,
        border: `1px solid ${LINE}`,
        borderLeft: `6px solid ${accent}`,
        borderRadius: 14,
        boxShadow: "0 1px 2px rgba(2,31,54,.04)",
        padding: "18px 20px",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: 16, alignItems: "start" }} className="dr-grid">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {kind === "strength"
            ? <span style={{ color: GREEN, fontSize: 22 }}>★</span>
            : (
              <span style={{
                background: NAVY, color: "#fff", width: 22, height: 22, borderRadius: "50%",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
              }}>{rank}</span>
            )}
          {typeof a === "number" && typeof b === "number" && (
            <PairGlyph a={a} b={b} onOpen={() => onOpenDist(a, b, name)} />
          )}
        </div>
        <div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase",
            padding: "3px 9px", borderRadius: 999,
            background: kind === "strength" ? "rgba(45,106,79,.12)" : "rgba(255,183,3,.16)",
            color: kind === "strength" ? GREEN : MUSTARD,
          }}>
            {label}
            <Meter tier={tier} kind={kind} />
          </span>
          <div style={{ fontWeight: 700, fontSize: 18, color: NAVY, margin: "8px 0 4px" }}>{name}</div>
          <div style={{ color: GRAY, fontSize: 15, lineHeight: 1.6, maxWidth: "70ch" }}>{why}</div>
          {actions.length > 0 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
                style={{
                  marginTop: 10, border: 0, background: "none", color: TEAL, fontWeight: 600,
                  fontSize: 13, cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <span style={{ display: "inline-block", transition: ".15s", transform: open ? "rotate(90deg)" : "none" }}>▸</span>
                See three things to {kind === "strength" ? "keep doing" : "try"}
              </button>
              <div style={{ maxHeight: open ? 400 : 0, overflow: "hidden", transition: ".2s", marginTop: open ? 10 : 0, opacity: open ? 1 : 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
                  {kind === "strength" ? "Three things to keep doing" : "Three things to try"}
                </div>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  {actions.map((act, i) => (
                    <li key={i} style={{ fontSize: 15, margin: "4px 0", lineHeight: 1.6 }}>{act}</li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- collapsible accordion ---------- */
function Acc({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, marginBottom: 8, background: "#fff" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{
        width: "100%", textAlign: "left", background: "none", border: 0, padding: "12px 14px",
        fontWeight: 600, fontSize: 14, color: NAVY, cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{title}</span>
        <span style={{ color: TEAL, transition: ".15s", transform: open ? "rotate(90deg)" : "none" }}>▸</span>
      </button>
      <div style={{ maxHeight: open ? 600 : 0, overflow: "hidden", transition: ".2s", padding: open ? "0 14px 14px" : "0 14px" }}>
        {children}
      </div>
    </div>
  );
}

/* ---------- section types ---------- */
interface PairInThreeItem { headline: string; detail: string; action: string; }
interface DrivingItem { item: number; why: string; actions?: string[]; action?: string; }
interface DrivingFacetsSection { opening: string; strengths: DrivingItem[]; focus: DrivingItem[]; }
interface WithinPersonSection { a: string; b: string; }
interface NeedsSection { a_needs_from_b: string; b_needs_from_a: string; }
interface CommunicationSection { general: string; under_pressure: string; avoid_conflict: string[]; }
interface ConflictSection { summary: string; mitigate: string; promote_healthy: string; }
interface RepairSection { overview: string; a: string; b: string; steps: string[]; disclaimer: string; }
interface IntimacySection { overview: string; a: string[]; b: string[]; disclaimer: string; }
interface CoachSection { why: { item: number; rationale: string }[]; debrief_prompts: string[]; }

function modeTitle(mode: string | null): string {
  if (mode === "work") return "Work Paired Report";
  if (mode === "personal") return "Personal Paired Report";
  if (mode === "romantic") return "Romantic Paired Report";
  return "Paired Report";
}

const ROMANTIC_DEFAULT_DISCLAIMER =
  "This reflects tendencies from a self-report profile, not a diagnosis or a verdict on the relationship. If any pattern here involves fear, control, or harm, please reach out to a qualified professional.";

/* ---------- page ---------- */
export default function PairedReport() {
  const { pairedProfileId } = useParams<{ pairedProfileId: string }>();
  const {
    loading, noAccess, profile, mode, sections, status,
    refetchSections, refetchProfile,
  } = usePairedProfile(pairedProfileId);
  const { profile: userProfile } = useUserProfile();

  const canSeePrivileged =
    !!userProfile &&
    (userProfile.is_practitioner_coach ||
      PRIVILEGED_ACCOUNT_TYPES.has(userProfile.account_type ?? ""));

  const generator = useNarrativeGenerator({
    kind: "paired",
    id: pairedProfileId,
    status,
    enabled: canSeePrivileged,
    onSectionDone: async () => {
      await refetchSections();
      await refetchProfile();
    },
  });

  /* question text */
  const [questionByItem, setQuestionByItem] = useState<Map<number, string>>(new Map());
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

  /* subject names (gated RPC) */
  const [nameA, setNameA] = useState<string>("Person A");
  const [nameB, setNameB] = useState<string>("Person B");
  useEffect(() => {
    if (!pairedProfileId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.rpc("bw_paired_profile_subjects" as never, { p_profile: pairedProfileId } as never);
        if (cancelled) return;
        const rows = (data ?? []) as Array<{ pair_role: "A" | "B"; full_name: string }>;
        const a = rows.find((r) => r.pair_role === "A")?.full_name;
        const b = rows.find((r) => r.pair_role === "B")?.full_name;
        if (a) setNameA(a);
        if (b) setNameB(b);
      } catch {
        // keep fallbacks
      }
    })();
    return () => { cancelled = true; };
  }, [pairedProfileId]);
  const firstA = nameA.split(" ")[0] || "Person A";
  const firstB = nameB.split(" ")[0] || "Person B";
  const nm = useCallback(
    (s: string) => (s ?? "").split("Person A").join(firstA).split("Person B").join(firstB),
    [firstA, firstB],
  );

  /* paragraph splitter */
  const splitParas = useCallback((raw: string): string[] => {
    const s = (raw ?? "").trim();
    if (!s) return [];
    if (/\n{2,}/.test(s)) return s.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    const sentences = s.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)?.map((x) => x.trim()).filter(Boolean) ?? [s];
    if (sentences.length < 2) return [s];
    const mid = Math.ceil(sentences.length / 2);
    return [sentences.slice(0, mid).join(" "), sentences.slice(mid).join(" ")];
  }, []);
  const Paras = ({ text, style }: { text: string; style?: React.CSSProperties }) => {
    const paras = splitParas(nm(text));
    return (
      <>
        {paras.map((p, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : "10px 0 0", fontSize: 16, lineHeight: 1.6, maxWidth: "70ch", ...style }}>{p}</p>
        ))}
      </>
    );
  };

  /* tooltip & modal */
  const tip = useTipController();
  const [distOpen, setDistOpen] = useState<{ a: number; b: number; title: string } | null>(null);
  const openDist = useCallback((a: number, b: number, title: string) => {
    setDistOpen({ a, b, title });
  }, []);

  /* responsive */
  useEffect(() => {
    const s = document.createElement("style");
    s.innerHTML = `
      @media (max-width: 720px) {
        .dr-grid { grid-template-columns: 1fr !important; }
        .two-grid { grid-template-columns: 1fr !important; }
        .three-grid { grid-template-columns: 1fr !important; }
        .glyphrow-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .facets-grid { grid-template-columns: 1fr !important; }
        .rad-flex { flex-direction: column !important; }
      }
    `;
    document.head.appendChild(s);
    return () => { s.remove(); };
  }, []);

  /* derived */
  const isRomantic = mode === "romantic";

  const dims = useMemo(() => {
    const all = profile?.structured?.dimensions ?? {};
    const order = ["Protection", "Participation", "Prediction", "Purpose", "Pleasure"].filter((d) => all[d] != null);
    return order.map((name) => ({
      name,
      a: Math.round(all[name]?.a ?? 0),
      b: Math.round(all[name]?.b ?? 0),
      color: DIM_COLOR[name] ?? NAVY,
    }));
  }, [profile]);

  const facetLookup = (item: number): PairedFacetResult | undefined =>
    profile?.structured?.facets?.find((f) => f.itemNumber === item) ??
    profile?.structured?.strengths?.find((f) => f.itemNumber === item) ??
    profile?.structured?.focusAreas?.find((f) => f.itemNumber === item) ??
    profile?.structured?.fullMap?.find((f) => f.itemNumber === item);

  const pairInThree = sections["pair_in_three"] as PairInThreeItem[] | undefined;
  const driving = sections["driving_facets"] as DrivingFacetsSection | undefined;
  const within = sections["within_person"] as WithinPersonSection | undefined;
  const needs = sections["needs"] as NeedsSection | undefined;
  const communication = sections["communication"] as CommunicationSection | undefined;
  const conflict = sections["conflict"] as ConflictSection | undefined;
  const repair = sections["repair"] as RepairSection | undefined;
  const intimacy = sections["intimacy"] as IntimacySection | undefined;
  const coach = sections["coach"] as CoachSection | undefined;

  /* full map groups */
  const fullMapGroups = useMemo(() => {
    const full = profile?.structured?.fullMap ?? profile?.structured?.facets ?? [];
    const buckets: Record<PairShapeKey, PairedFacetResult[]> = {
      farApart: [], bothHigh: [], bothLow: [], bothMedium: [], mild: [],
    };
    for (const f of full) buckets[pairShapeKey(f.shape, f.stats?.a, f.stats?.b)].push(f);
    return PAIR_SHAPE_KEYS.filter((k) => buckets[k].length > 0).map((k) => ({
      k, items: buckets[k],
    }));
  }, [profile]);

  const [activeShape, setActiveShape] = useState<PairShapeKey | null>(null);

  /* ---------- early returns ---------- */
  if (loading) {
    return (
      <div style={{ background: SAND, minHeight: "100vh", padding: 24 }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }} className="space-y-4">
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
        <div style={{ maxWidth: 880, margin: "0 auto", background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 14, padding: 24, textAlign: "center", color: GRAY }}>
          You do not have access to this paired report.
        </div>
      </div>
    );
  }

  /* driver lists */
  const strengthFacets = profile.structured?.strengths ?? [];
  const focusFacets = profile.structured?.focusAreas ?? [];

  const strengthDrivers = strengthFacets.map((f, i) => {
    const src = driving?.strengths?.[i];
    const actions = src?.actions ?? (src?.action ? [src.action] : []);
    return {
      kind: "strength" as const,
      shape: pairShapeKey(f.shape, f.stats?.a, f.stats?.b),
      label: i === 0 ? "Start here · your strength" : "Strength",
      name: f.facetName,
      why: src?.why ?? "",
      actions,
      question: questionByItem.get(f.itemNumber) ?? "",
      a: f.stats?.a,
      b: f.stats?.b,
      tier: tierFromDriver(f.driverScore),
    };
  });
  const focusDrivers = focusFacets.map((f, idx) => {
    const src = driving?.focus?.[idx];
    const actions = src?.actions ?? (src?.action ? [src.action] : []);
    const sev = f.driverScore ?? 0;
    let label = "Worth watching";
    if (sev >= 0.7) label = "Watch closely";
    else if (sev >= 0.4) label = "Watch";
    else label = "Quiet but real";
    return {
      kind: "watch" as const,
      rank: idx + 1,
      shape: pairShapeKey(f.shape, f.stats?.a, f.stats?.b),
      label,
      name: f.facetName,
      why: src?.why ?? "",
      actions,
      question: questionByItem.get(f.itemNumber) ?? "",
      a: f.stats?.a,
      b: f.stats?.b,
      tier: tierFromDriver(f.driverScore),
    };
  });

  const sectionLabel: React.CSSProperties = {
    fontSize: 26, fontWeight: 800, color: NAVY, margin: "34px 0 6px",
  };
  const sectionLead: React.CSSProperties = {
    color: GRAY, maxWidth: 760, margin: "0 0 18px",
  };
  const boxLabel: React.CSSProperties = {
    fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase",
    fontWeight: 800, marginBottom: 8, color: NAVY,
  };
  const cardStyle: React.CSSProperties = {
    background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 14,
    padding: "18px 20px", marginBottom: 14, boxShadow: "0 1px 2px rgba(2,31,54,.04)",
  };
  const pbox: React.CSSProperties = {
    border: `1px solid ${LINE}`, borderRadius: 10, padding: "13px 15px",
  };

  return (
    <div style={{ background: SAND, color: NAVY, fontFamily: 'Montserrat, system-ui, sans-serif', lineHeight: 1.6, fontSize: 16, minHeight: "100vh" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 18px 80px" }}>
        {/* Hero */}
        <div style={{ background: NAVY, color: "#fff", borderRadius: "0 0 20px 20px", margin: "0 -18px 0", padding: "30px 28px 56px" }}>
          <div style={{ color: ORANGE, fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
            BrainWise · Paired Profile
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: 30 }}>{modeTitle(mode)}</h1>
          <div style={{ color: "rgba(255,255,255,.72)", fontSize: 14 }}>
            How the two of you fit, where you pull apart, and what to do about it.
          </div>
          <div style={{ display: "flex", gap: 26, marginTop: 16, flexWrap: "wrap" }}>
            {[
              { k: "PAIR", v: `${nameA} & ${nameB}` },
              { k: "CONTEXT", v: mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : "" },
              { k: "DIMENSIONS", v: dims.length === 3 ? "Three" : dims.length === 5 ? "All five" : `${dims.length}` },
              { k: "GENERATED", v: new Date().toLocaleDateString(undefined, { year: "numeric", month: "short" }) },
            ].map((m) => (
              <div key={m.k} style={{ fontSize: 13, color: "rgba(255,255,255,.72)" }}>
                {m.k}
                <b style={{ display: "block", color: "#fff", fontSize: 15, fontWeight: 600, marginTop: 2 }}>{m.v}</b>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, color: "rgba(255,255,255,.85)" }}>
              <span style={{ width: 13, height: 13, borderRadius: "50%", background: COLOR_A, display: "inline-block" }} />{nameA}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, color: "rgba(255,255,255,.85)" }}>
              <span style={{ width: 13, height: 13, borderRadius: "50%", background: COLOR_B, display: "inline-block" }} />{nameB}
            </span>
          </div>
        </div>

        {/* pair in three (overlap) */}
        {Array.isArray(pairInThree) && pairInThree.length > 0 && (
          <div style={{ margin: "-34px -2px 0", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} className="three-grid">
            {pairInThree.slice(0, 3).map((t, i) => (
              <div key={i} style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, boxShadow: "0 6px 18px rgba(2,31,54,.08)" }}>
                <div style={{ color: ORANGE, fontWeight: 800, fontSize: 22 }}>{i + 1}</div>
                <div style={{ fontWeight: 700, margin: "6px 0 4px", fontSize: 18 }}>{nm(t.headline)}</div>
                <div style={{ fontSize: 15, color: GRAY, lineHeight: 1.6 }}>{nm(t.detail)}</div>
                {t.action && <div style={{ color: TEAL, fontWeight: 600, fontSize: 14, marginTop: 8 }}>{nm(t.action)}</div>}
              </div>
            ))}
          </div>
        )}

        {/* status banner */}
        {status !== "complete" && (
          <div style={{ marginTop: 20 }}>
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

        {/* romantic disclaimer */}
        {isRomantic && (
          <div style={{
            background: "#fff", border: `1px solid ${AMBER}`, borderLeft: `5px solid ${AMBER}`,
            borderRadius: 10, padding: "12px 16px", fontSize: 14, color: MUSTARD, marginTop: 14, marginBottom: 14,
          }}>
            {ROMANTIC_DEFAULT_DISCLAIMER}
          </div>
        )}

        {/* Radial */}
        {dims.length >= 3 && (
          <>
            <h2 style={sectionLabel}>The two of you at a glance</h2>
            <div style={cardStyle}>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }} className="rad-flex">
                <Radial dims={dims} labA={nameA} labB={nameB} />
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 14, color: GRAY, marginBottom: 8, lineHeight: 1.6 }}>
                    Each axis is one dimension. The two outlines are {nameA} and {nameB}. The bars show how far apart you sit on each one.
                  </div>
                  <div>
                    {dims.map((d) => <AgreementBar key={d.name} d={d} labA={nameA} labB={nameB} />)}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
                <span style={{ fontSize: 13, color: GRAY, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 13, height: 13, borderRadius: "50%", background: COLOR_A, display: "inline-block" }} />{nameA}
                </span>
                <span style={{ fontSize: 13, color: GRAY, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 13, height: 13, borderRadius: "50%", background: COLOR_B, display: "inline-block" }} />{nameB}
                </span>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
                {dims.map((d) => (
                  <span key={d.name} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 5, color: GRAY }}>
                    <i style={{ width: 9, height: 9, borderRadius: 2, display: "inline-block", background: d.color }} />{d.name}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}



        {/* shape glyphs */}
        <h2 style={sectionLabel}>The shapes a pair can make</h2>
        <div style={cardStyle}>
          <div style={{ fontSize: 13, color: GRAY, marginBottom: 10 }}>
            Every trait below falls into one of these. Tap one to highlight it in the full map.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }} className="glyphrow-grid">
            {PAIR_SHAPE_KEYS.map((k) => {
              const sample: Record<PairShapeKey, [number, number]> = {
                farApart: [84, 26], bothHigh: [78, 74], bothLow: [22, 26], bothMedium: [52, 55], mild: [50, 60],
              };
              const [sa, sb] = sample[k];
              const meta = PAIR_SHAPE_SHORT[k];
              const active = activeShape === k;
              return (
                <div
                  key={k}
                  onClick={() => setActiveShape((a) => (a === k ? null : k))}
                  style={{
                    background: "#fff", border: `1px solid ${active ? NAVY : LINE}`,
                    borderRadius: 12, padding: "12px 10px", textAlign: "center", cursor: "pointer",
                    boxShadow: active ? `0 0 0 2px rgba(2,31,54,.12)` : "none", transition: ".12s",
                  }}
                >
                  <PairGlyph a={sa} b={sb} onOpen={() => openDist(sa, sb, meta.t)} />
                  <div style={{ fontWeight: 700, fontSize: 13, marginTop: 6 }}>{meta.t}</div>
                  <div style={{ fontSize: 11, color: GRAY, marginTop: 2 }}>{meta.s}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* drivers */}
        {(strengthDrivers.length > 0 || focusDrivers.length > 0) && (
          <>
            <h2 style={sectionLabel}>What is driving your pair</h2>
            {driving?.opening && (
              <div style={sectionLead}><Paras text={driving.opening} style={{ color: GRAY }} /></div>
            )}
            {[...strengthDrivers, ...focusDrivers].map((d, i) => (
              <DriverCard
                key={i}
                {...d}
                why={nm(d.why)}
                actions={d.actions.map(nm)}
                onOpenDist={openDist}
              />
            ))}
          </>
        )}

        {/* within */}
        {within && (
          <>
            <h2 style={sectionLabel}>What is going on inside each of you</h2>
            <div style={cardStyle}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="two-grid">
                <div style={pbox}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: COLOR_A }}>{nameA}</div>
                  <Paras text={within.a} />
                </div>
                <div style={pbox}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: COLOR_B }}>{nameB}</div>
                  <Paras text={within.b} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* needs */}
        {needs && (
          <>
            <h2 style={sectionLabel}>What each of you needs from the other</h2>
            <div style={cardStyle}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="two-grid">
                <div style={pbox}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: COLOR_A }}>What {firstA} needs from {firstB}</div>
                  <Paras text={needs.a_needs_from_b} />
                </div>
                <div style={pbox}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: COLOR_B }}>What {firstB} needs from {firstA}</div>
                  <Paras text={needs.b_needs_from_a} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* communication */}
        {communication && (
          <>
            <h2 style={sectionLabel}>How the two of you communicate</h2>
            <div style={cardStyle}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>In general</div>
                <Paras text={communication.general} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Under pressure</div>
                <Paras text={communication.under_pressure} />
              </div>
              {Array.isArray(communication.avoid_conflict) && communication.avoid_conflict.length > 0 && (
                <div style={{ marginTop: 10, borderRadius: 10, padding: "13px 16px", fontSize: 15, background: "rgba(0,109,119,.07)", border: "1px solid rgba(0,109,119,.25)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>To avoid communication conflict</div>
                  <ol style={{ margin: 0, paddingLeft: 22, listStyleType: "decimal" }}>
                    {communication.avoid_conflict.map((t, i) => (
                      <li key={i} style={{ margin: "4px 0", lineHeight: 1.6 }}>{nm(t)}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </>
        )}

        {/* conflict */}
        {conflict && (
          <>
            <h2 style={sectionLabel}>How the two of you handle conflict</h2>
            <div style={cardStyle}>
              <div style={{ marginBottom: 10 }}><Paras text={conflict.summary} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="two-grid">
                <div style={pbox}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Mitigate the unhealthy kind</div>
                  <Paras text={conflict.mitigate} />
                </div>
                <div style={pbox}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Promote the healthy kind</div>
                  <Paras text={conflict.promote_healthy} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* repair (romantic only) */}
        {isRomantic && repair && (
          <>
            <h2 style={sectionLabel}>Repair after conflict</h2>
            <div style={cardStyle}>
              <div style={{ marginBottom: 10 }}><Paras text={repair.overview} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="two-grid">
                <div style={pbox}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: COLOR_A }}>{nameA}</div>
                  <Paras text={repair.a} />
                </div>
                <div style={pbox}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: COLOR_B }}>{nameB}</div>
                  <Paras text={repair.b} />
                </div>
              </div>
              {Array.isArray(repair.steps) && repair.steps.length > 0 && (
                <div style={{ marginTop: 12, borderRadius: 10, padding: "13px 16px", fontSize: 15, background: "rgba(0,109,119,.07)", border: "1px solid rgba(0,109,119,.25)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>A repair sequence for you</div>
                  <ol style={{ margin: 0, paddingLeft: 22, listStyleType: "decimal" }}>
                    {repair.steps.map((t, i) => (
                      <li key={i} style={{ margin: "4px 0", lineHeight: 1.6 }}>{nm(t)}</li>
                    ))}
                  </ol>
                </div>
              )}
              <div style={{ fontSize: 13, color: GRAY, fontStyle: "italic", marginTop: 10 }}>
                {repair.disclaimer || ROMANTIC_DEFAULT_DISCLAIMER}
              </div>
            </div>
          </>
        )}

        {/* intimacy (romantic only) */}
        {isRomantic && intimacy && (
          <>
            <h2 style={sectionLabel}>Building intimacy</h2>
            <div style={cardStyle}>
              <div style={{ marginBottom: 10 }}><Paras text={intimacy.overview} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="two-grid">
                <div style={pbox}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: COLOR_A }}>{nameA}</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 15, lineHeight: 1.6 }}>
                    {(intimacy.a ?? []).map((t, i) => <li key={i} style={{ margin: "4px 0" }}>{nm(t)}</li>)}
                  </ul>
                </div>
                <div style={pbox}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: COLOR_B }}>{nameB}</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 15, lineHeight: 1.6 }}>
                    {(intimacy.b ?? []).map((t, i) => <li key={i} style={{ margin: "4px 0" }}>{nm(t)}</li>)}
                  </ul>
                </div>
              </div>
              <div style={{ fontSize: 13, color: GRAY, fontStyle: "italic", marginTop: 10 }}>
                {intimacy.disclaimer || ROMANTIC_DEFAULT_DISCLAIMER}
              </div>
            </div>
          </>
        )}


        {/* full map */}
        {fullMapGroups.length > 0 && (
          <>
            <h2 style={sectionLabel}>Every pattern between you</h2>
            {fullMapGroups.map((g) => {
              const dim = activeShape && activeShape !== g.k;
              return (
                <div key={g.k} style={{ marginBottom: 14, opacity: dim ? 0.3 : 1 }}>
                  <h4 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, margin: "0 0 8px", color: NAVY }}>
                    <span style={{ width: 11, height: 11, borderRadius: 3, display: "inline-block", background: PSC[g.k] }} />
                    {PAIR_SHAPE_TITLE[g.k]}
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }} className="facets-grid">
                    {g.items.map((f) => {
                      const q = questionByItem.get(f.itemNumber) ?? "";
                      const a = f.stats?.a, b = f.stats?.b;
                      return (
                        <div
                          key={f.itemNumber}
                          onMouseMove={q ? (e) => showTip(e, `Question answered: ${q}`) : undefined}
                          onMouseLeave={hideTip}
                          style={{
                            border: `1px solid ${LINE}`, borderTop: `3px solid ${PSC[g.k]}`,
                            borderRadius: 10, padding: "11px 13px", background: "#fff", cursor: "help",
                          }}
                        >
                          {typeof a === "number" && typeof b === "number" && (
                            <PairGlyph a={a} b={b} onOpen={() => openDist(a, b, f.facetName)} />
                          )}
                          <div style={{ fontWeight: 600, fontSize: 13, marginTop: 4 }}>{f.facetName}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* coach (privileged) */}
        {canSeePrivileged && coach && (
          <>
            <h2 style={sectionLabel}>For the coach or admin only</h2>
            {Array.isArray(coach.why) && coach.why.length > 0 && (
              <Acc title="Why these were flagged" defaultOpen>
                {coach.why.map((w, i) => {
                  const f = facetLookup(w.item);
                  return (
                    <div key={i} style={{ fontSize: 14, margin: "6px 0", lineHeight: 1.6 }}>
                      <b>{f?.facetName ?? `Item ${w.item}`}.</b> {nm(w.rationale)}
                    </div>
                  );
                })}
              </Acc>
            )}
            {Array.isArray(coach.debrief_prompts) && coach.debrief_prompts.length > 0 && (
              <Acc title="Debrief prompts">
                <ol style={{ margin: "6px 0", paddingLeft: 22, listStyleType: "decimal" }}>
                  {coach.debrief_prompts.map((p, i) => (
                    <li key={i} style={{ fontSize: 14, margin: "4px 0", lineHeight: 1.6 }}>{nm(p)}</li>
                  ))}
                </ol>
              </Acc>
            )}
          </>
        )}
      </div>

      {/* distribution modal */}
      <PairDistModal
        open={!!distOpen}
        onClose={() => setDistOpen(null)}
        a={distOpen?.a ?? 0}
        b={distOpen?.b ?? 0}
        title={distOpen?.title ?? "Distribution"}
        labA={nameA}
        labB={nameB}
      />


      {/* tooltip */}
      {tip && (
        <div style={{
          position: "fixed", pointerEvents: "none", background: NAVY, color: "#fff",
          fontSize: 12, lineHeight: 1.4, padding: "8px 11px", borderRadius: 8,
          zIndex: 9999, maxWidth: 300, left: tip.x, top: tip.y,
        }}>{tip.text}</div>
      )}
    </div>
  );
}

/* ---------- Generation banner ---------- */
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
  const base: React.CSSProperties = {
    background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 14,
    boxShadow: "0 1px 2px rgba(2,31,54,.04)", padding: 16, fontSize: 14, color: GRAY,
  };
  if (!canDrive) {
    return <div style={base}>This report is still generating. Please check back shortly.</div>;
  }
  if (running) {
    const total = expected.length || 0;
    const idx = Math.min(done.length + 1, total);
    return (
      <div style={base}>
        Generating section {total > 0 ? `${idx} of ${total}` : ""}
        {current ? `: ${current.replace(/_/g, " ")}` : ""}…
      </div>
    );
  }
  if (failed.length > 0) {
    return (
      <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <span>Some sections didn&apos;t finish ({failed.join(", ")}). You can retry the missing ones.</span>
        <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
      </div>
    );
  }
  return null;
}
