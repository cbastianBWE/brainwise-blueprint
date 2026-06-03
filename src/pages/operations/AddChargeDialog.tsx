import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  customerId?: string | null;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function AddChargeDialog({ open, onOpenChange, projectId, customerId }: Props) {
  const queryClient = useQueryClient();

  const [date, setDate] = useState<string>(todayISO());
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isBillable, setIsBillable] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDate(todayISO());
    setDescription("");
    setAmount("");
    setIsBillable(true);
    setNotes("");
    setError(null);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError("Date is required.");
      return;
    }
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { error: insertError } = await opsSupabase.from("project_charges").insert({
        project_id: projectId,
        customer_id: customerId ?? null,
        date,
        description: description.trim(),
        amount: amt,
        is_billable: isBillable,
        notes: notes.trim() || null,
      });
      if (insertError) throw insertError;

      toast.success("Charge added");
      queryClient.invalidateQueries({ queryKey: ["ops", "project-charges", projectId] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add charge");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add charge</DialogTitle>
          <DialogDescription>Add a fixed fee or other charge to this project.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_billable"
              checked={isBillable}
              onCheckedChange={(v) => setIsBillable(v === true)}
            />
            <Label htmlFor="is_billable" className="cursor-pointer">Billable</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Add charge"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
