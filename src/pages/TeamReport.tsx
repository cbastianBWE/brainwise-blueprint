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
import { useTeamProfile, type TeamFacetResult } from "@/hooks/useTeamProfile";
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

interface TeamInThreeItem { headline: string; detail: string; action: string; }
interface DrivingItem { item: number; why: string; action: string; }
interface DrivingFacetsSection {
  opening: string;
  strengths: DrivingItem[];
  focus: DrivingItem[];
}
interface CommunicationSection {
  general: string;
  under_pressure: string;
  avoid_conflict: string[];
}
interface ConflictSection { summary: string; mitigate: string; promote_healthy: string; }
interface LeaderBriefRow { item: number; risk_to_work: string; the_move: string; potential_owner: string; }
interface LeaderBriefSection { rows: LeaderBriefRow[]; lean_on: string; }
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

function findFacet(items: TeamFacetResult[] | undefined, itemNumber: number) {
  return items?.find((f) => f.itemNumber === itemNumber);
}

export default function TeamReport() {
  const { teamProfileId } = useParams<{ teamProfileId: string }>();
  const {
    loading,
    noAccess,
    profile,
    sections,
    status,
    refetchSections,
    refetchProfile,
  } = useTeamProfile(teamProfileId);
  const { profile: userProfile } = useUserProfile();

  const canSeePrivileged =
    !!userProfile &&
    (userProfile.is_practitioner_coach ||
      PRIVILEGED_ACCOUNT_TYPES.has(userProfile.account_type ?? ""));

  const generator = useNarrativeGenerator({
    kind: "team",
    id: teamProfileId,
    status,
    enabled: canSeePrivileged,
    onSectionDone: async () => {
      await refetchSections();
      await refetchProfile();
    },
  });

  const radarData = useMemo(() => {
    const dims = profile?.structured?.dimensions ?? {};
    return ["Protection", "Participation", "Prediction"].map((d) => ({
      domain: d,
      mean: dims[d]?.mean ?? 0,
      high: dims[d]?.high ?? 0,
      low: dims[d]?.low ?? 0,
    }));
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
        <StatusCard title="You do not have access to this team report." />
      </div>
    );
  }

  const facetLookup = (item: number): TeamFacetResult | undefined =>
    findFacet(profile.structured?.facets, item) ??
    findFacet(profile.structured?.strengths, item) ??
    findFacet(profile.structured?.focusAreas, item) ??
    findFacet(profile.structured?.fullMap, item);

  const teamInThree = sections["team_in_three"] as TeamInThreeItem[] | undefined;
  const driving = sections["driving_facets"] as DrivingFacetsSection | undefined;
  const communication = sections["communication"] as CommunicationSection | undefined;
  const conflict = sections["conflict"] as ConflictSection | undefined;
  const leader = sections["leader_brief"] as LeaderBriefSection | undefined;
  const coach = sections["coach"] as CoachSection | undefined;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Team Report</h1>
        <p className="text-muted-foreground">
          Based on {profile.member_count} team members
        </p>
      </div>

      <GenerationBanner
        status={status}
        running={generator.running}
        expected={generator.expected}
        done={generator.done}
        current={generator.current}
        failed={generator.failed}
        onRetry={generator.retry}
        canDrive={canSeePrivileged}
      />

      {/* team_in_three */}
          {Array.isArray(teamInThree) && teamInThree.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your team in three</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                {teamInThree.map((it, i) => (
                  <div key={i} className="rounded-md border p-4 space-y-2">
                    <div className="font-semibold">{it.headline}</div>
                    <div className="text-sm text-muted-foreground">{it.detail}</div>
                    <div className="text-sm">{renderBold(it.action)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* The three threat domains */}
          <Card>
            <CardHeader>
              <CardTitle>The three threat domains</CardTitle>
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
                      name="Team average"
                      dataKey="mean"
                      stroke="#021F36"
                      fill="#021F36"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Radar
                      name="Team high"
                      dataKey="high"
                      stroke="#3C096C"
                      fill="#3C096C"
                      fillOpacity={0}
                      strokeDasharray="5 4"
                      strokeWidth={2}
                    />
                    <Radar
                      name="Team low"
                      dataKey="low"
                      stroke="#7a5800"
                      fill="#7a5800"
                      fillOpacity={0}
                      strokeDasharray="5 4"
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-4 text-xs mt-2">
                <span className="flex items-center gap-2">
                  <span style={{ width: 16, height: 2, background: "#021F36", display: "inline-block" }} />
                  Team average
                </span>
                <span className="flex items-center gap-2">
                  <span style={{ width: 16, height: 0, borderTop: "2px dashed #3C096C", display: "inline-block" }} />
                  Team high
                </span>
                <span className="flex items-center gap-2">
                  <span style={{ width: 16, height: 0, borderTop: "2px dashed #7a5800", display: "inline-block" }} />
                  Team low
                </span>
              </div>
              <PtpDimensionLegend dimensionIds={["DIM-PTP-01", "DIM-PTP-02", "DIM-PTP-03"]} />
            </CardContent>
          </Card>

          {/* How to read the shapes */}
          <Card>
            <CardHeader>
              <CardTitle>How to read the shapes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              The triangle shows where the team sits across the three workplace threat domains. The solid navy line is the team average. The dashed purple and mustard lines are the team's high and low edges, the range the team spans on each domain. A wide gap between the dashed lines means the team is spread out on that domain; a narrow gap means the team is aligned.
            </CardContent>
          </Card>

          {/* driving_facets */}
          {driving && (
            <Card>
              <CardHeader>
                <CardTitle>What is driving your team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{driving.opening}</p>
                {driving.strengths.length === 0 && driving.focus.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    This team is balanced: no single driver dominates.
                  </p>
                ) : (
                  <>
                    {driving.strengths.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold">Strengths</h3>
                        {driving.strengths.map((s, i) => {
                          const f = facetLookup(s.item);
                          return (
                            <div key={i} className="rounded-md border p-4 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{f?.facetName ?? `Item ${s.item}`}</span>
                                {f?.domain && <DomainPill domain={f.domain} />}
                                <span className="text-xs px-2 py-0.5 rounded bg-muted">
                                  {f?.label ?? "Shared strength"}
                                </span>
                              </div>
                              <p className="text-sm">{s.why}</p>
                              <p className="text-sm font-semibold">{s.action}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {driving.focus.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold">Areas to watch</h3>
                        {driving.focus.map((s, i) => {
                          const f = facetLookup(s.item);
                          return (
                            <div key={i} className="rounded-md border p-4 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{f?.facetName ?? `Item ${s.item}`}</span>
                                {f?.domain && <DomainPill domain={f.domain} />}
                                <span className="text-xs px-2 py-0.5 rounded bg-muted">
                                  {f?.label ?? "Watch"}
                                </span>
                              </div>
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

          {/* communication */}
          {communication && (
            <Card>
              <CardHeader>
                <CardTitle>How this team communicates</CardTitle>
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
                <CardTitle>How this team handles conflict</CardTitle>
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

          {/* leader_brief */}
          {canSeePrivileged && leader && (
            <Card>
              <CardHeader>
                <CardTitle>For the leader: the moves</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {leader.rows?.map((r, i) => {
                  const f = facetLookup(r.item);
                  return (
                    <div key={i} className="rounded-md border p-4 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{f?.facetName ?? `Item ${r.item}`}</span>
                        {f?.domain && <DomainPill domain={f.domain} />}
                      </div>
                      <div className="text-sm"><span className="font-semibold">Risk to work: </span>{r.risk_to_work}</div>
                      <div className="text-sm"><span className="font-semibold">The move: </span>{r.the_move}</div>
                      <div className="text-sm"><span className="font-semibold">Potential owner: </span>{r.potential_owner}</div>
                    </div>
                  );
                })}
                {leader.lean_on && (
                  <div className="rounded-md border-l-4 border-primary bg-muted/40 p-4 text-sm">
                    {leader.lean_on}
                  </div>
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profile.structured!.facets!.map((f) => (
                          <TableRow key={f.itemNumber}>
                            <TableCell>{f.facetName}</TableCell>
                            <TableCell><DomainPill domain={f.domain} /></TableCell>
                            <TableCell>{f.shape}</TableCell>
                            <TableCell>{f.label ?? "—"}</TableCell>
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
                  <ul className="space-y-3">
                    {coach.why.map((w, i) => {
                      const f = facetLookup(w.item);
                      return (
                        <li key={i} className="rounded-md border p-4">
                          <div className="font-semibold mb-1">{f?.facetName ?? `Item ${w.item}`}</div>
                          <p className="text-sm">{w.rationale}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {Array.isArray(coach.debrief_prompts) && coach.debrief_prompts.length > 0 && (
                  <ol className="list-decimal pl-6 space-y-2 text-sm">
                    {coach.debrief_prompts.map((p, i) => <li key={i}>{p}</li>)}
                  </ol>
                )}
              </CardContent>
            </Card>
          )}
    </div>
  );
}

function GenerationBanner({
  status,
  running,
  expected,
  done,
  current,
  failed,
  onRetry,
  canDrive,
}: {
  status: string | null;
  running: boolean;
  expected: string[];
  done: string[];
  current: string | null;
  failed: string[];
  onRetry: () => void;
  canDrive: boolean;
}) {
  if (status === "complete") return null;
  if (!canDrive) {
    return (
      <StatusCard title="This report is still generating. Please check back shortly." />
    );
  }
  if (running) {
    const total = expected.length || 0;
    const idx = Math.min(done.length + 1, total);
    return (
      <Card>
        <CardContent className="p-4 text-sm">
          Generating section {total > 0 ? `${idx} of ${total}` : ""}
          {current ? `: ${current.replaceAll("_", " ")}` : ""}…
        </CardContent>
      </Card>
    );
  }
  if (failed.length > 0) {
    return (
      <Card>
        <CardContent className="p-4 text-sm flex items-center justify-between gap-4">
          <span>
            Some sections didn't finish ({failed.join(", ")}). You can retry the missing ones.
          </span>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }
  return null;
}
