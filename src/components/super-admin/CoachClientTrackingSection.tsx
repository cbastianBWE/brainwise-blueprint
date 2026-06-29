import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";

interface TrackingRow {
  coach_client_id: string;
  coach_user_id: string;
  client_user_id: string | null;
  coach_name: string | null;
  client_name: string | null;
  client_email: string | null;
  is_actor: boolean;
  actor_instrument_id: string | null;
  invitation_status: string | null;
  invited_at: string | null;
  assessment_completed: boolean;
  completed_at: string | null;
  debrief_completed: boolean;
}

const INSTRUMENT_LABEL: Record<string, string> = {
  "INST-001": "PTP",
  "INST-002": "NAI",
  "INST-002L": "EPN",
  "INST-003": "AIRSA",
  "INST-004": "HSS",
};

const fmt = (d: string | null) => (d ? format(new Date(d), "MMM d, yyyy") : "—");

function statusBadge(s: string | null) {
  const label = (s ?? "—")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return <Badge variant="outline">{label}</Badge>;
}

export default function CoachClientTrackingSection() {
  const [rows, setRows] = useState<TrackingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorsOnly, setActorsOnly] = useState(true);
  const [sortBy, setSortBy] = useState<"invited" | "completed">("invited");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc(
        "super_admin_coach_client_tracking" as any
      );
      if (!cancelled) {
        if (!error && data) setRows(data as TrackingRow[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const view = useMemo(() => {
    let r = actorsOnly ? rows.filter((x) => x.is_actor) : rows;
    const key = sortBy === "invited" ? "invited_at" : "completed_at";
    r = [...r].sort((a, b) => {
      const av = (a[key] ?? "") as string;
      const bv = (b[key] ?? "") as string;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [rows, actorsOnly, sortBy, sortDir]);

  const toggleSort = (f: "invited" | "completed") => {
    if (sortBy === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(f);
      setSortDir("desc");
    }
  };

  const SortIcon = sortDir === "asc" ? ArrowUp : ArrowDown;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coach Client &amp; Actor Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={actorsOnly}
              onCheckedChange={(c) => setActorsOnly(Boolean(c))}
            />
            Actors only
          </label>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sort:</span>
            <Button
              size="sm"
              variant={sortBy === "invited" ? "default" : "outline"}
              onClick={() => toggleSort("invited")}
            >
              Invited{" "}
              {sortBy === "invited" && <SortIcon className="h-3 w-3 ml-1" />}
            </Button>
            <Button
              size="sm"
              variant={sortBy === "completed" ? "default" : "outline"}
              onClick={() => toggleSort("completed")}
            >
              Completed{" "}
              {sortBy === "completed" && <SortIcon className="h-3 w-3 ml-1" />}
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Coach</TableHead>
              <TableHead>Client / Actor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Invitation</TableHead>
              <TableHead>Assessment</TableHead>
              <TableHead>Debrief</TableHead>
              <TableHead>Invited</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                  Loading…
                </TableCell>
              </TableRow>
            ) : view.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                  No records.
                </TableCell>
              </TableRow>
            ) : (
              view.map((r) => (
                <TableRow key={r.coach_client_id}>
                  <TableCell>{r.coach_name ?? "—"}</TableCell>
                  <TableCell>
                    <div className="font-medium">{r.client_name ?? "—"}</div>
                    {r.client_email && (
                      <div className="text-xs text-muted-foreground">
                        {r.client_email}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.is_actor ? (
                      <Badge>
                        Actor
                        {r.actor_instrument_id
                          ? ` · ${INSTRUMENT_LABEL[r.actor_instrument_id] ?? r.actor_instrument_id}`
                          : ""}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Client</Badge>
                    )}
                  </TableCell>
                  <TableCell>{statusBadge(r.invitation_status)}</TableCell>
                  <TableCell>
                    {r.assessment_completed ? (
                      <Badge variant="secondary">
                        Completed · {fmt(r.completed_at)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Not completed
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.debrief_completed ? (
                      <Badge variant="secondary">Complete</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{fmt(r.invited_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
