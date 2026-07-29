import { Sparkles } from "lucide-react";
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
  getBriefing,
  renderImg,
  type CatalogueActivity,
} from "./journeyShared";
import LockNotice from "./LockNotice";

export interface ActivityStateRow {
  code: string;
  title: string;
  allowed: boolean;
  /** Machine key plus payload. Never rendered — see LockNotice. */
  reason: string | null;
  reason_code?: string | null;
  reason_detail?: string[] | null;
  own_status: string | null;
  partner_status: string | null;
  reveal_pending: boolean | null;
  est_minutes_low: number | null;
  est_minutes_high: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  completed: "Completed",
  // partner_status only ever reaches "done" — submitted and completed are
  // collapsed there on purpose.
  done: "Done",
};

export default function ActivityBriefingDialog({
  open,
  onOpenChange,
  state,
  catalogue,
  moduleTitle,
  otherName,
  onGo,
  siblingTitles,
  lookupByTitle,
  onOpenActivity,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  state: ActivityStateRow | null;
  catalogue: CatalogueActivity | null;
  moduleTitle: string | null;
  otherName: string;
  onGo: (code: string) => void;
  /** Other activity titles in the same milestone, for the collapse rule. */
  siblingTitles?: string[];
  lookupByTitle?: (title: string) => { code: string; allowed: boolean } | null;
  onOpenActivity?: (code: string) => void;
}) {
  if (!state) return null;

  const briefing = getBriefing(catalogue);
  const hero = briefing?.hero_image_url || catalogue?.hero_image_url || null;
  const description = briefing?.description || state.title;
  const outcomes = briefing?.learning_outcomes || [];
  const tags = catalogue?.tags || [];

  const lo = state.est_minutes_low ?? catalogue?.est_minutes_low ?? null;
  const hi = state.est_minutes_high ?? catalogue?.est_minutes_high ?? null;
  const fallbackTime =
    lo && hi ? `About ${lo} to ${hi} minutes` : lo ? `About ${lo} minutes` : null;
  const time = briefing?.time_estimate || fallbackTime;

  const status = state.own_status || "not_started";
  const actionLabel =
    status === "in_progress" ? "Resume" : status === "not_started" ? "Begin" : "Open";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[min(960px,94vw)] max-w-none flex-col gap-0 overflow-y-auto overflow-x-hidden p-0">
        <div className="w-full shrink-0 overflow-hidden bg-muted" style={{ aspectRatio: "2 / 1" }}>
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
            <div className="flex flex-wrap items-center gap-2">
              {moduleTitle && <Badge variant="secondary">{moduleTitle}</Badge>}
              {state.reveal_pending && (
                <Badge variant="default" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Something to see
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl leading-snug">{state.title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
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
            {time && (
              <div className="flex gap-2">
                <span className="font-medium text-foreground">Time</span>
                <span className="text-muted-foreground">{time}</span>
              </div>
            )}
            {/* Static lineage when open; when locked the live LockNotice in
                the footer answers instead, and never both. */}
            {briefing?.prerequisites && state.allowed && (
              <div className="flex gap-2">
                <span className="font-medium text-foreground">Builds on</span>
                <span className="text-muted-foreground">{briefing.prerequisites}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="font-medium text-foreground">Where your partner is</span>
              <span className="text-muted-foreground">
                {otherName}:{" "}
                {(
                  STATUS_LABEL[state.partner_status || "not_started"] ||
                  state.partner_status ||
                  ""
                ).toLowerCase()}
              </span>
            </div>
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

          <DialogFooter className="flex-col items-stretch gap-2 sm:flex-col sm:items-stretch">
            {!state.allowed && (
              <LockNotice
                reasonCode={state.reason_code}
                reasonDetail={state.reason_detail}
                otherName={otherName}
                siblingTitles={siblingTitles}
                lookupByTitle={lookupByTitle}
                onOpenActivity={onOpenActivity}
              />
            )}
            {state.allowed ? (
              <Button onClick={() => onGo(state.code)}>{actionLabel}</Button>
            ) : (
              <Button disabled>Not open yet</Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
