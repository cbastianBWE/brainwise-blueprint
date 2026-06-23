import { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PTP_DIMENSION_COLORS } from "@/lib/ptpDimensionColors";
import { PtpDimensionLegend } from "@/components/results/PtpDimensionLegend";
import { usePairedProfile, type PairedFacetResult } from "@/hooks/usePairedProfile";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNarrativeGenerator } from "@/hooks/useNarrativeGenerator";
import { Button } from "@/components/ui/button";

const DOMAIN_TO_DIM: Record<string, string> = {
  Protection: "DIM-PTP-01",
  Participation: "DIM-PTP-02",
  Prediction: "DIM-PTP-03",
  Purpose: "DIM-PTP-04",
  Pleasure: "DIM-PTP-05",
};

const PRIVILEGED_ACCOUNT_TYPES = new Set([
  "org_admin",
  "company_admin",
  "brainwise_super_admin",
]);

const COLOR_A = "#021F36"; // Navy - Person A
const COLOR_B = "#7a5800"; // Mustard - Person B
const TINT_A = "rgba(2, 31, 54, 0.06)";
const TINT_B = "rgba(122, 88, 0, 0.06)";

function domainColor(domain: string): string {
  return PTP_DIMENSION_COLORS[DOMAIN_TO_DIM[domain] ?? ""] ?? "#021F36";
}

function DomainPill({ domain }: { domain: string }) {
  return (
    <span
      style={{
        backgroundColor: domainColor(domain),
        color: "white",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        display: "inline-block",
      }}
    >
      {domain}
    </span>
  );
}

function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function PairGlyph({ a, b }: { a: number; b: number }) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const ax = clamp(a);
  const bx = clamp(b);
  const left = Math.min(ax, bx);
  const right = Math.max(ax, bx);
  return (
    <div style={{ position: "relative", height: 16, width: "100%", minWidth: 80 }}>
      <div
        style={{
          position: "absolute",
          top: 7,
          left: 0,
          right: 0,
          height: 2,
          background: "hsl(var(--muted))",
          borderRadius: 1,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 7,
          left: `${left}%`,
          width: `${right - left}%`,
          height: 2,
          background: "hsl(var(--muted-foreground))",
          opacity: 0.6,
        }}
      />
      <span
        title={`Person A: ${Math.round(a)}`}
        style={{
          position: "absolute",
          top: 3,
          left: `calc(${ax}% - 5px)`,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: COLOR_A,
        }}
      />
      <span
        title={`Person B: ${Math.round(b)}`}
        style={{
          position: "absolute",
          top: 3,
          left: `calc(${bx}% - 5px)`,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: COLOR_B,
        }}
      />
    </div>
  );
}

interface PairInThreeItem { headline: string; detail: string; action: string; }
interface DrivingItem { item: number; why: string; action: string; }
interface DrivingFacetsSection {
  opening: string;
  strengths: DrivingItem[];
  focus: DrivingItem[];
}
interface WithinPersonSection { a: string; b: string; }
interface NeedsSection { a_needs_from_b: string; b_needs_from_a: string; }
interface CommunicationSection {
  general: string;
  under_pressure: string;
  avoid_conflict: string[];
}
interface ConflictSection { summary: string; mitigate: string; promote_healthy: string; }
interface RepairSection { overview: string; a: string; b: string; steps: string[]; disclaimer: string; }
interface IntimacySection { overview: string; a: string[]; b: string[]; disclaimer: string; }
interface CoachSection {
  why: { item: number; rationale: string }[];
  debrief_prompts: string[];
}

function StatusCard({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-center text-muted-foreground">{title}</CardContent>
    </Card>
  );
}

function findFacet(items: PairedFacetResult[] | undefined, itemNumber: number) {
  return items?.find((f) => f.itemNumber === itemNumber);
}

function modeTitle(mode: string | null): string {
  if (mode === "work") return "Work Paired Report";
  if (mode === "personal") return "Personal Paired Report";
  if (mode === "romantic") return "Romantic Paired Report";
  return "Paired Report";
}

export default function PairedReport() {
  const { pairedProfileId } = useParams<{ pairedProfileId: string }>();
  const { loading, noAccess, profile, mode, sections, status } = usePairedProfile(pairedProfileId);
  const { profile: userProfile } = useUserProfile();

  const canSeePrivileged =
    !!userProfile &&
    (userProfile.is_practitioner_coach ||
      PRIVILEGED_ACCOUNT_TYPES.has(userProfile.account_type ?? ""));

  const { radarData, dimensionIds } = useMemo(() => {
    const dims = profile?.structured?.dimensions ?? {};
    const present = Object.keys(dims);
    const order = ["Protection", "Participation", "Prediction", "Purpose", "Pleasure"].filter(
      (d) => present.includes(d),
    );
    return {
      radarData: order.map((d) => ({ domain: d, a: dims[d]?.a ?? 0, b: dims[d]?.b ?? 0 })),
      dimensionIds: order.map((d) => DOMAIN_TO_DIM[d]).filter(Boolean),
    };
  }, [profile]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (noAccess || !profile) {
    return (
      <div className="container mx-auto p-6">
        <StatusCard title="You do not have access to this paired report." />
      </div>
    );
  }

  const facetLookup = (item: number): PairedFacetResult | undefined =>
    findFacet(profile.structured?.facets, item) ??
    findFacet(profile.structured?.strengths, item) ??
    findFacet(profile.structured?.focusAreas, item) ??
    findFacet(profile.structured?.fullMap, item);

  const pairInThree = sections["pair_in_three"] as PairInThreeItem[] | undefined;
  const driving = sections["driving_facets"] as DrivingFacetsSection | undefined;
  const within = sections["within_person"] as WithinPersonSection | undefined;
  const needs = sections["needs"] as NeedsSection | undefined;
  const communication = sections["communication"] as CommunicationSection | undefined;
  const conflict = sections["conflict"] as ConflictSection | undefined;
  const repair = sections["repair"] as RepairSection | undefined;
  const intimacy = sections["intimacy"] as IntimacySection | undefined;
  const coach = sections["coach"] as CoachSection | undefined;

  const axisCountWord = radarData.length === 3 ? "three" : "five";
  const isRomantic = mode === "romantic";

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{modeTitle(mode)}</h1>
        <p className="text-muted-foreground">Person A and Person B</p>
      </div>

      {status === "pending" && (
        <StatusCard title="This paired report has not been generated yet." />
      )}
      {status === "generating" && (
        <StatusCard title="Generating this paired report. This usually takes 30 to 90 seconds." />
      )}
      {status === "error" && (
        <StatusCard title="Something went wrong generating this report." />
      )}

      {status === "complete" && (
        <>
          {/* pair_in_three */}
          {Array.isArray(pairInThree) && pairInThree.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Paired profile overview</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                {pairInThree.map((it, i) => (
                  <div key={i} className="rounded-md border p-4 space-y-2">
                    <div className="font-semibold">{it.headline}</div>
                    <div className="text-sm text-muted-foreground">{it.detail}</div>
                    <div className="text-sm">{renderBold(it.action)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Radial */}
          {radarData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Both of you across the {axisCountWord} domains</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ width: "100%", height: 380 }}>
                  <ResponsiveContainer>
                    <RadarChart data={radarData} outerRadius="75%">
                      <PolarGrid />
                      <PolarAngleAxis
                        dataKey="domain"
                        tick={(props: {
                          x: number;
                          y: number;
                          textAnchor: string;
                          payload: { value: string };
                        }) => {
                          const { x, y, textAnchor, payload } = props;
                          return (
                            <text
                              x={x}
                              y={y}
                              textAnchor={textAnchor}
                              fill={domainColor(payload.value)}
                              fontWeight={600}
                              fontSize={13}
                            >
                              {payload.value}
                            </text>
                          );
                        }}
                      />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar
                        name="Person A"
                        dataKey="a"
                        stroke={COLOR_A}
                        fill={COLOR_A}
                        fillOpacity={0.13}
                        strokeWidth={2}
                        dot
                      />
                      <Radar
                        name="Person B"
                        dataKey="b"
                        stroke={COLOR_B}
                        fill={COLOR_B}
                        fillOpacity={0.13}
                        strokeWidth={2}
                        dot
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-4 text-xs mt-2">
                  <span className="flex items-center gap-2">
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: COLOR_A, display: "inline-block" }} />
                    Person A
                  </span>
                  <span className="flex items-center gap-2">
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: COLOR_B, display: "inline-block" }} />
                    Person B
                  </span>
                </div>
                <PtpDimensionLegend dimensionIds={dimensionIds} />
              </CardContent>
            </Card>
          )}

          {/* How to read */}
          <Card>
            <CardHeader>
              <CardTitle>How to read the shapes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Each spoke is one of the threat domains. Person A is the dark line, Person B is the bright line. Where the two lines sit far apart, the pair spans a wide range on that domain; where they sit together, the pair is aligned. Being far apart is often a strength, not a problem: it usually means one of you covers what the other does not.
            </CardContent>
          </Card>

          {/* driving_facets */}
          {driving && (
            <Card>
              <CardHeader>
                <CardTitle>What is driving your pair</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{driving.opening}</p>
                {(driving.strengths?.length ?? 0) === 0 && (driving.focus?.length ?? 0) === 0 ? null : (
                  <>
                    {driving.strengths?.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold">Strengths</h3>
                        {driving.strengths.map((s, i) => {
                          const f = facetLookup(s.item);
                          return (
                            <div key={i} className="rounded-md border p-4 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{f?.facetName ?? `Item ${s.item}`}</span>
                                {f?.domain && <DomainPill domain={f.domain} />}
                                {f?.label && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-muted">{f.label}</span>
                                )}
                              </div>
                              {f?.stats && typeof f.stats.a === "number" && typeof f.stats.b === "number" && (
                                <PairGlyph a={f.stats.a} b={f.stats.b} />
                              )}
                              <p className="text-sm">{s.why}</p>
                              <p className="text-sm font-semibold">{s.action}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {driving.focus?.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold">Areas to watch</h3>
                        {driving.focus.map((s, i) => {
                          const f = facetLookup(s.item);
                          return (
                            <div key={i} className="rounded-md border p-4 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{f?.facetName ?? `Item ${s.item}`}</span>
                                {f?.domain && <DomainPill domain={f.domain} />}
                                {f?.label && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-muted">{f.label}</span>
                                )}
                              </div>
                              {f?.stats && typeof f.stats.a === "number" && typeof f.stats.b === "number" && (
                                <PairGlyph a={f.stats.a} b={f.stats.b} />
                              )}
                              <p className="text-sm">{s.why}</p>
                              <p className="text-sm font-semibold">{s.action}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* within_person */}
          {within && (
            <Card>
              <CardHeader>
                <CardTitle>What is going on inside each of you</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border p-4" style={{ background: TINT_A }}>
                  <div className="font-semibold mb-1" style={{ color: COLOR_A }}>Person A</div>
                  <p className="text-sm">{within.a}</p>
                </div>
                <div className="rounded-md border p-4" style={{ background: TINT_B }}>
                  <div className="font-semibold mb-1" style={{ color: COLOR_B }}>Person B</div>
                  <p className="text-sm">{within.b}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* needs */}
          {needs && (
            <Card>
              <CardHeader>
                <CardTitle>What each of you needs from the other</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border p-4" style={{ background: TINT_A }}>
                  <div className="font-semibold mb-1" style={{ color: COLOR_A }}>What Person A needs from Person B</div>
                  <p className="text-sm">{needs.a_needs_from_b}</p>
                </div>
                <div className="rounded-md border p-4" style={{ background: TINT_B }}>
                  <div className="font-semibold mb-1" style={{ color: COLOR_B }}>What Person B needs from Person A</div>
                  <p className="text-sm">{needs.b_needs_from_a}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* communication */}
          {communication && (
            <Card>
              <CardHeader>
                <CardTitle>How the pair communicates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border p-4">
                    <div className="font-semibold mb-1">In general</div>
                    <p className="text-sm">{communication.general}</p>
                  </div>
                  <div className="rounded-md border p-4">
                    <div className="font-semibold mb-1">Under pressure</div>
                    <p className="text-sm">{communication.under_pressure}</p>
                  </div>
                </div>
                {Array.isArray(communication.avoid_conflict) && communication.avoid_conflict.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Avoiding communication conflict</h4>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      {communication.avoid_conflict.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* conflict */}
          {conflict && (
            <Card>
              <CardHeader>
                <CardTitle>How the pair handles conflict</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{conflict.summary}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border p-4">
                    <div className="font-semibold mb-1">Mitigate unhealthy conflict</div>
                    <p className="text-sm">{conflict.mitigate}</p>
                  </div>
                  <div className="rounded-md border p-4">
                    <div className="font-semibold mb-1">Promote healthy conflict</div>
                    <p className="text-sm">{conflict.promote_healthy}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* repair (romantic only) */}
          {isRomantic && repair && (
            <Card>
              <CardHeader>
                <CardTitle>Repair after conflict</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{repair.overview}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border p-4" style={{ background: TINT_A }}>
                    <div className="font-semibold mb-1" style={{ color: COLOR_A }}>Person A</div>
                    <p className="text-sm">{repair.a}</p>
                  </div>
                  <div className="rounded-md border p-4" style={{ background: TINT_B }}>
                    <div className="font-semibold mb-1" style={{ color: COLOR_B }}>Person B</div>
                    <p className="text-sm">{repair.b}</p>
                  </div>
                </div>
                {Array.isArray(repair.steps) && repair.steps.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Repair, step by step</h4>
                    <ol className="list-decimal pl-6 space-y-1 text-sm">
                      {repair.steps.map((t, i) => <li key={i}>{t}</li>)}
                    </ol>
                  </div>
                )}
                {repair.disclaimer && (
                  <p className="text-xs text-muted-foreground italic">{repair.disclaimer}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* intimacy (romantic only) */}
          {isRomantic && intimacy && (
            <Card>
              <CardHeader>
                <CardTitle>Building intimacy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{intimacy.overview}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border p-4" style={{ background: TINT_A }}>
                    <div className="font-semibold mb-1" style={{ color: COLOR_A }}>Person A</div>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {(intimacy.a ?? []).map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-md border p-4" style={{ background: TINT_B }}>
                    <div className="font-semibold mb-1" style={{ color: COLOR_B }}>Person B</div>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {(intimacy.b ?? []).map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                </div>
                {intimacy.disclaimer && (
                  <p className="text-xs text-muted-foreground italic">{intimacy.disclaimer}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Every pattern we found */}
          {Array.isArray(profile.structured?.facets) && profile.structured!.facets!.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Every pattern we found</CardTitle>
              </CardHeader>
              <CardContent>
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger className="text-sm font-medium underline">
                    Show all {profile.structured!.facets!.length} facets
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Facet</TableHead>
                          <TableHead>Domain</TableHead>
                          <TableHead>Shape</TableHead>
                          <TableHead>Pattern</TableHead>
                          <TableHead>A vs B</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...profile.structured!.facets!]
                          .sort((x, y) => (x.domain ?? "").localeCompare(y.domain ?? ""))
                          .map((f, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{f.facetName}</TableCell>
                              <TableCell><DomainPill domain={f.domain} /></TableCell>
                              <TableCell className="text-sm">{f.shape}</TableCell>
                              <TableCell className="text-sm">{f.label ?? "—"}</TableCell>
                              <TableCell style={{ minWidth: 120 }}>
                                {f.stats && typeof f.stats.a === "number" && typeof f.stats.b === "number" ? (
                                  <PairGlyph a={f.stats.a} b={f.stats.b} />
                                ) : null}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          )}

          {/* coach */}
          {canSeePrivileged && coach && (
            <Card>
              <CardHeader>
                <CardTitle>For the coach: running the debrief</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.isArray(coach.why) && coach.why.length > 0 && (
                  <div className="space-y-3">
                    {coach.why.map((w, i) => {
                      const f = facetLookup(w.item);
                      return (
                        <div key={i} className="rounded-md border p-4 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{f?.facetName ?? `Item ${w.item}`}</span>
                            {f?.domain && <DomainPill domain={f.domain} />}
                          </div>
                          <p className="text-sm">{w.rationale}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
                {Array.isArray(coach.debrief_prompts) && coach.debrief_prompts.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Debrief prompts</h4>
                    <ol className="list-decimal pl-6 space-y-1 text-sm">
                      {coach.debrief_prompts.map((p, i) => <li key={i}>{p}</li>)}
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
