import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

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

// ── PTP cross-instrument constants ──────────────────────────────────────────
const PTP_DIM_COLORS: Record<string, string> = {
  "DIM-PTP-01": "#021F36", "DIM-PTP-02": "#006D77",
  "DIM-PTP-03": "#6D6875", "DIM-PTP-04": "#3C096C", "DIM-PTP-05": "#FFB703",
};
const PTP_DIM_NAMES: Record<string, string> = {
  "DIM-PTP-01": "Protection", "DIM-PTP-02": "Participation",
  "DIM-PTP-03": "Prediction", "DIM-PTP-04": "Purpose", "DIM-PTP-05": "Pleasure",
};
const PTP_TRI_WEIGHTS: Record<string, number> = {
  "DIM-PTP-01": 0.25, "DIM-PTP-02": 0.30, "DIM-PTP-03": 0.45,
};
const PTP_RSI_WEIGHTS: Record<string, number> = {
  "DIM-PTP-04": 0.60, "DIM-PTP-05": 0.40,
};
const ALL_PTP_DIMS = ["DIM-PTP-01", "DIM-PTP-02", "DIM-PTP-03", "DIM-PTP-04", "DIM-PTP-05"];

function calcPTPTRI(d: Record<string, any>): number {
  return Math.round((100 - Object.entries(PTP_TRI_WEIGHTS).reduce((a, [k, w]) => a + (d[k]?.avg_score ?? 50) * w, 0)) * 10) / 10;
}
function calcPTPRSI(d: Record<string, any>): number {
  return Math.round(Object.entries(PTP_RSI_WEIGHTS).reduce((a, [k, w]) => a + (d[k]?.avg_score ?? 50) * w, 0) * 10) / 10;
}
function classifyPTPArchetype(d: Record<string, any>): string {
  const p1 = d["DIM-PTP-01"]?.avg_score ?? 0, p2 = d["DIM-PTP-02"]?.avg_score ?? 0, p3 = d["DIM-PTP-03"]?.avg_score ?? 0;
  const e = (s: number) => s >= 50;
  if ([p1, p2, p3].filter(e).length >= 3) return "Broadly Activated";
  if (e(p1) && e(p3)) return "High Guard";
  if (e(p2) && e(p1)) return "Identity Fragile";
  if (e(p3)) return "Uncertainty Sensitive";
  return "Low Activation";
}

interface CoElevationPattern {
  naiDimId: string;
  naiDimName: string;
  ptpDimId: string;
  ptpDimName: string;
  naiScore: number;
  ptpScore: number;
  label: string;
  description: string;
}

function detectCoElevations(
  naiDims: Record<string, any>,
  ptpDims: Record<string, any>,
): CoElevationPattern[] {
  const results: CoElevationPattern[] = [];
  const elevated = (s: number) => s >= 50;
  const mappings = [
    { naiId: "DIM-NAI-01", naiName: "Certainty", ptpId: "DIM-PTP-03", ptpName: "Prediction",
      label: "Certainty–Prediction co-elevation",
      description: "Both instruments show ambiguity intolerance. NAI Certainty measures AI-context uncertainty aversion; PTP Prediction measures the same drive in general behaviour. Co-elevation means the workforce resists uncertainty systemically, not just in AI adoption contexts." },
    { naiId: "DIM-NAI-02", naiName: "Agency", ptpId: "DIM-PTP-02", ptpName: "Participation",
      label: "Agency–Participation co-elevation",
      description: "NAI Agency measures the need for control and influence in AI adoption; PTP Participation measures social belonging and status needs. Co-elevation indicates a workforce where loss of control in AI contexts compounds social threat — people feel both disempowered and relationally threatened simultaneously." },
    { naiId: "DIM-NAI-03", naiName: "Fairness", ptpId: "DIM-PTP-02", ptpName: "Participation",
      label: "Fairness–Participation co-elevation",
      description: "NAI Fairness measures perceived equity in AI implementation; PTP Participation measures social belonging and recognition. Co-elevation means unfairness concerns are amplifying social threat — people are not just perceiving AI as unfair, they are interpreting it as a signal of exclusion or diminished standing." },
    { naiId: "DIM-NAI-04", naiName: "Ego Stability", ptpId: "DIM-PTP-01", ptpName: "Protection",
      label: "Ego Stability–Protection co-elevation",
      description: "NAI Ego Stability measures identity threat from AI (fear of replacement, status loss); PTP Protection measures safety and security sensitivity. Co-elevation means AI adoption is triggering both identity-level and safety-level threat responses simultaneously — the most destabilising pattern for change initiatives." },
    { naiId: "DIM-NAI-05", naiName: "Saturation", ptpId: "DIM-PTP-03", ptpName: "Prediction",
      label: "Saturation–Prediction co-elevation",
      description: "NAI Saturation measures cognitive overload capacity; PTP Prediction measures ambiguity and uncertainty tolerance. Co-elevation means the workforce is both overwhelmed and uncertainty-averse — a combination that makes any complex or ambiguous change initiative extremely high-risk." },
    { naiId: "DIM-NAI-01", naiName: "Certainty", ptpId: "DIM-PTP-01", ptpName: "Protection",
      label: "Certainty–Protection co-elevation",
      description: "NAI Certainty and PTP Protection are both elevated. Uncertainty about AI outcomes is activating safety-level threat responses — people are not just uncomfortable with ambiguity, they feel unsafe." },
    { naiId: "DIM-NAI-02", naiName: "Agency", ptpId: "DIM-PTP-01", ptpName: "Protection",
      label: "Agency–Protection co-elevation",
      description: "Loss of control in AI contexts (NAI Agency) is compounding with generalised safety threat (PTP Protection). This combination suggests AI adoption is being experienced as existentially threatening rather than merely inconvenient." },
  ];
  for (const m of mappings) {
    const naiScore = naiDims[m.naiId]?.avg_score ?? 0;
    const ptpScore = ptpDims[m.ptpId]?.avg_score ?? 0;
    if (elevated(naiScore) && elevated(ptpScore)) {
      results.push({
        naiDimId: m.naiId, naiDimName: m.naiName,
        ptpDimId: m.ptpId, ptpDimName: m.ptpName,
        naiScore, ptpScore, label: m.label, description: m.description,
      });
    }
  }
  return results;
}

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
  dimension_scores?: Record<string, { avg_score: number; pct_at_75_plus: number }>;
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

interface CrossInstrumentRec {
  id: string;
  title: string;
  rationale: string;
  steps: string[];
  priority: 'high' | 'medium' | 'low';
  time_horizon: 'immediate' | '30-day' | '90-day';
  anchor_co_elevation: string | null;
  primary_targets: string[];
  cross_targets: string[];
}

interface CrossInstrumentRow {
  id: string;
  primary_narrative_id: string;
  input_narrative_ids: Array<{ instrument_id: string; narrative_id: string }>;
  recommendations: CrossInstrumentRec[];
  summary: string | null;
  generated_at: string;
}

interface DeltaDimEntry {
  self_mean: number | null;
  epn_mean: number | null;
  delta: number | null;
  direction: 'leaders_see_more_concern' | 'leaders_see_less_concern' | 'aligned' | null;
}

interface DeltaResult {
  suppressed: boolean;
  reason?: string;
  self_participant_count: number;
  epn_participant_count: number;
  self_aggregate?: Record<string, { mean: number; n?: number }>;
  epn_aggregate?: Record<string, { mean: number; n?: number }>;
  delta?: Record<string, DeltaDimEntry>;
  minimum_required?: number;
}

interface DeltaRecommendation {
  id: string;
  title: string;
  rationale: string;
  steps: string[];
  priority: 'high' | 'medium' | 'low';
  time_horizon: 'immediate' | '30-day' | '90-day';
  intervention_type: 'process' | 'conversation' | 'structural' | 'measurement';
  target_dimensions: string[];
}

interface StoredDeltaNarrative {
  id: string;
  generated_at: string;
  self_participant_count: number;
  epn_participant_count: number;
  exclude_leaders_from_self: boolean;
  narrative_text: {
    summary?: string;
    alignment_overview?: string;
    dimension_insights?: Array<{
      dimension_name: string;
      dimension_id: string;
      gap_direction: string;
      interpretation: string;
      interpretive_caution?: string;
    }>;
    key_gaps?: Array<{ title: string; description: string; primary_dimension: string }>;
    recommendations?: DeltaRecommendation[];
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
  const [ptpAggregate, setPtpAggregate] = useState<AggregateResult | null>(null);
  const [loadingPtpAgg, setLoadingPtpAgg] = useState(false);
  const [crossInstrumentRow, setCrossInstrumentRow] = useState<CrossInstrumentRow | null>(null);
  const [loadingCrossInstrument, setLoadingCrossInstrument] = useState<boolean>(false);
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
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareSliceType, setCompareSliceType] = useState<string>("all");
  const [compareSliceValue, setCompareSliceValue] = useState<string>("all");
  const [compareHistory, setCompareHistory] = useState<NarrativeHistory[]>([]);
  const [loadingInterventions, setLoadingInterventions] = useState(false);
  const [expandedDims, setExpandedDims] = useState<Set<string>>(new Set());
  type TrackingSource =
    | { kind: "dashboard"; intervention: Intervention }
    | { kind: "delta"; rec: DeltaRecommendation }
    | { kind: "cross_instrument"; rec: CrossInstrumentRec };

  const [trackingModal, setTrackingModal] = useState<{ open: boolean; source: TrackingSource | null }>({ open: false, source: null });
  const [trackingNote, setTrackingNote] = useState("");
  const [trackingStatus, setTrackingStatus] = useState("not_started");
  const [savingTracking, setSavingTracking] = useState(false);

  const [exportModal, setExportModal] = useState(false);
  const [exportSections, setExportSections] = useState<Record<string, boolean>>({
    overview: true,
    dimensions: true,
    interpretation: true,
    trends: true,
    "cross-instrument": true,
  });
  const [exporting, setExporting] = useState(false);

  const [deltaResult, setDeltaResult] = useState<DeltaResult | null>(null);
  const [loadingDelta, setLoadingDelta] = useState<boolean>(false);
  const [deltaNarrative, setDeltaNarrative] = useState<StoredDeltaNarrative | null>(null);
  const [loadingDeltaNarrative, setLoadingDeltaNarrative] = useState<boolean>(false);
  
  const [expandedLeaderWorkforce, setExpandedLeaderWorkforce] = useState<boolean>(false);

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

  const loadPTPAggregate = useCallback(async () => {
    if (!user) return;
    setLoadingPtpAgg(true);
    const { data } = await (supabase as any).rpc("get_instrument_aggregate", {
      p_instrument: "INST-001",
      p_slice_type: sliceType,
      p_slice_value: sliceValue,
      p_context_type: "both",
    });
    setPtpAggregate((data ?? null) as AggregateResult | null);
    setLoadingPtpAgg(false);
  }, [user, sliceType, sliceValue]);

  const loadCrossInstrumentRecs = useCallback(async () => {
    if (!user) return;
    setLoadingCrossInstrument(true);
    const PRIMARY_ID = "INST-002";
    const { data: userRow } = await (supabase as any).from("users").select("organization_id").eq("id", user.id).single();
    if (!userRow?.organization_id) { setCrossInstrumentRow(null); setLoadingCrossInstrument(false); return; }
    const { data } = await (supabase as any)
      .from("org_cross_instrument_recommendations")
      .select("id, primary_narrative_id, input_narrative_ids, recommendations, summary, generated_at")
      .eq("organization_id", userRow.organization_id)
      .eq("slice_type", sliceType)
      .eq("slice_value", sliceValue)
      .eq("primary_instrument_id", PRIMARY_ID)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setCrossInstrumentRow((data ?? null) as CrossInstrumentRow | null);
    setLoadingCrossInstrument(false);
  }, [user, sliceType, sliceValue]);

  const loadInterventions = useCallback(async (narrativeId?: string) => {
    if (!user) return;
    const id = narrativeId ?? latestNarrative?.id;
    if (!id) return;
    setLoadingInterventions(true);
    const { data } = await (supabase as any)
      .from("org_interventions")
      .select("id, title, description, target_dimensions, priority, time_horizon, intervention_type")
      .eq("narrative_id", id)
      .order("created_at", { ascending: true });
    setInterventions((data ?? []) as Intervention[]);
    setLoadingInterventions(false);
  }, [user, latestNarrative?.id]);

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
    if (!error && data) {
      setLatestNarrative(data as StoredNarrative);
      await loadInterventions(data.id);
    }
    else setLatestNarrative(null);
    setLoadingNarrative(false);
  }, [user, sliceType, sliceValue, loadInterventions]);

  const loadNarrativeHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("org_dashboard_narratives")
      .select("id, generated_at, participant_count, index_score, slice_type, slice_value, dimension_scores, narrative_text")
      .eq("slice_type", sliceType)
      .eq("slice_value", sliceValue)
      .order("generated_at", { ascending: false })
      .limit(10);
    setNarrativeHistory((data ?? []) as NarrativeHistory[]);
  }, [user, sliceType, sliceValue]);

  const loadCompareHistory = useCallback(async () => {
    if (!user || !compareEnabled) { setCompareHistory([]); return; }
    const { data } = await (supabase as any)
      .from("org_dashboard_narratives")
      .select("id, generated_at, participant_count, index_score, slice_type, slice_value, dimension_scores, narrative_text")
      .eq("slice_type", compareSliceType)
      .eq("slice_value", compareSliceValue)
      .order("generated_at", { ascending: false })
      .limit(10);
    setCompareHistory((data ?? []) as NarrativeHistory[]);
  }, [user, compareEnabled, compareSliceType, compareSliceValue]);

  useEffect(() => { loadUsage(); }, [loadUsage]);
  useEffect(() => { loadAggregate(); }, [loadAggregate]);
  useEffect(() => { loadPTPAggregate(); }, [loadPTPAggregate]);
  useEffect(() => { loadCrossInstrumentRecs(); }, [loadCrossInstrumentRecs]);
  useEffect(() => { loadNarrative(); }, [loadNarrative]);
  
  useEffect(() => { loadNarrativeHistory(); }, [loadNarrativeHistory]);
  useEffect(() => { loadCompareHistory(); }, [loadCompareHistory]);

  const loadDeltaResult = useCallback(async () => {
    if (!user) return;
    setLoadingDelta(true);
    const { data: userRow } = await (supabase as any).from("users").select("organization_id").eq("id", user.id).single();
    if (!userRow?.organization_id) { setDeltaResult(null); setLoadingDelta(false); return; }
    const { data, error } = await (supabase as any).rpc("get_nai_epn_delta", {
      p_organization_id: userRow.organization_id,
      p_slice_type: sliceType,
      p_slice_value: sliceValue,
      p_exclude_leaders_from_self: true,
    });
    if (error) { console.error("get_nai_epn_delta error:", error); setDeltaResult(null); }
    else setDeltaResult(data as DeltaResult);
    setLoadingDelta(false);
  }, [user, sliceType, sliceValue]);

  const loadDeltaNarrative = useCallback(async () => {
    if (!user) return;
    setLoadingDeltaNarrative(true);
    const { data: userRow } = await (supabase as any).from("users").select("organization_id").eq("id", user.id).single();
    if (!userRow?.organization_id) { setDeltaNarrative(null); setLoadingDeltaNarrative(false); return; }
    const { data } = await (supabase as any)
      .from("org_nai_delta_narratives")
      .select("id, generated_at, self_participant_count, epn_participant_count, exclude_leaders_from_self, narrative_text")
      .eq("organization_id", userRow.organization_id)
      .eq("slice_type", sliceType)
      .eq("slice_value", sliceValue)
      .eq("exclude_leaders_from_self", true)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setDeltaNarrative((data ?? null) as StoredDeltaNarrative | null);
    setLoadingDeltaNarrative(false);
  }, [user, sliceType, sliceValue]);

  useEffect(() => { loadDeltaResult(); }, [loadDeltaResult]);
  useEffect(() => { loadDeltaNarrative(); }, [loadDeltaNarrative]);

  const handleRegenerate = async () => {
    if (!user) return;
    setRegenerating(true);
    const supabaseUrl = "https://svprhtzawnbzmumxnhsq.supabase.co";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      // Stage 1: dashboard narrative
      toast.info("Generating dashboard narrative... (~140s)");
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-dashboard-narrative`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ instrument_id: "INST-002", slice_type: sliceType, slice_value: sliceValue }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Dashboard generation failed");
      toast.success("Dashboard narrative generated");

      // Stage 2: cross-instrument recommendations (graceful skip if PTP narrative missing)
      toast.info("Generating cross-instrument recommendations... (~75s)");
      try {
        const xRes = await fetch(`${supabaseUrl}/functions/v1/generate-cross-instrument-recommendations`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ primary_instrument_id: "INST-002", slice_type: sliceType, slice_value: sliceValue }),
        });
        const xResult = await xRes.json();
        if (xRes.ok && xResult.generated) {
          toast.success(`Cross-instrument recommendations generated (${xResult.recommendation_count} items)`);
        } else if (xResult.reason === "other_instrument_narrative_missing") {
          toast.info("Cross-instrument recommendations skipped (PTP narrative not yet generated for this slice).");
        } else {
          toast.warning(`Cross-instrument recommendations not generated: ${xResult.reason ?? xResult.error ?? "unknown"}`);
        }
      } catch (xe: any) {
        toast.warning(`Cross-instrument recommendations failed: ${xe.message ?? "network error"}`);
      }

      // Stage 3: leader-vs-workforce delta narrative (graceful skip if insufficient EPN data)
      toast.info("Generating leader-vs-workforce narrative... (~60s)");
      try {
        const dRes = await fetch(`${supabaseUrl}/functions/v1/generate-nai-delta-narrative`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            slice_type: sliceType,
            slice_value: sliceValue,
            exclude_leaders_from_self: true,
          }),
        });
        const dResult = await dRes.json();
        if (dRes.ok && dResult.generated) {
          toast.success(`Leader-vs-workforce narrative generated (${dResult.recommendation_count} interventions)`);
        } else if (dResult.suppressed || dResult.generated === false) {
          toast.info("Leader-vs-workforce narrative skipped (need 5+ EPN respondents AND 5+ standard NAI respondents excluding leaders).");
        } else {
          toast.warning(`Leader-vs-workforce narrative not generated: ${dResult.reason ?? dResult.error ?? "unknown"}`);
        }
      } catch (de: any) {
        toast.warning(`Leader-vs-workforce narrative failed: ${de.message ?? "network error"}`);
      }

      await Promise.all([loadUsage(), loadNarrative(), loadNarrativeHistory(), loadCrossInstrumentRecs(), loadDeltaNarrative(), loadDeltaResult()]);
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

  const openTrackingModal = (source: TrackingSource, e: React.MouseEvent) => {
    e.stopPropagation();
    setTrackingModal({ open: true, source });
    setTrackingNote("");
    setTrackingStatus("not_started");
  };

  const closeTrackingModal = () => {
    setTrackingModal({ open: false, source: null });
  };

  const saveTracking = async () => {
    if (!trackingModal.source) return;
    setSavingTracking(true);
    try {
      const src = trackingModal.source;
      let rpcParams: any;
      if (src.kind === "dashboard") {
        if (!latestNarrative) {
          toast.error("Cannot save: no NAI dashboard narrative loaded.");
          setSavingTracking(false);
          return;
        }
        rpcParams = {
          p_narrative_id: latestNarrative.id,
          p_epn_delta_narrative_id: null,
          p_instrument_id: "INST-002",
          p_title: src.intervention.title,
          p_description: trackingNote || src.intervention.description,
          p_target_dimensions: src.intervention.target_dimensions,
          p_priority: src.intervention.priority,
          p_time_horizon: src.intervention.time_horizon,
          p_intervention_type: src.intervention.intervention_type,
        };
      } else if (src.kind === "delta") {
        if (!deltaNarrative) {
          toast.error("Cannot save: no delta narrative loaded.");
          setSavingTracking(false);
          return;
        }
        rpcParams = {
          p_narrative_id: null,
          p_epn_delta_narrative_id: deltaNarrative.id,
          p_instrument_id: "INST-002L",
          p_title: src.rec.title,
          p_description: trackingNote || src.rec.rationale,
          p_target_dimensions: src.rec.target_dimensions,
          p_priority: src.rec.priority,
          p_time_horizon: src.rec.time_horizon,
          p_intervention_type: src.rec.intervention_type,
        };
      } else if (src.kind === "cross_instrument") {
        if (!latestNarrative) {
          toast.error("Cross-instrument recommendations require an existing NAI dashboard narrative.");
          setSavingTracking(false);
          return;
        }
        rpcParams = {
          p_narrative_id: latestNarrative.id,
          p_epn_delta_narrative_id: null,
          p_instrument_id: "INST-002",
          p_title: src.rec.title,
          p_description: trackingNote || src.rec.rationale,
          p_target_dimensions: [...(src.rec.primary_targets ?? []), ...(src.rec.cross_targets ?? [])],
          p_priority: src.rec.priority,
          p_time_horizon: src.rec.time_horizon,
          p_intervention_type: "cross_instrument",
        };
      } else {
        toast.error("Unknown intervention source");
        setSavingTracking(false);
        return;
      }
      await (supabase as any).rpc("save_org_intervention", rpcParams);
      toast.success("Saved to intervention tracking");
      closeTrackingModal();
    } catch (e: any) {
      toast.error("Failed to save: " + (e.message ?? "unknown"));
    }
    setSavingTracking(false);
  };

  const handleExport = async () => {
    setExporting(true);
    setExportModal(false);
    // Belt-and-suspenders: ensure cross-instrument data is loaded
    await Promise.all([loadPTPAggregate(), loadCrossInstrumentRecs()]);

    try {
      const jsPDF = (await import("jspdf")).default;

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const PW = 210;
      const PH = 297;
      const ML = 14;
      const MR = 14;
      const CW = PW - ML - MR;
      const MB = 18;
      let y = 0;
      let pageNum = 1;

      const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const dateStr = new Date().toISOString().split("T")[0];
      const sliceLabel = sliceType === "all" ? "All organization" : `${sliceType}: ${sliceValue}`;

      const hexRgb = (hex: string): [number,number,number] => {
        const h = hex.replace("#","");
        return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
      };

      // Always set font before splitTextToSize
      const splitText = (text: string, maxW: number, size: number, style: string) => {
        pdf.setFontSize(size);
        pdf.setFont("helvetica", style);
        return pdf.splitTextToSize(text, maxW);
      };

      const addFooter = () => {
        pdf.setFontSize(7);
        pdf.setTextColor(160,160,160);
        pdf.setFont("helvetica","normal");
        pdf.text(`BrainWise · NAI Company Dashboard · Confidential · Page ${pageNum}`, PW/2, PH-5, { align:"center" });
        pdf.setDrawColor(220,220,220);
        pdf.setLineWidth(0.2);
        pdf.line(ML, PH-8, PW-MR, PH-8);
      };

      const newPage = (label?: string) => {
        addFooter();
        pdf.addPage();
        pageNum++;
        y = 14;
        if (label) {
          pdf.setFillColor(249,247,241);
          pdf.rect(ML, y, CW, 7, "F");
          pdf.setFontSize(8.5);
          pdf.setFont("helvetica","bold");
          pdf.setTextColor(2,31,54);
          pdf.text(label, ML+3, y+5);
          y += 11;
        }
      };

      const checkY = (needed: number, label?: string) => {
        if (y + needed > PH - MB) newPage(label);
      };

      // ── COVER ────────────────────────────────────────────────────────────
      pdf.setFillColor(2,31,54);
      pdf.rect(0,0,PW,72,"F");

      pdf.setFontSize(26); pdf.setFont("helvetica","bold"); pdf.setTextColor(255,255,255);
      pdf.text("BrainWise", ML, 30);
      pdf.setFontSize(12); pdf.setFont("helvetica","normal");
      pdf.text("NAI · AI Adoption Readiness Dashboard", ML, 42);
      pdf.setFontSize(10); pdf.setTextColor(200,220,235);
      pdf.text("Company Dashboard", ML, 53);

      if (indexScore !== null) {
        pdf.setFontSize(28); pdf.setFont("helvetica","bold"); pdf.setTextColor(255,255,255);
        pdf.text(String(indexScore), PW-ML, 34, { align:"right" });
        pdf.setFontSize(7); pdf.setFont("helvetica","normal"); pdf.setTextColor(200,220,235);
        pdf.text("AI Readiness Index", PW-ML, 42, { align:"right" });
      }

      // Cover fields -- compact layout, two columns
      let fy = 82;
      const fldLabel = (lbl: string, val: string, fx: number, ffy: number) => {
        pdf.setFontSize(7.5); pdf.setTextColor(130,120,130); pdf.setFont("helvetica","normal");
        pdf.text(lbl, fx, ffy);
        pdf.setFontSize(10.5); pdf.setTextColor(20,20,20); pdf.setFont("helvetica","bold");
        pdf.text(val, fx, ffy+6);
      };
      fldLabel("Organization slice", sliceLabel, ML, fy);
      fldLabel("Participants", String(participantCount), ML+100, fy);
      fy += 20;
      fldLabel("Generated", today, ML, fy);
      if (latestNarrative?.generated_at) {
        fldLabel("AI interpretation date", new Date(latestNarrative.generated_at).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}), ML+100, fy);
      }
      fy += 20;

      // C.A.F.E.S. table -- compact
      if (Object.keys(dims).length > 0) {
        pdf.setFontSize(7); pdf.setTextColor(130,120,130); pdf.setFont("helvetica","normal");
        pdf.text("C.A.F.E.S. DIMENSION SCORES", ML, fy);
        fy += 5;
        DIMS_BY_WEIGHT.forEach((dimId) => {
          const dim = dims[dimId]; if (!dim) return;
          const act = activationLabel(dim.avg_score);
          const [r,g,b] = hexRgb(DIM_COLORS[dimId]);
          pdf.setFillColor(r,g,b); pdf.circle(ML+2, fy-1.2, 1.8, "F");
          pdf.setFontSize(8); pdf.setFont("helvetica","bold"); pdf.setTextColor(r,g,b);
          pdf.text(`${DIM_NAMES[dimId]} (${Math.round(DIM_WEIGHTS[dimId]*100)}%)`, ML+6, fy);
          pdf.setFont("helvetica","normal"); pdf.setTextColor(20,20,20);
          pdf.text(String(Math.round(dim.avg_score)), ML+75, fy);
          pdf.setFontSize(7); pdf.setTextColor(130,120,130);
          pdf.text(act.label, ML+86, fy);
          fy += 7;
        });
      }

      // Disclaimer -- anchored to bottom
      const discText = "This report is generated by BrainWise's AI interpretation engine. Data is aggregated across participants with a minimum of 5. For authorized HR and leadership use only. Confidential.";
      const discLines = splitText(discText, CW-8, 7, "normal");
      const discH = discLines.length*3.5+6;
      const discY = PH-50;
      pdf.setFillColor(249,247,241); pdf.roundedRect(ML, discY, CW, discH, 2, 2, "F");
      pdf.setFontSize(7); pdf.setTextColor(130,120,130); pdf.setFont("helvetica","normal");
      pdf.text(discLines, ML+4, discY+4.5);
      addFooter();

      // ── OVERVIEW ─────────────────────────────────────────────────────────
      if (exportSections["overview"]) {
        pdf.addPage(); pageNum++; y = 14;
        pdf.setFillColor(249,247,241); pdf.rect(ML,y,CW,7,"F");
        pdf.setFontSize(8.5); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
        pdf.text("OVERVIEW", ML+3, y+5); y += 11;

        // Methodology -- compute height dynamically
        const methBody = "The AI Readiness Index (0–100) is calculated as 100 minus the weighted average of the five C.A.F.E.S. friction scores. Higher = more ready. Dimensions are weighted by their impact on sustained AI adoption behavior per 2025 NLI research.";
        const methLines = splitText(methBody, CW-10, 7.5, "normal");
        const barsH = DIMS_BY_WEIGHT.length * 4.5;
        const methH = 5 + 4.5 + methLines.length*4 + 3 + barsH + 3;
        pdf.setFillColor(249,247,241); pdf.roundedRect(ML,y,CW,methH,2,2,"F");
        pdf.setFillColor(2,31,54); pdf.rect(ML,y,1.5,methH,"F");
        pdf.setFontSize(7.5); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
        pdf.text("About the AI Readiness Index · weighted methodology", ML+5, y+5);
        pdf.setFontSize(7.5); pdf.setFont("helvetica","normal"); pdf.setTextColor(50,50,50);
        pdf.text(methLines, ML+5, y+10);
        let bsy = y + 10 + methLines.length*4 + 2;
        DIMS_BY_WEIGHT.forEach((dimId) => {
          const [r,g,b] = hexRgb(DIM_COLORS[dimId]);
          pdf.setFontSize(6); pdf.setFont("helvetica","bold"); pdf.setTextColor(r,g,b);
          pdf.text(`${DIM_NAMES[dimId]} ${Math.round(DIM_WEIGHTS[dimId]*100)}%`, ML+5, bsy);
          pdf.setFillColor(r,g,b);
          pdf.rect(ML+50, bsy-2.2, (DIM_WEIGHTS[dimId]/0.28)*38, 2.2, "F");
          bsy += 4.5;
        });
        y += methH + 5;

        // Usage cards
        if (usage) {
          checkY(18);
          const cards = [
            { label: "ACTIVE USERS", value: `${usage.active_users}/${usage.seat_count}`, sub: `${Math.round((usage.active_users/Math.max(usage.seat_count,1))*100)}% of seats` },
            { label: "COMPLETIONS (30D)", value: String(usage.completions_30d?.["INST-002"] ?? 0), sub: "NAI assessments" },
            { label: "COMPLETION RATE", value: `${Math.round(usage.completion_rate?.pct ?? 0)}%`, sub: `${usage.completion_rate?.completed ?? 0} of ${usage.completion_rate?.eligible ?? 0} users` },
            { label: "AI CHAT USAGE", value: `${usage.ai_usage?.chat_used ?? 0}/${usage.ai_usage?.chat_allowance ?? 0}`, sub: usage.ai_usage?.ai_chat_enabled ? "messages this month" : "not enabled" },
          ];
          const cw = (CW-9)/4;
          cards.forEach((c,i) => {
            const cx2 = ML + i*(cw+3);
            pdf.setFillColor(245,247,250); pdf.roundedRect(cx2, y, cw, 16, 1.5, 1.5, "F");
            pdf.setFontSize(6); pdf.setFont("helvetica","normal"); pdf.setTextColor(130,120,130);
            pdf.text(c.label, cx2+3, y+4.5);
            pdf.setFontSize(10); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
            pdf.text(c.value, cx2+3, y+10.5);
            pdf.setFontSize(6.5); pdf.setFont("helvetica","normal"); pdf.setTextColor(130,120,130);
            pdf.text(c.sub, cx2+3, y+15);
          });
          y += 20;
        }

        // Risk flags
        if (riskFlags.length > 0) {
          checkY(12);
          // Section rule
          y += 2;
          pdf.setFontSize(9); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
          pdf.text(`Risk Flags · generated ${latestNarrative?.generated_at ? new Date(latestNarrative.generated_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : ""}`, ML, y);
          y += 1.5;
          pdf.setDrawColor(2,31,54); pdf.setLineWidth(0.4);
          pdf.line(ML, y, ML+CW, y); y += 5;

          riskFlags.forEach(flag => {
            const borderColor: [number,number,number] = flag.level === "high" ? [163,45,45] : [200,100,20];
            // Measure content precisely before drawing card
            const lvlLines = splitText(flag.level === "high" ? "HIGH RISK" : "WARNING", CW-8, 6.5, "bold");
            const titleLns = splitText(flag.title, CW-8, 8.5, "bold");
            const summLns = splitText(flag.summary, CW-8, 7.5, "normal");
            const detLns = splitText(flag.detail, CW-8, 7.5, "normal");
            const cardH = 4 + lvlLines.length*4 + titleLns.length*4.5 + 2 + summLns.length*4 + 2 + detLns.length*4 + 4;
            checkY(cardH+4);
            pdf.setFillColor(249,247,241); pdf.roundedRect(ML,y,CW,cardH,2,2,"F");
            pdf.setFillColor(...borderColor); pdf.rect(ML,y,2,cardH,"F");
            let cy2 = y+4;
            pdf.setFontSize(6.5); pdf.setFont("helvetica","bold"); pdf.setTextColor(...borderColor);
            pdf.text(flag.level === "high" ? "HIGH RISK" : "WARNING", ML+5, cy2); cy2 += lvlLines.length*4;
            pdf.setFontSize(8.5); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
            pdf.text(titleLns, ML+5, cy2); cy2 += titleLns.length*4.5+2;
            pdf.setFontSize(7.5); pdf.setFont("helvetica","normal"); pdf.setTextColor(50,50,50);
            pdf.text(summLns, ML+5, cy2); cy2 += summLns.length*4+2;
            pdf.setTextColor(70,70,70);
            pdf.text(detLns, ML+5, cy2);
            y += cardH+4;
          });
        }

        // C.A.F.E.S. table
        if (Object.keys(dims).length > 0) {
          checkY(14);
          y += 2;
          pdf.setFontSize(9); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
          pdf.text("C.A.F.E.S. Dimension Summary", ML, y);
          y += 1.5;
          pdf.setDrawColor(2,31,54); pdf.setLineWidth(0.4); pdf.line(ML, y, ML+CW, y); y += 4;
          pdf.setFillColor(237,233,223); pdf.rect(ML,y,CW,6,"F");
          pdf.setFontSize(6.5); pdf.setFont("helvetica","bold"); pdf.setTextColor(109,104,117);
          pdf.text("DIMENSION", ML+2, y+4); pdf.text("SCORE", ML+72, y+4);
          pdf.text("ACTIVATION", ML+90, y+4); pdf.text("AT 75+", ML+122, y+4);
          pdf.text("LOW %", ML+138, y+4); pdf.text("ELEV %", ML+155, y+4);
          y += 6;
          DIMS_BY_WEIGHT.forEach((dimId,i) => {
            const dim = dims[dimId]; if (!dim) return;
            const act = activationLabel(dim.avg_score);
            const [r,g,b] = hexRgb(DIM_COLORS[dimId]);
            if (i%2===0) { pdf.setFillColor(250,250,252); pdf.rect(ML,y,CW,7,"F"); }
            pdf.setFillColor(r,g,b); pdf.circle(ML+3,y+3.5,1.8,"F");
            pdf.setFontSize(7.5); pdf.setFont("helvetica","bold"); pdf.setTextColor(r,g,b);
            pdf.text(DIM_NAMES[dimId], ML+8, y+4.5);
            pdf.setTextColor(2,31,54);
            pdf.text(String(Math.round(dim.avg_score)), ML+72, y+4.5);
            const actCol: [number,number,number] = act.label === "High" ? [163,45,45] : act.label === "Elevated" ? [99,56,6] : [15,110,86];
            pdf.setFontSize(7); pdf.setFont("helvetica","normal"); pdf.setTextColor(...actCol);
            pdf.text(act.label, ML+90, y+4.5);
            pdf.setTextColor(80,80,80);
            pdf.text(`${Math.round(dim.pct_at_75_plus)}%`, ML+122, y+4.5);
            pdf.text(`${Math.round(dim.pct_low)}%`, ML+138, y+4.5);
            pdf.text(`${Math.round(dim.pct_elevated)}%`, ML+155, y+4.5);
            y += 7;
          });
          y += 4;
        }

        // Dept participation
        if (usage?.dept_participation && usage.dept_participation.length > 0) {
          checkY(14);
          y += 2;
          pdf.setFontSize(9); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
          pdf.text("Participation by Department", ML, y);
          y += 1.5;
          pdf.setDrawColor(2,31,54); pdf.setLineWidth(0.4); pdf.line(ML, y, ML+CW, y); y += 4;
          pdf.setFillColor(237,233,223); pdf.rect(ML,y,CW,6,"F");
          pdf.setFontSize(6.5); pdf.setFont("helvetica","bold"); pdf.setTextColor(109,104,117);
          pdf.text("DEPARTMENT", ML+2, y+4); pdf.text("COMPLETED", ML+75, y+4); pdf.text("RATE", ML+105, y+4);
          y += 6;
          usage.dept_participation.sort((a,b) => b.pct-a.pct).forEach((dept,i) => {
            if (i%2===0) { pdf.setFillColor(250,250,252); pdf.rect(ML,y,CW,7,"F"); }
            pdf.setFontSize(7.5); pdf.setFont("helvetica","normal"); pdf.setTextColor(30,30,30);
            pdf.text(dept.department_name, ML+2, y+4.5);
            pdf.text(`${dept.completed}/${dept.eligible}`, ML+75, y+4.5);
            pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
            pdf.text(`${Math.round(dept.pct)}%`, ML+105, y+4.5);
            pdf.setFillColor(225,225,225); pdf.rect(ML+118, y+2, 58, 3.5, "F");
            pdf.setFillColor(0,109,119); pdf.rect(ML+118, y+2, Math.min(58, dept.pct/100*58), 3.5, "F");
            y += 7;
          });
          y += 4;
        }
      }

      // ── DIMENSIONS ───────────────────────────────────────────────────────
      if (exportSections["dimensions"]) {
        newPage("DIMENSIONS");
        const descW = CW - 10;

        DIMS_BY_WEIGHT.forEach(dimId => {
          const dim = dims[dimId]; if (!dim) return;
          const act = activationLabel(dim.avg_score);
          const [r,g,b] = hexRgb(DIM_COLORS[dimId]);
          const dimInterventions = interventions.filter(iv => iv.target_dimensions?.includes(dimId));

          const interpText = `${DIM_NAMES[dimId]} carries a ${Math.round(DIM_WEIGHTS[dimId]*100)}% weight in the readiness index. Score of ${Math.round(dim.avg_score)} — ${act.label.toLowerCase()} activation.${dim.avg_score >= 60 ? " This is the most operationally significant finding in this slice." : dim.avg_score < 50 ? " This is currently an organizational asset — protect it." : " Monitor for upward movement."}`;
          const interpLns = splitText(interpText, descW, 7.5, "normal");

          // Compute true card height
          let cardH = 22; // header + bar + labels + interp label gap
          cardH += interpLns.length * 4;
          if (dimInterventions.length > 0) {
            cardH += 8; // "Interventions targeting" label
            dimInterventions.forEach(iv => {
              const tl = splitText(iv.title, descW - 45, 7.5, "bold");
              const dl = splitText(iv.description, descW, 7.5, "normal");
              cardH += 6 + tl.length*4.5 + dl.length*4 + 4;
            });
          }
          cardH += 4; // bottom pad

          checkY(cardH + 5, "DIMENSIONS (cont.)");

          // Draw card
          pdf.setFillColor(249,247,241);
          pdf.roundedRect(ML, y, CW, cardH, 2, 2, "F");
          pdf.setFillColor(r,g,b); pdf.rect(ML, y, 2, cardH, "F");

          // Header row
          pdf.setFillColor(r,g,b); pdf.circle(ML+6, y+6, 2.5, "F");
          pdf.setFontSize(9); pdf.setFont("helvetica","bold"); pdf.setTextColor(r,g,b);
          pdf.text(DIM_NAMES[dimId], ML+11, y+7);
          const nw = pdf.getTextWidth(DIM_NAMES[dimId]);
          pdf.setFontSize(7); pdf.setFont("helvetica","normal"); pdf.setTextColor(245,116,26);
          pdf.text(`Weight ${Math.round(DIM_WEIGHTS[dimId]*100)}%`, ML+11+nw+3, y+7);

          // Score right side
          pdf.setFontSize(15); pdf.setFont("helvetica","bold"); pdf.setTextColor(r,g,b);
          pdf.text(String(Math.round(dim.avg_score)), ML+CW-18, y+8, { align:"right" });
          const actCol: [number,number,number] = act.label === "High" ? [163,45,45] : act.label === "Elevated" ? [99,56,6] : [15,110,86];
          pdf.setFontSize(7); pdf.setFont("helvetica","normal"); pdf.setTextColor(...actCol);
          pdf.text(act.label, ML+CW-4, y+8, { align:"right" });

          // Distribution bar
          const barY = y + 13;
          const barW = CW - 10;
          pdf.setFillColor(225,241,238); pdf.rect(ML+5, barY, barW*(dim.pct_low/100), 3, "F");
          pdf.setFillColor(250,238,218); pdf.rect(ML+5+barW*(dim.pct_low/100), barY, barW*(dim.pct_elevated/100), 3, "F");
          pdf.setFillColor(250,236,231); pdf.rect(ML+5+barW*((dim.pct_low+dim.pct_elevated)/100), barY, barW*(dim.pct_high/100), 3, "F");
          pdf.setFontSize(6); pdf.setTextColor(130,120,130); pdf.setFont("helvetica","normal");
          pdf.text(`Low ${Math.round(dim.pct_low)}%`, ML+5, barY+7);
          pdf.text(`Elevated ${Math.round(dim.pct_elevated)}%`, ML+CW/2, barY+7, {align:"center"});
          pdf.text(`High ${Math.round(dim.pct_high)}%`, ML+CW-5, barY+7, {align:"right"});

          let cy2 = barY + 11;
          pdf.setFontSize(7.5); pdf.setFont("helvetica","normal"); pdf.setTextColor(60,60,60);
          pdf.text(interpLns, ML+5, cy2);
          cy2 += interpLns.length * 4 + 2;

          if (dimInterventions.length > 0) {
            pdf.setFontSize(7); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
            pdf.text("Interventions targeting this dimension", ML+5, cy2);
            cy2 += 6;
            dimInterventions.forEach(iv => {
              const tl = splitText(iv.title, descW-45, 7.5, "bold");
              const dl = splitText(iv.description, descW, 7.5, "normal");
              const ivH = 5 + tl.length*4.5 + dl.length*4 + 3;
              pdf.setFillColor(237,233,223); pdf.roundedRect(ML+5, cy2, CW-10, ivH, 1.5, 1.5, "F");
              pdf.setFontSize(7.5); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
              pdf.text(tl, ML+8, cy2+4.5);
              // Badges right-aligned
              const pCol: [number,number,number] = iv.priority === "high" ? [153,60,29] : iv.priority === "medium" ? [99,56,6] : [15,110,86];
              pdf.setFontSize(6.5); pdf.setFont("helvetica","normal");
              pdf.setTextColor(...pCol); pdf.text(iv.priority, ML+CW-7, cy2+4.5, {align:"right"});
              pdf.setTextColor(60,9,108); pdf.text(iv.time_horizon, ML+CW-20, cy2+4.5, {align:"right"});
              pdf.setTextColor(2,31,54); pdf.text(iv.intervention_type, ML+CW-38, cy2+4.5, {align:"right"});
              pdf.setFontSize(7.5); pdf.setFont("helvetica","normal"); pdf.setTextColor(70,70,70);
              pdf.text(dl, ML+8, cy2+4.5+tl.length*4.5);
              cy2 += ivH + 2;
            });
          }
          y += cardH + 5;
        });
      }

      // ── AI INTERPRETATION ────────────────────────────────────────────────
      if (exportSections["interpretation"] && latestNarrative) {
        newPage("AI INTERPRETATION");

        // C.A.F.E.S. score cards
        if (Object.keys(dims).length > 0) {
          checkY(24);
          const dw = (CW-16)/5;
          DIMS_BY_WEIGHT.forEach((dimId,i) => {
            const dim = dims[dimId]; if (!dim) return;
            const act = activationLabel(dim.avg_score);
            const [r,g,b] = hexRgb(DIM_COLORS[dimId]);
            const actBg: [number,number,number] = act.label === "High" ? [250,236,231] : act.label === "Elevated" ? [250,238,218] : [225,245,238];
            const cx2 = ML + i*(dw+4);
            pdf.setFillColor(...actBg); pdf.roundedRect(cx2, y, dw, 20, 2, 2, "F");
            pdf.setFontSize(6); pdf.setFont("helvetica","bold"); pdf.setTextColor(r,g,b);
            pdf.text(DIM_NAMES[dimId], cx2+dw/2, y+5, {align:"center"});
            pdf.setFontSize(13); pdf.setFont("helvetica","bold");
            pdf.text(String(Math.round(dim.avg_score)), cx2+dw/2, y+13, {align:"center"});
            pdf.setFontSize(6); pdf.setFont("helvetica","normal");
            pdf.text(act.label, cx2+dw/2, y+18.5, {align:"center"});
          });
          y += 24;
          pdf.setFontSize(6.5); pdf.setTextColor(130,120,130); pdf.setFont("helvetica","normal");
          pdf.text("Ordered by index weight: Fairness 28% · Ego Stability 25% · Agency 22% · Certainty 15% · Saturation 10%", ML+CW/2, y, {align:"center"});
          y += 6;
        }

        const narSections = [
          { key: "business_meaning", label: "WHAT THIS MEANS FOR YOUR BUSINESS" },
          { key: "benefits", label: "POTENTIAL BENEFITS VISIBLE IN THE DATA" },
          { key: "risks", label: "POTENTIAL RISKS IF UNADDRESSED" },
          { key: "next_steps", label: "RECOMMENDED NEXT STEPS" },
        ] as const;

        narSections.forEach(s => {
          const text = latestNarrative.narrative_text[s.key];
          if (!text) return;
          const lines = splitText(text, CW-12, 8, "normal");
          const cardH = 10 + lines.length*4.2 + 4;
          checkY(cardH+4, "AI INTERPRETATION (cont.)");
          pdf.setFillColor(249,247,241); pdf.roundedRect(ML,y,CW,cardH,2,2,"F");
          pdf.setFillColor(245,116,26); pdf.rect(ML,y,2,cardH,"F");
          pdf.setFontSize(7); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
          pdf.text(s.label, ML+5, y+6);
          pdf.setFontSize(8); pdf.setFont("helvetica","normal"); pdf.setTextColor(40,40,40);
          pdf.text(lines, ML+5, y+11);
          y += cardH+4;
        });

        // Reassessment note
        if (latestNarrative.narrative_text.reassessment_note) {
          const rLines = splitText(`Reassessment: ${latestNarrative.narrative_text.reassessment_note}`, CW-8, 7.5, "normal");
          const rH = rLines.length*4+6;
          checkY(rH+4, "AI INTERPRETATION (cont.)");
          pdf.setFillColor(249,247,241); pdf.roundedRect(ML,y,CW,rH,2,2,"F");
          pdf.setFontSize(7.5); pdf.setFont("helvetica","normal"); pdf.setTextColor(80,80,80);
          pdf.text(rLines, ML+4, y+5);
          y += rH+6;
        }

      }

      // ── INTERVENTIONS ────────────────────────────────────────────────────
      if (exportSections["interventions"] && interventions.length > 0) {
        newPage("INTERVENTIONS");
        pdf.setFontSize(9); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
        pdf.text("Structured Interventions", ML, y);
        y += 1.5;
        pdf.setDrawColor(2,31,54); pdf.setLineWidth(0.4); pdf.line(ML, y, ML+CW, y); y += 5;

        interventions.forEach(iv => {
          const tLines = splitText(iv.title, CW-55, 8, "bold");
          const dLines = splitText(iv.description, CW-8, 7.5, "normal");
          const targText = `Targets: ${iv.target_dimensions?.map(d => DIM_NAMES[d] ?? d).join(" · ")}`;
          const ivH = 5 + tLines.length*4.5 + dLines.length*4 + 5 + 4;
          checkY(ivH+4, "INTERVENTIONS (cont.)");
          pdf.setFillColor(249,247,241); pdf.roundedRect(ML,y,CW,ivH,2,2,"F");
          pdf.setDrawColor(220,220,220); pdf.setLineWidth(0.3);
          pdf.roundedRect(ML,y,CW,ivH,2,2,"S");
          pdf.setFontSize(8); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
          pdf.text(tLines, ML+4, y+5);
          // Badges
          const pCol: [number,number,number] = iv.priority === "high" ? [153,60,29] : iv.priority === "medium" ? [99,56,6] : [15,110,86];
          pdf.setFontSize(6.5); pdf.setFont("helvetica","normal");
          pdf.setTextColor(...pCol); pdf.text(iv.priority, ML+CW-4, y+5, {align:"right"});
          pdf.setTextColor(60,9,108); pdf.text(iv.time_horizon, ML+CW-20, y+5, {align:"right"});
          pdf.setTextColor(50,50,50); pdf.text(iv.intervention_type, ML+CW-40, y+5, {align:"right"});
          let iy = y+5+tLines.length*4.5;
          pdf.setFontSize(7.5); pdf.setFont("helvetica","normal"); pdf.setTextColor(60,60,60);
          pdf.text(dLines, ML+4, iy);
          iy += dLines.length*4+3;
          pdf.setFontSize(6.5); pdf.setTextColor(130,120,130);
          pdf.text(targText, ML+4, iy);
          y += ivH+4;
        });
      }

      // ── TRENDS ───────────────────────────────────────────────────────────
      if (exportSections["trends"] && narrativeHistory.length > 0) {
        newPage("TRENDS");
        pdf.setFontSize(7.5); pdf.setFont("helvetica","normal"); pdf.setTextColor(80,80,80);
        pdf.text("Trend data across AI interpretation generations. Lower dimension scores = improving readiness.", ML, y); y += 7;

        // Column positions -- carefully spaced to avoid overlap
        const colGen = ML+2;
        const colIdx = ML+52;
        const colDims = [74, 94, 112, 130, 148]; // Fairness, Ego, Agency, Certainty, Saturation
        const colN = ML+CW-2;

        checkY(7);
        pdf.setFillColor(237,233,223); pdf.rect(ML,y,CW,6,"F");
        pdf.setFontSize(6.5); pdf.setFont("helvetica","bold"); pdf.setTextColor(109,104,117);
        pdf.text("GENERATED", colGen, y+4);
        pdf.text("INDEX", colIdx, y+4);
        DIMS_BY_WEIGHT.forEach((dimId,i) => {
          const [r,g,b] = hexRgb(DIM_COLORS[dimId]);
          pdf.setTextColor(r,g,b);
          pdf.text(DIM_NAMES[dimId].substring(0,3).toUpperCase(), colDims[i], y+4);
        });
        pdf.setTextColor(109,104,117);
        pdf.text("n", colN, y+4, {align:"right"});
        y += 6;

        narrativeHistory.forEach((h,i) => {
          checkY(7, "TRENDS (cont.)");
          if (i%2===0) { pdf.setFillColor(250,250,252); pdf.rect(ML,y,CW,7,"F"); }
          if (i===0) {
            pdf.setFillColor(0,109,119); pdf.roundedRect(colGen, y+1.5, 11, 4, 1, 1, "F");
            pdf.setFontSize(5.5); pdf.setTextColor(255,255,255); pdf.setFont("helvetica","bold");
            pdf.text("Latest", colGen+5.5, y+4.5, {align:"center"});
          }
          pdf.setFontSize(7.5); pdf.setFont("helvetica", i===0 ? "bold" : "normal"); pdf.setTextColor(30,30,30);
          const genDate = new Date(h.generated_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
          pdf.text(genDate, i===0 ? colGen+14 : colGen, y+5);
          pdf.setFont("helvetica","bold"); pdf.setTextColor(0,109,119);
          pdf.text(h.index_score?.toFixed(1) ?? "—", colIdx, y+5);
          const dimScores = (h as any).dimension_scores ?? {};
          DIMS_BY_WEIGHT.forEach((dimId,j) => {
            const score = dimScores[dimId]?.avg_score;
            const [r,g,b] = hexRgb(DIM_COLORS[dimId]);
            pdf.setFont("helvetica","normal");
            pdf.setTextColor(score !== undefined ? r : 160, score !== undefined ? g : 160, score !== undefined ? b : 160);
            pdf.text(score !== undefined ? String(Math.round(score)) : "—", colDims[j], y+5);
          });
          pdf.setFont("helvetica","normal"); pdf.setTextColor(130,120,130);
          pdf.text(String(h.participant_count), colN, y+5, {align:"right"});
          y += 7;
        });
        y += 4;

        // Legend
        checkY(8);
        let lx = ML;
        DIMS_BY_WEIGHT.forEach(dimId => {
          const [r,g,b] = hexRgb(DIM_COLORS[dimId]);
          pdf.setFillColor(r,g,b); pdf.rect(lx, y, 8, 2, "F");
          pdf.setFontSize(6.5); pdf.setTextColor(80,80,80); pdf.setFont("helvetica","normal");
          pdf.text(`${DIM_NAMES[dimId]} (${Math.round(DIM_WEIGHTS[dimId]*100)}%)`, lx+10, y+2);
          lx += 36;
        });
        y += 7;
      }

      // ── CROSS-INSTRUMENT ─────────────────────────────────────────────────
      if (exportSections["cross-instrument"]) {
        newPage("CROSS-INSTRUMENT");

        const ciIntro = "Cross-instrument analysis requires participants to have completed both NAI and PTP. Patterns reveal whether AI adoption barriers are specific to AI context or rooted in deeper threat-response patterns.";
        const ciLines = splitText(ciIntro, CW, 7.5, "normal");
        pdf.setFontSize(7.5); pdf.setFont("helvetica","normal"); pdf.setTextColor(80,80,80);
        pdf.text(ciLines, ML, y); y += ciLines.length*4+6;

        if (Object.keys(dims).length > 0) {
          const panelW = (CW-6)/2;
          checkY(56);
          // NAI panel
          pdf.setFillColor(249,247,241); pdf.roundedRect(ML, y, panelW, 52, 2, 2, "F");
          pdf.setFontSize(7); pdf.setFont("helvetica","bold"); pdf.setTextColor(130,120,130);
          pdf.text("NAI · C.A.F.E.S. (BY WEIGHT)", ML+4, y+6);
          let dy2 = y+12;
          DIMS_BY_WEIGHT.forEach(dimId => {
            const dim = dims[dimId]; if (!dim) return;
            const act = activationLabel(dim.avg_score);
            const [r,g,b] = hexRgb(DIM_COLORS[dimId]);
            const actCol: [number,number,number] = act.label === "High" ? [163,45,45] : act.label === "Elevated" ? [99,56,6] : [15,110,86];
            pdf.setFontSize(7.5); pdf.setFont("helvetica","bold"); pdf.setTextColor(r,g,b);
            pdf.text(DIM_NAMES[dimId], ML+4, dy2);
            pdf.setTextColor(2,31,54);
            pdf.text(String(Math.round(dim.avg_score)), ML+panelW-20, dy2);
            pdf.setFontSize(6.5); pdf.setFont("helvetica","normal"); pdf.setTextColor(...actCol);
            pdf.text(act.label, ML+panelW-4, dy2, {align:"right"});
            dy2 += 6.5;
          });
          pdf.setDrawColor(200,200,200); pdf.setLineWidth(0.3);
          pdf.line(ML+4, dy2+1, ML+panelW-4, dy2+1);
          pdf.setFontSize(7.5); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
          pdf.text(`AI Readiness Index: ${indexScore !== null ? `${indexScore}/100` : "—"}`, ML+4, dy2+6);

          // PTP panel
          const px = ML+panelW+6;
          const ptpDimsLocal = ptpAggregate?.dimensions;
          const ptpAvailable = !!ptpDimsLocal && Object.keys(ptpDimsLocal).length > 0 && !ptpAggregate?.suppressed;
          const PTP_COLORS_LOCAL: Record<string,string> = {"DIM-PTP-01":"#021F36","DIM-PTP-02":"#006D77","DIM-PTP-03":"#6D6875","DIM-PTP-04":"#3C096C","DIM-PTP-05":"#FFB703"};
          const PTP_NAMES_LOCAL: Record<string,string> = {"DIM-PTP-01":"Protection","DIM-PTP-02":"Participation","DIM-PTP-03":"Prediction","DIM-PTP-04":"Purpose","DIM-PTP-05":"Pleasure"};
          const PTP_TRI_W: Record<string,number> = {"DIM-PTP-01":0.25,"DIM-PTP-02":0.30,"DIM-PTP-03":0.45};
          const PTP_RSI_W: Record<string,number> = {"DIM-PTP-04":0.60,"DIM-PTP-05":0.40};
          const PTP_ORDER = ["DIM-PTP-01","DIM-PTP-02","DIM-PTP-03","DIM-PTP-04","DIM-PTP-05"];
          if (ptpAvailable) {
            pdf.setFillColor(249,247,241); pdf.roundedRect(px, y, panelW, 52, 2, 2, "F");
            pdf.setFontSize(7); pdf.setFont("helvetica","bold"); pdf.setTextColor(130,120,130);
            pdf.text("PTP · THREAT & REWARD", px+4, y+6);
            let py2 = y+12;
            PTP_ORDER.forEach(dimId => {
              const dim = ptpDimsLocal![dimId]; if (!dim) return;
              const [r,g,b] = hexRgb(PTP_COLORS_LOCAL[dimId]);
              pdf.setFontSize(7.5); pdf.setFont("helvetica","bold"); pdf.setTextColor(r,g,b);
              pdf.text(PTP_NAMES_LOCAL[dimId], px+4, py2);
              pdf.setTextColor(2,31,54);
              pdf.text(String(Math.round(dim.avg_score)), px+panelW-20, py2);
              py2 += 6.5;
            });
            const triVal = Math.round((100 - Object.entries(PTP_TRI_W).reduce((a,[k,w]) => a + (ptpDimsLocal![k]?.avg_score ?? 50)*w, 0)) * 10)/10;
            const rsiVal = Math.round(Object.entries(PTP_RSI_W).reduce((a,[k,w]) => a + (ptpDimsLocal![k]?.avg_score ?? 50)*w, 0) * 10)/10;
            pdf.setDrawColor(200,200,200); pdf.setLineWidth(0.3);
            pdf.line(px+4, py2+1, px+panelW-4, py2+1);
            pdf.setFontSize(7.5); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
            pdf.text(`TRI: ${triVal.toFixed(1)}  RSI: ${rsiVal.toFixed(1)}`, px+4, py2+6);
          } else {
            pdf.setFillColor(245,245,245); pdf.roundedRect(px, y, panelW, 52, 2, 2, "F");
            pdf.setFontSize(7); pdf.setFont("helvetica","bold"); pdf.setTextColor(130,120,130);
            pdf.text("PTP · THREAT RESPONSE", px+4, y+6);
            const ptpMsg = "PTP aggregate data will appear here once 5+ participants have completed both instruments.";
            const ptpLines = splitText(ptpMsg, panelW-8, 7.5, "normal");
            pdf.setFontSize(7.5); pdf.setFont("helvetica","normal"); pdf.setTextColor(150,150,150);
            pdf.text(ptpLines, px+4, y+16);
          }
          y += 57;
        }

        // Co-elevation
        checkY(12);
        y += 2;
        pdf.setFontSize(9); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
        pdf.text("Co-elevation Patterns", ML, y);
        y += 1.5;
        pdf.setDrawColor(2,31,54); pdf.setLineWidth(0.4); pdf.line(ML, y, ML+CW, y); y += 5;
        const coText = "Co-elevation occurs when a dimension is simultaneously elevated in both NAI and PTP — for example, high Ego Stability (NAI) paired with high Protection (PTP). These compound patterns are the most operationally significant findings because barriers reinforce each other and require sequential intervention.";
        const coLines = splitText(coText, CW, 7.5, "normal");
        pdf.setFontSize(7.5); pdf.setFont("helvetica","normal"); pdf.setTextColor(60,60,60);
        pdf.text(coLines, ML, y); y += coLines.length*4+4;

        const ptpDimsForCo = ptpAggregate?.dimensions;
        const ptpAvailForCo = !!ptpDimsForCo && Object.keys(ptpDimsForCo).length > 0 && !ptpAggregate?.suppressed;
        const naiDimsForCo = aggregate?.dimensions ?? {};
        const PTP_COLORS_CO: Record<string,string> = {"DIM-PTP-01":"#021F36","DIM-PTP-02":"#006D77","DIM-PTP-03":"#6D6875","DIM-PTP-04":"#3C096C","DIM-PTP-05":"#FFB703"};
        if (!ptpAvailForCo) {
          const pendText = "Co-elevation pattern detection requires PTP aggregate data. Complete cross-instrument analysis will appear here once participants have completed both assessments.";
          const pendLines = splitText(pendText, CW-8, 7.5, "italic");
          const pendH = pendLines.length*4+6;
          pdf.setFillColor(245,247,250); pdf.roundedRect(ML, y, CW, pendH, 2, 2, "F");
          pdf.setFontSize(7.5); pdf.setFont("helvetica","italic"); pdf.setTextColor(130,120,130);
          pdf.text(pendLines, ML+4, y+5); y += pendH+8;
        } else {
          const patterns = detectCoElevations(naiDimsForCo, ptpDimsForCo!);
          if (patterns.length === 0) {
            const noneText = "No co-elevation patterns detected — all cross-instrument dimension pairs are within normal range.";
            const noneLines = splitText(noneText, CW-8, 7.5, "italic");
            const noneH = noneLines.length*4+6;
            pdf.setFillColor(245,247,250); pdf.roundedRect(ML, y, CW, noneH, 2, 2, "F");
            pdf.setFontSize(7.5); pdf.setFont("helvetica","italic"); pdf.setTextColor(130,120,130);
            pdf.text(noneLines, ML+4, y+5); y += noneH+8;
          } else {
            for (const p of patterns) {
              const dLines = splitText(p.description, CW-12, 7.5, "normal");
              const cardH = 8 + dLines.length*4 + 10;
              checkY(cardH+4);
              pdf.setFillColor(249,247,241); pdf.roundedRect(ML, y, CW, cardH, 2, 2, "F");
              pdf.setFontSize(8.5); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
              pdf.text(p.label, ML+5, y+6);
              pdf.setFontSize(7.5); pdf.setFont("helvetica","normal"); pdf.setTextColor(80,80,80);
              pdf.text(dLines, ML+5, y+11);
              const scY = y + 11 + dLines.length*4 + 2;
              const [nr,ng,nb] = hexRgb(DIM_COLORS[p.naiDimId]);
              const [pr,pg,pb] = hexRgb(PTP_COLORS_CO[p.ptpDimId]);
              pdf.setFontSize(7.5); pdf.setFont("helvetica","bold");
              pdf.setTextColor(nr,ng,nb);
              pdf.text(`NAI ${p.naiDimName} ${Math.round(p.naiScore)}`, ML+5, scY);
              pdf.setTextColor(pr,pg,pb);
              pdf.text(`PTP ${p.ptpDimName} ${Math.round(p.ptpScore)}`, ML+60, scY);
              y += cardH + 4;
            }
          }
        }

        // Cross-instrument recommendations (replaces broken business_meaning rendering)
        if (crossInstrumentRow) {
          checkY(12);
          y += 2;
          pdf.setFontSize(9); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
          pdf.text("Recommended Next Steps · Cross-Instrument", ML, y);
          y += 1.5;
          pdf.setDrawColor(2,31,54); pdf.setLineWidth(0.4); pdf.line(ML, y, ML+CW, y); y += 5;

          pdf.setFontSize(7); pdf.setTextColor(130,120,130); pdf.setFont("helvetica","normal");
          pdf.text(`Generated ${new Date(crossInstrumentRow.generated_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`, ML, y);
          y += 5;

          if (crossInstrumentRow.summary) {
            const sumLines = splitText(crossInstrumentRow.summary, CW, 8, "normal");
            pdf.setFontSize(8); pdf.setFont("helvetica","normal"); pdf.setTextColor(40,40,40);
            pdf.text(sumLines, ML, y);
            y += sumLines.length * 4.2 + 4;
          }

          for (const rec of crossInstrumentRow.recommendations) {
            const titleLns = splitText(rec.title, CW-50, 8.5, "bold");
            const ratLns = splitText(rec.rationale, CW-8, 7.5, "normal");
            const stepsHeight = rec.steps && rec.steps.length > 0
              ? rec.steps.reduce((acc, s) => acc + splitText(s, CW-14, 7, "normal").length * 3.8, 5)
              : 0;
            const cardH = 5 + titleLns.length*4.5 + 2 + ratLns.length*4 + stepsHeight + 4;
            checkY(cardH+4, "CROSS-INSTRUMENT (cont.)");

            pdf.setFillColor(249,247,241); pdf.roundedRect(ML, y, CW, cardH, 2, 2, "F");
            pdf.setFontSize(8.5); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
            pdf.text(titleLns, ML+4, y+5);

            const pCol: [number,number,number] = rec.priority === "high" ? [153,60,29] : rec.priority === "medium" ? [99,56,6] : [15,110,86];
            pdf.setFontSize(6.5); pdf.setFont("helvetica","normal");
            pdf.setTextColor(...pCol); pdf.text(rec.priority, ML+CW-4, y+5, {align:"right"});
            pdf.setTextColor(60,9,108); pdf.text(rec.time_horizon, ML+CW-22, y+5, {align:"right"});

            let cy = y + 5 + titleLns.length * 4.5 + 2;
            pdf.setFontSize(7.5); pdf.setFont("helvetica","normal"); pdf.setTextColor(60,60,60);
            pdf.text(ratLns, ML+4, cy);
            cy += ratLns.length * 4 + 2;

            if (rec.steps && rec.steps.length > 0) {
              pdf.setFontSize(6.5); pdf.setFont("helvetica","bold"); pdf.setTextColor(2,31,54);
              pdf.text("STEPS", ML+4, cy);
              cy += 4;
              pdf.setFontSize(7); pdf.setFont("helvetica","normal"); pdf.setTextColor(70,70,70);
              rec.steps.forEach((step, idx) => {
                const stepLns = splitText(`${idx+1}. ${step}`, CW-14, 7, "normal");
                pdf.text(stepLns, ML+8, cy);
                cy += stepLns.length * 3.8;
              });
            }

            y += cardH + 4;
          }
        }
      }

      addFooter();
      pdf.save(`BrainWise-NAI-CompanyDashboard-${dateStr}.pdf`);
      toast.success("Dashboard exported successfully");

    } catch (e: any) {
      toast.error("Export failed: " + (e.message ?? "unknown error"));
      console.error(e);
    }

    setExporting(false);
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

  const isCrossInstrumentStale = (): boolean => {
    if (!crossInstrumentRow || !latestNarrative) return false;
    if (crossInstrumentRow.primary_narrative_id !== latestNarrative.id) return true;
    return false;
  };

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
              NAI Dashboard
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
            <Button variant="outline" size="sm" onClick={() => setExportModal(true)} disabled={exporting}>
              <Download style={{ marginRight: 6 }} />
              {exporting ? "Exporting..." : "Export PDF"}
            </Button>
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
        <div data-export-tab="true">
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

          {/* Leadership-vs-Workforce delta (EPN) */}
          {!suppressed && Object.keys(dims).length > 0 && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 500, color: NAVY, margin: "24px 0 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Leadership compared to workforce · C.A.F.E.S.
              </h3>
              <div
                onClick={() => setExpandedLeaderWorkforce(v => !v)}
                style={{
                  padding: 14,
                  background: "#F9F7F1",
                  border: `0.5px solid ${expandedLeaderWorkforce ? NAVY : "var(--border)"}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
              >
                {loadingDelta ? (
                  <div style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading delta data…</div>
                ) : !deltaResult || deltaResult.suppressed ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16 }}>
                      <div>
                        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>Leaders (Director · VP · C-Suite, EPN)</p>
                        {DIMS_BY_WEIGHT.map(dimId => (
                          <div key={dimId} style={{ display: "grid", gridTemplateColumns: "1fr 32px", alignItems: "center", marginBottom: 8, gap: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: DIM_COLORS[dimId] }}>{DIM_NAMES[dimId]}</span>
                            <span style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "right" }}>—</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ alignSelf: "center", textAlign: "center" }}>
                        <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "0 0 6px", textTransform: "uppercase" }}>delta</p>
                        {DIMS_BY_WEIGHT.map(dimId => (
                          <div key={dimId} style={{ fontSize: 13, color: "var(--muted-foreground)", padding: "4px 0" }}>—</div>
                        ))}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>Employees (Manager · IC, NAI self)</p>
                        {DIMS_BY_WEIGHT.map(dimId => (
                          <div key={dimId} style={{ display: "grid", gridTemplateColumns: "1fr 32px", alignItems: "center", marginBottom: 8, gap: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: DIM_COLORS[dimId] }}>{DIM_NAMES[dimId]}</span>
                            <span style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "right" }}>—</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 11, color: "var(--muted-foreground)", fontStyle: "italic", padding: "8px 12px", background: "var(--muted)", borderRadius: 6 }}>
                      Leader-vs-employee comparison requires at least 5 EPN respondents (leaders) AND 5 standard NAI respondents (excluding leaders). Currently {deltaResult?.epn_participant_count ?? 0} EPN, {deltaResult?.self_participant_count ?? 0} NAI (non-leader). Assign more EPN assignments or wait for more standard NAI completions.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16 }}>
                      <div>
                        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>
                          Leaders (EPN · n={deltaResult.epn_participant_count})
                        </p>
                        {DIMS_BY_WEIGHT.map(dimId => {
                          const score = deltaResult.delta?.[dimId]?.epn_mean ?? null;
                          return (
                            <div key={dimId} style={{ display: "grid", gridTemplateColumns: "1fr 32px", alignItems: "center", marginBottom: 8, gap: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: DIM_COLORS[dimId] }}>{DIM_NAMES[dimId]}</span>
                              <span style={{ fontSize: 15, fontWeight: 500, color: DIM_COLORS[dimId], textAlign: "right" }}>{score !== null ? Math.round(score) : "—"}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ alignSelf: "center", textAlign: "center" }}>
                        <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "0 0 6px", textTransform: "uppercase" }}>delta</p>
                        {DIMS_BY_WEIGHT.map(dimId => {
                          const entry = deltaResult.delta?.[dimId];
                          const d = entry?.delta ?? null;
                          const sign = d === null ? "" : (d > 0 ? "+" : "");
                          return (
                            <div key={dimId} style={{ fontSize: 13, fontWeight: 500, color: DIM_COLORS[dimId], padding: "4px 0" }}>
                              {d !== null ? `${sign}${Math.round(d * 10) / 10}` : "—"}
                            </div>
                          );
                        })}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>
                          Employees (NAI self · n={deltaResult.self_participant_count})
                        </p>
                        {DIMS_BY_WEIGHT.map(dimId => {
                          const score = deltaResult.delta?.[dimId]?.self_mean ?? null;
                          return (
                            <div key={dimId} style={{ display: "grid", gridTemplateColumns: "1fr 32px", alignItems: "center", marginBottom: 8, gap: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: DIM_COLORS[dimId] }}>{DIM_NAMES[dimId]}</span>
                              <span style={{ fontSize: 15, fontWeight: 500, color: DIM_COLORS[dimId], textAlign: "right" }}>{score !== null ? Math.round(score) : "—"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                        <span style={{ color: "#993c1d", fontWeight: 600 }}>+ delta</span>: leaders see more concern than employees report.
                      </span>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                        <span style={{ color: "#0f6e56", fontWeight: 600 }}>− delta</span>: leaders underestimate employee concern.
                      </span>
                      <span style={{ fontSize: 10, color: TEAL, marginLeft: "auto" }}>
                        {expandedLeaderWorkforce ? "↑ collapse" : "↓ expand for narrative + interventions"}
                      </span>
                    </div>
                    {expandedLeaderWorkforce && (
                      <div onClick={e => e.stopPropagation()} style={{ marginTop: 14, paddingTop: 14, borderTop: "0.5px solid var(--border)" }}>
                        {loadingDeltaNarrative ? (
                          <p style={{ fontSize: 13, color: "var(--muted-foreground)", fontStyle: "italic" }}>Loading narrative…</p>
                        ) : !deltaNarrative ? (
                          <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, fontStyle: "italic" }}>
                            AI narrative for the leader-vs-workforce comparison will appear here after you click "↻ Regenerate AI" at the top of the dashboard. The narrative is generated alongside the standard NAI interpretation.
                          </p>
                        ) : (
                          <>
                            <div style={{ marginBottom: 12 }}>
                              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                                Generated {new Date(deltaNarrative.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · Leaders n={deltaNarrative.epn_participant_count} · Employees n={deltaNarrative.self_participant_count}
                              </span>
                            </div>
                            {deltaNarrative.narrative_text.summary && (
                              <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                                <div style={{ fontSize: 9, fontWeight: 500, color: NAVY, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, borderLeft: `3px solid ${ORANGE}`, paddingLeft: 7 }}>
                                  What we're seeing
                                </div>
                                <p style={{ fontSize: 14, color: "var(--foreground)", margin: 0, lineHeight: 1.65 }}>
                                  {deltaNarrative.narrative_text.summary}
                                </p>
                              </div>
                            )}
                            {deltaNarrative.narrative_text.alignment_overview && (
                              <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 12 }}>
                                {deltaNarrative.narrative_text.alignment_overview}
                              </p>
                            )}
                            {deltaNarrative.narrative_text.key_gaps && deltaNarrative.narrative_text.key_gaps.length > 0 && (
                              <>
                                <div style={{ fontSize: 13, fontWeight: 500, color: NAVY, marginBottom: 8 }}>Key gaps</div>
                                {deltaNarrative.narrative_text.key_gaps.map((gap, i) => (
                                  <div key={i} style={{ background: "var(--muted)", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>{gap.title}</div>
                                    <div style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.55 }}>{gap.description}</div>
                                  </div>
                                ))}
                              </>
                            )}
                            {deltaNarrative.narrative_text.recommendations && deltaNarrative.narrative_text.recommendations.length > 0 && (
                              <>
                                <div style={{ fontSize: 13, fontWeight: 500, color: NAVY, marginTop: 14, marginBottom: 8 }}>
                                  Recommended interventions ({deltaNarrative.narrative_text.recommendations.length})
                                </div>
                                {deltaNarrative.narrative_text.recommendations.map(rec => (
                                  <div key={rec.id} style={{ background: "#ede9df", borderRadius: 8, padding: "14px 16px", marginBottom: 8 }}>
                                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                                      <span style={{ fontSize: 14, fontWeight: 500, color: NAVY }}>{rec.title}</span>
                                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                        {priorityBadge(rec.priority)}
                                        {horizonBadge(rec.time_horizon)}
                                        {typeBadge(rec.intervention_type)}
                                      </div>
                                    </div>
                                    <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 8px", lineHeight: 1.55 }}>{rec.rationale}</p>
                                    {rec.steps && rec.steps.length > 0 && (
                                      <ol style={{ margin: "4px 0 8px", paddingLeft: 18, fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.55 }}>
                                        {rec.steps.map((step, j) => <li key={j}>{step}</li>)}
                                      </ol>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); saveDeltaIntervention(rec); }} style={{
                                      fontSize: 10, padding: "3px 9px", border: `0.5px solid ${NAVY}`, borderRadius: 5,
                                      background: "transparent", color: NAVY, cursor: "pointer",
                                    }}>+ Add to intervention tracking</button>
                                  </div>
                                ))}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
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
        <div data-export-tab="true">
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
        <div data-export-tab="true">
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
        <div data-export-tab="true">
          <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                Showing trend for: <strong>{sliceType === "all" ? "All organization" : `${sliceType}: ${sliceValue}`}</strong>
              </span>
              <button
                onClick={() => { setCompareEnabled(v => !v); if (compareEnabled) setCompareHistory([]); }}
                style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 20, cursor: "pointer",
                  border: `0.5px solid ${compareEnabled ? TEAL : "var(--border)"}`,
                  background: compareEnabled ? "#e0f0f2" : "var(--muted)",
                  color: compareEnabled ? TEAL : "var(--muted-foreground)",
                }}
              >
                {compareEnabled ? "✕ Remove comparison" : "+ Compare cohort"}
              </button>
              {compareEnabled && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>vs.</span>
                  <select
                    value={compareSliceType === "department" ? `dept:${compareSliceValue}` : compareSliceType === "org_level" ? `level:${compareSliceValue}` : "all"}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === "all") { setCompareSliceType("all"); setCompareSliceValue("all"); }
                      else if (v.startsWith("dept:")) { setCompareSliceType("department"); setCompareSliceValue(v.slice(5)); }
                      else if (v.startsWith("level:")) { setCompareSliceType("org_level"); setCompareSliceValue(v.slice(6)); }
                    }}
                    style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, border: `0.5px solid ${TEAL}`, background: "var(--card)", color: "var(--foreground)", cursor: "pointer" }}
                  >
                    <option value="all">All organization</option>
                    {departments.map(d => <option key={d.id} value={`dept:${d.id}`}>{d.name}</option>)}
                    {["IC", "Manager", "Director", "VP", "C-Suite", "Other"].map(l => <option key={l} value={`level:${l}`}>{l}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {narrativeHistory.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", background: "var(--muted)", borderRadius: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: NAVY, marginBottom: 6 }}>No history yet</p>
              <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Generate your first AI interpretation to start tracking dimension trends over time.</p>
            </div>
          ) : (
            <>
              <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: "#ede9df" }}>
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

              {compareEnabled && compareHistory.length > 0 && (
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                    Dashed = {compareSliceType === "all" ? "All organization" : `${compareSliceType}: ${compareSliceValue}`}
                  </span>
                </div>
              )}

              {narrativeHistory.length > 0 && (() => {
                const primaryChartData = [...narrativeHistory].reverse().map(h => ({
                  date: new Date(h.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  "DIM-NAI-01": h.dimension_scores?.["DIM-NAI-01"]?.avg_score,
                  "DIM-NAI-02": h.dimension_scores?.["DIM-NAI-02"]?.avg_score,
                  "DIM-NAI-03": h.dimension_scores?.["DIM-NAI-03"]?.avg_score,
                  "DIM-NAI-04": h.dimension_scores?.["DIM-NAI-04"]?.avg_score,
                  "DIM-NAI-05": h.dimension_scores?.["DIM-NAI-05"]?.avg_score,
                }));
                const compareChartData = [...compareHistory].reverse().map(h => ({
                  date: new Date(h.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  "CMP-NAI-01": h.dimension_scores?.["DIM-NAI-01"]?.avg_score,
                  "CMP-NAI-02": h.dimension_scores?.["DIM-NAI-02"]?.avg_score,
                  "CMP-NAI-03": h.dimension_scores?.["DIM-NAI-03"]?.avg_score,
                  "CMP-NAI-04": h.dimension_scores?.["DIM-NAI-04"]?.avg_score,
                  "CMP-NAI-05": h.dimension_scores?.["DIM-NAI-05"]?.avg_score,
                }));
                const maxLen = Math.max(primaryChartData.length, compareChartData.length);
                const mergedChartData = Array.from({ length: maxLen }, (_, i) => ({
                  ...(primaryChartData[i] ?? {}),
                  ...(compareChartData[i] ?? {}),
                  date: primaryChartData[i]?.date ?? compareChartData[i]?.date ?? "",
                }));
                return (
                  <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 8px 8px", marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: "var(--muted-foreground)", paddingLeft: 28, marginBottom: 4 }}>Avg score by dimension · lower = more ready</div>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={mergedChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                        <Tooltip
                          contentStyle={{ fontSize: 11, border: "0.5px solid var(--border)", borderRadius: 8 }}
                          formatter={(value: any, name: any) => {
                            const key = typeof name === "string" && name.startsWith("CMP-") ? name.replace("CMP-", "DIM-") : (name as string);
                            const label = DIM_NAMES[key] ?? name;
                            const suffix = typeof name === "string" && name.startsWith("CMP-") ? " (compare)" : "";
                            return [typeof value === "number" ? Math.round(value) : value, `${label}${suffix}`];
                          }}
                        />
                        {DIMS_BY_WEIGHT.map(dimId => (
                          <Line
                            key={dimId}
                            type="monotone"
                            dataKey={dimId}
                            stroke={DIM_COLORS[dimId]}
                            strokeWidth={2}
                            dot={{ r: 3, fill: DIM_COLORS[dimId] }}
                            connectNulls
                          />
                        ))}
                        {compareEnabled && DIMS_BY_WEIGHT.map(dimId => (
                          <Line
                            key={`cmp-${dimId}`}
                            type="monotone"
                            dataKey={dimId.replace("DIM-", "CMP-")}
                            stroke={DIM_COLORS[dimId]}
                            strokeWidth={1.5}
                            strokeDasharray="5 3"
                            strokeOpacity={0.7}
                            dot={{ r: 2, fill: DIM_COLORS[dimId], opacity: 0.7 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}

              <h3 style={{ fontSize: 15, fontWeight: 500, color: NAVY, margin: "20px 0 10px", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
                Prior AI interpretation history
              </h3>
              {narrativeHistory.map((h, i) => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 14 }}>
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
        <div data-export-tab="true">
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 16 }}>
            Cross-instrument analysis requires participants to have completed both NAI and PTP assessments. Patterns between the two instruments reveal whether AI adoption barriers are specific to AI context or rooted in deeper threat-response patterns.
          </p>

          {!suppressed && Object.keys(dims).length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div style={{ background: "#F9F7F1", border: "0.5px solid var(--border)", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: 0.04, marginBottom: 10 }}>
                  NAI · C.A.F.E.S. (by weight)
                </div>
                {DIMS_BY_WEIGHT.map(dimId => {
                  const dim = dims[dimId];
                  if (!dim) return null;
                  const act = activationLabel(dim.avg_score);
                  return (
                    <div key={dimId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7, fontSize: 13 }}>
                      <span style={{ color: DIM_COLORS[dimId], fontWeight: 500 }}>{DIM_NAMES[dimId]}</span>
                      <span>
                        <span style={{ fontWeight: 500, color: DIM_COLORS[dimId], marginRight: 6 }}>{Math.round(dim.avg_score)}</span>
                        <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: act.bg, color: act.color }}>{act.label}</span>
                      </span>
                    </div>
                  );
                })}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "0.5px solid var(--border)", fontSize: 13, fontWeight: 500, color: NAVY }}>
                  AI Readiness Index: {indexScore !== null ? `${indexScore} / 100` : "—"}
                </div>
              </div>

              <div style={{ background: "var(--muted)", border: "0.5px solid var(--border)", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: 0.04, marginBottom: 10 }}>
                  PTP · Threat response
                </div>
                {loadingPtpAgg ? (
                  <div style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
                ) : ptpAggregate?.suppressed ? (
                  <div style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, fontStyle: "italic" }}>
                    Insufficient data (5+ participants required)
                  </div>
                ) : ptpAggregate?.dimensions && Object.keys(ptpAggregate.dimensions).length > 0 ? (
                  <>
                    {ALL_PTP_DIMS.map(dimId => {
                      const dim = ptpAggregate.dimensions![dimId];
                      if (!dim) return null;
                      const act = activationLabel(dim.avg_score);
                      return (
                        <div key={dimId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7, fontSize: 13 }}>
                          <span style={{ color: PTP_DIM_COLORS[dimId], fontWeight: 500 }}>{PTP_DIM_NAMES[dimId]}</span>
                          <span>
                            <span style={{ fontWeight: 500, color: PTP_DIM_COLORS[dimId], marginRight: 6 }}>{Math.round(dim.avg_score)}</span>
                            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: act.bg, color: act.color }}>{act.label}</span>
                          </span>
                        </div>
                      );
                    })}
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "0.5px solid var(--border)", fontSize: 13 }}>
                      <span style={{ color: "var(--muted-foreground)" }}>TRI: </span>
                      <strong style={{ color: NAVY }}>{calcPTPTRI(ptpAggregate.dimensions)}</strong>
                      <span style={{ color: "var(--muted-foreground)", marginLeft: 12 }}>RSI: </span>
                      <strong style={{ color: "#3C096C" }}>{calcPTPRSI(ptpAggregate.dimensions)}</strong>
                      <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted-foreground)" }}>
                        Archetype: <strong style={{ color: NAVY }}>{classifyPTPArchetype(ptpAggregate.dimensions)}</strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>
                    <p style={{ margin: "0 0 8px" }}>PTP aggregate data will appear here once 5+ participants have completed both instruments.</p>
                    <p style={{ margin: 0, fontSize: 10 }}>PTP measures threat response under uncertainty — a complement to NAI's AI-specific adoption readiness score.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ background: "#F9F7F1", border: "0.5px solid var(--border)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: NAVY, marginBottom: 8 }}>Co-elevation patterns</div>
            <p style={{ fontSize: 14, color: "var(--muted-foreground)", margin: "0 0 12px", lineHeight: 1.6 }}>
              Co-elevation occurs when a dimension is simultaneously elevated in both NAI and PTP — for example, high Ego Stability (NAI) paired with high Protection (PTP). These compound patterns are the most operationally significant findings because the barriers reinforce each other and require sequential intervention.
            </p>
            {(() => {
              const haveNai = Object.keys(dims).length > 0;
              const havePtp = !!ptpAggregate?.dimensions && Object.keys(ptpAggregate.dimensions).length > 0 && !ptpAggregate?.suppressed;
              if (!haveNai || !havePtp) {
                return (
                  <div style={{ background: "var(--muted)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                    Co-elevation pattern detection requires PTP aggregate data for this slice. Complete cross-instrument analysis will appear here once participants have completed both assessments.
                  </div>
                );
              }
              const patterns = detectCoElevations(dims, ptpAggregate!.dimensions!);
              if (patterns.length === 0) {
                return (
                  <div style={{ background: "var(--muted)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--muted-foreground)" }}>
                    No co-elevation patterns detected in current data — all cross-instrument dimension pairs are within normal range.
                  </div>
                );
              }
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {patterns.map((p, i) => (
                    <div key={i} style={{ background: "var(--muted)", borderRadius: 8, padding: 12, border: "0.5px solid var(--border)" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 6 }}>{p.label}</div>
                      <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 8, lineHeight: 1.6 }}>{p.description}</div>
                      <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                        <span><span style={{ color: "var(--muted-foreground)" }}>NAI </span><span style={{ color: DIM_COLORS[p.naiDimId], fontWeight: 600 }}>{p.naiDimName} {Math.round(p.naiScore)}</span></span>
                        <span><span style={{ color: "var(--muted-foreground)" }}>PTP </span><span style={{ color: PTP_DIM_COLORS[p.ptpDimId], fontWeight: 600 }}>{p.ptpDimName} {Math.round(p.ptpScore)}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div style={{
            background: SAND,
            border: "0.5px solid var(--border)",
            borderRadius: 12,
            padding: 14,
            marginTop: 14,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: NAVY }}>Recommended next steps · cross-instrument</div>
              {crossInstrumentRow && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isCrossInstrumentStale() && (
                    <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 12, background: "#fef0e7", color: ORANGE, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.4 }}>
                      Outdated
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    Generated {new Date(crossInstrumentRow.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              )}
            </div>

            {loadingCrossInstrument ? (
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, fontStyle: "italic" }}>Loading recommendations…</p>
            ) : !crossInstrumentRow ? (
              <p style={{ fontSize: 14, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.6 }}>
                No cross-instrument recommendations generated yet for this slice. Click "Regenerate AI" — recommendations will be generated as part of the regeneration if both NAI and PTP narratives exist for this slice.
              </p>
            ) : (
              <>
                {isCrossInstrumentStale() && (
                  <div style={{ marginBottom: 10, padding: "8px 12px", background: "#fef0e7", border: `0.5px solid ${ORANGE}`, borderRadius: 8, fontSize: 12, color: NAVY }}>
                    One or more underlying instrument narratives have been regenerated since these recommendations were created. Regenerate to refresh.
                  </div>
                )}
                {crossInstrumentRow.summary && (
                  <p style={{ fontSize: 14, color: "var(--foreground)", margin: "0 0 14px", lineHeight: 1.7, fontWeight: 400 }}>
                    {crossInstrumentRow.summary}
                  </p>
                )}
                {crossInstrumentRow.recommendations.map((rec, i) => (
                  <div key={rec.id ?? i} style={{
                    background: "var(--card)",
                    border: "0.5px solid var(--border)",
                    borderRadius: 8,
                    padding: 14,
                    marginBottom: 10,
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{rec.title}</span>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.4,
                          background: rec.priority === "high" ? "#faece7" : rec.priority === "medium" ? "#faeeda" : "#e1f5ee",
                          color: rec.priority === "high" ? "#993c1d" : rec.priority === "medium" ? "#633806" : "#0f6e56",
                        }}>{rec.priority}</span>
                        <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "#eeedfe", color: "#3C096C", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.4 }}>{rec.time_horizon}</span>
                        {rec.anchor_co_elevation && (
                          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "#e8edf1", color: NAVY, fontWeight: 500 }}>{rec.anchor_co_elevation}</span>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--foreground)", margin: "0 0 10px", lineHeight: 1.65 }}>{rec.rationale}</p>
                    {rec.steps && rec.steps.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 500, color: NAVY, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Steps</div>
                        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                          {rec.steps.map((step, j) => <li key={j} style={{ marginBottom: 3 }}>{step}</li>)}
                        </ol>
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        if (!latestNarrative) {
                          toast.error("Cross-instrument recommendations require an existing NAI dashboard narrative — regenerate first.");
                          return;
                        }
                        try {
                          await (supabase as any).rpc("save_org_intervention", {
                            p_narrative_id: latestNarrative.id,
                            p_epn_delta_narrative_id: null,
                            p_instrument_id: "INST-002",
                            p_title: rec.title,
                            p_description: rec.rationale,
                            p_target_dimensions: [...(rec.primary_targets ?? []), ...(rec.cross_targets ?? [])],
                            p_priority: rec.priority,
                            p_time_horizon: rec.time_horizon,
                            p_intervention_type: "cross_instrument",
                          });
                          toast.success("Saved to intervention tracking");
                        } catch (e: any) {
                          toast.error("Failed to save: " + (e.message ?? "unknown"));
                        }
                      }}
                      style={{
                        fontSize: 10, padding: "3px 9px", border: `0.5px solid ${NAVY}`, borderRadius: 5,
                        background: "transparent", color: NAVY, cursor: "pointer", marginTop: 8,
                      }}
                    >
                      + Add to intervention tracking
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Intervention tracking modal ───────────────────────────────────────── */}
      {exportModal && (
        <div onClick={() => setExportModal(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#ffffff", borderRadius: 12, padding: 24, width: 380, maxWidth: "95vw",
            border: "0.5px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", position: "relative" as const, zIndex: 1001,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 9, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 3 }}>Export dashboard</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: NAVY }}>Select sections to include</div>
              </div>
              <button onClick={() => setExportModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted-foreground)", lineHeight: 1, padding: 0 }}>×</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              {tabs.map(tab => (
                <label key={tab} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "0.5px solid var(--border)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={exportSections[tab]}
                    onChange={e => setExportSections(prev => ({ ...prev, [tab]: e.target.checked }))}
                    style={{ width: 14, height: 14, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 13, color: "var(--foreground)" }}>{tabLabels[tab]}</span>
                  {tab === "interpretation" && !latestNarrative && (
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)", marginLeft: "auto" }}>No data yet</span>
                  )}
                </label>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 14, lineHeight: 1.5 }}>
              All collapsed content (risk flags, dimension cards, methodology) will be automatically expanded in the export. Filename: BrainWise-NAI-CompanyDashboard-YYYY-MM-DD.pdf
            </div>
            <button
              onClick={handleExport}
              disabled={!Object.values(exportSections).some(Boolean)}
              style={{
                background: NAVY, color: "#fff", border: "none", borderRadius: 8,
                padding: "10px 18px", fontSize: 13, cursor: "pointer", width: "100%", fontWeight: 500,
              }}
            >
              Download PDF
            </button>
          </div>
        </div>
      )}

      {trackingModal.open && trackingModal.intervention && (
        <div onClick={closeTrackingModal} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#ffffff", borderRadius: 12, padding: 20, width: 400, maxWidth: "95vw",
            border: "0.5px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", position: "relative" as const, zIndex: 1001,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 9, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 3 }}>Add to intervention tracking</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: NAVY }}>{trackingModal.intervention.title}</div>
              </div>
              <button onClick={closeTrackingModal} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted-foreground)", lineHeight: 1, padding: 0 }}>×</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, display: "block", color: NAVY }}>Status</label>
              <select value={trackingStatus} onChange={e => setTrackingStatus(e.target.value)}
                style={{ width: "100%", fontSize: 12, padding: "6px 9px", border: "0.5px solid var(--border)", borderRadius: 7, background: "var(--card)", color: "var(--foreground)" }}>
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
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
