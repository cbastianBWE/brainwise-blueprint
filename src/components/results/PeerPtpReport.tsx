import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PTP_DIMENSION_COLORS } from "@/lib/ptpDimensionColors";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  targetUserId: string;
  ownerName: string | null;
}

const DIM_NAMES: Record<string, string> = {
  "DIM-PTP-01": "Protection",
  "DIM-PTP-02": "Participation",
  "DIM-PTP-03": "Prediction",
  "DIM-PTP-04": "Purpose",
  "DIM-PTP-05": "Pleasure",
};
const DIM_IDS = ["DIM-PTP-01", "DIM-PTP-02", "DIM-PTP-03", "DIM-PTP-04", "DIM-PTP-05"];

type Ctx = "professional" | "personal" | "combined";

interface ResultRow {
  assessment_result_id: string;
  assessment_id: string;
  context_type: "professional" | "personal" | "both" | null;
  instrument_version: string;
  created_at: string;
  dimension_scores: Record<string, { mean?: number; band?: string }> | null;
  overall_profile: any | null;
}

interface SectionRow {
  assessment_result_id: string;
  section_type: string;
  facet_data: any;
}

interface RpcPayload {
  visible: boolean;
  groups?: { scores: boolean; interpretation: boolean; impact: boolean };
  results?: ResultRow[];
  sections?: SectionRow[];
}

function bandFor(mean: number): { label: string; } {
  if (mean >= 70) return { label: "High" };
  if (mean >= 40) return { label: "Moderate" };
  return { label: "Low" };
}

function ctxToSuffix(c: ResultRow["context_type"]): Ctx | null {
  if (c === "both") return "combined";
  if (c === "professional" || c === "personal") return c;
  return null;
}

export default function PeerPtpReport({ targetUserId, ownerName }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RpcPayload | null>(null);
  const [ctx, setCtx] = useState<Ctx>("professional");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    (async () => {
      const { data, error } = await (supabase as any).rpc("get_peer_ptp_report", {
        p_owner: targetUserId,
      });
      if (cancelled) return;
      if (error) {
        console.error("get_peer_ptp_report error:", error);
        setData({ visible: false });
      } else {
        setData((data as RpcPayload) ?? { visible: false });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [targetUserId]);

  const availableContexts = useMemo<Ctx[]>(() => {
    if (!data?.visible) return [];
    const set = new Set<Ctx>();
    (data.results ?? []).forEach((r) => {
      const s = ctxToSuffix(r.context_type);
      if (s) set.add(s);
    });
    (data.sections ?? []).forEach((s) => {
      if (s.section_type.endsWith("_professional")) set.add("professional");
      else if (s.section_type.endsWith("_personal")) set.add("personal");
      else if (s.section_type.endsWith("_combined")) set.add("combined");
    });
    return (["professional", "personal", "combined"] as Ctx[]).filter((c) => set.has(c));
  }, [data]);

  useEffect(() => {
    if (availableContexts.length && !availableContexts.includes(ctx)) {
      setCtx(availableContexts[0]);
    }
  }, [availableContexts, ctx]);

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!data || !data.visible) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-lg text-foreground">
          {ownerName ?? "This colleague"}'s results aren't available.
        </p>
      </div>
    );
  }

  const groups = data.groups ?? { scores: false, interpretation: false, impact: false };
  const sections = data.sections ?? [];
  const results = data.results ?? [];

  const currentResult = results.find((r) => ctxToSuffix(r.context_type) === ctx) ?? null;
  const sec = (type: string) => sections.find((s) => s.section_type === type && (currentResult ? s.assessment_result_id === currentResult.assessment_result_id : true));

  const drivingFacets = sec(`driving_facets_${ctx}`)?.facet_data ?? null;
  const profileOverview = sec(`profile_overview_${ctx}`)?.facet_data ?? null;
  const personalSummary = sec(`personal_summary_${ctx}`)?.facet_data ?? null;
  const dimensionHighlights = sec(`dimension_highlights_${ctx}`)?.facet_data ?? null;
  const crossAndAction = sec(`cross_and_action_${ctx}`)?.facet_data ?? null;
  const facetInsights = sec(`facet_insights_all`)?.facet_data ?? null;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {ownerName ?? "Colleague"} — PTP Report
        </h1>
      </div>

      {availableContexts.length > 1 && (
        <Tabs value={ctx} onValueChange={(v) => setCtx(v as Ctx)}>
          <TabsList>
            {availableContexts.includes("professional") && (
              <TabsTrigger value="professional">Professional</TabsTrigger>
            )}
            {availableContexts.includes("personal") && (
              <TabsTrigger value="personal">Personal</TabsTrigger>
            )}
            {availableContexts.includes("combined") && (
              <TabsTrigger value="combined">Combined</TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      )}

      {/* SCORES */}
      {groups.scores && (
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-foreground">Dimension scores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DIM_IDS.map((dimId) => {
              const score = currentResult?.dimension_scores?.[dimId];
              const mean = typeof score?.mean === "number" ? score.mean : null;
              const color = PTP_DIMENSION_COLORS[dimId];
              const label = mean != null ? bandFor(mean).label : (score?.band ?? "—");
              return (
                <Card key={dimId} className="p-4 border-l-4" style={{ borderLeftColor: color }}>
                  <div className="text-sm font-semibold text-foreground">{DIM_NAMES[dimId]}</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold" style={{ color }}>
                      {mean != null ? Math.round(mean) : "—"}
                    </span>
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {drivingFacets && (Array.isArray(drivingFacets.elevated) || Array.isArray(drivingFacets.suppressed)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">High scoring drivers</h3>
                <ul className="space-y-1.5">
                  {(drivingFacets.elevated ?? []).map((f: any, i: number) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span style={{ color: PTP_DIMENSION_COLORS[f.dimension_id] }}>{f.facet_name}</span>
                      <span className="font-medium text-foreground">{Math.round(f.value)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Low scoring drivers</h3>
                <ul className="space-y-1.5">
                  {(drivingFacets.suppressed ?? []).map((f: any, i: number) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span style={{ color: PTP_DIMENSION_COLORS[f.dimension_id] }}>{f.facet_name}</span>
                      <span className="font-medium text-foreground">{Math.round(f.value)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </section>
      )}

      {/* INTERPRETATION */}
      {groups.interpretation && (
        <section className="space-y-6">
          {profileOverview?.text && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Profile overview</h2>
              <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {profileOverview.text}
              </p>
            </div>
          )}

          {Array.isArray(personalSummary?.personal_summary) && personalSummary.personal_summary.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">What this means</h2>
              <ol className="list-decimal list-inside space-y-2 text-foreground/90">
                {personalSummary.personal_summary.map((item: string, i: number) => (
                  <li key={i} className="leading-relaxed">{item}</li>
                ))}
              </ol>
            </div>
          )}

          {dimensionHighlights && typeof dimensionHighlights === "object" && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">Dimension highlights</h2>
              <div className="space-y-3">
                {DIM_IDS.filter((d) => dimensionHighlights[d]).map((dimId) => (
                  <Card
                    key={dimId}
                    className="p-4 border-l-4"
                    style={{ borderLeftColor: PTP_DIMENSION_COLORS[dimId] }}
                  >
                    <h3 className="text-sm font-semibold text-foreground mb-1">{DIM_NAMES[dimId]}</h3>
                    <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {dimensionHighlights[dimId]}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {crossAndAction && (
            <>
              {Array.isArray(crossAndAction.action_plan) && crossAndAction.action_plan.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">Suggested next steps</h2>
                  <div className="space-y-3">
                    {crossAndAction.action_plan.map((step: any, i: number) => (
                      <Card key={i} className="p-4">
                        <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                        {step.rationale && (
                          <p className="text-sm text-muted-foreground mt-1">{step.rationale}</p>
                        )}
                        {Array.isArray(step.steps) && step.steps.length > 0 && (
                          <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-foreground/90">
                            {step.steps.map((s: string, j: number) => (
                              <li key={j}>{s}</li>
                            ))}
                          </ul>
                        )}
                        {Array.isArray(step.dimension_tags) && step.dimension_tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {step.dimension_tags.map((tag: string) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: PTP_DIMENSION_COLORS[tag] ?? "var(--muted)" }}
                              >
                                {DIM_NAMES[tag] ?? tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {typeof crossAndAction.cross_assessment === "string" && crossAndAction.cross_assessment.trim() && (
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">Cross-assessment connections</h2>
                  <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {crossAndAction.cross_assessment}
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* IMPACT */}
      {groups.impact && Array.isArray(facetInsights) && facetInsights.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Impact statements</h2>
          <div className="space-y-4">
            {facetInsights.map((facet: any, i: number) => (
              <Card key={i} className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">{facet.name}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                      Impact on self
                    </h4>
                    <ul className="space-y-1.5">
                      {(facet.positive_self ?? []).map((t: string, j: number) => (
                        <li key={`ps-${j}`} className="flex gap-2 text-sm text-foreground/90">
                          <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          <span>{t}</span>
                        </li>
                      ))}
                      {(facet.negative_self ?? []).map((t: string, j: number) => (
                        <li key={`ns-${j}`} className="flex gap-2 text-sm text-foreground/90">
                          <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                      Impact on others
                    </h4>
                    <ul className="space-y-1.5">
                      {(facet.positive_others ?? []).map((t: string, j: number) => (
                        <li key={`po-${j}`} className="flex gap-2 text-sm text-foreground/90">
                          <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          <span>{t}</span>
                        </li>
                      ))}
                      {(facet.negative_others ?? []).map((t: string, j: number) => (
                        <li key={`no-${j}`} className="flex gap-2 text-sm text-foreground/90">
                          <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
