import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "./_shared";

type PaymentMode = "ach" | "check" | "cash" | "wire" | "other";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  customerId: string;
  balanceDue: number;
  currency: string;
};

const MODE_OPTIONS: { value: PaymentMode; label: string }[] = [
  { value: "ach", label: "ACH / bank transfer" },
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
  { value: "wire", label: "Wire" },
  { value: "other", label: "Other" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

function statusMessage(status: string | null | undefined): string {
  const s = (status ?? "").toLowerCase();
  if (s === "paid") return "Payment recorded. Invoice is now paid.";
  if (s === "partially_paid") return "Payment recorded. Invoice is now partially paid.";
  if (s === "sent") return "Payment recorded. Invoice is now sent.";
  if (s === "draft") return "Payment recorded. Invoice is now draft.";
  const human = s ? s.replace(/_/g, " ") : "updated";
  return `Payment recorded. Invoice is now ${human}.`;
}

export default function RecordPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  customerId,
  balanceDue,
  currency,
}: Props) {
  const qc = useQueryClient();
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("ach");
  const [amount, setAmount] = useState<string>(String(balanceDue));
  const [paymentDate, setPaymentDate] = useState<string>(todayISO());
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPaymentMode("ach");
      setAmount(String(balanceDue));
      setPaymentDate(todayISO());
      setReferenceNumber("");
      setNotes("");
      setError(null);
    }
  }, [open, balanceDue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (amt > balanceDue + 1e-9) {
      setError(`Amount cannot exceed the outstanding balance (${balanceDue} ${currency}).`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("ops_record_payment", {
        p_invoice: invoiceId,
        p_payment: {
          amount: amt,
          payment_mode: paymentMode,
          payment_date: paymentDate,
          reference_number: referenceNumber.trim() || null,
          notes: notes.trim() || null,
        },
      });
      if (rpcError) throw rpcError;
      toast.success(statusMessage(data as unknown as string));
      qc.invalidateQueries({ queryKey: ["ops", "invoice", invoiceId] });
      qc.invalidateQueries({ queryKey: ["ops", "invoices", "list"] });
      qc.invalidateQueries({ queryKey: ["ops", "customer-invoices", customerId] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Outstanding balance: {balanceDue} {currency}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment date</Label>
              <Input
                id="payment_date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_number">Reference number</Label>
            <Input
              id="reference_number"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Check #, transaction ID, etc."
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
              {submitting ? "Recording…" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
