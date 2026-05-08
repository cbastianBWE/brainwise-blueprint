import { useState, useEffect, useCallback, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { generateAIRSADashboardPdf, type AIRSADashboardPdfSections } from "@/lib/generateAIRSADashboardPdf";

// Brand palette (canonical hex from architecture-reference §5.1)
const NAVY    = "#021F36";
const ORANGE  = "#F5741A";
const TEAL    = "#006D77";
const SAND    = "#F9F7F1";
const GREEN   = "#2D6A4F";
const GRAY    = "#6D6875";
const PURPLE  = "#3C096C";
const MUSTARD = "#7a5800";
const PLUM_DEEP = "#5A1A4A";

const STATUS_COLORS: Record<string, { color: string; label: string }> = {
  aligned:            { color: "#006D77", label: "Aligned" },
  confirmed_strength: { color: "#2D6A4F", label: "Confirmed strength" },
  confirmed_gap:      { color: "#6D6875", label: "Confirmed gap" },
  blind_spot:         { color: "#021F36", label: "Blind spot" },
  underestimate:      { color: "#3C096C", label: "Underestimate" },
};

const DOMAIN_COLORS: Record<string, string> = {
  "DIM-AIRSA-01": "#021F36",
  "DIM-AIRSA-02": "#006D77",
  "DIM-AIRSA-03": "#3C096C",
  "DIM-AIRSA-04": "#7a5800",
  "DIM-AIRSA-05": "#2D6A4F",
  "DIM-AIRSA-06": "#F5741A",
  "DIM-AIRSA-07": "#6D6875",
  "DIM-AIRSA-08": "#5A1A4A",
};

const DOMAIN_NAMES: Record<string, string> = {
  "DIM-AIRSA-01": "Cognitive & Learning Skills",
  "DIM-AIRSA-02": "Social & Collaborative Skills",
  "DIM-AIRSA-03": "Psychological Readiness",
  "DIM-AIRSA-04": "Strategic & Systems Thinking",
  "DIM-AIRSA-05": "Execution & Practical Skills",
  "DIM-AIRSA-06": "Proactivity & Personal Drive",
  "DIM-AIRSA-07": "Information & Resource Management",
  "DIM-AIRSA-08": "Ethical & Reflective Judgment",
};

const DOMAIN_SHORT_NAMES: Record<string, string> = {
  "DIM-AIRSA-01": "Cognitive",
  "DIM-AIRSA-02": "Social",
  "DIM-AIRSA-03": "Psych Readiness",
  "DIM-AIRSA-04": "Strategic",
  "DIM-AIRSA-05": "Execution",
  "DIM-AIRSA-06": "Proactivity",
  "DIM-AIRSA-07": "Info Mgmt",
  "DIM-AIRSA-08": "Ethical",
};

interface SkillAggregate {
  skill_name: string;
  dimension_id: string;
  domain_name: string;
  modal_self_level: "Foundational" | "Proficient" | "Advanced";
  modal_manager_level: "Foundational" | "Proficient" | "Advanced";
  tci: number;
  blind_spot_pct: number;
  underestimate_pct: number;
  confirmed_strength_pct: number;
  n: number;
  cps_growth: number;
  cps_strength: number;
  suppressed: boolean;
  per_department_breakdown: Record<string, any>;
}

interface DomainAggregate {
  domain_name: string;
  tci: number;
  blind_spot_pct: number;
  underestimate_pct: number;
  confirmed_strength_pct: number;
  n: number;
  cps_growth: number;
  cps_strength: number;
  suppressed: boolean;
}

interface RankedSkill {
  skill_number: number;
  skill_name: string;
  dimension_id: string;
  cps_growth?: number;
  cps_strength?: number;
}

interface RankedDomain {
  dimension_id: string;
  domain_name: string;
  cps_growth?: number;
  cps_strength?: number;
}

interface ManagerCalibrationEntry {
  supervisor_id: string;
  supervisor_name: string;
  n_reports: number;
  n_skill_pairs: number;
  tci: number;
  blind_spot_pct: number;
  underestimate_pct: number;
}

interface AirsaAggregate {
  suppressed: boolean;
  reason?: string;
  instrument_id: string;
  slice_type: string;
  slice_value: string;
  pair_count?: number;
  eligible_count?: number;
  completed_count?: number;
  minimum_required?: number;
  tci_overall?: number;
  alignment_rate?: number;
  blind_spot_rate?: number;
  underestimate_rate?: number;
  status_distribution?: {
    aligned: number;
    confirmed_strength: number;
    confirmed_gap: number;
    blind_spot: number;
    underestimate: number;
  };
  skill_aggregates?: Record<string, SkillAggregate>;
  domain_aggregates?: Record<string, DomainAggregate>;
  rankings?: {
    growth_skills: RankedSkill[];
    strength_skills: RankedSkill[];
    growth_domains: RankedDomain[];
    strength_domains: RankedDomain[];
  };
  manager_calibration?: ManagerCalibrationEntry[];
}

interface StoredAirsaNarrative {
  id: string;
  generated_at: string;
  participant_count: number;
  index_score: number | null;
  narrative_text: {
    summary?: string;
    section_summaries?: Record<string, string>;
    top_interventions?: { title: string; rationale: string }[];
    risk_flags?: { id: string; level: "high" | "warn"; title: string; summary: string; detail: string }[];
    business_meaning?: string;
    benefits?: string;
    risks?: string;
    next_steps?: string;
    reassessment_note?: string;
    interventions?: any[];
  };
}

interface Department {
  id: string;
  name: string;
}

interface Supervisor {
  id: string;
  full_name: string;
}

interface NarrativeHistoryRow {
  id: string;
  generated_at: string;
  participant_count: number;
  index_score: number | null;
}

type SkillSortKey = "skill_number" | "skill_name" | "domain_name" | "tci" | "blind_spot_pct" | "underestimate_pct" | "cps_growth" | "cps_strength" | "n";

export default function AirsaDashboard() {
  const { user } = useAuth();

  const [sliceType, setSliceType] = useState("all");
  const [sliceValue, setSliceValue] = useState("all");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [narrativeHistory, setNarrativeHistory] = useState<NarrativeHistoryRow[]>([]);

  const [skillSortKey, setSkillSortKey] = useState<SkillSortKey>("cps_growth");
  const [skillSortDir, setSkillSortDir] = useState<"asc" | "desc">("desc");
  const [skillFilterDomain, setSkillFilterDomain] = useState<string>("all");
  const [skillFilterText, setSkillFilterText] = useState<string>("");
  const [expandedSkillRows, setExpandedSkillRows] = useState<Set<number>>(new Set());

  const toggleSkillRow = (skillNum: number) => {
    setExpandedSkillRows(prev => {
      const next = new Set(prev);
      if (next.has(skillNum)) next.delete(skillNum); else next.add(skillNum);
      return next;
    });
  };

  const handleSkillSort = (key: SkillSortKey) => {
    setSkillSortKey(prevKey => {
      if (prevKey === key) {
        setSkillSortDir(prev => prev === "asc" ? "desc" : "asc");
        return key;
      }
      setSkillSortDir(["skill_number", "skill_name", "domain_name"].includes(key) ? "asc" : "desc");
      return key;
    });
  };

  const [aggregate, setAggregate] = useState<AirsaAggregate | null>(null);
  const [latestNarrative, setLatestNarrative] = useState<StoredAirsaNarrative | null>(null);

  const [loadingAgg, setLoadingAgg] = useState(true);
  const [loadingNarrative, setLoadingNarrative] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const [activeTab, setActiveTab] = useState("overview");

  const [expandedNarrativeCard, setExpandedNarrativeCard] = useState(false);
  const [expandedRankingsLeft, setExpandedRankingsLeft] = useState(false);
  const [expandedRankingsRight, setExpandedRankingsRight] = useState(false);
  const [expandedRiskFlags, setExpandedRiskFlags] = useState<Set<string>>(new Set());

  const [exportModal, setExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSections, setExportSections] = useState<AIRSADashboardPdfSections>({
    overview: true,
    domains: true,
    skillInventory: true,
    managerCalibration: true,
    trends: true,
  });

  const toggleRiskFlag = (id: string) => {
    setExpandedRiskFlags(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any).from("departments").select("id, name").order("name");
      setDepartments((data ?? []).map((d: any) => ({ id: d.id, name: d.name })));
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: subordinates } = await (supabase as any)
        .from("users")
        .select("supervisor_user_id")
        .not("supervisor_user_id", "is", null);
      if (!subordinates) { setSupervisors([]); return; }
      const supervisorIds = Array.from(new Set(subordinates.map((s: any) => s.supervisor_user_id).filter(Boolean)));
      if (supervisorIds.length === 0) { setSupervisors([]); return; }
      const { data: supervisorRows } = await (supabase as any)
        .from("users")
        .select("id, full_name")
        .in("id", supervisorIds)
        .order("full_name");
      setSupervisors((supervisorRows ?? []) as Supervisor[]);
    })();
  }, [user]);

  const loadAggregate = useCallback(async () => {
    if (!user) return;
    setLoadingAgg(true);
    const { data, error } = await (supabase as any).rpc("get_airsa_aggregate", {
      p_slice_type: sliceType,
      p_slice_value: sliceValue,
    });
    if (error) { toast.error("Failed to load AIRSA aggregate"); console.error(error); setAggregate(null); }
    else setAggregate(data as AirsaAggregate);
    setLoadingAgg(false);
  }, [user, sliceType, sliceValue]);

  useEffect(() => { loadAggregate(); }, [loadAggregate]);

  const loadNarrative = useCallback(async () => {
    if (!user) return;
    setLoadingNarrative(true);
    const { data, error } = await (supabase as any)
      .from("org_dashboard_narratives")
      .select("id, generated_at, participant_count, index_score, narrative_text")
      .eq("instrument_id", "INST-003")
      .eq("slice_type", sliceType)
      .eq("slice_value", sliceValue)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data) setLatestNarrative(data as StoredAirsaNarrative);
    else setLatestNarrative(null);
    setLoadingNarrative(false);
  }, [user, sliceType, sliceValue]);

  useEffect(() => { loadNarrative(); }, [loadNarrative]);

  const loadNarrativeHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("org_dashboard_narratives")
      .select("id, generated_at, participant_count, index_score")
      .eq("instrument_id", "INST-003")
      .eq("slice_type", sliceType)
      .eq("slice_value", sliceValue)
      .order("generated_at", { ascending: false })
      .limit(20);
    setNarrativeHistory((data ?? []) as NarrativeHistoryRow[]);
  }, [user, sliceType, sliceValue]);

  useEffect(() => { loadNarrativeHistory(); }, [loadNarrativeHistory]);

  const handleRegenerate = async () => {
    if (!user) return;
    setRegenerating(true);
    const supabaseUrl = "https://svprhtzawnbzmumxnhsq.supabase.co";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      toast.info("Generating AIRSA workforce narrative... (~140s)");
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-airsa-org-narrative`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slice_type: sliceType, slice_value: sliceValue }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Narrative generation failed");
      toast.success("AIRSA workforce narrative generated");

      await loadNarrative();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate narrative");
    }
    setRegenerating(false);
  };

  const tciOverall = aggregate?.tci_overall ?? null;
  const alignmentRate = aggregate?.alignment_rate ?? null;
  const blindSpotRate = aggregate?.blind_spot_rate ?? null;
  const underestimateRate = aggregate?.underestimate_rate ?? null;
  const completedCount = aggregate?.completed_count ?? 0;
  const eligibleCount = aggregate?.eligible_count ?? 0;
  const suppressed = aggregate?.suppressed ?? false;
  const riskFlags = latestNarrative?.narrative_text?.risk_flags ?? [];

  const tabs = ["overview", "domains", "skill-inventory", "manager-calibration", "trends"];
  const tabLabels: Record<string, string> = {
    "overview": "Overview",
    "domains": "Domains",
    "skill-inventory": "Skill Inventory",
    "manager-calibration": "Manager Calibration",
    "trends": "Trends + Cross-Instrument",
  };

  const sliceLabel = sliceType === "all"
    ? "All organization"
    : sliceType === "department"
      ? `Department: ${departments.find(d => d.id === sliceValue)?.name ?? sliceValue}`
      : sliceType === "team"
        ? `Team: ${supervisors.find(s => s.id === sliceValue)?.full_name ?? sliceValue}`
        : `${sliceType}: ${sliceValue}`;

  const sandBg: React.CSSProperties = { background: SAND, minHeight: "100vh" };

  return (
    <div style={sandBg}>
      <div style={{
        position: "sticky", top: 0, zIndex: 20, background: "var(--card)",
        borderBottom: "1px solid var(--border)", padding: "16px 24px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 auto", minWidth: 280 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: NAVY, margin: 0 }}>
              AIRSA Workforce Calibration
            </h1>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
              How accurately does the organization see its own AI talent?
            </div>
            {!suppressed && tciOverall !== null && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginTop: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted-foreground)" }}>
                    Talent Calibration Index
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <div style={{ fontSize: 36, fontWeight: 700, color: GREEN, lineHeight: 1 }}>{tciOverall.toFixed(1)}</div>
                    <div style={{ fontSize: 14, color: "var(--muted-foreground)" }}>/100</div>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 2 }}>
                    aligned + confirmed_strength out of all skill-pairs
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <SubMetricChip label="Alignment" value={alignmentRate} suffix="%" color={TEAL} />
                  <SubMetricChip label="Blind spot" value={blindSpotRate} suffix="%" color={NAVY} />
                  <SubMetricChip label="Underestimate" value={underestimateRate} suffix="%" color={PURPLE} />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              {sliceLabel} · n={completedCount}/{eligibleCount}
            </div>
            <Button variant="outline" size="sm" onClick={() => toast.info("PDF export coming soon")}>
              <Download className="h-3.5 w-3.5 mr-1" />
              Export PDF
            </Button>
            <Button size="sm" onClick={handleRegenerate} disabled={regenerating} style={{ background: GREEN, color: "#fff" }}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${regenerating ? "animate-spin" : ""}`} />
              {regenerating ? "Generating..." : (latestNarrative ? "↻ Regenerate AI" : "Generate AI Narrative")}
            </Button>
          </div>
        </div>

        {!loadingNarrative && !latestNarrative && !suppressed && (
          <div style={{
            marginTop: 12, padding: "10px 14px", borderRadius: 6,
            background: "#FFF7ED", border: `1px solid ${ORANGE}`,
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}>
            <div style={{ fontSize: 12, color: NAVY }}>
              No AI workforce narrative generated yet. Generate one to surface calibration risks and recommended interventions. Each generation counts against your organization's AI usage allowance.
            </div>
            <Button size="sm" onClick={handleRegenerate} disabled={regenerating} style={{ background: ORANGE, color: "#fff" }}>
              Generate now
            </Button>
          </div>
        )}

        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Slice:</span>
          <button
            onClick={() => { setSliceType("all"); setSliceValue("all"); }}
            style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 20, cursor: "pointer",
              border: `0.5px solid ${sliceType === "all" ? NAVY : "var(--border)"}`,
              background: sliceType === "all" ? "#e8edf1" : "var(--muted)",
              color: sliceType === "all" ? NAVY : "var(--muted-foreground)",
            }}
          >All organization</button>
          {departments.length > 0 && (
            <select
              value={sliceType === "department" ? sliceValue : "all"}
              onChange={e => { if (e.target.value !== "all") { setSliceType("department"); setSliceValue(e.target.value); } else { setSliceType("all"); setSliceValue("all"); } }}
              style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, border: "0.5px solid var(--border)", background: "var(--card)", color: "var(--foreground)", cursor: "pointer" }}
            >
              <option value="all">All departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <select
            value={sliceType === "org_level" ? sliceValue : "all"}
            onChange={e => { if (e.target.value !== "all") { setSliceType("org_level"); setSliceValue(e.target.value); } else { setSliceType("all"); setSliceValue("all"); } }}
            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, border: "0.5px solid var(--border)", background: "var(--card)", color: "var(--foreground)", cursor: "pointer" }}
          >
            <option value="all">All levels</option>
            {["IC", "Manager", "Director", "VP", "C-Suite", "Other"].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={sliceType === "team" ? sliceValue : "all"}
            onChange={e => {
              if (e.target.value !== "all") { setSliceType("team"); setSliceValue(e.target.value); }
              else { setSliceType("all"); setSliceValue("all"); }
            }}
            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, border: "0.5px solid var(--border)", background: "var(--card)", color: "var(--foreground)", cursor: "pointer" }}
          >
            <option value="all">All teams</option>
            {supervisors.map(s => <option key={`team-${s.id}`} value={s.id}>{s.full_name}</option>)}
          </select>
          <span style={{ fontSize: 10, color: "var(--muted-foreground)", marginLeft: "auto" }}>
            min 5 per slice · min 3 per supervisor
          </span>
        </div>
      </div>

      <div style={{
        display: "flex", gap: 4, borderBottom: "1px solid var(--border)",
        padding: "0 24px", background: "var(--card)", overflowX: "auto",
      }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              fontSize: 12, padding: "8px 14px", cursor: "pointer", background: "none", border: "none",
              borderBottom: activeTab === tab ? `2px solid ${ORANGE}` : "2px solid transparent",
              color: activeTab === tab ? NAVY : "var(--muted-foreground)",
              fontWeight: activeTab === tab ? 500 : 400, whiteSpace: "nowrap", marginBottom: -0.5,
            }}
          >{tabLabels[tab]}</button>
        ))}
      </div>

      <div style={{ padding: "20px 24px" }}>
        {suppressed && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: 24, textAlign: "center" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: NAVY, margin: 0 }}>Insufficient data for this slice</h3>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 8 }}>
              {aggregate?.reason === "insufficient_participants"
                ? `Only ${aggregate?.eligible_count ?? 0} eligible participants in this slice (minimum required: ${aggregate?.minimum_required ?? 5}).`
                : aggregate?.reason === "insufficient_completed_pairs"
                ? `Only ${aggregate?.completed_count ?? 0} of ${aggregate?.eligible_count ?? 0} eligible participants have completed AIRSA (minimum required: ${aggregate?.minimum_required ?? 5}).`
                : "Select a broader slice or wait for more completions."}
            </p>
          </div>
        )}

        {loadingAgg && !aggregate && (
          <div style={{ textAlign: "center", padding: 40, fontSize: 12, color: "var(--muted-foreground)" }}>
            Loading AIRSA aggregate...
          </div>
        )}

        {activeTab === "overview" && !suppressed && aggregate && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {latestNarrative?.narrative_text?.summary && (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 8 }}>
                  AI Workforce Calibration Summary
                </div>
                <div style={{ fontSize: 12, color: "var(--foreground)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {latestNarrative.narrative_text.summary}
                </div>
                {Array.isArray(latestNarrative.narrative_text.top_interventions) && latestNarrative.narrative_text.top_interventions.length > 0 && (
                  <div style={{ marginTop: 14, padding: 12, background: SAND, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: NAVY, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Top 3 recommended actions
                    </div>
                    {latestNarrative.narrative_text.top_interventions.map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, color: ORANGE }}>{i + 1}</span>
                        <span>
                          <span style={{ fontWeight: 600 }}>{item.title}</span>
                          {item.rationale && (
                            <span style={{ color: "var(--muted-foreground)" }}>{" — "}{item.rationale}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 12 }}>
                  <button
                    onClick={() => setExpandedNarrativeCard(v => !v)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 11, color: TEAL, fontWeight: 500 }}
                  >
                    {expandedNarrativeCard ? "↑ collapse" : "↓ expand for full narrative"}
                  </button>
                  {expandedNarrativeCard && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                      {latestNarrative.narrative_text.business_meaning && (
                        <div>
                          <h4 style={{ fontSize: 11, fontWeight: 600, color: NAVY, margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>Business meaning</h4>
                          <p style={{ fontSize: 12, lineHeight: 1.6, marginTop: 4, whiteSpace: "pre-wrap" }}>{latestNarrative.narrative_text.business_meaning}</p>
                        </div>
                      )}
                      {latestNarrative.narrative_text.benefits && (
                        <div>
                          <h4 style={{ fontSize: 11, fontWeight: 600, color: NAVY, margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>Benefits to capitalize</h4>
                          <p style={{ fontSize: 12, lineHeight: 1.6, marginTop: 4, whiteSpace: "pre-wrap" }}>{latestNarrative.narrative_text.benefits}</p>
                        </div>
                      )}
                      {latestNarrative.narrative_text.risks && (
                        <div>
                          <h4 style={{ fontSize: 11, fontWeight: 600, color: NAVY, margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>Risks if patterns persist</h4>
                          <p style={{ fontSize: 12, lineHeight: 1.6, marginTop: 4, whiteSpace: "pre-wrap" }}>{latestNarrative.narrative_text.risks}</p>
                        </div>
                      )}
                      {latestNarrative.narrative_text.next_steps && (
                        <div>
                          <h4 style={{ fontSize: 11, fontWeight: 600, color: NAVY, margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>Next steps</h4>
                          <p style={{ fontSize: 12, lineHeight: 1.6, marginTop: 4, whiteSpace: "pre-wrap" }}>{latestNarrative.narrative_text.next_steps}</p>
                        </div>
                      )}
                      {latestNarrative.narrative_text.reassessment_note && (
                        <div>
                          <h4 style={{ fontSize: 11, fontWeight: 600, color: NAVY, margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>Reassessment guidance</h4>
                          <p style={{ fontSize: 12, lineHeight: 1.6, marginTop: 4, whiteSpace: "pre-wrap" }}>{latestNarrative.narrative_text.reassessment_note}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              <RankingPanel
                title="Greatest Growth Opportunities"
                subtitle="Composite priority score · 0-2 scale, higher = more urgent"
                accent={ORANGE}
                skillItems={(aggregate.rankings?.growth_skills ?? []).slice(0, expandedRankingsLeft ? 5 : 2)}
                domainItems={(aggregate.rankings?.growth_domains ?? []).slice(0, expandedRankingsLeft ? 4 : 2)}
                metricKey="cps_growth"
                metricLabel="CPS"
                expanded={expandedRankingsLeft}
                onToggle={() => setExpandedRankingsLeft(v => !v)}
              />
              <RankingPanel
                title="Strengths to Capitalize"
                subtitle="% of pairs at confirmed strength · both rated Advanced"
                accent={GREEN}
                skillItems={(aggregate.rankings?.strength_skills ?? []).slice(0, expandedRankingsRight ? 5 : 2)}
                domainItems={(aggregate.rankings?.strength_domains ?? []).slice(0, expandedRankingsRight ? 4 : 2)}
                metricKey="cps_strength"
                metricLabel="% confirmed strength"
                expanded={expandedRankingsRight}
                onToggle={() => setExpandedRankingsRight(v => !v)}
              />
            </div>

            {(() => {
              const skillAggMap = aggregate.skill_aggregates ?? {};
              const deptSet = new Set<string>();
              Object.values(skillAggMap).forEach(s => {
                Object.keys(s.per_department_breakdown ?? {}).forEach(k => deptSet.add(k));
              });
              const calibrationDepartments = Array.from(deptSet).sort();
              const unassignedIdx = calibrationDepartments.indexOf("(unassigned)");
              if (unassignedIdx >= 0) {
                calibrationDepartments.splice(unassignedIdx, 1);
                calibrationDepartments.push("(unassigned)");
              }
              const topGrowthSkills = new Set(
                (aggregate.rankings?.growth_skills ?? []).slice(0, 2).map(s => s.skill_number)
              );
              const topStrengthSkills = new Set(
                (aggregate.rankings?.strength_skills ?? []).slice(0, 2).map(s => s.skill_number)
              );
              const sortedSkills: Array<[string, SkillAggregate]> = Object.entries(skillAggMap)
                .sort(([a], [b]) => parseInt(a) - parseInt(b));

              const cells: React.ReactNode[] = [];
              cells.push(<div key="corner" />);
              calibrationDepartments.forEach(dept => {
                cells.push(
                  <div key={`header-${dept}`} style={{
                    padding: "6px 4px", textAlign: "center", fontWeight: 500, color: NAVY,
                    fontSize: 10, borderBottom: "0.5px solid var(--border)",
                  }}>{dept}</div>
                );
              });
              sortedSkills.forEach(([skillNumStr, skill]) => {
                const skillNum = parseInt(skillNumStr);
                const isTopGrowth = topGrowthSkills.has(skillNum);
                const isTopStrength = topStrengthSkills.has(skillNum);
                const domainColor = DOMAIN_COLORS[skill.dimension_id] ?? "#000";
                cells.push(
                  <div key={`label-${skillNum}`} style={{
                    padding: "6px 8px", borderLeft: `4px solid ${domainColor}`, background: "#FAFAFA",
                    display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--foreground)",
                  }}>
                    <span style={{ color: "var(--muted-foreground)", minWidth: 20 }}>{skillNum}.</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{skill.skill_name}</span>
                    {isTopGrowth && <span style={{ color: ORANGE, fontWeight: 600 }} title="Top growth priority">▲</span>}
                    {isTopStrength && <span style={{ color: GREEN, fontWeight: 600 }} title="Top confirmed strength">◆</span>}
                  </div>
                );
                calibrationDepartments.forEach(dept => {
                  const cell: any = skill.per_department_breakdown?.[dept];
                  if (!cell) {
                    cells.push(
                      <div key={`cell-${skillNum}-${dept}`} style={{
                        background: "var(--muted)", border: "0.5px solid var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, color: "var(--muted-foreground)", borderRadius: 2,
                      }} title="No participants in this department for this skill">—</div>
                    );
                    return;
                  }
                  if (cell.suppressed) {
                    cells.push(
                      <div key={`cell-${skillNum}-${dept}`} style={{
                        background: "var(--muted)", border: "0.5px solid var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, color: "var(--muted-foreground)", borderRadius: 2,
                      }} title={`n=${cell.n} (suppressed; minimum 5 required)`}>n&lt;5</div>
                    );
                    return;
                  }
                  const statusInfo = STATUS_COLORS[cell.modal_status];
                  const isBlindSpot = cell.modal_status === "blind_spot";
                  const tooltip = `n=${cell.n} · ${statusInfo?.label ?? cell.modal_status} (modal) · TCI ${cell.tci.toFixed(1)} · blind ${cell.blind_spot_pct.toFixed(1)}% · under ${cell.underestimate_pct.toFixed(1)}%`;
                  cells.push(
                    <div key={`cell-${skillNum}-${dept}`} style={{
                      background: isBlindSpot ? "transparent" : (statusInfo?.color ?? "#999"),
                      border: isBlindSpot ? `1.5px dashed ${statusInfo?.color ?? "#999"}` : `0.5px solid ${statusInfo?.color ?? "#999"}`,
                      color: isBlindSpot ? (statusInfo?.color ?? "#000") : "#FFFFFF",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 500, borderRadius: 2, cursor: "default",
                    }} title={tooltip}>{cell.tci.toFixed(0)}</div>
                  );
                });
              });

              return (
                <div style={{
                  background: "#FFFFFF", border: "0.5px solid var(--border)", borderRadius: 12,
                  padding: "16px 18px", marginBottom: 0,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 600, color: NAVY, margin: 0 }}>Calibration Map</h2>
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                      24 skills × {calibrationDepartments.length} {calibrationDepartments.length === 1 ? "department" : "departments"}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 12 }}>
                    Cell color shows the modal calibration status for that skill in that department. Hover for details. ▲ marks top 2 growth priorities · ◆ marks top 2 confirmed strengths.
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 10, marginBottom: 12, paddingBottom: 10, borderBottom: "0.5px solid var(--border)" }}>
                    {Object.entries(STATUS_COLORS).map(([key, val]) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{
                          width: 12, height: 12, borderRadius: 2,
                          background: key === "blind_spot" ? "transparent" : val.color,
                          ...(key === "blind_spot" ? { border: `1.5px dashed ${val.color}` } : {}),
                        }} />
                        <span style={{ color: "var(--muted-foreground)" }}>{val.label}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 2, background: "var(--muted)", border: "0.5px solid var(--border)" }} />
                      <span style={{ color: "var(--muted-foreground)" }}>n&lt;5 (suppressed)</span>
                    </div>
                  </div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: `260px repeat(${calibrationDepartments.length}, minmax(72px, 1fr))`,
                    gap: 2, fontSize: 11,
                  }}>
                    {cells}
                  </div>
                </div>
              );
            })()}


            {riskFlags.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>Risk flags</div>
                {riskFlags.map(flag => {
                  const isExpanded = expandedRiskFlags.has(flag.id);
                  const isHigh = flag.level === "high";
                  return (
                    <div
                      key={flag.id}
                      onClick={() => toggleRiskFlag(flag.id)}
                      style={{
                        background: "var(--card)", border: `1px solid ${isHigh ? ORANGE : "#fef0e7"}`,
                        borderLeft: `4px solid ${isHigh ? ORANGE : ORANGE}`,
                        borderRadius: 6, padding: 12, cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            fontSize: 9, textTransform: "uppercase", padding: "2px 6px", borderRadius: 3,
                            background: isHigh ? ORANGE : "#fef0e7", color: isHigh ? "#fff" : ORANGE, fontWeight: 600, letterSpacing: 0.5,
                          }}>{flag.level}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{flag.title}</span>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{isExpanded ? "↑" : "↓"}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--foreground)", marginTop: 6 }}>{flag.summary}</div>
                      {isExpanded && flag.detail && (
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 8, whiteSpace: "pre-wrap" }}>{flag.detail}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "domains" && !suppressed && aggregate && (
          <div data-export-tab="true">
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14 }}>
              Eight AIRSA domains, ordered by growth priority. Each card shows the calibration distribution across the 5 statuses for that domain.
            </p>
            {(() => {
              const domainOrder = (aggregate.rankings?.growth_domains ?? []).map(d => d.dimension_id);
              Object.keys(aggregate.domain_aggregates ?? {}).forEach(dimId => {
                if (!domainOrder.includes(dimId)) domainOrder.push(dimId);
              });
              return domainOrder.map(dimId => {
                const dom = aggregate.domain_aggregates?.[dimId];
                if (!dom) return null;
                if (dom.suppressed) {
                  return (
                    <div key={dimId} style={{
                      background: "#FFFFFF", border: "0.5px solid var(--border)",
                      borderRadius: 12, padding: 14, marginBottom: 14, boxShadow: "var(--shadow-sm)", opacity: 0.6,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: DOMAIN_COLORS[dimId] }} />
                        <span style={{ fontSize: 14, fontWeight: 500, color: DOMAIN_COLORS[dimId] }}>{dom.domain_name}</span>
                        <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>n&lt;5 — suppressed for privacy</span>
                      </div>
                    </div>
                  );
                }
                const blindPct = dom.blind_spot_pct;
                const underPct = dom.underestimate_pct;
                const confStrengthPct = dom.confirmed_strength_pct;
                const otherPct = Math.max(0, 100 - confStrengthPct - blindPct - underPct);
                return (
                  <div key={dimId} style={{
                    background: "#FFFFFF", border: "0.5px solid var(--border)",
                    borderRadius: 12, padding: 14, marginBottom: 14, boxShadow: "var(--shadow-sm)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: DOMAIN_COLORS[dimId] }} />
                        <span style={{ fontSize: 15, fontWeight: 500, color: DOMAIN_COLORS[dimId] }}>{dom.domain_name}</span>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 20, background: "#fef0e7", color: ORANGE, fontWeight: 500 }}>
                          Growth CPS {dom.cps_growth.toFixed(2)}
                        </span>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 20, background: "#e8f3ee", color: GREEN, fontWeight: 500 }}>
                          Strength {dom.cps_strength.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                        <span style={{ fontSize: 24, fontWeight: 600, color: DOMAIN_COLORS[dimId] }}>{dom.tci.toFixed(0)}</span>
                        <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>TCI · n={dom.n}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", gap: 2, marginBottom: 4 }}>
                      <div style={{ width: `${confStrengthPct}%`, background: STATUS_COLORS.confirmed_strength.color }} title={`Confirmed strength ${confStrengthPct.toFixed(1)}%`} />
                      <div style={{ width: `${otherPct}%`, background: STATUS_COLORS.aligned.color }} title={`Aligned + confirmed gap (combined) ${otherPct.toFixed(1)}%`} />
                      <div style={{ width: `${blindPct}%`, background: STATUS_COLORS.blind_spot.color }} title={`Blind spot ${blindPct.toFixed(1)}%`} />
                      <div style={{ width: `${underPct}%`, background: STATUS_COLORS.underestimate.color }} title={`Underestimate ${underPct.toFixed(1)}%`} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted-foreground)" }}>
                      <span style={{ color: STATUS_COLORS.confirmed_strength.color }}>Confirmed {confStrengthPct.toFixed(0)}%</span>
                      <span>Other {otherPct.toFixed(0)}%</span>
                      <span style={{ color: STATUS_COLORS.blind_spot.color }}>Blind {blindPct.toFixed(0)}%</span>
                      <span style={{ color: STATUS_COLORS.underestimate.color }}>Under {underPct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {activeTab === "skill-inventory" && !suppressed && aggregate && (
          <div data-export-tab="true">
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12 }}>
              All 24 AIRSA skills with TCI and calibration metrics. Click any column header to sort. Click a row to expand per-department breakdown.
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
              <input type="text" placeholder="Search skill name..." value={skillFilterText} onChange={e => setSkillFilterText(e.target.value)}
                style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "0.5px solid var(--border)", background: "var(--card)", color: "var(--foreground)", minWidth: 200 }} />
              <select value={skillFilterDomain} onChange={e => setSkillFilterDomain(e.target.value)}
                style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "0.5px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }}>
                <option value="all">All domains</option>
                {Object.entries(DOMAIN_NAMES).map(([dimId, name]) => (
                  <option key={dimId} value={dimId}>{name}</option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                Sort: {skillSortKey} ({skillSortDir})
              </span>
            </div>
            {(() => {
              const rows = Object.entries(aggregate.skill_aggregates ?? {})
                .map(([numStr, skill]) => ({ skill_number: parseInt(numStr), ...skill }))
                .filter(r => skillFilterDomain === "all" ? true : r.dimension_id === skillFilterDomain)
                .filter(r => skillFilterText.trim() === "" ? true : r.skill_name.toLowerCase().includes(skillFilterText.trim().toLowerCase()))
                .sort((a, b) => {
                  const aVal = (a as any)[skillSortKey];
                  const bVal = (b as any)[skillSortKey];
                  let cmp = 0;
                  if (typeof aVal === "number" && typeof bVal === "number") cmp = aVal - bVal;
                  else cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
                  return skillSortDir === "asc" ? cmp : -cmp;
                });
              const headers: { key: SkillSortKey; label: string; align?: "right" | "left" }[] = [
                { key: "skill_number", label: "#", align: "left" },
                { key: "skill_name", label: "Skill", align: "left" },
                { key: "domain_name", label: "Domain", align: "left" },
                { key: "tci", label: "TCI", align: "right" },
                { key: "cps_growth", label: "Growth CPS", align: "right" },
                { key: "cps_strength", label: "Strength %", align: "right" },
                { key: "blind_spot_pct", label: "Blind %", align: "right" },
                { key: "underestimate_pct", label: "Under %", align: "right" },
                { key: "n", label: "n", align: "right" },
              ];
              return (
                <div style={{ background: "#FFFFFF", border: "0.5px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "var(--muted)" }}>
                        <th style={{ width: 24 }}></th>
                        {headers.map(h => (
                          <th key={h.key} onClick={() => handleSkillSort(h.key)}
                            style={{
                              padding: "8px 10px", textAlign: h.align ?? "left", fontSize: 10,
                              color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em",
                              fontWeight: 500, cursor: "pointer", userSelect: "none",
                              borderBottom: "0.5px solid var(--border)",
                            }}>
                            {h.label}{skillSortKey === h.key ? (skillSortDir === "asc" ? " ↑" : " ↓") : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => {
                        const isExpanded = expandedSkillRows.has(r.skill_number);
                        const dotColor = DOMAIN_COLORS[r.dimension_id] ?? "#000";
                        return (
                          <Fragment key={r.skill_number}>
                            <tr onClick={() => toggleSkillRow(r.skill_number)} style={{ cursor: "pointer", borderBottom: "0.5px solid var(--border)" }}>
                              <td style={{ padding: "6px 8px", fontSize: 11, color: "var(--muted-foreground)" }}>{isExpanded ? "▾" : "▸"}</td>
                              <td style={{ padding: "6px 10px", color: "var(--muted-foreground)" }}>{r.skill_number}</td>
                              <td style={{ padding: "6px 10px", color: "var(--foreground)", fontWeight: 500 }}>{r.skill_name}</td>
                              <td style={{ padding: "6px 10px" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor }} />
                                  <span style={{ fontSize: 11 }}>{DOMAIN_SHORT_NAMES[r.dimension_id] ?? r.domain_name}</span>
                                </span>
                              </td>
                              <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 500, color: NAVY }}>{r.tci.toFixed(1)}</td>
                              <td style={{ padding: "6px 10px", textAlign: "right", color: ORANGE }}>{r.cps_growth.toFixed(2)}</td>
                              <td style={{ padding: "6px 10px", textAlign: "right", color: GREEN }}>{r.cps_strength.toFixed(1)}%</td>
                              <td style={{ padding: "6px 10px", textAlign: "right", color: STATUS_COLORS.blind_spot.color }}>{r.blind_spot_pct.toFixed(1)}%</td>
                              <td style={{ padding: "6px 10px", textAlign: "right", color: STATUS_COLORS.underestimate.color }}>{r.underestimate_pct.toFixed(1)}%</td>
                              <td style={{ padding: "6px 10px", textAlign: "right", color: "var(--muted-foreground)" }}>{r.n}</td>
                            </tr>
                            {isExpanded && (
                              <tr style={{ background: "#FAFAFA" }}>
                                <td colSpan={10} style={{ padding: "10px 16px 14px 32px" }}>
                                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8 }}>
                                    Per-department breakdown for Skill {r.skill_number}. {r.skill_name}:
                                  </div>
                                  {Object.keys(r.per_department_breakdown ?? {}).length === 0 ? (
                                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontStyle: "italic" }}>No per-department data available.</div>
                                  ) : (
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                                      {Object.entries(r.per_department_breakdown ?? {}).map(([dept, cellAny]) => {
                                        const cell: any = cellAny;
                                        if (cell.suppressed) {
                                          return (
                                            <div key={dept} style={{ background: "var(--muted)", padding: "8px 10px", borderRadius: 6 }}>
                                              <div style={{ fontSize: 11, fontWeight: 500, color: NAVY, marginBottom: 2 }}>{dept}</div>
                                              <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>n={cell.n} (suppressed)</div>
                                            </div>
                                          );
                                        }
                                        const statusInfo = STATUS_COLORS[cell.modal_status];
                                        return (
                                          <div key={dept} style={{
                                            background: "#FFFFFF", padding: "8px 10px", borderRadius: 6,
                                            border: `0.5px solid ${statusInfo?.color ?? "#999"}`,
                                          }}>
                                            <div style={{ fontSize: 11, fontWeight: 500, color: NAVY, marginBottom: 2 }}>{dept}</div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: statusInfo?.color ?? NAVY }}>
                                              TCI {cell.tci.toFixed(0)}
                                            </div>
                                            <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 2 }}>
                                              n={cell.n} · {statusInfo?.label ?? cell.modal_status}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                      {rows.length === 0 && (
                        <tr><td colSpan={10} style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>No skills match the current filter.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === "manager-calibration" && !suppressed && aggregate && (
          <div data-export-tab="true">
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14 }}>
              Manager-by-manager calibration for supervisors with at least 3 reports who completed AIRSA. Each card shows the supervisor's reports' TCI plus the asymmetry between blind-spot and underestimate rates.
            </p>
            {(() => {
              const mgrs = aggregate.manager_calibration ?? [];
              if (mgrs.length === 0) {
                return (
                  <div style={{ padding: 32, textAlign: "center", background: "var(--muted)", borderRadius: 12, color: "var(--muted-foreground)" }}>
                    No supervisors meet the 3-reports privacy threshold for this slice.
                  </div>
                );
              }
              const sortedDesc = [...mgrs].sort((a, b) => b.tci - a.tci);
              const sortedAsc = [...mgrs].sort((a, b) => a.tci - b.tci);
              const top5 = sortedDesc.slice(0, 5);
              const bottom5 = sortedAsc.slice(0, 5).filter(b => !top5.some(t => t.supervisor_id === b.supervisor_id));
              const renderCard = (m: ManagerCalibrationEntry) => {
                const asym = m.blind_spot_pct - m.underestimate_pct;
                const asymLabel = asym > 5 ? "Over-rates reports" : asym < -5 ? "Under-rates reports" : "Balanced";
                const asymColor = asym > 5 ? STATUS_COLORS.blind_spot.color : asym < -5 ? STATUS_COLORS.underestimate.color : GREEN;
                const tciColor = m.tci >= 50 ? GREEN : m.tci >= 35 ? ORANGE : STATUS_COLORS.blind_spot.color;
                return (
                  <div key={m.supervisor_id} style={{
                    background: "#FFFFFF", border: "0.5px solid var(--border)",
                    borderRadius: 10, padding: 14, boxShadow: "var(--shadow-sm)",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: NAVY, marginBottom: 6 }}>{m.supervisor_name}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 22, fontWeight: 600, color: tciColor }}>{m.tci.toFixed(1)}</span>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>TCI · {m.n_reports} reports · {m.n_skill_pairs} pairs</span>
                    </div>
                    <div style={{ fontSize: 11, color: asymColor, fontWeight: 500, marginBottom: 6 }}>{asymLabel}</div>
                    <div style={{ fontSize: 10, color: "var(--muted-foreground)", display: "flex", justifyContent: "space-between" }}>
                      <span>Blind spot {m.blind_spot_pct.toFixed(1)}%</span>
                      <span>Underestimate {m.underestimate_pct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              };
              return (
                <>
                  <div style={{ marginBottom: 18 }}>
                    <h3 style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Top {top5.length} best calibrated
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                      {top5.map(renderCard)}
                    </div>
                  </div>
                  {bottom5.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Bottom {bottom5.length} requiring attention
                      </h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                        {bottom5.map(renderCard)}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {activeTab === "trends" && !suppressed && aggregate && (
          <div data-export-tab="true">
            <h3 style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              TCI over time
            </h3>
            {narrativeHistory.length < 2 ? (
              <div style={{ padding: 24, textAlign: "center", background: "var(--muted)", borderRadius: 12, color: "var(--muted-foreground)", fontSize: 12, marginBottom: 24 }}>
                {narrativeHistory.length === 0
                  ? "No AI narratives generated yet. Generate one to start tracking TCI over time."
                  : "Only one AI narrative generated for this slice. Generate a second one (after additional completions) to see TCI trend."}
              </div>
            ) : (
              <div style={{ background: "#FFFFFF", border: "0.5px solid var(--border)", borderRadius: 8, padding: 14, marginBottom: 24, boxShadow: "var(--shadow-sm)" }}>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={[...narrativeHistory].reverse().map(h => ({
                    generated_at: new Date(h.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    tci: typeof h.index_score === "number" ? h.index_score : (h.index_score ? parseFloat(h.index_score as any) : null),
                    n: h.participant_count,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="generated_at" tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <Tooltip contentStyle={{ background: "#FFFFFF", border: "0.5px solid #e5e7eb", fontSize: 12 }} />
                    <ReferenceLine y={50} stroke={ORANGE} strokeDasharray="3 3" label={{ value: "TCI 50", fontSize: 10, fill: ORANGE, position: "right" }} />
                    <Line type="monotone" dataKey="tci" stroke={GREEN} strokeWidth={2} dot={{ r: 4, fill: GREEN }} name="TCI" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <h3 style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Cross-instrument analysis
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "var(--muted)", border: "0.5px dashed var(--border)", borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: NAVY, marginBottom: 4 }}>PTP × AIRSA correlation</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Coming post-launch (Phase 7). Will surface where PTP threat-pattern dimensions correlate with AIRSA calibration patterns.</div>
              </div>
              <div style={{ background: "var(--muted)", border: "0.5px dashed var(--border)", borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: NAVY, marginBottom: 4 }}>NAI × AIRSA correlation</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Coming post-launch (Phase 7). Will surface where NAI C.A.F.E.S. dimensions correlate with AIRSA skill-level readiness.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SubMetricChip({ label, value, suffix, color }: { label: string; value: number | null; suffix: string; color: string }) {
  return (
    <div style={{
      background: "var(--muted)", borderRadius: 6, padding: "6px 10px", minWidth: 80,
    }}>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted-foreground)" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color }}>
        {value === null ? "—" : `${value.toFixed(1)}${suffix}`}
      </div>
    </div>
  );
}

function RankingPanel({
  title, subtitle, accent, skillItems, domainItems, metricKey, metricLabel, expanded, onToggle,
}: {
  title: string;
  subtitle: string;
  accent: string;
  skillItems: RankedSkill[];
  domainItems: RankedDomain[];
  metricKey: "cps_growth" | "cps_strength";
  metricLabel: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 2, borderBottom: `2px solid ${accent}`, paddingBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 12, marginTop: 4, fontStyle: "italic" }}>
        {subtitle}
      </div>
      {skillItems.length === 0 && domainItems.length === 0 ? (
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", padding: 8 }}>
          No items above the n≥5 suppression threshold.
        </div>
      ) : (
        <>
          {skillItems.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted-foreground)", margin: "0 0 6px 0" }}>Skills</h4>
              {skillItems.map(s => (
                <div key={s.skill_number} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "4px 0", fontSize: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: DOMAIN_COLORS[s.dimension_id] ?? GRAY, flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Skill {s.skill_number}. {s.skill_name}
                    </span>
                  </div>
                  <span style={{ fontWeight: 600, color: accent, flexShrink: 0 }}>
                    {((s as any)[metricKey] ?? 0).toFixed(metricKey === "cps_strength" ? 1 : 2)}
                    {metricKey === "cps_strength" ? "%" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
          {domainItems.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <h4 style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted-foreground)", margin: "0 0 6px 0" }}>Domains</h4>
              {domainItems.map(d => (
                <div key={d.dimension_id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "4px 0", fontSize: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: DOMAIN_COLORS[d.dimension_id] ?? GRAY, flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.domain_name}</span>
                  </div>
                  <span style={{ fontWeight: 600, color: accent, flexShrink: 0 }}>
                    {((d as any)[metricKey] ?? 0).toFixed(metricKey === "cps_strength" ? 1 : 2)}
                    {metricKey === "cps_strength" ? "%" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={onToggle}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 11, color: TEAL, fontWeight: 500 }}
          >
            {expanded ? "↑ collapse" : "↓ view full ranking"}
          </button>
        </>
      )}
    </div>
  );
}
