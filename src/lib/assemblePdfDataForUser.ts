/**
 * PDF data assembly helpers — extracted from MyResults.tsx so they can be
 * reused for the departure ZIP export flow.
 *
 * These functions fetch their own assessment_result + assessment + instrument +
 * dimensions data (they don't have access to MyResults' selected/effectiveSelected
 * state).
 */
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { PdfData } from "./generateResultsPdf";
import type { NaiPdfData } from "./generateNaiPdf";
import type { AirsaPdfData } from "./generateAirsaPdf";
import type { PdfSections } from "@/components/results/ExportPdfModal";

interface DimensionScore {
  mean?: number;
  band?: string;
  readiness_level?: string;
  level_mean?: number;
}

interface OverallProfile {
  high_dimensions?: string[];
  low_dimensions?: string[];
  triggered_cross_instrument_recommendations?: string[];
  profile_summary?: string;
}

const BAND_COLORS: Record<string, string> = {
  high: "#1F4E79",
  moderate_high: "#2E75B6",
  moderate: "#8EA9C1",
  moderate_low: "#F4B942",
  low: "#E07B00",
};

const PTP_DIMENSION_COLORS: Record<string, string> = {
  "DIM-PTP-01": "#021F36",
  "DIM-PTP-02": "#006D77",
  "DIM-PTP-03": "#6D6875",
  "DIM-PTP-04": "#3C096C",
  "DIM-PTP-05": "#2D6A4F",
};

const PTP_DIMENSION_PASTEL: Record<string, string> = {
  "DIM-PTP-01": "#E8EDF1",
  "DIM-PTP-02": "#E6F2F3",
  "DIM-PTP-03": "#F0EFF1",
  "DIM-PTP-04": "#EEE8F5",
  "DIM-PTP-05": "#E8F0EC",
};

const NAI_DIMENSION_COLORS: Record<string, string> = {
  "DIM-NAI-01": "#021F36",
  "DIM-NAI-02": "#F5741A",
  "DIM-NAI-03": "#006D77",
  "DIM-NAI-04": "#3C096C",
  "DIM-NAI-05": "#7a5800",
};

const NAI_DIMENSION_PASTEL: Record<string, string> = {
  "DIM-NAI-01": "#E8EDF1",
  "DIM-NAI-02": "#FEF0E7",
  "DIM-NAI-03": "#E0F0F2",
  "DIM-NAI-04": "#EDE5F4",
  "DIM-NAI-05": "#F0E6D2",
};

const PTP_ITEM_FACET_NAMES: Record<number, string> = {
  1:"Physical safety orientation",2:"Emotional safety (work)",3:"Financial security orientation",4:"Short-term loss aversion",5:"Status and standing vigilance",6:"Personal fairness sensitivity",7:"Equality and reciprocity need",8:"Resilience and recovery capacity",9:"Physical health vigilance",10:"Need to be trusted",11:"Need to trust others",12:"Similarity-based affiliation",13:"Group belonging need",14:"Need for individual differentiation",15:"Contrarian opinion drive",16:"Team orientation",17:"Self-esteem and self-respect",18:"Social comparison drive",19:"Recognition need",20:"Approval and respect need",21:"Power and influence need (work)",22:"Status and prestige need (work)",23:"Embarrassment avoidance",24:"Impostor sensitivity",25:"Future certainty need (work)",26:"Expectation clarity need (work)",27:"Evaluation criteria need",28:"Reward predictability need",29:"Autonomy and control need (work)",30:"Action orientation (work)",31:"Information and situational awareness",32:"Correctness need",33:"Perfectionism",34:"Status quo and stability need (work)",35:"Sense-making need (work)",36:"Consistency need",37:"Ambiguity tolerance (work)",38:"Surprise aversion (work)",39:"Conformity need",40:"Doubt tolerance",41:"Authenticity need",42:"Risk tolerance (work)",43:"Curiosity",44:"Voice and influence need",45:"Flexibility and flow capacity (work)",46:"Commitment reliability need (work)",47:"Well-being vigilance for close others",48:"Emotional safety (social)",49:"Financial loss aversion",50:"Environmental safety scanning",51:"Other-directed fairness sensitivity",52:"Animal welfare sensitivity",53:"Social equality vigilance",54:"Mental health vigilance",55:"Emotional health vigilance",56:"Spiritual health vigilance",57:"Power and influence need (social)",58:"Status and prestige need (social)",59:"Benevolence drive",60:"Future certainty need (social)",61:"Expectation clarity need (social)",62:"Autonomy and control need (social)",63:"Action orientation (social)",64:"Status quo and stability need (social)",65:"Sense-making need (social)",66:"Ambiguity tolerance (social)",67:"Surprise aversion (social)",68:"Risk tolerance (social)",69:"Self-directed independence need",70:"Tradition and ritual orientation",71:"Harmony and stability need",72:"Flexibility and flow capacity (social)",73:"Commitment reliability need (social)",74:"Mastery and craft orientation",75:"Self-development drive",76:"Mission and meaning orientation",77:"Values alignment (personal)",78:"Values alignment (organisational)",79:"Artistic and creative expression",80:"Spiritual orientation",81:"Passionate pursuit orientation",82:"Challenge and growth orientation",83:"Truth-seeking orientation",84:"Happiness pursuit",85:"Sensory and sensual gratification",86:"Instant gratification orientation",87:"Stimulation and excitement need",88:"Play orientation",89:"Love and attachment need"
};

const NAI_DIMENSION_NAMES_LOCAL: Record<string, string> = {
  "DIM-NAI-01": "Certainty",
  "DIM-NAI-02": "Agency",
  "DIM-NAI-03": "Fairness",
  "DIM-NAI-04": "Ego Stability",
  "DIM-NAI-05": "Saturation Threshold",
};

function formatDimensionName(id: string): string {
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function bandOf(score: number): string {
  if (score >= 76) return "High";
  if (score >= 51) return "Elevated";
  if (score >= 26) return "Moderate";
  return "Low";
}

interface CommonFetched {
  result: any;
  assessment: any;
  instrument: any;
  dimensionNameMap: Map<string, string>;
}

async function fetchCommon(assessmentResultId: string): Promise<CommonFetched> {
  const { data: result } = await supabase
    .from("assessment_results")
    .select("id, assessment_id, user_id, instrument_id, instrument_version, dimension_scores, ai_narrative, overall_profile, created_at")
    .eq("id", assessmentResultId)
    .single();
  if (!result) throw new Error(`assessment_result ${assessmentResultId} not found`);

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, completed_at, context_type, instrument_id")
    .eq("id", result.assessment_id)
    .single();

  const { data: instrument } = await supabase
    .from("instruments")
    .select("instrument_id, instrument_name, scale_type, short_name")
    .eq("instrument_id", result.instrument_id ?? "")
    .maybeSingle();

  const { data: dimensionRows } = await supabase
    .from("dimensions")
    .select("dimension_id, dimension_name")
    .eq("instrument_id", result.instrument_id ?? "");

  const dimensionNameMap = new Map<string, string>(
    (dimensionRows ?? []).map((d: any) => [d.dimension_id, d.dimension_name])
  );

  return { result, assessment, instrument, dimensionNameMap };
}

// =========================================================================
// PTP
// =========================================================================
export async function assemblePtpPdfData(params: {
  userId: string;
  assessmentResultId: string;
  contextTab: 'professional' | 'personal' | 'combined' | null;
  displayName: string | null;
  sections: PdfSections;
}): Promise<PdfData> {
  const { assessmentResultId, displayName, sections } = params;
  let { contextTab } = params;
  const { result, assessment, instrument, dimensionNameMap } = await fetchCommon(assessmentResultId);

  const assessmentCtx = (assessment?.context_type ?? null) as 'professional' | 'personal' | 'both' | null;

  // Reconcile contextTab with assessment context_type
  if (assessmentCtx === 'professional' || assessmentCtx === 'personal') {
    // single-context assessment — force tab to match
    contextTab = assessmentCtx;
  } else if (assessmentCtx === 'both') {
    if (contextTab !== 'professional' && contextTab !== 'personal' && contextTab !== 'combined') {
      contextTab = 'combined';
    }
  } else {
    contextTab = contextTab ?? null;
  }

  // Build dimension_scores for the chosen tab
  let dimensionScoresMap: Record<string, DimensionScore> = result.dimension_scores ?? {};

  if (assessmentCtx === 'both' && (contextTab === 'professional' || contextTab === 'personal')) {
    // Replicate bothSplitScores logic
    const { data: responses } = await supabase
      .from('assessment_responses')
      .select('response_value_numeric, is_reverse_scored, item_id')
      .eq('assessment_id', result.assessment_id);

    if (responses?.length) {
      const itemIds = responses.map((r: any) => r.item_id);
      const { data: items } = await supabase
        .from('items')
        .select('item_id, dimension_id, context_type')
        .in('item_id', itemIds);
      const itemMap = new Map((items ?? []).map((i: any) => [i.item_id, i]));

      const dimMap: Record<string, number[]> = {};
      responses.forEach((r: any) => {
        const item = itemMap.get(r.item_id) as any;
        if (!item?.dimension_id) return;
        if (item.context_type !== contextTab) return;
        const raw = Number(r.response_value_numeric);
        const value = r.is_reverse_scored ? 100 - raw : raw;
        if (!dimMap[item.dimension_id]) dimMap[item.dimension_id] = [];
        dimMap[item.dimension_id].push(value);
      });
      const split: Record<string, DimensionScore> = {};
      Object.entries(dimMap).forEach(([dim, vals]) => {
        split[dim] = { mean: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 };
      });
      if (Object.keys(split).length > 0) dimensionScoresMap = split;
    }
  }
  // For 'combined' on a 'both' assessment, the result.dimension_scores is already combined.

  const dimensionScores = Object.entries(dimensionScoresMap);
  const sortedDimensions = [...dimensionScores].sort((a, b) => {
    const aVal = (a[1] as DimensionScore).mean ?? (a[1] as DimensionScore).level_mean ?? 0;
    const bVal = (b[1] as DimensionScore).mean ?? (b[1] as DimensionScore).level_mean ?? 0;
    return bVal - aVal;
  });
  const highestDimension = sortedDimensions[0]?.[0] ?? "—";
  const lowestDimension = sortedDimensions[sortedDimensions.length - 1]?.[0] ?? "—";

  const resolveDimensionName = (id: string) =>
    dimensionNameMap.get(id) ?? formatDimensionName(id);

  const isPTP = (result.instrument_id ?? "").toUpperCase().includes("INST-001");

  const isSliderInstrument =
    instrument?.scale_type?.includes("slider") ||
    instrument?.scale_type?.includes("0-100") ||
    ["PTP", "NAI"].some((s) => (result.instrument_id ?? "").toUpperCase().includes(s));

  // Narrative + facet sections
  let elevatedFacets: PdfData["elevatedFacets"] = [];
  let suppressedFacets: PdfData["suppressedFacets"] = [];
  let assessmentResponses: PdfData["assessmentResponses"] = [];
  let narrativeSections: PdfData["narrativeSections"] = null;

  if (isPTP && contextTab) {
    const { data: narrativeRow } = await supabase
      .from("facet_interpretations")
      .select("facet_data")
      .eq("assessment_result_id", assessmentResultId)
      .eq("section_type", `narrative_${contextTab}`)
      .maybeSingle();
    if (narrativeRow?.facet_data) {
      narrativeSections = narrativeRow.facet_data as any;
    }
  }

  if (isPTP) {
    const facetSectionType = contextTab ? `facet_insights_${contextTab}` : "facet_insights";
    const { data: facetRow } = await supabase
      .from("facet_interpretations")
      .select("facet_data")
      .eq("assessment_result_id", assessmentResultId)
      .eq("section_type", facetSectionType)
      .maybeSingle();

    const facetInterpretations: { name: string; positive_self: string[]; negative_self: string[]; positive_others: string[]; negative_others: string[] }[] =
      (facetRow?.facet_data as any) ?? [];

    if (contextTab) {
      const { data: drivingRow } = await supabase
        .from("facet_interpretations")
        .select("facet_data")
        .eq("assessment_result_id", assessmentResultId)
        .eq("section_type", `driving_facets_${contextTab}`)
        .maybeSingle();

      const drivingData = drivingRow?.facet_data as
        | {
            elevated?: Array<{ value: number; facet_name: string; item_number: number; dimension_id: string }>;
            suppressed?: Array<{ value: number; facet_name: string; item_number: number; dimension_id: string }>;
          }
        | undefined;

      const mapDriving = (
        f: { value: number; facet_name: string; item_number: number; dimension_id: string },
      ) => ({
        itemNumber: f.item_number,
        facetName: f.facet_name,
        itemText: "",
        score: Math.round(f.value),
        dimensionId: f.dimension_id,
        interpretation: facetInterpretations.find((fi) => fi.name === f.facet_name) ?? null,
      });

      elevatedFacets = (drivingData?.elevated ?? []).slice(0, 10).map(mapDriving);
      suppressedFacets = (drivingData?.suppressed ?? []).slice(0, 10).map(mapDriving);
    }

    if (sections.assessmentResponses) {
      const { data: responses } = await supabase
        .from("assessment_responses")
        .select("response_value_numeric, is_reverse_scored, item_id")
        .eq("assessment_id", result.assessment_id);

      if (responses?.length) {
        const itemIds = responses.map((r: any) => r.item_id);
        const { data: items } = await supabase
          .from("items")
          .select("item_id, item_text, item_number, dimension_id, context_type, facet_name")
          .in("item_id", itemIds);
        const itemMap = new Map((items ?? []).map((i: any) => [i.item_id, i]));

        let scored = responses.map((r: any) => {
          const item = itemMap.get(r.item_id) as any;
          const raw = Number(r.response_value_numeric);
          const value = r.is_reverse_scored ? 100 - raw : raw;
          return {
            itemNumber: item?.item_number ?? 0,
            facetName: item?.facet_name ?? item?.item_text?.slice(0, 40) ?? "",
            itemText: item?.item_text ?? "",
            score: Math.round(value),
            dimensionId: item?.dimension_id ?? "",
            contextType: item?.context_type ?? null,
          };
        });

        if (contextTab === "professional" || contextTab === "personal") {
          const filtered = scored.filter((s) => s.contextType === contextTab);
          if (filtered.length > 0) scored = filtered;
        }

        assessmentResponses = scored
          .sort((a, b) => a.itemNumber - b.itemNumber)
          .map(({ contextType, ...rest }) => rest);
      }
    }
  }

  const contextLabel =
    contextTab === "professional" ? "Professional"
    : contextTab === "personal" ? "Personal"
    : contextTab === "combined" ? "Combined"
    : "";

  const recommendations =
    (result.overall_profile as OverallProfile | null)
      ?.triggered_cross_instrument_recommendations ?? [];

  const instrumentName = instrument?.instrument_name ?? result.instrument_id ?? "Unknown";
  const instrumentShortName = instrument?.short_name ?? result.instrument_id ?? instrumentName.replace(/\s+/g, "");

  return {
    userName: displayName ?? "Participant",
    instrumentName,
    instrumentShortName,
    instrumentVersion: result.instrument_version ?? "—",
    dateTaken: assessment?.completed_at ? format(new Date(assessment.completed_at), "MMMM d, yyyy") : "—",
    contextLabel,
    dimensions: sortedDimensions.map(([id, score]) => {
      const s = score as DimensionScore;
      return {
        name: resolveDimensionName(id),
        score: Math.round(s.mean ?? s.level_mean ?? 0),
        band: s.band ?? s.readiness_level ?? "moderate",
        color: isPTP ? (PTP_DIMENSION_COLORS[id] ?? "#8EA9C1") : (BAND_COLORS[s.band ?? "moderate"] ?? "#8EA9C1"),
        pastelColor: isPTP ? (PTP_DIMENSION_PASTEL[id] ?? "#F9F7F1") : "#F9F7F1",
        dimensionId: id,
      };
    }),
    statCards: [
      { label: "Dimensions Assessed", value: String(dimensionScores.length) },
      { label: "Highest Dimension", value: resolveDimensionName(highestDimension) },
      { label: "Lowest Dimension", value: resolveDimensionName(lowestDimension) },
    ],
    narrativeSections,
    elevatedFacets,
    suppressedFacets,
    assessmentResponses,
    recommendations,
    isSliderInstrument: !!isSliderInstrument,
    isPTP: !!isPTP,
  };
}

// =========================================================================
// NAI
// =========================================================================
export async function assembleNaiPdfData(params: {
  userId: string;
  assessmentResultId: string;
  isCoachView: boolean;
  displayName: string | null;
}): Promise<NaiPdfData> {
  const { assessmentResultId, isCoachView, displayName } = params;
  const { result, assessment, instrument, dimensionNameMap } = await fetchCommon(assessmentResultId);

  const dimensionScoresMap: Record<string, DimensionScore> = result.dimension_scores ?? {};
  const dimensionScores = Object.entries(dimensionScoresMap);
  const sortedDimensions = [...dimensionScores].sort((a, b) => {
    const aVal = (a[1] as DimensionScore).mean ?? (a[1] as DimensionScore).level_mean ?? 0;
    const bVal = (b[1] as DimensionScore).mean ?? (b[1] as DimensionScore).level_mean ?? 0;
    return bVal - aVal;
  });
  const highestDimension = sortedDimensions[0]?.[0] ?? "—";
  const lowestDimension = sortedDimensions[sortedDimensions.length - 1]?.[0] ?? "—";
  const resolveDimensionName = (id: string) =>
    dimensionNameMap.get(id) ?? formatDimensionName(id);

  const dimensionsForPdf = Object.keys(NAI_DIMENSION_NAMES_LOCAL).map((dimId) => {
    const found = dimensionScores.find(([id]) => id === dimId);
    const score = Math.round(((found?.[1] as DimensionScore | undefined)?.mean) ?? 0);
    return {
      dimensionId: dimId,
      name: dimensionNameMap.get(dimId) ?? NAI_DIMENSION_NAMES_LOCAL[dimId] ?? dimId,
      score,
      band: bandOf(score),
      color: NAI_DIMENSION_COLORS[dimId] ?? "#021F36",
      pastelColor: NAI_DIMENSION_PASTEL[dimId] ?? "#F9F7F1",
    };
  });

  const { data: allItems } = await supabase
    .from("items")
    .select("item_id, item_text, item_number, dimension_id, facet_name")
    .eq("instrument_id", "INST-002")
    .order("item_number");

  const { data: responsesData } = await supabase
    .from("assessment_responses")
    .select("response_value_numeric, is_reverse_scored, item_id")
    .eq("assessment_id", result.assessment_id);

  const responseByItem = new Map((responsesData ?? []).map((r: any) => [r.item_id, r]));

  const assessmentResponses = (allItems ?? []).map((item: any) => {
    const r = responseByItem.get(item.item_id) as any;
    let score: number | null = null;
    if (r) {
      const raw = Number(r.response_value_numeric);
      score = Math.round(r.is_reverse_scored ? 100 - raw : raw);
    }
    return {
      itemNumber: item.item_number ?? 0,
      facetName: item.facet_name ?? item.item_text?.slice(0, 40) ?? "",
      itemText: item.item_text ?? "",
      score,
      dimensionId: item.dimension_id ?? "",
      hasResponse: !!r,
    };
  }).sort((a, b) => a.itemNumber - b.itemNumber);

  const outliersRaw = assessmentResponses
    .filter((r) => r.hasResponse && (r.score ?? 0) >= 75)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const requiredSections = [
    "nai_profile_overview",
    ...Object.keys(NAI_DIMENSION_NAMES_LOCAL).map((d) => `nai_dimension_highlight_${d}`),
    ...outliersRaw.map((o) => `nai_item_interpretation_${o.itemNumber}`),
    "nai_cross_assessment",
    "nai_pattern_alert",
    ...Object.keys(NAI_DIMENSION_NAMES_LOCAL).map((d) => `nai_coach_questions_${d}`),
  ];

  const { data: interpRows } = await supabase
    .from("facet_interpretations")
    .select("section_type, facet_data")
    .eq("assessment_result_id", assessmentResultId)
    .in("section_type", requiredSections);

  const interpMap: Record<string, any> = {};
  (interpRows ?? []).forEach((row: any) => {
    if (row.section_type) interpMap[row.section_type] = row.facet_data;
  });

  let cafesMappings: any[] = [];
  if (isCoachView) {
    const elevatedDimIds = dimensionScores
      .filter(([, s]) => ((s as DimensionScore).mean ?? 0) >= 51)
      .map(([id]) => id);
    if (elevatedDimIds.length > 0) {
      const { data: maps } = await supabase
        .from("cafes_ptp_mapping")
        .select("nai_dimension_id, primary_ptp_domain, secondary_ptp_domain, facets, coaching_questions")
        .in("nai_dimension_id", elevatedDimIds);
      cafesMappings = maps ?? [];
    }
  }

  const buildRelatedPtpFacets = (dimensionId: string): string | null => {
    if (!isCoachView) return null;
    const mapping = cafesMappings.find((m) => m.nai_dimension_id === dimensionId);
    if (!mapping) return null;
    const facets = Array.isArray(mapping.facets) ? mapping.facets : [];
    if (facets.length === 0) return null;
    return facets
      .map((f: any) => {
        const workRef = Array.isArray(f.work_items) ? f.work_items[0] : f.work_item;
        const socialRef = Array.isArray(f.social_items) ? f.social_items[0] : f.social_item;
        const refs = [workRef, socialRef].filter(Boolean).join(", ");
        const name = f.name ?? f.facet_name;
        return refs ? `${name} (${refs})` : name;
      })
      .filter(Boolean)
      .join("; ");
  };

  const outlierItems = outliersRaw.map((o) => ({
    itemNumber: o.itemNumber,
    facetName: o.facetName,
    itemText: o.itemText,
    score: o.score ?? 0,
    dimensionId: o.dimensionId,
    dimensionName: dimensionNameMap.get(o.dimensionId) ?? NAI_DIMENSION_NAMES_LOCAL[o.dimensionId] ?? o.dimensionId,
    interpretation: interpMap[`nai_item_interpretation_${o.itemNumber}`]?.text ?? null,
    relatedPtpFacets: buildRelatedPtpFacets(o.dimensionId),
  }));

  const cafesMappingForPdf = isCoachView
    ? Object.keys(NAI_DIMENSION_NAMES_LOCAL)
        .map((dimId) => {
          const found = dimensionScores.find(([id]) => id === dimId);
          const score = Math.round(((found?.[1] as DimensionScore | undefined)?.mean) ?? 0);
          if (score < 51) return null;
          const mapping = cafesMappings.find((m) => m.nai_dimension_id === dimId);
          if (!mapping) return null;
          const facets = Array.isArray(mapping.facets) ? mapping.facets : [];
          const aiQuestions = interpMap[`nai_coach_questions_${dimId}`]?.questions;
          const fallbackQuestions = Array.isArray(mapping.coaching_questions) ? mapping.coaching_questions : [];
          const questions: string[] = Array.isArray(aiQuestions) && aiQuestions.length > 0 ? aiQuestions : fallbackQuestions;
          return {
            dimensionId: dimId,
            dimensionName: dimensionNameMap.get(dimId) ?? NAI_DIMENSION_NAMES_LOCAL[dimId] ?? dimId,
            score,
            band: bandOf(score),
            color: NAI_DIMENSION_COLORS[dimId] ?? "#021F36",
            pastelColor: NAI_DIMENSION_PASTEL[dimId] ?? "#F9F7F1",
            primaryPtpDomain: mapping.primary_ptp_domain,
            secondaryPtpDomain: mapping.secondary_ptp_domain,
            ptpFacets: facets.map((f: any) => {
              const workRef = Array.isArray(f.work_items) ? f.work_items[0] : f.work_item;
              const socialRef = Array.isArray(f.social_items) ? f.social_items[0] : f.social_item;
              return {
                name: f.name ?? f.facet_name,
                refs: [workRef, socialRef].filter(Boolean).join(", "),
              };
            }),
            coachingQuestions: questions,
          };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null)
    : [];

  const highlightsForPdf = dimensionsForPdf.map((d) => {
    const highlight = interpMap[`nai_dimension_highlight_${d.dimensionId}`];
    return {
      dimensionId: d.dimensionId,
      name: d.name,
      score: d.score,
      band: d.band,
      color: d.color,
      pastelColor: d.pastelColor,
      highlight: highlight?.highlight ?? null,
      areasOfFocus: highlight?.areas_of_focus ?? null,
    };
  });

  const crossAssessmentData = interpMap.nai_cross_assessment;
  const crossAssessment = crossAssessmentData
    ? {
        interpretation: crossAssessmentData.interpretation ?? "",
        suggestions: Array.isArray(crossAssessmentData.suggestions) ? crossAssessmentData.suggestions : [],
      }
    : null;

  const patternAlertData = interpMap.nai_pattern_alert;
  const patternAlert = isCoachView && patternAlertData
    ? {
        body: patternAlertData.body ?? "",
        suggestions: Array.isArray(patternAlertData.suggestions) ? patternAlertData.suggestions : [],
      }
    : null;

  const instrumentName = instrument?.instrument_name ?? result.instrument_id ?? "Unknown";
  const instrumentShortName = instrument?.short_name ?? "NAI";

  return {
    userName: displayName ?? "Participant",
    instrumentName,
    instrumentShortName,
    instrumentVersion: result.instrument_version ?? "—",
    dateTaken: assessment?.completed_at ? format(new Date(assessment.completed_at), "MMMM d, yyyy") : "—",
    isCoachView,
    statCards: [
      { label: "Dimensions Assessed", value: String(dimensionScores.length) },
      { label: "Highest Dimension", value: resolveDimensionName(highestDimension) },
      { label: "Lowest Dimension", value: resolveDimensionName(lowestDimension) },
    ],
    dimensions: dimensionsForPdf,
    profileOverviewText: interpMap.nai_profile_overview?.text ?? null,
    dimensionHighlights: highlightsForPdf,
    patternAlert,
    outlierItems,
    cafesPtpMapping: cafesMappingForPdf,
    crossAssessment,
    assessmentResponses,
  };
}

// =========================================================================
// AIRSA
// =========================================================================
const AIRSA_DOMAIN_NAMES: Record<string, string> = {
  "DIM-AIRSA-01": "Domain 1",
  "DIM-AIRSA-02": "Domain 2",
  "DIM-AIRSA-03": "Domain 3",
  "DIM-AIRSA-04": "Domain 4",
  "DIM-AIRSA-05": "Domain 5",
  "DIM-AIRSA-06": "Domain 6",
  "DIM-AIRSA-07": "Domain 7",
  "DIM-AIRSA-08": "Domain 8",
};

const AIRSA_STATUS_COLORS: Record<string, { hex: string; label: string }> = {
  aligned:            { hex: "#006D77", label: "Aligned" },
  confirmed_strength: { hex: "#2D6A4F", label: "Confirmed strength" },
  confirmed_gap:      { hex: "#6D6875", label: "Confirmed gap" },
  blind_spot:         { hex: "#021F36", label: "Blind spot" },
  underestimate:      { hex: "#3C096C", label: "Underestimate" },
};

export async function assembleAirsaPdfData(params: {
  userId: string;
  assessmentResultId: string;
  isCoachView: boolean;
  displayName: string | null;
}): Promise<AirsaPdfData> {
  const { assessmentResultId, isCoachView, displayName } = params;
  const { result, assessment, instrument, dimensionNameMap } = await fetchCommon(assessmentResultId);

  const { data: airsaResult } = await supabase
    .from("assessment_results")
    .select("manager_dimension_scores, self_manager_divergence, skill_level_breakdown")
    .eq("id", assessmentResultId)
    .single();

  const dimensionScores: Record<string, { readiness_level?: string }> = result.dimension_scores ?? {};
  const managerScores: Record<string, { readiness_level?: string }> | null = (airsaResult as any)?.manager_dimension_scores ?? null;
  const divergence: Record<string, { status?: string; self_level?: string; manager_level?: string }> | null = (airsaResult as any)?.self_manager_divergence ?? null;
  const breakdown: Record<string, any> | null = (airsaResult as any)?.skill_level_breakdown ?? null;

  const isSelfOnly =
    !managerScores ||
    !divergence ||
    !breakdown ||
    Object.keys(breakdown).length === 0;

  const skillsArr: any[] = breakdown
    ? Object.values(breakdown).sort((a: any, b: any) => a.skill_number - b.skill_number)
    : [];

  const totalSkills = skillsArr.length || 24;
  const alignedStatuses = ["aligned", "confirmed_strength", "confirmed_gap"];
  const alignedCount = skillsArr.filter((s: any) => alignedStatuses.includes(s.status)).length;
  const alignmentPct = isSelfOnly ? null : Math.round((alignedCount / totalSkills) * 100);
  const confirmedStrengths = skillsArr.filter((s: any) => s.status === "confirmed_strength").length;
  const blindSpots = skillsArr.filter((s: any) => s.status === "blind_spot").length;
  const underestimates = skillsArr.filter((s: any) => s.status === "underestimate").length;

  const domainRows = Object.keys(AIRSA_DOMAIN_NAMES).map((dimId) => {
    const selfLevel = dimensionScores[dimId]?.readiness_level ?? "—";
    const managerLevel = managerScores?.[dimId]?.readiness_level ?? null;
    const status = divergence?.[dimId]?.status ?? null;
    return {
      dimensionId: dimId,
      domainName:
        (skillsArr.find((s: any) => s.dimension_id === dimId) as any)?.domain_name ??
        dimensionNameMap.get(dimId) ??
        AIRSA_DOMAIN_NAMES[dimId] ??
        dimId,
      selfLevel,
      managerLevel,
      status,
      statusLabel: status ? AIRSA_STATUS_COLORS[status]?.label ?? null : null,
      statusColor: status ? AIRSA_STATUS_COLORS[status]?.hex ?? null : null,
    };
  });

  const { data: secRows } = await supabase
    .from("facet_interpretations")
    .select("section_type, facet_data")
    .eq("assessment_result_id", assessmentResultId)
    .like("section_type", "airsa_%");

  const secMap: Record<string, any> = {};
  (secRows ?? []).forEach((r: any) => {
    if (r.section_type) secMap[r.section_type] = r.facet_data;
  });

  let selfOnlySkills: AirsaPdfData["selfOnlySkills"] = null;
  if (isSelfOnly) {
    const { data: skillRows } = await supabase
      .from("airsa_skills")
      .select("item_number, skill_name, short_description, dimension_id")
      .order("item_number");
    selfOnlySkills = (skillRows ?? []) as any;
  }

  const topPrioritiesContent = secMap.airsa_top_priorities?.content;
  const topPriorities: AirsaPdfData["topPriorities"] = Array.isArray(topPrioritiesContent)
    ? topPrioritiesContent.map((p: any) => ({
        skill_number: p.skill_number,
        behavioral_target: p.behavioral_target ?? "",
        practice: p.practice ?? "",
      }))
    : null;
  const prioritySkillNumbers = topPriorities
    ? topPriorities.map((p) => p.skill_number).filter((n) => typeof n === "number")
    : [];

  const anySection =
    secMap.airsa_profile_overview ??
    secMap.airsa_what_this_means ??
    secMap.airsa_action_plan ??
    secMap.airsa_conversation_guide ??
    secMap.airsa_top_priorities ??
    secMap.airsa_cross_instrument ??
    null;
  // AI section facet_data does not always carry generated_at.
  // Fall back to assessment_results.created_at.
  const aiGeneratedAt = anySection?.generated_at ?? result.created_at ?? null;
  const aiVersion = anySection?.ai_version ?? null;

  const instrumentName = instrument?.instrument_name ?? "AI Readiness Skills Assessment";
  const instrumentShortName = instrument?.short_name ?? "AIRSA";

  return {
    userName: displayName ?? "Participant",
    instrumentName,
    instrumentShortName,
    instrumentVersion: result.instrument_version ?? "—",
    dateTaken: assessment?.completed_at ? format(new Date(assessment.completed_at), "MMMM d, yyyy") : "—",
    isCoachView,
    isSelfOnly,
    totalSkills,
    alignmentPct,
    confirmedStrengths,
    blindSpots,
    underestimates,
    domainRows,
    skills: skillsArr as any,
    prioritySkillNumbers,
    profileOverviewText: secMap.airsa_profile_overview?.content
      ? String(secMap.airsa_profile_overview.content)
      : null,
    whatThisMeans: secMap.airsa_what_this_means?.content ?? null,
    actionPlan: secMap.airsa_action_plan?.content ?? null,
    conversationGuide: secMap.airsa_conversation_guide?.content ?? null,
    topPriorities,
    crossInstrumentText: secMap.airsa_cross_instrument?.content
      ? String(secMap.airsa_cross_instrument.content)
      : null,
    selfOnlySkills,
    aiGeneratedAt,
    aiVersion,
  };
}
