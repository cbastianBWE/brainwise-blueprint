import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp } from "lucide-react";

const PTP_DIMENSION_COLORS: Record<string, string> = {
  "DIM-PTP-01": "#021F36",
  "DIM-PTP-02": "#006D77",
  "DIM-PTP-03": "#6D6875",
  "DIM-PTP-04": "#3C096C",
  "DIM-PTP-05": "#FFB703",
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
}

interface DimensionScore {
  mean?: number;
  band?: string;
}

interface PTPNarrativeSectionsProps {
  assessmentResultId: string;
  assessmentId: string;
  narrative: string | null;
  dimensionScores: [string, DimensionScore][];
  dimensionNameMap: Map<string, string>;
  recommendations: string[];
  permissionLevel?: "full_results" | "score_summary" | null;
  isCoachView?: boolean;
}

export default function PTPNarrativeSections({
  assessmentResultId,
  assessmentId,
  narrative,
  dimensionScores,
  dimensionNameMap,
  recommendations,
  permissionLevel,
  isCoachView,
}: PTPNarrativeSectionsProps) {
  const [elevatedFacets, setElevatedFacets] = useState<FacetItem[]>([]);
  const [suppressedFacets, setSuppressedFacets] = useState<FacetItem[]>([]);
  const [facetInterpretations, setFacetInterpretations] = useState<FacetInterpretation[]>([]);
  const [loadingFacets, setLoadingFacets] = useState(true);
  const [loadingInterpretations, setLoadingInterpretations] = useState(false);
  const [expandedFacets, setExpandedFacets] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchFacets = async () => {
      setLoadingFacets(true);
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
        .select("item_id, item_text, item_number, dimension_id")
        .in("item_id", itemIds);

      const itemMap = new Map((items ?? []).map((i) => [i.item_id, i]));

      const scored: FacetItem[] = responses.map((r) => {
        const item = itemMap.get(r.item_id);
        const raw = Number(r.response_value_numeric);
        const value = r.is_reverse_scored ? 100 - raw : raw;
        return {
          item_text: item?.item_text ?? "",
          item_number: item?.item_number ?? null,
          dimension_id: item?.dimension_id ?? "",
          value,
        };
      });

      const values = scored.map((s) => s.value);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length,
      );

      const elevated = scored
        .filter((s) => s.value > mean + stdDev)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
      const suppressed = scored
        .filter((s) => s.value < mean - stdDev)
        .sort((a, b) => a.value - b.value)
        .slice(0, 10);

      setElevatedFacets(elevated);
      setSuppressedFacets(suppressed);
      setLoadingFacets(false);

      if (elevated.length > 0 || suppressed.length > 0) {
        setLoadingInterpretations(true);
        const { data: existing } = await supabase
          .from("facet_interpretations")
          .select("facet_data")
          .eq("assessment_result_id", assessmentResultId)
          .single();

        if (existing?.facet_data) {
          setFacetInterpretations(existing.facet_data as unknown as FacetInterpretation[]);
          setLoadingInterpretations(false);
          return;
        }

        const allFacets = [
          ...elevated.map((f) => ({
            name: PTP_ITEM_FACET_NAMES[f.item_number ?? 0] ?? f.item_text.slice(0, 40),
            score: Math.round(f.value),
            question: f.item_text,
            type: "elevated",
          })),
          ...suppressed.map((f) => ({
            name: PTP_ITEM_FACET_NAMES[f.item_number ?? 0] ?? f.item_text.slice(0, 40),
            score: Math.round(f.value),
            question: f.item_text,
            type: "suppressed",
          })),
        ];

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke("generate-facet-interpretations", {
          body: { assessment_result_id: assessmentResultId, facets: allFacets },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });

        if (!error && data?.facet_data) {
          setFacetInterpretations(data.facet_data as FacetInterpretation[]);
        }
        setLoadingInterpretations(false);
      }
    };
    fetchFacets();
  }, [assessmentId, assessmentResultId]);

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

  const profileOverview = narrative
    ? extractSection(narrative, "Profile Overview", "Dimension Highlights")
    : null;
  const dimensionHighlights = narrative
    ? extractSection(narrative, "Dimension Highlights", "Cross-Assessment")
    : null;
  const crossAssessment = narrative ? extractSection(narrative, "Cross-Assessment") : null;

  if (isCoachView && permissionLevel === "score_summary") {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-6">
        <p className="text-sm text-muted-foreground">
          The client has limited coach access to scores only.
        </p>
      </div>
    );
  }

  const renderFacetList = (facets: FacetItem[], prefix: string) => (
    <div className="space-y-2">
      {facets.map((facet, idx) => {
        const facetName =
          PTP_ITEM_FACET_NAMES[facet.item_number ?? 0] ?? facet.item_text.slice(0, 40);
        const key = `${prefix}-${idx}`;
        const isExpanded = expandedFacets.has(key);
        const interpretation = getFacetInterpretation(facetName);
        const color = PTP_DIMENSION_COLORS[facet.dimension_id] ?? "#021F36";
        const score = Math.round(facet.value);
        return (
          <div key={key} className="rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => toggleFacet(key)}
              className="w-full text-left p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
            >
              <div
                className="w-2 h-8 rounded-sm shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="flex-1 font-medium text-sm">{facetName}</span>
              <span
                className="px-2 py-1 rounded text-xs font-semibold text-white"
                style={{ backgroundColor: color }}
              >
                {score}
              </span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {isExpanded && (
              <div className="p-4 border-t border-border bg-muted/20">
                {loadingInterpretations || !interpretation ? (
                  <p className="text-sm text-muted-foreground">Generating insights...</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-semibold text-sm mb-2">Impact on self</h5>
                      <ul className="space-y-1.5">
                        {interpretation.positive_self.map((item, i) => (
                          <li key={`ps-${i}`} className="flex gap-2 text-sm">
                            <span className="text-green-600 shrink-0">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                        {interpretation.negative_self.map((item, i) => (
                          <li key={`ns-${i}`} className="flex gap-2 text-sm">
                            <span className="text-red-600 shrink-0">✗</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-semibold text-sm mb-2">Impact on others</h5>
                      <ul className="space-y-1.5">
                        {interpretation.positive_others.map((item, i) => (
                          <li key={`po-${i}`} className="flex gap-2 text-sm">
                            <span className="text-green-600 shrink-0">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                        {interpretation.negative_others.map((item, i) => (
                          <li key={`no-${i}`} className="flex gap-2 text-sm">
                            <span className="text-red-600 shrink-0">✗</span>
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

  return (
    <div className="space-y-8">
      {profileOverview && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Profile overview</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{profileOverview}</p>
        </section>
      )}

      {dimensionHighlights && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Dimension highlights</h3>
          <div className="space-y-3">
            {dimensionScores.slice(0, 3).map(([dimId, score]) => {
              const color = PTP_DIMENSION_COLORS[dimId] ?? "#021F36";
              const name = dimensionNameMap.get(dimId) ?? dimId;
              const mean = Math.round(score.mean ?? 0);
              const dimText = extractDimensionText(dimensionHighlights, name);
              return (
                <div
                  key={dimId}
                  className="rounded-lg border border-border p-4 border-l-4"
                  style={{ borderLeftColor: color }}
                >
                  <h4 className="font-semibold text-sm mb-1">
                    {name} — {mean}
                  </h4>
                  {dimText && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{dimText}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!loadingFacets && elevatedFacets.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Driving facet insights — elevated</h3>
          {renderFacetList(elevatedFacets, "elevated")}
        </section>
      )}

      {!loadingFacets && suppressedFacets.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Driving facet insights — suppressed</h3>
          {renderFacetList(suppressedFacets, "suppressed")}
        </section>
      )}

      {crossAssessment && recommendations.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Cross-assessment connections</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{crossAssessment}</p>
        </section>
      )}
    </div>
  );
}

function extractSection(
  narrative: string,
  startMarker: string,
  endMarker?: string,
): string | null {
  const lines = narrative.split("\n");
  let capturing = false;
  const captured: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes(startMarker)) {
      capturing = true;
      continue;
    }
    if (endMarker && trimmed.includes(endMarker) && capturing) break;
    if (capturing && trimmed) captured.push(trimmed);
  }
  return captured.length > 0 ? captured.join(" ") : null;
}

function extractDimensionText(text: string, dimensionName: string): string | null {
  const idx = text.indexOf(dimensionName);
  if (idx === -1) return null;
  const after = text.slice(idx + dimensionName.length);
  const nextDim = after.search(/\b(Protection|Participation|Prediction|Purpose|Pleasure)\b/);
  const chunk = nextDim > 0 ? after.slice(0, nextDim) : after.slice(0, 400);
  return chunk.replace(/^[\s—:]+/, "").trim() || null;
}
