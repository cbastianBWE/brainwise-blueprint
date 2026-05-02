import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function EpnComplete() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showStandardNaiCta, setShowStandardNaiCta] = useState(false);

  useEffect(() => {
    if (!user || !assignmentId) return;
    let cancelled = false;

    const verify = async () => {
      // Verify the user has a completed EPN assessment
      const { data: epnAssessments } = await (supabase as any)
        .from("assessments")
        .select("id, instrument_id, status")
        .eq("user_id", user.id)
        .eq("instrument_id", "INST-002L")
        .eq("status", "completed")
        .limit(1);

      if (cancelled) return;

      if (!epnAssessments || epnAssessments.length === 0) {
        navigate("/dashboard");
        return;
      }

      // Check standard NAI status
      const { data: naiAssessments } = await (supabase as any)
        .from("assessments")
        .select("id")
        .eq("user_id", user.id)
        .eq("instrument_id", "INST-002")
        .eq("status", "completed")
        .limit(1);

      if (cancelled) return;
      setShowStandardNaiCta(!naiAssessments || naiAssessments.length === 0);
      setLoading(false);
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [user, assignmentId, navigate]);

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
            Thank you
          </h1>
          <p className="text-foreground leading-relaxed">
            Your responses to the Executive Perspective NAI have been recorded. They will contribute to a
            leader-vs-employee perception comparison in your organization's NAI dashboard.
          </p>
          <p className="text-foreground leading-relaxed">
            Individual results are not generated for this assessment — your responses are aggregated with other
            leaders'.
          </p>

          {showStandardNaiCta && (
            <div className="border-t pt-6 space-y-3">
              <h2 className="text-xl font-semibold" style={{ color: "var(--bw-navy)" }}>
                Have you taken the standard NAI yet?
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                The Executive Perspective NAI measures how you perceive your employees experience AI adoption. The
                standard NAI measures your own experience. Both contribute to your organization's understanding.
              </p>
              <Button onClick={() => navigate("/assessment")}>Take the Standard NAI</Button>
            </div>
          )}

          <div className="pt-4">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
