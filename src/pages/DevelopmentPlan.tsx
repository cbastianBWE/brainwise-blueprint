import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Target, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type Status = "not_started" | "in_progress" | "done" | "paused";

interface PlanEntry {
  id: string;
  entry_date: string;
  note: string | null;
  progress_pct: number | null;
  metric_value: number | null;
  metric_label: string | null;
  created_at: string;
}

interface PlanComment {
  id: string;
  author_role: string;
  author_user_id: string;
  author_name: string | null;
  body: string;
  edited_at: string | null;
  created_at: string;
}

interface PlanItem {
  id: string;
  source: "ptp" | "custom";
  source_context: string | null;
  card_title: string | null;
  dimension_tags: string[] | null;
  action_text: string;
  status: Status;
  target_date: string | null;
  progress_pct: number | null;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  entries: PlanEntry[];
  comments: PlanComment[];
}

const STATUS_META: Record<Status, { label: string; color: string }> = {
  not_started: { label: "Not started", color: "var(--bw-muted, #6b7280)" },
  in_progress: { label: "In progress", color: "var(--bw-teal)" },
  done: { label: "Done", color: "var(--bw-green)" },
  paused: { label: "Paused", color: "var(--bw-mustard)" },
};

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

export default function DevelopmentPlan() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["development-plan"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dp_list_my_plan" as never);
      if (error) throw error;
      return data as { items: PlanItem[] };
    },
  });

  const items: PlanItem[] = (data?.items ?? []) as PlanItem[];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--bw-navy)" }}
        >
          My Development Plan
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track the actions you've chosen to work on, with progress, notes, and target dates.
        </p>
      </header>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && !isLoading && (
        <p className="text-sm text-muted-foreground py-8">
          Could not load your development plan. Please try again.
        </p>
      )}

      {!isLoading && !error && items.length === 0 && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center gap-3">
            <Target className="h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold" style={{ color: "var(--bw-navy)" }}>
              Your development plan is empty
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Add actions from the Action Plan section of your PTP report to start tracking them here.
            </p>
            <Button onClick={() => navigate("/my-results")} className="mt-2">
              View my results
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => {
            const meta = STATUS_META[item.status] ?? STATUS_META.not_started;
            const pct = item.progress_pct ?? 0;
            return (
              <Card key={item.id}>
                <CardContent className="py-5 space-y-3">
                  {item.card_title && (
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {item.card_title}
                    </p>
                  )}
                  <p className="font-medium" style={{ color: "var(--bw-navy)" }}>
                    {item.action_text}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      style={{
                        backgroundColor: meta.color,
                        color: "#fff",
                        border: "none",
                      }}
                    >
                      {meta.label}
                    </Badge>
                    {item.target_date && (
                      <span className="text-xs text-muted-foreground">
                        Target: {formatDate(item.target_date)}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Progress value={pct} />
                    <p className="text-xs text-muted-foreground">{pct}%</p>
                  </div>

                  {item.dimension_tags && item.dimension_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.dimension_tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.entries && item.entries.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {item.entries.length} note{item.entries.length === 1 ? "" : "s"} logged
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
