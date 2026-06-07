import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row?: any | null;
};

type FormState = {
  name: string;
  account_id: string;
  amount: string;
  close_date: string;
};

const empty = (): FormState => ({
  name: "", account_id: "", amount: "", close_date: "",
});

export default function DealFormDialog({ open, onOpenChange, row }: Props) {
  const isEdit = !!row;
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(empty());
  const [submitting, setSubmitting] = useState(false);

  const accountsQ = useQuery({
    queryKey: ["ops", "accounts", "select"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("accounts" as any)
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  useEffect(() => {
    if (open) {
      setForm(row ? {
        name: row.name ?? "",
        account_id: row.account_id ?? "",
        amount: row.amount != null ? String(row.amount) : "",
        close_date: row.close_date ?? "",
      } : empty());
    }
  }, [open, row]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.account_id) { toast.error("Account is required"); return; }
    setSubmitting(true);

    try {
      const amountNum = form.amount.trim() === "" ? null : Number(form.amount);
      const close_date = form.close_date || null;

      if (isEdit) {
        const payload: Record<string, unknown> = {
          name: form.name.trim(),
          account_id: form.account_id,
          amount: amountNum,
          close_date,
        };
        const { error } = await opsSupabase.from("deals" as any).update(payload).eq("id", row.id);
        if (error) throw error;
        toast.success("Deal updated");
      } else {
        // Resolve default pipeline
        const { data: pipe, error: pErr } = await opsSupabase
          .from("pipelines" as any)
          .select("id")
          .eq("is_default", true)
          .limit(1)
          .maybeSingle();
        if (pErr) throw pErr;
        if (!pipe) throw new Error("No default pipeline configured");
        const pipeline_id = (pipe as any).id;

        const { data: stage, error: sErr } = await opsSupabase
          .from("deal_stages" as any)
          .select("id")
          .eq("pipeline_id", pipeline_id)
          .eq("is_won", false)
          .eq("is_lost", false)
          .eq("is_active", true)
          .order("sort_order")
          .limit(1)
          .maybeSingle();
        if (sErr) throw sErr;
        if (!stage) throw new Error("No open stage found for default pipeline");
        const stage_id = (stage as any).id;

        const payload: Record<string, unknown> = {
          name: form.name.trim(),
          account_id: form.account_id,
          amount: amountNum,
          close_date,
          pipeline_id,
          stage_id,
        };
        const { error } = await opsSupabase.from("deals" as any).insert(payload);
        if (error) throw error;
        toast.success("Deal created");
      }
      qc.invalidateQueries({ queryKey: ["ops", "deals", "list"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save deal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit deal" : "New deal"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update deal details." : "Add a new CRM deal."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Account *</Label>
              <Select value={form.account_id} onValueChange={(v) => set("account_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {(accountsQ.data ?? []).map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="close_date">Close date</Label>
              <Input id="close_date" type="date" value={form.close_date} onChange={(e) => set("close_date", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Create deal"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
