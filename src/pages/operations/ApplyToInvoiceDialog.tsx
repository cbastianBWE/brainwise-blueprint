import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "./_shared";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  currency: string;
  maxAmount: number;
  title: string;
  description?: string;
  onApply: (invoiceId: string, amount: number) => Promise<void>;
  onApplied?: () => void;
};

export default function ApplyToInvoiceDialog({
  open,
  onOpenChange,
  customerId,
  currency,
  maxAmount,
  title,
  description,
  onApply,
  onApplied,
}: Props) {
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invoicesQ = useQuery({
    queryKey: ["ops", "apply-to-invoice", "open-invoices", customerId],
    enabled: open && !!customerId,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("invoices")
        .select("id, invoice_number, status, balance_due, currency_code")
        .eq("customer_id", customerId)
        .gt("balance_due", 0)
        .not("status", "in", "(void,written_off,paid)")
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const invoices = (invoicesQ.data ?? []) as Array<{
    id: string;
    invoice_number: string;
    status: string;
    balance_due: number | string;
    currency_code: string;
  }>;

  const selected = useMemo(
    () => invoices.find((i) => i.id === invoiceId) ?? null,
    [invoices, invoiceId],
  );

  useEffect(() => {
    if (open) {
      setInvoiceId("");
      setAmount("");
      setError(null);
    }
  }, [open, customerId]);

  useEffect(() => {
    if (!selected) return;
    const bal = Number(selected.balance_due) || 0;
    const def = Math.min(maxAmount, bal);
    setAmount(def > 0 ? String(def) : "");
  }, [selected, maxAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setError("Select an invoice.");
      return;
    }
    const amt = Number(amount);
    const bal = Number(selected.balance_due) || 0;
    const cap = Math.min(maxAmount, bal);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (amt > cap + 1e-9) {
      setError(`Amount cannot exceed ${formatMoney(cap, currency)}.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onApply(selected.id, amt);
      onOpenChange(false);
      onApplied?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Apply failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {invoicesQ.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <p className="text-muted-foreground text-sm">No open invoices for this customer.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Invoice</Label>
              <Select value={invoiceId} onValueChange={setInvoiceId}>
                <SelectTrigger><SelectValue placeholder="Select an invoice" /></SelectTrigger>
                <SelectContent>
                  {invoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_number} — balance {formatMoney(inv.balance_due, inv.currency_code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apply_amount">Amount</Label>
              <Input
                id="apply_amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={!selected}
                required
              />
              {selected && (
                <p className="text-xs text-muted-foreground">
                  Max {formatMoney(Math.min(maxAmount, Number(selected.balance_due) || 0), currency)}
                </p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !selected}>
                {submitting ? "Applying…" : "Apply"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
