import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { RosterRow, SEVERITY_LABEL, severityClasses } from "./couplesShared";

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="h-1.5 w-24 rounded-full bg-muted">
      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CoupleRoster({
  rows,
  onOpen,
}: {
  rows: RosterRow[];
  onOpen: (relationshipId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No couples yet. A couple appears here once you coach both partners.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Card key={r.relationship_id}>
          <CardContent className="p-4">
            <button
              type="button"
              onClick={() => onOpen(r.relationship_id)}
              className="flex w-full items-start justify-between gap-4 text-left"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {r.partner_one} &amp; {r.partner_two}
                  </p>
                  {r.run_number > 1 && (
                    <Badge variant="outline" className="text-xs">Run {r.run_number}</Badge>
                  )}
                  {r.pacing_ceiling_module != null && (
                    <Badge variant="outline" className="text-xs">
                      Paced to Milestone {r.pacing_ceiling_module}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    {r.partner_one}
                    <ProgressBar done={r.one_done} total={r.core_total} />
                    {r.one_done} / {r.core_total}
                  </span>
                  <span className="flex items-center gap-2">
                    {r.partner_two}
                    <ProgressBar done={r.two_done} total={r.core_total} />
                    {r.two_done} / {r.core_total}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {r.has_safeguarding && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
                      <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                      Safeguarding
                    </span>
                  )}
                  {r.open_alerts > 0 && (
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${severityClasses(r.max_open_severity)}`}
                    >
                      {r.open_alerts} open{" "}
                      {r.max_open_severity ? `· ${SEVERITY_LABEL[r.max_open_severity] ?? r.max_open_severity}` : ""}
                    </span>
                  )}
                  {r.last_activity && (
                    <span className="text-xs text-muted-foreground">
                      Last activity {format(new Date(r.last_activity), "d MMM yyyy")}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
