import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Single source of truth for "share my coaching with my practitioner".
 *
 * Rules:
 *  1. The practitioner is the most recent NON-REVOKED coach_clients relationship.
 *  2. Every read of coaching_activity_shares is filtered by owner_user_id, because
 *     RLS on that table also exposes rows to the viewer and to super admins.
 *  3. Turning always-share on revokes any live snapshot row (it is redundant).
 *     Turning it off does not resurrect the snapshot.
 */
export function useCoachingShare() {
  const { user } = useAuth();

  const [coachUserId, setCoachUserId] = useState<string | null>(null);
  const [alwaysShare, setAlwaysShareState] = useState(false);
  const [snapshotShareId, setSnapshotShareId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);

      // Most recent non-revoked relationship wins.
      const { data: cc } = await supabase
        .from("coach_clients")
        .select("coach_user_id")
        .eq("client_user_id", user.id)
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      const cid = cc?.coach_user_id || null;
      setCoachUserId(cid);

      if (!cid) {
        setAlwaysShareState(false);
        setSnapshotShareId(null);
        setLoading(false);
        return;
      }

      // owner_user_id filter is mandatory — see rule 2 above.
      const { data: shares } = await supabase
        .from("coaching_activity_shares")
        .select("id,mode,revoked_at")
        .eq("owner_user_id", user.id)
        .eq("viewer_user_id", cid)
        .is("revoked_at", null);

      if (cancelled) return;
      const rows = shares || [];
      setAlwaysShareState(rows.some((s: any) => s.mode === "always"));
      const snap = rows.find((s: any) => s.mode === "snapshot");
      setSnapshotShareId(snap ? (snap as any).id : null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const setAlwaysShare = useCallback(
    async (next: boolean): Promise<boolean> => {
      if (!user || !coachUserId) return false;
      setPending(true);
      const previous = alwaysShare;
      setAlwaysShareState(next);
      try {
        if (next) {
          const { data: existing } = await supabase
            .from("coaching_activity_shares")
            .select("id")
            .eq("owner_user_id", user.id)
            .eq("viewer_user_id", coachUserId)
            .eq("mode", "always")
            .maybeSingle();

          if (existing) {
            const { error } = await supabase
              .from("coaching_activity_shares")
              .update({ revoked_at: null, granted_at: new Date().toISOString() })
              .eq("id", (existing as any).id)
              .eq("owner_user_id", user.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from("coaching_activity_shares").insert({
              owner_user_id: user.id,
              viewer_user_id: coachUserId,
              mode: "always",
            });
            if (error) throw error;
          }

          // Always-share supersedes any live snapshot: revoke, never delete.
          const { error: snapErr } = await supabase
            .from("coaching_activity_shares")
            .update({ revoked_at: new Date().toISOString() })
            .eq("owner_user_id", user.id)
            .eq("viewer_user_id", coachUserId)
            .eq("mode", "snapshot")
            .is("revoked_at", null);
          if (snapErr) throw snapErr;
          setSnapshotShareId(null);
        } else {
          const { error } = await supabase
            .from("coaching_activity_shares")
            .update({ revoked_at: new Date().toISOString() })
            .eq("owner_user_id", user.id)
            .eq("viewer_user_id", coachUserId)
            .eq("mode", "always")
            .is("revoked_at", null);
          if (error) throw error;
        }
        return true;
      } catch {
        setAlwaysShareState(previous);
        return false;
      } finally {
        setPending(false);
      }
    },
    [user, coachUserId, alwaysShare],
  );

  const shareSnapshot = useCallback(async (): Promise<boolean> => {
    if (!user || !coachUserId) return false;
    setPending(true);
    try {
      const { data, error } = await supabase
        .from("coaching_activity_shares")
        .insert({
          owner_user_id: user.id,
          viewer_user_id: coachUserId,
          mode: "snapshot",
        })
        .select("id")
        .single();
      if (error) return false;
      setSnapshotShareId((data as any).id);
      return true;
    } finally {
      setPending(false);
    }
  }, [user, coachUserId]);

  return {
    coachUserId,
    hasPractitioner: !!coachUserId,
    alwaysShare,
    snapshotShareId,
    hasSnapshotShare: !!snapshotShareId,
    loading,
    pending,
    setAlwaysShare,
    shareSnapshot,
  };
}

export type CoachingShare = ReturnType<typeof useCoachingShare>;
