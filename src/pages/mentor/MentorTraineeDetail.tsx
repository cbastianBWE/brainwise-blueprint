import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import MentorProgressTree from "@/components/mentor/MentorProgressTree";
import MentorTraineeCumulativeProgress from "@/components/mentor/MentorTraineeCumulativeProgress";
import MentorTraineeNotesPanel from "@/components/mentor/MentorTraineeNotesPanel";
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

function statusBadgeClass(_status: string | null | undefined): string {
  return "border-transparent";
}

function statusBadgeStyle(status: string | null | undefined): React.CSSProperties | undefined {
  switch (status) {
    case "in_progress":
    case "revision_requested":
      return {
        backgroundColor: "color-mix(in oklab, var(--bw-amber) 18%, white)",
        color: "var(--bw-mustard)",
      };
    case "completed":
    case "certified":
      return {
        backgroundColor: "color-mix(in oklab, var(--bw-forest) 12%, white)",
        color: "var(--bw-forest)",
      };
    case "revoked":
      return {
        backgroundColor: "color-mix(in oklab, hsl(var(--destructive)) 12%, white)",
        color: "hsl(var(--destructive))",
      };
    default:
      return undefined;
  }
}


function prettyStatus(s: string | null | undefined): string {
  if (!s) return "Not started";
  return s.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

export default function MentorTraineeDetail() {
  const { traineeId } = useParams<{ traineeId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [activeTab, setActiveTab] = useState<"progress" | "summary" | "notes">("progress");

  const handleActionComplete = () => {
    if (!drawer || !traineeId) return;
    queryClient.invalidateQueries({
      queryKey: ["get_content_item_for_viewer", drawer.contentItemId, traineeId],
    });
    queryClient.invalidateQueries({ queryKey: ["get_user_learning_state", traineeId] });
    queryClient.invalidateQueries({ queryKey: ["list_mentor_trainees"] });
  };

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

  const mentorRelationships: any[] = Array.isArray(stateQuery.data?.mentor_relationships)
    ? stateQuery.data.mentor_relationships
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
                      style={statusBadgeStyle(c?.status)}
                    >
                      {label}: {prettyStatus(c?.status)}
                    </Badge>

                  );
                })}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {stateQuery.isLoading ? (
        <div
          role="status"
          className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center"
        >
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          Loading progress…
        </div>
      ) : stateQuery.error ? (
        <div className="py-8 text-center space-y-3">
          <p className="text-sm text-destructive">Failed to load trainee progress.</p>
          <Button variant="outline" size="sm" onClick={() => stateQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "progress" | "summary" | "notes")}
        >
          <TabsList>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="progress">
            <Card>
              <CardContent className="pt-6">
                <MentorProgressTree
                  learningState={stateQuery.data}
                  onItemClick={(contentItemId, itemType) =>
                    setDrawer({ contentItemId, itemType })
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary">
            <Card>
              <CardContent className="pt-6">
                <MentorTraineeCumulativeProgress learningState={stateQuery.data} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardContent className="pt-6">
                <MentorTraineeNotesPanel
                  traineeId={traineeId ?? ""}
                  mentorRelationships={mentorRelationships}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <ReviewDrawer
        open={drawer !== null}
        onOpenChange={(o) => !o && setDrawer(null)}
        contentItemId={drawer?.contentItemId ?? null}
        itemType={drawer?.itemType ?? null}
        traineeId={traineeId ?? null}
        onActionComplete={handleActionComplete}
      />
    </div>
  );
}
