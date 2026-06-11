import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Target,
  GraduationCap,
  BookOpen,
  ClipboardList,
  MessageSquare,
  Users2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RecommendedNext {
  content_item_id: string | null;
  content_item_title: string | null;
  module_name: string | null;
}
interface LearningRow {
  name: string;
  status_group: "in_progress" | "not_started" | "completed";
  last_engaged_at: string;
  recommended_next: RecommendedNext | null;
}
interface LearningState {
  assignments: LearningRow[];
  module_assignments: LearningRow[];
}

const STATUS_RANK: Record<LearningRow["status_group"], number> = {
  in_progress: 0,
  not_started: 1,
  completed: 2,
};

function pickResume(state: LearningState | undefined): LearningRow | null {
  if (!state) return null;
  const rows = [...(state.assignments ?? []), ...(state.module_assignments ?? [])].filter(
    (r) => r.status_group !== "completed" && r.recommended_next?.content_item_id
  );
  if (rows.length === 0) return null;
  rows.sort((a, b) => {
    const s = (STATUS_RANK[a.status_group] ?? 1) - (STATUS_RANK[b.status_group] ?? 1);
    if (s !== 0) return s;
    return new Date(b.last_engaged_at).getTime() - new Date(a.last_engaged_at).getTime();
  });
  return rows[0];
}

function resumeLabel(row: LearningRow): string {
  const title =
    row.recommended_next?.content_item_title ?? row.recommended_next?.module_name ?? "your next lesson";
  const verb = row.status_group === "in_progress" ? "Continue with" : "Start with";
  return `${verb}: ${title}`;
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

  const resultsLoading = resultsQuery.isLoading;
  const hasResults = resultsQuery.data === true;
  const resume = pickResume(learningQuery.data);

  const accountType = profile?.account_type ?? "";
  const showSharedResults = ["corporate_employee", "company_admin", "org_admin"].includes(accountType);

  const cards: DashCard[] = [
    { title: "My Results", description: "View your assessment reports", url: "/my-results", icon: BarChart3 },
    { title: "My Development Plan", description: "Track the actions you're working on", url: "/development-plan", icon: Target },
    { title: "My Learning", description: "Your enrolled courses and certifications", url: "/my-learning", icon: GraduationCap },
    { title: "Resources", description: "Guides, videos, and reference material", url: "/resources", icon: BookOpen },
    { title: "Assessment", description: "Take or continue an assessment", url: "/assessment", icon: ClipboardList },
    { title: "AI Chat", description: "Explore your results with the AI assistant", url: "/ai-chat", icon: MessageSquare },
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

      {resume && resume.recommended_next?.content_item_id && (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Continue where you left off</h2>
              <p className="text-sm font-medium">{resume.name}</p>
              <p className="text-muted-foreground text-sm">{resumeLabel(resume)}</p>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                navigate(`/learning/content-item/${resume.recommended_next!.content_item_id}`)
              }
              className="shrink-0"
            >
              Resume
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
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
