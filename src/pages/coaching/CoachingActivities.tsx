import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Compass, Lock, History, Search, Send, RotateCcw, Sparkles, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

const renderImg = (url: string | null | undefined, w: number, h: number): string | undefined => {
  if (!url) return undefined;
  const transformed = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
  if (transformed === url) return url; // not a Supabase public URL — leave unchanged
  const sep = transformed.includes("?") ? "&" : "?";
  return `${transformed}${sep}width=${w}&height=${h}&resize=cover&quality=70`;
};

function CardMedia({ activity }: { activity: Activity }) {
  return (
    <div className="aspect-video w-full overflow-hidden bg-muted">
      {activity.thumbnail_url ? (
        <img
          src={renderImg(activity.thumbnail_url, 480, 270)}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
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
              src={renderImg(heroSrc, 800, 400)}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
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

interface PriorRun {
  run: number;
  summary: { text: string } | null;
  ended_at: string | null;
}

function PriorRunItem({ prior, userId }: { prior: PriorRun; userId: string }) {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    if (rows !== null || loading) return;
    setLoading(true);
    const { data: sess } = await (supabase
      .from("coaching_activity_sessions")
      .select("id, activity_id, completed_at, created_at")
      .eq("user_id", userId)
      .eq("status", "completed") as any)
      .eq("run_number", prior.run)
      .order("completed_at", { ascending: false });
    const sessRows = ((sess as any) || []) as { id: string; activity_id: string; completed_at: string | null; created_at: string }[];
    const activityIds = [...new Set(sessRows.map((s) => s.activity_id))];
    const titleMap = new Map<string, { title: string; tier: string | null }>();
    if (activityIds.length > 0) {
      const { data: acts } = await supabase
        .from("coaching_activities_public")
        .select("id, title, tier")
        .in("id", activityIds);
      for (const a of (acts || []) as { id: string; title: string; tier: string | null }[]) {
        titleMap.set(a.id, { title: a.title, tier: a.tier });
      }
    }
    setRows(
      sessRows.map((s) => ({
        ...s,
        coaching_activities: titleMap.get(s.activity_id) || null,
      })) as HistoryRow[],
    );
    setLoading(false);
  };

  const endedStr = prior.ended_at
    ? new Date(prior.ended_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <Collapsible onOpenChange={(o) => o && load()}>
      <Card>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-muted/40 rounded-t-lg"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">Run {prior.run} — ended {endedStr}</p>
              {prior.summary?.text && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {prior.summary.text}
                </p>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform data-[state=open]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-4 space-y-3">
            {prior.summary?.text && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {prior.summary.text}
              </p>
            )}
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : rows && rows.length === 0 ? (
              <p className="text-xs text-muted-foreground">No completed activities in this run.</p>
            ) : rows ? (
              <ul className="space-y-2">
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
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {tier && <Badge variant={tierBadgeVariant(tier)}>{tier}</Badge>}
                          <span className="text-xs text-muted-foreground">Completed {dateStr}</span>
                        </div>
                        <p className="mt-1 truncate">{title}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/coaching/session/${r.id}`)}
                      >
                        View
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface ReviewData {
  summary?: string;
  strengths?: string[];
  watch_outs?: string[];
  action_plan?: string[];
  themes?: string[];
}

interface SavedReview {
  id: string;
  run_number: number;
  review: ReviewData;
  activity_count: number;
  created_at: string;
}

function ReviewBulletSection({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

function ReviewBody({ review }: { review: ReviewData }) {
  return (
    <div className="space-y-5">
      {review.summary && (
        <div className="space-y-1.5">
          <h4 className="text-sm font-semibold">Summary</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{review.summary}</p>
        </div>
      )}
      <ReviewBulletSection title="Strengths" items={review.strengths} />
      <ReviewBulletSection title="Watch-outs" items={review.watch_outs} />
      <ReviewBulletSection title="Action plan" items={review.action_plan} />
      <ReviewBulletSection title="Themes" items={review.themes} />
    </div>
  );
}

function HistoryTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [priorRuns, setPriorRuns] = useState<PriorRun[]>([]);
  const [reviews, setReviews] = useState<SavedReview[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);

      const { data: runState } = await supabase.rpc("coaching_get_run_state" as any);
      const currentRun = ((runState as any)?.current_run as number) ?? 1;
      const priors = (((runState as any)?.prior_runs as PriorRun[]) ?? [])
        .slice()
        .sort((a, b) => b.run - a.run);
      if (!cancelled) setPriorRuns(priors);

      const { data: revs } = await (supabase
        .from("coaching_reviews" as any)
        .select("id, run_number, review, activity_count, created_at")
        .eq("user_id", user.id) as any)
        .order("created_at", { ascending: false });
      if (!cancelled) setReviews(((revs as any[]) ?? []) as SavedReview[]);


      const { data: sess, error: sessErr } = await (supabase
        .from("coaching_activity_sessions")
        .select("id, activity_id, completed_at, created_at")
        .eq("user_id", user.id)
        .eq("status", "completed") as any)
        .eq("run_number", currentRun)
        .order("completed_at", { ascending: false });
      if (cancelled) return;
      if (sessErr || !sess) {
        setRows([]);
        setLoading(false);
        return;
      }
      const sessRows = (sess as any[]) as { id: string; activity_id: string; completed_at: string | null; created_at: string }[];
      const activityIds = [...new Set(sessRows.map((s) => s.activity_id))];
      const titleMap = new Map<string, { title: string; tier: string | null }>();
      if (activityIds.length > 0) {
        const { data: acts } = await supabase
          .from("coaching_activities_public")
          .select("id, title, tier")
          .in("id", activityIds);
        for (const a of (acts || []) as { id: string; title: string; tier: string | null }[]) {
          titleMap.set(a.id, { title: a.title, tier: a.tier });
        }
      }
      if (cancelled) return;
      setRows(
        sessRows.map((s) => ({
          ...s,
          coaching_activities: titleMap.get(s.activity_id) || null,
        })) as HistoryRow[],
      );
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

  const currentList =
    rows.length === 0 ? (
      <Card>
        <CardContent className="p-10 text-center">
          <History className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            You haven't completed any coaching activities in this run yet.
          </p>
        </CardContent>
      </Card>
    ) : (
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

  return (
    <div className="space-y-6">
      {reviews.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Reviews & Action Plans</h3>
          <div className="space-y-2">
            {reviews.map((r) => {
              const when = new Date(r.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
              return (
                <Collapsible key={r.id}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-muted/40 rounded-t-lg"
                      >
                        <div className="min-w-0 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{when}</span>
                          <Badge variant="secondary">Run {r.run_number}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {r.activity_count} {r.activity_count === 1 ? "activity" : "activities"}
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform data-[state=open]:rotate-180" />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t p-4">
                        <ReviewBody review={r.review || {}} />
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </div>
      )}
      {currentList}
      {priorRuns.length > 0 && user && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Previous runs</h3>
          <div className="space-y-2">
            {priorRuns.map((p) => (
              <PriorRunItem key={p.run} prior={p} userId={user.id} />
            ))}
          </div>
        </div>
      )}
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
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Activity[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [openActivity, setOpenActivity] = useState<Activity | null>(null);
  const [groupAccess, setGroupAccess] = useState<
    Record<string, { accessible: boolean; has_completed: boolean }>
  >({});
  const [view, setView] = useState<"map" | "list">("map");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [currentRun, setCurrentRun] = useState<number>(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [freshOpen, setFreshOpen] = useState(false);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: actData, error: actErr } = await supabase
        .from("coaching_activities_public")
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

      const { data: runState } = await supabase.rpc("coaching_get_run_state" as any);
      const run = ((runState as any)?.current_run as number) ?? 1;
      if (!cancelled) setCurrentRun(run);

      const { data: sessData } = await (supabase
        .from("coaching_activity_sessions")
        .select("id,activity_id,status")
        .eq("user_id", user.id)
        .eq("status", "in_progress") as any)
        .eq("run_number", run);
      if (cancelled) return;
      setSessions(((sessData as any) || []) as SessionRow[]);

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

      const { data: gaRows } = await supabase.rpc("coaching_group_access" as any);
      if (cancelled) return;
      const gaMap: Record<string, { accessible: boolean; has_completed: boolean }> = {};
      for (const row of (gaRows || []) as any[]) {
        const key = row.module_group ?? row.group ?? row.name;
        if (!key) continue;
        gaMap[key as string] = {
          accessible: !!row.accessible,
          has_completed: !!row.has_completed,
        };
      }
      setGroupAccess(gaMap);

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  const grouped = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    for (const a of activities) {
      const key = a.module_group || a.tier || "Coaching";
      (groups[key] = groups[key] || []).push(a);
    }
    return groups;
  }, [activities]);

  // Debounced semantic search via edge function
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSubmittedQuery("");
      setSearchResults(null);
      setSearching(false);
      return;
    }
    const t = setTimeout(() => {
      setSubmittedQuery(q);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const q = submittedQuery.trim();
    if (!q) return;
    let cancelled = false;
    setSearching(true);
    (async () => {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "coaching-activity-search",
        { body: { query: q } },
      );
      if (cancelled) return;
      if (fnErr || !data?.success) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      const results = (data.results || []) as Array<{
        activity_id: string;
        code: string;
        title: string;
        module_group: string | null;
        tier: string | null;
        description: string | null;
        thumbnail_url: string | null;
        similarity: number;
      }>;
      const mapped: Activity[] = results.map((r) => {
        const existing = activities.find((a) => a.id === r.activity_id);
        return (
          existing || {
            id: r.activity_id,
            code: r.code,
            title: r.title,
            tier: r.tier,
            status: "published",
            module_group: r.module_group,
            sequence: null,
            desired_outcome: r.description,
            definition: {},
            tags: [],
            thumbnail_url: r.thumbnail_url,
          }
        );
      });
      setSearchResults(mapped);
      setSearching(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [submittedQuery, activities]);


  const inProgressSet = useMemo(
    () => new Set(sessions.map((s) => s.activity_id)),
    [sessions],
  );

  const MAP_GROUPS = [
    "Purpose",
    "Future",
    "Present",
    "Past",
    "Life's Tools",
    "Pathway",
    "Resolve",
    "Support",
  ];
  const lockedGroups = MAP_GROUPS.filter((g) => !groupAccess[g]?.accessible);
  const introAccessible = !!groupAccess["Intro"]?.accessible;

  const groupActivities = useMemo(
    () =>
      selectedGroup
        ? activities.filter((a) => a.module_group === selectedGroup)
        : [],
    [activities, selectedGroup],
  );

  const onSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) {
      setSubmittedQuery("");
      setSearchResults(null);
      return;
    }
    setSubmittedQuery(q);
  };

  const searchBox = (
    <form onSubmit={onSearchSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search activities"
          className="pl-9"
        />
      </div>
      <Button type="submit" variant="outline" disabled={searching || !query.trim()}>
        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
      </Button>
    </form>
  );

  const renderCards = (items: Activity[]) => (
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
      {submittedQuery ? (
        searching ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching…
          </div>
        ) : searchResults && searchResults.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Results for "{submittedQuery}"
            </h2>
            {renderCards(searchResults)}
          </section>
        ) : (
          <Card>
            <CardContent className="p-10 text-center">
              <Search className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No matching activities
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <section key={group} className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">{group}</h2>
            {renderCards(items)}
          </section>
        ))
      )}
    </div>
  );


  const mapView = (
    <div className="space-y-6">
      <div className="flex justify-center">
        <Button
          size="lg"
          className="w-full max-w-4xl"
          disabled={!introAccessible}
          onClick={() => introAccessible && setSelectedGroup("Intro")}
        >
          Start here
          {!introAccessible && (
            <span className="ml-2 text-xs opacity-80">Coming soon</span>
          )}
        </Button>
      </div>
      <TransitionMap
        className="w-full max-w-4xl mx-auto"
        onSelectGroup={setSelectedGroup}
        lockedGroups={lockedGroups}
      />
      <div className="flex justify-center">
        <Button
          size="lg"
          variant="default"
          className="w-full max-w-4xl"
          onClick={() => setSelectedGroup("Summary")}
        >
          Wrap up
        </Button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">My Coaching</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Short, guided activities to help you turn insight into action.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Review & Action Plan
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFreshOpen(true)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Fresh Start
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "activities" | "history")}>
        <TabsList>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="activities" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
              <Button
                type="button"
                size="sm"
                variant={view === "map" ? "default" : "ghost"}
                className="h-8"
                onClick={() => setView("map")}
              >
                Map
              </Button>
              <Button
                type="button"
                size="sm"
                variant={view === "list" ? "default" : "ghost"}
                className="h-8"
                onClick={() => setView("list")}
              >
                Browse all
              </Button>
            </div>
          </div>
          {view === "map" ? mapView : activitiesContent}
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          {tab === "history" ? <HistoryTab /> : null}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!selectedGroup}
        onOpenChange={(v) => {
          if (!v) setSelectedGroup(null);
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>{selectedGroup}</DialogTitle>
          </DialogHeader>
          {groupActivities.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nothing here yet. Check back soon.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {groupActivities.map((a) => (
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
          )}
        </DialogContent>
      </Dialog>

      <BriefingDialog
        activity={openActivity}
        access={openActivity ? access[openActivity.id] : undefined}
        inProgress={openActivity ? inProgressSet.has(openActivity.id) : false}
        open={!!openActivity}
        onOpenChange={(v) => {
          if (!v) setOpenActivity(null);
        }}
      />

      <ReviewActionPlanDialog open={reviewOpen} onOpenChange={setReviewOpen} />
      <FreshStartConfirm open={freshOpen} onOpenChange={setFreshOpen} onDone={reload} />
    </div>
  );
}




function ReviewActionPlanDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [empty, setEmpty] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      setReview(null);
      setEmpty(false);
      setHistory([]);
      const { data, error } = await supabase.functions.invoke("coaching-review-action-plan", {
        body: { mode: "generate" },
      });
      if (cancelled) return;
      if (error) {
        const status = (error as any).context?.status;
        if (status === 402) {
          toast.error("You've used your coaching runs.", {
            description: "Upgrade for more.",
            action: { label: "Upgrade", onClick: () => (window.location.href = "/pricing") },
          });
        } else {
          toast.error("Something went wrong. Please try again.");
        }
        setLoading(false);
        onOpenChange(false);
        return;
      }
      if ((data as any)?.activity_count === 0) {
        setEmpty(true);
        setLoading(false);
        return;
      }
      setReview((data as any)?.review ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const send = async () => {
    const q = question.trim();
    if (!q || asking) return;
    const nextHistory = [...history, { role: "user" as const, content: q }];
    setHistory(nextHistory);
    setQuestion("");
    setAsking(true);
    const { data, error } = await supabase.functions.invoke("coaching-review-action-plan", {
      body: { mode: "ask", question: q, history },
    });
    setAsking(false);
    if (error) {
      toast.error("Couldn't get an answer. Please try again.");
      return;
    }
    const answer = ((data as any)?.answer as string) ?? "";
    setHistory([...nextHistory, { role: "assistant", content: answer }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review & Action Plan</DialogTitle>
          <DialogDescription>
            A synthesis of your work in this run, with room for follow-up questions.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : err ? (
          <p className="text-sm text-destructive">{err}</p>
        ) : empty ? (
          <p className="text-sm text-muted-foreground py-4">
            You haven't completed any activities in this run yet.
          </p>
        ) : review ? (
          <div className="space-y-5">
            <ReviewBody review={review} />

            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-semibold">Ask a question</h4>
              {history.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto rounded-md border border-border p-3">
                  {history.map((m, i) => (
                    <div
                      key={i}
                      className={
                        m.role === "user"
                          ? "text-sm"
                          : "text-sm text-muted-foreground whitespace-pre-wrap"
                      }
                    >
                      <span className="text-xs uppercase tracking-wide mr-2 opacity-70">
                        {m.role === "user" ? "You" : "Coach"}
                      </span>
                      {m.content}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-start">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. Which action should I start with this week?"
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={send} disabled={asking || !question.trim()}>
                  {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function FreshStartConfirm({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const confirm = async () => {
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("coaching-fresh-start");
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't start fresh. Please try again.");
      return;
    }
    toast.success("Fresh start complete — your journey has been reset.");
    onOpenChange(false);
    onDone();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start fresh?</AlertDialogTitle>
          <AlertDialogDescription>
            Your current summary is cleared and rebuilt from your Personal Threat Profile,
            and your journey resets so you can go through the activities again. Nothing is
            lost — your previous work is saved and shown under "Previous runs" in your History.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); confirm(); }} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Start fresh
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

