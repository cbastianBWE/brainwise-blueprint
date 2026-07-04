import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Compass, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Tier = "Foundational" | "Typical" | "Advanced" | string;

interface Activity {
  id: string;
  code: string;
  title: string;
  tier: Tier | null;
  status: string;
  module_group: string | null;
  sequence: number | null;
  desired_outcome: string | null;
  definition: any;
}

interface AccessInfo {
  allowed: boolean;
  reason: string;
  activity_tier: string | null;
}

interface SessionRow {
  id: string;
  activity_id: string;
  status: string;
}

const tierBadgeVariant = (tier: Tier | null): "default" | "secondary" | "outline" => {
  if (tier === "Foundational") return "secondary";
  if (tier === "Advanced") return "default";
  return "outline";
};

function CoachingActivityCard({
  activity,
  access,
  inProgress,
  onStart,
  onResume,
  onNav,
}: {
  activity: Activity;
  access: AccessInfo | undefined;
  inProgress: boolean;
  onStart: () => void;
  onResume: () => void;
  onNav: (to: string) => void;
}) {
  const outcome =
    activity.desired_outcome ||
    (activity.definition && typeof activity.definition === "object" && (activity.definition as any).desired_outcome) ||
    activity.title;

  const locked = access && !access.allowed;
  const reason = access?.reason;

  let action: React.ReactNode = null;
  if (!access) {
    action = (
      <Button size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking…
      </Button>
    );
  } else if (access.allowed) {
    action = (
      <div className="flex flex-wrap gap-2">
        {inProgress ? (
          <>
            <Button size="sm" onClick={onResume}>Resume</Button>
            <Button size="sm" variant="outline" onClick={onStart}>Start over</Button>
          </>
        ) : (
          <Button size="sm" onClick={onStart}>Start</Button>
        )}
      </div>
    );
  } else if (reason === "ptp_required") {
    action = (
      <Button size="sm" variant="outline" onClick={() => onNav("/assessment")}>
        Take the PTP first
      </Button>
    );
  } else if (reason === "upgrade_required" || reason === "subscription_required") {
    action = (
      <Button size="sm" variant="outline" onClick={() => onNav("/pricing")}>
        Upgrade to access
      </Button>
    );
  } else {
    action = (
      <Button size="sm" variant="outline" disabled>Not available</Button>
    );
  }

  return (
    <Card className={locked ? "opacity-75" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {locked ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Compass className="h-4 w-4 text-primary" />
            )}
            <Badge variant={tierBadgeVariant(activity.tier)}>{activity.tier || "General"}</Badge>
          </div>
        </div>
        <CardTitle className="text-base leading-snug mt-2">{activity.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{outcome}</p>
        {action}
      </CardContent>
    </Card>
  );
}

export default function CoachingActivities() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [access, setAccess] = useState<Record<string, AccessInfo>>({});
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: actData, error: actErr } = await supabase
        .from("coaching_activities")
        .select("id,code,title,tier,status,module_group,sequence,desired_outcome,definition")
        .order("sequence", { ascending: true, nullsFirst: false })
        .order("title");
      if (cancelled) return;
      if (actErr) {
        setError(actErr.message);
        setLoading(false);
        return;
      }
      const acts = (actData || []) as Activity[];
      setActivities(acts);

      const { data: sessData } = await supabase
        .from("coaching_activity_sessions")
        .select("id,activity_id,status")
        .eq("user_id", user.id)
        .eq("status", "in_progress");
      if (cancelled) return;
      setSessions((sessData || []) as SessionRow[]);

      // Access checks in parallel
      const results = await Promise.all(
        acts.map(async (a) => {
          const { data } = await supabase.rpc("coaching_activity_access", { p_activity_id: a.id });
          const row = Array.isArray(data) ? data[0] : (data as any);
          const info: AccessInfo = {
            allowed: !!row?.allowed,
            reason: row?.reason || "unavailable",
            activity_tier: row?.activity_tier ?? null,
          };
          return [a.id, info] as const;
        }),
      );
      if (cancelled) return;
      setAccess(Object.fromEntries(results));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const grouped = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    for (const a of activities) {
      const key = a.module_group || a.tier || "Coaching";
      (groups[key] = groups[key] || []).push(a);
    }
    return groups;
  }, [activities]);

  const inProgressSet = useMemo(
    () => new Set(sessions.map((s) => s.activity_id)),
    [sessions],
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold">Couldn't load coaching activities</h2>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">My Coaching</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Short, guided activities to help you turn insight into action.
        </p>
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Compass className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 text-base font-semibold">No coaching activities yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              New activities will appear here as they become available.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <section key={group} className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">{group}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((a) => (
                <CoachingActivityCard
                  key={a.id}
                  activity={a}
                  access={access[a.id]}
                  inProgress={inProgressSet.has(a.id)}
                  onStart={() => navigate(`/coaching/${a.id}?fresh=1`)}
                  onResume={() => navigate(`/coaching/${a.id}`)}
                  onNav={(to) => navigate(to)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
