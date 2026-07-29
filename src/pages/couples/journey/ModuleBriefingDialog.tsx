import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BrandedPlaceholder,
  renderImg,
  type MilestoneActivityRow,
  type ModuleRow,
} from "./journeyShared";
import LockNotice from "./LockNotice";

export interface ModuleBriefingDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /**
   * Display ordinal, 1-based. Callers pass position + 1 — `module_number`
   * is zero-based in the database and must never be rendered raw.
   */
  moduleNumber: number;
  /** Total milestone count, for the "Milestone 1 of 8" badge. */
  totalModules?: number;
  module: ModuleRow | null;
  activityCount: number;
  minutes: { low: number; high: number } | null;
  /** First allowed activity code in the module, if any. */
  startCode: string | null;
  /** Reason from the first blocked activity, when nothing is open yet. */
  blockedReason: string | null;
  onStart: (code: string) => void;
  /** Optional activity list, shown when the dialog is opened from the map. */
  activities?: MilestoneActivityRow[];
  /** Row click — opens that activity's own briefing, stacked over this one. */
  onActivitySelect?: (code: string) => void;
  /** Row button — goes straight to the runner. */
  onActivityOpen?: (code: string) => void;
  selfColor?: string;
  partnerColor?: string;
}

const isDone = (s: string | null | undefined) => s === "completed";
const isTouched = (s: string | null | undefined) =>
  s === "in_progress" || s === "submitted" || s === "completed";

export default function ModuleBriefingDialog({
  open,
  onOpenChange,
  moduleNumber,
  totalModules,
  module,
  activityCount,
  minutes,
  startCode,
  blockedReason,
  onStart,
  activities,
  onActivitySelect,
  onActivityOpen,
  selfColor = "#006D77",
  partnerColor = "#3C096C",
}: ModuleBriefingDialogProps) {
  const hero = module?.hero_image_url || null;
  const outcomes = module?.learning_outcomes || [];
  const tags = module?.tags || [];

  const timeLine = minutes
    ? `About ${minutes.low} to ${minutes.high} minutes across ${activityCount} ${
        activityCount === 1 ? "activity" : "activities"
      }`
    : `${activityCount} ${activityCount === 1 ? "activity" : "activities"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto p-0">
        <div className="w-full overflow-hidden bg-muted" style={{ aspectRatio: "2 / 1" }}>
          {hero ? (
            <img
              src={renderImg(hero, 800, 400)}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <BrandedPlaceholder />
          )}
        </div>
        <div className="space-y-4 p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                Milestone {moduleNumber}
                {totalModules ? ` of ${totalModules}` : ""}
              </Badge>
            </div>
            <DialogTitle className="text-xl leading-snug">
              {module?.title || `Milestone ${moduleNumber}`}
            </DialogTitle>
            {module?.description && (
              <DialogDescription>{module.description}</DialogDescription>
            )}
          </DialogHeader>

          {outcomes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">What you'll get</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {outcomes.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="font-medium text-foreground">Time</span>
              <span className="text-muted-foreground">{timeLine}</span>
            </div>
            {module?.prerequisites && (
              <div className="flex gap-2">
                <span className="font-medium text-foreground">Prerequisites</span>
                <span className="text-muted-foreground">{module.prerequisites}</span>
              </div>
            )}
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Badge key={t} variant="outline" className="text-xs font-normal">
                  {t}
                </Badge>
              ))}
            </div>
          )}

          {activities && activities.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">What's inside</h3>
              {activities.map((r, i) => {
                const da = isDone(r.own_status);
                const db = isDone(r.partner_status);
                const ha = !da && isTouched(r.own_status);
                const hb = !db && isTouched(r.partner_status);
                const verb =
                  r.own_status === "in_progress"
                    ? "Resume"
                    : !r.own_status || r.own_status === "not_started"
                      ? "Begin"
                      : "Open";
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-lg border p-1 pl-3 transition-colors hover:bg-muted/50"
                  >
                    {/* The row is the "tell me more" surface… */}
                    <button
                      type="button"
                      onClick={() => onActivitySelect?.(r.code)}
                      className="min-w-0 flex-1 py-2 text-left"
                    >
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        {!r.allowed && (
                          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">
                          {i + 1}. {r.title}
                        </span>
                      </p>
                      {!r.allowed && r.reason && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{r.reason}</p>
                      )}
                    </button>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <i
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: da ? selfColor : ha ? `${selfColor}73` : "#DCD7C8" }}
                      />
                      <i
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          background: db ? partnerColor : hb ? `${partnerColor}73` : "#DCD7C8",
                        }}
                      />
                    </span>
                    {/* …the button carries the verb. */}
                    <Button
                      size="sm"
                      variant={r.allowed ? "default" : "ghost"}
                      disabled={!r.allowed}
                      className="shrink-0"
                      onClick={() => onActivityOpen?.(r.code)}
                    >
                      {r.allowed ? verb : "Locked"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter className="flex-col items-stretch gap-2 sm:flex-col sm:items-stretch">
            {!startCode && blockedReason && (
              <p className="text-xs text-muted-foreground">{blockedReason}</p>
            )}
            {startCode ? (
              <Button onClick={() => onStart(startCode)}>Start Milestone {moduleNumber}</Button>
            ) : (
              <Button disabled>Not open yet</Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
