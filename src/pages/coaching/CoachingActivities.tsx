import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Compass, Lock, History, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TransitionMap from "@/components/coaching/TransitionMap";

type Tier = "Foundational" | "Typical" | "Advanced" | string;

interface Briefing {
  hero_image_url?: string;
  description?: string;
  learning_outcomes?: string[];
  time_estimate?: string;
  prerequisites?: string;
}

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
  tags: string[] | null;
  thumbnail_url: string | null;
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

interface HistoryRow {
  id: string;
  activity_id: string;
  completed_at: string | null;
  created_at: string;
  coaching_activities: { title: string; tier: string | null } | null;
}

const tierBadgeVariant = (tier: Tier | null): "default" | "secondary" | "outline" => {
  if (tier === "Foundational") return "secondary";
  if (tier === "Advanced") return "default";
  return "outline";
};

function getBriefing(activity: Activity): Briefing | null {
  const def = activity.definition;
  if (def && typeof def === "object" && def.briefing && typeof def.briefing === "object") {
    return def.briefing as Briefing;
  }
  return null;
}

function BrandedPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/40">
      <Compass className="h-10 w-10 text-muted-foreground" />
    </div>
  );
}

function CardMedia({ activity }: { activity: Activity }) {
  return (
    <div className="aspect-video w-full overflow-hidden bg-muted">
      {activity.thumbnail_url ? (
        <img
          src={activity.thumbnail_url}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <BrandedPlaceholder />
      )}
    </div>
  );
}

function BriefingDialog({
  activity,
  access,
  inProgress,
  open,
  onOpenChange,
}: {
  activity: Activity | null;
  access: AccessInfo | undefined;
  inProgress: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  if (!activity) return null;

  const briefing = getBriefing(activity);
  const heroSrc = briefing?.hero_image_url || activity.thumbnail_url || null;
  const description =
    briefing?.description || activity.desired_outcome || activity.title;
  const outcomes = briefing?.learning_outcomes || [];

  const close = () => onOpenChange(false);
  const go = (to: string) => {
    navigate(to);
    close();
  };

  let footer: React.ReactNode = null;
  if (!access) {
    footer = (
      <Button disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking…
      </Button>
    );
  } else if (access.allowed) {
    if (inProgress) {
      footer = (
        <>
          <Button variant="outline" onClick={() => go(`/coaching/${activity.id}`)}>
            Resume
          </Button>
          <Button onClick={() => go(`/coaching/${activity.id}?fresh=1`)}>
            Start over
          </Button>
        </>
      );
    } else {
      footer = (
        <Button onClick={() => go(`/coaching/${activity.id}?fresh=1`)}>Begin</Button>
      );
    }
  } else if (access.reason === "ptp_required") {
    footer = <Button onClick={() => go("/assessment")}>Take the PTP first</Button>;
  } else if (
    access.reason === "upgrade_required" ||
    access.reason === "subscription_required"
  ) {
    footer = <Button onClick={() => go("/pricing")}>Upgrade to access</Button>;
  } else {
    footer = <Button disabled>Not available</Button>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="w-full overflow-hidden bg-muted" style={{ aspectRatio: "2 / 1" }}>
          {heroSrc ? (
            <img
              src={heroSrc}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <BrandedPlaceholder />
          )}
        </div>
        <div className="p-6 space-y-4">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={tierBadgeVariant(activity.tier)}>
                {activity.tier || "General"}
              </Badge>
            </div>
            <DialogTitle className="text-xl leading-snug">{activity.title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {outcomes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">What you'll get</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                {outcomes.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
          )}

          {(briefing?.time_estimate || briefing?.prerequisites) && (
            <div className="space-y-2 text-sm">
              {briefing?.time_estimate && (
                <div className="flex gap-2">
                  <span className="font-medium text-foreground">Time</span>
                  <span className="text-muted-foreground">{briefing.time_estimate}</span>
                </div>
              )}
              {briefing?.prerequisites && (
                <div className="flex gap-2">
                  <span className="font-medium text-foreground">Prerequisites</span>
                  <span className="text-muted-foreground">{briefing.prerequisites}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">{footer}</DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CoachingActivityCard({
  activity,
  access,
  inProgress,
  onOpenBriefing,
  onResume,
}: {
  activity: Activity;
  access: AccessInfo | undefined;
  inProgress: boolean;
  onOpenBriefing: () => void;
  onResume: () => void;
}) {
  const outcome =
    activity.desired_outcome ||
    (activity.definition && typeof activity.definition === "object" && (activity.definition as any).desired_outcome) ||
    activity.title;

  const locked = access && !access.allowed;
  const reason = access?.reason;
  const tags = (activity.tags || []).slice(0, 4);

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
            <Button size="sm" variant="outline" onClick={onOpenBriefing}>Start over</Button>
          </>
        ) : (
          <Button size="sm" onClick={onOpenBriefing}>Start</Button>
        )}
      </div>
    );
  } else if (reason === "ptp_required") {
    action = (
      <Button size="sm" variant="outline" onClick={onOpenBriefing}>
        Take the PTP first
      </Button>
    );
  } else if (reason === "upgrade_required" || reason === "subscription_required") {
    action = (
      <Button size="sm" variant="outline" onClick={onOpenBriefing}>
        Upgrade to access
      </Button>
    );
  } else {
    action = (
      <Button size="sm" variant="outline" disabled>Not available</Button>
    );
  }

  return (
    <Card className={`overflow-hidden ${locked ? "opacity-75" : ""}`}>
      <button
        type="button"
        onClick={onOpenBriefing}
        aria-label={`Open details for ${activity.title}`}
        className="block w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CardMedia activity={activity} />
      </button>
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
        <button
          type="button"
          onClick={onOpenBriefing}
          aria-label={`Open details for ${activity.title}`}
          className="mt-2 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <CardTitle className="text-base leading-snug hover:underline">{activity.title}</CardTitle>
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{outcome}</p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs font-normal">
                {t}
              </Badge>
            ))}
          </div>
        )}
        {action}
      </CardContent>
    </Card>
  );
}

function HistoryTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<HistoryRow[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("coaching_activity_sessions")
        .select(
          "id, activity_id, completed_at, created_at, coaching_activities(title, tier)",
        )
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      if (cancelled) return;
      setRows((data as unknown as HistoryRow[]) || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <History className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            You haven't completed any coaching activities yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const title = r.coaching_activities?.title || "Coaching session";
        const tier = r.coaching_activities?.tier || null;
        const when = r.completed_at || r.created_at;
        const dateStr = when
          ? new Date(when).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "";
        return (
          <Card key={r.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {tier && <Badge variant={tierBadgeVariant(tier)}>{tier}</Badge>}
                  <span className="text-xs text-muted-foreground">Completed {dateStr}</span>
                </div>
                <p className="mt-1 truncate text-sm font-medium">{title}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/coaching/session/${r.id}`)}
              >
                View
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
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
  const [tab, setTab] = useState<"activities" | "history">("activities");
  const [query, setQuery] = useState("");
  const [openActivity, setOpenActivity] = useState<Activity | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: actData, error: actErr } = await supabase
        .from("coaching_activities")
        .select("id,code,title,tier,status,module_group,sequence,desired_outcome,definition,tags,thumbnail_url")
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

      const { data: accessRows } = await supabase.rpc("coaching_activity_access_batch");
      if (cancelled) return;
      const accessMap: Record<string, AccessInfo> = {};
      for (const row of (accessRows || []) as any[]) {
        accessMap[row.activity_id] = {
          allowed: !!row.allowed,
          reason: row.reason || "unavailable",
          activity_tier: row.activity_tier ?? null,
        };
      }
      setAccess(accessMap);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter((a) => {
      if (a.title?.toLowerCase().includes(q)) return true;
      if (a.desired_outcome?.toLowerCase().includes(q)) return true;
      if ((a.tags || []).some((t) => t.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [activities, query]);

  const grouped = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    for (const a of filtered) {
      const key = a.module_group || a.tier || "Coaching";
      (groups[key] = groups[key] || []).push(a);
    }
    return groups;
  }, [filtered]);

  const inProgressSet = useMemo(
    () => new Set(sessions.map((s) => s.activity_id)),
    [sessions],
  );

  const searchBox = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search activities by title, outcome, or tag"
        className="pl-9"
      />
    </div>
  );

  const activitiesContent = loading ? (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ) : error ? (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-base font-semibold">Couldn't load coaching activities</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </CardContent>
    </Card>
  ) : activities.length === 0 ? (
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
    <div className="space-y-6">
      {searchBox}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No activities match your search.
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
                  onOpenBriefing={() => setOpenActivity(a)}
                  onResume={() => navigate(`/coaching/${a.id}`)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );

  return (
    <div className="container mx-auto space-y-6 p-6">
      <TransitionMap className="w-full max-w-4xl mx-auto" />
      <div>
        <h1 className="text-2xl font-semibold">My Coaching</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Short, guided activities to help you turn insight into action.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "activities" | "history")}>
        <TabsList>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="activities" className="mt-4">
          {activitiesContent}
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          {tab === "history" ? <HistoryTab /> : null}
        </TabsContent>
      </Tabs>

      <BriefingDialog
        activity={openActivity}
        access={openActivity ? access[openActivity.id] : undefined}
        inProgress={openActivity ? inProgressSet.has(openActivity.id) : false}
        open={!!openActivity}
        onOpenChange={(v) => {
          if (!v) setOpenActivity(null);
        }}
      />
    </div>
  );
}
