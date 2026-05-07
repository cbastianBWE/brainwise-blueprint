import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface AirsaCombinedReportProps {
  assessmentResultId: string;
  assessmentId: string;
  userFullName: string | null;
  completedAt: string | null;
  instrumentVersion: string | null;
  isCoachView: boolean;
  canTakeAssessments: boolean;
}

// Brand palette — used for accent stripes and chart colors only.
const AIRSA_COLORS = {
  navy: "#021F36",
  teal: "#006D77",
  green: "#2D6A4F",
  gray: "#6D6875",
  purple: "#3C096C",
  orange: "#F5741A",
};

const STATUS_COLORS: Record<string, { color: string; label: string }> = {
  aligned:            { color: "#006D77", label: "Aligned" },
  confirmed_strength: { color: "#2D6A4F", label: "Confirmed strength" },
  confirmed_gap:      { color: "#6D6875", label: "Confirmed gap" },
  blind_spot:         { color: "#021F36", label: "Blind spot" },
  underestimate:      { color: "#3C096C", label: "Underestimate" },
};

const DOMAIN_NAMES: Record<string, string> = {
  "DIM-AIRSA-01": "Domain 1",
  "DIM-AIRSA-02": "Domain 2",
  "DIM-AIRSA-03": "Domain 3",
  "DIM-AIRSA-04": "Domain 4",
  "DIM-AIRSA-05": "Domain 5",
  "DIM-AIRSA-06": "Domain 6",
  "DIM-AIRSA-07": "Domain 7",
  "DIM-AIRSA-08": "Domain 8",
};

const REQUIRED_AI_SECTIONS = [
  "airsa_profile_overview",
  "airsa_what_this_means",
  "airsa_action_plan",
  "airsa_conversation_guide",
  "airsa_top_priorities",
];

const LEVEL_INDEX: Record<string, number> = {
  Foundational: 0,
  Proficient: 1,
  Advanced: 2,
};

// ───────────────────────────── Design tokens ─────────────────────────────

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 18,
  fontWeight: 600,
  color: "var(--fg-1)",
  margin: 0,
  marginBottom: "var(--s-4)",
  letterSpacing: "-0.01em",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--fg-3)",
  margin: 0,
  marginTop: -8,
  marginBottom: "var(--s-4)",
};

const cardSurface: React.CSSProperties = {
  background: "var(--bw-white)",
  border: "1px solid var(--border-1)",
  borderRadius: "var(--r-md)",
  padding: "var(--s-5)",
  boxShadow: "var(--shadow-sm)",
};

const accentCardSurface = (accent: string): React.CSSProperties => ({
  background: "var(--bw-white)",
  border: "1px solid var(--border-1)",
  borderLeft: `4px solid ${accent}`,
  borderRadius: "var(--r-md)",
  padding: "var(--s-5)",
  boxShadow: "var(--shadow-sm)",
});

const subtleCardSurface: React.CSSProperties = {
  background: "var(--bw-white)",
  border: "1px solid var(--border-1)",
  borderRadius: "var(--r-md)",
  padding: "var(--s-4)",
  boxShadow: "var(--shadow-xs)",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--fg-3)",
};

const cardTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 15,
  fontWeight: 600,
  color: "var(--fg-1)",
  margin: 0,
  marginBottom: "var(--s-2)",
  letterSpacing: "-0.01em",
};

interface SkillBreakdown {
  skill_number: number;
  skill_name: string;
  skill_description: string;
  dimension_id: string;
  domain_name: string;
  self_level: string;
  manager_level: string;
  self_response: string | null;
  manager_response: string | null;
  delta: number;
  direction: string;
  status: string;
}

interface PageData {
  result: {
    dimension_scores: Record<string, { readiness_level: string }>;
    manager_dimension_scores: Record<string, { readiness_level: string }> | null;
    self_manager_divergence: Record<string, {
      self_level: string;
      manager_level: string;
      delta: number;
      direction: string;
      status: string;
    }> | null;
    skill_level_breakdown: Record<string, SkillBreakdown> | null;
  };
  sections: Record<string, any>;
  newSkillFlags: Record<number, boolean>;
}

// ───────────────────────────── SkillReference ─────────────────────────────

function SkillReference({
  numbers,
  breakdown,
  children,
}: {
  numbers: number[];
  breakdown: Record<string, SkillBreakdown> | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const skills = numbers
    .map((n) => breakdown?.[String(n)])
    .filter(Boolean) as SkillBreakdown[];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!skills.length) {
    return <span>{children}</span>;
  }

  return (
    <span
      ref={ref}
      role="button"
      tabIndex={0}
      aria-describedby={open ? "skillref-popover" : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen((o) => !o);
        }
      }}
      style={{
        position: "relative",
        cursor: "help",
        textDecoration: "underline dotted",
        textDecorationColor: AIRSA_COLORS.teal,
        textUnderlineOffset: 2,
        outline: "none",
      }}
      className="focus-visible:ring-2 focus-visible:ring-offset-1 rounded-sm"
    >
      {children}
      {open && (
        <span
          id="skillref-popover"
          role="tooltip"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 60,
            marginTop: 6,
            background: "var(--bw-white)",
            border: "1px solid var(--border-1)",
            borderRadius: "var(--r-sm)",
            boxShadow: "var(--shadow-md)",
            padding: "var(--s-3)",
            width: 320,
            maxWidth: "90vw",
            fontSize: 14,
            color: "var(--fg-1)",
            whiteSpace: "normal",
            textAlign: "left",
            textDecoration: "none",
          }}
        >
          {skills.map((s) => (
            <div key={s.skill_number} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>
                Skill {s.skill_number}. {s.skill_name}
              </div>
              <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 4 }}>
                {s.domain_name}
              </div>
              <div style={{ color: "var(--fg-2)" }}>{s.skill_description}</div>
            </div>
          ))}
        </span>
      )}
    </span>
  );
}

// Regex post-processor for "Skill N" / "Skills 7, 8, 9"
function processSkillRefs(text: string, breakdown: Record<string, SkillBreakdown> | null): React.ReactNode[] {
  if (!text) return [];
  const re = /Skills?\s+(\d+(?:\s*(?:,\s*and\s+|,\s*|\s+and\s+)\d+)*)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const nums = m[1]
      .split(/\s*(?:,\s*and\s+|,\s*|\s+and\s+)\s*/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
    parts.push(
      <SkillReference key={`sr-${key++}`} numbers={nums} breakdown={breakdown}>
        {m[0]}
      </SkillReference>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function ProseParagraphs({ text, breakdown }: { text: string; breakdown: Record<string, SkillBreakdown> | null }) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p
          key={i}
          style={{
            margin: 0,
            marginBottom: i === paragraphs.length - 1 ? 0 : 12,
            lineHeight: 1.65,
            color: "var(--fg-2)",
            fontSize: 14,
          }}
        >
          {processSkillRefs(p, breakdown)}
        </p>
      ))}
    </>
  );
}

function SkeletonLines({ lines }: { lines: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

// ───────────────────────────── Main component ─────────────────────────────

export default function AirsaCombinedReport({
  assessmentResultId,
  assessmentId,
  userFullName,
  completedAt,
  instrumentVersion,
  isCoachView,
  canTakeAssessments,
}: AirsaCombinedReportProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollTick, setPollTick] = useState(0);
  const [selfOnlySkillList, setSelfOnlySkillList] = useState<Array<{
    item_number: number;
    skill_name: string;
    short_description: string;
    dimension_id: string;
  }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [arRes, secRes, skillRes] = await Promise.all([
        supabase
          .from("assessment_results")
          .select("dimension_scores, manager_dimension_scores, self_manager_divergence, skill_level_breakdown")
          .eq("id", assessmentResultId)
          .single(),
        supabase
          .from("facet_interpretations")
          .select("section_type, facet_data")
          .eq("assessment_result_id", assessmentResultId)
          .like("section_type", "airsa_%"),
        supabase.from("airsa_skills").select("item_number, is_new_skill"),
      ]);

      if (cancelled) return;

      const sectionMap: Record<string, any> = {};
      (secRes.data ?? []).forEach((r: any) => {
        if (r.section_type) sectionMap[r.section_type] = r.facet_data;
      });

      const newFlagMap: Record<number, boolean> = {};
      (skillRes.data ?? []).forEach((s: any) => {
        if (s.item_number !== null) newFlagMap[s.item_number] = !!s.is_new_skill;
      });

      setData({
        result: arRes.data as any,
        sections: sectionMap,
        newSkillFlags: newFlagMap,
      });
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [assessmentResultId, pollTick]);

  useEffect(() => {
    if (!data) return;
    const allReady = REQUIRED_AI_SECTIONS.every((s) => s in data.sections);
    if (allReady) return;
    const t = setTimeout(() => setPollTick((c) => c + 1), 8000);
    return () => clearTimeout(t);
  }, [data]);

  const isSelfOnly =
    !data?.result?.self_manager_divergence ||
    !data?.result?.skill_level_breakdown ||
    Object.keys(data?.result?.skill_level_breakdown ?? {}).length === 0;

  // Self-only skill list fallback for Section 14
  useEffect(() => {
    if (!data || !isSelfOnly || selfOnlySkillList) return;
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from("airsa_skills")
        .select("item_number, skill_name, short_description, dimension_id")
        .order("item_number");
      if (!cancelled && rows) setSelfOnlySkillList(rows as any);
    })();
    return () => { cancelled = true; };
  }, [data, isSelfOnly, selfOnlySkillList]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const breakdown = data.result.skill_level_breakdown;
  const skillsArr: SkillBreakdown[] = breakdown
    ? Object.values(breakdown).sort((a, b) => a.skill_number - b.skill_number)
    : [];

  // ── Section 2 metrics ──
  const totalSkills = skillsArr.length || 24;
  const alignedCount = skillsArr.filter((s) =>
    ["aligned", "confirmed_strength", "confirmed_gap"].includes(s.status)
  ).length;
  const alignmentPct = isSelfOnly ? null : Math.round((alignedCount / totalSkills) * 100);
  const confirmedStrengths = skillsArr.filter((s) => s.status === "confirmed_strength").length;
  const blindSpots = skillsArr.filter((s) => s.status === "blind_spot").length;
  const underestimates = skillsArr.filter((s) => s.status === "underestimate").length;

  // ── AI section accessors ──
  const sec = data.sections;
  const overview = sec.airsa_profile_overview;
  const wtm = sec.airsa_what_this_means;
  const action = sec.airsa_action_plan;
  const guide = sec.airsa_conversation_guide;
  const priorities = sec.airsa_top_priorities;
  const cross = sec.airsa_cross_instrument;

  const prioritySkillNumbers = useMemo(() => {
    const arr = priorities?.content;
    if (!Array.isArray(arr)) return new Set<number>();
    return new Set<number>(
      arr.map((p: any) => p.skill_number).filter((n: any) => typeof n === "number")
    );
  }, [priorities]);

  const footerMeta =
    overview ?? wtm ?? action ?? guide ?? priorities ?? cross ?? null;

  return (
    <div className="space-y-8">
      {/* ───── Section 1: Header ───── */}
      <section style={{ marginBottom: "var(--s-2)" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 700,
            color: "var(--fg-1)",
            margin: 0,
            marginBottom: 4,
            letterSpacing: "-0.02em",
          }}
        >
          {userFullName ? `${userFullName} — ` : ""}AI Readiness Skills Assessment
        </h1>
        <p style={{ fontSize: 13, color: "var(--fg-3)", margin: 0 }}>
          {completedAt ? format(new Date(completedAt), "MMMM d, yyyy") : "—"}
          {instrumentVersion ? ` · Version ${instrumentVersion}` : ""}
        </p>
      </section>

      {isSelfOnly && (
        <div
          style={{
            ...accentCardSurface(AIRSA_COLORS.gray),
            background: "var(--bw-cream)",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: "var(--fg-2)" }}>
            Your manager rating did not arrive. This report shows your self-rating only;
            cross-rater divergence views are unavailable.
          </p>
        </div>
      )}

      {/* ───── Section 2: At a glance ───── */}
      <section>
        <h2 style={sectionHeadingStyle}>At a glance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Alignment", value: isSelfOnly ? "—" : `${alignmentPct}%` },
            { label: "Confirmed strengths", value: isSelfOnly ? "—" : String(confirmedStrengths) },
            { label: "Blind spots", value: isSelfOnly ? "—" : String(blindSpots) },
            { label: "Underestimates", value: isSelfOnly ? "—" : String(underestimates) },
          ].map((c) => (
            <div key={c.label} style={cardSurface}>
              <div style={{ ...eyebrowStyle, margin: 0 }}>{c.label}</div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "var(--bw-navy)",
                  marginTop: 4,
                  letterSpacing: "-0.01em",
                }}
              >
                {c.value}
              </div>
              {isSelfOnly && (
                <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>
                  (manager rating not received)
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ───── Section 3: Action buttons ───── */}
      <section className="flex flex-wrap" style={{ gap: "var(--s-3)" }}>
        <Button variant="outline" onClick={() => alert("PDF export coming soon")}>
          <FileText className="mr-2 h-4 w-4" /> Export PDF
        </Button>
        {!isCoachView && canTakeAssessments && (
          <>
            <Button variant="outline" onClick={() => navigate("/assessment?instrument=INST-003")}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retake Assessment
            </Button>
            <Button onClick={() => navigate("/assessment")}>
              Take Another Assessment
            </Button>
          </>
        )}
      </section>

      {/* ───── Section 4: How to read your results ───── */}
      <section>
        <h2 style={sectionHeadingStyle}>How to read your results</h2>
        <div style={cardSurface}>
          <div style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.65 }}>
            <p style={{ margin: "0 0 12px 0" }}>
              The AIRSA assesses 24 AI readiness skills across 8 domains, grounded in the
              C.A.F.E.S. neuroscience framework (Certainty, Agency, Fairness, Ego stability,
              Saturation) and the 5 Ps of the Personal Threat Profile (Protection, Participation,
              Prediction, Purpose, Pleasure). The dual-rater methodology pairs your self-rating
              with your manager's rating to surface where you see eye-to-eye and where you don't.
            </p>
            <p style={{ margin: "0 0 12px 0" }}>
              Each item asks how often you demonstrate that skill on a 4-level frequency scale:
              Never, Rarely, Often, Consistently. The 4-level frequency response maps to a
              3-level readiness output:
            </p>
            <ul style={{ margin: "0 0 12px 18px", color: "var(--fg-2)" }}>
              <li><strong style={{ color: "var(--fg-1)" }}>Foundational</strong> — Never or Rarely</li>
              <li><strong style={{ color: "var(--fg-1)" }}>Proficient</strong> — Often</li>
              <li><strong style={{ color: "var(--fg-1)" }}>Advanced</strong> — Consistently</li>
            </ul>
            <p style={{ margin: "0 0 12px 0" }}>
              Comparing your rating with your manager's produces five possible status outcomes:
            </p>
            <ul style={{ margin: "0 0 12px 18px", color: "var(--fg-2)" }}>
              <li><strong style={{ color: "var(--fg-1)" }}>Aligned</strong> — both rated you Proficient</li>
              <li><strong style={{ color: "var(--fg-1)" }}>Confirmed strength</strong> — both rated you Advanced</li>
              <li><strong style={{ color: "var(--fg-1)" }}>Confirmed gap</strong> — both rated you Foundational</li>
              <li><strong style={{ color: "var(--fg-1)" }}>Blind spot</strong> — you rated yourself higher than your manager did</li>
              <li><strong style={{ color: "var(--fg-1)" }}>Underestimate</strong> — your manager rated you higher than you rated yourself</li>
            </ul>
            <p style={{ margin: 0 }}>
              Differences matter as much as agreements. Where ratings line up, you have shared
              ground to plan from. Where they diverge, you have information you couldn't get from
              either rating alone.
            </p>
          </div>
        </div>
      </section>

      {/* ───── Section 5: Domain heatmap ───── */}
      <section>
        <h2 style={sectionHeadingStyle}>Domain heatmap</h2>
        <div style={{ ...cardSurface, padding: 0, overflow: "hidden" }}>
          <DomainHeatmap
            dimensionScores={data.result.dimension_scores}
            managerScores={data.result.manager_dimension_scores}
            divergence={data.result.self_manager_divergence}
            breakdown={breakdown}
            isSelfOnly={isSelfOnly}
          />
        </div>
      </section>

      {/* ───── Section 6: Profile overview (AI) ───── */}
      <section>
        <h2 style={sectionHeadingStyle}>Profile overview</h2>
        <div style={accentCardSurface("var(--bw-navy)")}>
          {overview?.content ? (
            <ProseParagraphs text={String(overview.content)} breakdown={breakdown} />
          ) : (
            <SkeletonLines lines={4} />
          )}
        </div>
      </section>

      {/* ───── Section 7: What does this mean to me? ───── */}
      <WhatThisMeans data={wtm?.content} breakdown={breakdown} isSelfOnly={isSelfOnly} />

      {/* ───── Section 8: Action plan ───── */}
      <ActionPlan data={action?.content} breakdown={breakdown} />

      {/* ───── Section 9: Lollipop ───── */}
      <LollipopChart skills={skillsArr} priorityFlags={prioritySkillNumbers} breakdown={breakdown} isSelfOnly={isSelfOnly} />

      {/* ───── Section 10: Conversation guide ───── */}
      <ConversationGuide data={guide?.content} breakdown={breakdown} />

      {/* ───── Section 11: Top 3 priorities ───── */}
      <TopPriorities
        data={priorities?.content}
        breakdown={breakdown}
      />

      {/* ───── Section 12: Cross-instrument ───── */}
      <CrossInstrument
        content={cross?.content ? String(cross.content) : null}
        breakdown={breakdown}
        isCoachView={isCoachView}
        canTakeAssessments={canTakeAssessments}
        onNavigate={(p) => navigate(p)}
      />

      {/* ───── Section 13: Skill reference list ───── */}
      <SkillReferenceList
        breakdown={breakdown}
        isSelfOnly={isSelfOnly}
        selfOnlySkills={selfOnlySkillList}
      />

      {/* ───── Section 14: Methodology footer ───── */}
      <section
        style={{
          marginTop: "var(--s-6)",
          paddingTop: "var(--s-4)",
          borderTop: "1px solid var(--border-1)",
        }}
      >
        <div style={{ fontSize: 11, color: "var(--fg-3)", lineHeight: 1.55, maxWidth: 720 }}>
          <p style={{ margin: "0 0 8px 0" }}>
            The AIRSA assesses 24 AI readiness skills across 8 domains using a dual-rater
            methodology. Readiness levels (Foundational, Proficient, Advanced) are derived
            from response patterns on a 4-level frequency scale (Never, Rarely, Often,
            Consistently).
          </p>
          <p style={{ margin: "0 0 8px 0" }}>
            The framework is grounded in the C.A.F.E.S. neuroscience model and the 5 Ps of
            the Personal Threat Profile, drawing on research from the Oxford Brain Institute
            and the NeuroLeadership Journal (Rock, Dixon, Ochsner 2010; Dixon 2019).
          </p>
          <p style={{ margin: "0 0 8px 0" }}>
            Interpretations in this report are reflective tools, not diagnostic instruments.
          </p>
          <p style={{ margin: 0 }}>
            Report generated{" "}
            {footerMeta?.generated_at
              ? format(new Date(footerMeta.generated_at), "MMMM d, yyyy")
              : "—"}
            {" · AI version: "}
            {footerMeta?.ai_version ?? "—"}
          </p>
        </div>
      </section>
    </div>
  );
}

// ───────────────────────────── Sub-components ─────────────────────────────

function DomainHeatmap({
  dimensionScores,
  managerScores,
  divergence,
  breakdown,
  isSelfOnly,
}: {
  dimensionScores: Record<string, { readiness_level: string }>;
  managerScores: Record<string, { readiness_level: string }> | null;
  divergence: Record<string, { status: string }> | null;
  breakdown: Record<string, SkillBreakdown> | null;
  isSelfOnly: boolean;
}) {
  const dimIds = Object.keys(DOMAIN_NAMES);
  const domainNameFor = (id: string) => {
    if (breakdown) {
      const found = Object.values(breakdown).find((s) => s.dimension_id === id);
      if (found?.domain_name) return found.domain_name;
    }
    return DOMAIN_NAMES[id] ?? id;
  };

  const statusCounts = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    if (!breakdown) return m;
    for (const s of Object.values(breakdown)) {
      m[s.dimension_id] ||= {};
      m[s.dimension_id][s.status] = (m[s.dimension_id][s.status] ?? 0) + 1;
    }
    return m;
  }, [breakdown]);

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "var(--s-3) var(--s-4)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: 600,
  };
  const tdStyle: React.CSSProperties = {
    padding: "var(--s-3) var(--s-4)",
    borderBottom: "1px solid var(--border-1)",
    fontSize: 14,
    color: "var(--fg-2)",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "var(--bw-navy)", color: "var(--bw-white)" }}>
          <tr>
            <th style={thStyle}>Domain</th>
            <th style={thStyle}>Self level</th>
            {!isSelfOnly && <th style={thStyle}>Manager level</th>}
            {!isSelfOnly && <th style={{ ...thStyle, minWidth: 160 }}>Status</th>}
            {!isSelfOnly && <th style={thStyle}>Skills by status</th>}
          </tr>
        </thead>
        <tbody>
          {dimIds.map((id) => {
            const self = dimensionScores?.[id]?.readiness_level ?? "—";
            const mgr = managerScores?.[id]?.readiness_level ?? "—";
            const status = divergence?.[id]?.status;
            const counts = statusCounts[id] ?? {};
            return (
              <tr key={id}>
                <td style={{ ...tdStyle, color: "var(--fg-1)", fontWeight: 500 }}>
                  {domainNameFor(id)}
                </td>
                <td style={tdStyle}>{self}</td>
                {!isSelfOnly && <td style={tdStyle}>{mgr}</td>}
                {!isSelfOnly && (
                  <td style={tdStyle}>
                    {status && STATUS_COLORS[status] ? (
                      <span
                        style={{
                          background: STATUS_COLORS[status].color,
                          color: "var(--bw-white)",
                          padding: "2px 10px",
                          borderRadius: "var(--r-pill)",
                          fontSize: 11,
                          fontWeight: 600,
                          display: "inline-block",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {STATUS_COLORS[status].label}
                      </span>
                    ) : "—"}
                  </td>
                )}
                {!isSelfOnly && (
                  <td style={{ ...tdStyle, fontSize: 12 }}>
                    {Object.entries(counts).map(([k, v]) => (
                      <span key={k} style={{ marginRight: 8, whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: STATUS_COLORS[k]?.color ?? AIRSA_COLORS.gray,
                            marginRight: 4,
                            verticalAlign: "middle",
                          }}
                        />
                        {v} {STATUS_COLORS[k]?.label ?? k}
                      </span>
                    ))}
                  </td>
                )}
              </tr>
            );
          })}
          {isSelfOnly && (
            <tr>
              <td
                colSpan={2}
                style={{
                  padding: "var(--s-3) var(--s-4)",
                  fontSize: 12,
                  color: "var(--fg-3)",
                  textAlign: "center",
                  fontStyle: "italic",
                }}
              >
                Manager rating not received.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function WhatThisMeans({
  data,
  breakdown,
  isSelfOnly,
}: {
  data: any;
  breakdown: Record<string, SkillBreakdown> | null;
  isSelfOnly: boolean;
}) {
  const boxes = [
    { key: "where_data_agrees",       title: "Where the data agrees",       color: AIRSA_COLORS.green,  tone: "Shared territory" },
    { key: "where_largest_gaps_live", title: "Where the largest gaps live", color: AIRSA_COLORS.gray,   tone: "Divergence" },
    { key: "neurological_read",       title: "The neurological read",       color: AIRSA_COLORS.purple, tone: "Brain frame" },
    { key: "note_for_manager",        title: "A note for your manager",     color: AIRSA_COLORS.navy,   tone: "For the manager" },
  ];

  const pillStyle = (color: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 10px",
    borderRadius: "var(--r-pill)",
    fontFamily: "var(--font-primary)",
    fontSize: 11,
    fontWeight: 600,
    background: `${color}20`,
    color,
    marginBottom: "var(--s-2)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  });

  return (
    <section>
      <h2 style={sectionHeadingStyle}>What does this mean to me?</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {boxes.map((b) => {
          let body: string | null = data?.[b.key] ?? null;
          if (b.key === "note_for_manager" && isSelfOnly) {
            body =
              "Your manager rating did not arrive within the rating window. The cross-rater divergence analysis is unavailable, so this report shows your self-rating only. You can request a fresh AIRSA cycle from your settings if your manager becomes available.";
          }
          return (
            <div key={b.key} style={accentCardSurface(b.color)}>
              <span style={pillStyle(b.color)}>{b.tone}</span>
              <h3 style={cardTitleStyle}>{b.title}</h3>
              <div style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6 }}>
                {body ? processSkillRefs(body, breakdown) : <SkeletonLines lines={3} />}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ActionPlan({ data, breakdown }: { data: any; breakdown: Record<string, SkillBreakdown> | null }) {
  const rows = [
    { key: "this_week", label: "This week", color: AIRSA_COLORS.navy },
    { key: "next_30_days", label: "Next 30 days", color: AIRSA_COLORS.teal },
    { key: "in_90_days", label: "In 90 days", color: AIRSA_COLORS.green },
  ];
  return (
    <section>
      <h2 style={sectionHeadingStyle}>Action plan</h2>
      <div style={cardSurface}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:divide-x md:divide-[var(--border-1)]">
          {rows.map((r, i) => (
            <div key={r.key} style={{ paddingLeft: i > 0 ? "var(--s-4)" : 0, display: "flex", flexDirection: "column" }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 10px",
                borderRadius: "var(--r-pill)",
                fontFamily: "var(--font-primary)",
                fontSize: 11,
                fontWeight: 600,
                background: `${r.color}20`,
                color: r.color,
                marginBottom: "var(--s-2)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                alignSelf: "flex-start",
              }}>
                {r.label}
              </span>
              <div style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6 }}>
                {data?.[r.key] ? processSkillRefs(String(data[r.key]), breakdown) : <SkeletonLines lines={3} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LollipopChart({
  skills,
  priorityFlags,
  breakdown,
  isSelfOnly,
}: {
  skills: SkillBreakdown[];
  priorityFlags: Set<number>;
  breakdown: Record<string, SkillBreakdown> | null;
  isSelfOnly: boolean;
}) {
  if (!skills.length) return null;

  const labelW = 280;
  const chartW = 560;
  const padR = 60; // increased to fit "Advanced" label
  const totalW = labelW + chartW + padR;
  const rowH = 30;
  const totalH = skills.length * rowH + 40;

  const xFor = (lvl: string) => {
    const i = LEVEL_INDEX[lvl] ?? 0;
    return labelW + 20 + (i / 2) * chartW;
  };

  return (
    <section>
      <h2 style={sectionHeadingStyle}>
        {isSelfOnly ? "Self-rated skill levels" : "Skill-by-skill comparison"}
      </h2>
      <div style={cardSurface}>
        {isSelfOnly ? (
          <div style={{ fontSize: 12, color: "var(--fg-2)", marginBottom: "var(--s-3)" }}>
            Showing your self-rated skill levels
          </div>
        ) : (
          <div style={{ marginBottom: "var(--s-4)" }}>
            {/* Row 1: dot meaning */}
            <div
              className="flex flex-wrap"
              style={{ gap: "var(--s-4)", fontSize: 12, color: "var(--fg-2)", marginBottom: "var(--s-2)" }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <svg width="12" height="12" aria-hidden="true">
                  <circle cx="6" cy="6" r="5" fill={AIRSA_COLORS.teal} />
                </svg>
                Self rating (the level you assigned)
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <svg width="12" height="12" aria-hidden="true">
                  <circle cx="6" cy="6" r="5" fill={AIRSA_COLORS.navy} />
                </svg>
                Manager rating (the level your supervisor assigned)
              </span>
            </div>
            {/* Divider */}
            <div style={{ borderTop: "1px solid var(--border-1)", margin: "var(--s-2) 0" }} />
            {/* Row 2: status colors */}
            <div
              className="flex flex-wrap"
              style={{ gap: "var(--s-3)", fontSize: 12, color: "var(--fg-2)" }}
            >
              {Object.entries(STATUS_COLORS).map(([k, v]) => (
                <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 28,
                      height: 6,
                      borderRadius: 3,
                      background: k === "blind_spot" ? "transparent" : v.color,
                      borderTop: k === "blind_spot" ? `3px dashed ${v.color}` : "none",
                    }}
                  />
                  {v.label}
                </span>
              ))}
            </div>
            {/* Divider */}
            <div style={{ borderTop: "1px solid var(--border-1)", margin: "var(--s-2) 0" }} />
            {/* Row 3: star indicator */}
            <div style={{ fontSize: 12, color: "var(--fg-2)" }}>
              <span style={{ fontWeight: 600 }}>★</span> marks your top 3 development priorities (see Top 3 development priorities section below)
            </div>
          </div>
        )}
        <div style={{ overflowX: "auto" }}>
          <svg width={totalW} height={totalH} role="img" aria-label="Skill level comparison chart">
            {/* Level zone shading bands — three distinct zones telegraphing progression */}
            {(() => {
              const sliceW = chartW / 3;
              const bandY = 20;
              const bandH = skills.length * rowH;
              const zones = [
                { idx: 0, fill: "#FCE4D6" },
                { idx: 1, fill: "#D6E8F5" },
                { idx: 2, fill: "#D8E8D0" },
              ];
              return zones.map((z) => (
                <rect
                  key={`band-${z.idx}`}
                  x={labelW + 20 + z.idx * sliceW}
                  y={bandY}
                  width={sliceW}
                  height={bandH}
                  fill={z.fill}
                  fillOpacity={0.6}
                />
              ));
            })()}
            {["Foundational", "Proficient", "Advanced"].map((lvl) => {
              const isLast = lvl === "Advanced";
              const anchor = isLast ? "end" : "middle";
              return (
                <g key={lvl}>
                  <line
                    x1={xFor(lvl)}
                    x2={xFor(lvl)}
                    y1={20}
                    y2={totalH - 10}
                    stroke="var(--border-1)"
                    strokeDasharray="2 3"
                  />
                  <text
                    x={xFor(lvl)}
                    y={14}
                    fontSize={11}
                    textAnchor={anchor}
                    fill="var(--fg-3)"
                  >
                    {lvl}
                  </text>
                </g>
              );
            })}
            {skills.map((s, i) => {
              const y = 30 + i * rowH;
              const sx = xFor(s.self_level);
              const mx = xFor(s.manager_level);
              const status = s.status;
              const color = STATUS_COLORS[status]?.color ?? AIRSA_COLORS.gray;
              const isAligned = status === "aligned";
              const dash = status === "blind_spot" ? "4 3" : undefined;
              return (
                <g key={s.skill_number}>
                  <title>
                    Skill {s.skill_number}: {s.skill_name}. Self: {s.self_level}. Manager: {s.manager_level}. Status: {STATUS_COLORS[status]?.label ?? status}.
                  </title>
                  <foreignObject x={0} y={y - 12} width={labelW} height={rowH}>
                    <div style={{ fontSize: 12, color: "var(--fg-2)", paddingRight: 8, textAlign: "right" }}>
                      <SkillReference numbers={[s.skill_number]} breakdown={breakdown}>
                        {s.skill_number}. {s.skill_name}{newFlags[s.skill_number] ? " ★" : ""}
                      </SkillReference>
                    </div>
                  </foreignObject>
                  {isSelfOnly ? (
                    <circle cx={sx} cy={y} r={5} fill={AIRSA_COLORS.teal} />
                  ) : isAligned ? (
                    <circle cx={sx} cy={y} r={6} fill={color} />
                  ) : (
                    <>
                      <line
                        x1={Math.min(sx, mx)}
                        x2={Math.max(sx, mx)}
                        y1={y}
                        y2={y}
                        stroke={color}
                        strokeWidth={2}
                        strokeDasharray={dash}
                      />
                      <circle cx={sx} cy={y} r={5} fill={AIRSA_COLORS.teal} />
                      <circle cx={mx} cy={y} r={5} fill={AIRSA_COLORS.navy} />
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </section>
  );
}

function tonePillStyle(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 10px",
    borderRadius: "var(--r-pill)",
    fontFamily: "var(--font-primary)",
    fontSize: 11,
    fontWeight: 600,
    background: `${color}20`,
    color,
    marginBottom: "var(--s-2)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
}

function ConversationGuide({ data, breakdown }: { data: any; breakdown: Record<string, SkillBreakdown> | null }) {
  const cards = [
    { key: "for_self", title: "For you to start", color: AIRSA_COLORS.navy, tone: "For you" },
    { key: "for_manager", title: "For your manager to start", color: AIRSA_COLORS.teal, tone: "For your manager" },
    { key: "for_both", title: "For both of you to start", color: AIRSA_COLORS.green, tone: "For both" },
  ];
  return (
    <section>
      <h2 style={sectionHeadingStyle}>Conversation guide</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
        {cards.map((c) => (
          <div key={c.key} style={accentCardSurface(c.color)}>
            <span style={tonePillStyle(c.color)}>{c.tone}</span>
            <h3 style={cardTitleStyle}>{c.title}</h3>
            <div style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6 }}>
              {data?.[c.key] ? processSkillRefs(String(data[c.key]), breakdown) : <SkeletonLines lines={3} />}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TopPriorities({
  data,
  breakdown,
  newFlags,
}: {
  data: any;
  breakdown: Record<string, SkillBreakdown> | null;
  newFlags: Record<number, boolean>;
}) {
  const accents = [AIRSA_COLORS.navy, AIRSA_COLORS.teal, AIRSA_COLORS.green];
  return (
    <section>
      <h2 style={sectionHeadingStyle}>Top 3 development priorities</h2>
      {!data ? (
        <SkeletonLines lines={6} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
          {(Array.isArray(data) ? data : []).map((p: any, i: number) => {
            const skill = breakdown?.[String(p.skill_number)];
            const status = skill?.status;
            const statusInfo = status ? STATUS_COLORS[status] : null;
            return (
              <div key={i} style={accentCardSurface(accents[i] ?? AIRSA_COLORS.navy)}>
                {statusInfo && (
                  <span style={tonePillStyle(statusInfo.color)}>{statusInfo.label}</span>
                )}
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--fg-1)",
                    margin: 0,
                    marginBottom: "var(--s-3)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  <SkillReference numbers={[p.skill_number]} breakdown={breakdown}>
                    Skill {p.skill_number}.
                  </SkillReference>{" "}
                  {skill?.skill_name ?? ""}
                  {newFlags[p.skill_number] ? " ★" : ""}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
                  <div>
                    <div style={{ ...eyebrowStyle, marginBottom: "var(--s-1)" }}>
                      What your manager will see
                    </div>
                    <div style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6 }}>
                      {processSkillRefs(String(p.behavioral_target ?? ""), breakdown)}
                    </div>
                  </div>
                  <div>
                    <div style={{ ...eyebrowStyle, marginBottom: "var(--s-1)" }}>Practice</div>
                    <div style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6 }}>
                      {processSkillRefs(String(p.practice ?? ""), breakdown)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CrossInstrument({
  content,
  breakdown,
  isCoachView,
  canTakeAssessments,
  onNavigate,
}: {
  content: string | null;
  breakdown: Record<string, SkillBreakdown> | null;
  isCoachView: boolean;
  canTakeAssessments: boolean;
  onNavigate: (path: string) => void;
}) {
  if (content) {
    return (
      <section>
        <h2 style={sectionHeadingStyle}>How this connects to your other assessments</h2>
        <div style={accentCardSurface("var(--bw-navy)")}>
          <ProseParagraphs text={content} breakdown={breakdown} />
        </div>
      </section>
    );
  }
  const showButtons = !isCoachView && canTakeAssessments;
  return (
    <section>
      <h2 style={sectionHeadingStyle}>How this connects to your other assessments</h2>
      <div style={accentCardSurface("var(--bw-navy)")}>
        <p style={{ margin: 0, fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6 }}>
          Take the Personal Threat Profile or Neuroscience Adoption Index to unlock
          cross-instrument insights about how your AIRSA pattern connects to your underlying
          threat/reward and AI-adoption response patterns.
        </p>
        {showButtons ? (
          <div className="flex flex-wrap gap-2" style={{ marginTop: "var(--s-4)" }}>
            <Button variant="outline" onClick={() => onNavigate("/assessment?instrument=INST-001")}>
              Take PTP
            </Button>
            <Button variant="outline" onClick={() => onNavigate("/assessment?instrument=INST-002")}>
              Take NAI
            </Button>
          </div>
        ) : (
          <p
            style={{
              margin: 0,
              marginTop: "var(--s-3)",
              fontSize: 14,
              color: "var(--fg-3)",
              fontStyle: "italic",
            }}
          >
            Cross-instrument insights are available once the user has completed PTP or NAI.
          </p>
        )}
      </div>
    </section>
  );
}

function SkillReferenceList({
  breakdown,
  isSelfOnly,
  selfOnlySkills,
  newFlags,
}: {
  breakdown: Record<string, SkillBreakdown> | null;
  isSelfOnly: boolean;
  selfOnlySkills: Array<{ item_number: number; skill_name: string; short_description: string; dimension_id: string }> | null;
  newFlags: Record<number, boolean>;
}) {
  const grouped: Record<string, Array<{ num: number; name: string; desc: string }>> = {};
  if (isSelfOnly) {
    if (!selfOnlySkills) return null;
    for (const s of selfOnlySkills) {
      grouped[s.dimension_id] ||= [];
      grouped[s.dimension_id].push({ num: s.item_number, name: s.skill_name, desc: s.short_description });
    }
  } else if (breakdown) {
    for (const s of Object.values(breakdown)) {
      grouped[s.dimension_id] ||= [];
      grouped[s.dimension_id].push({ num: s.skill_number, name: s.skill_name, desc: s.skill_description });
    }
  }

  return (
    <section>
      <details style={cardSurface}>
        <summary
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            fontWeight: 600,
            color: "var(--fg-1)",
            cursor: "pointer",
            letterSpacing: "-0.01em",
          }}
        >
          All 24 skills (click to expand)
        </summary>
        <div
          style={{
            marginTop: "var(--s-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-4)",
          }}
        >
          {Object.keys(DOMAIN_NAMES).map((dimId) => {
            const items = (grouped[dimId] ?? []).sort((a, b) => a.num - b.num);
            if (!items.length) return null;
            const domainName =
              (breakdown && Object.values(breakdown).find((s) => s.dimension_id === dimId)?.domain_name) ??
              DOMAIN_NAMES[dimId];
            return (
              <div key={dimId}>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--fg-1)",
                    margin: 0,
                    marginBottom: "var(--s-2)",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                  }}
                >
                  {domainName}
                </h3>
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--s-2)",
                  }}
                >
                  {items.map((it) => (
                    <li key={it.num} style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.55 }}>
                      <span style={{ color: "var(--fg-1)", fontWeight: 500 }}>
                        <SkillReference numbers={[it.num]} breakdown={breakdown}>
                          {it.num}. {it.name}{newFlags[it.num] ? " ★" : ""}
                        </SkillReference>
                      </span>
                      {" — "}
                      {it.desc}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </details>
    </section>
  );
}
