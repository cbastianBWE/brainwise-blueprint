import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reportId: string;
  reportKind: "team" | "paired";
  suggestionGroups?: { label: string; items: string[] }[];
  onAdded?: () => void;
}

export default function AddReportCommitmentModal({
  open, onOpenChange, reportId, reportKind, suggestionGroups = [], onAdded,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [freeText, setFreeText] = useState("");
  const [scope, setScope] = useState<"individual" | "team">("individual");
  const [submitting, setSubmitting] = useState(false);
  const kindWord = reportKind === "team" ? "team" : "paired";

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setFreeText("");
      setScope("individual");
      setSubmitting(false);
    }
  }, [open]);

  const toggle = (s: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const items = useMemo(() => {
    const fromFree = freeText.split("\n").map((l) => l.trim()).filter(Boolean);
    const all = [...Array.from(selected), ...fromFree];
    return Array.from(new Set(all)).map((action_text) => ({ action_text }));
  }, [selected, freeText]);

  const submit = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    const { error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>)(
      "report_add_commitments",
      { p_report_id: reportId, p_kind: reportKind, p_scope: scope, p_items: items },
    );
    setSubmitting(false);
    if (error) {
      toast.error(
        error.message?.includes("not_authorized")
          ? "You don't have access to add commitments to this report."
          : "Couldn't add your commitment. Please try again.",
      );
      return;
    }
    toast.success(
      scope === "team"
        ? `Added ${items.length} ${kindWord} commitment${items.length === 1 ? "" : "s"}.`
        : `Added ${items.length} action${items.length === 1 ? "" : "s"} to your development plan.`,
    );
    onAdded?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to development plan</DialogTitle>
          <DialogDescription>
            Choose actions from this report or write your own, then decide whether it's
            a personal commitment or a shared {kindWord} commitment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {suggestionGroups.some((g) => g.items.length > 0) && (
            <div className="space-y-4">
              {suggestionGroups.map((group, gi) =>
                group.items.length === 0 ? null : (
                  <div key={gi} className="space-y-2">
                    <Label className="text-sm">{group.label}</Label>
                    <div className="space-y-2">
                      {group.items.map((s, i) => (
                        <label
                          key={i}
                          className="flex items-start gap-2 rounded-md border border-border p-2.5 text-sm cursor-pointer hover:bg-muted/40"
                        >
                          <Checkbox
                            checked={selected.has(s)}
                            onCheckedChange={() => toggle(s)}
                            className="mt-0.5"
                          />
                          <span className="flex-1 leading-snug">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm">Write your own (one per line)</Label>
            <Textarea
              rows={4}
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="What will you commit to after this report?"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">This commitment is</Label>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as "individual" | "team")}
              className="space-y-1"
            >
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="individual" className="mt-0.5" />
                <span>
                  <span className="font-medium">Just me (individual)</span>
                  <span className="block text-xs text-muted-foreground">
                    Added to your own development plan.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="team" className="mt-0.5" />
                <span>
                  <span className="font-medium">Shared {kindWord} commitment</span>
                  <span className="block text-xs text-muted-foreground">
                    Visible to everyone in this {reportKind === "team" ? "team" : "pair"} report.
                  </span>
                </span>
              </label>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || items.length === 0}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Add {items.length > 0 ? items.length : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
