import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  Compass,
  Loader2,
  Lock,
  Mountain,
  Sprout,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BrandedPlaceholder, renderImg, type CatalogueActivity } from "./journeyShared";
import ActivityBriefingDialog from "./ActivityBriefingDialog";
import {
  fetchFocusStopActivities,
  fetchFocusStopAreas,
  focusLock,
  groupByCluster,
  STATUS_LABEL,
  type FocusStopActivity,
  type FocusStopArea,
} from "./focusStopsShared";

/**
 * Focus Stops beside the road: cluster chip → cluster panel → area panel →
 * activity detail. Milestones sit on the road, Focus Stops sit off it, so the
 * chips are dashed pills rather than road nodes.
 *
 * Everything renders. Access only ever decides the lock treatment.
 */

const ACCENT = "#F5741A";

const CLUSTER_ICON: Record<string, typeof Users> = {
  "Your family": Users,
  "Big pressures": Zap,
  "Life stages and change": Sprout,
  "Harder chapters": Mountain,
};

function minutesFor(a: FocusStopActivity): string | null {
  if (a.time_estimate) return a.time_estimate;
  if (a.est_minutes_low && a.est_minutes_high)
    return `${a.est_minutes_low}–${a.est_minutes_high} min`;
  if (a.est_minutes_low) return `${a.est_minutes_low} min`;
  return null;
}

function Thumb({ url, className }: { url: string | null; className?: string }) {
  return (
    <div className={"shrink-0 overflow-hidden rounded-md bg-muted " + (className || "h-12 w-20")}>
      {url ? (
        <img
          src={renderImg(url, 240, 144)}
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

export function FocusStops({
  relationshipId,
  otherName = "Your partner",
  onOpenActivity,
  className,
}: {
  relationshipId: string;
  otherName?: string;
  onOpenActivity: (code: string) => void;
  className?: string;
}) {
  const [areas, setAreas] = useState<FocusStopArea[] | null>(null);
  const [openCluster, setOpenCluster] = useState<string | null>(null);
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [acts, setActs] = useState<FocusStopActivity[] | "loading" | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const loadAreas = useCallback(async () => {
    setAreas(await fetchFocusStopAreas(relationshipId));
  }, [relationshipId]);

  useEffect(() => {
    void loadAreas();
  }, [loadAreas]);

  const clusters = useMemo(() => groupByCluster(areas || []), [areas]);
  const area = useMemo(
    () => (areas || []).find((a) => a.area_code === openArea) || null,
    [areas, openArea],
  );

  const loadActs = useCallback(
    async (areaCode: string) => {
      setActs("loading");
      setActs(await fetchFocusStopActivities(relationshipId, areaCode));
    },
    [relationshipId],
  );

  const openAreaPanel = (areaCode: string) => {
    setOpenArea(areaCode);
    setNote(null);
    void loadActs(areaCode);
  };

  const toggleChoose = async () => {
    if (!area || !area.self_selectable || area.practitioner_gated) return;
    setBusy(true);
    setNote(null);
    const fn = area.selected
      ? "relationship_unchoose_focus_area"
      : "relationship_choose_focus_area";
    const { data, error } = await supabase.rpc(fn, {
      p_relationship: relationshipId,
      p_area_code: area.area_code,
    });
    const res = (data as Array<{ ok: boolean; reason: string }> | null)?.[0];
    if (error || (res && !res.ok)) {
      setNote(
        res?.reason === "work_started"
          ? "You've started this one, so it stays."
          : res?.reason === "practitioner_only"
            ? "Your practitioner opens this one."
            : "That didn't go through. Try again in a moment.",
      );
    }
    // Both reads move together: the area row's counts and every activity's lock.
    await Promise.all([loadAreas(), loadActs(area.area_code)]);
    setBusy(false);
  };

  if (areas === null) {
    return (
      <div className={"flex items-center gap-2 py-4 text-sm text-muted-foreground " + (className || "")}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading Focus Stops…
      </div>
    );
  }
  if (areas.length === 0) return null;

  const detailRow = Array.isArray(acts) ? acts.find((a) => a.code === detail) || null : null;
  const detailCatalogue: CatalogueActivity | null = detailRow
    ? {
        id: detailRow.activity_id,
        code: detailRow.code,
        title: detailRow.title,
        module_number: null,
        sequence: detailRow.seq,
        tags: detailRow.tags,
        hero_image_url: detailRow.hero_image_url,
        definition: {
          briefing: {
            description: detailRow.briefing_description || undefined,
            learning_outcomes: detailRow.learning_outcomes || undefined,
            time_estimate: minutesFor(detailRow) || undefined,
            // Readable titles in journey order. `briefing_prerequisites` is the
            // prose version and `prerequisite_codes` is raw — neither is shown.
            prerequisites: (detailRow.prerequisite_titles || []).join(" · ") || undefined,
            hero_image_url: detailRow.hero_image_url || undefined,
          },
        },
        est_minutes_low: detailRow.est_minutes_low,
        est_minutes_high: detailRow.est_minutes_high,
      }
    : null;

  return (
    <div className={"space-y-3 " + (className || "")}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Focus Stops
        </p>
        <p className="text-xs text-muted-foreground">
          Beside the road, not on it. Look inside any of them before you decide.
        </p>
      </div>

      {/* Level 1 — cluster chips. Counts come from the RPC rows, never hardcoded. */}
      <div className="flex flex-wrap gap-2">
        {clusters.map((c) => {
          const Icon = CLUSTER_ICON[c.cluster] || Compass;
          const active = openCluster === c.cluster;
          return (
            <button
              key={c.cluster}
              type="button"
              onClick={() => {
                // Single-open: a second chip replaces the first.
                const next = active ? null : c.cluster;
                setOpenCluster(next);
                setOpenArea(null);
                setActs(null);
              }}
              style={active ? { borderColor: ACCENT } : undefined}
              className="group inline-flex items-center gap-2 rounded-full border border-dashed border-border bg-background px-3 py-1.5 text-sm transition-colors hover:border-[#F5741A]"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span>{c.cluster}</span>
              <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">
                {c.areas.length}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Levels 2 and 3 share one panel — the area view replaces the cluster
          view rather than stacking a second layer on top of it. */}
      {openCluster && !openArea && (
        <div className="space-y-2 rounded-xl border bg-background p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {openCluster}
          </p>
          {(clusters.find((c) => c.cluster === openCluster)?.areas || []).map((a) => (
            <button
              key={a.area_code}
              type="button"
              onClick={() => openAreaPanel(a.area_code)}
              className="flex w-full items-start gap-3 rounded-lg border p-2 text-left transition-colors hover:bg-muted/50"
            >
              <Thumb url={a.hero_image_url} />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {a.practitioner_gated && <Lock className="h-3.5 w-3.5" style={{ color: ACCENT }} />}
                  <span className="text-sm font-medium">{a.title}</span>
                  {a.selected && (
                    <Badge variant="outline" className="gap-1 text-[11px] font-normal">
                      <Check className="h-3 w-3" />
                      Added
                    </Badge>
                  )}
                </div>
                {a.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{a.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {[
                    (a.done_activities ?? 0) > 0
                      ? `${a.done_activities} of ${a.total_activities ?? 0} done`
                      : `${a.total_activities ?? 0} ${a.total_activities === 1 ? "activity" : "activities"}`,
                    a.core_prereq_label,
                    !a.self_selectable || a.practitioner_gated
                      ? "Your practitioner opens this one"
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {openArea && area && (
        <div className="space-y-3 rounded-xl border bg-background p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  setOpenArea(null);
                  setActs(null);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
                {openCluster}
              </Button>
            </div>
            {area.self_selectable && !area.practitioner_gated ? (
              <Button
                type="button"
                size="sm"
                variant={area.selected ? "outline" : "default"}
                disabled={busy}
                onClick={toggleChoose}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : area.selected ? (
                  "Remove this stop"
                ) : (
                  "Add this stop"
                )}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Your practitioner opens this one.
              </span>
            )}
          </div>

          <div className="flex items-start gap-3">
            <Thumb url={area.hero_image_url} className="h-16 w-28" />
            <div className="min-w-0 space-y-1">
              <h3 className="text-sm font-semibold">{area.title}</h3>
              {area.description && (
                <p className="text-xs text-muted-foreground">{area.description}</p>
              )}
            </div>
          </div>

          {note && <p className="text-xs text-muted-foreground">{note}</p>}

          {acts === "loading" || acts === null ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : acts.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Nothing here yet.</p>
          ) : (
            <div className="space-y-2">
              {acts.map((r) => {
                const lock = focusLock(r, otherName);
                const mins = minutesFor(r);
                return (
                  <button
                    key={r.activity_id}
                    type="button"
                    onClick={() => setDetail(r.code)}
                    className={
                      "flex w-full items-start gap-3 rounded-lg border p-2 text-left transition-colors hover:bg-muted/50 " +
                      (lock.locked ? "opacity-80" : "")
                    }
                  >
                    <Thumb url={r.hero_image_url} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Per-activity padlock, from the row's own column — it
                            stays true even when reason_code is reporting
                            something earlier in the chain. */}
                        {r.practitioner_gated && (
                          <Lock className="h-3.5 w-3.5" style={{ color: ACCENT }} />
                        )}
                        <span className="text-sm font-medium">{r.title}</span>
                        <Badge variant="secondary" className="text-[11px]">
                          {STATUS_LABEL[r.own_status || "not_started"] || r.own_status}
                        </Badge>
                        {mins && <span className="text-xs text-muted-foreground">{mins}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {otherName}:{" "}
                        {(
                          STATUS_LABEL[r.partner_status || "not_started"] ||
                          r.partner_status ||
                          ""
                        ).toLowerCase()}
                      </p>
                      {lock.sentence && (
                        <p className="text-xs text-muted-foreground">
                          {lock.sentence}
                          {lock.titles.length > 0 ? ` ${lock.titles.join(", ")}.` : ""}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Level 4 — the same briefing dialog a Milestone activity uses, so the
          two read identically. */}
      <ActivityBriefingDialog
        relationshipId={relationshipId}
        open={detailRow != null}
        onOpenChange={(v) => !v && setDetail(null)}
        state={
          detailRow
            ? {
                code: detailRow.code,
                title: detailRow.title,
                allowed: detailRow.allowed,
                reason: detailRow.reason,
                reason_code: detailRow.reason_code,
                reason_detail: detailRow.reason_detail,
                own_status: detailRow.own_status,
                partner_status: detailRow.partner_status,
                reveal_pending: null,
                est_minutes_low: detailRow.est_minutes_low,
                est_minutes_high: detailRow.est_minutes_high,
              }
            : null
        }
        catalogue={detailCatalogue}
        moduleTitle={area?.title ?? null}
        otherName={otherName}
        siblingTitles={
          Array.isArray(acts)
            ? acts.filter((x) => x.code !== detailRow?.code).map((x) => x.title)
            : []
        }
        lookupByTitle={(title) => {
          if (!Array.isArray(acts)) return null;
          const t = title.trim().toLowerCase();
          const hit = acts.find((x) => x.title.trim().toLowerCase() === t);
          return hit ? { code: hit.code, allowed: hit.allowed } : null;
        }}
        onOpenActivity={(code) => setDetail(code)}
        onGo={(code) => {
          setDetail(null);
          onOpenActivity(code);
        }}
      />
    </div>
  );
}

export default FocusStops;
