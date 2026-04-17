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

interface ResponseRow {
  item_number: number;
  facet_name: string;
  item_text: string;
  score: number | null;
  dimension_id: string;
  has_response: boolean;
}

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
  const [ptpScores, setPtpScores] = useState<Record<string, any> | null>(null);
  const [mappings, setMappings] = useState<Record<string, MappingRow>>({});
  const [loading, setLoading] = useState(true);
  const [responsesExpanded, setResponsesExpanded] = useState(false);
  const [expandedMapping, setExpandedMapping] = useState<Set<string>>(new Set());
  const [expandedResponseId, setExpandedResponseId] = useState<number | null>(null);

  const dimNameOf = (dimId: string) =>
    dimensionNameMap.get(dimId) ?? NAI_DIMENSION_NAMES[dimId] ?? dimId;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);

      const { data: allItems } = await supabase
        .from("items")
        .select("item_id, item_text, item_number, dimension_id, facet_name")
        .eq("instrument_id", "INST-002")
        .order("item_number");

      const { data: responsesData } = await supabase
        .from("assessment_responses")
        .select("response_value_numeric, is_reverse_scored, item_id")
        .eq("assessment_id", assessmentId);

      const { data: thisResult } = await supabase
        .from("assessment_results")
        .select("user_id")
        .eq("id", assessmentResultId)
        .maybeSingle();

      let ptp: Record<string, any> | null = null;
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
          ptp = ptpRow.dimension_scores as Record<string, any>;
        }
      }
      if (!cancelled) setPtpScores(ptp);

      const responseByItem = new Map(
        (responsesData ?? []).map((r) => [r.item_id, r])
      );
      const allResponses: ResponseRow[] = (allItems ?? []).map((item) => {
        const r = responseByItem.get(item.item_id);
        let score: number | null = null;
        if (r) {
          const raw = Number(r.response_value_numeric);
          score = Math.round(r.is_reverse_scored ? 100 - raw : raw);
        }
        return {
          item_number: item.item_number ?? 0,
          facet_name: item.facet_name ?? item.item_text?.slice(0, 40) ?? "",
          item_text: item.item_text ?? "",
          score,
          dimension_id: item.dimension_id ?? "",
          has_response: !!r,
        };
      });

      const outliers: OutlierItem[] = allResponses
        .filter((r) => r.has_response && (r.score ?? 0) >= 75)
        .map((r) => ({
          item_number: r.item_number,
          facet_name: r.facet_name,
          item_text: r.item_text,
          score: r.score ?? 0,
          dimension_id: r.dimension_id,
        }))
        .sort((a, b) => b.score - a.score);

      if (!cancelled) {
        setResponses(allResponses);
        setOutlierItems(outliers);
      }

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
        } else {
          if (!cancelled) setMappings({});
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
      <section>
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          The client has limited coach access to scores only.
        </div>
      </section>
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

  const toggleResponseCard = (itemNumber: number) => {
    setExpandedResponseId((prev) => (prev === itemNumber ? null : itemNumber));
  };

  const renderOutlierSection = () => {
    if (outlierItems.length === 0) return null;
    return (
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Individual responses that warrant attention</h3>
        <div className="space-y-2">
          {outlierItems.map((item) => {
            const color = NAI_DIMENSION_COLORS[item.dimension_id] ?? "#021F36";
            const significant = item.score >= 85;
            const interp = interpretations[`nai_item_interpretation_${item.item_number}`];
            const mapping = mappings[item.dimension_id];
            const relatedFacets: any[] = Array.isArray(mapping?.facets) ? mapping.facets : [];
            const isOpen = expandedResponseId === item.item_number;

            return (
              <div key={item.item_number} className="rounded-lg border border-border overflow-hidden bg-card">
                <button
                  onClick={() => toggleResponseCard(item.item_number)}
                  className="w-full text-left p-4 flex gap-3 items-start hover:bg-muted/20 transition-colors"
                >
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{ backgroundColor: color }}
                  >
                    {item.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">{item.facet_name}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                      <span>{dimNameOf(item.dimension_id)}</span>
                      <span>•</span>
                      <span className={significant ? "font-semibold text-foreground" : ""}>
                        {significant ? "Significant (85+)" : "Notable (75+)"}
                      </span>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border bg-muted/10">
                    <p className="text-sm text-foreground italic mt-3">"{item.item_text}"</p>
                    {isCoachView && relatedFacets.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Related PTP facets:</span>{" "}
                        {relatedFacets
                          .map((f: any) => {
                            const workRef = Array.isArray(f.work_items) ? f.work_items[0] : f.work_item;
                            const socialRef = Array.isArray(f.social_items) ? f.social_items[0] : f.social_item;
                            const refs = [workRef, socialRef].filter(Boolean).join(", ");
                            const name = f.name ?? f.facet_name;
                            return refs ? `${name} (${refs})` : name;
                          })
                          .filter(Boolean)
                          .join("; ")}
                      </p>
                    )}
                    {loading || !interp?.text ? (
                      <p className="text-sm text-muted-foreground italic">Generating interpretation...</p>
                    ) : (
                      <p className="text-sm text-foreground whitespace-pre-line">{interp.text}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6">
      {showPatternAlert && (
        <div
          className="rounded-lg p-4 border-l-4"
          style={{ backgroundColor: "#F9F7F1", borderLeftColor: "#021F36" }}
        >
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "#021F36" }} />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                Pattern alert — broad Protection activation.
              </p>
              <p className="text-sm text-foreground">
                {elevatedCount} dimensions are elevated. Address the Protection system directly before working through individual dimensions.
                {egoElevated && " Ego Stability is among the elevated dimensions — begin there."}
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Profile overview</h3>
        <div
          className="rounded-lg p-5 border-l-4"
          style={{ backgroundColor: "#F9F7F1", borderLeftColor: "#021F36" }}
        >
          {loading || !profileOverview ? (
            <p className="text-sm text-muted-foreground italic">Generating profile overview...</p>
          ) : (
            <p className="text-sm text-foreground whitespace-pre-line">{profileOverview}</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-lg font-semibold text-foreground mb-2">NAI Overview</h3>
          <p className="text-sm text-muted-foreground">
            Content coming soon. This section will provide a brief introduction to the Neuroscience Adoption Index framework, its neuroscientific basis, and how the five C.A.F.E.S. dimensions connect to the brain's protection system.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Dimension highlights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                className="rounded-lg p-4 border-l-4 space-y-2"
                style={{ backgroundColor: pastel, borderLeftColor: color }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold" style={{ color }}>
                    {name} — {mean}
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium text-white flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {band}
                  </span>
                </div>
                {loading ? (
                  <p className="text-xs text-muted-foreground italic">Generating...</p>
                ) : (
                  <>
                    {highlight && <p className="text-sm text-foreground">{highlight}</p>}
                    {focus && (
                      <>
                        <div className="text-xs font-semibold text-foreground mt-2 uppercase tracking-wide">
                          Areas of focus
                        </div>
                        <p className="text-sm text-foreground">{focus}</p>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {!isCoachView && !ptpCompleted && anyDim50Plus && (
        <section>
          <div
            className="rounded-lg p-5 border-l-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            style={{ backgroundColor: "#F9F7F1", borderLeftColor: "#021F36" }}
          >
            <p className="text-sm text-foreground flex-1">
              One or more of your C.A.F.E.S. dimensions are elevated. Completing the Personal Threat Profile (PTP) will unlock a cross-assessment analysis giving you significantly more insight into what is driving your scores.
            </p>
            <Button onClick={() => navigate("/assessment?instrument=INST-001")}>
              Complete the PTP
            </Button>
          </div>
        </section>
      )}

      {renderOutlierSection()}

      {isCoachView && Object.keys(mappings).length > 0 && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">C.A.F.E.S.–PTP mapping</h3>
          <div className="space-y-2">
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
                  <div key={dimId} className="rounded-lg border border-border overflow-hidden">
                    <button
                      onClick={() => toggleMapping(dimId)}
                      className="w-full text-left p-4 flex items-center gap-3 hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: pastel, borderLeft: `4px solid ${color}` }}
                    >
                      <div className="flex-1 flex items-center gap-3 flex-wrap">
                        <span className="font-semibold" style={{ color }}>
                          {dimNameOf(dimId)} — {mean}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                          style={{ backgroundColor: color }}
                        >
                          {band}
                        </span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-4 space-y-3 bg-card border-t border-border">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                          <span><span className="font-medium text-foreground">Primary:</span> <span className="text-muted-foreground">{mapping.primary_ptp_domain}</span></span>
                          <span><span className="font-medium text-foreground">Secondary:</span> <span className="text-muted-foreground">{mapping.secondary_ptp_domain}</span></span>
                        </div>
                        {facets.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">
                              PTP facets
                            </div>
                            <ul className="text-sm text-foreground space-y-0.5">
                              {facets.map((f: any, i: number) => {
                                const workRef = Array.isArray(f.work_items) ? f.work_items[0] : f.work_item;
                                const socialRef = Array.isArray(f.social_items) ? f.social_items[0] : f.social_item;
                                const refs = [workRef, socialRef].filter(Boolean).join(", ");
                                return (
                                  <li key={i}>
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
                            <div className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">
                              Opening coaching questions
                            </div>
                            <ol className="text-sm text-foreground space-y-1">
                              {questions.map((q, i) => (
                                <li key={i}>{i + 1}. {q}</li>
                              ))}
                            </ol>
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

      {ptpCompleted && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Cross-assessment interpretation</h3>
          <div
            className="rounded-lg p-5 border-l-4 space-y-3"
            style={{ backgroundColor: "#F9F7F1", borderLeftColor: "#021F36" }}
          >
            {loading || !crossAssessment ? (
              <p className="text-sm text-muted-foreground italic">Generating cross-assessment analysis...</p>
            ) : (
              <>
                {crossAssessment.interpretation && (
                  <p className="text-sm text-foreground whitespace-pre-line">{crossAssessment.interpretation}</p>
                )}
                {Array.isArray(crossAssessment.suggestions) && crossAssessment.suggestions.length > 0 && (
                  <>
                    <div className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      Suggested ways to support yourself
                    </div>
                    <ul className="text-sm text-foreground space-y-1">
                      {crossAssessment.suggestions.map((s: string, i: number) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-muted-foreground">•</span>
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

      {responses.length > 0 && (
        <section>
          <button
            onClick={() => setResponsesExpanded((p) => !p)}
            className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors text-left"
          >
            <span className="font-medium text-foreground">
              Your assessment responses — all {responses.length} questions
            </span>
            {responsesExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {responsesExpanded && (
            <div className="mt-3 space-y-2">
              {[...responses]
                .sort((a, b) => a.item_number - b.item_number)
                .map((r) => {
                  const color = NAI_DIMENSION_COLORS[r.dimension_id] ?? "#021F36";
                  return (
                    <div
                      key={r.item_number}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
                    >
                      <div
                        className="flex-shrink-0 w-1 self-stretch rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-muted-foreground">
                          Q{r.item_number} — {r.facet_name}
                        </div>
                        <div className="text-sm text-foreground mt-0.5">{r.item_text}</div>
                      </div>
                      {r.has_response && r.score !== null ? (
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                          style={{ backgroundColor: color }}
                        >
                          {r.score}
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-muted text-muted-foreground text-xs font-semibold">
                          —
                        </div>
                      )}
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
