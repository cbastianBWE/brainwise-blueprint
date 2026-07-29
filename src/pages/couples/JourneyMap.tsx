import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TerrainDesktop, TerrainPhone } from "./journey/JourneyTerrain";
import ModuleBriefingDialog from "./journey/ModuleBriefingDialog";
import ActivityBriefingDialog from "./journey/ActivityBriefingDialog";
import {
  minuteRange,
  type CatalogueActivity,
  type ModuleRow as BriefingModuleRow,
} from "./journey/journeyShared";


/* ------------------------------------------------------------------ *
 * Geometry and glyphs — ported verbatim from the approved artifact.
 * Do not "simplify" the thread offsets or the marker separation: they
 * are what keeps both partners visible at every state.
 * ------------------------------------------------------------------ */

const ICONS: Record<string, [string, string, string]> = {
  flag: ["M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z", "M4 22v-7", ""],
  users: [
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
    "M13 7a4 4 0 1 1-8 0 4 4 0 1 1 8 0",
    "M16 3.13a4 4 0 0 1 0 7.75M22 21v-2a4 4 0 0 0-3-3.87",
  ],
  heart: [
    "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
    "",
    "",
  ],
  zap: [
    "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
    "",
    "",
  ],
  rings: [
    "M15 12a5.5 5.5 0 1 1-11 0 5.5 5.5 0 1 1 11 0",
    "M20 12a5.5 5.5 0 1 1-11 0 5.5 5.5 0 1 1 11 0",
    "",
  ],
  coins: ["M14 8a6 6 0 1 1-12 0 6 6 0 1 1 12 0", "M18.09 10.37A6 6 0 1 1 10.34 18", "M7 6h1v4"],
  sprout: [
    "M7 20h10",
    "M10 20c5.5-2.5.8-6.4 3-10",
    "M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8zM14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z",
  ],
  mountain: ["m8 3 4 8 5-5 5 15H2L8 3z", "", ""],
};

// Stop glyphs, in module order.
const STOP_ICONS = ["flag", "users", "heart", "zap", "rings", "coins", "sprout", "mountain"];

type Pt = { x: number; y: number };

const PP: Pt[] = [
  { x: 150, y: 70 },
  { x: 262, y: 232 },
  { x: 124, y: 396 },
  { x: 258, y: 560 },
  { x: 126, y: 724 },
  { x: 260, y: 888 },
  { x: 124, y: 1052 },
  { x: 236, y: 1216 },
];

const DP: Pt[] = [
  { x: 96, y: 300 },
  { x: 240, y: 158 },
  { x: 386, y: 342 },
  { x: 540, y: 172 },
  { x: 694, y: 356 },
  { x: 848, y: 182 },
  { x: 1002, y: 330 },
  { x: 1156, y: 150 },
];

const PHONE_W = 390;
const PHONE_H = 1330;
const DESK_W = 1240;
const DESK_H = 580;

const GROUND = "#F9F7F1";
const ROUTE = "#021F36";
const ACCENT = "#F5741A";

const MARKER_COLORS: Array<{ hex: string; label: string }> = [
  { hex: "#006D77", label: "Teal" },
  { hex: "#3C096C", label: "Purple" },
  { hex: "#FFB703", label: "Amber" },
  { hex: "#2D6A4F", label: "Green" },
  { hex: "#6D6875", label: "Slate" },
];

function seg(a: Pt, b: Pt, vert: boolean): string {
  return vert
    ? ` C ${a.x} ${a.y + (b.y - a.y) * 0.55} ${b.x} ${b.y - (b.y - a.y) * 0.55} ${b.x} ${b.y}`
    : ` C ${a.x + (b.x - a.x) * 0.55} ${a.y} ${b.x - (b.x - a.x) * 0.55} ${b.y} ${b.x} ${b.y}`;
}

function road(pts: Pt[], vert: boolean): string {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) d += seg(pts[i - 1], pts[i], vert);
  return d;
}

function thread(pts: Pt[], upto: number, off: number, vert: boolean): string {
  if (!upto || upto < 1) return "";
  const p = pts
    .slice(0, upto + 1)
    .map((q) => (vert ? { x: q.x + off, y: q.y } : { x: q.x, y: q.y + off }));
  let d = `M ${p[0].x} ${p[0].y}`;
  for (let i = 1; i < p.length; i++) d += seg(p[i - 1], p[i], vert);
  return d;
}

/* ------------------------------------------------------------------ *
 * Data types
 * ------------------------------------------------------------------ */

interface JourneyRow {
  activity_id: string;
  code: string;
  title: string;
  module_number: number;
  sequence: number;
  allowed: boolean;
  /** Machine key plus payload. Never rendered. */
  reason: string | null;
  reason_code: string | null;
  reason_detail: string[] | null;
  own_status: string | null;
  partner_status: string | null;
  reveal_pending: boolean | null;
  est_minutes_low: number | null;
  est_minutes_high: number | null;
}

type ModuleRow = BriefingModuleRow;

type Side = { cur: number; done: number[] };

const isDone = (s: string | null | undefined) => s === "completed";


/* ------------------------------------------------------------------ *
 * Fit logic — ported, including the 0.42 floor and 0.004 hysteresis.
 * ------------------------------------------------------------------ */

function useFit(base: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current;
      if (!el) return;
      const w = el.clientWidth;
      if (!w) return;
      // Ceiling raised above the artifact's 1.0: the map should use a large
      // screen rather than sit at a fixed size. Hysteresis keeps the
      // ResizeObserver and the scale from feeding each other.
      const sc = Math.min(1.6, Math.max(0.42, w / base));
      setScale((prev) => (Math.abs(sc - prev) > 0.004 ? sc : prev));
    };
    fit();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && ref.current) {
      ro = new ResizeObserver(fit);
      ro.observe(ref.current);
    } else {
      window.addEventListener("resize", fit);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", fit);
    };
  }, [base]);

  return { ref, scale };
}

/* ------------------------------------------------------------------ *
 * Small pieces
 * ------------------------------------------------------------------ */

function Glyph({ name, ink }: { name: string; ink: string }) {
  const paths = ICONS[name] || ICONS.flag;
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke={ink}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths.filter(Boolean).map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

// Terrain lives in ./journey/JourneyTerrain — decoration only, never state.


/* ------------------------------------------------------------------ *
 * The map
 * ------------------------------------------------------------------ */

export function JourneyMap({
  relationshipId,
  showTexture = true,
  className,
}: {
  relationshipId: string;
  showTexture?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<JourneyRow[] | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueActivity[]>([]);
  const [selfName, setSelfName] = useState("You");
  const [otherName, setOtherName] = useState("Your partner");
  const [colorA, setColorA] = useState("#006D77");
  const [colorB, setColorB] = useState("#3C096C");
  const [open, setOpen] = useState<number | null>(null);
  // Activity briefing stacks over the milestone dialog; closing it returns
  // to the milestone list rather than dismissing both.
  const [openActivity, setOpenActivity] = useState<string | null>(null);
  const [colorNote, setColorNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadColors = useCallback(async () => {
    const { data } = await supabase.rpc("relationship_marker_colors", {
      p_relationship: relationshipId,
    });
    const list = (data as Array<{ marker_color: string; is_self: boolean }>) || [];
    const mine = list.find((r) => r.is_self);
    const theirs = list.find((r) => !r.is_self);
    if (mine?.marker_color) setColorA(mine.marker_color);
    if (theirs?.marker_color) setColorB(theirs.marker_color);
  }, [relationshipId]);

  useEffect(() => {
    if (!relationshipId) return;
    let cancelled = false;
    (async () => {
      const [state, names, mods, acts] = await Promise.all([
        supabase.rpc("relationship_journey_state", { p_relationship: relationshipId }),
        supabase.rpc("relationship_first_names", { p_relationship: relationshipId }),
        (supabase as any)
          .from("relationship_modules")
          .select(
            "module_number,title,description,learning_outcomes,tags,prerequisites,hero_image_url",
          )
          .eq("active", true)
          .order("module_number"),
        (supabase as any)
          .from("relationship_activities")
          .select(
            "id,code,title,module_number,sequence,tags,hero_image_url,definition,est_minutes_low,est_minutes_high",
          )
          .eq("status", "published"),
      ]);
      if (cancelled) return;
      setRows(((state.data as JourneyRow[]) || []).slice().sort(
        (a, b) => a.module_number - b.module_number || a.sequence - b.sequence,
      ));
      const n = (names.data as any[])?.[0];
      if (n?.active_first_name) setSelfName(n.active_first_name);
      if (n?.other_first_name) setOtherName(n.other_first_name);
      // Catalogue reads are enrichment only — a failure degrades the map,
      // it must never blank it.
      if (!mods.error && Array.isArray(mods.data)) setModules(mods.data as ModuleRow[]);
      if (!acts.error && Array.isArray(acts.data))
        setCatalogue(acts.data as CatalogueActivity[]);
      await loadColors();
    })();
    return () => {
      cancelled = true;
    };
  }, [relationshipId, loadColors]);

  const catalogueByCode = useMemo(() => {
    const m = new Map<string, CatalogueActivity>();
    for (const a of catalogue) m.set(a.code, a);
    return m;
  }, [catalogue]);

  const stopsData = useMemo(() => {
    const list = modules.slice(0, 8);
    return list.map((m, i) => {
      const acts = (rows || []).filter((r) => r.module_number === m.module_number);
      return {
        index: i,
        // Display ordinal, 1-based. `module_number` stays zero-based.
        position: i + 1,
        moduleNumber: m.module_number,
        module: m,
        title: m.title || `Milestone ${i + 1}`,
        description: m.description || "",
        icon: STOP_ICONS[i] || "flag",
        count: acts.length,
        acts,
      };
    });
  }, [modules, rows]);


  const { a, b } = useMemo<{ a: Side; b: Side }>(() => {
    const doneFor = (idx: number, key: "own_status" | "partner_status") => {
      const acts = stopsData[idx]?.acts || [];
      return acts.length > 0 && acts.every((r) => isDone(r[key]));
    };
    const build = (key: "own_status" | "partner_status"): Side => {
      const done: number[] = [];
      stopsData.forEach((_, i) => {
        if (doneFor(i, key)) done.push(i);
      });
      const first = stopsData.findIndex((_, i) => !doneFor(i, key));
      return { cur: first < 0 ? Math.max(0, stopsData.length - 1) : first, done };
    };
    return { a: build("own_status"), b: build("partner_status") };
  }, [stopsData]);

  const phone = useFit(PHONE_W);
  const desk = useFit(DESK_W);

  const pickColor = async (hex: string) => {
    if (hex === colorA || saving) return;
    setSaving(true);
    setColorNote(null);
    const { data, error } = await supabase.rpc("relationship_set_marker_color", {
      p_relationship: relationshipId,
      p_color: hex,
    });
    setSaving(false);
    if (error) return;
    const res = data as { ok?: boolean; error?: string; marker_color?: string } | null;
    if (res?.ok && res.marker_color) {
      setColorA(res.marker_color);
      return;
    }
    if (res?.error === "taken_by_partner") {
      setColorNote(`${otherName} has that one`);
    }
    // colour_not_allowed: fail quietly.
  };

  if (!rows || stopsData.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const same = a.cur === b.cur;
  const openStop = open != null ? stopsData[open] : null;
  const openActivityRow = openActivity
    ? (rows || []).find((r) => r.code === openActivity) || null
    : null;

  // Blocking activities arrive as titles, so pills resolve by title.
  const lookupByTitle = (title: string) => {
    const t = title.trim().toLowerCase();
    const hit = (rows || []).find((r) => r.title.trim().toLowerCase() === t);
    return hit ? { code: hit.code, allowed: hit.allowed } : null;
  };
  const siblingsOf = (moduleNumber: number, exceptCode?: string) =>
    (rows || [])
      .filter((r) => r.module_number === moduleNumber && r.code !== exceptCode)
      .map((r) => r.title);

  const dotFor = (i: number, side: Side, color: string) =>
    side.done.includes(i) ? color : side.cur === i ? `${color}73` : "#DCD7C8";

  const renderRail = (pts: Pt[], vert: boolean) => {
    const norm = same ? 0 : vert ? 42 : 44;
    const tang = same ? (vert ? 44 : 46) : 0;
    const pa = pts[Math.min(a.cur, pts.length - 1)];
    const pb = pts[Math.min(b.cur, pts.length - 1)];
    const markers = [
      {
        key: "a",
        color: colorA,
        letter: (selfName[0] || "Y").toUpperCase(),
        x: vert ? pa.x - norm : pa.x - tang,
        y: vert ? pa.y - tang : pa.y - norm,
      },
      {
        key: "b",
        color: colorB,
        letter: (otherName[0] || "P").toUpperCase(),
        x: vert ? pb.x + norm : pb.x + tang,
        y: vert ? pb.y + tang : pb.y + norm,
      },
    ];

    return (
      <>
        <svg
          className="absolute inset-0"
          width={vert ? PHONE_W : DESK_W}
          height={vert ? PHONE_H : DESK_H}
          viewBox={`0 0 ${vert ? PHONE_W : DESK_W} ${vert ? PHONE_H : DESK_H}`}
          aria-hidden
        >
          {showTexture && (vert ? <TerrainPhone /> : <TerrainDesktop />)}
          <path
            d={road(pts, vert)}
            fill="none"
            stroke={ROUTE}
            strokeOpacity={0.14}
            strokeWidth={20}
            strokeLinecap="round"
          />
          <path
            d={road(pts, vert)}
            fill="none"
            stroke={ROUTE}
            strokeOpacity={0.35}
            strokeWidth={2}
            strokeDasharray="6 10"
            strokeLinecap="round"
          />
          {/* Both threads are always drawn. Neither partner is ever hidden. */}
          <path
            d={thread(pts, a.cur, -7, vert)}
            fill="none"
            stroke={colorA}
            strokeWidth={4}
            strokeLinecap="round"
            className="om-flow"
          />
          <path
            d={thread(pts, b.cur, 7, vert)}
            fill="none"
            stroke={colorB}
            strokeWidth={4}
            strokeLinecap="round"
            className="om-flow"
          />
          {same &&
            (vert ? (
              <line
                x1={pa.x}
                y1={pa.y - 44}
                x2={pa.x}
                y2={pa.y + 44}
                stroke={ROUTE}
                strokeOpacity={0.45}
                strokeWidth={2}
              />
            ) : (
              <line
                x1={pa.x - 46}
                y1={pa.y}
                x2={pa.x + 46}
                y2={pa.y}
                stroke={ROUTE}
                strokeOpacity={0.45}
                strokeWidth={2}
              />
            ))}
        </svg>

        {stopsData.map((s, i) => {
          const pt = pts[i];
          const both = a.done.includes(i) && b.done.includes(i);
          const touched = a.done.includes(i) || b.done.includes(i) || a.cur === i || b.cur === i;
          const now = a.cur === i || b.cur === i;
          const right = vert ? pt.x < 195 : false;
          const ink = both ? GROUND : touched ? ROUTE : "#B5B1B9";
          return (
            <div key={s.moduleNumber}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={`${s.title}, milestone ${s.position} of ${stopsData.length}`}
                className="om-stop absolute flex items-center justify-center rounded-full"
                style={{
                  left: pt.x - 28,
                  top: pt.y - 28,
                  width: 56,
                  height: 56,
                  background: both ? ROUTE : touched ? "#FFFFFF" : "#FDFCF8",
                  border: both
                    ? `2px solid ${ROUTE}`
                    : touched
                      ? `2px solid ${ROUTE}`
                      : "1.5px dashed #C9C4CE",
                  boxShadow: now
                    ? "0 0 0 5px rgba(245,116,26,0.20), 0 8px 20px rgba(2,31,54,0.12)"
                    : "0 2px 6px rgba(2,31,54,0.08)",
                  animation: now ? "omPulse 3000ms ease-in-out infinite" : "none",
                }}
              >
                <Glyph name={s.icon} ink={ink} />
                <span
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold"
                  style={{
                    background: touched ? ROUTE : "#E4DFD3",
                    color: touched ? GROUND : "#8E8995",
                  }}
                >
                  {i + 1}
                </span>
              </button>

              {/* Label. Markers are the higher-priority object, so the label
                  is pushed clear of the marker band: a partner marker sits
                  ±44 from the stop centre with a 15px radius, so anything
                  closer than 68px collides with it. */}
              <div
                className="pointer-events-none absolute"
                style={{
                  left: vert ? (right ? pt.x + 68 : 12) : pt.x - 78,
                  top: vert ? pt.y - 22 : pt.y < 250 ? pt.y - 120 : pt.y + 72,
                  width: vert ? (right ? PHONE_W - (pt.x + 68) - 12 : pt.x - 68 - 12) : 156,
                  textAlign: vert ? (right ? "left" : "right") : "center",
                }}
              >
                <p
                  className="text-[13px] font-semibold leading-tight"
                  style={{ color: touched ? ROUTE : "#8E8995" }}
                >
                  {s.title}
                </p>
                <p className="text-[11px]" style={{ color: "#8E8995" }}>
                  {s.count} {s.count === 1 ? "activity" : "activities"}
                </p>
                <span
                  className="mt-1 inline-flex items-center gap-1.5"
                  style={{
                    opacity: a.cur === i && b.cur === i ? 0 : 1,
                    justifyContent: vert ? (right ? "flex-start" : "flex-end") : "center",
                  }}
                >
                  <i
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: dotFor(i, a, colorA) }}
                  />
                  <i
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: dotFor(i, b, colorB) }}
                  />
                </span>
              </div>
            </div>
          );
        })}

        {markers.map((m) => (
          <div
            key={m.key}
            className="om-drift absolute flex items-center justify-center rounded-full text-[11px] font-semibold"
            style={{
              left: m.x - 15,
              top: m.y - 15,
              width: 30,
              height: 30,
              background: m.color,
              color: "#FFFFFF",
              boxShadow: "0 4px 10px rgba(2,31,54,0.25)",
              border: "2px solid #FFFFFF",
            }}
            aria-hidden
          >
            {m.letter}
          </div>
        ))}
      </>
    );
  };

  return (
    <div className={className}>
      <style>{`
        @keyframes omPulse { 0%,100% { box-shadow: 0 0 0 5px rgba(245,116,26,0.20), 0 8px 20px rgba(2,31,54,0.12); } 50% { box-shadow: 0 0 0 11px rgba(245,116,26,0.06), 0 8px 20px rgba(2,31,54,0.12); } }
        @keyframes omFlow { to { stroke-dashoffset: -24; } }
        @keyframes omDot { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        @keyframes omDrift { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-2px) } }
        .om-map .om-drift { animation: omDrift 4200ms ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .om-map * { animation: none !important; } }
      `}</style>

      <div className="om-map rounded-xl p-3 md:p-4" style={{ background: GROUND }}>
        {/* Phone rail */}
        <div ref={phone.ref} className="md:hidden">
          <div style={{ height: Math.round(PHONE_H * phone.scale), overflow: "hidden" }}>
            <div
              className="relative"
              style={{
                width: PHONE_W,
                height: PHONE_H,
                transform: `scale(${phone.scale})`,
                transformOrigin: "top left",
              }}
            >
              {renderRail(PP, true)}
            </div>
          </div>
        </div>

        {/* Desktop rail */}
        <div ref={desk.ref} className="hidden md:block">
          <div style={{ height: Math.round(DESK_H * desk.scale), overflow: "hidden" }}>
            <div
              className="relative"
              style={{
                width: DESK_W,
                height: DESK_H,
                transform: `scale(${desk.scale})`,
                transformOrigin: "top left",
              }}
            >
              {renderRail(DP, false)}
            </div>
          </div>
        </div>

        {/* Legend + marker colour */}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-3 text-xs" style={{ borderColor: "#E4DFD3" }}>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: colorA }} />
            <span style={{ color: ROUTE }}>
              {selfName} · {a.done.length} of {stopsData.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: colorB }} />
            <span style={{ color: ROUTE }}>
              {otherName} · {b.done.length} of {stopsData.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: "#8E8995" }}>Your marker</span>
            {MARKER_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => pickColor(c.hex)}
                aria-label={c.label}
                aria-pressed={colorA === c.hex}
                disabled={saving}
                className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c.hex,
                  outline: colorA === c.hex ? `2px solid ${ROUTE}` : "none",
                  outlineOffset: 2,
                }}
              />
            ))}
            {colorNote && <span style={{ color: ACCENT }}>{colorNote}</span>}
          </div>
        </div>
      </div>

      {/* Milestone briefing — the same dialog Browse uses, plus the activity
          list, so a milestone looks identical from either route. */}
      <ModuleBriefingDialog
        open={open != null}
        onOpenChange={(v) => !v && setOpen(null)}
        moduleNumber={openStop ? openStop.position : 1}
        totalModules={stopsData.length}
        module={openStop?.module ?? null}
        activityCount={openStop?.acts.length ?? 0}
        minutes={minuteRange(openStop?.acts ?? [])}
        startCode={openStop?.acts.find((r) => r.allowed)?.code ?? null}
        blockedReason={openStop?.acts.find((r) => !r.allowed && r.reason)?.reason ?? null}
        blockedReasonCode={openStop?.acts.find((r) => !r.allowed)?.reason_code ?? null}
        blockedReasonDetail={openStop?.acts.find((r) => !r.allowed)?.reason_detail ?? null}
        otherName={otherName}
        lookupByTitle={lookupByTitle}
        onStart={(code) => {
          setOpen(null);
          navigate(`/couples/${relationshipId}/activity/${code}`);
        }}
        activities={(openStop?.acts ?? []).map((r) => ({
          id: r.activity_id,
          code: r.code,
          title: r.title,
          allowed: r.allowed,
          reason: r.reason,
          reason_code: r.reason_code,
          reason_detail: r.reason_detail,
          own_status: r.own_status,
          partner_status: r.partner_status,
        }))}
        onActivitySelect={(code) => setOpenActivity(code)}
        onActivityOpen={(code) => {
          setOpen(null);
          navigate(`/couples/${relationshipId}/activity/${code}`);
        }}
        selfColor={colorA}
        partnerColor={colorB}
      />

      <ActivityBriefingDialog
        open={openActivity != null}
        onOpenChange={(v) => !v && setOpenActivity(null)}
        state={
          openActivityRow
            ? {
                code: openActivityRow.code,
                title: openActivityRow.title,
                allowed: openActivityRow.allowed,
                reason: openActivityRow.reason,
                reason_code: openActivityRow.reason_code,
                reason_detail: openActivityRow.reason_detail,
                own_status: openActivityRow.own_status,
                partner_status: openActivityRow.partner_status,
                reveal_pending: openActivityRow.reveal_pending ?? null,
                est_minutes_low: openActivityRow.est_minutes_low ?? null,
                est_minutes_high: openActivityRow.est_minutes_high ?? null,
              }
            : null
        }
        catalogue={openActivity ? catalogueByCode.get(openActivity) || null : null}
        moduleTitle={openStop?.title ?? null}
        otherName={otherName}
        siblingTitles={
          openActivityRow ? siblingsOf(openActivityRow.module_number, openActivityRow.code) : []
        }
        lookupByTitle={lookupByTitle}
        onOpenActivity={setOpenActivity}
        onGo={(code) => {
          setOpenActivity(null);
          setOpen(null);
          navigate(`/couples/${relationshipId}/activity/${code}`);
        }}
      />

    </div>
  );
}

export default function JourneyMapPage() {
  const { relationshipId } = useParams<{ relationshipId: string }>();
  if (!relationshipId) return null;
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Your map</h1>
        <p className="text-sm text-muted-foreground">
          Where each of you is standing on the road. Tap a stop to see what is inside it.
        </p>
      </header>
      <JourneyMap relationshipId={relationshipId} />
    </div>
  );
}
