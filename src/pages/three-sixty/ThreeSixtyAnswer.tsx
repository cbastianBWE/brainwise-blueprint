// A rater's way back into a 360 they already claimed. The invite token is
// deleted on first claim, so the durable route in is the submission id plus the
// rater's own identity. bw_360_is_my_submission is the gate.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { AnswerFlow } from "@/pages/coaching/three-sixty/AnswerFlow";

export default function ThreeSixtyAnswer() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!submissionId) {
        if (alive) {
          setAllowed(false);
          setChecking(false);
        }
        return;
      }
      // A malformed id throws at parameter coercion (22P02) before the function
      // runs; an unknown but well-formed uuid returns false. Both are the same
      // answer to the rater, and neither reason is surfaced.
      let ok = false;
      try {
        const { data, error } = await supabase.rpc("bw_360_is_my_submission" as never, {
          p_submission: submissionId,
        } as never);
        ok = !error && data === true;
      } catch {
        ok = false;
      }
      if (!alive) return;
      setAllowed(ok);
      setChecking(false);
    })();
    return () => {
      alive = false;
    };
  }, [submissionId]);

  if (checking) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card>
          <CardContent className="space-y-3 p-6">
            <h1 className="text-xl font-semibold">This feedback request is not available</h1>
            <p className="text-muted-foreground text-sm">
              You can head back to your dashboard and pick up anything else that is waiting for you.
            </p>
            <Link to="/dashboard" className="text-primary text-sm underline underline-offset-4">
              Back to dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your feedback</h1>
      <AnswerFlow submissionId={submissionId as string} />
      {/* AnswerFlow's thank-you card is terminal, so the way out lives here. */}
      <div className="pt-2">
        <Link to="/dashboard" className="text-muted-foreground text-sm underline underline-offset-4">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
