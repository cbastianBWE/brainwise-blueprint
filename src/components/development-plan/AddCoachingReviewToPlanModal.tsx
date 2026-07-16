import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  reviewLabel: string;
  actionPlan: string[];
}

export function AddCoachingReviewToPlanModal({
  open,
  onOpenChange,
  reviewId,
  reviewLabel,
  actionPlan,
}: Props) {
  const queryClient = useQueryClient();
  const [alreadyAdded, setAlreadyAdded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setSelected(new Set());
      const { data, error } = await supabase.rpc("dp_list_my_plan" as never);
      if (cancelled) return;
      if (!error && data) {
        const items =
          ((data as { items?: Array<Record<string, unknown>> }).items) ?? [];
        setAlreadyAdded(
          new Set(
            items
              .filter(
                (it) =>
                  it.source === "coaching" &&
                  it.source_report_id === reviewId
              )
              .map((it) => it.action_text as string)
          )
        );
      }
      setLoadingExisting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, reviewId]);

  const toggle = (step: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });

  const selectable = actionPlan.filter((s) => !alreadyAdded.has(s));
  const allSelected =
    selectable.length > 0 && selectable.every((s) => selected.has(s));
  const toggleAll = () =>
    setSelected(() => (allSelected ? new Set() : new Set(selectable)));

  const handleAdd = async () => {
    const chosen = actionPlan.filter((s) => selected.has(s));
    if (chosen.length === 0) return;
    setSubmitting(true);
    const p_items = chosen.map((step) => ({
      action_text: step,
      card_title: reviewLabel,
      source_report_id: reviewId,
      dimension_tags: [] as string[],
    }));
    const { data, error } = await supabase.rpc(
      "dp_add_items_from_coaching" as never,
      { p_items } as never
    );
    setSubmitting(false);
    if (error) {
      toast.error("Could not add to your development plan. Please try again.");
      return;
    }
    const added = (data as { added?: number })?.added ?? 0;
    const skipped = (data as { skipped?: number })?.skipped ?? 0;
    toast.success(
      `Added ${added} action${added === 1 ? "" : "s"} to your development plan` +
        (skipped > 0 ? ` (${skipped} already there)` : "")
    );
    queryClient.invalidateQueries({ queryKey: ["development-plan"] });
    queryClient.invalidateQueries({ queryKey: ["development-plan-coaching"] });
    onOpenChange(false);
  };

  const selectedCount = selected.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to my Development Plan</DialogTitle>
          <DialogDescription>
            Choose the action steps from {reviewLabel} you want to track.
          </DialogDescription>
        </DialogHeader>

        {loadingExisting ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {selectable.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                className="h-7 px-2"
              >
                {allSelected ? "Clear all" : "Select all"}
              </Button>
            )}
            <ul className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {actionPlan.map((step, i) => {
                const isAdded = alreadyAdded.has(step);
                return (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={isAdded || selected.has(step)}
                      disabled={isAdded}
                      onCheckedChange={() => toggle(step)}
                      className="mt-0.5"
                    />
                    <span className={isAdded ? "text-muted-foreground" : ""}>
                      {step}
                      {isAdded && (
                        <span className="ml-1 text-xs italic">
                          (already added)
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            {actionPlan.length > 0 && selectable.length === 0 && (
              <p className="text-sm text-muted-foreground">
                All of these actions are already in your development plan.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={submitting || selectedCount === 0}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Add {selectedCount > 0 ? selectedCount : ""} to plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
