import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, BookOpen, ExternalLink } from "lucide-react";
import { AddCoachingReviewToPlanModal } from "./AddCoachingReviewToPlanModal";

interface CoachingReview {
  id: string;
  run_number: number;
  activity_count: number;
  created_at: string;
  review: {
    summary?: string;
    themes?: string[] | string;
    strengths?: string[] | string;
    watch_outs?: string[] | string;
    action_plan?: string[];
  } | null;
}

interface CompletedActivity {
  session_id: string;
  activity_id: string;
  run_number: number;
  completed_at: string;
  code: string | null;
  title: string | null;
  module_group: string | null;
  tier: string | null;
  sequence: number | null;
  thumbnail_url: string | null;
}

const asList = (v?: string[] | string): string[] =>
  Array.isArray(v) ? v : v ? [v] : [];

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

export default function CoachingTab() {
  const [addFor, setAddFor] = useState<CoachingReview | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["development-plan-coaching"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dp_list_my_coaching" as never);
      if (error) throw error;
      return data as {
        reviews: CoachingReview[];
        completed_activities: CompletedActivity[];
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-muted-foreground py-8">
        Could not load your coaching. Please try again.
      </p>
    );
  }

  const reviews = data?.reviews ?? [];
  const completed = data?.completed_activities ?? [];
  const reviewLabel = (r: CoachingReview) =>
    `Coaching review · run ${r.run_number}`;

  return (
    <div className="space-y-8">
      <section>
        <h2
          className="text-lg font-semibold mb-3 flex items-center gap-2"
          style={{ color: "var(--bw-navy)" }}
        >
          <Sparkles className="h-5 w-5" /> Review &amp; Action Plans
        </h2>
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground text-center">
              No coaching reviews yet. Complete a few coaching activities to get
              your first review.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => {
              const rv = r.review ?? {};
              const actions = rv.action_plan ?? [];
              return (
                <Card key={r.id}>
                  <CardContent className="py-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className="font-medium"
                          style={{ color: "var(--bw-navy)" }}
                        >
                          {reviewLabel(r)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(r.created_at)} · {r.activity_count} activities
                        </p>
                      </div>
                      {actions.length > 0 && (
                        <Button size="sm" onClick={() => setAddFor(r)}>
                          Add to plan
                        </Button>
                      )}
                    </div>

                    {rv.summary && (
                      <p className="text-sm text-muted-foreground">
                        {rv.summary}
                      </p>
                    )}

                    {(["strengths", "themes", "watch_outs"] as const).map(
                      (k) => {
                        const items = asList(rv[k]);
                        if (items.length === 0) return null;
                        const heading =
                          k === "watch_outs"
                            ? "Watch-outs"
                            : k.charAt(0).toUpperCase() + k.slice(1);
                        return (
                          <div key={k}>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                              {heading}
                            </p>
                            <ul className="list-disc pl-5 space-y-0.5 text-sm">
                              {items.map((it, i) => (
                                <li key={i}>{it}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      }
                    )}

                    {actions.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                          Action plan
                        </p>
                        <ul className="list-disc pl-5 space-y-0.5 text-sm">
                          {actions.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2
          className="text-lg font-semibold mb-3 flex items-center gap-2"
          style={{ color: "var(--bw-navy)" }}
        >
          <BookOpen className="h-5 w-5" /> Completed activities
        </h2>
        {completed.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground text-center">
              You haven't completed any coaching activities yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {completed.map((a) => (
              <Card key={a.session_id}>
                <CardContent className="py-4 flex gap-3">
                  {a.thumbnail_url ? (
                    <img
                      src={a.thumbnail_url}
                      alt=""
                      className="h-16 w-16 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded bg-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium text-sm truncate"
                      style={{ color: "var(--bw-navy)" }}
                    >
                      {a.title ?? "Coaching activity"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[a.module_group, a.tier].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Completed {fmtDate(a.completed_at)}
                    </p>
                    <Link
                      to={`/coaching/session/${a.session_id}`}
                      className="text-xs inline-flex items-center gap-1 mt-1 text-primary hover:underline"
                    >
                      Revisit <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {addFor && (
        <AddCoachingReviewToPlanModal
          open={!!addFor}
          onOpenChange={(o) => {
            if (!o) setAddFor(null);
          }}
          reviewId={addFor.id}
          reviewLabel={reviewLabel(addFor)}
          actionPlan={addFor.review?.action_plan ?? []}
        />
      )}
    </div>
  );
}
