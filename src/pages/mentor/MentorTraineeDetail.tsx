import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import MentorProgressTree from "@/components/mentor/MentorProgressTree";
import ReviewDrawer from "@/components/mentor/ReviewDrawer";

interface DrawerState {
  contentItemId: string;
  itemType: string;
}

const CERT_LABELS: Record<string, string> = {
  ptp_coach: "PTP Certified Coach",
  ai_transformation_coach: "AI Transformation Certified Coach",
  ai_transformation_ptp_coach: "AI Transformation + PTP Certified Coach",
  my_brainwise_coach: "My BrainWise Coach",
};

function statusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case "in_progress":
      return "bg-amber-100 text-amber-900 hover:bg-amber-100 border-transparent dark:bg-amber-900/30 dark:text-amber-200";
    case "completed":
      return "bg-emerald-100 text-emerald-900 hover:bg-emerald-100 border-transparent dark:bg-emerald-900/30 dark:text-emerald-200";
    case "certified":
      return "bg-purple-100 text-purple-900 hover:bg-purple-100 border-transparent dark:bg-purple-900/30 dark:text-purple-200";
    case "revision_requested":
      return "bg-orange-100 text-orange-900 hover:bg-orange-100 border-transparent dark:bg-orange-900/30 dark:text-orange-200";
    default:
      return "bg-muted text-muted-foreground hover:bg-muted border-transparent";
  }
}

function prettyStatus(s: string | null | undefined): string {
  if (!s) return "Not started";
  return s.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

export default function MentorTraineeDetail() {
  const { traineeId } = useParams<{ traineeId: string }>();
  const navigate = useNavigate();

  const rosterQuery = useQuery({
    queryKey: ["list_mentor_trainees"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_mentor_trainees" as never);
      if (error) throw error;
      return data as any;
    },
  });

  const stateQuery = useQuery({
    queryKey: ["get_user_learning_state", traineeId],
    enabled: !!traineeId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_learning_state" as never, {
        p_user_id: traineeId,
      } as never);
      if (error) throw error;
      return data as any;
    },
  });

  const trainee = useMemo(() => {
    const list = Array.isArray(rosterQuery.data?.trainees) ? rosterQuery.data.trainees : [];
    return list.find((t: any) => t.trainee_user_id === traineeId) ?? null;
  }, [rosterQuery.data, traineeId]);

  const certifications: any[] = Array.isArray(stateQuery.data?.certifications)
    ? stateQuery.data.certifications
    : [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/mentor")} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Mentor Portal
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <CardTitle>
                {trainee?.full_name || trainee?.email || "Trainee"}
              </CardTitle>
              {trainee?.email && (
                <p className="text-sm text-muted-foreground mt-1">{trainee.email}</p>
              )}
            </div>
            {certifications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {certifications.map((c: any) => {
                  const label =
                    (c?.certification_type && CERT_LABELS[c.certification_type]) ||
                    c?.certification_type ||
                    "Certification";
                  return (
                    <Badge
                      key={c.certification_id ?? label}
                      className={cn("text-xs", statusBadgeClass(c?.status))}
                    >
                      {label}: {prettyStatus(c?.status)}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {stateQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading progress…
            </div>
          ) : stateQuery.error ? (
            <div className="text-sm text-destructive py-8 text-center">
              Failed to load trainee progress.
            </div>
          ) : (
            <MentorProgressTree learningState={stateQuery.data} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
