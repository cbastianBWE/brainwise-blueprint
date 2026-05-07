import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function AirsaManagerComplete() {
  const { managerAssessmentId } = useParams<{ managerAssessmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selfRaterName, setSelfRaterName] = useState<string>("the self-rater");

  useEffect(() => {
    if (!user || !managerAssessmentId) return;
    let cancelled = false;

    const verify = async () => {
      const { data: rows } = await (supabase as any)
        .from("assessments")
        .select("id, target_user_id, status, paired_assessment_id, rater_type, instrument_id")
        .eq("id", managerAssessmentId)
        .eq("user_id", user.id)
        .eq("rater_type", "manager")
        .eq("status", "completed")
        .eq("instrument_id", "INST-003")
        .limit(1);

      if (cancelled) return;

      if (!rows || rows.length === 0) {
        navigate("/assessment");
        return;
      }

      const targetUserId = rows[0].target_user_id;
      if (targetUserId) {
        const { data: u } = await (supabase as any)
          .from("users")
          .select("full_name")
          .eq("id", targetUserId)
          .maybeSingle();
        if (!cancelled && u?.full_name) setSelfRaterName(u.full_name);
      }

      if (!cancelled) setLoading(false);
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [user, managerAssessmentId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardContent className="p-8 space-y-6">
          <h1 className="text-3xl font-bold" style={{ color: "var(--bw-navy)" }}>
            Thanks for completing your manager rating
          </h1>
          <p className="text-foreground leading-relaxed">
            {selfRaterName} will be notified that their combined AI Readiness Skills results are ready to view.
            They'll see how your readiness ratings compare to their self-ratings at the dimension level.
          </p>
          <p className="text-foreground leading-relaxed">
            Your individual responses to each item are not shared with {selfRaterName}. Only the dimension-level
            readiness summaries (Foundational, Proficient, Advanced) are visible to them, alongside their own.
          </p>
          <div className="border-t pt-6">
            <Button onClick={() => navigate("/assessment")}>Back to Assessments</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
