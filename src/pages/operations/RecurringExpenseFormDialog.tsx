import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: any | null;
};

const FREQS = ["daily", "weekly", "monthly", "quarterly", "yearly"] as const;
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function RecurringExpenseFormDialog({ open, onOpenChange, template }: Props) {
  const qc = useQueryClient();
  const isEdit = !!template;

  const [categoryId, setCategoryId] = useState<string>("");
  const [vendor, setVendor] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [frequency, setFrequency] = useState<string>("monthly");
  const [interval, setInterval] = useState<string>("1");
  const [nextRun, setNextRun] = useState<string>(todayISO());
  const [endDate, setEndDate] = useState<string>("");
  const [active, setActive] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesQ = useQuery({
    queryKey: ["ops", "expense-categories"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("expense_categories")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!open) return;
    if (template) {
      setCategoryId(template.expense_category_id ?? "");
      setVendor(template.vendor_name ?? "");
      setAmount(template.amount != null ? String(template.amount) : "");
      setCurrency(template.currency_code ?? "USD");
      setFrequency(template.frequency ?? "monthly");
      setInterval(template.interval_count != null ? String(template.interval_count) : "1");
      setNextRun(template.next_run_date ?? todayISO());
      setEndDate(template.end_date ?? "");
      setActive(!!template.is_active);
    } else {
      setCategoryId("");
      setVendor("");
      setAmount("");
      setCurrency("USD");
      setFrequency("monthly");
      setInterval("1");
      setNextRun(todayISO());
      setEndDate("");
      setActive(true);
    }
    setError(null);
  }, [open, template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (!nextRun) {
      setError("Next run date is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        expense_category_id: categoryId || null,
        vendor_name: vendor.trim() || null,
        amount: amt,
        currency_code: currency || "USD",
        frequency,
        interval_count: Number(interval) || 1,
        next_run_date: nextRun,
        end_date: endDate || null,
        is_active: active,
      };
      if (isEdit && template) {
        const { error: e2 } = await opsSupabase
          .from("recurring_expense_templates")
          .update(payload)
          .eq("id", template.id);
        if (e2) throw e2;
        toast.success("Recurring expense updated");
      } else {
        const { error: e2 } = await opsSupabase
          .from("recurring_expense_templates")
          .insert(payload as any);
        if (e2) throw e2;
        toast.success("Recurring expense created");
      }
      qc.invalidateQueries({ queryKey: ["ops", "recurring-expenses", "list"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save recurring expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit recurring expense" : "New recurring expense"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this expense template." : "Create an overhead expense template the daily cron will generate from."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={categoryId || "__none"}
              onValueChange={(v) => setCategoryId(v === "__none" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="No category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No category</SelectItem>
                {(categoriesQ.data ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <Input id="vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input id="amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQS.map((f) => (<SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interval">Interval count</Label>
              <Input id="interval" type="number" min="1" step="1" value={interval} onChange={(e) => setInterval(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="next_run">Next run date *</Label>
              <Input id="next_run" type="date" value={nextRun} onChange={(e) => setNextRun(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End date</Label>
              <Input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="active" className="cursor-pointer">Active</Label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
