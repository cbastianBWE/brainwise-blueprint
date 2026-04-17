import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";


const NAI_DIMENSION_COLORS: Record<string, string> = {
  "DIM-NAI-01": "#021F36",
  "DIM-NAI-02": "#F5741A",
  "DIM-NAI-03": "#006D77",
  "DIM-NAI-04": "#3C096C",
  "DIM-NAI-05": "#FFB703",
};

const NAI_DIMENSION_PASTEL: Record<string, string> = {
  "DIM-NAI-01": "#E8EDF1",
  "DIM-NAI-02": "#FEF0E7",
  "DIM-NAI-03": "#E0F0F2",
  "DIM-NAI-04": "#EDE5F4",
  "DIM-NAI-05": "#FFF8E1",
};

const NAI_DIMENSION_NAMES: Record<string, string> = {
  "DIM-NAI-01": "Certainty",
  "DIM-NAI-02": "Agency",
  "DIM-NAI-03": "Fairness",
  "DIM-NAI-04": "Ego Stability",
  "DIM-NAI-05": "Saturation Threshold",
};

const NAI_ACTIVATION_BAND = (score: number): string => {
  if (score >= 76) return "High";
  if (score >= 51) return "Elevated";
  if (score >= 26) return "Moderate";
  return "Low";
};

interface DimensionScore {
  mean?: number;
  band?: string;
}

interface OutlierItem {
  item_number: number;
  facet_name: string;
  item_text: string;
  score: number;
  dimension_id: string;
}

interface ResponseRow extends OutlierItem {}

interface OtherAssessment {
  instrument_name: string;
  completed_at: string | null;
  result: { id: string };
}

interface NAINarrativeSectionsProps {
  assessmentResultId: string;
  assessmentId: string;
  dimensionScores: [string, DimensionScore][];
  dimensionNameMap: Map<string, string>;
  isCoachView?: boolean;
  permissionLevel?: "full_results" | "score_summary" | null;
  otherAssessments?: OtherAssessment[];
}

interface MappingRow {
  nai_dimension_id: string;
  primary_ptp_domain: string;
  secondary_ptp_domain: string;
  facets: any;
  coaching_questions: any;
}

export default function NAINarrativeSections({
  assessmentResultId,
  assessmentId,
  dimensionScores,
  dimensionNameMap,
  isCoachView = false,
  permissionLevel = null,
}: NAINarrativeSectionsProps) {
  const navigate = useNavigate();
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [outlierItems, setOutlierItems] = useState<OutlierItem[]>([]);
  const [interpretations, setInterpretations] = useState<Record<string, any>>({});
  const [ptpScores, setPtpScores] = useState<Record<string, DimensionScore> | null>(null);
  const [mappings, setMappings] = useState<Record<string, MappingRow>>({});
  const [loading, setLoading] = useState(true);
  const [responsesExpanded, setResponsesExpanded] = useState(false);
  const [expandedMapping, setExpandedMapping] = useState<Set<string>>(new Set());

  const dimNameOf = (dimId: string) =>
    dimensionNameMap.get(dimId) ?? NAI_DIMENSION_NAMES[dimId] ?? dimId;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);

      // Parallel initial fetches
      const [respRes, ptpResultRes] = await Promise.all([
        supabase
          .from("assessment_responses")
          .select("response_value_numeric, is_reverse_scored, item_id")
          .eq("assessment_id", assessmentId),
        supabase
          .from("assessment_results")
          .select("dimension_scores, instrument_id")
          .eq("instrument_id", "INST-002") // placeholder will be replaced below
          .limit(0), // not used directly
      ]);

      // Fetch PTP via assessments → results lookup using the user owning this NAI result
      const { data: thisResult } = await supabase
        .from("assessment_results")
        .select("user_id")
        .eq("id", assessmentResultId)
        .maybeSingle();

      let ptp: Record<string, DimensionScore> | null = null;
      if (thisResult?.user_id) {
        const { data: ptpRow } = await supabase
          .from("assessment_results")
          .select("dimension_scores")
          .eq("user_id", thisResult.user_id)
          .eq("instrument_id", "INST-001")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (ptpRow?.dimension_scores) {
          ptp = ptpRow.dimension_scores as Record<string, DimensionScore>;
        }
      }
      if (!cancelled) setPtpScores(ptp);

      // Build responses & outliers
      let allResponses: ResponseRow[] = [];
      let outliers: OutlierItem[] = [];
      const responsesData = respRes.data;
      if (responsesData?.length) {
        const itemIds = responsesData.map((r) => r.item_id);
        const { data: items } = await supabase
          .from("items")
          .select("item_id, item_text, item_number, dimension_id, facet_name")
          .in("item_id", itemIds);
        const itemMap = new Map((items ?? []).map((i) => [i.item_id, i]));

        allResponses = responsesData.map((r) => {
          const item = itemMap.get(r.item_id);
          const raw = Number(r.response_value_numeric);
          const value = r.is_reverse_scored ? 100 - raw : raw;
          return {
            item_number: item?.item_number ?? 0,
            facet_name: item?.facet_name ?? item?.item_text?.slice(0, 40) ?? "",
            item_text: item?.item_text ?? "",
            score: Math.round(value),
            dimension_id: item?.dimension_id ?? "",
          };
        });

        outliers = allResponses
          .filter((r) => r.score >= 75)
          .sort((a, b) => b.score - a.score);
      }
      if (!cancelled) {
        setResponses(allResponses);
        setOutlierItems(outliers);
      }

      // Required section_types
      const requiredSections = [
        "nai_profile_overview",
        ...Object.keys(NAI_DIMENSION_NAMES).map((d) => `nai_dimension_highlight_${d}`),
        ...outliers.map((o) => `nai_item_interpretation_${o.item_number}`),
        "nai_cross_assessment",
        ...(isCoachView
          ? Object.keys(NAI_DIMENSION_NAMES).map((d) => `nai_coach_questions_${d}`)
          : []),
      ];

      const { data: existing } = await supabase
        .from("facet_interpretations")
        .select("section_type, facet_data")
        .eq("assessment_result_id", assessmentResultId)
        .in("section_type", requiredSections);

      const interpMap: Record<string, any> = {};
      (existing ?? []).forEach((row) => {
        if (row.section_type) interpMap[row.section_type] = row.facet_data;
      });

      const missing = requiredSections.filter((s) => !(s in interpMap));

      if (missing.length > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        await supabase.functions.invoke("generate-facet-interpretations", {
          body: {
            assessment_result_id: assessmentResultId,
            instrument_id: "INST-002",
            nai_dimension_scores: Object.fromEntries(dimensionScores),
            nai_outlier_items: outliers,
            nai_ptp_scores: ptp ?? {},
            nai_is_coach: isCoachView,
          },
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        });

        const { data: refetched } = await supabase
          .from("facet_interpretations")
          .select("section_type, facet_data")
          .eq("assessment_result_id", assessmentResultId)
          .in("section_type", requiredSections);
        (refetched ?? []).forEach((row) => {
          if (row.section_type) interpMap[row.section_type] = row.facet_data;
        });
      }

      if (!cancelled) setInterpretations(interpMap);

      // Coach-only mappings for elevated dimensions
      if (isCoachView) {
        const elevatedDimIds = dimensionScores
          .filter(([, s]) => (s.mean ?? 0) >= 51)
          .map(([id]) => id);
        if (elevatedDimIds.length > 0) {
          const { data: maps } = await supabase
            .from("cafes_ptp_mapping")
            .select("nai_dimension_id, primary_ptp_domain, secondary_ptp_domain, facets, coaching_questions")
            .in("nai_dimension_id", elevatedDimIds);
          const m: Record<string, MappingRow> = {};
          (maps ?? []).forEach((row) => {
            m[row.nai_dimension_id] = row as MappingRow;
          });
          if (!cancelled) setMappings(m);
        }
      }

      if (!cancelled) setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentResultId, assessmentId, isCoachView]);

  const sortedDims = useMemo(
    () => Object.keys(NAI_DIMENSION_NAMES).map((d) => {
      const found = dimensionScores.find(([id]) => id === d);
      return [d, found?.[1] ?? { mean: 0 }] as [string, DimensionScore];
    }),
    [dimensionScores]
  );

  const elevatedCount = dimensionScores.filter(([, s]) => (s.mean ?? 0) >= 51).length;
  const egoElevated = dimensionScores.some(([id, s]) => id === "DIM-NAI-04" && (s.mean ?? 0) >= 51);
  const showPatternAlert = isCoachView && elevatedCount >= 3;

  const ptpCompleted = !!ptpScores && Object.keys(ptpScores).length > 0;
  const anyDim50Plus = dimensionScores.some(([, s]) => (s.mean ?? 0) >= 50);

  if (isCoachView && permissionLevel === "score_summary") {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-6">
        <p className="text-sm text-muted-foreground">
          The client has limited coach access to scores only.
        </p>
      </div>
    );
  }

  const profileOverview = interpretations.nai_profile_overview?.text;
  const crossAssessment = interpretations.nai_cross_assessment;

  const toggleMapping = (dimId: string) => {
    setExpandedMapping((prev) => {
      const next = new Set(prev);
      if (next.has(dimId)) next.delete(dimId);
      else next.add(dimId);
      return next;
    });
  };

  return (
    <div className="space-y-8">
      {/* Pattern alert (coach view) */}
      {showPatternAlert && (
        <section>
          <div
            className="rounded-lg p-4 border-l-4 flex gap-3"
            style={{ backgroundColor: "#FEF2F2", borderLeftColor: "#DC2626" }}
          >
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: "#7F1D1D" }}>
                Pattern alert — broad Protection activation.
              </p>
              <p className="text-sm mt-1" style={{ color: "#7F1D1D" }}>
                {elevatedCount} dimensions are elevated. Address the Protection system directly before working through individual dimensions.
                {egoElevated && " Ego Stability is among the elevated dimensions — begin there."}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Section 1: Profile overview */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Profile overview</h3>
        <div
          className="rounded-lg p-5"
          style={{ backgroundColor: "#F9F7F1", borderLeft: "4px solid #021F36", borderRadius: "0 8px 8px 0" }}
        >
          {loading || !profileOverview ? (
            <p className="text-sm text-muted-foreground">Generating profile overview...</p>
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: "#021F36" }}>
              {profileOverview}
            </p>
          )}
        </div>
      </section>

      {/* Section 2: NAI Overview placeholder */}
      <section>
        <div
          className="rounded-lg p-5"
          style={{ backgroundColor: "#F9F7F1", borderLeft: "4px solid #021F36", borderRadius: "0 8px 8px 0" }}
        >
          <h3 className="text-lg font-semibold mb-2" style={{ color: "#021F36" }}>NAI Overview</h3>
          <p className="text-sm leading-relaxed" style={{ color: "#6D6875" }}>
            Content coming soon. This section will provide a brief introduction to the Neuroscience Adoption Index framework, its neuroscientific basis, and how the five C.A.F.E.S. dimensions connect to the brain's protection system.
          </p>
        </div>
      </section>

      {/* Section 3: Dimension highlights */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Dimension highlights</h3>
        <div className="space-y-3">
          {sortedDims.map(([dimId, score]) => {
            const mean = Math.round(score.mean ?? 0);
            const color = NAI_DIMENSION_COLORS[dimId] ?? "#021F36";
            const pastel = NAI_DIMENSION_PASTEL[dimId] ?? "#F9F7F1";
            const name = dimNameOf(dimId);
            const band = NAI_ACTIVATION_BAND(mean);
            const data = interpretations[`nai_dimension_highlight_${dimId}`];
            const highlight = data?.highlight;
            const focus = data?.areas_of_focus;
            return (
              <div
                key={dimId}
                className="rounded-lg p-4 border-l-4"
                style={{ backgroundColor: pastel, borderLeftColor: color }}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h4 className="font-semibold text-sm" style={{ color }}>
                    {name} — {mean}
                  </h4>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: color + "20", color }}
                  >
                    {band}
                  </span>
                </div>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Generating...</p>
                ) : (
                  <>
                    {highlight && (
                      <p className="text-sm leading-relaxed text-foreground mb-2">{highlight}</p>
                    )}
                    {focus && (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-wide mt-2 mb-1" style={{ color }}>
                          Areas of focus
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{focus}</p>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 4: PTP prompt (client only) */}
      {!isCoachView && !ptpCompleted && anyDim50Plus && (
        <section>
          <div
            className="rounded-lg p-5 border"
            style={{ backgroundColor: "hsl(217 91% 97%)", borderColor: "hsl(217 91% 80%)" }}
          >
            <p className="text-sm text-foreground leading-relaxed mb-3">
              One or more of your C.A.F.E.S. dimensions are elevated. Completing the Personal Threat Profile (PTP) will unlock a cross-assessment analysis giving you significantly more insight into what is driving your scores.
            </p>
            <Button onClick={() => navigate("/assessment?instrument=INST-001")}>
              Complete the PTP
            </Button>
          </div>
        </section>
      )}

      {/* Section 5: Items needing attention (client) */}
      {!isCoachView && outlierItems.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Individual responses that warrant attention</h3>
          <div className="space-y-3">
            {outlierItems.map((item) => {
              const color = NAI_DIMENSION_COLORS[item.dimension_id] ?? "#021F36";
              const significant = item.score >= 85;
              const interp = interpretations[`nai_item_interpretation_${item.item_number}`];
              return (
                <div
                  key={item.item_number}
                  className="rounded-lg border-l-4 border border-border p-4 flex gap-3"
                  style={{ borderLeftColor: color }}
                >
                  <span
                    className="px-2 py-1 rounded text-sm font-bold text-white shrink-0 h-fit"
                    style={{ backgroundColor: color }}
                  >
                    {item.score}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{item.facet_name}</p>
                    <p className="text-xs mt-0.5">
                      <span style={{ color }}>{dimNameOf(item.dimension_id)}</span>
                      <span className="mx-2 text-muted-foreground">•</span>
                      <span style={{ color: significant ? "#DC2626" : "#F59E0B", fontWeight: 600 }}>
                        {significant ? "Significant (85+)" : "Notable (75+)"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 italic">{item.item_text}</p>
                    {loading || !interp?.text ? (
                      <p className="text-sm text-muted-foreground mt-2">Generating interpretation...</p>
                    ) : (
                      <p className="text-sm text-foreground mt-2 leading-relaxed">{interp.text}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 6: Item outliers (coach view) */}
      {isCoachView && outlierItems.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Individual item outliers</h3>
          <div className="space-y-3">
            {outlierItems.map((item) => {
              const color = NAI_DIMENSION_COLORS[item.dimension_id] ?? "#021F36";
              const significant = item.score >= 85;
              const interp = interpretations[`nai_item_interpretation_${item.item_number}`];
              const mapping = mappings[item.dimension_id];
              const relatedFacets: any[] = Array.isArray(mapping?.facets) ? mapping.facets : [];
              return (
                <div
                  key={item.item_number}
                  className="rounded-lg border-l-4 border border-border p-4 flex gap-3"
                  style={{ borderLeftColor: color }}
                >
                  <span
                    className="px-2 py-1 rounded text-sm font-bold text-white shrink-0 h-fit"
                    style={{ backgroundColor: color }}
                  >
                    {item.score}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{item.facet_name}</p>
                    <p className="text-xs mt-0.5">
                      <span style={{ color }}>{dimNameOf(item.dimension_id)}</span>
                      <span className="mx-2 text-muted-foreground">•</span>
                      <span style={{ color: significant ? "#DC2626" : "#F59E0B", fontWeight: 600 }}>
                        {significant ? "Significant (85+)" : "Notable (75+)"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 italic">{item.item_text}</p>
                    {relatedFacets.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        <span className="font-semibold">Related PTP facets:</span>{" "}
                        {relatedFacets
                          .map((f: any) => {
                            const refs = [f.work_item, f.social_item].filter(Boolean).join(", ");
                            return refs ? `${f.name ?? f.facet_name} (${refs})` : (f.name ?? f.facet_name);
                          })
                          .filter(Boolean)
                          .join("; ")}
                      </p>
                    )}
                    {loading || !interp?.text ? (
                      <p className="text-sm text-muted-foreground mt-2">Generating interpretation...</p>
                    ) : (
                      <p className="text-sm text-foreground mt-2 leading-relaxed">{interp.text}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 7: C.A.F.E.S.-PTP mapping (coach view) */}
      {isCoachView && Object.keys(mappings).length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">C.A.F.E.S.–PTP mapping</h3>
          <div className="space-y-3">
            {sortedDims
              .filter(([dimId, s]) => (s.mean ?? 0) >= 51 && mappings[dimId])
              .map(([dimId, score]) => {
                const mapping = mappings[dimId];
                const color = NAI_DIMENSION_COLORS[dimId] ?? "#021F36";
                const pastel = NAI_DIMENSION_PASTEL[dimId] ?? "#F9F7F1";
                const mean = Math.round(score.mean ?? 0);
                const band = NAI_ACTIVATION_BAND(mean);
                const isOpen = expandedMapping.has(dimId);
                const aiQuestions = interpretations[`nai_coach_questions_${dimId}`]?.questions;
                const fallbackQuestions = Array.isArray(mapping.coaching_questions)
                  ? mapping.coaching_questions
                  : [];
                const questions: string[] = Array.isArray(aiQuestions) && aiQuestions.length > 0
                  ? aiQuestions
                  : fallbackQuestions;
                const facets: any[] = Array.isArray(mapping.facets) ? mapping.facets : [];
                return (
                  <div key={dimId} className="rounded-lg border overflow-hidden" style={{ borderColor: color + "40" }}>
                    <button
                      onClick={() => toggleMapping(dimId)}
                      className="w-full text-left p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                      style={{ backgroundColor: pastel }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color }}>
                            {dimNameOf(dimId)} — {mean}
                          </span>
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: color + "20", color }}
                          >
                            {band}
                          </span>
                        </div>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-4 border-t border-border space-y-4 bg-background">
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-muted font-medium">
                            Primary: {mapping.primary_ptp_domain}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-muted font-medium">
                            Secondary: {mapping.secondary_ptp_domain}
                          </span>
                        </div>
                        {facets.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                              PTP facets
                            </p>
                            <ul className="space-y-1">
                              {facets.map((f: any, i: number) => {
                                const refs = [f.work_item, f.social_item].filter(Boolean).join(", ");
                                return (
                                  <li key={i} className="text-sm text-foreground">
                                    • {f.name ?? f.facet_name}
                                    {refs && <span className="text-muted-foreground"> ({refs})</span>}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                        {questions.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                              Opening coaching questions
                            </p>
                            <ul className="space-y-2">
                              {questions.map((q, i) => (
                                <li key={i} className="text-sm text-foreground leading-relaxed">
                                  {i + 1}. {q}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* Section 8: Cross-assessment interpretation */}
      {ptpCompleted && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Cross-assessment interpretation</h3>
          <div
            className="rounded-lg p-5"
            style={{ backgroundColor: "#F9F7F1", borderLeft: "4px solid #021F36", borderRadius: "0 8px 8px 0" }}
          >
            {loading || !crossAssessment ? (
              <p className="text-sm text-muted-foreground">Generating cross-assessment analysis...</p>
            ) : (
              <>
                {crossAssessment.interpretation && (
                  <p className="text-sm leading-relaxed text-foreground mb-4">
                    {crossAssessment.interpretation}
                  </p>
                )}
                {Array.isArray(crossAssessment.suggestions) && crossAssessment.suggestions.length > 0 && (
                  <>
                    <h4 className="text-sm font-semibold mb-2" style={{ color: "#021F36" }}>
                      Suggested ways to support yourself
                    </h4>
                    <ul className="space-y-1.5">
                      {crossAssessment.suggestions.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-foreground flex gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/50 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* Section 9: All responses (collapsible) */}
      {responses.length > 0 && (
        <section>
          <button
            onClick={() => setResponsesExpanded((p) => !p)}
            className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors text-left"
          >
            <h3 className="text-lg font-semibold">
              Your assessment responses — all {responses.length} questions
            </h3>
            {responsesExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </button>
          {responsesExpanded && (
            <div className="border border-border rounded-lg overflow-hidden mt-2">
              {[...responses]
                .sort((a, b) => a.item_number - b.item_number)
                .map((r) => {
                  const color = NAI_DIMENSION_COLORS[r.dimension_id] ?? "#021F36";
                  return (
                    <div
                      key={r.item_number}
                      className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0"
                    >
                      <div
                        className="w-1 shrink-0 self-stretch rounded-sm"
                        style={{ backgroundColor: color, minHeight: "40px" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          Q{r.item_number} — <span style={{ color }}>{r.facet_name}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed truncate">
                          {r.item_text}
                        </p>
                      </div>
                      <span
                        className="px-2 py-1 rounded text-xs font-semibold text-white shrink-0 mt-0.5"
                        style={{ backgroundColor: color }}
                      >
                        {r.score}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
