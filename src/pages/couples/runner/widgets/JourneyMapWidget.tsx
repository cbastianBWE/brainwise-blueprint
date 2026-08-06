import { useParams } from "react-router-dom";
import { JourneyMap } from "../../JourneyMap";
import { FocusAreaPicker } from "../../journey/FocusAreaPicker";
import type { CoupleStep } from "../coupleShared";

/**
 * The journey map step inside the runner. It renders the real interactive
 * map (same component as the standalone page) rather than a row of numbers.
 * The map also carries the Focus Stop cluster chips beside the road — the
 * catalog behind them is published, so they are browsable from here too.
 */
export function JourneyMapWidget({ step }: { step: CoupleStep; value?: string[]; onChange?: (next: string[]) => void }) {
  const { relationshipId } = useParams<{ relationshipId: string }>();

  return (
    <div className="space-y-4">
      {step.intro && (
        <p className="whitespace-pre-line text-sm text-muted-foreground">{step.intro}</p>
      )}
      {relationshipId && <JourneyMap relationshipId={relationshipId} />}
      {/* Selection lives only on the 0.1 step. Selectability is catalog-driven. */}
      {relationshipId && step.selectionKey === "chosen_focus_areas" && (
        <FocusAreaPicker relationshipId={relationshipId} />
      )}
    </div>
  );
}
