import { useId } from "react";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCoachingShare, type CoachingShare } from "@/hooks/useCoachingShare";

export const SHARE_LABEL = "Always share my coaching with my practitioner";
export const SHARE_HELPER = "New completed activities will be shared automatically.";

interface Props {
  /** "card" = Privacy Settings row, "inline" = My Coaching strip, "section" = end of an activity */
  variant?: "card" | "inline" | "section";
  /** Reuse a hook instance when the parent already has one. */
  share?: CoachingShare;
  /** Optional trailing slot (e.g. a "Saved" badge). */
  trailing?: React.ReactNode;
  onChanged?: (next: boolean) => void;
}

export default function CoachingShareControl({ variant = "section", share, trailing, onChanged }: Props) {
  const own = useCoachingShare();
  const s = share ?? own;
  const id = useId();

  // No practitioner, no control.
  if (s.loading || !s.hasPractitioner) return null;

  const onToggle = async (next: boolean) => {
    const ok = await s.setAlwaysShare(next);
    if (!ok) {
      toast.error("Couldn't update sharing. Please try again.");
      return;
    }
    onChanged?.(next);
  };

  const wrapper =
    variant === "card"
      ? "p-4 rounded-lg border"
      : variant === "inline"
        ? "rounded-lg border p-3"
        : "flex items-center justify-between rounded-lg border p-3";

  if (variant === "card") {
    return (
      <div className={wrapper}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">My Coaching Journey</p>
              <p className="text-sm text-muted-foreground">
                Let your practitioner see the coaching activities you complete
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {trailing}
            {s.pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch checked={s.alwaysShare} disabled={s.pending} onCheckedChange={onToggle} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapper}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor={id}>{SHARE_LABEL}</Label>
          <p className="text-xs text-muted-foreground">{SHARE_HELPER}</p>
        </div>
        <div className="flex items-center gap-2">
          {trailing}
          {s.pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Switch id={id} checked={s.alwaysShare} disabled={s.pending} onCheckedChange={onToggle} />
        </div>
      </div>
    </div>
  );
}
