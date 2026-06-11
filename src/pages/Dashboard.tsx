import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Target,
  GraduationCap,
  BookOpen,
  ClipboardList,
  MessageSquare,
  Users,
  Users2,
  ClipboardCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tile } from "@/components/tile/Tile";
import type { TileVariant, InstrumentCode } from "@/components/tile/tileVariants";
import { resolveTierThumbnailUrls } from "@/lib/assetUrls";
import { enrolledStatusToCompletionStatus } from "@/lib/learningStatus";

interface RecommendedNext {
  content_item_id: string | null;
  content_item_title: string | null;
  module_name: string | null;
}
interface RawAssignment {
  name: string;
  description: string | null;
  status_group: "in_progress" | "not_started" | "completed";
  last_engaged_at: string;
  thumbnail_asset_id: string | null;
  estimated_minutes: number | null;
  instrument_codes: string[] | null;
  recommended_next: RecommendedNext | null;
  cert_path_id: string | null;
  certification_id: string | null;
  curriculum_id: string | null;
}
interface RawModule {
  name: string;
  description: string | null;
  status_group: "in_progress" | "not_started" | "completed";
  last_engaged_at: string;
  thumbnail_asset_id: string | null;
  estimated_minutes: number | null;
  recommended_next: RecommendedNext | null;
  module_id: string;
}
interface LearningState {
  assignments: RawAssignment[];
  module_assignments: RawModule[];
}

type Tier = "cert_path" | "curriculum" | "module";
interface StartedItem {
  tier: Tier;
  entityId: string;
  name: string;
  description: string | null;
  lastEngagedAt: string;
  thumbnailAssetId: string | null;
  estimatedMinutes: number | null;
  instrumentCodes: string[];
  recommendedNext: RecommendedNext | null;
}

function computeStartedItems(state: LearningState | undefined): StartedItem[] {
  if (!state) return [];
  const out: StartedItem[] = [];
  for (const a of state.assignments ?? []) {
    if (a.status_group !== "in_progress") continue;
    if (a.certification_id != null) {
      out.push({
        tier: "cert_path",
        entityId: (a.cert_path_id ?? a.certification_id) as string,
        name: a.name,
        description: a.description,
        lastEngagedAt: a.last_engaged_at,
        thumbnailAssetId: a.thumbnail_asset_id,
        estimatedMinutes: a.estimated_minutes,
        instrumentCodes: a.instrument_codes ?? [],
        recommendedNext: a.recommended_next,
      });
    } else if (a.curriculum_id) {
      out.push({
        tier: "curriculum",
        entityId: a.curriculum_id,
        name: a.name,
        description: a.description,
        lastEngagedAt: a.last_engaged_at,
        thumbnailAssetId: a.thumbnail_asset_id,
        estimatedMinutes: a.estimated_minutes,
        instrumentCodes: [],
        recommendedNext: a.recommended_next,
      });
    }
  }
  for (const m of state.module_assignments ?? []) {
    if (m.status_group !== "in_progress") continue;
    out.push({
      tier: "module",
      entityId: m.module_id,
      name: m.name,
      description: m.description,
      lastEngagedAt: m.last_engaged_at,
      thumbnailAssetId: m.thumbnail_asset_id,
      estimatedMinutes: m.estimated_minutes,
      instrumentCodes: [],
      recommendedNext: m.recommended_next,
    });
  }
  const byKey = new Map<string, StartedItem>();
  for (const it of out) {
    const k = `${it.tier}:${it.entityId}`;
    const ex = byKey.get(k);
    if (!ex || new Date(it.lastEngagedAt).getTime() > new Date(ex.lastEngagedAt).getTime()) {
      byKey.set(k, it);
    }
  }
  return [...byKey.values()].sort(
    (a, b) => new Date(b.lastEngagedAt).getTime() - new Date(a.lastEngagedAt).getTime(),
  );
}

function resumeLabel(it: StartedItem): string | null {
  if (!it.recommendedNext) return null;
  const title = it.recommendedNext.content_item_title ?? it.recommendedNext.module_name;
  if (!title) return null;
  return `Continue with: ${title}`;
}

function detailRouteFor(tier: Tier, id: string): string {
  return tier === "cert_path"
    ? `/learning/cert-path/${id}`
    : tier === "curriculum"
    ? `/learning/curriculum/${id}`
    : `/learning/module/${id}`;
}

function resumeTarget(it: StartedItem): string {
  if (it.recommendedNext?.content_item_id) {
    return `/learning/content-item/${it.recommendedNext.content_item_id}`;
  }
  return detailRouteFor(it.tier, it.entityId);
}

interface DashCard {
  title: string;
  description: string;
  url: string;
  icon: React.ElementType;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const userId = user?.id ?? null;

  const resultsQuery = useQuery({
    queryKey: ["dashboard_has_results", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("assessment_results").select("id").limit(1);
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
  });

  const learningQuery = useQuery({
    queryKey: ["dashboard_learning_state", userId],
    enabled: !!userId,
    queryFn: async (): Promise<LearningState> => {
      const { data, error } = await supabase.rpc("get_user_learning_state" as never, {
        p_user_id: userId,
      } as never);
      if (error) throw error;
      return data as unknown as LearningState;
    },
  });

  const startedItems = useMemo(
    () => computeStartedItems(learningQuery.data),
    [learningQuery.data],
  );

  const idsForTier = (items: StartedItem[], tier: Tier) =>
    Array.from(
      new Set(
        items.filter((it) => it.tier === tier && it.thumbnailAssetId).map((it) => it.entityId),
      ),
    ).sort();
  const certPathIds = useMemo(() => idsForTier(startedItems, "cert_path"), [startedItems]);
  const curriculumIds = useMemo(() => idsForTier(startedItems, "curriculum"), [startedItems]);
  const moduleIds = useMemo(() => idsForTier(startedItems, "module"), [startedItems]);

  const certPathThumbs = useQuery({
    queryKey: ["dash-thumb", "cert_path", certPathIds],
    queryFn: () => resolveTierThumbnailUrls("cert_path", certPathIds),
    enabled: certPathIds.length > 0,
  });
  const curriculumThumbs = useQuery({
    queryKey: ["dash-thumb", "curriculum", curriculumIds],
    queryFn: () => resolveTierThumbnailUrls("curriculum", curriculumIds),
    enabled: curriculumIds.length > 0,
  });
  const moduleThumbs = useQuery({
    queryKey: ["dash-thumb", "module", moduleIds],
    queryFn: () => resolveTierThumbnailUrls("module", moduleIds),
    enabled: moduleIds.length > 0,
  });

  const thumbUrlFor = (it: StartedItem): string | null => {
    const map =
      it.tier === "cert_path"
        ? certPathThumbs.data
        : it.tier === "curriculum"
        ? curriculumThumbs.data
        : moduleThumbs.data;
    return map?.get(it.entityId) ?? null;
  };

  const resultsLoading = resultsQuery.isLoading;
  const hasResults = resultsQuery.data === true;

  const accountType = profile?.account_type ?? "";
  const isCoach = accountType === "coach";
  const showSharedResults = ["corporate_employee", "company_admin", "org_admin"].includes(
    accountType,
  );

  const cards: DashCard[] = [
    { title: "My Results", description: "View your assessment reports", url: "/my-results", icon: BarChart3 },
    { title: "My Development Plan", description: "Track the actions you're working on", url: "/development-plan", icon: Target },
    { title: "My Learning", description: "Your enrolled courses and certifications", url: "/my-learning", icon: GraduationCap },
    { title: "Resources", description: "Guides, videos, and reference material", url: isCoach ? "/coach/resources" : "/resources", icon: BookOpen },
    { title: "Assessment", description: "Take or continue an assessment", url: "/assessment", icon: ClipboardList },
    { title: "AI Chat", description: "Explore your results with the AI assistant", url: "/ai-chat", icon: MessageSquare },
    ...(isCoach
      ? [
          { title: "My Clients", description: "Manage your clients and order assessments", url: "/coach/clients", icon: Users },
          { title: "Client Results", description: "Review your clients' assessment results", url: "/coach/client-results", icon: ClipboardCheck },
        ]
      : []),
    ...(showSharedResults
      ? [{ title: "Shared Results", description: "Results shared with you by your team", url: "/shared-results", icon: Users2 }]
      : []),
  ];

  const firstName = (profile?.full_name ?? "").trim().split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className="text-muted-foreground mt-1">Here's where to pick things up.</p>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between gap-4 p-6">
          {resultsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your dashboard…
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">
                  {hasResults ? "Your results are ready" : "Start with your assessment"}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {hasResults
                    ? "Review your Personal Threat Profile and other assessment reports."
                    : "Take your first assessment to unlock your personalized reports."}
                </p>
              </div>
              <Button
                onClick={() => navigate(hasResults ? "/my-results" : "/assessment")}
                className="shrink-0"
              >
                {hasResults ? "View my results" : "Take the assessment"}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {startedItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Continue where you left off</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {startedItems.map((it) => {
              const variant: TileVariant = it.tier;
              return (
                <Tile
                  key={`${it.tier}:${it.entityId}`}
                  variant={variant}
                  name={it.name}
                  summary={it.description}
                  thumbnailUrl={thumbUrlFor(it)}
                  status={enrolledStatusToCompletionStatus("in_progress")}
                  estimatedMinutes={it.estimatedMinutes}
                  instrumentCodes={it.instrumentCodes as InstrumentCode[]}
                  recommendedNextLabel={resumeLabel(it)}
                  onClick={() => navigate(resumeTarget(it))}
                />
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card
              key={c.url}
              role="button"
              tabIndex={0}
              onClick={() => navigate(c.url)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(c.url);
                }
              }}
              className="cursor-pointer transition-colors hover:bg-accent"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5 text-primary" />
                  {c.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{c.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
