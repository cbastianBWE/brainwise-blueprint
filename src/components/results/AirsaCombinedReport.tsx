import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Calendar, BookOpen, Share2 } from "lucide-react";
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

const AIRSA_COLORS = {
  navy: "#021F36",
  teal: "#006D77",
  green: "#2D6A4F",
  gray: "#6D6875",
  purple: "#3C096C",
  sand: "#F9F7F1",
  orange: "#F5741A",
  fgPrimary: "#021F36",
  fgSecondary: "#4A5568",
  fgMuted: "#6D6875",
  borderSubtle: "#E2E8F0",
  white: "#FFFFFF",
};

const STATUS_COLORS: Record<string, { color: string; label: string }> = {
  aligned:            { color: "#006D77", label: "Aligned" },
  confirmed_strength: { color: "#2D6A4F", label: "Confirmed strength" },
  confirmed_gap:      { color: "#6D6875", label: "Confirmed gap" },
  blind_spot:         { color: "#021F36", label: "Blind spot" },
  underestimate:      { color: "#006D77", label: "Underestimate" },
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
            background: AIRSA_COLORS.white,
            border: `1px solid ${AIRSA_COLORS.borderSubtle}`,
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            padding: 12,
            width: 320,
            maxWidth: "90vw",
            fontSize: 14,
            color: AIRSA_COLORS.fgPrimary,
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
              <div style={{ fontSize: 11, color: AIRSA_COLORS.fgMuted, marginBottom: 4 }}>
                {s.domain_name}
              </div>
              <div style={{ color: AIRSA_COLORS.fgSecondary }}>{s.skill_description}</div>
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
  const re = /Skills?\s+(\d+(?:\s*,\s*\d+)*)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const nums = m[1].split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
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
        <p key={i} style={{ margin: 0, marginBottom: 12, lineHeight: 1.65, color: AIRSA_COLORS.fgSecondary }}>
          {processSkillRefs(p, breakdown)}
        </p>
      ))}
    </>
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

  // generated_at / ai_version for footer
  const footerMeta =
    overview ?? wtm ?? action ?? guide ?? priorities ?? cross ?? null;

  return (
    <div className="space-y-6">
      {/* ───── Section 1: Header ───── */}
      <div
        style={{
          background: AIRSA_COLORS.navy,
          color: AIRSA_COLORS.white,
          borderRadius: 8,
          padding: "20px 24px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          {userFullName ?? "Your"} — AI Readiness Skills Assessment
        </h1>
        <p style={{ margin: "6px 0 0 0", fontSize: 13, opacity: 0.85 }}>
          {completedAt ? format(new Date(completedAt), "MMMM d, yyyy") : "—"}
          {instrumentVersion ? ` · Version ${instrumentVersion}` : ""}
        </p>
      </div>

      {isSelfOnly && (
        <div
          style={{
            background: AIRSA_COLORS.sand,
            border: `1px solid ${AIRSA_COLORS.borderSubtle}`,
            borderLeft: `4px solid ${AIRSA_COLORS.gray}`,
            borderRadius: 6,
            padding: 14,
            fontSize: 14,
            color: AIRSA_COLORS.fgSecondary,
          }}
        >
          Your manager rating did not arrive. This report shows your self-rating only;
          cross-rater divergence views are unavailable.
        </div>
      )}

      {/* ───── Section 2: At a glance ───── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Alignment", value: isSelfOnly ? "—" : `${alignmentPct}%` },
          { label: "Confirmed strengths", value: isSelfOnly ? "—" : String(confirmedStrengths) },
          { label: "Blind spots", value: isSelfOnly ? "—" : String(blindSpots) },
          { label: "Underestimates", value: isSelfOnly ? "—" : String(underestimates) },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              background: AIRSA_COLORS.white,
              border: `1px solid ${AIRSA_COLORS.borderSubtle}`,
              borderRadius: 8,
              padding: 16,
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: AIRSA_COLORS.fgMuted,
            }}>
              {c.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: AIRSA_COLORS.navy, marginTop: 4 }}>
              {c.value}
            </div>
            {isSelfOnly && (
              <div style={{ fontSize: 11, color: AIRSA_COLORS.fgMuted, marginTop: 2 }}>
                (manager rating not received)
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ───── Section 3: Action buttons ───── */}
      <div className="flex flex-wrap gap-2">
        {/* TODO: Phase 4 PDF export */}
        <Button variant="outline" onClick={() => alert("PDF export coming soon")}>
          <FileText className="mr-2 h-4 w-4" /> Download PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            window.location.href =
              "mailto:?subject=AI%20Readiness%20conversation&body=I%27d%20like%20to%20schedule%20time%20to%20discuss%20my%20AIRSA%20results%20with%20you.";
          }}
        >
          <Calendar className="mr-2 h-4 w-4" /> Schedule conversation with manager
        </Button>
        {/* TODO: Resources pages */}
        <Button variant="outline" onClick={() => alert("Resources page coming soon")}>
          <BookOpen className="mr-2 h-4 w-4" /> Resources
        </Button>
        {!isCoachView && canTakeAssessments && (
          <Button variant="outline" onClick={() => alert("Sharing coming soon")}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
        )}
      </div>

      {/* ───── Section 4: How to read your results ───── */}
      <ProseCard title="How to read your results">
        <p>
          The AIRSA assesses 24 AI readiness skills across 8 domains, grounded in the
          C.A.F.E.S. neuroscience framework (Certainty, Agency, Fairness, Ego stability,
          Saturation) and the 5 Ps of the Personal Threat Profile (Protection, Participation,
          Prediction, Purpose, Pleasure). The dual-rater methodology pairs your self-rating
          with your manager's rating to surface where you see eye-to-eye and where you don't.
        </p>
        <p>
          Each item asks how often you demonstrate that skill on a 4-level frequency scale:
          Never, Rarely, Often, Consistently. The 4-level frequency response maps to a
          3-level readiness output:
        </p>
        <ul style={{ margin: "0 0 12px 18px", color: AIRSA_COLORS.fgSecondary }}>
          <li><strong>Foundational</strong> — Never or Rarely</li>
          <li><strong>Proficient</strong> — Often</li>
          <li><strong>Advanced</strong> — Consistently</li>
        </ul>
        <p>
          Comparing your rating with your manager's produces five possible status outcomes:
        </p>
        <ul style={{ margin: "0 0 12px 18px", color: AIRSA_COLORS.fgSecondary }}>
          <li><strong>Aligned</strong> — both rated you Proficient</li>
          <li><strong>Confirmed strength</strong> — both rated you Advanced</li>
          <li><strong>Confirmed gap</strong> — both rated you Foundational</li>
          <li><strong>Blind spot</strong> — you rated yourself higher than your manager did</li>
          <li><strong>Underestimate</strong> — your manager rated you higher than you rated yourself</li>
        </ul>
        <p style={{ marginBottom: 0 }}>
          Differences matter as much as agreements. Where ratings line up, you have shared
          ground to plan from. Where they diverge, you have information you couldn't get from
          either rating alone.
        </p>
      </ProseCard>

      {/* ───── Section 5: Domain heatmap ───── */}
      <DomainHeatmap
        dimensionScores={data.result.dimension_scores}
        managerScores={data.result.manager_dimension_scores}
        divergence={data.result.self_manager_divergence}
        breakdown={breakdown}
        isSelfOnly={isSelfOnly}
      />

      {/* ───── Section 6: Profile overview (AI) ───── */}
      <ProseCard title="Profile overview">
        {overview?.content ? (
          <ProseParagraphs text={String(overview.content)} breakdown={breakdown} />
        ) : (
          <SkeletonLines lines={4} />
        )}
      </ProseCard>

      {/* ───── Section 7: What does this mean to me? ───── */}
      <WhatThisMeans data={wtm?.content} breakdown={breakdown} isSelfOnly={isSelfOnly} />

      {/* ───── Section 8: Action plan ───── */}
      <ActionPlan data={action?.content} breakdown={breakdown} />

      {/* ───── Section 9: Lollipop ───── */}
      <LollipopChart skills={skillsArr} newFlags={data.newSkillFlags} breakdown={breakdown} isSelfOnly={isSelfOnly} />

      {/* ───── Section 10: Quadrant map ───── */}
      {!isSelfOnly && (
        <QuadrantMap skills={skillsArr} breakdown={breakdown} />
      )}

      {/* ───── Section 11: Conversation guide ───── */}
      <ConversationGuide data={guide?.content} breakdown={breakdown} />

      {/* ───── Section 12: Top 3 priorities ───── */}
      <TopPriorities
        data={priorities?.content}
        breakdown={breakdown}
        newFlags={data.newSkillFlags}
      />

      {/* ───── Section 13: Cross-instrument (conditional, NOT polled) ───── */}
      <CrossInstrument
        content={cross?.content ? String(cross.content) : null}
        breakdown={breakdown}
        isCoachView={isCoachView}
        canTakeAssessments={canTakeAssessments}
        onNavigate={(p) => navigate(p)}
      />

      {/* ───── Section 14: Skill reference list, collapsed ───── */}
      <SkillReferenceList
        breakdown={breakdown}
        isSelfOnly={isSelfOnly}
        selfOnlySkills={selfOnlySkillList}
        newFlags={data.newSkillFlags}
      />

      {/* ───── Section 15: Methodology footer ───── */}
      <div
        style={{
          borderTop: `1px solid ${AIRSA_COLORS.borderSubtle}`,
          paddingTop: 16,
          marginTop: 8,
          fontSize: 12,
          color: AIRSA_COLORS.fgMuted,
          maxWidth: 720,
          lineHeight: 1.6,
        }}
      >
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
    </div>
  );
}

// ───────────────────────────── Sub-components ─────────────────────────────

function ProseCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: AIRSA_COLORS.white,
        border: `1px solid ${AIRSA_COLORS.borderSubtle}`,
        borderRadius: 8,
        padding: 20,
        maxWidth: 720,
      }}
    >
      {title && (
        <h2
          style={{
            margin: "0 0 12px 0",
            fontSize: 18,
            fontWeight: 600,
            color: AIRSA_COLORS.fgPrimary,
          }}
        >
          {title}
        </h2>
      )}
      <div style={{ fontSize: 14, color: AIRSA_COLORS.fgSecondary, lineHeight: 1.65 }}>
        {children}
      </div>
    </div>
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
  // domain name lookup from breakdown if available
  const domainNameFor = (id: string) => {
    if (breakdown) {
      const found = Object.values(breakdown).find((s) => s.dimension_id === id);
      if (found?.domain_name) return found.domain_name;
    }
    return DOMAIN_NAMES[id] ?? id;
  };

  // status counts per domain
  const statusCounts = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    if (!breakdown) return m;
    for (const s of Object.values(breakdown)) {
      m[s.dimension_id] ||= {};
      m[s.dimension_id][s.status] = (m[s.dimension_id][s.status] ?? 0) + 1;
    }
    return m;
  }, [breakdown]);

  return (
    <div
      style={{
        background: AIRSA_COLORS.white,
        border: `1px solid ${AIRSA_COLORS.borderSubtle}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${AIRSA_COLORS.borderSubtle}` }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: AIRSA_COLORS.fgPrimary }}>
          Domain heatmap
        </h2>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead style={{ background: AIRSA_COLORS.navy, color: AIRSA_COLORS.white }}>
            <tr>
              <th style={{ textAlign: "left", padding: 10 }}>Domain</th>
              <th style={{ textAlign: "left", padding: 10 }}>Self level</th>
              {!isSelfOnly && <th style={{ textAlign: "left", padding: 10 }}>Manager level</th>}
              {!isSelfOnly && <th style={{ textAlign: "left", padding: 10 }}>Status</th>}
              {!isSelfOnly && <th style={{ textAlign: "left", padding: 10 }}>Skills by status</th>}
            </tr>
          </thead>
          <tbody>
            {dimIds.map((id, i) => {
              const self = dimensionScores?.[id]?.readiness_level ?? "—";
              const mgr = managerScores?.[id]?.readiness_level ?? "—";
              const status = divergence?.[id]?.status;
              const counts = statusCounts[id] ?? {};
              return (
                <tr
                  key={id}
                  style={{
                    background: i % 2 === 0 ? AIRSA_COLORS.white : AIRSA_COLORS.sand,
                    borderTop: `1px solid ${AIRSA_COLORS.borderSubtle}`,
                  }}
                >
                  <td style={{ padding: 10, color: AIRSA_COLORS.fgPrimary, fontWeight: 500 }}>
                    {domainNameFor(id)}
                  </td>
                  <td style={{ padding: 10, color: AIRSA_COLORS.fgSecondary }}>{self}</td>
                  {!isSelfOnly && (
                    <td style={{ padding: 10, color: AIRSA_COLORS.fgSecondary }}>{mgr}</td>
                  )}
                  {!isSelfOnly && (
                    <td style={{ padding: 10 }}>
                      {status && STATUS_COLORS[status] ? (
                        <span
                          style={{
                            background: STATUS_COLORS[status].color,
                            color: AIRSA_COLORS.white,
                            padding: "3px 8px",
                            borderRadius: 12,
                            fontSize: 12,
                          }}
                        >
                          {STATUS_COLORS[status].label}
                        </span>
                      ) : "—"}
                    </td>
                  )}
                  {!isSelfOnly && (
                    <td style={{ padding: 10, fontSize: 12, color: AIRSA_COLORS.fgSecondary }}>
                      {Object.entries(counts).map(([k, v], idx) => (
                        <span key={k} style={{ marginRight: 8 }}>
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
                    padding: 12,
                    fontSize: 12,
                    color: AIRSA_COLORS.fgMuted,
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
    { key: "where_data_agrees", title: "Where the data agrees", color: AIRSA_COLORS.green },
    { key: "where_largest_gaps_live", title: "Where the largest gaps live", color: AIRSA_COLORS.gray },
    { key: "neurological_read", title: "The neurological read", color: AIRSA_COLORS.purple },
    { key: "note_for_manager", title: "A note for your manager", color: AIRSA_COLORS.navy },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: AIRSA_COLORS.fgPrimary, marginBottom: 12 }}>
        What does this mean to me?
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {boxes.map((b) => {
          let body: string | null = data?.[b.key] ?? null;
          if (b.key === "note_for_manager" && isSelfOnly) {
            body =
              "Your manager rating did not arrive within the rating window. The cross-rater divergence analysis is unavailable, so this report shows your self-rating only. You can request a fresh AIRSA cycle from your settings if your manager becomes available.";
          }
          return (
            <div
              key={b.key}
              style={{
                background: AIRSA_COLORS.white,
                border: `1px solid ${AIRSA_COLORS.borderSubtle}`,
                borderLeft: `4px solid ${b.color}`,
                borderRadius: 6,
                padding: 16,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: AIRSA_COLORS.fgPrimary, marginBottom: 8 }}>
                {b.title}
              </h3>
              <div style={{ fontSize: 14, color: AIRSA_COLORS.fgSecondary, lineHeight: 1.6 }}>
                {body ? processSkillRefs(body, breakdown) : <SkeletonLines lines={3} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionPlan({ data, breakdown }: { data: any; breakdown: Record<string, SkillBreakdown> | null }) {
  const rows = [
    { key: "this_week", label: "This week" },
    { key: "next_30_days", label: "Next 30 days" },
    { key: "in_90_days", label: "In 90 days" },
  ];
  return (
    <div
      style={{
        background: AIRSA_COLORS.white,
        border: `1px solid ${AIRSA_COLORS.borderSubtle}`,
        borderRadius: 8,
        padding: 20,
      }}
    >
      <h2 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 600, color: AIRSA_COLORS.fgPrimary }}>
        Action plan
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {rows.map((r) => (
          <div key={r.key} style={{ borderTop: `1px solid ${AIRSA_COLORS.borderSubtle}`, paddingTop: 12 }}>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: AIRSA_COLORS.fgMuted,
                marginBottom: 6,
              }}
            >
              {r.label}
            </div>
            <div style={{ fontSize: 14, color: AIRSA_COLORS.fgSecondary, lineHeight: 1.6 }}>
              {data?.[r.key] ? processSkillRefs(String(data[r.key]), breakdown) : <SkeletonLines lines={3} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LollipopChart({
  skills,
  newFlags,
  breakdown,
  isSelfOnly,
}: {
  skills: SkillBreakdown[];
  newFlags: Record<number, boolean>;
  breakdown: Record<string, SkillBreakdown> | null;
  isSelfOnly: boolean;
}) {
  if (!skills.length) return null;

  const labelW = 280;
  const chartW = 360;
  const totalW = labelW + chartW + 40;
  const rowH = 28;
  const totalH = skills.length * rowH + 40;

  const xFor = (lvl: string) => {
    const i = LEVEL_INDEX[lvl] ?? 0;
    return labelW + 20 + (i / 2) * chartW;
  };

  return (
    <div
      style={{
        background: AIRSA_COLORS.white,
        border: `1px solid ${AIRSA_COLORS.borderSubtle}`,
        borderRadius: 8,
        padding: 16,
      }}
    >
      <h2 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 600, color: AIRSA_COLORS.fgPrimary }}>
        {isSelfOnly ? "Self-rated skill levels" : "Skill-by-skill comparison"}
      </h2>
      {/* Legend */}
      {!isSelfOnly && (
        <div className="flex flex-wrap gap-3 mb-2" style={{ fontSize: 12, color: AIRSA_COLORS.fgSecondary }}>
          {Object.entries(STATUS_COLORS).map(([k, v]) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{
                display: "inline-block",
                width: 16,
                height: 0,
                borderTop: `2px ${k === "blind_spot" ? "dashed" : "solid"} ${v.color}`,
              }} />
              {v.label}
            </span>
          ))}
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <svg width={totalW} height={totalH} role="img" aria-label="Skill level comparison chart">
          {/* gridlines */}
          {["Foundational", "Proficient", "Advanced"].map((lvl) => (
            <g key={lvl}>
              <line
                x1={xFor(lvl)}
                x2={xFor(lvl)}
                y1={20}
                y2={totalH - 10}
                stroke={AIRSA_COLORS.borderSubtle}
                strokeDasharray="2 3"
              />
              <text x={xFor(lvl)} y={14} fontSize={11} textAnchor="middle" fill={AIRSA_COLORS.fgMuted}>
                {lvl}
              </text>
            </g>
          ))}
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
                <foreignObject x={0} y={y - 10} width={labelW} height={rowH}>
                  <div style={{ fontSize: 12, color: AIRSA_COLORS.fgSecondary, paddingRight: 8, textAlign: "right" }}>
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
      {!isSelfOnly && (
        <div style={{ fontSize: 11, color: AIRSA_COLORS.fgMuted, marginTop: 6 }}>
          Teal dot = self · Navy dot = manager
        </div>
      )}
    </div>
  );
}

function QuadrantMap({
  skills,
  breakdown,
}: {
  skills: SkillBreakdown[];
  breakdown: Record<string, SkillBreakdown> | null;
}) {
  // bucket by (self_level, manager_level)
  const cells: Record<string, number[]> = {};
  for (const s of skills) {
    const key = `${s.self_level}|${s.manager_level}`;
    cells[key] ||= [];
    cells[key].push(s.skill_number);
  }

  const W = 480;
  const H = 360;
  const padL = 70, padR = 30, padT = 30, padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xFor = (lvl: string) => padL + (LEVEL_INDEX[lvl] / 2) * innerW;
  const yFor = (lvl: string) => padT + innerH - (LEVEL_INDEX[lvl] / 2) * innerH;

  // Quadrant tints
  const quadrants = [
    { x: padL + innerW / 2, y: padT, w: innerW / 2, h: innerH / 2, color: AIRSA_COLORS.green, label: "Confirmed strength", labelAt: { x: W - padR - 4, y: padT + 14, anchor: "end" as const } },
    { x: padL, y: padT, w: innerW / 2, h: innerH / 2, color: AIRSA_COLORS.teal, label: "Underestimate", labelAt: { x: padL + 4, y: padT + 14, anchor: "start" as const } },
    { x: padL + innerW / 2, y: padT + innerH / 2, w: innerW / 2, h: innerH / 2, color: AIRSA_COLORS.navy, label: "Blind spot", labelAt: { x: W - padR - 4, y: padT + innerH - 4, anchor: "end" as const } },
    { x: padL, y: padT + innerH / 2, w: innerW / 2, h: innerH / 2, color: AIRSA_COLORS.gray, label: "Confirmed gap", labelAt: { x: padL + 4, y: padT + innerH - 4, anchor: "start" as const } },
  ];

  // Determine label color for each cell based on which quadrant midpoint it falls in.
  const colorForCell = (selfLvl: string, mgrLvl: string) => {
    const sx = LEVEL_INDEX[selfLvl];
    const my = LEVEL_INDEX[mgrLvl];
    // Center cell (Proficient/Proficient): aligned -> teal
    if (sx === 1 && my === 1) return AIRSA_COLORS.teal;
    if (sx >= 1 && my >= 1) return AIRSA_COLORS.green;
    if (sx < 1 && my >= 1) return AIRSA_COLORS.teal;
    if (sx >= 1 && my < 1) return AIRSA_COLORS.navy;
    return AIRSA_COLORS.gray;
  };

  return (
    <div
      style={{
        background: AIRSA_COLORS.white,
        border: `1px solid ${AIRSA_COLORS.borderSubtle}`,
        borderRadius: 8,
        padding: 16,
      }}
    >
      <h2 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 600, color: AIRSA_COLORS.fgPrimary }}>
        Developmental quadrant map
      </h2>
      <div style={{ overflowX: "auto" }}>
        <svg width={W} height={H} role="img" aria-label="Quadrant map of self vs manager ratings">
          {quadrants.map((q, i) => (
            <g key={i}>
              <rect x={q.x} y={q.y} width={q.w} height={q.h} fill={q.color} fillOpacity={0.08} />
              <text x={q.labelAt.x} y={q.labelAt.y} fontSize={11} fontWeight={600} fill={q.color} textAnchor={q.labelAt.anchor}>
                {q.label}
              </text>
            </g>
          ))}
          {/* axes */}
          <line x1={padL} y1={padT + innerH} x2={padL + innerW} y2={padT + innerH} stroke={AIRSA_COLORS.borderSubtle} />
          <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke={AIRSA_COLORS.borderSubtle} />
          {/* axis labels */}
          {["Foundational", "Proficient", "Advanced"].map((lvl) => (
            <g key={lvl}>
              <text x={xFor(lvl)} y={H - 12} fontSize={10} textAnchor="middle" fill={AIRSA_COLORS.fgMuted}>{lvl}</text>
              <text x={padL - 6} y={yFor(lvl) + 3} fontSize={10} textAnchor="end" fill={AIRSA_COLORS.fgMuted}>{lvl}</text>
            </g>
          ))}
          <text x={padL + innerW / 2} y={H - 0} fontSize={10} textAnchor="middle" fill={AIRSA_COLORS.fgMuted}>Self</text>
          <text x={14} y={padT + innerH / 2} fontSize={10} textAnchor="middle" fill={AIRSA_COLORS.fgMuted} transform={`rotate(-90 14 ${padT + innerH / 2})`}>Manager</text>
          {/* cell labels */}
          {Object.entries(cells).map(([key, nums]) => {
            const [selfLvl, mgrLvl] = key.split("|");
            const cx = xFor(selfLvl);
            const cy = yFor(mgrLvl);
            const c = colorForCell(selfLvl, mgrLvl);
            return (
              <foreignObject key={key} x={cx - 50} y={cy - 12} width={100} height={24}>
                <div style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: c }}>
                  <SkillReference numbers={nums} breakdown={breakdown}>
                    {nums.join(", ")}
                  </SkillReference>
                </div>
              </foreignObject>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function ConversationGuide({ data, breakdown }: { data: any; breakdown: Record<string, SkillBreakdown> | null }) {
  const cards = [
    { key: "for_self", title: "For you to start", color: AIRSA_COLORS.navy },
    { key: "for_manager", title: "For your manager to start", color: AIRSA_COLORS.teal },
    { key: "for_both", title: "For both of you to start", color: AIRSA_COLORS.green },
  ];
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: AIRSA_COLORS.fgPrimary, marginBottom: 12 }}>
        Conversation guide
      </h2>
      <div className="space-y-3">
        {cards.map((c) => (
          <div
            key={c.key}
            style={{
              background: AIRSA_COLORS.white,
              border: `1px solid ${AIRSA_COLORS.borderSubtle}`,
              borderLeft: `4px solid ${c.color}`,
              borderRadius: 6,
              padding: 16,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: AIRSA_COLORS.fgPrimary, marginBottom: 6 }}>
              {c.title}
            </h3>
            <div style={{ fontSize: 14, color: AIRSA_COLORS.fgSecondary, lineHeight: 1.65 }}>
              {data?.[c.key] ? processSkillRefs(String(data[c.key]), breakdown) : <SkeletonLines lines={3} />}
            </div>
          </div>
        ))}
      </div>
    </div>
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
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: AIRSA_COLORS.fgPrimary, marginBottom: 12 }}>
        Top 3 development priorities
      </h2>
      {!data ? (
        <SkeletonLines lines={6} />
      ) : (
        <div className="space-y-3">
          {(Array.isArray(data) ? data : []).map((p: any, i: number) => {
            const skill = breakdown?.[String(p.skill_number)];
            return (
              <div
                key={i}
                style={{
                  background: AIRSA_COLORS.white,
                  border: `1px solid ${AIRSA_COLORS.borderSubtle}`,
                  borderLeft: `4px solid ${accents[i] ?? AIRSA_COLORS.navy}`,
                  borderRadius: 6,
                  padding: 16,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: AIRSA_COLORS.fgPrimary, marginBottom: 8 }}>
                  <SkillReference numbers={[p.skill_number]} breakdown={breakdown}>
                    Skill {p.skill_number}.
                  </SkillReference>{" "}
                  {skill?.skill_name ?? ""}
                  {newFlags[p.skill_number] ? " ★" : ""}
                </h3>
                <div style={{ marginBottom: 8 }}>
                  <div style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: AIRSA_COLORS.fgMuted,
                    marginBottom: 4,
                  }}>
                    What your manager will see
                  </div>
                  <div style={{ fontSize: 14, color: AIRSA_COLORS.fgSecondary, lineHeight: 1.6 }}>
                    {processSkillRefs(String(p.behavioral_target ?? ""), breakdown)}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: AIRSA_COLORS.fgMuted,
                    marginBottom: 4,
                  }}>
                    Practice
                  </div>
                  <div style={{ fontSize: 14, color: AIRSA_COLORS.fgSecondary, lineHeight: 1.6 }}>
                    {processSkillRefs(String(p.practice ?? ""), breakdown)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
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
      <ProseCard title="How this connects to your other assessments">
        <ProseParagraphs text={content} breakdown={breakdown} />
      </ProseCard>
    );
  }
  // Unlock CTA
  const showButtons = !isCoachView && canTakeAssessments;
  return (
    <ProseCard title="How this connects to your other assessments">
      <p>
        Take the Personal Threat Profile or Neuroscience Adoption Index to unlock
        cross-instrument insights about how your AIRSA pattern connects to your underlying
        threat/reward and AI-adoption response patterns.
      </p>
      {showButtons ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onNavigate("/assessment?instrument=INST-001")}>
            Take PTP
          </Button>
          <Button variant="outline" onClick={() => onNavigate("/assessment?instrument=INST-002")}>
            Take NAI
          </Button>
        </div>
      ) : (
        <p style={{ marginBottom: 0, fontStyle: "italic" }}>
          Cross-instrument insights are available once the user has completed PTP or NAI.
        </p>
      )}
    </ProseCard>
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
  // Build domain-grouped list
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
    <details
      style={{
        background: AIRSA_COLORS.white,
        border: `1px solid ${AIRSA_COLORS.borderSubtle}`,
        borderRadius: 8,
        padding: 16,
      }}
    >
      <summary style={{ cursor: "pointer", fontSize: 15, fontWeight: 600, color: AIRSA_COLORS.fgPrimary }}>
        All 24 skills (click to expand)
      </summary>
      <div className="mt-4 space-y-4">
        {Object.keys(DOMAIN_NAMES).map((dimId) => {
          const items = (grouped[dimId] ?? []).sort((a, b) => a.num - b.num);
          if (!items.length) return null;
          // domain name from any skill in dim, fall back
          const domainName =
            (breakdown && Object.values(breakdown).find((s) => s.dimension_id === dimId)?.domain_name) ??
            DOMAIN_NAMES[dimId];
          return (
            <div key={dimId}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: AIRSA_COLORS.navy, marginBottom: 6 }}>
                {domainName}
              </h3>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {items.map((it) => (
                  <li key={it.num} style={{ fontSize: 14, color: AIRSA_COLORS.fgSecondary, marginBottom: 4 }}>
                    <SkillReference numbers={[it.num]} breakdown={breakdown}>
                      {it.num}. {it.name}{newFlags[it.num] ? " ★" : ""}
                    </SkillReference>
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
  );
}
