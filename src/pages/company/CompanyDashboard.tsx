import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";

// ── Brand colors ─────────────────────────────────────────────────────────────
const NAVY = "#021F36";
const ORANGE = "#F5741A";
const TEAL = "#006D77";
const SAND = "#F9F7F1";

const DIM_COLORS: Record<string, string> = {
  "DIM-NAI-01": "#021F36",
  "DIM-NAI-02": "#F5741A",
  "DIM-NAI-03": "#006D77",
  "DIM-NAI-04": "#3C096C",
  "DIM-NAI-05": "#7a5800",
};
const DIM_NAMES: Record<string, string> = {
  "DIM-NAI-01": "Certainty",
  "DIM-NAI-02": "Agency",
  "DIM-NAI-03": "Fairness",
  "DIM-NAI-04": "Ego Stability",
  "DIM-NAI-05": "Saturation",
};
const DIM_WEIGHTS: Record<string, number> = {
  "DIM-NAI-03": 0.28,
  "DIM-NAI-04": 0.25,
  "DIM-NAI-02": 0.22,
  "DIM-NAI-01": 0.15,
  "DIM-NAI-05": 0.10,
};
const DIMS_BY_WEIGHT = ["DIM-NAI-03", "DIM-NAI-04", "DIM-NAI-02", "DIM-NAI-01", "DIM-NAI-05"];

function activationLabel(score: number) {
  if (score >= 76) return { label: "High", bg: "#faece7", color: "#993c1d" };
  if (score >= 50) return { label: "Elevated", bg: "#faeeda", color: "#633806" };
  return { label: "Low", bg: "#e1f5ee", color: "#0f6e56" };
}

function calcIndex(dims: Record<string, DimAggregate>) {
  const friction = Object.entries(DIM_WEIGHTS).reduce((acc, [dimId, weight]) => {
    return acc + (dims[dimId]?.avg_score ?? 50) * weight;
  }, 0);
  return Math.round((100 - friction) * 10) / 10;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface UsageSummary {
  active_users: number;
  seat_count: number;
  completions_30d: Record<string, number>;
  completion_rate: { completed: number; eligible: number; pct: number };
  dept_participation: Array<{
    department_id: string;
    department_name: string;
    eligible: number;
    completed: number;
    pct: number;
  }>;
  signal_banner: {
    last_generated_at: string | null;
    last_participant_count: number | null;
    new_since_last: number;
    pct_new: number;
    show_banner: boolean;
  };
  ai_usage: { chat_used: number; chat_allowance: number; ai_chat_enabled: boolean };
}

interface DimAggregate {
  avg_score: number;
  pct_high: number;
  pct_elevated: number;
  pct_low: number;
  pct_at_75_plus: number;
}

interface AggregateResult {
  suppressed: boolean;
  reason?: string;
  participant_count: number;
  minimum_required?: number;
  eligible_count?: number;
  dimensions?: Record<string, DimAggregate>;
}

interface RiskFlag {
  id: string;
  level: "high" | "warn";
  title: string;
  summary: string;
  detail: string;
}

interface StoredNarrative {
  id: string;
  generated_at: string;
  participant_count: number;
  index_score: number;
  narrative_text: {
    risk_flags?: RiskFlag[];
    business_meaning?: string;
    benefits?: string;
    risks?: string;
    next_steps?: string;
    reassessment_note?: string;
  };
}

interface Intervention {
  id: string;
  title: string;
  description: string;
  target_dimensions: string[];
  priority: "high" | "medium" | "low";
  time_horizon: string;
  intervention_type: string;
}

interface NarrativeHistory {
  id: string;
  generated_at: string;
  participant_count: number;
  index_score: number;
  slice_type: string;
  slice_value: string;
  narrative_text: {
    risk_flags?: RiskFlag[];
    business_meaning?: string;
    benefits?: string;
    risks?: string;
    next_steps?: string;
    reassessment_note?: string;
  };
  interventions?: Intervention[];
}

interface Department {
  id: string;
  name: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CompanyDashboard() {
  const { user } = useAuth();

  const [sliceType, setSliceType] = useState<string>("all");
  const [sliceValue, setSliceValue] = useState<string>("all");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [idxPeriod, setIdxPeriod] = useState<"all" | "30">("all");

  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [aggregate, setAggregate] = useState<AggregateResult | null>(null);
  const [latestNarrative, setLatestNarrative] = useState<StoredNarrative | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [loadingAgg, setLoadingAgg] = useState(true);
  const [loadingNarrative, setLoadingNarrative] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [expandedFlags, setExpandedFlags] = useState<Set<string>>(new Set());
  const [expandedSplit, setExpandedSplit] = useState(false);
  const [expandedMethod, setExpandedMethod] = useState(true);

  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [narrativeHistory, setNarrativeHistory] = useState<NarrativeHistory[]>([]);
  const [loadingInterventions, setLoadingInterventions] = useState(false);
  const [expandedDims, setExpandedDims] = useState<Set<string>>(new Set());
  const [trackingModal, setTrackingModal] = useState<{ open: boolean; intervention: Intervention | null }>({ open: false, intervention: null });
  const [trackingNote, setTrackingNote] = useState("");
  const [trackingStatus, setTrackingStatus] = useState("not_started");
  const [savingTracking, setSavingTracking] = useState(false);

  // Load departments
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any).from("departments").select("id, name").order("name");
      setDepartments((data ?? []).map((d: any) => ({ id: d.id, name: d.name })));
    })();
  }, [user]);

  // Load usage summary
  const loadUsage = useCallback(async () => {
    if (!user) return;
    setLoadingUsage(true);
    const { data, error } = await (supabase as any).rpc("get_org_usage_summary", { p_instrument: "INST-002" });
    if (error) { toast.error("Failed to load usage summary"); console.error(error); }
    else setUsage(data as UsageSummary);
    setLoadingUsage(false);
  }, [user]);

  // Load aggregate
  const loadAggregate = useCallback(async () => {
    if (!user) return;
    setLoadingAgg(true);
    const { data, error } = await (supabase as any).rpc("get_instrument_aggregate", {
      p_instrument: "INST-002",
      p_slice_type: sliceType,
      p_slice_value: sliceValue,
    });
    if (error) { toast.error("Failed to load aggregate data"); console.error(error); }
    else setAggregate(data as AggregateResult);
    setLoadingAgg(false);
  }, [user, sliceType, sliceValue]);

  // Load latest stored narrative (for risk flags)
  const loadNarrative = useCallback(async () => {
    if (!user) return;
    setLoadingNarrative(true);
    const { data, error } = await (supabase as any)
      .from("org_dashboard_narratives")
      .select("id, generated_at, participant_count, index_score, narrative_text")
      .eq("slice_type", sliceType)
      .eq("slice_value", sliceValue)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data) setLatestNarrative(data as StoredNarrative);
    else setLatestNarrative(null);
    setLoadingNarrative(false);
  }, [user, sliceType, sliceValue]);

  const loadInterventions = useCallback(async () => {
    if (!user || !latestNarrative) return;
    setLoadingInterventions(true);
    const { data } = await (supabase as any)
      .from("org_interventions")
      .select("id, title, description, target_dimensions, priority, time_horizon, intervention_type")
      .eq("narrative_id", latestNarrative.id)
      .order("created_at", { ascending: true });
    setInterventions((data ?? []) as Intervention[]);
    setLoadingInterventions(false);
  }, [user, latestNarrative]);

  const loadNarrativeHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("org_dashboard_narratives")
      .select("id, generated_at, participant_count, index_score, slice_type, slice_value, narrative_text")
      .eq("slice_type", sliceType)
      .eq("slice_value", sliceValue)
      .order("generated_at", { ascending: false })
      .limit(10);
    setNarrativeHistory((data ?? []) as NarrativeHistory[]);
  }, [user, sliceType, sliceValue]);

  useEffect(() => { loadUsage(); }, [loadUsage]);
  useEffect(() => { loadAggregate(); }, [loadAggregate]);
  useEffect(() => { loadNarrative(); }, [loadNarrative]);
  useEffect(() => { loadInterventions(); }, [loadInterventions]);
  useEffect(() => { loadNarrativeHistory(); }, [loadNarrativeHistory]);

  const handleRegenerate = async () => {
    if (!user) return;
    setRegenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = "https://svprhtzawnbzmumxnhsq.supabase.co";
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-dashboard-narrative`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ instrument_id: "INST-002", slice_type: sliceType, slice_value: sliceValue }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Generation failed");
      toast.success("AI interpretation generated");
      await Promise.all([loadUsage(), loadNarrative()]);
      
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate interpretation");
    }
    setRegenerating(false);
  };

  const toggleFlag = (id: string) => {
    setExpandedFlags(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleDim = (dimId: string) => {
    setExpandedDims(prev => {
      const next = new Set(prev);
      next.has(dimId) ? next.delete(dimId) : next.add(dimId);
      return next;
    });
  };

  const openTrackingModal = (intervention: Intervention, e: React.MouseEvent) => {
    e.stopPropagation();
    setTrackingModal({ open: true, intervention });
    setTrackingNote("");
    setTrackingStatus("not_started");
  };

  const closeTrackingModal = () => {
    setTrackingModal({ open: false, intervention: null });
  };

  const saveTracking = async () => {
    if (!trackingModal.intervention || !latestNarrative) return;
    setSavingTracking(true);
    try {
      await (supabase as any).rpc("save_org_intervention", {
        p_narrative_id: latestNarrative.id,
        p_instrument_id: "INST-002",
        p_title: trackingModal.intervention.title,
        p_description: trackingNote || trackingModal.intervention.description,
        p_target_dimensions: trackingModal.intervention.target_dimensions,
        p_priority: trackingModal.intervention.priority,
        p_time_horizon: trackingModal.intervention.time_horizon,
        p_intervention_type: trackingModal.intervention.intervention_type,
      });
      toast.success("Saved to intervention tracking");
      closeTrackingModal();
    } catch (e: any) {
      toast.error("Failed to save");
    }
    setSavingTracking(false);
  };

  const priorityBadge = (priority: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      high: { bg: "#faece7", color: "#993c1d" },
      medium: { bg: "#faeeda", color: "#633806" },
      low: { bg: "#e1f5ee", color: "#0f6e56" },
    };
    const s = styles[priority] ?? styles.medium;
    return <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: s.bg, color: s.color, fontWeight: 500, textTransform: "capitalize" as const }}>{priority}</span>;
  };

  const horizonBadge = (horizon: string) => (
    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "#eeedfe", color: "#3c096c", fontWeight: 500 }}>{horizon}</span>
  );

  const typeBadge = (type: string) => (
    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "#e8edf1", color: "#021F36", fontWeight: 500, textTransform: "capitalize" as const }}>{type}</span>
  );

  const dims = aggregate?.dimensions ?? {};
  const indexScore = Object.keys(dims).length > 0 ? calcIndex(dims) : null;
  const participantCount = aggregate?.participant_count ?? 0;
  const suppressed = aggregate?.suppressed ?? false;
  const riskFlags: RiskFlag[] = latestNarrative?.narrative_text?.risk_flags ?? [];

  const tabs = ["overview", "dimensions", "interpretation", "trends", "cross-instrument"];
  const tabLabels: Record<string, string> = {
    overview: "Overview",
    dimensions: "Dimensions",
    interpretation: "AI Interpretation",
    trends: "Trends",
    "cross-instrument": "Cross-Instrument",
  };

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
      {/* ── Persistent header ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "start" }}>
          {/* Org label */}
          <div>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>
              NAI · AI Adoption Readiness Dashboard
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--foreground)", margin: "4px 0 0" }}>
              Company Dashboard
            </h1>
          </div>

          {/* Index */}
          <div style={{ textAlign: "center" }}>
            {loadingAgg ? (
              <div style={{ fontSize: 36, fontWeight: 300, color: "var(--muted-foreground)" }}>—</div>
            ) : suppressed ? (
              <div style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Insufficient data</div>
            ) : (
              <>
                <div style={{ fontSize: 36, fontWeight: 300, color: NAVY, lineHeight: 1 }}>
                  {idxPeriod === "all" ? indexScore : indexScore !== null ? Math.min(100, Math.round((indexScore + 3) * 10) / 10) : "—"}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>AI Readiness Index · higher = more ready</div>
                <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 2 }}>100 minus weighted friction average</div>
                <div style={{ display: "inline-flex", marginTop: 6, border: "0.5px solid var(--border)", borderRadius: 20, overflow: "hidden" }}>
                  {(["all", "30"] as const).map(p => (
                    <button key={p} onClick={() => setIdxPeriod(p)} style={{
                      fontSize: 10, padding: "3px 10px", cursor: "pointer", border: "none",
                      background: idxPeriod === p ? NAVY : "var(--card)",
                      color: idxPeriod === p ? "#fff" : "var(--muted-foreground)",
                    }}>{p === "all" ? "All time" : "Last 30d"}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              {sliceType === "all" ? "All organization" : `${sliceType}: ${sliceValue}`} · n={participantCount}
            </span>
            <Button variant="outline" size="sm">Export ↓</Button>
            <Button size="sm" onClick={handleRegenerate} disabled={regenerating || suppressed}>
              <RefreshCw className={regenerating ? "animate-spin" : ""} />
              {regenerating ? "Generating..." : "↻ Regenerate AI"}
            </Button>
          </div>
        </div>

        {/* Signal banner */}
        {usage?.signal_banner?.show_banner && latestNarrative && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#fff7ed", border: `1px solid ${ORANGE}`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: NAVY }}>
              {Math.round(usage.signal_banner.pct_new)}% of your organization has new NAI data since your last AI interpretation
              {usage.signal_banner.last_generated_at ? ` (${new Date(usage.signal_banner.last_generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})` : ""}. Scores may have shifted.
            </span>
            <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={regenerating}>
              Regenerate to include
            </Button>
          </div>
        )}

        {/* No narrative yet banner */}
        {!loadingNarrative && !latestNarrative && !suppressed && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--muted)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              No AI interpretation generated yet. Generate one to unlock risk flags and full narrative analysis.
            </span>
            <Button size="sm" onClick={handleRegenerate} disabled={regenerating}>
              Generate now
            </Button>
          </div>
        )}

        {/* Slice controls */}
        <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Slice:</span>
          <button onClick={() => { setSliceType("all"); setSliceValue("all"); }} style={{
            fontSize: 11, padding: "3px 10px", borderRadius: 20, cursor: "pointer",
            border: `0.5px solid ${sliceType === "all" ? NAVY : "var(--border)"}`,
            background: sliceType === "all" ? "#e8edf1" : "var(--muted)",
            color: sliceType === "all" ? NAVY : "var(--muted-foreground)",
          }}>All organization</button>
          {departments.length > 0 && (
            <select value={sliceType === "department" ? sliceValue : "all"}
              onChange={e => { if (e.target.value !== "all") { setSliceType("department"); setSliceValue(e.target.value); } else { setSliceType("all"); setSliceValue("all"); } }}
              style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, border: "0.5px solid var(--border)", background: "var(--card)", color: "var(--foreground)", cursor: "pointer" }}>
              <option value="all">Department ▾</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <select value={sliceType === "org_level" ? sliceValue : "all"}
            onChange={e => { if (e.target.value !== "all") { setSliceType("org_level"); setSliceValue(e.target.value); } else { setSliceType("all"); setSliceValue("all"); } }}
            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, border: "0.5px solid var(--border)", background: "var(--card)", color: "var(--foreground)", cursor: "pointer" }}>
            <option value="all">Level ▾</option>
            {["IC", "Manager", "Director", "VP", "C-Suite", "Other"].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            onChange={e => {
              if (e.target.value !== "all") { setSliceType("team"); setSliceValue(e.target.value); }
              else { setSliceType("all"); setSliceValue("all"); }
            }}
            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, border: "0.5px solid var(--border)", background: "var(--card)", color: "var(--foreground)", cursor: "pointer" }}
          >
            <option value="all">Team ▾</option>
            {departments.map(d => <option key={`team-${d.id}`} value={d.id}>{d.name}</option>)}
          </select>
          <span style={{ fontSize: 10, color: "var(--muted-foreground)", marginLeft: 4 }}>min 5 per slice</span>
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, borderBottom: "0.5px solid var(--border)", marginBottom: 20, overflowX: "auto" }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            fontSize: 12, padding: "8px 14px", cursor: "pointer", background: "none", border: "none",
            borderBottom: activeTab === tab ? `2px solid ${ORANGE}` : "2px solid transparent",
            color: activeTab === tab ? NAVY : "var(--muted-foreground)",
            fontWeight: activeTab === tab ? 500 : 400, whiteSpace: "nowrap", marginBottom: -0.5,
          }}>{tabLabels[tab]}</button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div>
          {/* Methodology callout */}
          <div style={{ marginBottom: 16, padding: "10px 14px", background: SAND, borderRadius: 8, border: "0.5px solid var(--border)" }}>
            <button onClick={() => setExpandedMethod(!expandedMethod)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: NAVY }}>About the AI Readiness Index · weighted methodology</span>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{expandedMethod ? "↑ collapse" : "↓ expand"}</span>
            </button>
            {expandedMethod && (
              <div style={{ marginTop: 10 }}>
                <p style={{ marginBottom: 8 }}>The AI Readiness Index is a single composite score (0–100) where <strong>higher means more ready</strong>. It is calculated as <strong>100 minus the weighted average of the five C.A.F.E.S. dimension friction scores</strong>. Dimension scores measure friction — higher dimension scores mean more activation. The index inverts this so improving readiness always moves the number up.</p>
                <p style={{ marginBottom: 10 }}>Dimensions are weighted unequally based on their relative impact on AI adoption outcomes, grounded in the 2025 NeuroLeadership Institute SCARF model review (15,000+ respondents) and BrainWise's applied psychometric framework. Fairness and Agency carry the highest weights because they are the strongest drivers of sustained adoption behavior and the hardest to restore once damaged.</p>
                {DIMS_BY_WEIGHT.map(dimId => (
                  <div key={dimId} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 10, minWidth: 130, color: DIM_COLORS[dimId], fontWeight: 500 }}>{DIM_NAMES[dimId]} ({Math.round(DIM_WEIGHTS[dimId] * 100)}%)</span>
                    <div style={{ flex: 1, height: 5, background: "var(--muted)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(DIM_WEIGHTS[dimId] / 0.28) * 100}%`, background: DIM_COLORS[dimId], borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)", minWidth: 30, textAlign: "right" }}>{Math.round(DIM_WEIGHTS[dimId] * 100)}%</span>
                  </div>
                ))}
                <p style={{ fontSize: 9, color: "var(--muted-foreground)", marginTop: 8 }}>Weights are based on 2025 NLI research and BrainWise applied data. They will be recalibrated as platform-wide outcome data accumulates. Weights apply consistently to individual NAI reports and org-level dashboards.</p>
              </div>
            )}
          </div>

          {/* Usage cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Active users", value: loadingUsage ? "—" : `${usage?.active_users ?? "—"}/${usage?.seat_count ?? "—"}`, sub: loadingUsage ? "" : `${usage ? Math.round((usage.active_users / usage.seat_count) * 100) : 0}% of licensed seats` },
              { label: "Completions (30d)", value: loadingUsage ? "—" : String(usage?.completions_30d?.["INST-002"] ?? 0), sub: "NAI assessments" },
              { label: "Completion rate", value: loadingUsage ? "—" : `${Math.round(usage?.completion_rate?.pct ?? 0)}%`, sub: loadingUsage ? "" : `${usage?.completion_rate?.completed ?? 0} of ${usage?.completion_rate?.eligible ?? 0} users` },
              { label: "AI chat usage", value: loadingUsage ? "—" : `${usage?.ai_usage?.chat_used ?? 0}/${usage?.ai_usage?.chat_allowance ?? 0}`, sub: usage?.ai_usage?.ai_chat_enabled ? "messages this month" : "AI chat not enabled" },
            ].map(card => (
              <div key={card.label} style={{ padding: 14, background: "#F9F7F1", border: "0.5px solid var(--border)", borderRadius: 8 }}>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, textTransform: "uppercase", letterSpacing: 0.4 }}>{card.label}</p>
                <p style={{ fontSize: 22, fontWeight: 500, color: NAVY, margin: "4px 0 2px" }}>{card.value}</p>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Risk flags — AI generated */}
          {riskFlags.length > 0 && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 500, color: NAVY, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Risk flags (generated {latestNarrative?.generated_at ? new Date(latestNarrative.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""} · click to expand)
              </h3>
              {riskFlags.map(flag => (
                <div key={flag.id} onClick={() => toggleFlag(flag.id)} style={{
                  borderLeft: `3px solid ${flag.level === "high" ? "#a32d2d" : ORANGE}`,
                  background: "#F9F7F1", borderRadius: "0 8px 8px 0",
                  padding: "12px 16px", marginBottom: 12, cursor: "pointer",
                }}>
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: flag.level === "high" ? "#a32d2d" : ORANGE, fontWeight: 500 }}>
                    {flag.level === "high" ? "High risk" : "Warning"}
                  </span>
                  <p style={{ fontSize: 15, fontWeight: 500, color: NAVY, margin: "2px 0" }}>{flag.title}</p>
                  <p style={{ fontSize: 14, color: "var(--foreground)", margin: 0 }}>{flag.summary}</p>
                  <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
                    {expandedFlags.has(flag.id) ? "↑ collapse" : "↓ expand for detail"}
                  </p>
                  {expandedFlags.has(flag.id) && (
                    <p style={{ fontSize: 14, color: "var(--foreground)", margin: "8px 0 0", whiteSpace: "pre-wrap" }}>
                      {flag.detail}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}

          {/* No flags yet */}
          {!loadingNarrative && riskFlags.length === 0 && latestNarrative && (
            <div style={{ padding: 14, background: "var(--muted)", borderRadius: 8, marginBottom: 24, fontSize: 12, color: "var(--muted-foreground)" }}>
              No risk flags identified in the current data for this slice.
            </div>
          )}

          {/* Leadership compared to workforce */}
          {!suppressed && Object.keys(dims).length > 0 && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 500, color: NAVY, margin: "24px 0 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Leadership compared to workforce · C.A.F.E.S.
              </h3>
              <div style={{ padding: 14, background: "#F9F7F1", border: "0.5px solid var(--border)", borderRadius: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>Director · VP · C-Suite</p>
                    {DIMS_BY_WEIGHT.map(dimId => {
                      const score = dims[dimId]?.avg_score ?? 0;
                      const act = activationLabel(score);
                      return (
                        <div key={dimId} style={{ display: "grid", gridTemplateColumns: "1fr 32px 56px", alignItems: "center", marginBottom: 8, gap: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: DIM_COLORS[dimId] }}>{DIM_NAMES[dimId]}</span>
                          <span style={{ fontSize: 15, fontWeight: 500, color: DIM_COLORS[dimId], textAlign: "right" }}>{Math.round(score)}</span>
                          <span style={{ fontSize: 9, padding: "2px 5px", borderRadius: 3, background: act.bg, color: act.color, textAlign: "center" }}>{act.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ alignSelf: "center", textAlign: "center" }}>
                    <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "0 0 6px", textTransform: "uppercase" }}>delta</p>
                    {DIMS_BY_WEIGHT.map(dimId => (
                      <div key={dimId} style={{ fontSize: 13, color: "var(--muted-foreground)", padding: "4px 0" }}>—</div>
                    ))}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>Manager · IC</p>
                    {DIMS_BY_WEIGHT.map(dimId => {
                      const score = dims[dimId]?.avg_score ?? 0;
                      const act = activationLabel(score);
                      return (
                        <div key={dimId} style={{ display: "grid", gridTemplateColumns: "1fr 32px 56px", alignItems: "center", marginBottom: 8, gap: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: DIM_COLORS[dimId] }}>{DIM_NAMES[dimId]}</span>
                          <span style={{ fontSize: 15, fontWeight: 500, color: DIM_COLORS[dimId], textAlign: "right" }}>{Math.round(score)}</span>
                          <span style={{ fontSize: 9, padding: "2px 5px", borderRadius: 3, background: act.bg, color: act.color, textAlign: "center" }}>{act.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: "var(--muted-foreground)", padding: "8px 14px", borderTop: "0.5px solid var(--border)", background: "var(--muted)", fontStyle: "italic" }}>
                  Select "Level ▾" above to compare Director vs IC scores with real delta values. Item-level delta requires assessment response data.
                </div>
              </div>
            </>
          )}

          {/* Participation by department */}
          {usage?.dept_participation && usage.dept_participation.length > 0 && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 500, color: NAVY, margin: "24px 0 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Participation by department
              </h3>
              <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#ede9df" }}>
                      {["Department", "Completed", "Rate", "Progress"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 13, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usage.dept_participation.sort((a, b) => b.pct - a.pct).map(dept => (
                      <tr key={dept.department_id} style={{ borderTop: "0.5px solid var(--border)" }}>
                        <td style={{ padding: "8px 12px", color: "var(--foreground)" }}>{dept.department_name}</td>
                        <td style={{ padding: "8px 12px", color: "var(--foreground)" }}>{dept.completed}/{dept.eligible}</td>
                        <td style={{ padding: "8px 12px", color: NAVY, fontWeight: 500 }}>{Math.round(dept.pct)}%</td>
                        <td style={{ padding: "8px 12px", width: "40%" }}>
                          <div style={{ height: 6, background: "var(--muted)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${dept.pct}%`, height: "100%", background: TEAL }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Suppressed */}
          {suppressed && !loadingAgg && (
            <div style={{ padding: 32, textAlign: "center", background: "var(--muted)", borderRadius: 8, marginTop: 16 }}>
              <AlertTriangle style={{ margin: "0 auto 8px", color: ORANGE }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: NAVY, margin: "0 0 4px" }}>Insufficient data for this slice</p>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
                A minimum of 5 participants is required. Select a broader slice or wait for more completions.
              </p>
            </div>
          )}

          {/* Cross-instrument snapshot placeholder */}
          <div style={{ marginTop: 24, padding: 14, background: "#F9F7F1", border: "0.5px solid var(--border)", borderRadius: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 500, color: NAVY, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.5 }}>Cross-instrument snapshot</h3>
            <p style={{ fontSize: 14, color: "var(--muted-foreground)", margin: 0 }}>
              PTP aggregate data will appear here once participants have completed both NAI and PTP. View the full analysis in the Cross-Instrument tab.
            </p>
          </div>
        </div>
      )}

      {/* ── Dimensions tab ───────────────────────────────────────────────────── */}
      {activeTab === "dimensions" && (
        <div>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 14 }}>
            Click any dimension card for interpretation and interventions. Ordered by index weight — highest impact first.
          </p>
          {suppressed ? (
            <div style={{ padding: 32, textAlign: "center", background: "var(--muted)", borderRadius: 8, color: "var(--muted-foreground)" }}>
              Insufficient data for this slice. Select a broader slice or wait for more completions.
            </div>
          ) : Object.keys(dims).length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)" }}>Loading dimension data...</div>
          ) : (
            DIMS_BY_WEIGHT.map(dimId => {
              const dim = dims[dimId];
              if (!dim) return null;
              const act = activationLabel(dim.avg_score);
              const isExpanded = expandedDims.has(dimId);
              const dimInterventions = interventions.filter(iv => iv.target_dimensions?.includes(dimId));
              return (
                <div key={dimId} onClick={() => toggleDim(dimId)} style={{
                  background: "#F9F7F1", border: `0.5px solid ${isExpanded ? DIM_COLORS[dimId] : "var(--border)"}`,
                  borderRadius: 12, padding: 14, marginBottom: 14, cursor: "pointer",
                  transition: "border-color 0.15s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: DIM_COLORS[dimId] }} />
                      <span style={{ fontSize: 15, fontWeight: 500, color: DIM_COLORS[dimId] }}>{DIM_NAMES[dimId]}</span>
                      <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 20, background: "#fef0e7", color: ORANGE, fontWeight: 500 }}>
                        Weight {Math.round(DIM_WEIGHTS[dimId] * 100)}%
                      </span>
                      {dim.avg_score >= 60 && (
                        <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 20, background: "#faece7", color: "#993c1d", fontWeight: 500 }}>Priority</span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{Math.round(dim.pct_at_75_plus)}% at 75+</span>
                      <span style={{ fontSize: 26, fontWeight: 500, color: DIM_COLORS[dimId] }}>{Math.round(dim.avg_score)}</span>
                      <span style={{ fontSize: 9, padding: "2px 5px", borderRadius: 3, background: act.bg, color: act.color }}>{act.label}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", gap: 2, marginBottom: 4 }}>
                    <div style={{ width: `${dim.pct_low}%`, background: "#e1f5ee", borderRadius: 3 }} />
                    <div style={{ width: `${dim.pct_elevated}%`, background: "#faeeda", borderRadius: 3 }} />
                    <div style={{ width: `${dim.pct_high}%`, background: "#faece7", borderRadius: 3 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>
                    <span>Low {Math.round(dim.pct_low)}%</span>
                    <span>Elevated {Math.round(dim.pct_elevated)}%</span>
                    <span>High {Math.round(dim.pct_high)}%</span>
                  </div>
                  <div style={{ fontSize: 10, color: TEAL, marginTop: 4 }}>
                    {isExpanded ? "↑ collapse" : "↓ expand for interpretation and interventions"}
                  </div>
                  {isExpanded && (
                    <div onClick={e => e.stopPropagation()} style={{ marginTop: 12, paddingTop: 12, borderTop: "0.5px solid var(--border)" }}>
                      {!latestNarrative ? (
                        <p style={{ fontSize: 14, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                          Generate an AI interpretation to see dimension insights and interventions.
                        </p>
                      ) : (
                        <>
                          <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.65, marginBottom: 12 }}>
                            {DIM_NAMES[dimId]} carries a {Math.round(DIM_WEIGHTS[dimId] * 100)}% weight in the readiness index — the {
                              ["DIM-NAI-03","DIM-NAI-04","DIM-NAI-02"].indexOf(dimId) >= 0 ? "highest tier" : "lower tier"
                            }. Current score of {Math.round(dim.avg_score)} places this dimension at {act.label.toLowerCase()} activation.
                            {dim.avg_score >= 60 ? " This is the most operationally significant finding in this slice." : dim.avg_score < 50 ? " This is currently an organizational asset — protect it." : " Monitor for upward movement."}
                          </p>
                          {dimInterventions.length > 0 ? (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 500, color: NAVY, marginBottom: 8 }}>
                                Interventions targeting this dimension
                              </div>
                              {dimInterventions.map(iv => (
                                <div key={iv.id} style={{ background: "#ede9df", borderRadius: 8, padding: "14px 16px", marginBottom: 8 }}>
                                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: NAVY }}>{iv.title}</span>
                                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                      {priorityBadge(iv.priority)}
                                      {horizonBadge(iv.time_horizon)}
                                      {typeBadge(iv.intervention_type)}
                                    </div>
                                  </div>
                                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 8px", lineHeight: 1.55 }}>{iv.description}</p>
                                  <button onClick={e => openTrackingModal(iv, e)} style={{
                                    fontSize: 10, padding: "3px 9px", border: `0.5px solid ${NAVY}`, borderRadius: 5,
                                    background: "transparent", color: NAVY, cursor: "pointer",
                                  }}>+ Add to intervention tracking</button>
                                </div>
                              ))}
                            </>
                          ) : (
                            <p style={{ fontSize: 13, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                              No interventions specifically target this dimension in the current generation. Regenerate to refresh.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── AI Interpretation tab ─────────────────────────────────────────────── */}
      {activeTab === "interpretation" && (
        <div>
          {!latestNarrative ? (
            <div style={{ padding: 48, textAlign: "center", background: "var(--muted)", borderRadius: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: NAVY, marginBottom: 6 }}>No AI interpretation generated yet</p>
              <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 16 }}>Generate one to unlock the full narrative analysis, risk flags, and structured interventions.</p>
              <Button size="sm" onClick={handleRegenerate} disabled={regenerating || suppressed}>
                <RefreshCw className={regenerating ? "animate-spin" : ""} style={{ marginRight: 6 }} />
                {regenerating ? "Generating..." : "Generate now"}
              </Button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                  Generated {new Date(latestNarrative.generated_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · {latestNarrative.participant_count} participants · {sliceType === "all" ? "All organization" : `${sliceType}: ${sliceValue}`}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {narrativeHistory.length > 1 && (
                    <select style={{ fontSize: 13, padding: "4px 8px", border: "0.5px solid var(--border)", borderRadius: 7, background: "var(--card)", color: "var(--foreground)" }}>
                      {narrativeHistory.map(h => (
                        <option key={h.id} value={h.id}>
                          {new Date(h.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} — {h.participant_count} participants
                        </option>
                      ))}
                    </select>
                  )}
                  <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={regenerating || suppressed}>
                    <RefreshCw className={regenerating ? "animate-spin" : ""} style={{ marginRight: 4 }} />
                    {regenerating ? "Generating..." : "↻ Regenerate"}
                  </Button>
                </div>
              </div>

              {Object.keys(dims).length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 8, marginBottom: 16 }}>
                  {DIMS_BY_WEIGHT.map(dimId => {
                    const dim = dims[dimId];
                    if (!dim) return null;
                    const act = activationLabel(dim.avg_score);
                    return (
                      <div key={dimId} style={{ borderRadius: 8, padding: "10px 8px", textAlign: "center", background: act.bg }}>
                        <div style={{ fontSize: 9, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", color: DIM_COLORS[dimId], marginBottom: 3 }}>{DIM_NAMES[dimId]}</div>
                        <div style={{ fontSize: 26, fontWeight: 500, color: DIM_COLORS[dimId] }}>{Math.round(dim.avg_score)}</div>
                        <div style={{ fontSize: 9, color: DIM_COLORS[dimId], marginTop: 2, opacity: 0.8 }}>{act.label}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ fontSize: 9, color: "var(--muted-foreground)", textAlign: "center", marginBottom: 16 }}>
                Ordered by index weight: Fairness 28% · Ego Stability 25% · Agency 22% · Certainty 15% · Saturation 10%
              </div>

              {[
                { key: "business_meaning", label: "What this means for your business" },
                { key: "benefits", label: "Potential benefits visible in the data" },
                { key: "risks", label: "Potential risks if unaddressed" },
                { key: "next_steps", label: "Recommended next steps" },
              ].map(section => {
                const text = latestNarrative.narrative_text[section.key as keyof typeof latestNarrative.narrative_text] as string | undefined;
                if (!text) return null;
                return (
                  <div key={section.key} style={{ background: "#F9F7F1", border: "0.5px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
                    <div style={{ fontSize: 9, fontWeight: 500, color: NAVY, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6, borderLeft: `3px solid ${ORANGE}`, paddingLeft: 7 }}>
                      {section.label}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>{text}</div>
                  </div>
                );
              })}

              {latestNarrative.narrative_text.reassessment_note && (
                <div style={{ fontSize: 13, color: "var(--muted-foreground)", background: "#F9F7F1", borderRadius: 8, padding: "10px 12px", marginBottom: 16, lineHeight: 1.6 }}>
                  <strong style={{ color: NAVY }}>Reassessment: </strong>{latestNarrative.narrative_text.reassessment_note}
                </div>
              )}

              {interventions.length > 0 && (
                <>
                  <h3 style={{ fontSize: 15, fontWeight: 500, color: NAVY, margin: "24px 0 10px", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
                    Structured interventions <span style={{ fontSize: 10, fontWeight: 400, color: "var(--muted-foreground)" }}>(click + to track without leaving this page)</span>
                  </h3>
                  {interventions.map(iv => (
                    <div key={iv.id} style={{ border: "0.5px solid var(--border)", borderRadius: 8, padding: 16, marginBottom: 12, background: "#F9F7F1" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 500, color: NAVY }}>{iv.title}</span>
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          {priorityBadge(iv.priority)}
                          {horizonBadge(iv.time_horizon)}
                          {typeBadge(iv.intervention_type)}
                        </div>
                      </div>
                      <p style={{ fontSize: 14, color: "var(--muted-foreground)", margin: "0 0 6px", lineHeight: 1.6 }}>{iv.description}</p>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 9, color: "var(--muted-foreground)" }}>
                          Targets: {iv.target_dimensions?.map(d => DIM_NAMES[d] ?? d).join(" · ")}
                        </span>
                        <button onClick={e => openTrackingModal(iv, e)} style={{
                          fontSize: 10, padding: "3px 9px", border: `0.5px solid ${NAVY}`,
                          borderRadius: 5, background: "transparent", color: NAVY, cursor: "pointer",
                        }}>+ Add to intervention tracking</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Trends tab ───────────────────────────────────────────────────────── */}
      {activeTab === "trends" && (
        <div>
          <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Showing trend across AI interpretation generations for this slice.</span>
          </div>

          {narrativeHistory.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", background: "var(--muted)", borderRadius: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: NAVY, marginBottom: 6 }}>No history yet</p>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Generate your first AI interpretation to start tracking dimension trends over time.</p>
            </div>
          ) : (
            <>
              <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: "var(--muted)" }}>
                        <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: "var(--muted-foreground)", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: 0.4 }}>Generated</th>
                        <th style={{ padding: "8px 12px", textAlign: "center", fontSize: 10, color: "var(--muted-foreground)", fontWeight: 500 }}>Index</th>
                        {DIMS_BY_WEIGHT.map(dimId => (
                          <th key={dimId} style={{ padding: "8px 12px", textAlign: "center", fontSize: 10, color: DIM_COLORS[dimId], fontWeight: 500 }}>
                            {DIM_NAMES[dimId].split(" ")[0]}
                          </th>
                        ))}
                        <th style={{ padding: "8px 12px", textAlign: "center", fontSize: 10, color: "var(--muted-foreground)", fontWeight: 500 }}>n</th>
                      </tr>
                    </thead>
                    <tbody>
                      {narrativeHistory.map((h, i) => {
                        const dimScores = (h as any).dimension_scores ?? {};
                        return (
                          <tr key={h.id} style={{ borderTop: "0.5px solid var(--border)", background: i === 0 ? "var(--muted)" : "transparent" }}>
                            <td style={{ padding: "8px 12px", color: "var(--foreground)", fontWeight: i === 0 ? 500 : 400 }}>
                              {new Date(h.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              {i === 0 && <span style={{ marginLeft: 6, fontSize: 9, background: TEAL, color: "#fff", padding: "1px 5px", borderRadius: 3 }}>Latest</span>}
                            </td>
                            <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 500, color: TEAL }}>{h.index_score?.toFixed(1) ?? "—"}</td>
                            {DIMS_BY_WEIGHT.map(dimId => {
                              const score = dimScores[dimId]?.avg_score;
                              return (
                                <td key={dimId} style={{ padding: "8px 12px", textAlign: "center" }}>
                                  {score !== undefined ? (
                                    <span style={{ fontSize: 11, fontWeight: 500, color: DIM_COLORS[dimId] }}>{Math.round(score)}</span>
                                  ) : "—"}
                                </td>
                              );
                            })}
                            <td style={{ padding: "8px 12px", textAlign: "center", color: "var(--muted-foreground)" }}>{h.participant_count}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
                {DIMS_BY_WEIGHT.map(dimId => (
                  <span key={dimId} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10 }}>
                    <span style={{ width: 18, height: 3, borderRadius: 2, background: DIM_COLORS[dimId], display: "inline-block" }} />
                    {DIM_NAMES[dimId]} ({Math.round(DIM_WEIGHTS[dimId] * 100)}%)
                  </span>
                ))}
              </div>

              <div style={{ fontSize: 11, color: "var(--muted-foreground)", background: "var(--muted)", borderRadius: 8, padding: "10px 12px", lineHeight: 1.6 }}>
                Trend chart visualization (line chart per dimension over time) will be added in the next build. The table above shows the full history. Lower dimension scores mean improving readiness. A rising Index score means the organization is moving in the right direction.
              </div>

              <h3 style={{ fontSize: 13, fontWeight: 500, color: NAVY, margin: "20px 0 10px", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
                Prior AI interpretation history
              </h3>
              {narrativeHistory.map((h, i) => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 12 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: i === 0 ? TEAL : "var(--border)", flexShrink: 0 }} />
                  <span style={{ color: "var(--foreground)" }}>
                    {new Date(h.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: 10 }}>
                    {h.participant_count} participants · Index {h.index_score?.toFixed(1) ?? "—"} · {h.slice_type === "all" ? "All organization" : `${h.slice_type}: ${h.slice_value}`}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Cross-instrument tab ──────────────────────────────────────────────── */}
      {activeTab === "cross-instrument" && (
        <div>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16 }}>
            Cross-instrument analysis requires participants to have completed both NAI and PTP assessments. Patterns between the two instruments reveal whether AI adoption barriers are specific to AI context or rooted in deeper threat-response patterns.
          </p>

          {!suppressed && Object.keys(dims).length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: 0.04, marginBottom: 10 }}>
                  NAI · C.A.F.E.S. (by weight)
                </div>
                {DIMS_BY_WEIGHT.map(dimId => {
                  const dim = dims[dimId];
                  if (!dim) return null;
                  const act = activationLabel(dim.avg_score);
                  return (
                    <div key={dimId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7, fontSize: 11 }}>
                      <span style={{ color: DIM_COLORS[dimId], fontWeight: 500 }}>{DIM_NAMES[dimId]}</span>
                      <span>
                        <span style={{ fontWeight: 500, color: DIM_COLORS[dimId], marginRight: 6 }}>{Math.round(dim.avg_score)}</span>
                        <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: act.bg, color: act.color }}>{act.label}</span>
                      </span>
                    </div>
                  );
                })}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "0.5px solid var(--border)", fontSize: 11, fontWeight: 500, color: NAVY }}>
                  AI Readiness Index: {indexScore !== null ? `${indexScore} / 100` : "—"}
                </div>
              </div>

              <div style={{ background: "var(--muted)", border: "0.5px solid var(--border)", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: 0.04, marginBottom: 10 }}>
                  PTP · Threat response
                </div>
                <div style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>
                  <p style={{ margin: "0 0 8px" }}>PTP aggregate data will appear here once 5+ participants have completed both instruments.</p>
                  <p style={{ margin: 0, fontSize: 10 }}>PTP measures threat response under uncertainty — a complement to NAI's AI-specific adoption readiness score.</p>
                </div>
              </div>
            </div>
          )}

          <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: NAVY, marginBottom: 8 }}>Co-elevation patterns</div>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 12px", lineHeight: 1.6 }}>
              Co-elevation occurs when a dimension is simultaneously elevated in both NAI and PTP — for example, high Ego Stability (NAI) paired with high Protection (PTP). These compound patterns are the most operationally significant findings because the barriers reinforce each other and require sequential intervention.
            </p>
            <div style={{ background: "var(--muted)", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "var(--muted-foreground)", fontStyle: "italic" }}>
              Co-elevation pattern detection requires PTP aggregate data for this slice. Complete cross-instrument analysis will appear here once participants have completed both assessments.
            </div>
          </div>

          {latestNarrative?.narrative_text?.business_meaning && (
            <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: NAVY, marginBottom: 8 }}>Cross-instrument AI interpretation</div>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 10px", lineHeight: 1.6 }}>
                The AI interpretation below was generated {latestNarrative.narrative_text && "with available data at time of generation"}. When PTP data becomes available for this slice, regenerating will produce a richer cross-instrument analysis.
              </p>
              <div style={{ fontSize: 12, lineHeight: 1.7, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>
                {latestNarrative.narrative_text.business_meaning}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Intervention tracking modal ───────────────────────────────────────── */}
      {trackingModal.open && trackingModal.intervention && (
        <div onClick={closeTrackingModal} style={{
          position: "fixed", inset: 0, background: "rgba(2,31,54,0.45)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "var(--card)", borderRadius: 12, padding: 20, width: 400, maxWidth: "95vw",
            border: "0.5px solid var(--border)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 9, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 3 }}>Add to intervention tracking</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: NAVY }}>{trackingModal.intervention.title}</div>
              </div>
              <button onClick={closeTrackingModal} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted-foreground)", lineHeight: 1, padding: 0 }}>×</button>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, display: "block", color: NAVY }}>Status</label>
              <select value={trackingStatus} onChange={e => setTrackingStatus(e.target.value)}
                style={{ width: "100%", fontSize: 12, padding: "6px 9px", border: "0.5px solid var(--border)", borderRadius: 7, background: "var(--card)", color: "var(--foreground)" }}>
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, display: "block", color: NAVY }}>Notes / next steps</label>
              <textarea value={trackingNote} onChange={e => setTrackingNote(e.target.value)}
                placeholder="Add context, assigned teams, or first concrete next step..."
                style={{ width: "100%", fontSize: 12, padding: "7px 9px", border: "0.5px solid var(--border)", borderRadius: 7, background: "var(--card)", color: "var(--foreground)", resize: "vertical", minHeight: 72, fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box" as const }}
              />
            </div>
            <button onClick={saveTracking} disabled={savingTracking} style={{
              background: NAVY, color: "#fff", border: "none", borderRadius: 8,
              padding: "9px 18px", fontSize: 12, cursor: "pointer", width: "100%", fontWeight: 500,
            }}>
              {savingTracking ? "Saving..." : "Save to intervention tracking"}
            </button>
            <p style={{ fontSize: 10, color: "var(--muted-foreground)", textAlign: "center", marginTop: 6 }}>
              Saves without leaving this page · View all in Interventions tab (Phase 6)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
