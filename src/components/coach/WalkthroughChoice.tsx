import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type WalkthroughChoiceValue = "default" | "on" | "off";

interface Props {
  value: WalkthroughChoiceValue;
  onChange: (v: WalkthroughChoiceValue) => void;
  /** The coach's practice default, for the "Use my default (currently …)" label.
   *  null while it is still loading. */
  coachDefault: boolean | null;
  disabled?: boolean;
  /** true on the bulk-invite screen, where it applies to everyone in the batch. */
  plural?: boolean;
}

export default function WalkthroughChoice({
  value, onChange, coachDefault, disabled, plural,
}: Props) {
  return (
    <div className="space-y-2 pt-2">
      <Label className="text-sm">Guided walkthrough</Label>
      <p className="text-xs text-muted-foreground">
        {plural
          ? "An optional AI walkthrough that reads each client through their own report before you meet. Choose whichever fits how you want to run the debrief."
          : "An optional AI walkthrough that reads this client through their own report before you meet. Choose whichever fits how you want to run the debrief."}
      </p>
      <Select value={value} onValueChange={(v) => onChange(v as WalkthroughChoiceValue)} disabled={disabled}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">
            Use my default{coachDefault === null ? "" : coachDefault ? " (currently on)" : " (currently off)"}
          </SelectItem>
          <SelectItem value="on">{plural ? "On for everyone in this batch" : "On for this client"}</SelectItem>
          <SelectItem value="off">{plural ? "Off for everyone in this batch" : "Off for this client"}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
