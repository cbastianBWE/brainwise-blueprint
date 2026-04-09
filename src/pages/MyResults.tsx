import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAiUsage } from "@/hooks/useAiUsage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { FileText, MessageSquare, RefreshCw, ArrowRight, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import DrivingFacetScores from "@/components/results/DrivingFacetScores";

// Types
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

interface AssessmentResult {
  id: string;
  assessment_id: string;
  user_id: string;
  instrument_id: string | null;
  instrument_version: string | null;
  dimension_scores: Record<string, DimensionScore>;
  overall_profile: OverallProfile | null;
  ai_narrative: string | null;
  ai_version: string | null;
  created_at: string;
}

interface AssessmentWithResult {
  result: AssessmentResult;
  completed_at: string | null;
  instrument_name: string;
  scale_type: string | null;
  isPTP: boolean;
}

const BAND_COLORS: Record<string, string> = {
  high: "#1F4E79",
  moderate_high: "#2E75B6",
  moderate: "#8EA9C1",
  moderate_low: "#F4B942",
  low: "#E07B00",
};

const PTP_DIMENSION_COLORS: Record<string, string> = {
  "DIM-PTP-01": "#1F4E79",
  "DIM-PTP-02": "#2E75B6",
  "DIM-PTP-03": "#4BACC6",
  "DIM-PTP-04": "#70AD47",
  "DIM-PTP-05": "#ED7D31",
};

const READINESS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Foundational: { bg: "hsl(45 93% 95%)", text: "hsl(45 93% 30%)", border: "hsl(45 93% 47%)" },
  Proficient: { bg: "hsl(217 91% 95%)", text: "hsl(217 91% 30%)", border: "hsl(217 91% 50%)" },
  Advanced: { bg: "hsl(142 71% 95%)", text: "hsl(142 71% 25%)", border: "hsl(142 71% 45%)" },
};

export default function MyResults() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [assessments, setAssessments] = useState<AssessmentWithResult[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [pollingNarrative, setPollingNarrative] = useState(false);
  const [dimensionNameMap, setDimensionNameMap] = useState<Map<string, string>>(new Map());
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratedVersion, setRegeneratedVersion] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState<{ limit: number; tier: string } | null>(null);
  const { fetchUsage } = useAiUsage();

  // Fetch all completed assessment results
  useEffect(() => {
    if (!user) return;

    const fetchResults = async () => {
      setLoading(true);

      // Get all results for this user
      const { data: results, error: resultsErr } = await supabase
        .from("assessment_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (resultsErr || !results?.length) {
        setLoading(false);
        return;
      }

      // Get assessment details
      const assessmentIds = results.map((r) => r.assessment_id);
      const { data: assessmentRows } = await supabase
        .from("assessments")
        .select("id, completed_at, instrument_id")
        .in("id", assessmentIds);

      // Get unique instrument IDs
      const instrumentIds = [
        ...new Set(results.map((r) => r.instrument_id).filter(Boolean)),
      ] as string[];
      const { data: instruments } = await supabase
        .from("instruments")
        .select("instrument_id, instrument_name, scale_type")
        .in("instrument_id", instrumentIds);

      // Fetch dimension names for display
      const { data: dimensionRows } = await supabase
        .from("dimensions")
        .select("dimension_id, dimension_name")
        .in("instrument_id", instrumentIds);

      const dimNameMap = new Map(
        (dimensionRows ?? []).map((d) => [d.dimension_id, d.dimension_name])
      );
      setDimensionNameMap(dimNameMap);

      const instrumentMap = new Map(
        (instruments ?? []).map((i) => [i.instrument_id, i])
      );
      const assessmentMap = new Map(
        (assessmentRows ?? []).map((a) => [a.id, a])
      );

      const combined: AssessmentWithResult[] = results.map((r) => {
        const assessment = assessmentMap.get(r.assessment_id);
        const instrument = instrumentMap.get(r.instrument_id ?? "");
        return {
          result: r as unknown as AssessmentResult,
          completed_at: assessment?.completed_at ?? r.created_at,
          instrument_name: instrument?.instrument_name ?? r.instrument_id ?? "Unknown",
          scale_type: instrument?.scale_type ?? null,
          isPTP: (r.instrument_id ?? "").toUpperCase().includes("INST-001"),
        };
      });

      setAssessments(combined);
      setSelectedId(combined[0]?.result.id ?? "");
      setLoading(false);
    };

    fetchResults();
  }, [user]);

  // Selected assessment
  const selected = useMemo(
    () => assessments.find((a) => a.result.id === selectedId),
    [assessments, selectedId]
  );

  // Poll for AI narrative
  useEffect(() => {
    if (!selected || selected.result.ai_narrative) {
      setPollingNarrative(false);
      return;
    }

    setPollingNarrative(true);
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("assessment_results")
        .select("ai_narrative, ai_version")
        .eq("id", selected.result.id)
        .single();

      if (data?.ai_narrative) {
        setAssessments((prev) =>
          prev.map((a) =>
            a.result.id === selected.result.id
              ? {
                  ...a,
                  result: {
                    ...a.result,
                    ai_narrative: data.ai_narrative,
                    ai_version: data.ai_version,
                  },
                }
              : a
          )
        );
        setPollingNarrative(false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selected?.result.id, selected?.result.ai_narrative]);

  // Regenerate handler
  const handleRegenerate = useCallback(async () => {
    if (!selected) return;
    setRegenerating(true);
    setRegeneratedVersion(null);
    setLimitReached(null);

    // Check usage first
    const usageData = await fetchUsage(profile?.subscription_tier ?? "base");
    if (usageData && !usageData.allowed) {
      setLimitReached({ limit: usageData.limit, tier: usageData.tier ?? "base" });
      setRegenerating(false);
      return;
    }

    // Call generate-report
    const { error } = await supabase.functions.invoke("generate-report", {
      body: { assessment_result_id: selected.result.id },
    });

    if (error) {
      toast({ title: "Error", description: "Failed to regenerate interpretation.", variant: "destructive" });
      setRegenerating(false);
      return;
    }

    // Poll for updated narrative
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("assessment_results")
        .select("ai_narrative, ai_version")
        .eq("id", selected.result.id)
        .single();

      if (data?.ai_narrative && data.ai_narrative !== selected.result.ai_narrative) {
        setAssessments((prev) =>
          prev.map((a) =>
            a.result.id === selected.result.id
              ? { ...a, result: { ...a.result, ai_narrative: data.ai_narrative, ai_version: data.ai_version } }
              : a
          )
        );
        setRegeneratedVersion(data.ai_version);
        setRegenerating(false);
        clearInterval(poll);
      }
    }, 5000);

    // Timeout after 2 minutes
    setTimeout(() => {
      clearInterval(poll);
      setRegenerating(false);
    }, 120000);
  }, [selected, fetchUsage, profile?.subscription_tier, toast]);

  // Derived data
  const dimensionScores = selected
    ? Object.entries(selected.result.dimension_scores)
    : [];

  const sortedDimensions = useMemo(() => {
    if (!dimensionScores.length) return [];
    return [...dimensionScores].sort((a, b) => {
      const aVal = a[1].mean ?? a[1].level_mean ?? 0;
      const bVal = b[1].mean ?? b[1].level_mean ?? 0;
      return bVal - aVal;
    });
  }, [dimensionScores]);

  const highestDimension = sortedDimensions[0]?.[0] ?? "—";
  const lowestDimension =
    sortedDimensions[sortedDimensions.length - 1]?.[0] ?? "—";

  const resolveDimensionName = (id: string) =>
    dimensionNameMap.get(id) ?? formatDimensionName(id);

  const isSliderInstrument =
    selected?.scale_type?.includes("slider") ||
    selected?.scale_type?.includes("0-100") ||
    ["PTP", "NAI"].some((s) =>
      (selected?.result.instrument_id ?? "").toUpperCase().includes(s)
    );

  const isAIRSA = (selected?.result.instrument_id ?? "")
    .toUpperCase()
    .includes("AIRSA");

  const recommendations =
    (selected?.result.overall_profile as OverallProfile)
      ?.triggered_cross_instrument_recommendations ?? [];

  // Chart data for bar chart
  const chartData = useMemo(() => {
    if (!isSliderInstrument && !(!isAIRSA && !isSliderInstrument)) return [];
    return sortedDimensions.map(([name, score]) => ({
      name: dimensionNameMap.get(name) ?? formatDimensionName(name),
      dimensionId: name,
      value: score.mean ?? score.level_mean ?? 0,
      band: score.band ?? "moderate",
    }));
  }, [sortedDimensions, isSliderInstrument, isAIRSA, dimensionNameMap]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!assessments.length) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center space-y-4">
        <h1 className="text-2xl font-bold text-foreground">My Results</h1>
        <p className="text-muted-foreground">
          You haven't completed any assessments yet.
        </p>
        <Button onClick={() => navigate("/assessment")}>
          Take an Assessment
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Assessment selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">My Results</h1>
        {assessments.length > 1 && (
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Select assessment" />
            </SelectTrigger>
            <SelectContent>
              {assessments.map((a) => (
                <SelectItem key={a.result.id} value={a.result.id}>
                  {a.instrument_name} —{" "}
                  {format(new Date(a.completed_at!), "MMM yyyy")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selected && (
        <>
          {/* SECTION 1 - Profile Overview */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Your {selected.instrument_name.replace(/\s*Profile$/i, '')} Profile
              </h2>
              {profile?.full_name && (
                <p className="text-muted-foreground">{profile.full_name}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Taken{" "}
                {format(new Date(selected.completed_at!), "MMMM yyyy")} |
                Version {selected.result.instrument_version ?? "—"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                label="Dimensions Assessed"
                value={String(dimensionScores.length)}
              />
              <StatCard
                label="Highest Dimension"
                value={resolveDimensionName(highestDimension)}
              />
              <StatCard
                label="Lowest Dimension"
                value={resolveDimensionName(lowestDimension)}
              />
            </div>
          </section>

          {/* SECTION 1b - Actions */}
          <section className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  title: "Coming Soon",
                  description: "PDF export will be available soon.",
                })
              }
            >
              <FileText className="mr-2 h-4 w-4" /> Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  title: "Coming Soon",
                  description:
                    "AI chat about results will be available soon.",
                })
              }
            >
              <MessageSquare className="mr-2 h-4 w-4" /> Ask AI About My
              Results
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  `/assessment?instrument=${selected.result.instrument_id}`
                )
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Retake Assessment
            </Button>
            <Button onClick={() => navigate("/assessment")}>
              Take Another Assessment
            </Button>
          </section>

          {/* SECTION 2 - Profile Chart */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dimension Scores</CardTitle>
              </CardHeader>
              <CardContent>
                {isAIRSA ? (
                  <AIRSACards dimensions={dimensionScores} />
                ) : (
                  <ScrollArea className="w-full">
                    <div
                      style={{
                        minWidth: Math.max(400, sortedDimensions.length * 50),
                        height: Math.max(300, sortedDimensions.length * 44),
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          layout="vertical"
                          margin={{ left: 120, right: 40, top: 8, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis
                            type="number"
                            domain={isSliderInstrument ? [0, 100] : [0, 4]}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={110}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            formatter={(value: number) => [
                              value.toFixed(1),
                              "Score",
                            ]}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {chartData.map((entry, idx) => (
                              <Cell
                                key={idx}
                                fill={
                                  selected.isPTP
                                    ? PTP_DIMENSION_COLORS[entry.dimensionId] ?? BAND_COLORS.moderate
                                    : BAND_COLORS[entry.band] ?? BAND_COLORS.moderate
                                }
                              />
                            ))}
                            <LabelList
                              dataKey="value"
                              position="right"
                              formatter={(v: number) => v.toFixed(1)}
                              style={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </section>

          {/* SECTION 2b - Driving Facet Scores (PTP only) */}
          {selected.isPTP && (
            <section>
              <DrivingFacetScores assessmentId={selected.result.assessment_id} />
            </section>
          )}

          {/* SECTION 3 - Cross-Instrument Recommendations */}
          {recommendations.length > 0 && (
            <section>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Cross-Instrument Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Based on your results, we suggest exploring:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recommendations.map((triggerId) => (
                      <Button
                        key={triggerId}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`/assessment?instrument=${triggerId}`)
                        }
                      >
                        {triggerId} <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* SECTION 4 - AI Narrative */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Your Profile Interpretation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selected.result.ai_narrative ? (
                  <>
                    <div className="max-w-none text-foreground text-sm">
                      <NarrativeRenderer text={selected.result.ai_narrative} />
                    </div>
                    {selected.result.ai_version && (
                      <p className="text-xs text-muted-foreground">
                        Generated with {selected.result.ai_version}
                      </p>
                    )}
                    {regeneratedVersion && (
                      <p className="text-xs text-accent-foreground bg-accent/10 rounded px-2 py-1 inline-block">
                        Regenerated with {regeneratedVersion}
                      </p>
                    )}
                    {limitReached && (
                      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                        <span className="text-muted-foreground">
                          You've used all {limitReached.limit} monthly AI messages.{" "}
                          {limitReached.tier === "base" && (
                            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate("/pricing")}>
                              Upgrade to Premium
                            </Button>
                          )}
                        </span>
                      </div>
                    )}
                    {regenerating ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Regenerating interpretation…
                      </div>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground mt-1">
                            <RefreshCw className="mr-1 h-3 w-3" /> Regenerate Interpretation
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Regenerate Interpretation?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will regenerate your interpretation using the latest AI version. Your current interpretation will be replaced. This will use 1 of your monthly AI messages. Continue?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRegenerate}>Continue</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </>
                ) : pollingNarrative ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Your personalized interpretation is being generated. This
                    takes about 30 seconds.
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No narrative available for this assessment.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

        </>
      )}
    </div>
  );
}

// --- Sub-components ---

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function AIRSACards({
  dimensions,
}: {
  dimensions: [string, DimensionScore][];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {dimensions.map(([name, score]) => {
        const level = score.readiness_level ?? "Foundational";
        const colors = READINESS_COLORS[level] ?? READINESS_COLORS.Foundational;
        return (
          <div
            key={name}
            className="rounded-lg p-4 border"
            style={{
              backgroundColor: colors.bg,
              borderColor: colors.border,
            }}
          >
            <p className="text-sm font-medium" style={{ color: colors.text }}>
              {formatDimensionName(name)}
            </p>
            <Badge
              className="mt-2"
              style={{
                backgroundColor: colors.border,
                color: "#fff",
              }}
            >
              {level}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

function NarrativeRenderer({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let paragraphBuffer: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    elements.push(
      <p key={key++} className="mb-4 leading-relaxed text-foreground">
        {paragraphBuffer.map((line, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {renderInlineMarkdown(line)}
          </span>
        ))}
      </p>
    );
    paragraphBuffer = [];
  };

  for (const raw of lines) {
    const line = raw;
    const trimmed = line.trim();

    // Empty line → flush paragraph
    if (trimmed === "") {
      flushParagraph();
      continue;
    }

    // ## Heading
    if (trimmed.startsWith("## ")) {
      flushParagraph();
      elements.push(
        <h3
          key={key++}
          className="text-lg font-bold mt-8 mb-3 pb-1 border-b"
          style={{ color: "hsl(var(--primary))", borderColor: "hsl(var(--primary) / 0.2)" }}
        >
          {renderInlineMarkdown(trimmed.replace(/^##\s*/, ""))}
        </h3>
      );
      continue;
    }

    // ### Subheading (facet name etc.)
    if (trimmed.startsWith("### ")) {
      flushParagraph();
      elements.push(
        <h4
          key={key++}
          className="text-base font-semibold mt-8 mb-3 pt-4 border-t border-border/40 first:border-t-0 first:pt-0 first:mt-5"
          style={{ color: "hsl(var(--primary))" }}
        >
          {renderInlineMarkdown(trimmed.replace(/^###\s*/, ""))}
        </h4>
      );
      continue;
    }

    // Labeled subsection: "Impact on Self:" / "Impact on Others:"
    const labelMatch = trimmed.match(/^\*\*(.+?:)\*\*$/);
    if (labelMatch) {
      flushParagraph();
      elements.push(
        <p key={key++} className="text-sm font-semibold text-muted-foreground mt-4 mb-2 uppercase tracking-wide">
          {labelMatch[1]}
        </p>
      );
      continue;
    }

    // Bullet lines: - text, * text, or emoji-prefixed (✅ ❌)
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    const emojiMatch = trimmed.match(/^(✅|❌)\s*(.+)$/);

    if (bulletMatch || emojiMatch) {
      flushParagraph();
      const content = bulletMatch ? bulletMatch[1] : trimmed;
      elements.push(
        <div key={key++} className="flex items-start gap-2 mb-3 ml-2">
          {bulletMatch && !emojiMatch && (
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
          )}
          <span className="text-foreground leading-relaxed">
            {renderInlineMarkdown(content)}
          </span>
        </div>
      );
      continue;
    }

    // Regular text → accumulate into paragraph
    paragraphBuffer.push(trimmed);
  }

  flushParagraph();

  return <div className="space-y-0">{elements}</div>;
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Split on **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function formatDimensionName(id: string): string {
  return id
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
