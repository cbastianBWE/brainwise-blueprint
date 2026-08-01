import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LockNotice from "./LockNotice";
import {
  fetchFocusActivities,
  fetchFocusAreas,
  type FocusActivityRow,
  type FocusAreaRow,
} from "./focusShared";

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  completed: "Completed",
  done: "Done",
};

/**
 * Chosen focus areas and their activities. Focus work is deliberately absent
 * from `relationship_journey_state`, so this is a second source rendered with
 * the same row shape, lock copy and navigation as the core journey.
 */
export function FocusAreasSection({
  relationshipId,
  otherName,
  onOpen,
}: {
  relationshipId: string;
  otherName: string;
  onOpen: (code: string) => void;
}) {
  const [areas, setAreas] = useState<FocusAreaRow[] | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [rows, setRows] = useState<Record<string, FocusActivityRow[] | "loading">>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await fetchFocusAreas(relationshipId);
      // Selected *and* live: an area whose content isn't ready is never enterable.
      if (!cancelled) setAreas(all.filter((a) => a.selected && a.content_ready));
    })();


    return () => {
      cancelled = true;
    };
  }, [relationshipId]);

  const expand = async (areaCode: string) => {
    const next = !open[areaCode];
    setOpen((o) => ({ ...o, [areaCode]: next }));
    if (next && !rows[areaCode]) {
      setRows((r) => ({ ...r, [areaCode]: "loading" }));
      const list = await fetchFocusActivities(relationshipId, areaCode);
      setRows((r) => ({ ...r, [areaCode]: list }));
    }
  };

  if (!areas || areas.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Focus areas</h2>
      {areas.map((a) => {
        const list = rows[a.area_code];
        const lookupByTitle = (title: string) => {
          const t = title.trim().toLowerCase();
          const hit = Array.isArray(list)
            ? list.find((r) => r.title.trim().toLowerCase() === t)
            : null;
          return hit ? { code: hit.code, allowed: hit.allowed } : null;
        };
        return (
          <Card key={a.area_code} className="overflow-hidden">
            <button type="button" onClick={() => expand(a.area_code)} className="block w-full text-left">
              <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
                <div>
                  <CardTitle className="text-base">{a.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {a.done_activities ?? 0} of {a.total_activities ?? 0} done
                  </p>
                </div>
                {open[a.area_code] ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
            </button>
            {open[a.area_code] && (
              <CardContent className="space-y-2">
                {list === "loading" || !list ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : list.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">Nothing here yet.</p>
                ) : (
                  list.map((r) => {
                    const est =
                      r.est_minutes_low && r.est_minutes_high
                        ? `${r.est_minutes_low}–${r.est_minutes_high} min`
                        : r.est_minutes_low
                          ? `${r.est_minutes_low} min`
                          : null;
                    return (
                      <div
                        key={r.activity_id}
                        className={"rounded-lg border " + (r.allowed ? "" : "opacity-60")}
                      >
                        <button
                          type="button"
                          onClick={() => r.allowed && onOpen(r.code)}
                          className="block w-full text-left transition-opacity hover:opacity-90"
                        >
                          <div className="flex flex-col gap-1.5 p-3 pb-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              {!r.allowed && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                              <span className="text-sm font-medium">{r.title}</span>
                              {r.reveal_pending && (
                                <Badge variant="default" className="gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  Something to see
                                </Badge>
                              )}
                              <Badge variant="secondary">
                                {STATUS_LABEL[r.own_status || "not_started"] || r.own_status}
                              </Badge>
                              {est && <span className="text-xs text-muted-foreground">{est}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {otherName}:{" "}
                              {STATUS_LABEL[r.partner_status || "not_started"]?.toLowerCase() ||
                                r.partner_status}
                            </p>
                          </div>
                        </button>
                        {!r.allowed && (
                          <LockNotice
                            className="px-3 pb-3"
                            reasonCode={r.reason_code}
                            reasonDetail={r.reason_detail}
                            otherName={otherName}
                            siblingTitles={list
                              .filter((x) => x.code !== r.code)
                              .map((x) => x.title)}
                            lookupByTitle={lookupByTitle}
                            onOpenActivity={onOpen}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </section>
  );
}

export default FocusAreasSection;
