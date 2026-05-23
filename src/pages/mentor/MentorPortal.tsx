import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import MentorProgressTree from "@/components/mentor/MentorProgressTree";
import ReviewDrawer from "@/components/mentor/ReviewDrawer";

interface DrawerState {
  contentItemId: string;
  itemType: string;
  traineeId: string;
}

const pendingActionPillStyle: React.CSSProperties = {
  backgroundColor: "color-mix(in oklab, var(--bw-amber) 18%, white)",
  color: "var(--bw-mustard)",
};


interface Trainee {
  trainee_user_id: string;
  full_name: string | null;
  email: string | null;
  pending_action_count: number;
}

export default function MentorPortal() {
  const rosterQuery = useQuery({
    queryKey: ["list_mentor_trainees"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_mentor_trainees" as never);
      if (error) throw error;
      return data as any;
    },
  });

  const viewerRole: string | undefined = rosterQuery.data?.viewer_role;
  const trainees: Trainee[] = useMemo(
    () => (Array.isArray(rosterQuery.data?.trainees) ? rosterQuery.data.trainees : []),
    [rosterQuery.data],
  );

  const totalPending = useMemo(
    () => trainees.reduce((sum, t) => sum + (t.pending_action_count || 0), 0),
    [trainees],
  );

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"needs" | "all" | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const queryClient = useQueryClient();

  const handleActionComplete = () => {
    if (!drawer) return;
    queryClient.invalidateQueries({
      queryKey: ["get_content_item_for_viewer", drawer.contentItemId, drawer.traineeId],
    });
    queryClient.invalidateQueries({ queryKey: ["get_user_learning_state", drawer.traineeId] });
    queryClient.invalidateQueries({ queryKey: ["list_mentor_trainees"] });
  };

  const effectiveTab = tab ?? (totalPending > 0 ? "needs" : "all");

  const visibleTrainees = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = trainees.slice();
    if (effectiveTab === "needs") list = list.filter((t) => (t.pending_action_count || 0) > 0);
    if (q) {
      list = list.filter(
        (t) =>
          (t.full_name ?? "").toLowerCase().includes(q) ||
          (t.email ?? "").toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      const pa = a.pending_action_count || 0;
      const pb = b.pending_action_count || 0;
      if (pa !== pb) return pb - pa;
      return (a.full_name ?? a.email ?? "").localeCompare(b.full_name ?? b.email ?? "");
    });
    return list;
  }, [trainees, search, effectiveTab]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (rosterQuery.isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (rosterQuery.error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            Failed to load mentor portal.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewerRole === "none") {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Mentor Portal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-10 text-center space-y-2">
              <p className="text-foreground font-medium">You have no assigned trainees yet.</p>
              <p className="text-sm text-muted-foreground">
                When learners are assigned to you as a mentor, they will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle>Mentor Portal</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Review the learning progress of your assigned trainees.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">{trainees.length} trainees</Badge>
              <Badge
                className={cn(
                  totalPending > 0
                    ? "bg-amber-100 text-amber-900 hover:bg-amber-100 border-transparent dark:bg-amber-900/30 dark:text-amber-200"
                    : "bg-muted text-muted-foreground hover:bg-muted border-transparent",
                )}
              >
                {totalPending} pending action{totalPending === 1 ? "" : "s"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <Tabs value={effectiveTab} onValueChange={(v) => setTab(v as "needs" | "all")}>
              <TabsList>
                <TabsTrigger value="needs">Needs Review</TabsTrigger>
                <TabsTrigger value="all">All Trainees</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email"
                className="pl-8"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Trainee</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleTrainees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                    No trainees match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                visibleTrainees.map((t) => (
                  <TraineeRow
                    key={t.trainee_user_id}
                    trainee={t}
                    expanded={expanded.has(t.trainee_user_id)}
                    onToggle={() => toggleExpanded(t.trainee_user_id)}
                    onItemClick={(contentItemId, itemType) =>
                      setDrawer({ contentItemId, itemType, traineeId: t.trainee_user_id })
                    }
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ReviewDrawer
        open={drawer !== null}
        onOpenChange={(o) => !o && setDrawer(null)}
        contentItemId={drawer?.contentItemId ?? null}
        itemType={drawer?.itemType ?? null}
        traineeId={drawer?.traineeId ?? null}
        onActionComplete={handleActionComplete}
      />
    </div>
  );
}

function TraineeRow({
  trainee,
  expanded,
  onToggle,
  onItemClick,
}: {
  trainee: Trainee;
  expanded: boolean;
  onToggle: () => void;
  onItemClick: (contentItemId: string, itemType: string) => void;
}) {
  const pending = trainee.pending_action_count || 0;
  const stateQuery = useQuery({
    queryKey: ["get_user_learning_state", trainee.trainee_user_id],
    enabled: expanded,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_learning_state" as never, {
        p_user_id: trainee.trainee_user_id,
      } as never);
      if (error) throw error;
      return data as any;
    },
  });

  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </TableCell>
        <TableCell>
          <Link
            to={`/mentor/trainee/${trainee.trainee_user_id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-primary hover:underline"
          >
            {trainee.full_name || trainee.email || "Unnamed trainee"}
          </Link>
        </TableCell>
        <TableCell className="text-muted-foreground">{trainee.email ?? "—"}</TableCell>
        <TableCell className="text-right">
          <Badge
            className={cn(
              pending > 0
                ? "bg-amber-100 text-amber-900 hover:bg-amber-100 border-transparent dark:bg-amber-900/30 dark:text-amber-200"
                : "bg-muted text-muted-foreground hover:bg-muted border-transparent",
            )}
          >
            {pending}
          </Badge>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={4} className="bg-muted/30">
            {stateQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading progress…
              </div>
            ) : stateQuery.error ? (
              <div className="text-sm text-destructive py-4">Failed to load progress.</div>
            ) : (
              <div className="py-2">
                <MentorProgressTree learningState={stateQuery.data} onItemClick={onItemClick} />
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
