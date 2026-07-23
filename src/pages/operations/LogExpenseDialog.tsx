import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";



async function openReceiptSigned(path: string) {
  const { data, error } = await opsSupabase.storage
    .from("operations-receipts")
    .createSignedUrl(path, 600);
  if (error || !data?.signedUrl) {
    toast.error("Could not open receipt");
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}


export type ExpenseRecord = {
  id: string;
  date: string;
  expense_category_id: string | null;
  vendor_name: string | null;
  amount: number;
  is_billable: boolean | null;
  markup_percentage: number | null;
  is_mileage: boolean | null;
  miles_driven: number | null;
  per_mile_rate: number | null;
  receipt_storage_path: string | null;
  notes: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  customerId?: string | null;
  expense?: ExpenseRecord | null;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function LogExpenseDialog({ open, onOpenChange, projectId, customerId, expense }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!expense;


  const [orgId, setOrgId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(todayISO());
  const [expenseCategoryId, setExpenseCategoryId] = useState<string>("");
  const [isMileage, setIsMileage] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>("");
  const [milesDriven, setMilesDriven] = useState<string>("");
  const [perMileRate, setPerMileRate] = useState<string>("");
  const [vendorName, setVendorName] = useState<string>("");
  const [isBillable, setIsBillable] = useState<boolean>(false);
  const [markupPercentage, setMarkupPercentage] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesQ = useQuery({
    queryKey: ["ops", "expense-categories"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("expense_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setDate(expense.date ?? todayISO());
      setExpenseCategoryId(expense.expense_category_id ?? "");
      setIsMileage(!!expense.is_mileage);
      setAmount(expense.amount != null ? expense.amount.toString() : "");
      setMilesDriven(expense.miles_driven != null ? expense.miles_driven.toString() : "");
      setPerMileRate(expense.per_mile_rate != null ? expense.per_mile_rate.toString() : "");
      setVendorName(expense.vendor_name ?? "");
      setIsBillable(!!expense.is_billable);
      setMarkupPercentage(expense.markup_percentage != null ? expense.markup_percentage.toString() : "");
      setNotes(expense.notes ?? "");
    } else {
      setDate(todayISO());
      setExpenseCategoryId("");
      setIsMileage(false);
      setAmount("");
      setMilesDriven("");
      setPerMileRate("");
      setVendorName("");
      setIsBillable(false);
      setMarkupPercentage("");
      setNotes("");
    }
    setReceiptFile(null);
    setRemoveReceipt(false);
    setError(null);
  }, [open, expense]);


  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data: auth } = await opsSupabase.auth.getUser();
      if (cancelled || !auth.user?.id) return;
      const { data: u } = await opsSupabase
        .from("users")
        .select("org_id")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (cancelled) return;
      setOrgId((u as any)?.org_id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const computedMileageAmount = useMemo(() => {
    const m = Number(milesDriven);
    const r = Number(perMileRate);
    if (!Number.isFinite(m) || !Number.isFinite(r)) return 0;
    return Math.round(m * r * 100) / 100;
  }, [milesDriven, perMileRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError("Date is required.");
      return;
    }
    let finalAmount: number;
    if (isMileage) {
      const m = Number(milesDriven);
      const r = Number(perMileRate);
      if (!Number.isFinite(m) || m <= 0) {
        setError("Miles must be greater than zero.");
        return;
      }
      if (!Number.isFinite(r) || r <= 0) {
        setError("Per-mile rate must be greater than zero.");
        return;
      }
      finalAmount = Math.round(m * r * 100) / 100;
    } else {
      const a = Number(amount);
      if (!Number.isFinite(a) || a <= 0) {
        setError("Amount must be greater than zero.");
        return;
      }
      finalAmount = a;
    }
    setError(null);
    setSubmitting(true);
    try {
      let receipt_storage_path: string | null = isEdit ? (expense?.receipt_storage_path ?? null) : null;
      let replacedOldPath: string | null = null;
      if (receiptFile && orgId) {
        const safe = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${orgId}/${crypto.randomUUID()}-${safe}`;
        const up = await opsSupabase.storage
          .from("operations-receipts")
          .upload(path, receiptFile);
        if (up.error) throw up.error;
        if (isEdit && expense?.receipt_storage_path) {
          replacedOldPath = expense.receipt_storage_path;
        }
        receipt_storage_path = path;
      } else if (isEdit && removeReceipt && expense?.receipt_storage_path) {
        replacedOldPath = expense.receipt_storage_path;
        receipt_storage_path = null;
      }

      if (isEdit && expense) {
        const { error: updateError } = await opsSupabase
          .from("expenses")
          .update({
            date,
            expense_category_id: expenseCategoryId || null,
            vendor_name: vendorName.trim() || null,
            amount: finalAmount,
            is_billable: isBillable,
            markup_percentage:
              isBillable && markupPercentage.trim() ? Number(markupPercentage) : null,
            is_mileage: isMileage,
            miles_driven: isMileage ? Number(milesDriven) : null,
            per_mile_rate: isMileage ? Number(perMileRate) : null,
            receipt_storage_path,
            notes: notes.trim() || null,
          })
          .eq("id", expense.id);
        if (updateError) throw updateError;
        if (replacedOldPath) {
          try {
            await opsSupabase.storage.from("operations-receipts").remove([replacedOldPath]);
          } catch {
            /* best-effort */
          }
        }
        toast.success("Expense updated");
      } else {
        const { error: insertError } = await opsSupabase.from("expenses").insert({
          project_id: projectId,
          customer_id: customerId ?? null,
          date,
          expense_category_id: expenseCategoryId || null,
          vendor_name: vendorName.trim() || null,
          amount: finalAmount,
          is_billable: isBillable,
          markup_percentage:
            isBillable && markupPercentage.trim() ? Number(markupPercentage) : null,
          is_mileage: isMileage,
          miles_driven: isMileage ? Number(milesDriven) : null,
          per_mile_rate: isMileage ? Number(perMileRate) : null,
          receipt_storage_path,
          notes: notes.trim() || null,
        });
        if (insertError) throw insertError;
        toast.success("Expense logged");
      }

      queryClient.invalidateQueries({ queryKey: ["ops", "project-expenses", projectId] });
      queryClient.invalidateQueries({ queryKey: ["ops", "project-expense-rollup", projectId] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? (isEdit ? "Failed to update expense" : "Failed to log expense"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit expense" : "Log expense"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this expense." : "Record an expense against this project."}</DialogDescription>
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
            {!isMileage && (
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required={!isMileage}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_mileage"
              checked={isMileage}
              onCheckedChange={(v) => setIsMileage(v === true)}
            />
            <Label htmlFor="is_mileage" className="cursor-pointer">Mileage</Label>
          </div>

          {isMileage && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="miles">Miles *</Label>
                <Input
                  id="miles"
                  type="number"
                  step="0.1"
                  min="0"
                  value={milesDriven}
                  onChange={(e) => setMilesDriven(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="per_mile_rate">Per-mile rate *</Label>
                <Input
                  id="per_mile_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={perMileRate}
                  onChange={(e) => setPerMileRate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Amount</Label>
                <Input value={computedMileageAmount.toFixed(2)} readOnly disabled />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={expenseCategoryId || "__none"}
              onValueChange={(v) => setExpenseCategoryId(v === "__none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No category</SelectItem>
                {(categoriesQ.data ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
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

          {isBillable && (
            <div className="space-y-2">
              <Label htmlFor="markup">Markup %</Label>
              <Input
                id="markup"
                type="number"
                step="0.01"
                min="0"
                value={markupPercentage}
                onChange={(e) => setMarkupPercentage(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="receipt">Receipt</Label>
            <Input
              id="receipt"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            />
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
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Log expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
