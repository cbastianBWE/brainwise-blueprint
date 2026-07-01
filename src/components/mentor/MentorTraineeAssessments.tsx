import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INSTRUMENT_ID_TO_NAME } from "@/lib/instruments";
import {
  useMentorTraineeCompletions,
  useMentorTraineeClientTracking,
} from "@/hooks/useMentorTraineeAssessments";

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(undefined, { dateStyle: "medium" });
  } catch {
    return d;
  }
}

const forestPillStyle: React.CSSProperties = {
  backgroundColor: "color-mix(in oklab, var(--bw-forest) 12%, white)",
  color: "var(--bw-forest)",
};

interface Props {
  traineeId: string;
}

export default function MentorTraineeAssessments({ traineeId }: Props) {
  const completionsQuery = useMentorTraineeCompletions();
  const clientTrackingQuery = useMentorTraineeClientTracking();
  const [clientFilter, setClientFilter] = useState<"actors" | "all">("actors");

  if (completionsQuery.isLoading || clientTrackingQuery.isLoading) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center"
      >
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        Loading assessments…
      </div>
    );
  }

  if (completionsQuery.error || clientTrackingQuery.error) {
    return (
      <div className="py-8 text-center space-y-3">
        <p className="text-sm text-destructive">Failed to load assessment data.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            completionsQuery.refetch();
            clientTrackingQuery.refetch();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  const completions = completionsQuery.data?.[traineeId] ?? [];
  const clientBase = clientTrackingQuery.data?.[traineeId] ?? [];
  const clientFiltered =
    clientFilter === "actors" ? clientBase.filter((r) => r.is_actor) : clientBase;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-base font-semibold">Assessments completed</h3>
        {completions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No assessments completed yet.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {completions.map((c, i) => (
              <li
                key={`${c.instrument_id}-${i}`}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0"
                    style={{ color: "var(--bw-forest)" }}
                  />
                  <span className="text-sm truncate">
                    {INSTRUMENT_ID_TO_NAME[c.instrument_id] ?? c.instrument_id}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {fmtDate(c.last_completed_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-base font-semibold">Actors and clients</h3>
          <div className="inline-flex rounded-md border p-0.5 bg-muted">
            <Button
              variant={clientFilter === "actors" ? "secondary" : "ghost"}
              size="sm"
              className="h-7"
              onClick={() => setClientFilter("actors")}
            >
              Actors
            </Button>
            <Button
              variant={clientFilter === "all" ? "secondary" : "ghost"}
              size="sm"
              className="h-7"
              onClick={() => setClientFilter("all")}
            >
              All
            </Button>
          </div>
        </div>

        {clientBase.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No actors or clients yet.
          </p>
        ) : clientFiltered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No actors yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {clientFiltered.map((r) => {
              const displayName =
                r.client_name || r.client_email || "Unnamed";
              const showEmailBeneath = !!r.client_name && !!r.client_email;
              return (
                <li
                  key={r.coach_client_id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {displayName}
                    </div>
                    {showEmailBeneath && (
                      <div className="text-xs text-muted-foreground truncate">
                        {r.client_email}
                      </div>
                    )}
                    {r.is_actor && r.actor_instrument_id && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {INSTRUMENT_ID_TO_NAME[r.actor_instrument_id] ??
                          r.actor_instrument_id}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 shrink-0">
                    {r.assessment_completed ? (
                      <>
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={forestPillStyle}
                        >
                          Completed
                        </span>
                        {r.completed_at && (
                          <span className="text-xs text-muted-foreground">
                            {fmtDate(r.completed_at)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Not completed
                      </span>
                    )}
                    {r.debrief_completed ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium"
                        style={{ color: "var(--bw-forest)" }}
                      >
                        <CheckCircle2
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        />
                        Debrief complete
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Debrief pending
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
