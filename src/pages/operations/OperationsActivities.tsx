import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "./_shared";

type Activity = {
  id: string;
  type: string | null;
  subject: string | null;
  status: string | null;
  scheduled_start_at: string | null;
  related_to_type: string | null;
  related_to_id: string | null;
};

function entityPath(type: string | null, id: string | null): string | null {
  if (!id || !type) return null;
  switch (type) {
    case "lead": return `/operations/leads/${id}`;
    case "account": return `/operations/accounts/${id}`;
    case "contact": return `/operations/contacts/${id}`;
    case "deal": return `/operations/deals/${id}`;
    default: return null;
  }
}

function Section({ title, rows }: { title: string; rows: Activity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title} <span className="text-muted-foreground font-normal">({rows.length})</span></CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => {
                const path = entityPath(a.related_to_type, a.related_to_id);
                const subject = a.subject || "(no subject)";
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      {path ? (
                        <Link to={path} className="text-primary hover:underline">{subject}</Link>
                      ) : (
                        subject
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline">{a.type || "—"}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.status || "—"}</TableCell>
                    <TableCell className="text-sm">{a.scheduled_start_at ? formatDate(a.scheduled_start_at) : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function OperationsActivities() {
  const { data } = useQuery({
    queryKey: ["ops", "activities", "dashboard"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("activities" as any)
        .select("id, type, subject, status, scheduled_start_at, related_to_type, related_to_id")
        .not("scheduled_start_at", "is", null)
        .order("scheduled_start_at");
      if (error) throw error;
      return (data || []) as unknown as Activity[];
    },
  });

  const { overdue, today, week } = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startTomorrow = startToday + 24 * 60 * 60 * 1000;
    const endWeek = startToday + 8 * 24 * 60 * 60 * 1000;
    const o: Activity[] = [], t: Activity[] = [], w: Activity[] = [];
    for (const a of data || []) {
      if (a.status === "done" || !a.scheduled_start_at) continue;
      const ts = new Date(a.scheduled_start_at).getTime();
      if (ts < startToday) o.push(a);
      else if (ts < startTomorrow) t.push(a);
      else if (ts < endWeek) w.push(a);
    }
    return { overdue: o, today: t, week: w };
  }, [data]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="text-sm text-muted-foreground">CRM · Tasks & meetings</p>
      </div>
      <Section title="Overdue" rows={overdue} />
      <Section title="Today" rows={today} />
      <Section title="This week" rows={week} />
    </div>
  );
}
