/**
 * Catch-up signpost.
 *
 * When the journey blocks an activity with `reason_code = "catch_up_required"`
 * there is a reveal sitting unopened somewhere earlier. The gate on its own is
 * a dead end, so this names the waiting activity and hands over a button to it.
 *
 * The list comes from `relationship_pending_reveals`, already ordered by module
 * and sequence, so the first row is the earliest thing waiting. No counts are
 * shown — "a reveal is waiting" is the whole message.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export interface PendingReveal {
  activity_id: string;
  code: string;
  title: string;
  module_number: number | null;
  cleared_at: string | null;
}

export async function fetchPendingReveals(relationshipId: string): Promise<PendingReveal[]> {
  const { data, error } = await supabase.rpc("relationship_pending_reveals", {
    p_relationship: relationshipId,
  });
  if (error) return [];
  return ((data as PendingReveal[]) || []).filter((r) => !!r?.code);
}

/**
 * Path to the waiting reveal, carrying where the person was actually headed so
 * the runner can send them onward once the gate clears.
 */
export function catchUpHref(
  relationshipId: string,
  revealCode: string,
  intendedCode?: string | null,
) {
  const q = intendedCode && intendedCode !== revealCode ? `?next=${encodeURIComponent(intendedCode)}` : "";
  return `/couples/${relationshipId}/activity/${revealCode}${q}`;
}

/**
 * Resolves where to send someone after they have opened a reveal: the next one
 * still waiting, or their original destination once the list is empty.
 */
export async function nextCatchUpHref(
  relationshipId: string,
  intendedCode: string | null,
  justOpenedCode?: string | null,
): Promise<string> {
  const pending = (await fetchPendingReveals(relationshipId)).filter(
    (r) => r.code !== justOpenedCode,
  );
  if (pending.length > 0) return catchUpHref(relationshipId, pending[0].code, intendedCode);
  if (intendedCode) return `/couples/${relationshipId}/activity/${intendedCode}`;
  return `/couples/${relationshipId}`;
}

export function usePendingReveals(relationshipId: string | undefined, enabled: boolean) {
  const [reveals, setReveals] = useState<PendingReveal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!relationshipId || !enabled) return;
    let cancelled = false;
    setLoading(true);
    fetchPendingReveals(relationshipId).then((rows) => {
      if (cancelled) return;
      setReveals(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [relationshipId, enabled]);

  return { reveals, loading };
}

export default function CatchUpNotice({
  relationshipId,
  intendedCode,
  className,
  onNavigate,
}: {
  relationshipId: string;
  /** The activity they were trying to reach, so we can bring them back. */
  intendedCode?: string | null;
  className?: string;
  /** Called instead of routing, when the host wants to close a dialog first. */
  onNavigate?: (href: string) => void;
}) {
  const navigate = useNavigate();
  const { reveals, loading } = usePendingReveals(relationshipId, true);
  const first = reveals[0] || null;

  if (loading && !first) return null;

  // Nothing resolvable — keep the generic sentence the caller already shows.
  if (!first) return null;

  const href = catchUpHref(relationshipId, first.code, intendedCode);

  return (
    <div className={"space-y-2 " + (className || "")}>
      <p className="text-sm text-muted-foreground">
        Before this one, there's a reveal waiting for you in{" "}
        <span className="font-medium text-foreground">{first.title}</span>. Open it and you'll
        come right back.
      </p>
      <Button
        onClick={() => (onNavigate ? onNavigate(href) : navigate(href))}
        className="w-full sm:w-auto"
      >
        Take me there
      </Button>
    </div>
  );
}
