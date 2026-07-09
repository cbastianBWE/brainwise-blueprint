import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AiAnalysisPanel } from "@/components/coaching/CoachingViews";

export function RecapWidget({
  sessionId,
  recap,
  onRecap,
}: {
  sessionId: string;
  recap?: { html?: string };
  onRecap: (html: string, error: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const firedRef = useRef(false);
  useEffect(() => {
    if (recap?.html || firedRef.current) return;
    firedRef.current = true;
    setLoading(true);
    supabase.functions
      .invoke("coaching-activity-recap", { body: { session_id: sessionId } })
      .then(({ data, error }) => {
        if (error || !(data as any)?.recap_html) {
          onRecap(
            "<p>Let's pick up from where you are. On the next step, add what you want to make sure is part of your future.</p>",
            true,
          );
        } else {
          onRecap((data as any).recap_html, false);
        }
      })
      .catch(() =>
        onRecap(
          "<p>Let's pick up from where you are. On the next step, add what you want to make sure is part of your future.</p>",
          true,
        ),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recap?.html, sessionId]);

  if (loading && !recap?.html) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>Gathering the future you've been building…</p>
      </div>
    );
  }
  if (recap?.html) return <AiAnalysisPanel html={recap.html} />;
  return null;
}
