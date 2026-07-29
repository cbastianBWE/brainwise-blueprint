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
import { BrandedPlaceholder, renderImg, type ModuleRow } from "./journeyShared";

export interface ModuleBriefingDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  moduleNumber: number;
  module: ModuleRow | null;
  activityCount: number;
  minutes: { low: number; high: number } | null;
  /** First allowed activity code in the module, if any. */
  startCode: string | null;
  /** Reason from the first blocked activity, when nothing is open yet. */
  blockedReason: string | null;
  onStart: (code: string) => void;
}

export default function ModuleBriefingDialog({
  open,
  onOpenChange,
  moduleNumber,
  module,
  activityCount,
  minutes,
  startCode,
  blockedReason,
  onStart,
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
      <DialogContent className="max-w-lg overflow-hidden p-0">
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
              <Badge variant="secondary">Module {moduleNumber}</Badge>
            </div>
            <DialogTitle className="text-xl leading-snug">
              {module?.title || `Module ${moduleNumber}`}
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

          <DialogFooter className="flex-col items-stretch gap-2 sm:flex-col sm:items-stretch">
            {!startCode && blockedReason && (
              <p className="text-xs text-muted-foreground">{blockedReason}</p>
            )}
            {startCode ? (
              <Button onClick={() => onStart(startCode)}>Start Module {moduleNumber}</Button>
            ) : (
              <Button disabled>Not open yet</Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
