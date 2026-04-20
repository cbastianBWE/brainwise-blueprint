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

  useEffect(() => { loadUsage(); }, [loadUsage]);
  useEffect(() => { loadAggregate(); }, [loadAggregate]);
  useEffect(() => { loadNarrative(); }, [loadNarrative]);

  const handleRegenerate = async () => {
    if (!user) return;
    setRegenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = (supabase as any).supabaseUrl;
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
      setActiveTab("interpretation");
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
        {usage?.signal_banner?.show_banner && (
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
              <div key={card.label} style={{ padding: 14, background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8 }}>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0, textTransform: "uppercase", letterSpacing: 0.4 }}>{card.label}</p>
                <p style={{ fontSize: 22, fontWeight: 500, color: NAVY, margin: "4px 0 2px" }}>{card.value}</p>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0 }}>{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Risk flags — AI generated */}
          {riskFlags.length > 0 && (
            <>
              <h3 style={{ fontSize: 13, fontWeight: 500, color: NAVY, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Risk flags (generated {latestNarrative?.generated_at ? new Date(latestNarrative.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""} · click to expand)
              </h3>
              {riskFlags.map(flag => (
                <div key={flag.id} onClick={() => toggleFlag(flag.id)} style={{
                  borderLeft: `3px solid ${flag.level === "high" ? "#a32d2d" : ORANGE}`,
                  background: "var(--muted)", borderRadius: "0 8px 8px 0",
                  padding: "9px 12px", marginBottom: 8, cursor: "pointer",
                }}>
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: flag.level === "high" ? "#a32d2d" : ORANGE, fontWeight: 500 }}>
                    {flag.level === "high" ? "High risk" : "Warning"}
                  </span>
                  <p style={{ fontSize: 13, fontWeight: 500, color: NAVY, margin: "2px 0" }}>{flag.title}</p>
                  <p style={{ fontSize: 12, color: "var(--foreground)", margin: 0 }}>{flag.summary}</p>
                  <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
                    {expandedFlags.has(flag.id) ? "↑ collapse" : "↓ expand for detail"}
                  </p>
                  {expandedFlags.has(flag.id) && (
                    <p style={{ fontSize: 12, color: "var(--foreground)", margin: "8px 0 0", whiteSpace: "pre-wrap" }}>
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
              <h3 style={{ fontSize: 13, fontWeight: 500, color: NAVY, margin: "24px 0 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Leadership compared to workforce · C.A.F.E.S.
              </h3>
              <div style={{ padding: 14, background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>Director · VP · C-Suite</p>
                    {DIMS_BY_WEIGHT.map(dimId => {
                      const score = dims[dimId]?.avg_score ?? 0;
                      const act = activationLabel(score);
                      return (
                        <div key={dimId} style={{ display: "grid", gridTemplateColumns: "1fr 32px 56px", alignItems: "center", marginBottom: 8, gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 500, color: DIM_COLORS[dimId] }}>{DIM_NAMES[dimId]}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: DIM_COLORS[dimId], textAlign: "right" }}>{Math.round(score)}</span>
                          <span style={{ fontSize: 9, padding: "2px 5px", borderRadius: 3, background: act.bg, color: act.color, textAlign: "center" }}>{act.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ alignSelf: "center", textAlign: "center" }}>
                    <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "0 0 6px", textTransform: "uppercase" }}>delta</p>
                    {DIMS_BY_WEIGHT.map(dimId => (
                      <div key={dimId} style={{ fontSize: 11, color: "var(--muted-foreground)", padding: "4px 0" }}>—</div>
                    ))}
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>Manager · IC</p>
                    {DIMS_BY_WEIGHT.map(dimId => {
                      const score = dims[dimId]?.avg_score ?? 0;
                      const act = activationLabel(score);
                      return (
                        <div key={dimId} style={{ display: "grid", gridTemplateColumns: "1fr 32px 56px", alignItems: "center", marginBottom: 8, gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 500, color: DIM_COLORS[dimId] }}>{DIM_NAMES[dimId]}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: DIM_COLORS[dimId], textAlign: "right" }}>{Math.round(score)}</span>
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
              <h3 style={{ fontSize: 13, fontWeight: 500, color: NAVY, margin: "24px 0 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Participation by department
              </h3>
              <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--muted)" }}>
                      {["Department", "Completed", "Rate", "Progress"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 500 }}>{h}</th>
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
          <div style={{ marginTop: 24, padding: 14, background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8 }}>
            <h3 style={{ fontSize: 13, fontWeight: 500, color: NAVY, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.5 }}>Cross-instrument snapshot</h3>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
              PTP aggregate data will appear here once participants have completed both NAI and PTP. View the full analysis in the Cross-Instrument tab.
            </p>
          </div>
        </div>
      )}

      {/* ── Placeholder tabs ─────────────────────────────────────────────────── */}
      {activeTab === "dimensions" && (
        <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
          Dimensions tab — C.A.F.E.S. cards, item-level aggregate, and interventions coming in next build
        </div>
      )}
      {activeTab === "interpretation" && (
        <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
          AI Interpretation tab — narrative, C.A.F.E.S. score cards, and structured interventions coming in next build
        </div>
      )}
      {activeTab === "trends" && (
        <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
          Trends tab — dimension trend lines, cohort toggle, and history coming in next build
        </div>
      )}
      {activeTab === "cross-instrument" && (
        <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
          Cross-Instrument tab — NAI × PTP correlation and combined interpretation coming in next build
        </div>
      )}
    </div>
  );
}
