import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp } from "lucide-react";

const PTP_DIMENSION_COLORS: Record<string, string> = {
  "DIM-PTP-01": "#021F36",
  "DIM-PTP-02": "#006D77",
  "DIM-PTP-03": "#6D6875",
  "DIM-PTP-04": "#3C096C",
  "DIM-PTP-05": "#2D6A4F",
};

const PTP_DIMENSION_NAMES: Record<string, string> = {
  "DIM-PTP-01": "Protection",
  "DIM-PTP-02": "Participation",
  "DIM-PTP-03": "Prediction",
  "DIM-PTP-04": "Purpose",
  "DIM-PTP-05": "Pleasure",
};

const PTP_DIMENSION_DESCRIPTIONS: Record<string, { high: string; moderate: string; low: string }> = {
  "DIM-PTP-01": {
    high: "Safety and security concerns are a strong driver for you. You are highly attuned to potential risks — physical, emotional, or professional — and tend to respond strongly when these feel threatened.",
    moderate: "Safety and security play a consistent but balanced role in how you navigate your world. You are thoughtful about potential risks without being overwhelmed by them.",
    low: "You have a relatively low sensitivity to safety and security threats. You tend to feel comfortable in uncertain or risky situations that others might find unsettling.",
  },
  "DIM-PTP-02": {
    high: "Social belonging and reputation are powerful motivators for you. Threats to your standing, acceptance, or influence in groups tend to activate your stress responses strongly.",
    moderate: "Social belonging matters to you in a balanced way. You value connection and reputation but can manage situations where these feel uncertain.",
    low: "You have a low sensitivity to social participation threats. You tend not to be strongly affected by concerns about belonging, reputation, or social standing.",
  },
  "DIM-PTP-03": {
    high: "Uncertainty and unpredictability are significant sources of stress for you. You invest considerable energy in anticipating outcomes and maintaining a sense of control over your environment.",
    moderate: "You prefer clarity and predictability but can manage reasonable levels of uncertainty. Ambiguity activates mild stress responses without overwhelming you.",
    low: "You are comfortable with uncertainty and change. Unpredictability tends not to trigger strong stress responses, and you can adapt fluidly to new situations.",
  },
  "DIM-PTP-04": {
    high: "Meaning, values, and purpose are central to your motivation. When your work or relationships feel misaligned with your deeper values, it creates significant internal tension.",
    moderate: "Purpose and meaning are important to you but balanced with practical considerations. You seek alignment between your values and your actions without it dominating everything.",
    low: "You have a low sensitivity to purpose-related threats. Meaning and values alignment is less of a stress trigger for you, and you can function well in varied contexts.",
  },
  "DIM-PTP-05": {
    high: "Enjoyment, stimulation, and pleasure are strong motivators. You respond strongly to situations that feel joyless, monotonous, or that deprive you of experiences you value.",
    moderate: "Pleasure and enjoyment are meaningful to you in a balanced way. You appreciate positive experiences without being strongly destabilized when they are absent.",
    low: "You have a low sensitivity to pleasure-related threats. You can sustain motivation and wellbeing even in situations that lack stimulation or enjoyment.",
  },
};

const PTP_ITEM_FACET_NAMES: Record<number, string> = {
  1: "Physical safety orientation",
  2: "Emotional safety (work)",
  3: "Financial security orientation",
  4: "Short-term loss aversion",
  5: "Status and standing vigilance",
  6: "Personal fairness sensitivity",
  7: "Equality and reciprocity need",
  8: "Resilience and recovery capacity",
  9: "Physical health vigilance",
  10: "Need to be trusted",
  11: "Need to trust others",
  12: "Similarity-based affiliation",
  13: "Group belonging need",
  14: "Need for individual differentiation",
  15: "Contrarian opinion drive",
  16: "Team orientation",
  17: "Self-esteem and self-respect",
  18: "Social comparison drive",
  19: "Recognition need",
  20: "Approval and respect need",
  21: "Power and influence need (work)",
  22: "Status and prestige need (work)",
  23: "Embarrassment avoidance",
  24: "Impostor sensitivity",
  25: "Future certainty need (work)",
  26: "Expectation clarity need (work)",
  27: "Evaluation criteria need",
  28: "Reward predictability need",
  29: "Autonomy and control need (work)",
  30: "Action orientation (work)",
  31: "Information and situational awareness",
  32: "Correctness need",
  33: "Perfectionism",
  34: "Status quo and stability need (work)",
  35: "Sense-making need (work)",
  36: "Consistency need",
  37: "Ambiguity tolerance (work)",
  38: "Surprise aversion (work)",
  39: "Conformity need",
  40: "Doubt tolerance",
  41: "Authenticity need",
  42: "Risk tolerance (work)",
  43: "Curiosity",
  44: "Voice and influence need",
  45: "Flexibility and flow capacity (work)",
  46: "Commitment reliability need (work)",
  47: "Well-being vigilance for close others",
  48: "Emotional safety (social)",
  49: "Financial loss aversion",
  50: "Environmental safety scanning",
  51: "Other-directed fairness sensitivity",
  52: "Animal welfare sensitivity",
  53: "Social equality vigilance",
  54: "Mental health vigilance",
  55: "Emotional health vigilance",
  56: "Spiritual health vigilance",
  57: "Power and influence need (social)",
  58: "Status and prestige need (social)",
  59: "Benevolence drive",
  60: "Future certainty need (social)",
  61: "Expectation clarity need (social)",
  62: "Autonomy and control need (social)",
  63: "Action orientation (social)",
  64: "Status quo and stability need (social)",
  65: "Sense-making need (social)",
  66: "Ambiguity tolerance (social)",
  67: "Surprise aversion (social)",
  68: "Risk tolerance (social)",
  69: "Self-directed independence need",
  70: "Tradition and ritual orientation",
  71: "Harmony and stability need",
  72: "Flexibility and flow capacity (social)",
  73: "Commitment reliability need (social)",
  74: "Mastery and craft orientation",
  75: "Self-development drive",
  76: "Mission and meaning orientation",
  77: "Values alignment (personal)",
  78: "Values alignment (organisational)",
  79: "Artistic and creative expression",
  80: "Spiritual orientation",
  81: "Passionate pursuit orientation",
  82: "Challenge and growth orientation",
  83: "Truth-seeking orientation",
  84: "Happiness pursuit",
  85: "Sensory and sensual gratification",
  86: "Instant gratification orientation",
  87: "Stimulation and excitement need",
  88: "Play orientation",
  89: "Love and attachment need",
};

interface FacetInterpretation {
  name: string;
  positive_self: string[];
  negative_self: string[];
  positive_others: string[];
  negative_others: string[];
}

interface FacetItem {
  item_text: string;
  item_number: number | null;
  value: number;
  dimension_id: string;
  context_type?: string | null;
  facet_name: string;
}

interface DimensionScore {
  mean?: number;
  band?: string;
}

interface OtherAssessment {
  instrument_name: string;
  completed_at: string | null;
  result: { id: string };
}

interface ActionPlanItem {
  title: string;
  rationale: string;
  steps: string[];
  dimension_tags: string[];
}

interface NarrativeSectionsShape {
  profile_overview?: string;
  dimension_highlights?: Record<string, string>;
  cross_assessment?: string;
  action_plan?: ActionPlanItem[];
  personal_summary?: string[];
}

export interface PTPNarrativeSectionsProps {
  assessmentResultId: string;
  assessmentId: string;
  narrative: string | null;
  dimensionScores: [string, DimensionScore][];
  dimensionNameMap: Map<string, string>;
  recommendations: string[];
  permissionLevel?: "full_results" | "score_summary" | null;
  isCoachView?: boolean;
  ptpContextTab?: "professional" | "personal" | "combined" | null;
  otherAssessments?: OtherAssessment[];
}

/* =========================================================================
   Shared data hook
   ========================================================================= */

function usePTPNarrativeData(props: PTPNarrativeSectionsProps) {
  const {
    assessmentResultId,
    assessmentId,
    dimensionScores,
    ptpContextTab,
    otherAssessments = [],
  } = props;

  const [elevatedFacets, setElevatedFacets] = useState<FacetItem[]>([]);
  const [suppressedFacets, setSuppressedFacets] = useState<FacetItem[]>([]);
  const [facetInterpretations, setFacetInterpretations] = useState<FacetInterpretation[]>([]);
  const [loadingFacets, setLoadingFacets] = useState(true);
  const [loadingInterpretations, setLoadingInterpretations] = useState(false);
  const [expandedFacets, setExpandedFacets] = useState<Set<string>>(new Set());
  const [narrativeSections, setNarrativeSections] = useState<NarrativeSectionsShape | null>(null);
  const [loadingNarrativeSections, setLoadingNarrativeSections] = useState(false);
  const [responsesExpanded, setResponsesExpanded] = useState(false);
  const [assessmentResponses, setAssessmentResponses] = useState<{
    itemNumber: number;
    facetName: string;
    itemText: string;
    score: number;
    dimensionId: string;
  }[]>([]);

  useEffect(() => {
    const fetchResponses = async () => {
      const { data: responses } = await supabase
        .from("assessment_responses")
        .select("response_value_numeric, is_reverse_scored, item_id")
        .eq("assessment_id", assessmentId);

      if (!responses?.length) return;

      const itemIds = responses.map((r) => r.item_id);
      const { data: items } = await supabase
        .from("items")
        .select("item_id, item_text, item_number, dimension_id, context_type")
        .in("item_id", itemIds);

      const itemMap = new Map((items ?? []).map((i) => [i.item_id, i]));

      let scored = responses.map((r) => {
        const item = itemMap.get(r.item_id);
        const raw = Number(r.response_value_numeric);
        const value = r.is_reverse_scored ? 100 - raw : raw;
        return {
          itemNumber: item?.item_number ?? 0,
          facetName:
            PTP_ITEM_FACET_NAMES[item?.item_number ?? 0] ??
            item?.item_text?.slice(0, 40) ??
            "",
          itemText: item?.item_text ?? "",
          score: Math.round(value),
          dimensionId: item?.dimension_id ?? "",
          contextType: item?.context_type ?? null,
        };
      });

      if (ptpContextTab === "professional" || ptpContextTab === "personal") {
        scored = scored.filter((s) => s.contextType === ptpContextTab);
      }

      scored.sort((a, b) => a.itemNumber - b.itemNumber);
      setAssessmentResponses(scored);
    };

    fetchResponses();
  }, [assessmentId, ptpContextTab]);

  useEffect(() => {
    const fetchNarrativeSections = async () => {
      if (!ptpContextTab) return;

      setLoadingNarrativeSections(true);
      setNarrativeSections(null);

      const ctx = ptpContextTab;

      const requiredCacheTypes = [
        `profile_overview_${ctx}`,
        `personal_summary_${ctx}`,
        `dimension_highlights_${ctx}`,
        `cross_and_action_${ctx}`,
      ];
      const { data: cachedRows } = await supabase
        .from("facet_interpretations")
        .select("section_type")
        .eq("assessment_result_id", assessmentResultId)
        .in("section_type", requiredCacheTypes);
      const cachedTypeSet = new Set((cachedRows ?? []).map((r) => r.section_type));
      const allCached = requiredCacheTypes.every((t) => cachedTypeSet.has(t));

      if (!allCached) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const authHeaders = { Authorization: `Bearer ${session?.access_token}` };

        const calls = [
          { generate_context_narrative: true, narrative_context: ctx },
          { generate_dimension_highlights: true, narrative_context: ctx },
          { generate_cross_and_action: true, narrative_context: ctx },
        ];

        for (const extra of calls) {
          const { error } = await supabase.functions.invoke("generate-facet-interpretations", {
            body: { assessment_result_id: assessmentResultId, ...extra },
            headers: authHeaders,
          });
          if (error) {
            setLoadingNarrativeSections(false);
            return;
          }
        }
      }


      const sectionTypes = [
        `profile_overview_${ctx}`,
        `personal_summary_${ctx}`,
        `dimension_highlights_${ctx}`,
        `cross_and_action_${ctx}`,
      ];

      const { data: rows } = await supabase
        .from("facet_interpretations")
        .select("section_type, facet_data")
        .eq("assessment_result_id", assessmentResultId)
        .in("section_type", sectionTypes);

      const byType = new Map<string, any>(
        (rows ?? []).map((r) => [r.section_type as string, r.facet_data as any]),
      );

      const profileOverview = byType.get(`profile_overview_${ctx}`);
      const personalSummary = byType.get(`personal_summary_${ctx}`);
      const dimensionHighlights = byType.get(`dimension_highlights_${ctx}`);
      const crossAndAction = byType.get(`cross_and_action_${ctx}`);

      const assembled: NarrativeSectionsShape = {
        profile_overview: profileOverview?.text,
        personal_summary: personalSummary?.personal_summary,
        dimension_highlights: dimensionHighlights as Record<string, string> | undefined,
        cross_assessment: crossAndAction?.cross_assessment,
        action_plan: crossAndAction?.action_plan,
      };

      setNarrativeSections(assembled);
      setLoadingNarrativeSections(false);
    };

    fetchNarrativeSections();
  }, [assessmentResultId, ptpContextTab]);

  useEffect(() => {
    const fetchFacets = async () => {
      setLoadingFacets(true);
      setElevatedFacets([]);
      setSuppressedFacets([]);

      if (!ptpContextTab) {
        setLoadingFacets(false);
        return;
      }
      const ctx = ptpContextTab;

      const { data: drivingRow } = await supabase
        .from("facet_interpretations")
        .select("facet_data")
        .eq("assessment_result_id", assessmentResultId)
        .eq("section_type", `driving_facets_${ctx}`)
        .maybeSingle();

      const drivingData = drivingRow?.facet_data as
        | {
            elevated?: Array<{ value: number; facet_name: string; item_number: number; dimension_id: string }>;
            suppressed?: Array<{ value: number; facet_name: string; item_number: number; dimension_id: string }>;
          }
        | undefined;

      const toFacetItem = (f: {
        value: number;
        facet_name: string;
        item_number: number;
        dimension_id: string;
      }): FacetItem => ({
        item_text: "",
        item_number: f.item_number,
        dimension_id: f.dimension_id,
        context_type: ctx,
        value: f.value,
        facet_name: f.facet_name,
      });

      let elevated: FacetItem[];
      let suppressed: FacetItem[];

      if (drivingData?.elevated || drivingData?.suppressed) {
        // Canonical path: the driving_facets_${ctx} row exists, read it.
        elevated = (drivingData.elevated ?? []).slice(0, 10).map(toFacetItem);
        suppressed = (drivingData.suppressed ?? []).slice(0, 10).map(toFacetItem);
      } else {
        // Fallback: no driving_facets_${ctx} row (older assessments predate the
        // generate_driving_facets path). Recompute elevated/suppressed from raw
        // responses, same population mean/stdDev calculation the backend uses.
        const { data: responses } = await supabase
          .from("assessment_responses")
          .select("response_value_numeric, is_reverse_scored, item_id")
          .eq("assessment_id", assessmentId);

        if (!responses?.length) {
          setLoadingFacets(false);
          return;
        }

        const itemIds = responses.map((r) => r.item_id);
        const { data: items } = await supabase
          .from("items")
          .select("item_id, item_number, dimension_id, facet_name, context_type")
          .in("item_id", itemIds);
        const itemMap = new Map((items ?? []).map((i) => [i.item_id, i]));

        let scored = responses.map((r) => {
          const item = itemMap.get(r.item_id);
          const raw = Number(r.response_value_numeric);
          const value = r.is_reverse_scored ? 100 - raw : raw;
          return {
            value,
            facet_name: item?.facet_name ?? "",
            item_number: item?.item_number ?? 0,
            dimension_id: item?.dimension_id ?? "",
            context_type: item?.context_type ?? null,
          };
        });

        if (ctx === "professional" || ctx === "personal") {
          scored = scored.filter((s) => s.context_type === ctx);
        }

        if (scored.length === 0) {
          setElevatedFacets([]);
          setSuppressedFacets([]);
          setLoadingFacets(false);
          return;
        }

        const values = scored.map((s) => s.value);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(
          values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length,
        );

        elevated = scored
          .filter((s) => s.value > mean + stdDev)
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)
          .map(toFacetItem);
        suppressed = scored
          .filter((s) => s.value < mean - stdDev)
          .sort((a, b) => a.value - b.value)
          .slice(0, 10)
          .map(toFacetItem);
      }

      setElevatedFacets(elevated);
      setSuppressedFacets(suppressed);
      setLoadingFacets(false);

      if (elevated.length > 0 || suppressed.length > 0) {
        setLoadingInterpretations(true);
        const { data: existing } = await supabase
          .from("facet_interpretations")
          .select("facet_data")
          .eq("assessment_result_id", assessmentResultId)
          .eq("section_type", `facet_insights_${ctx}`)
          .maybeSingle();

        if (existing?.facet_data) {
          setFacetInterpretations(existing.facet_data as unknown as FacetInterpretation[]);
          setLoadingInterpretations(false);
          return;
        }

        const allFacets = [
          ...elevated.map((f) => ({
            name: f.facet_name,
            score: Math.round(f.value),
            question: "",
            type: "elevated",
          })),
          ...suppressed.map((f) => ({
            name: f.facet_name,
            score: Math.round(f.value),
            question: "",
            type: "suppressed",
          })),
        ];

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke("generate-facet-interpretations", {
          body: {
            assessment_result_id: assessmentResultId,
            facets: allFacets,
            narrative_context: ctx,
          },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });

        if (!error && data?.facet_data) {
          setFacetInterpretations(data.facet_data as FacetInterpretation[]);
        }
        setLoadingInterpretations(false);
      }
    };
    fetchFacets();
  }, [assessmentId, assessmentResultId, ptpContextTab]);

  return {
    narrativeSections,
    loadingNarrativeSections,
    elevatedFacets,
    suppressedFacets,
    facetInterpretations,
    loadingFacets,
    loadingInterpretations,
    assessmentResponses,
    expandedFacets,
    setExpandedFacets,
    responsesExpanded,
    setResponsesExpanded,
  };
}

/* =========================================================================
   Shared-hook context — single usePTPNarrativeData instance per report
   =========================================================================
   Before this, each of the six PTP section components called
   usePTPNarrativeData independently, so one report open ran the hook six
   times in parallel — ~24 concurrent generate-facet-interpretations invokes,
   which overloaded the API (500/503 bursts, partial renders). The provider
   calls the hook ONCE; every section reads the shared result via context. */

type PTPNarrativeData = ReturnType<typeof usePTPNarrativeData>;

const PTPNarrativeContext = createContext<PTPNarrativeData | null>(null);

export function PTPNarrativeProvider({
  children,
  ...props
}: PTPNarrativeSectionsProps & { children: React.ReactNode }) {
  const data = usePTPNarrativeContext();
  return (
    <PTPNarrativeContext.Provider value={data}>
      {children}
    </PTPNarrativeContext.Provider>
  );
}

function usePTPNarrativeContext(): PTPNarrativeData {
  const ctx = useContext(PTPNarrativeContext);
  if (!ctx) {
    throw new Error(
      "PTP narrative section components must be rendered inside <PTPNarrativeProvider>",
    );
  }
  return ctx;
}

/* =========================================================================
   Shared style helpers
   ========================================================================= */

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

function DimensionPill({ dimId, dimensionNameMap }: { dimId: string; dimensionNameMap?: Map<string, string> }) {
  const color = PTP_DIMENSION_COLORS[dimId] ?? "#021F36";
  const dimName = dimensionNameMap?.get(dimId) ?? PTP_DIMENSION_NAMES[dimId] ?? dimId;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: "var(--r-pill)",
        fontFamily: "var(--font-primary)",
        fontSize: 11,
        fontWeight: 600,
        background: `${color}20`,
        color,
        marginRight: 6,
        marginBottom: 4,
      }}
    >
      {dimName}
    </span>
  );
}

function isCoachLimited(props: PTPNarrativeSectionsProps) {
  return props.isCoachView && props.permissionLevel === "score_summary";
}

function CoachLimitedNotice() {
  return (
    <div
      style={{
        ...cardSurface,
        background: "var(--bw-white)",
      }}
    >
      <p style={{ fontSize: 14, color: "var(--fg-2)", margin: 0 }}>
        The client has limited coach access to scores only.
      </p>
    </div>
  );
}

/* =========================================================================
   Named-export sections
   ========================================================================= */

export function PTPProfileOverviewSection(props: PTPNarrativeSectionsProps) {
  const data = usePTPNarrativeContext();
  if (isCoachLimited(props)) return <CoachLimitedNotice />;

  const { narrativeSections, loadingNarrativeSections } = data;
  const { dimensionScores, dimensionNameMap, ptpContextTab } = props;

  const sortedDims = [...dimensionScores].sort((a, b) => (b[1].mean ?? 0) - (a[1].mean ?? 0));
  const highestDim = sortedDims[0];
  const lowestDim = sortedDims[sortedDims.length - 1];
  const contextLabel =
    ptpContextTab === "professional" ? "professional" : ptpContextTab === "personal" ? "personal" : "overall";
  const scores = dimensionScores.map(([, s]) => s.mean ?? 0);
  const scoreRange = scores.length > 0 ? Math.max(...scores) - Math.min(...scores) : 0;
  const profilePattern =
    scoreRange < 8
      ? "Your scores cluster closely together across all five dimensions, suggesting a broadly distributed threat sensitivity rather than one dominant area."
      : "Your scores show meaningful variation across dimensions, suggesting some areas activate your threat responses more readily than others.";

  const profileOverviewText =
    dimensionScores.length > 0
      ? `Your ${contextLabel} Personal Threat Profile shows ${dimensionScores.length} dimensions assessed. ${profilePattern} Your highest sensitivity in this context is ${dimensionNameMap.get(highestDim?.[0] ?? "") ?? highestDim?.[0] ?? "—"} (${Math.round(highestDim?.[1]?.mean ?? 0)}), while ${dimensionNameMap.get(lowestDim?.[0] ?? "") ?? lowestDim?.[0] ?? "—"} (${Math.round(lowestDim?.[1]?.mean ?? 0)}) shows the lowest activation.`
      : null;

  const actionPlan = narrativeSections?.action_plan ?? [];
  const personalSummary = narrativeSections?.personal_summary ?? [];

  return (
    <div className="space-y-8">
      {/* Profile overview */}
      <div>
        <h3 style={sectionHeadingStyle}>Profile overview</h3>
        {loadingNarrativeSections ? (
          <p style={{ fontSize: 14, color: "var(--fg-3)", margin: 0 }}>Generating profile overview...</p>
        ) : narrativeSections?.profile_overview ? (
          <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6, margin: 0 }}>
            {narrativeSections.profile_overview}
          </p>
        ) : profileOverviewText ? (
          <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6, margin: 0 }}>{profileOverviewText}</p>
        ) : null}
      </div>

      {/* What does this mean to me? */}
      {(personalSummary.length > 0 || loadingNarrativeSections) && (
        <div>
          <h3 style={sectionHeadingStyle}>What does this mean to me?</h3>
          {personalSummary.length === 0 && loadingNarrativeSections ? (
            <p style={{ fontSize: 13, color: "var(--fg-3)", margin: 0 }}>Generating summary...</p>
          ) : (
            <div style={cardSurface}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
                {personalSummary.map((bullet, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div
                      style={{
                        flexShrink: 0,
                        width: 24,
                        height: 24,
                        borderRadius: "var(--r-circle)",
                        background: "var(--bw-navy)",
                        color: "var(--bw-white)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {i + 1}
                    </div>
                    <p style={{ fontSize: 14, color: "var(--fg-1)", lineHeight: 1.55, margin: 0 }}>{bullet}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Plan */}
      {(actionPlan.length > 0 || loadingNarrativeSections) && (
        <div>
          <h3 style={sectionHeadingStyle}>Action Plan</h3>
          <p style={subtitleStyle}>Three concrete things to focus on next.</p>
          {actionPlan.length === 0 && loadingNarrativeSections ? (
            <p style={{ fontSize: 13, color: "var(--fg-3)", margin: 0 }}>Generating action plan...</p>
          ) : (
            <div className="space-y-3">
              {actionPlan.map((item, i) => (
                <div key={i} style={cardSurface}>
                  <div style={{ marginBottom: 8 }}>
                    {(item.dimension_tags ?? []).map((tag) => (
                      <DimensionPill key={tag} dimId={tag} dimensionNameMap={dimensionNameMap} />
                    ))}
                  </div>
                  <h4
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--fg-1)",
                      margin: 0,
                      marginBottom: 6,
                    }}
                  >
                    {item.title}
                  </h4>
                  {item.rationale && (
                    <p style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.55, margin: 0, marginBottom: 10 }}>
                      {item.rationale}
                    </p>
                  )}
                  {item.steps?.length > 0 && (
                    <ol
                      style={{
                        fontSize: 13,
                        color: "var(--fg-1)",
                        lineHeight: 1.6,
                        margin: 0,
                        paddingLeft: 20,
                      }}
                    >
                      {item.steps.map((step, j) => (
                        <li key={j} style={{ marginBottom: 4 }}>{step}</li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PTPDimensionHighlightsSection(props: PTPNarrativeSectionsProps) {
  const data = usePTPNarrativeContext();
  if (isCoachLimited(props)) return null;
  const { narrativeSections, loadingNarrativeSections } = data;
  const { dimensionScores, dimensionNameMap } = props;

  if (dimensionScores.length === 0) return null;
  const sortedDims = [...dimensionScores].sort((a, b) => (b[1].mean ?? 0) - (a[1].mean ?? 0));

  const getDimDescriptor = (dimId: string, mean: number) => {
    const desc = PTP_DIMENSION_DESCRIPTIONS[dimId];
    if (!desc) return null;
    if (mean >= 65) return desc.high;
    if (mean >= 40) return desc.moderate;
    return desc.low;
  };

  return (
    <div>
      <h3 style={sectionHeadingStyle}>Dimension highlights</h3>
      {loadingNarrativeSections ? (
        <p style={{ fontSize: 14, color: "var(--fg-3)", margin: 0 }}>Generating dimension highlights...</p>
      ) : (
        <div className="space-y-3">
          {sortedDims.map(([dimId, score]) => {
            const color = PTP_DIMENSION_COLORS[dimId] ?? "#021F36";
            const name = dimensionNameMap.get(dimId) ?? dimId;
            const mean = Math.round(score.mean ?? 0);
            const aiDescription = narrativeSections?.dimension_highlights?.[dimId];
            const fallbackDescription = getDimDescriptor(dimId, mean);
            return (
              <div
                key={dimId}
                style={{
                  background: "var(--bw-white)",
                  border: "1px solid var(--border-1)",
                  borderLeft: `4px solid ${color}`,
                  boxShadow: "var(--shadow-sm)",
                  borderRadius: "var(--r-md)",
                  padding: "var(--s-4)",
                }}
              >
                <h4
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--fg-1)",
                    margin: 0,
                    marginBottom: 4,
                  }}
                >
                  {name} — {mean}
                </h4>
                {(aiDescription || fallbackDescription) && (
                  <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.55, margin: 0 }}>
                    {aiDescription || fallbackDescription}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FacetList({
  facets,
  prefix,
  data,
}: {
  facets: FacetItem[];
  prefix: string;
  data: ReturnType<typeof usePTPNarrativeData>;
}) {
  const { expandedFacets, setExpandedFacets, facetInterpretations, loadingInterpretations } = data;

  const toggleFacet = (key: string) => {
    setExpandedFacets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getFacetInterpretation = (facetName: string) =>
    facetInterpretations.find((f) => f.name === facetName);

  return (
    <div className="space-y-2">
      {facets.map((facet, idx) => {
        const facetName = facet.facet_name;
        const key = `${prefix}-${idx}`;
        const isExpanded = expandedFacets.has(key);
        const interpretation = getFacetInterpretation(facetName);
        const color = PTP_DIMENSION_COLORS[facet.dimension_id] ?? "#021F36";
        const score = Math.round(facet.value);
        return (
          <div
            key={key}
            style={{
              background: "var(--bw-white)",
              border: "1px solid var(--border-1)",
              boxShadow: "var(--shadow-xs)",
              borderRadius: "var(--r-md)",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => toggleFacet(key)}
              className="w-full text-left flex items-start gap-3 transition-colors hover:bg-muted/30"
              style={{ padding: 16 }}
            >
              <div
                className="shrink-0 mt-0.5"
                style={{ width: 8, height: 32, borderRadius: 2, backgroundColor: color }}
              />
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--fg-1)" }}>{facetName}</div>
              </div>
              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#fff",
                  backgroundColor: color,
                  flexShrink: 0,
                }}
              >
                {score}
              </span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 shrink-0 mt-1" style={{ color: "var(--fg-3)" }} />
              ) : (
                <ChevronDown className="w-4 h-4 shrink-0 mt-1" style={{ color: "var(--fg-3)" }} />
              )}
            </button>
            {isExpanded && (
              <div style={{ padding: 16, borderTop: "1px solid var(--border-1)", background: "var(--bw-white)" }}>
                {loadingInterpretations || !interpretation ? (
                  <p style={{ fontSize: 14, color: "var(--fg-3)", margin: 0 }}>Generating insights...</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: "var(--fg-1)" }}>Impact on self</h5>
                      <ul className="space-y-1.5">
                        {interpretation.positive_self.map((item, i) => (
                          <li key={`ps-${i}`} className="flex gap-2" style={{ fontSize: 14, color: "var(--fg-2)" }}>
                            <span style={{ color: "var(--bw-forest)", flexShrink: 0 }}>✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                        {interpretation.negative_self.map((item, i) => (
                          <li key={`ns-${i}`} className="flex gap-2" style={{ fontSize: 14, color: "var(--fg-2)" }}>
                            <span className="text-destructive shrink-0">✗</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: "var(--fg-1)" }}>Impact on others</h5>
                      <ul className="space-y-1.5">
                        {interpretation.positive_others.map((item, i) => (
                          <li key={`po-${i}`} className="flex gap-2" style={{ fontSize: 14, color: "var(--fg-2)" }}>
                            <span style={{ color: "var(--bw-forest)", flexShrink: 0 }}>✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                        {interpretation.negative_others.map((item, i) => (
                          <li key={`no-${i}`} className="flex gap-2" style={{ fontSize: 14, color: "var(--fg-2)" }}>
                            <span className="text-destructive shrink-0">✗</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PTPFacetInsightsElevatedSection(props: PTPNarrativeSectionsProps) {
  const data = usePTPNarrativeContext();
  if (isCoachLimited(props)) return null;
  if (data.loadingFacets || data.elevatedFacets.length === 0) return null;
  return (
    <div>
      <h3 style={sectionHeadingStyle}>Driving facet insights — elevated</h3>
      <FacetList facets={data.elevatedFacets} prefix="elevated" data={data} />
    </div>
  );
}

export function PTPFacetInsightsSuppressedSection(props: PTPNarrativeSectionsProps) {
  const data = usePTPNarrativeContext();
  if (isCoachLimited(props)) return null;
  if (data.loadingFacets || data.suppressedFacets.length === 0) return null;
  return (
    <div>
      <h3 style={sectionHeadingStyle}>Driving facet insights — suppressed</h3>
      <FacetList facets={data.suppressedFacets} prefix="suppressed" data={data} />
    </div>
  );
}

export function PTPCrossAssessmentSection(props: PTPNarrativeSectionsProps) {
  const data = usePTPNarrativeContext();
  if (isCoachLimited(props)) return null;
  const { otherAssessments = [] } = props;
  if (otherAssessments.length === 0) return null;
  const { narrativeSections, loadingNarrativeSections } = data;

  return (
    <div>
      <h3 style={sectionHeadingStyle}>Cross-assessment connections</h3>
      <div
        style={{
          background: "var(--bw-white)",
          border: "1px solid var(--border-1)",
          borderRadius: "var(--r-md)",
          padding: "var(--s-5)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {loadingNarrativeSections ? (
          <p style={{ fontSize: 14, color: "var(--fg-3)", margin: 0, marginBottom: 12 }}>
            Generating cross-assessment analysis...
          </p>
        ) : narrativeSections?.cross_assessment ? (
          <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.55, margin: 0, marginBottom: 12 }}>
            {narrativeSections.cross_assessment}
          </p>
        ) : (
          <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.55, margin: 0, marginBottom: 12 }}>
            You have completed {otherAssessments.length} other assessment
            {otherAssessments.length > 1 ? "s" : ""} alongside your PTP. Patterns across these
            instruments can reveal deeper insights into how your threat sensitivities show up in
            different areas of your life.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {otherAssessments.map((a) => (
            <span
              key={a.result.id}
              style={{
                padding: "4px 12px",
                borderRadius: "var(--r-pill)",
                fontSize: 12,
                fontWeight: 500,
                background: "var(--bw-white)",
                color: "var(--fg-1)",
                border: "1px solid var(--border-1)",
              }}
            >
              {a.instrument_name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PTPAssessmentResponsesSection(props: PTPNarrativeSectionsProps) {
  const data = usePTPNarrativeContext();
  if (isCoachLimited(props)) return null;
  const { responsesExpanded, setResponsesExpanded, assessmentResponses } = data;
  const { ptpContextTab } = props;

  return (
    <div>
      <button
        onClick={() => setResponsesExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between text-left transition-colors hover:bg-muted/30"
        style={{
          background: "var(--bw-white)",
          border: "1px solid var(--border-1)",
          borderRadius: "var(--r-md)",
          padding: "var(--s-4)",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 600,
            color: "var(--fg-1)",
            margin: 0,
          }}
        >
          Your assessment responses
        </h3>
        {responsesExpanded ? (
          <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "var(--fg-3)" }} />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--fg-3)" }} />
        )}
      </button>

      {responsesExpanded && (
        <div
          style={{
            background: "var(--bw-white)",
            border: "1px solid var(--border-1)",
            borderRadius: "var(--r-md)",
            overflow: "hidden",
            marginTop: 8,
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <div style={{ padding: "8px 16px", background: "var(--bw-white)", borderBottom: "1px solid var(--border-1)" }}>
            <p style={{ fontSize: 12, color: "var(--fg-3)", margin: 0 }}>
              {assessmentResponses.length} responses —{" "}
              {ptpContextTab === "professional"
                ? "Professional context"
                : ptpContextTab === "personal"
                  ? "Personal context"
                  : "All contexts"}
            </p>
          </div>
          {assessmentResponses.map((r, idx) => {
            const color = PTP_DIMENSION_COLORS[r.dimensionId] ?? "#021F36";
            return (
              <div
                key={idx}
                className="flex items-start gap-3"
                style={{
                  padding: "12px 16px",
                  borderBottom: idx === assessmentResponses.length - 1 ? "none" : "1px solid var(--border-1)",
                }}
              >
                <div
                  className="shrink-0 self-stretch"
                  style={{ width: 4, backgroundColor: color, minHeight: 40, borderRadius: 2 }}
                />
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--fg-1)", margin: 0 }}>
                    Q{r.itemNumber} — {r.facetName}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2, lineHeight: 1.5 }}>
                    {r.itemText}
                  </p>
                </div>
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#fff",
                    backgroundColor: color,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {r.score}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   Default export — backwards-compatible wrapper
   ========================================================================= */

export default function PTPNarrativeSections(props: PTPNarrativeSectionsProps) {
  if (isCoachLimited(props)) return <CoachLimitedNotice />;
  return (
    <div className="space-y-8">
      <PTPProfileOverviewSection {...props} />
      <PTPDimensionHighlightsSection {...props} />
      <PTPFacetInsightsElevatedSection {...props} />
      <PTPFacetInsightsSuppressedSection {...props} />
      <PTPCrossAssessmentSection {...props} />
      <PTPAssessmentResponsesSection {...props} />
    </div>
  );
}
