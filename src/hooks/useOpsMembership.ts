import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface OpsMembership {
  org_id: string;
  role: string;
  org_name: string;
  stripe_collection_enabled: boolean;
}

const cache = new Map<string, Promise<OpsMembership | null>>();

function fetchMembership(userId: string): Promise<OpsMembership | null> {
  let p = cache.get(userId);
  if (!p) {
    p = (async () => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
      ) => Promise<{ data: unknown; error: unknown }>)("ops_my_membership");
      if (error || !data) return null;
      return data as OpsMembership;
    })();
    cache.set(userId, p);
  }
  return p;
}

export function useOpsMembership(): { membership: OpsMembership | null; loading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const [membership, setMembership] = useState<OpsMembership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setMembership(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchMembership(user.id).then((m) => {
      if (cancelled) return;
      setMembership(m);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { membership, loading };
}
