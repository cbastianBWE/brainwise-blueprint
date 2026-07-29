import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoachingRecordingPlayer } from "@/components/coaching/CoachingViews";
import { isMMRec } from "@/components/coaching/MultimodalField";
import type { CoupleStep } from "../coupleShared";

/**
 * Shows the caller their own earlier answer. Captures nothing, crosses nothing.
 */
export function OwnReadbackWidget({
  step,
  relationshipId,
}: {
  step: CoupleStep;
  relationshipId?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState<unknown>(null);

  const from = step.readback?.from;
  const key = step.readback?.key;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!from || !key || !relationshipId) {
        setLoading(false);
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      const { data: act } = await supabase
        .from("relationship_activities")
        .select("id")
        .eq("code", from)
        .maybeSingle();
      if (!uid || !act) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data: sessions } = await supabase
        .from("relationship_activity_sessions")
        .select("responses, run_number")
        .eq("relationship_id", relationshipId)
        .eq("activity_id", (act as any).id)
        .eq("user_id", uid)
        .order("run_number", { ascending: false })
        .limit(1);
      if (cancelled) return;
      const responses = ((sessions as any[])?.[0]?.responses as Record<string, unknown>) || {};
      setValue(responses[key] ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [from, key, relationshipId]);

  if (loading) return null;

  const empty =
    value == null ||
    (typeof value === "string" && !value.trim()) ||
    (Array.isArray(value) && value.length === 0);

  if (empty) {
    return step.readback?.emptyCopy ? (
      <p className="text-sm text-muted-foreground">{step.readback.emptyCopy}</p>
    ) : null;
  }

  return (
    <div className="space-y-4">
      {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}
      <blockquote className="rounded-md border-l-4 border-primary bg-muted/40 p-4 text-base italic">
        {isMMRec(value) ? (
          <CoachingRecordingPlayer mediaId={(value as any).media_id} />
        ) : Array.isArray(value) ? (
          <ul className="space-y-1 not-italic">
            {value.map((v, i) => (
              <li key={i}>{typeof v === "string" ? v : JSON.stringify(v)}</li>
            ))}
          </ul>
        ) : typeof value === "string" ? (
          value
        ) : (
          <span className="not-italic">{JSON.stringify(value)}</span>
        )}
      </blockquote>
    </div>
  );
}
