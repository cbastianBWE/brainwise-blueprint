import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, Download } from "lucide-react";
import {
  generatePTPDashboardPdf,
  type PTPDashboardPdfSections,
} from "@/lib/generatePTPDashboardPdf";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const NAVY = "#021F36";
const ORANGE = "#F5741A";
const TEAL = "#006D77";
const SAND = "#F9F7F1";
const PURPLE = "#3C096C";

const DIM_COLORS: Record<string, string> = {
  "DIM-PTP-01": "#021F36",
  "DIM-PTP-02": "#006D77",
  "DIM-PTP-03": "#6D6875",
  "DIM-PTP-04": "#3C096C",
  "DIM-PTP-05": "#FFB703",
};

const DIM_NAMES: Record<string, string> = {
  "DIM-PTP-01": "Protection",
  "DIM-PTP-02": "Participation",
  "DIM-PTP-03": "Prediction",
  "DIM-PTP-04": "Purpose",
  "DIM-PTP-05": "Pleasure",
};

const THREAT_DIMS = ["DIM-PTP-03", "DIM-PTP-02", "DIM-PTP-01"];
const REWARD_DIMS = ["DIM-PTP-04", "DIM-PTP-05"];
const ALL_DIMS = [...THREAT_DIMS, ...REWARD_DIMS];

const TRI_WEIGHTS: Record<string, number> = {
  "DIM-PTP-01": 0.25,
  "DIM-PTP-02": 0.30,
  "DIM-PTP-03": 0.45,
};

const RSI_WEIGHTS: Record<string, number> = {
  "DIM-PTP-04": 0.60,
  "DIM-PTP-05": 0.40,
};

// ── NAI cross-instrument constants ──────────────────────────────────────────
const NAI_DIM_COLORS: Record<string, string> = {
  "DIM-NAI-01": "#021F36", "DIM-NAI-02": "#F5741A", "DIM-NAI-03": "#006D77",
  "DIM-NAI-04": "#3C096C", "DIM-NAI-05": "#7a5800",
};
const NAI_DIM_NAMES: Record<string, string> = {
  "DIM-NAI-01": "Certainty", "DIM-NAI-02": "Agency", "DIM-NAI-03": "Fairness",
  "DIM-NAI-04": "Ego Stability", "DIM-NAI-05": "Saturation",
};
const NAI_DIM_WEIGHTS: Record<string, number> = {
  "DIM-NAI-03": 0.28, "DIM-NAI-04": 0.25, "DIM-NAI-02": 0.22,
  "DIM-NAI-01": 0.15, "DIM-NAI-05": 0.10,
};
const ALL_NAI_DIMS = ["DIM-NAI-03", "DIM-NAI-04", "DIM-NAI-02", "DIM-NAI-01", "DIM-NAI-05"];

function calcNAIIndex(d: Record<string, any>): number {
  const friction = Object.entries(NAI_DIM_WEIGHTS).reduce((acc, [k, w]) => acc + (d[k]?.avg_score ?? 50) * w, 0);
  return Math.round((100 - friction) * 10) / 10;
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

interface DimAggregate {
  avg_score: number;
  pct_high: number;
  pct_elevated: number;
  pct_low: number;
  pct_at_75_plus: number;
}

interface AggregateResult {
  suppressed: boolean;
  participant_count: number;
  minimum_required?: number;
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
  tri_score: number | null;
  rsi_score: number | null;
  narrative_text: {
    risk_flags?: RiskFlag[];
    archetype_name?: string;
    archetype_description?: string;
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
  tri_score: number | null;
  rsi_score: number | null;
  slice_type: string;
  slice_value: string;
  dimension_scores?: Record<string, { avg_score: number; pct_at_75_plus: number }>;
  narrative_text: {
    risk_flags?: RiskFlag[];
    archetype_name?: string;
    business_meaning?: string;
  };
}

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
  signal_banner: { pct_new: number; show_banner: boolean };
  ai_usage: { chat_used: number; chat_allowance: number; ai_chat_enabled: boolean };
}

interface Department {
  id: string;
  name: string;
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

function calcTRI(dims: Record<string, DimAggregate>): number {
  const weighted = Object.entries(TRI_WEIGHTS).reduce(
    (acc, [d, w]) => acc + (dims[d]?.avg_score ?? 50) * w,
    0,
  );
  return Math.round((100 - weighted) * 10) / 10;
}

function calcRSI(dims: Record<string, DimAggregate>): number {
  const weighted = Object.entries(RSI_WEIGHTS).reduce(
    (acc, [d, w]) => acc + (dims[d]?.avg_score ?? 50) * w,
    0,
  );
  return Math.round(weighted * 10) / 10;
}

function classifyArchetype(
  dims: Record<string, DimAggregate>,
): { name: string; description: string; color: string } {
  const p1 = dims["DIM-PTP-01"]?.avg_score ?? 0;
  const p2 = dims["DIM-PTP-02"]?.avg_score ?? 0;
  const p3 = dims["DIM-PTP-03"]?.avg_score ?? 0;
  const e = (s: number) => s >= 50;
  if ([p1, p2, p3].filter(e).length >= 3) {
    return {
      name: "Broadly Activated",
      description:
        "Three or more threat dimensions elevated — systemic threat reactivity. Highest intervention priority.",
      color: "#a32d2d",
    };
  }
  if (e(p1) && e(p3)) {
    return {
      name: "High Guard",
      description:
        "Protection and Prediction elevated — bracing for threat with low change tolerance.",
      color: "#633806",
    };
  }
  if (e(p2) && e(p1)) {
    return {
      name: "Identity Fragile",
      description:
        "Participation and Protection elevated — political dynamics and low psychological safety.",
      color: "#993c1d",
    };
  }
  if (e(p3)) {
    return {
      name: "Uncertainty Sensitive",
      description:
        "Prediction elevated — change resistance with strong social cohesion.",
      color: TEAL,
    };
  }
  return {
    name: "Low Activation",
    description:
      "Threat dimensions below elevated threshold. Focus on sustaining this baseline.",
    color: "#2D6A4F",
  };
}

function activationLabel(score: number): { label: string; bg: string; color: string } {
  if (score >= 76) return { label: "High", bg: "#faece7", color: "#993c1d" };
  if (score >= 50) return { label: "Elevated", bg: "#faeeda", color: "#633806" };
  return { label: "Low", bg: "#e1f5ee", color: "#0f6e56" };
}

export default function PTPDashboard() {
  const { user } = useAuth();

  const [sliceType, setSliceType] = useState<string>("all");
  const [sliceValue, setSliceValue] = useState<string>("all");
  const [contextType, setContextType] = useState<"both" | "professional" | "personal">("both");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [aggregate, setAggregate] = useState<AggregateResult | null>(null);
  const [naiAggregate, setNaiAggregate] = useState<AggregateResult | null>(null);
  const [loadingNaiAgg, setLoadingNaiAgg] = useState<boolean>(false);
  const [crossInstrumentRow, setCrossInstrumentRow] = useState<CrossInstrumentRow | null>(null);
  const [loadingCrossInstrument, setLoadingCrossInstrument] = useState<boolean>(false);
  const [latestNarrative, setLatestNarrative] = useState<StoredNarrative | null>(null);
  const [loadingUsage, setLoadingUsage] = useState<boolean>(true);
  const [loadingAgg, setLoadingAgg] = useState<boolean>(true);
  const [loadingNarrative, setLoadingNarrative] = useState<boolean>(true);
  const [regenerating, setRegenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [expandedFlags, setExpandedFlags] = useState<Set<string>>(new Set());
  const [expandedDims, setExpandedDims] = useState<Set<string>>(new Set());
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [narrativeHistory, setNarrativeHistory] = useState<NarrativeHistory[]>([]);
  const [compareEnabled, setCompareEnabled] = useState<boolean>(false);
  const [compareSliceType, setCompareSliceType] = useState<string>("all");
  const [compareSliceValue, setCompareSliceValue] = useState<string>("all");
  const [compareHistory, setCompareHistory] = useState<NarrativeHistory[]>([]);
  const [trackingModal, setTrackingModal] = useState<{
    open: boolean;
    intervention: Intervention | null;
  }>({ open: false, intervention: null });
  const [trackingNote, setTrackingNote] = useState<string>("");
  const [trackingStatus, setTrackingStatus] = useState<string>("not_started");
  const [savingTracking, setSavingTracking] = useState<boolean>(false);
  const [exportModal, setExportModal] = useState<boolean>(false);
  const [exportSections, setExportSections] = useState<PTPDashboardPdfSections>({
    overview: true,
    dimensions: true,
    interpretation: true,
    trends: true,
    interventions: true,
    crossInstrument: true,
  });
  const [orgName, setOrgName] = useState<string>("");

  // Load departments on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("departments")
        .select("id, name")
        .order("name");
      setDepartments(((data ?? []) as Array<{ id: string; name: string }>).map((d) => ({
        id: d.id,
        name: d.name,
      })));
    })();
  }, [user]);

  // Load org name on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: userData } = await (supabase as any)
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      if ((userData as any)?.organization_id) {
        const { data: orgData } = await (supabase as any)
          .from("organizations")
          .select("name")
          .eq("id", (userData as any).organization_id)
          .single();
        setOrgName((orgData as any)?.name ?? "");
      }
    })();
  }, [user]);

  const loadInterventions = useCallback(
    async (narrativeId?: string) => {
      if (!user || !narrativeId) return;
      const { data } = await (supabase as any)
        .from("org_interventions")
        .select(
          "id,title,description,target_dimensions,priority,time_horizon,intervention_type",
        )
        .eq("narrative_id", narrativeId)
        .order("created_at", { ascending: true });
      setInterventions((data ?? []) as Intervention[]);
    },
    [user],
  );

  const loadUsage = useCallback(async () => {
    if (!user) return;
    setLoadingUsage(true);
    const { data } = await (supabase as any).rpc("get_org_usage_summary", {
      p_instrument: "INST-001",
    });
    setUsage((data ?? null) as UsageSummary | null);
    setLoadingUsage(false);
  }, [user]);

  const loadAggregate = useCallback(async () => {
    if (!user) return;
    setLoadingAgg(true);
    const { data, error } = await (supabase as any).rpc("get_instrument_aggregate", {
      p_instrument: "INST-001",
      p_slice_type: sliceType,
      p_slice_value: sliceValue,
      p_context_type: contextType,
    });
    if (error) {
      toast.error("Failed to load aggregate data");
      setAggregate(null);
    } else {
      setAggregate((data ?? null) as AggregateResult | null);
    }
    setLoadingAgg(false);
  }, [user, sliceType, sliceValue, contextType]);

  const loadNAIAggregate = useCallback(async () => {
    if (!user) return;
    setLoadingNaiAgg(true);
    const { data } = await (supabase as any).rpc("get_instrument_aggregate", {
      p_instrument: "INST-002",
      p_slice_type: sliceType,
      p_slice_value: sliceValue,
      p_context_type: "both",
    });
    setNaiAggregate((data ?? null) as AggregateResult | null);
    setLoadingNaiAgg(false);
  }, [user, sliceType, sliceValue]);

  const loadCrossInstrumentRecs = useCallback(async () => {
    if (!user) return;
    setLoadingCrossInstrument(true);
    const PRIMARY_ID = "INST-001";
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

  const loadNarrative = useCallback(async () => {
    if (!user) return;
    setLoadingNarrative(true);
    const { data } = await (supabase as any)
      .from("org_dashboard_narratives")
      .select("id,generated_at,participant_count,tri_score,rsi_score,narrative_text")
      .eq("instrument_id", "INST-001")
      .eq("slice_type", sliceType)
      .eq("slice_value", sliceValue)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setLatestNarrative(data as StoredNarrative);
      await loadInterventions((data as StoredNarrative).id);
    } else {
      setLatestNarrative(null);
      setInterventions([]);
    }
    setLoadingNarrative(false);
  }, [user, sliceType, sliceValue, loadInterventions]);

  const loadNarrativeHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("org_dashboard_narratives")
      .select(
        "id,generated_at,participant_count,tri_score,rsi_score,slice_type,slice_value,dimension_scores,narrative_text",
      )
      .eq("instrument_id", "INST-001")
      .eq("slice_type", sliceType)
      .eq("slice_value", sliceValue)
      .order("generated_at", { ascending: false })
      .limit(10);
    setNarrativeHistory((data ?? []) as NarrativeHistory[]);
  }, [user, sliceType, sliceValue]);

  const loadCompareHistory = useCallback(async () => {
    if (!user || !compareEnabled) {
      setCompareHistory([]);
      return;
    }
    const { data } = await (supabase as any)
      .from("org_dashboard_narratives")
      .select(
        "id,generated_at,participant_count,tri_score,rsi_score,slice_type,slice_value,dimension_scores,narrative_text",
      )
      .eq("instrument_id", "INST-001")
      .eq("slice_type", compareSliceType)
      .eq("slice_value", compareSliceValue)
      .order("generated_at", { ascending: false })
      .limit(10);
    setCompareHistory((data ?? []) as NarrativeHistory[]);
  }, [user, compareEnabled, compareSliceType, compareSliceValue]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);
  useEffect(() => {
    loadAggregate();
  }, [loadAggregate]);
  useEffect(() => { loadNAIAggregate(); }, [loadNAIAggregate]);
  useEffect(() => { loadCrossInstrumentRecs(); }, [loadCrossInstrumentRecs]);
  useEffect(() => {
    loadNarrative();
  }, [loadNarrative]);
  useEffect(() => {
    loadNarrativeHistory();
  }, [loadNarrativeHistory]);
  useEffect(() => {
    loadCompareHistory();
  }, [loadCompareHistory]);

  const handleRegenerate = async () => {
    if (!user) return;
    setRegenerating(true);
    const supabaseUrl = "https://svprhtzawnbzmumxnhsq.supabase.co";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      toast.info("Generating dashboard narrative... (~140s)");
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-dashboard-narrative`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ instrument_id: "INST-001", slice_type: sliceType, slice_value: sliceValue }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error ?? "Dashboard generation failed");
      toast.success("Dashboard narrative generated");

      toast.info("Generating cross-instrument recommendations... (~75s)");
      try {
        const xRes = await fetch(`${supabaseUrl}/functions/v1/generate-cross-instrument-recommendations`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ primary_instrument_id: "INST-001", slice_type: sliceType, slice_value: sliceValue }),
        });
        const xResult = await xRes.json();
        if (xRes.ok && xResult.generated) {
          toast.success(`Cross-instrument recommendations generated (${xResult.recommendation_count} items)`);
        } else if (xResult.reason === "other_instrument_narrative_missing") {
          toast.info("Cross-instrument recommendations skipped (NAI narrative not yet generated for this slice).");
        } else {
          toast.warning(`Cross-instrument recommendations not generated: ${xResult.reason ?? xResult.error ?? "unknown"}`);
        }
      } catch (xe: any) {
        toast.warning(`Cross-instrument recommendations failed: ${xe.message ?? "network error"}`);
      }

      await Promise.all([loadUsage(), loadNarrative(), loadNarrativeHistory(), loadCrossInstrumentRecs()]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast.error(msg);
    }
    setRegenerating(false);
  };

  const saveTracking = async () => {
    if (!trackingModal.intervention || !latestNarrative) return;
    setSavingTracking(true);
    try {
      await (supabase as any).rpc("save_org_intervention", {
        p_narrative_id: latestNarrative.id,
        p_instrument_id: "INST-001",
        p_title: trackingModal.intervention.title,
        p_description: trackingNote || trackingModal.intervention.description,
        p_target_dimensions: trackingModal.intervention.target_dimensions,
        p_priority: trackingModal.intervention.priority,
        p_time_horizon: trackingModal.intervention.time_horizon,
        p_intervention_type: trackingModal.intervention.intervention_type,
        p_status: trackingStatus,
      });
      toast.success("Saved to intervention tracking");
      setTrackingModal({ open: false, intervention: null });
      setTrackingNote("");
      setTrackingStatus("not_started");
    } catch {
      toast.error("Failed to save");
    }
    setSavingTracking(false);
  };

  const handleExport = async () => {
    // Belt-and-suspenders: ensure cross-instrument data is loaded even if user
    // hasn't visited the cross-instrument tab or just changed slice
    await Promise.all([loadNAIAggregate(), loadCrossInstrumentRecs()]);
    const sliceLabel =
      sliceType === "all" ? "All organization" : `${sliceType}: ${sliceValue}`;
    const generatedAt = latestNarrative?.generated_at
      ? new Date(latestNarrative.generated_at).toLocaleString()
      : new Date().toLocaleString();

    const dimensionsArr = ALL_DIMS.map((dimId) => {
      const d = dims[dimId];
      return {
        dimId,
        name: DIM_NAMES[dimId],
        avgScore: d?.avg_score ?? 0,
        pctAt75: d?.pct_at_75_plus ?? 0,
        pctHigh: d?.pct_high ?? 0,
        pctElevated: d?.pct_elevated ?? 0,
        pctLow: d?.pct_low ?? 0,
        color: DIM_COLORS[dimId],
      };
    });

    const nt = (latestNarrative?.narrative_text ?? {}) as Record<string, unknown>;
    const asStr = (v: unknown): string | null =>
      typeof v === "string" && v.length > 0 ? v : null;

    const ptpDims = aggregate?.dimensions ?? {};
    const naiDims = naiAggregate?.dimensions;
    const naiDimOrder = ["DIM-NAI-03", "DIM-NAI-04", "DIM-NAI-02", "DIM-NAI-01", "DIM-NAI-05"];
    const naiDimColors: Record<string, string> = {
      "DIM-NAI-01": "#021F36", "DIM-NAI-02": "#F5741A", "DIM-NAI-03": "#006D77",
      "DIM-NAI-04": "#3C096C", "DIM-NAI-05": "#7a5800",
    };
    const naiDimNames: Record<string, string> = {
      "DIM-NAI-01": "Certainty", "DIM-NAI-02": "Agency", "DIM-NAI-03": "Fairness",
      "DIM-NAI-04": "Ego Stability", "DIM-NAI-05": "Saturation",
    };
    const naiDimWeights: Record<string, number> = {
      "DIM-NAI-03": 0.28, "DIM-NAI-04": 0.25, "DIM-NAI-02": 0.22,
      "DIM-NAI-01": 0.15, "DIM-NAI-05": 0.10,
    };

    const naiDimensionsForPdf = naiDims && !naiAggregate?.suppressed
      ? naiDimOrder.map(dimId => ({
          dimId,
          name: naiDimNames[dimId],
          avgScore: naiDims[dimId]?.avg_score ?? 0,
          color: naiDimColors[dimId],
        }))
      : null;

    const naiReadinessIndex = naiDims && !naiAggregate?.suppressed
      ? Math.round((100 - Object.entries(naiDimWeights).reduce((a, [k, w]) => a + (naiDims[k]?.avg_score ?? 50) * w, 0)) * 10) / 10
      : null;

    const coElevationPatternsForPdf = naiDims && !naiAggregate?.suppressed
      ? detectCoElevations(naiDims, ptpDims).map(p => ({
          label: p.label,
          description: p.description,
          naiDimName: p.naiDimName,
          naiScore: p.naiScore,
          ptpDimName: p.ptpDimName,
          ptpScore: p.ptpScore,
          naiColor: NAI_DIM_COLORS[p.naiDimId],
          ptpColor: DIM_COLORS[p.ptpDimId],
        }))
      : null;

    generatePTPDashboardPdf({
      orgName: orgName,
      sliceLabel,
      generatedAt,
      participantCount,
      triScore,
      rsiScore,
      archetypeName: archetype?.name ?? null,
      archetypeDescription: archetype?.description ?? null,
      dimensions: dimensionsArr,
      riskFlags: riskFlags as Array<{
        id: string;
        level: string;
        title: string;
        summary: string;
        detail: string;
      }>,
      businessMeaning: asStr(nt.business_meaning),
      benefits: asStr(nt.benefits),
      risks: asStr(nt.risks),
      nextSteps: asStr(nt.next_steps),
      reassessmentNote: asStr(nt.reassessment_note),
      interventions: interventions.map((iv) => ({
        title: iv.title,
        description: iv.description,
        targetDimensions: iv.target_dimensions,
        priority: iv.priority,
        timeHorizon: iv.time_horizon,
        interventionType: iv.intervention_type,
      })),
      narrativeHistory: narrativeHistory.map((h) => ({
        generated_at: h.generated_at,
        tri_score: h.tri_score,
        rsi_score: h.rsi_score,
        dimension_scores: h.dimension_scores,
        participant_count: h.participant_count,
      })),
      exportSections,
      naiDimensions: naiDimensionsForPdf,
      naiReadinessIndex,
      coElevationPatterns: coElevationPatternsForPdf,
      crossInstrumentRecommendations: crossInstrumentRow ? {
        id: crossInstrumentRow.id,
        primary_narrative_id: crossInstrumentRow.primary_narrative_id,
        recommendations: crossInstrumentRow.recommendations,
        summary: crossInstrumentRow.summary,
        generated_at: crossInstrumentRow.generated_at,
      } : null,
    });
  };


  const priorityBadge = (p: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      high: { bg: "#faece7", color: "#993c1d" },
      medium: { bg: "#faeeda", color: "#633806" },
      low: { bg: "#e1f5ee", color: "#0f6e56" },
    };
    const st = map[p] ?? map.medium;
    return (
      <span
        style={{
          fontSize: 9,
          padding: "2px 6px",
          borderRadius: 3,
          background: st.bg,
          color: st.color,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          fontWeight: 500,
        }}
      >
        {p}
      </span>
    );
  };

  const horizonBadge = (h: string) => (
    <span
      style={{
        fontSize: 9,
        padding: "2px 6px",
        borderRadius: 3,
        background: "#eeedfe",
        color: PURPLE,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        fontWeight: 500,
      }}
    >
      {h}
    </span>
  );

  const typeBadge = (t: string) => (
    <span
      style={{
        fontSize: 9,
        padding: "2px 6px",
        borderRadius: 3,
        background: "#e8edf1",
        color: NAVY,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        fontWeight: 500,
      }}
    >
      {t}
    </span>
  );

  const dims = aggregate?.dimensions ?? {};
  const triScore = Object.keys(dims).length > 0 ? calcTRI(dims) : null;
  const rsiScore = Object.keys(dims).length > 0 ? calcRSI(dims) : null;
  const archetype = Object.keys(dims).length > 0 ? classifyArchetype(dims) : null;
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
      {/* HEADER */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr 1fr",
          gap: 16,
          alignItems: "center",
          marginBottom: 16,
          paddingBottom: 16,
          borderBottom: "0.5px solid var(--border)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "var(--muted-foreground)",
              marginBottom: 4,
            }}
          >
            PTP · Personal Threat Profile Dashboard
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: NAVY, margin: 0 }}>
            PTP Dashboard
          </h1>
        </div>
        <div style={{ textAlign: "center" }}>
          {loadingAgg ? (
            <p style={{ color: "var(--muted-foreground)", margin: 0 }}>—</p>
          ) : suppressed ? (
            <p style={{ color: "var(--muted-foreground)", margin: 0 }}>Insufficient data</p>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 24,
                }}
              >
                <div>
                  <div style={{ fontSize: 28, fontWeight: 600, color: NAVY, lineHeight: 1 }}>
                    {triScore ?? "—"}
                  </div>
                  <div style={{ fontSize: 10, color: NAVY, marginTop: 2, fontWeight: 500 }}>
                    Threat Reactivity Index
                  </div>
                  <div style={{ fontSize: 9, color: "var(--muted-foreground)" }}>
                    higher = less reactive
                  </div>
                </div>
                <div
                  style={{ width: 1, height: 40, background: "var(--border)" }}
                  aria-hidden
                />
                <div>
                  <div style={{ fontSize: 28, fontWeight: 600, color: PURPLE, lineHeight: 1 }}>
                    {rsiScore ?? "—"}
                  </div>
                  <div style={{ fontSize: 10, color: PURPLE, marginTop: 2, fontWeight: 500 }}>
                    Reward Sensitivity Index
                  </div>
                  <div style={{ fontSize: 9, color: "var(--muted-foreground)" }}>
                    higher = stronger motivation
                  </div>
                </div>
              </div>
              {archetype && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 8,
                    padding: "3px 10px",
                    borderRadius: 20,
                    border: `1px solid ${archetype.color}`,
                    background: SAND,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: archetype.color,
                    }}
                  />
                  <span style={{ fontSize: 11, color: archetype.color, fontWeight: 500 }}>
                    {archetype.name}
                  </span>
                </div>
              )}
              <div
                style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 4 }}
              >
                Most Recent Cohort · n={participantCount}
              </div>
            </>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 6 }}
          >
            {sliceType === "all" ? "All organization" : `${sliceType}: ${sliceValue}`}
          </div>
          <div style={{ display: "inline-flex", gap: 8 }}>
            <Button size="sm" variant="outline" onClick={() => setExportModal(true)}>
              <Download style={{ marginRight: 6 }} />
              Export PDF
            </Button>
            <Button size="sm" onClick={handleRegenerate} disabled={regenerating || suppressed}>
              <RefreshCw
                className={regenerating ? "animate-spin" : ""}
                style={{ marginRight: 6 }}
              />
              {regenerating ? "Generating..." : "Regenerate AI"}
            </Button>
          </div>
        </div>
      </div>

      {/* SIGNAL BANNER */}
      {usage?.signal_banner?.show_banner && latestNarrative && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "#fef0e7",
            border: `0.5px solid ${ORANGE}`,
            marginBottom: 12,
            fontSize: 13,
            color: NAVY,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span>
            {Math.round(usage.signal_banner.pct_new)}% of your organization has new PTP data
            since your last AI interpretation.
          </span>
          <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={regenerating}>
            Regenerate to include
          </Button>
        </div>
      )}

      {/* NO NARRATIVE BANNER */}
      {!loadingNarrative && !latestNarrative && !suppressed && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "var(--muted)",
            marginBottom: 12,
            fontSize: 13,
            color: "var(--muted-foreground)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span>No AI interpretation generated yet.</span>
          <Button size="sm" onClick={handleRegenerate} disabled={regenerating}>
            Generate now
          </Button>
        </div>
      )}

      {/* SLICE CONTROLS */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Slice:</span>
        <button
          onClick={() => {
            setSliceType("all");
            setSliceValue("all");
          }}
          style={{
            fontSize: 11,
            padding: "3px 10px",
            borderRadius: 20,
            cursor: "pointer",
            border: `0.5px solid ${sliceType === "all" ? NAVY : "var(--border)"}`,
            background: sliceType === "all" ? "#e8edf1" : "var(--muted)",
            color: sliceType === "all" ? NAVY : "var(--muted-foreground)",
          }}
        >
          All organization
        </button>
        {departments.length > 0 && (
          <select
            value={sliceType === "department" ? sliceValue : "all"}
            onChange={(e) => {
              if (e.target.value !== "all") {
                setSliceType("department");
                setSliceValue(e.target.value);
              } else {
                setSliceType("all");
                setSliceValue("all");
              }
            }}
            style={{
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 20,
              border: "0.5px solid var(--border)",
              background: "var(--card)",
              color: "var(--foreground)",
              cursor: "pointer",
            }}
          >
            <option value="all">Department ▾</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={sliceType === "org_level" ? sliceValue : "all"}
          onChange={(e) => {
            if (e.target.value !== "all") {
              setSliceType("org_level");
              setSliceValue(e.target.value);
            } else {
              setSliceType("all");
              setSliceValue("all");
            }
          }}
          style={{
            fontSize: 11,
            padding: "3px 8px",
            borderRadius: 20,
            border: "0.5px solid var(--border)",
            background: "var(--card)",
            color: "var(--foreground)",
            cursor: "pointer",
          }}
        >
          <option value="all">Level ▾</option>
          {["IC", "Manager", "Director", "VP", "C-Suite", "Other"].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <span
          style={{ fontSize: 10, color: "var(--muted-foreground)", fontStyle: "italic" }}
        >
          min 5 per slice
        </span>
      </div>

      {/* TAB BAR */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "0.5px solid var(--border)",
          marginBottom: 16,
          overflowX: "auto",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              fontSize: 12,
              padding: "8px 14px",
              cursor: "pointer",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === tab ? `2px solid ${ORANGE}` : "2px solid transparent",
              color: activeTab === tab ? NAVY : "var(--muted-foreground)",
              fontWeight: activeTab === tab ? 500 : 400,
              whiteSpace: "nowrap",
              marginBottom: -0.5,
            }}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div>
          {archetype && !suppressed && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 16px",
                background: SAND,
                borderRadius: 8,
                border: "0.5px solid var(--border)",
                borderLeft: `4px solid ${archetype.color}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: archetype.color }}>
                  {archetype.name}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--muted-foreground)",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  Threat Profile Archetype
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--foreground)",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {archetype.description}
              </p>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {[
              {
                label: "Active users",
                value: loadingUsage
                  ? "—"
                  : `${usage?.active_users ?? "—"}/${usage?.seat_count ?? "—"}`,
                sub: loadingUsage
                  ? ""
                  : `${
                      usage
                        ? Math.round((usage.active_users / Math.max(usage.seat_count, 1)) * 100)
                        : 0
                    }% of licensed seats`,
              },
              {
                label: "Completions (30d)",
                value: loadingUsage
                  ? "—"
                  : String(usage?.completions_30d?.["INST-001"] ?? 0),
                sub: "PTP assessments",
              },
              {
                label: "Completion rate",
                value: loadingUsage ? "—" : `${Math.round(usage?.completion_rate?.pct ?? 0)}%`,
                sub: loadingUsage
                  ? ""
                  : `${usage?.completion_rate?.completed ?? 0} of ${
                      usage?.completion_rate?.eligible ?? 0
                    } users`,
              },
              {
                label: "AI chat usage",
                value: loadingUsage
                  ? "—"
                  : `${usage?.ai_usage?.chat_used ?? 0}/${usage?.ai_usage?.chat_allowance ?? 0}`,
                sub: usage?.ai_usage?.ai_chat_enabled
                  ? "messages this month"
                  : "AI chat not enabled",
              },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  padding: 14,
                  background: SAND,
                  border: "0.5px solid var(--border)",
                  borderRadius: 8,
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--muted-foreground)",
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  {card.label}
                </p>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 500,
                    color: NAVY,
                    margin: "4px 0 2px",
                  }}
                >
                  {card.value}
                </p>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
                  {card.sub}
                </p>
              </div>
            ))}
          </div>

          {riskFlags.length > 0 && (
            <>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: NAVY,
                  margin: "0 0 10px",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Risk flags (click to expand)
              </h3>
              {riskFlags.map((flag) => (
                <div
                  key={flag.id}
                  onClick={() =>
                    setExpandedFlags((prev) => {
                      const n = new Set(prev);
                      if (n.has(flag.id)) n.delete(flag.id);
                      else n.add(flag.id);
                      return n;
                    })
                  }
                  style={{
                    borderLeft: `3px solid ${flag.level === "high" ? "#a32d2d" : ORANGE}`,
                    background: SAND,
                    borderRadius: "0 8px 8px 0",
                    padding: "12px 16px",
                    marginBottom: 12,
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color: flag.level === "high" ? "#a32d2d" : ORANGE,
                      fontWeight: 500,
                    }}
                  >
                    {flag.level === "high" ? "High risk" : "Warning"}
                  </span>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: NAVY,
                      margin: "2px 0",
                    }}
                  >
                    {flag.title}
                  </p>
                  <p
                    style={{ fontSize: 14, color: "var(--foreground)", margin: 0 }}
                  >
                    {flag.summary}
                  </p>
                  {expandedFlags.has(flag.id) && (
                    <p
                      style={{
                        fontSize: 14,
                        color: "var(--foreground)",
                        margin: "8px 0 0",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {flag.detail}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
          {!loadingNarrative && riskFlags.length === 0 && latestNarrative && (
            <div
              style={{
                padding: 14,
                background: "var(--muted)",
                borderRadius: 8,
                marginBottom: 24,
                fontSize: 12,
                color: "var(--muted-foreground)",
              }}
            >
              No risk flags identified for this slice.
            </div>
          )}

          {!suppressed && Object.keys(dims).length > 0 && (
            <>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: NAVY,
                  margin: "24px 0 10px",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Leadership compared to workforce
              </h3>
              <div
                style={{
                  padding: 14,
                  background: SAND,
                  border: "0.5px solid var(--border)",
                  borderRadius: 8,
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16 }}>
                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--muted-foreground)",
                        margin: "0 0 8px",
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}
                    >
                      Director · VP · C-Suite
                    </p>
                    {ALL_DIMS.map((dimId) => {
                      const score = dims[dimId]?.avg_score ?? 0;
                      const act = activationLabel(score);
                      return (
                        <div
                          key={dimId}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 32px 56px",
                            alignItems: "center",
                            marginBottom: 8,
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: DIM_COLORS[dimId],
                            }}
                          >
                            {DIM_NAMES[dimId]}
                          </span>
                          <span
                            style={{
                              fontSize: 15,
                              fontWeight: 500,
                              color: DIM_COLORS[dimId],
                              textAlign: "right",
                            }}
                          >
                            {Math.round(score)}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              padding: "2px 5px",
                              borderRadius: 3,
                              background: act.bg,
                              color: act.color,
                              textAlign: "center",
                            }}
                          >
                            {act.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ alignSelf: "center", textAlign: "center" }}>
                    <p
                      style={{
                        fontSize: 10,
                        color: "var(--muted-foreground)",
                        margin: "0 0 6px",
                        textTransform: "uppercase",
                      }}
                    >
                      delta
                    </p>
                    {ALL_DIMS.map((dimId) => (
                      <div
                        key={dimId}
                        style={{
                          fontSize: 13,
                          color: "var(--muted-foreground)",
                          padding: "4px 0",
                        }}
                      >
                        —
                      </div>
                    ))}
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--muted-foreground)",
                        margin: "0 0 8px",
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}
                    >
                      Manager · IC
                    </p>
                    {ALL_DIMS.map((dimId) => {
                      const score = dims[dimId]?.avg_score ?? 0;
                      const act = activationLabel(score);
                      return (
                        <div
                          key={dimId}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 32px 56px",
                            alignItems: "center",
                            marginBottom: 8,
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: DIM_COLORS[dimId],
                            }}
                          >
                            {DIM_NAMES[dimId]}
                          </span>
                          <span
                            style={{
                              fontSize: 15,
                              fontWeight: 500,
                              color: DIM_COLORS[dimId],
                              textAlign: "right",
                            }}
                          >
                            {Math.round(score)}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              padding: "2px 5px",
                              borderRadius: 3,
                              background: act.bg,
                              color: act.color,
                              textAlign: "center",
                            }}
                          >
                            {act.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--muted-foreground)",
                    padding: "8px 14px",
                    borderTop: "0.5px solid var(--border)",
                    background: "var(--muted)",
                    fontStyle: "italic",
                    marginTop: 8,
                  }}
                >
                  Select "Level ▾" above for real delta values.
                </div>
              </div>
            </>
          )}

          {usage?.dept_participation && usage.dept_participation.length > 0 && (
            <>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: NAVY,
                  margin: "24px 0 10px",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Participation by department
              </h3>
              <div
                style={{
                  background: "var(--card)",
                  border: "0.5px solid var(--border)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#ede9df" }}>
                      {["Department", "Completed", "Rate", "Progress"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 12px",
                            textAlign: "left",
                            fontSize: 13,
                            color: "var(--muted-foreground)",
                            textTransform: "uppercase",
                            letterSpacing: 0.4,
                            fontWeight: 500,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...usage.dept_participation]
                      .sort((a, b) => b.pct - a.pct)
                      .map((dept) => (
                        <tr key={dept.department_id} style={{ borderTop: "0.5px solid var(--border)" }}>
                          <td style={{ padding: "8px 12px" }}>{dept.department_name}</td>
                          <td style={{ padding: "8px 12px" }}>
                            {dept.completed}/{dept.eligible}
                          </td>
                          <td style={{ padding: "8px 12px", color: NAVY, fontWeight: 500 }}>
                            {Math.round(dept.pct)}%
                          </td>
                          <td style={{ padding: "8px 12px", width: "40%" }}>
                            <div
                              style={{
                                height: 6,
                                background: "var(--muted)",
                                borderRadius: 3,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${dept.pct}%`,
                                  height: "100%",
                                  background: DIM_COLORS["DIM-PTP-01"],
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div
            style={{
              marginTop: 24,
              padding: 14,
              background: SAND,
              border: "0.5px solid var(--border)",
              borderRadius: 8,
            }}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: NAVY,
                margin: "0 0 6px",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Cross-instrument snapshot
            </h3>
            <p style={{ fontSize: 14, color: "var(--muted-foreground)", margin: 0 }}>
              NAI aggregate data will appear here once 5+ participants have completed both
              instruments.
            </p>
          </div>

          {suppressed && !loadingAgg && (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                background: "var(--muted)",
                borderRadius: 8,
                marginTop: 16,
              }}
            >
              <AlertTriangle style={{ margin: "0 auto 8px", color: ORANGE }} />
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: NAVY,
                  margin: "0 0 4px",
                }}
              >
                Insufficient data for this slice
              </p>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
                A minimum of 5 participants is required.
              </p>
            </div>
          )}
        </div>
      )}

      {/* DIMENSIONS */}
      {activeTab === "dimensions" && (
        <div>
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Context:</span>
            {(["both", "professional", "personal"] as const).map((ctx) => (
              <button
                key={ctx}
                onClick={() => setContextType(ctx)}
                style={{
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 20,
                  cursor: "pointer",
                  border: `0.5px solid ${contextType === ctx ? NAVY : "var(--border)"}`,
                  background: contextType === ctx ? "#e8edf1" : "var(--muted)",
                  color: contextType === ctx ? NAVY : "var(--muted-foreground)",
                  textTransform: "capitalize",
                }}
              >
                {ctx === "both" ? "Both contexts" : ctx}
              </button>
            ))}
            {contextType === "professional" && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                  fontStyle: "italic",
                }}
              >
                Purpose and Pleasure have no professional context items.
              </span>
            )}
          </div>
          <p
            style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 14 }}
          >
            Threat dimensions ordered by TRI weight, then reward dimensions by RSI weight. Click
            any card to expand.
          </p>
          {suppressed ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                background: "var(--muted)",
                borderRadius: 8,
              }}
            >
              Insufficient data.
            </div>
          ) : Object.keys(dims).length === 0 ? (
            <div
              style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)" }}
            >
              Loading...
            </div>
          ) : (
            ALL_DIMS.map((dimId) => {
              const dim = dims[dimId];
              if (!dim) return null;
              const act = activationLabel(dim.avg_score);
              const isExp = expandedDims.has(dimId);
              const isThreat = THREAT_DIMS.includes(dimId);
              const weight = isThreat ? TRI_WEIGHTS[dimId] : RSI_WEIGHTS[dimId];
              const wLabel = isThreat
                ? `TRI Weight ${Math.round((weight ?? 0) * 100)}%`
                : `RSI Weight ${Math.round((weight ?? 0) * 100)}%`;
              const wColor = isThreat ? ORANGE : PURPLE;
              const dimIvs = interventions.filter((iv) =>
                iv.target_dimensions?.includes(dimId),
              );
              return (
                <div
                  key={dimId}
                  onClick={() =>
                    setExpandedDims((prev) => {
                      const n = new Set(prev);
                      if (n.has(dimId)) n.delete(dimId);
                      else n.add(dimId);
                      return n;
                    })
                  }
                  style={{
                    background: SAND,
                    border: `0.5px solid ${isExp ? DIM_COLORS[dimId] : "var(--border)"}`,
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 14,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: DIM_COLORS[dimId],
                        }}
                      />
                      <span
                        style={{ fontSize: 15, fontWeight: 500, color: DIM_COLORS[dimId] }}
                      >
                        {DIM_NAMES[dimId]}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          padding: "1px 6px",
                          borderRadius: 20,
                          background: isThreat ? "#fef0e7" : "#eeedfe",
                          color: wColor,
                          fontWeight: 500,
                        }}
                      >
                        {wLabel}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                        {Math.round(dim.pct_at_75_plus)}% at 75+
                      </span>
                      <span
                        style={{ fontSize: 26, fontWeight: 500, color: DIM_COLORS[dimId] }}
                      >
                        {Math.round(dim.avg_score)}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 5px",
                          borderRadius: 3,
                          background: act.bg,
                          color: act.color,
                        }}
                      >
                        {act.label}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      height: 6,
                      borderRadius: 3,
                      overflow: "hidden",
                      gap: 2,
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        width: `${dim.pct_low}%`,
                        background: "#e1f5ee",
                        borderRadius: 3,
                      }}
                    />
                    <div
                      style={{
                        width: `${dim.pct_elevated}%`,
                        background: "#faeeda",
                        borderRadius: 3,
                      }}
                    />
                    <div
                      style={{
                        width: `${dim.pct_high}%`,
                        background: "#faece7",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: "var(--muted-foreground)",
                      marginBottom: 4,
                    }}
                  >
                    <span>Low {Math.round(dim.pct_low)}%</span>
                    <span>Elevated {Math.round(dim.pct_elevated)}%</span>
                    <span>High {Math.round(dim.pct_high)}%</span>
                  </div>
                  <div style={{ fontSize: 10, color: TEAL, marginTop: 4 }}>
                    {isExp ? "↑ collapse" : "↓ expand"}
                  </div>
                  {isExp && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: "0.5px solid var(--border)",
                      }}
                    >
                      {!latestNarrative ? (
                        <p
                          style={{
                            fontSize: 14,
                            color: "var(--muted-foreground)",
                            fontStyle: "italic",
                          }}
                        >
                          Generate an AI interpretation to see dimension insights.
                        </p>
                      ) : (
                        <>
                          <p
                            style={{
                              fontSize: 14,
                              color: "var(--muted-foreground)",
                              lineHeight: 1.65,
                              marginBottom: 12,
                            }}
                          >
                            {DIM_NAMES[dimId]} is a {isThreat ? "threat" : "reward"} dimension
                            carrying {Math.round((weight ?? 0) * 100)}% of the{" "}
                            {isThreat ? "Threat Reactivity" : "Reward Sensitivity"} Index. Score
                            of {Math.round(dim.avg_score)} — {act.label.toLowerCase()}{" "}
                            activation.
                            {dim.avg_score >= 65
                              ? " Most operationally significant finding in this slice."
                              : dim.avg_score < 40
                              ? " Currently an organizational asset."
                              : ""}
                          </p>
                          {dimIvs.length > 0 ? (
                            <>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: NAVY,
                                  marginBottom: 8,
                                }}
                              >
                                Interventions targeting this dimension
                              </div>
                              {dimIvs.map((iv) => (
                                <div
                                  key={iv.id}
                                  style={{
                                    background: "#ede9df",
                                    borderRadius: 8,
                                    padding: "14px 16px",
                                    marginBottom: 8,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      justifyContent: "space-between",
                                      gap: 8,
                                      marginBottom: 6,
                                    }}
                                  >
                                    <span
                                      style={{ fontSize: 14, fontWeight: 500, color: NAVY }}
                                    >
                                      {iv.title}
                                    </span>
                                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                      {priorityBadge(iv.priority)}
                                      {horizonBadge(iv.time_horizon)}
                                      {typeBadge(iv.intervention_type)}
                                    </div>
                                  </div>
                                  <p
                                    style={{
                                      fontSize: 13,
                                      color: "var(--muted-foreground)",
                                      margin: "0 0 8px",
                                      lineHeight: 1.55,
                                    }}
                                  >
                                    {iv.description}
                                  </p>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTrackingModal({ open: true, intervention: iv });
                                      setTrackingNote("");
                                      setTrackingStatus("not_started");
                                    }}
                                    style={{
                                      fontSize: 10,
                                      padding: "3px 9px",
                                      border: `0.5px solid ${NAVY}`,
                                      borderRadius: 5,
                                      background: "transparent",
                                      color: NAVY,
                                      cursor: "pointer",
                                    }}
                                  >
                                    + Add to intervention tracking
                                  </button>
                                </div>
                              ))}
                            </>
                          ) : (
                            <p
                              style={{
                                fontSize: 13,
                                color: "var(--muted-foreground)",
                                fontStyle: "italic",
                              }}
                            >
                              No interventions target this dimension yet.
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

      {/* AI INTERPRETATION */}
      {activeTab === "interpretation" && (
        <div>
          {!latestNarrative ? (
            <div
              style={{
                padding: 48,
                textAlign: "center",
                background: "var(--muted)",
                borderRadius: 8,
              }}
            >
              <p
                style={{ fontSize: 14, fontWeight: 500, color: NAVY, marginBottom: 6 }}
              >
                No AI interpretation generated yet
              </p>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--muted-foreground)",
                  marginBottom: 16,
                }}
              >
                Generate one to unlock risk flags and structured interventions.
              </p>
              <Button size="sm" onClick={handleRegenerate} disabled={regenerating || suppressed}>
                <RefreshCw
                  className={regenerating ? "animate-spin" : ""}
                  style={{ marginRight: 6 }}
                />
                {regenerating ? "Generating..." : "Generate now"}
              </Button>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                  Generated{" "}
                  {new Date(latestNarrative.generated_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  · {latestNarrative.participant_count} participants
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={regenerating || suppressed}
                >
                  <RefreshCw
                    className={regenerating ? "animate-spin" : ""}
                    style={{ marginRight: 4 }}
                  />
                  {regenerating ? "Generating..." : "↻ Regenerate"}
                </Button>
              </div>
              {latestNarrative.narrative_text?.archetype_name && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: "10px 14px",
                    background: SAND,
                    borderRadius: 8,
                    border: "0.5px solid var(--border)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: NAVY,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Threat Profile: {latestNarrative.narrative_text.archetype_name}
                  </span>
                  {latestNarrative.narrative_text.archetype_description && (
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--muted-foreground)",
                        margin: "4px 0 0",
                      }}
                    >
                      {latestNarrative.narrative_text.archetype_description}
                    </p>
                  )}
                </div>
              )}
              {Object.keys(dims).length > 0 && (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, minmax(0,1fr))",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    {ALL_DIMS.map((dimId) => {
                      const dim = dims[dimId];
                      if (!dim) return null;
                      const act = activationLabel(dim.avg_score);
                      return (
                        <div
                          key={dimId}
                          style={{
                            borderRadius: 8,
                            padding: "10px 8px",
                            textAlign: "center",
                            background: act.bg,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              color: DIM_COLORS[dimId],
                              marginBottom: 3,
                            }}
                          >
                            {DIM_NAMES[dimId]}
                          </div>
                          <div
                            style={{
                              fontSize: 26,
                              fontWeight: 500,
                              color: DIM_COLORS[dimId],
                            }}
                          >
                            {Math.round(dim.avg_score)}
                          </div>
                          <div
                            style={{
                              fontSize: 9,
                              color: DIM_COLORS[dimId],
                              marginTop: 2,
                              opacity: 0.8,
                            }}
                          >
                            {act.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      marginBottom: 16,
                      fontSize: 12,
                      color: "var(--muted-foreground)",
                      justifyContent: "center",
                    }}
                  >
                    <span>
                      TRI:{" "}
                      <strong style={{ color: NAVY }}>
                        {latestNarrative.tri_score?.toFixed(1) ?? triScore ?? "—"}
                      </strong>{" "}
                      · higher = less threat-reactive
                    </span>
                    <span>
                      RSI:{" "}
                      <strong style={{ color: PURPLE }}>
                        {latestNarrative.rsi_score?.toFixed(1) ?? rsiScore ?? "—"}
                      </strong>{" "}
                      · higher = stronger motivation
                    </span>
                  </div>
                </>
              )}
              {[
                { key: "business_meaning", label: "What this means for your organization" },
                { key: "benefits", label: "Potential benefits visible in the data" },
                { key: "risks", label: "Potential risks if unaddressed" },
                { key: "next_steps", label: "Recommended next steps" },
              ].map((section) => {
                const text = latestNarrative.narrative_text[
                  section.key as keyof typeof latestNarrative.narrative_text
                ] as string | undefined;
                if (!text) return null;
                return (
                  <div
                    key={section.key}
                    style={{
                      background: SAND,
                      border: "0.5px solid var(--border)",
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 500,
                        color: NAVY,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 6,
                        borderLeft: `3px solid ${ORANGE}`,
                        paddingLeft: 7,
                      }}
                    >
                      {section.label}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        lineHeight: 1.75,
                        color: "var(--foreground)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {text}
                    </div>
                  </div>
                );
              })}
              {latestNarrative.narrative_text.reassessment_note && (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--muted-foreground)",
                    background: SAND,
                    borderRadius: 8,
                    padding: "10px 12px",
                    marginBottom: 16,
                    lineHeight: 1.6,
                  }}
                >
                  <strong style={{ color: NAVY }}>Reassessment: </strong>
                  {latestNarrative.narrative_text.reassessment_note}
                </div>
              )}
              {interventions.length > 0 && (
                <>
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: NAVY,
                      margin: "24px 0 10px",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Structured interventions
                  </h3>
                  {interventions.map((iv) => (
                    <div
                      key={iv.id}
                      style={{
                        border: "0.5px solid var(--border)",
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 12,
                        background: SAND,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontSize: 15, fontWeight: 500, color: NAVY }}>
                          {iv.title}
                        </span>
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          {priorityBadge(iv.priority)}
                          {horizonBadge(iv.time_horizon)}
                          {typeBadge(iv.intervention_type)}
                        </div>
                      </div>
                      <p
                        style={{
                          fontSize: 14,
                          color: "var(--muted-foreground)",
                          margin: "0 0 6px",
                          lineHeight: 1.6,
                        }}
                      >
                        {iv.description}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ fontSize: 9, color: "var(--muted-foreground)" }}>
                          Targets:{" "}
                          {iv.target_dimensions
                            ?.map((d) => DIM_NAMES[d] ?? d)
                            .join(" · ")}
                        </span>
                        <button
                          onClick={() => {
                            setTrackingModal({ open: true, intervention: iv });
                            setTrackingNote("");
                            setTrackingStatus("not_started");
                          }}
                          style={{
                            fontSize: 10,
                            padding: "3px 9px",
                            border: `0.5px solid ${NAVY}`,
                            borderRadius: 5,
                            background: "transparent",
                            color: NAVY,
                            cursor: "pointer",
                          }}
                        >
                          + Add to intervention tracking
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* TRENDS */}
      {activeTab === "trends" && (
        <div>
          <div
            style={{
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              Showing trend for:{" "}
              <strong>
                {sliceType === "all" ? "All organization" : `${sliceType}: ${sliceValue}`}
              </strong>
            </span>
            <button
              onClick={() => {
                setCompareEnabled((v) => !v);
                if (compareEnabled) setCompareHistory([]);
              }}
              style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 20,
                cursor: "pointer",
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
                  value={
                    compareSliceType === "department"
                      ? `dept:${compareSliceValue}`
                      : compareSliceType === "org_level"
                      ? `level:${compareSliceValue}`
                      : "all"
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "all") {
                      setCompareSliceType("all");
                      setCompareSliceValue("all");
                    } else if (v.startsWith("dept:")) {
                      setCompareSliceType("department");
                      setCompareSliceValue(v.slice(5));
                    } else if (v.startsWith("level:")) {
                      setCompareSliceType("org_level");
                      setCompareSliceValue(v.slice(6));
                    }
                  }}
                  style={{
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 20,
                    border: `0.5px solid ${TEAL}`,
                    background: "var(--card)",
                    color: "var(--foreground)",
                    cursor: "pointer",
                  }}
                >
                  <option value="all">All organization</option>
                  {departments.map((d) => (
                    <option key={d.id} value={`dept:${d.id}`}>
                      {d.name}
                    </option>
                  ))}
                  {["IC", "Manager", "Director", "VP", "C-Suite", "Other"].map((l) => (
                    <option key={l} value={`level:${l}`}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {narrativeHistory.length === 0 ? (
            <div
              style={{
                padding: 48,
                textAlign: "center",
                background: "var(--muted)",
                borderRadius: 8,
              }}
            >
              <p
                style={{ fontSize: 14, fontWeight: 500, color: NAVY, marginBottom: 6 }}
              >
                No history yet
              </p>
              <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>
                Generate your first AI interpretation to start tracking trends.
              </p>
            </div>
          ) : (
            <>
              <div
                style={{
                  background: "var(--card)",
                  border: "0.5px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                  marginBottom: 16,
                }}
              >
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}
                  >
                    <thead>
                      <tr style={{ background: "#ede9df" }}>
                        <th
                          style={{
                            padding: "8px 12px",
                            textAlign: "left",
                            fontSize: 10,
                            color: "var(--muted-foreground)",
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: 0.4,
                          }}
                        >
                          Generated
                        </th>
                        <th
                          style={{
                            padding: "8px 12px",
                            textAlign: "center",
                            fontSize: 10,
                            color: TEAL,
                            fontWeight: 500,
                          }}
                        >
                          TRI
                        </th>
                        <th
                          style={{
                            padding: "8px 12px",
                            textAlign: "center",
                            fontSize: 10,
                            color: PURPLE,
                            fontWeight: 500,
                          }}
                        >
                          RSI
                        </th>
                        {ALL_DIMS.map((dimId) => (
                          <th
                            key={dimId}
                            style={{
                              padding: "8px 12px",
                              textAlign: "center",
                              fontSize: 10,
                              color: DIM_COLORS[dimId],
                              fontWeight: 500,
                            }}
                          >
                            {DIM_NAMES[dimId].slice(0, 4)}
                          </th>
                        ))}
                        <th
                          style={{
                            padding: "8px 12px",
                            textAlign: "center",
                            fontSize: 10,
                            color: "var(--muted-foreground)",
                            fontWeight: 500,
                          }}
                        >
                          n
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {narrativeHistory.map((h, i) => {
                        const ds = h.dimension_scores ?? {};
                        return (
                          <tr
                            key={h.id}
                            style={{
                              borderTop: "0.5px solid var(--border)",
                              background: i === 0 ? "var(--muted)" : "transparent",
                            }}
                          >
                            <td
                              style={{
                                padding: "8px 12px",
                                color: "var(--foreground)",
                                fontWeight: i === 0 ? 500 : 400,
                              }}
                            >
                              {new Date(h.generated_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                              {i === 0 && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    fontSize: 9,
                                    background: TEAL,
                                    color: "#fff",
                                    padding: "1px 5px",
                                    borderRadius: 3,
                                  }}
                                >
                                  Latest
                                </span>
                              )}
                            </td>
                            <td
                              style={{
                                padding: "8px 12px",
                                textAlign: "center",
                                fontWeight: 500,
                                color: TEAL,
                              }}
                            >
                              {h.tri_score?.toFixed(1) ?? "—"}
                            </td>
                            <td
                              style={{
                                padding: "8px 12px",
                                textAlign: "center",
                                fontWeight: 500,
                                color: PURPLE,
                              }}
                            >
                              {h.rsi_score?.toFixed(1) ?? "—"}
                            </td>
                            {ALL_DIMS.map((dimId) => {
                              const s = ds[dimId]?.avg_score;
                              return (
                                <td
                                  key={dimId}
                                  style={{ padding: "8px 12px", textAlign: "center" }}
                                >
                                  {s !== undefined ? (
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 500,
                                        color: DIM_COLORS[dimId],
                                      }}
                                    >
                                      {Math.round(s)}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              );
                            })}
                            <td
                              style={{
                                padding: "8px 12px",
                                textAlign: "center",
                                color: "var(--muted-foreground)",
                              }}
                            >
                              {h.participant_count}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: NAVY,
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  Threat dimensions
                </div>
                <div
                  style={{
                    background: "var(--card)",
                    border: "0.5px solid var(--border)",
                    borderRadius: 12,
                    padding: "16px 8px 8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--muted-foreground)",
                      paddingLeft: 28,
                      marginBottom: 4,
                    }}
                  >
                    Avg score · lower = less threat-reactive
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart
                      data={[...narrativeHistory].reverse().map((h) => ({
                        date: new Date(h.generated_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        }),
                        "DIM-PTP-01": h.dimension_scores?.["DIM-PTP-01"]?.avg_score,
                        "DIM-PTP-02": h.dimension_scores?.["DIM-PTP-02"]?.avg_score,
                        "DIM-PTP-03": h.dimension_scores?.["DIM-PTP-03"]?.avg_score,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={28}
                      />
                      <Tooltip
                        contentStyle={{
                          fontSize: 11,
                          border: "0.5px solid var(--border)",
                          borderRadius: 8,
                        }}
                      />
                      {THREAT_DIMS.map((dimId) => (
                        <Line
                          key={dimId}
                          type="monotone"
                          dataKey={dimId}
                          stroke={DIM_COLORS[dimId]}
                          strokeWidth={2}
                          dot={{ r: 3, fill: DIM_COLORS[dimId] }}
                          connectNulls
                          name={DIM_NAMES[dimId]}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: PURPLE,
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  Reward dimensions
                </div>
                <div
                  style={{
                    background: "var(--card)",
                    border: "0.5px solid var(--border)",
                    borderRadius: 12,
                    padding: "16px 8px 8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--muted-foreground)",
                      paddingLeft: 28,
                      marginBottom: 4,
                    }}
                  >
                    Avg score · higher = stronger motivation
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart
                      data={[...narrativeHistory].reverse().map((h) => ({
                        date: new Date(h.generated_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        }),
                        "DIM-PTP-04": h.dimension_scores?.["DIM-PTP-04"]?.avg_score,
                        "DIM-PTP-05": h.dimension_scores?.["DIM-PTP-05"]?.avg_score,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={28}
                      />
                      <Tooltip
                        contentStyle={{
                          fontSize: 11,
                          border: "0.5px solid var(--border)",
                          borderRadius: 8,
                        }}
                      />
                      {REWARD_DIMS.map((dimId) => (
                        <Line
                          key={dimId}
                          type="monotone"
                          dataKey={dimId}
                          stroke={DIM_COLORS[dimId]}
                          strokeWidth={2}
                          dot={{ r: 3, fill: DIM_COLORS[dimId] }}
                          connectNulls
                          name={DIM_NAMES[dimId]}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {ALL_DIMS.map((dimId) => (
                  <span
                    key={dimId}
                    style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10 }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 3,
                        borderRadius: 2,
                        background: DIM_COLORS[dimId],
                        display: "inline-block",
                      }}
                    />
                    {DIM_NAMES[dimId]}
                  </span>
                ))}
              </div>
              {compareEnabled && compareHistory.length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 11,
                    color: "var(--muted-foreground)",
                    fontStyle: "italic",
                  }}
                >
                  Comparison cohort has {compareHistory.length} historical narrative
                  {compareHistory.length === 1 ? "" : "s"}.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* CROSS-INSTRUMENT */}
      {activeTab === "cross-instrument" && (
        <div>
          <p
            style={{
              fontSize: 14,
              color: "var(--muted-foreground)",
              marginBottom: 16,
            }}
          >
            Cross-instrument analysis requires participants to have completed both PTP and NAI.
            Patterns reveal whether threat reactivity in PTP manifests as AI adoption friction in
            NAI.
          </p>
          {!suppressed && Object.keys(dims).length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  background: SAND,
                  border: "0.5px solid var(--border)",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--muted-foreground)",
                    textTransform: "uppercase",
                    letterSpacing: 0.04,
                    marginBottom: 10,
                  }}
                >
                  PTP · Threat &amp; Reward
                </div>
                {ALL_DIMS.map((dimId) => {
                  const dim = dims[dimId];
                  if (!dim) return null;
                  const act = activationLabel(dim.avg_score);
                  return (
                    <div
                      key={dimId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 7,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: DIM_COLORS[dimId], fontWeight: 500 }}>
                        {DIM_NAMES[dimId]}
                      </span>
                      <span>
                        <span
                          style={{
                            fontWeight: 500,
                            color: DIM_COLORS[dimId],
                            marginRight: 6,
                          }}
                        >
                          {Math.round(dim.avg_score)}
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            padding: "1px 5px",
                            borderRadius: 3,
                            background: act.bg,
                            color: act.color,
                          }}
                        >
                          {act.label}
                        </span>
                      </span>
                    </div>
                  );
                })}
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: "0.5px solid var(--border)",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "var(--muted-foreground)" }}>TRI: </span>
                  <strong style={{ color: NAVY }}>{triScore ?? "—"}</strong>
                  <span style={{ color: "var(--muted-foreground)", marginLeft: 12 }}>
                    RSI:{" "}
                  </span>
                  <strong style={{ color: PURPLE }}>{rsiScore ?? "—"}</strong>
                </div>
              </div>
              <div
                style={{
                  background: "var(--muted)",
                  border: "0.5px solid var(--border)",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--muted-foreground)",
                    textTransform: "uppercase",
                    letterSpacing: 0.04,
                    marginBottom: 10,
                  }}
                >
                  NAI · C.A.F.E.S.
                </div>
                {loadingNaiAgg ? (
                  <div style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
                ) : naiAggregate?.suppressed ? (
                  <div style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, fontStyle: "italic" }}>
                    Insufficient data (5+ participants required)
                  </div>
                ) : naiAggregate?.dimensions && Object.keys(naiAggregate.dimensions).length > 0 ? (
                  <>
                    {ALL_NAI_DIMS.map((dimId) => {
                      const dim = naiAggregate.dimensions![dimId];
                      if (!dim) return null;
                      const act = activationLabel(dim.avg_score);
                      return (
                        <div key={dimId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7, fontSize: 13 }}>
                          <span style={{ color: NAI_DIM_COLORS[dimId], fontWeight: 500 }}>{NAI_DIM_NAMES[dimId]}</span>
                          <span>
                            <span style={{ fontWeight: 500, color: NAI_DIM_COLORS[dimId], marginRight: 6 }}>{Math.round(dim.avg_score)}</span>
                            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: act.bg, color: act.color }}>{act.label}</span>
                          </span>
                        </div>
                      );
                    })}
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "0.5px solid var(--border)", fontSize: 13, fontWeight: 500, color: NAVY }}>
                      AI Readiness Index: {calcNAIIndex(naiAggregate.dimensions)} / 100
                    </div>
                  </>
                ) : (
                  <div style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>
                    <p style={{ margin: "0 0 8px" }}>
                      NAI aggregate data will appear here once 5+ participants have completed both
                      instruments.
                    </p>
                    <p style={{ margin: 0, fontSize: 10 }}>
                      NAI measures AI adoption friction — a complement to PTP's threat response
                      profile.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <div
            style={{
              background: SAND,
              border: "0.5px solid var(--border)",
              borderRadius: 12,
              padding: 14,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 500, color: NAVY, marginBottom: 8 }}>
              Co-elevation patterns
            </div>
            <p
              style={{
                fontSize: 14,
                color: "var(--muted-foreground)",
                margin: "0 0 12px",
                lineHeight: 1.6,
              }}
            >
              Co-elevation occurs when a dimension is simultaneously elevated in both PTP and NAI
              — for example, high Protection (PTP) paired with high Ego Stability (NAI). These
              compound patterns require sequential intervention because the barriers reinforce
              each other.
            </p>
            {(() => {
              const havePtp = Object.keys(dims).length > 0;
              const haveNai = !!naiAggregate?.dimensions && Object.keys(naiAggregate.dimensions).length > 0 && !naiAggregate?.suppressed;
              if (!haveNai || !havePtp) {
                return (
                  <div style={{ background: "var(--muted)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                    Co-elevation pattern detection requires NAI aggregate data for this slice.
                  </div>
                );
              }
              const patterns = detectCoElevations(naiAggregate!.dimensions!, dims);
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
                        <span><span style={{ color: "var(--muted-foreground)" }}>NAI </span><span style={{ color: NAI_DIM_COLORS[p.naiDimId], fontWeight: 600 }}>{p.naiDimName} {Math.round(p.naiScore)}</span></span>
                        <span><span style={{ color: "var(--muted-foreground)" }}>PTP </span><span style={{ color: DIM_COLORS[p.ptpDimId], fontWeight: 600 }}>{p.ptpDimName} {Math.round(p.ptpScore)}</span></span>
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
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* TRACKING MODAL */}
      {trackingModal.open && trackingModal.intervention && (
        <div
          onClick={() => setTrackingModal({ open: false, intervention: null })}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: 12,
              padding: 20,
              width: 400,
              maxWidth: "95vw",
              border: "0.5px solid var(--border)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              zIndex: 1001,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--muted-foreground)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 3,
                  }}
                >
                  Add to intervention tracking
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: NAVY }}>
                  {trackingModal.intervention.title}
                </div>
              </div>
              <button
                onClick={() => setTrackingModal({ open: false, intervention: null })}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: "var(--muted-foreground)",
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  marginBottom: 4,
                  display: "block",
                  color: NAVY,
                }}
              >
                Status
              </label>
              <select
                value={trackingStatus}
                onChange={(e) => setTrackingStatus(e.target.value)}
                style={{
                  width: "100%",
                  fontSize: 12,
                  padding: "6px 9px",
                  border: "0.5px solid var(--border)",
                  borderRadius: 7,
                  background: "var(--card)",
                  color: "var(--foreground)",
                }}
              >
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  marginBottom: 4,
                  display: "block",
                  color: NAVY,
                }}
              >
                Notes
              </label>
              <textarea
                value={trackingNote}
                onChange={(e) => setTrackingNote(e.target.value)}
                placeholder="Add context or next step..."
                style={{
                  width: "100%",
                  fontSize: 12,
                  padding: "7px 9px",
                  border: "0.5px solid var(--border)",
                  borderRadius: 7,
                  background: "var(--card)",
                  color: "var(--foreground)",
                  resize: "vertical",
                  minHeight: 72,
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <button
              onClick={saveTracking}
              disabled={savingTracking}
              style={{
                background: NAVY,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "9px 18px",
                fontSize: 12,
                cursor: "pointer",
                width: "100%",
                fontWeight: 500,
              }}
            >
              {savingTracking ? "Saving..." : "Save to intervention tracking"}
            </button>
          </div>
        </div>
      )}

      {/* EXPORT PDF MODAL */}
      {exportModal && (
        <div
          onClick={() => setExportModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              width: 360,
              maxWidth: "92vw",
              position: "relative",
            }}
          >
            <button
              onClick={() => setExportModal(false)}
              aria-label="Close"
              style={{
                position: "absolute",
                top: 10,
                right: 12,
                background: "transparent",
                border: "none",
                fontSize: 20,
                cursor: "pointer",
                color: "var(--muted-foreground)",
                lineHeight: 1,
              }}
            >
              ×
            </button>
            <h2 style={{ margin: 0, marginBottom: 16, fontSize: 16, color: NAVY, fontWeight: 600 }}>
              Export PTP Dashboard
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {(
                [
                  { key: "overview", label: "Overview" },
                  { key: "dimensions", label: "Dimensions" },
                  { key: "interpretation", label: "AI Interpretation" },
                  { key: "trends", label: "Trends" },
                  { key: "interventions", label: "Interventions" },
                  { key: "crossInstrument", label: "Cross-Instrument" },
                ] as Array<{ key: keyof PTPDashboardPdfSections; label: string }>
              ).map(({ key, label }) => (
                <label
                  key={key}
                  style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={exportSections[key]}
                    onChange={(e) =>
                      setExportSections((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 14 }}>
              All collapsed content will be automatically expanded in the export.
            </div>
            <button
              onClick={() => {
                handleExport();
                setExportModal(false);
              }}
              style={{
                background: NAVY,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 18px",
                fontSize: 13,
                cursor: "pointer",
                width: "100%",
                fontWeight: 500,
              }}
            >
              Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

