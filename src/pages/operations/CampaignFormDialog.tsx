import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; row?: any | null };

const TYPES = ["email", "webinar", "content", "partner", "event", "paid", "other"];
const STATUSES = ["planned", "active", "completed"];

type FormState = {
  name: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  budget_amount: string;
  currency_code: string;
  description: string;
};

const empty = (): FormState => ({
  name: "",
  type: "other",
  status: "planned",
  start_date: "",
  end_date: "",
  budget_amount: "",
  currency_code: "USD",
  description: "",
});

const trimOrNull = (v: string) => {
  const t = v.trim();
  return t.length === 0 ? null : t;
};

export default function CampaignFormDialog({ open, onOpenChange, row }: Props) {
  const isEdit = !!row;
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(empty());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        row
          ? {
              name: row.name ?? "",
              type: row.type ?? "other",
              status: row.status ?? "planned",
              start_date: row.start_date ?? "",
              end_date: row.end_date ?? "",
              budget_amount: row.budget_amount != null ? String(row.budget_amount) : "",
              currency_code: row.currency_code ?? "USD",
              description: row.description ?? "",
            }
          : empty(),
      );
    }
  }, [open, row]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    const payload: Record<string, any> = {
      name: form.name.trim(),
      type: form.type,
      status: form.status,
      currency_code: form.currency_code.trim() || "USD",
      start_date: trimOrNull(form.start_date),
      end_date: trimOrNull(form.end_date),
      description: trimOrNull(form.description),
      budget_amount: form.budget_amount.trim() === "" ? null : Number(form.budget_amount),
    };
    try {
      if (isEdit) {
        const { error } = await opsSupabase.from("campaigns" as any).update(payload).eq("id", row.id);
        if (error) throw error;
        toast.success("Campaign updated");
      } else {
        const { error } = await opsSupabase.from("campaigns" as any).insert(payload);
        if (error) throw error;
        toast.success("Campaign created");
      }
      qc.invalidateQueries({ queryKey: ["ops", "campaigns", "list"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save campaign");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit campaign" : "New campaign"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update campaign details." : "Add a new marketing campaign."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Name *</Label>
            <Input
              id="campaign-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Start date</Label>
              <Input
                id="start-date"
                type="date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End date</Label>
              <Input
                id="end-date"
                type="date"
                value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                value={form.budget_amount}
                onChange={(e) => set("budget_amount", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={form.currency_code}
                onChange={(e) => set("currency_code", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create campaign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
