import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ActionPlanItem {
  title: string;
  rationale: string;
  steps: string[];
  dimension_tags: string[];
}

interface AddToDevelopmentPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentResultId: string;
  sourceContext: "professional" | "personal" | "combined" | null;
  actionPlan: ActionPlanItem[];
}

export function AddToDevelopmentPlanModal({
  open, onOpenChange, assessmentResultId, sourceContext, actionPlan,
}: AddToDevelopmentPlanModalProps) {
  const queryClient = useQueryClient();
  const [alreadyAdded, setAlreadyAdded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const rows = useMemo(() => {
    const out: { key: string; cardTitle: string; dimensionTags: string[]; step: string }[] = [];
    actionPlan.forEach((item, ci) => {
      (item.steps ?? []).forEach((step, si) => {
        out.push({ key: `${ci}-${si}`, cardTitle: item.title, dimensionTags: item.dimension_tags ?? [], step });
      });
    });
    return out;
  }, [actionPlan]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoadingExisting(true);
      setSelected(new Set());
      const { data, error } = await supabase.rpc("dp_list_my_plan" as never);
      if (cancelled) return;
      if (!error && data) {
        const items = (((data as { items?: any[] }).items) ?? []);
        const added = new Set<string>(
          items
            .filter((it) => it.source === "ptp" && it.source_result_id === assessmentResultId)
            .map((it) => it.action_text as string)
        );
        setAlreadyAdded(added);
      }
      setLoadingExisting(false);
    };
    load();
    return () => { cancelled = true; };
  }, [open, assessmentResultId]);

  const toggle = (step: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  const selectableRows = rows.filter((r) => !alreadyAdded.has(r.step));
  const allSelectableSelected =
    selectableRows.length > 0 && selectableRows.every((r) => selected.has(r.step));

  const toggleAll = () => {
    setSelected(() => (allSelectableSelected ? new Set() : new Set(selectableRows.map((r) => r.step))));
  };

  const handleAdd = async () => {
    const chosen = rows.filter((r) => selected.has(r.step));
    if (chosen.length === 0) return;
    setSubmitting(true);
    const payload = chosen.map((r) => ({
      action_text: r.step,
      card_title: r.cardTitle,
      dimension_tags: r.dimensionTags,
      source_result_id: assessmentResultId,
      source_context: sourceContext,
    }));
    const { data, error } = await supabase.rpc(
      "dp_add_items_from_ptp" as never,
      { p_items: payload } as never
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
    onOpenChange(false);
  };

  const grouped = useMemo(() => {
    const map = new Map<string, typeof rows>();
    rows.forEach((r) => {
      const arr = map.get(r.cardTitle) ?? [];
      arr.push(r);
      map.set(r.cardTitle, arr);
    });
    return Array.from(map.entries());
  }, [rows]);

  const selectedCount = selected.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to my Development Plan</DialogTitle>
          <DialogDescription>
            Choose the actions you want to track. You can add more later from any report.
          </DialogDescription>
        </DialogHeader>

        {loadingExisting ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {selectableRows.length > 0 && (
              <Button variant="ghost" size="sm" onClick={toggleAll} className="self-start">
                {allSelectableSelected ? "Clear all" : "Select all"}
              </Button>
            )}
            {grouped.map(([cardTitle, items]) => (
              <div key={cardTitle} className="space-y-2">
                <h4 className="text-sm font-semibold">{cardTitle}</h4>
                <div className="space-y-2">
                  {items.map((r) => {
                    const isAdded = alreadyAdded.has(r.step);
                    return (
                      <label
                        key={r.key}
                        className="flex items-start gap-3 rounded-md border border-border p-3 text-sm cursor-pointer hover:bg-muted/40 data-[disabled]:opacity-60"
                        data-disabled={isAdded ? "" : undefined}
                      >
                        <Checkbox
                          checked={isAdded || selected.has(r.step)}
                          disabled={isAdded}
                          onCheckedChange={() => toggle(r.step)}
                          className="mt-0.5"
                        />
                        <span className="flex-1 leading-snug">
                          {r.step}
                          {isAdded && (
                            <span className="ml-2 text-xs text-muted-foreground">(already added)</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            {rows.length > 0 && selectableRows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                All of these actions are already in your development plan.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={submitting || selectedCount === 0}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Add {selectedCount > 0 ? selectedCount : ""} to plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
