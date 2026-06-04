import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge, formatMoney, formatDate } from "./_shared";
import ApplyToInvoiceDialog from "./ApplyToInvoiceDialog";

export default function OperationsCreditNoteDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [acting, setActing] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);

  const cnQ = useQuery({
    queryKey: ["ops", "credit-note", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase.from("credit_notes").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const cn = cnQ.data as any;

  const customerQ = useQuery({
    queryKey: ["ops", "credit-note-customer", cn?.customer_id],
    enabled: !!cn?.customer_id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("customers")
        .select("display_name, email, billing_address")
        .eq("id", cn.customer_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const linesQ = useQuery({
    queryKey: ["ops", "credit-note-lines", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("document_lines")
        .select("description, quantity, unit_price, line_total, line_type, sort_order")
        .eq("document_type", "credit_note")
        .eq("document_id", id)
        .neq("line_type", "header")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  function invalidateCN() {
    qc.invalidateQueries({ queryKey: ["ops", "credit-note", id] });
    qc.invalidateQueries({ queryKey: ["ops", "credit-notes", "list"] });
  }

  async function handleIssue() {
    const { error } = await supabase.rpc("ops_set_credit_note_status" as any, { p_id: id, p_action: "issue" });
    if (error) { toast.error(error.message ?? "Action failed"); return; }
    toast.success("Credit note issued.");
    invalidateCN();
  }

  async function runVoid() {
    setActing(true);
    try {
      const { error } = await supabase.rpc("ops_set_credit_note_status" as any, { p_id: id, p_action: "void" });
      if (error) { toast.error(error.message ?? "Action failed"); return; }
      toast.success("Credit note voided.");
      invalidateCN();
      setConfirmVoid(false);
    } finally {
      setActing(false);
    }
  }

  async function handleRefund(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(refundAmount);
    const bal = Number(cn?.balance) || 0;
    if (!Number.isFinite(amt) || amt <= 0) { setRefundError("Amount must be greater than 0."); return; }
    if (amt > bal + 1e-9) { setRefundError(`Amount cannot exceed ${formatMoney(bal, cn.currency_code)}.`); return; }
    setRefundError(null);
    setRefunding(true);
    try {
      const { error } = await supabase.rpc("ops_refund_credit_note" as any, { p_id: id, p_amount: amt });
      if (error) { toast.error(error.message ?? "Refund failed"); return; }
      toast.success("Credit note refunded.");
      invalidateCN();
      setRefundOpen(false);
      setRefundAmount("");
    } finally {
      setRefunding(false);
    }
  }

  if (cnQ.isLoading) return <div className="p-6 text-muted-foreground text-sm">Loading…</div>;
  if (!cn) return <div className="p-6 text-destructive text-sm">Credit note not found.</div>;

  const status = (cn.status ?? "").toLowerCase();
  const balance = Number(cn.balance) || 0;
  const applied = Number(cn.amount_applied) || 0;
  const refunded = Number(cn.amount_refunded) || 0;
  const canIssue = status === "draft";
  const canVoid = (status === "draft" || status === "open") && applied === 0 && refunded === 0;
  const canApply = status === "open" && balance > 0;
  const canRefund = status === "open" && balance > 0;
  const currency = cn.currency_code;
  const cust = customerQ.data as any;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3">
                <span>Credit note {cn.credit_note_number}</span>
                <StatusBadge status={cn.status} />
              </CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Issued {formatDate(cn.issue_date)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canApply && (
                <Button onClick={() => setApplyOpen(true)}>Apply to invoice</Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Actions <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canIssue && (
                    <DropdownMenuItem onClick={handleIssue}>Issue</DropdownMenuItem>
                  )}
                  {canRefund && (
                    <DropdownMenuItem onClick={() => { setRefundAmount(String(balance)); setRefundError(null); setRefundOpen(true); }}>
                      Refund
                    </DropdownMenuItem>
                  )}
                  {canVoid && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirmVoid(true)}
                    >
                      Void
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Customer</dt>
              <dd className="font-medium">{cust?.display_name ?? "—"}</dd>
              <dd className="text-muted-foreground">{cust?.email ?? ""}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Reason</dt>
              <dd className="whitespace-pre-line">{cn.reason ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
        <CardContent>
          {linesQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !linesQ.data || linesQ.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No line items.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linesQ.data.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{l.description ?? "—"}</TableCell>
                    <TableCell className="text-right">{l.quantity ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatMoney(l.unit_price, currency)}</TableCell>
                    <TableCell className="text-right">{formatMoney(l.line_total, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-6 ml-auto max-w-sm space-y-1 text-sm">
            <TotalRow label="Subtotal" value={formatMoney(cn.subtotal_amount, currency)} />
            <TotalRow label="Tax" value={formatMoney(cn.tax_amount, currency)} />
            <TotalRow label="Total" value={formatMoney(cn.total_amount, currency)} />
            <TotalRow label="Applied" value={formatMoney(cn.amount_applied, currency)} />
            <TotalRow label="Refunded" value={formatMoney(cn.amount_refunded, currency)} />
            <TotalRow label="Balance" value={formatMoney(cn.balance, currency)} bold />
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmVoid} onOpenChange={(o) => { if (!o) setConfirmVoid(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void credit note?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the credit note as void. Only allowed when nothing has been applied or refunded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={acting} onClick={(e) => { e.preventDefault(); runVoid(); }}>
              {acting ? "Working…" : "Void"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ApplyToInvoiceDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        customerId={cn.customer_id}
        currency={currency}
        maxAmount={balance}
        title="Apply credit note to invoice"
        onApply={async (invId, amt) => {
          const { error } = await supabase.rpc("ops_apply_credit_note_to_invoice" as any, {
            p_credit_note: id,
            p_invoice: invId,
            p_amount: amt,
          });
          if (error) throw error;
        }}
        onApplied={() => {
          toast.success("Credit note applied.");
          invalidateCN();
        }}
      />

      <Dialog open={refundOpen} onOpenChange={(o) => { setRefundOpen(o); if (!o) setRefundError(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Refund credit note</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRefund} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refund_amount">Amount</Label>
              <Input
                id="refund_amount" type="number" step="0.01" min="0"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Max {formatMoney(balance, currency)}</p>
            </div>
            {refundError && <p className="text-sm text-destructive">{refundError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRefundOpen(false)} disabled={refunding}>
                Cancel
              </Button>
              <Button type="submit" disabled={refunding}>
                {refunding ? "Refunding…" : "Refund"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
