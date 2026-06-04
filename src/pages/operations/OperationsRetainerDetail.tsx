import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { StatusBadge, formatMoney, formatDate } from "./_shared";
import ApplyToInvoiceDialog from "./ApplyToInvoiceDialog";

export default function OperationsRetainerDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [acting, setActing] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const retainerQ = useQuery({
    queryKey: ["ops", "retainer", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("retainer_invoices")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const retainer = retainerQ.data as any;

  const customerQ = useQuery({
    queryKey: ["ops", "retainer-customer", retainer?.customer_id],
    enabled: !!retainer?.customer_id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("customers")
        .select("display_name, email")
        .eq("id", retainer.customer_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  function invalidateRetainer() {
    qc.invalidateQueries({ queryKey: ["ops", "retainer", id] });
    qc.invalidateQueries({ queryKey: ["ops", "retainers", "list"] });
  }

  async function setStatus(p_action: "mark_sent" | "mark_paid" | "mark_refunded", successMsg: string) {
    setActing(true);
    try {
      const { error } = await supabase.rpc("ops_set_retainer_status" as any, { p_id: id, p_action });
      if (error) { toast.error(error.message ?? "Action failed"); return; }
      toast.success(successMsg);
      invalidateRetainer();
      setConfirmRefund(false);
    } finally {
      setActing(false);
    }
  }

  if (retainerQ.isLoading) {
    return <div className="p-6 text-muted-foreground text-sm">Loading…</div>;
  }
  if (!retainer) {
    return <div className="p-6 text-destructive text-sm">Retainer not found.</div>;
  }

  const status = (retainer.status ?? "").toLowerCase();
  const applied = Number(retainer.applied_amount) || 0;
  const available = Number(retainer.available_balance) || 0;
  const currency = retainer.currency_code;
  const cust = customerQ.data as any;

  const canMarkSent = status === "draft";
  const canMarkPaid = status === "draft" || status === "sent";
  const canMarkRefunded = status === "paid" && applied === 0;
  const canApply = status === "paid" && available > 0;
  const hasMenu = canMarkSent || canMarkPaid || canMarkRefunded;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3">
                <span>Retainer {retainer.retainer_number}</span>
                <StatusBadge status={retainer.status} />
              </CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Issued {formatDate(retainer.issue_date)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canApply && (
                <Button onClick={() => setApplyOpen(true)}>Apply to invoice</Button>
              )}
              {hasMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Actions <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canMarkSent && (
                      <DropdownMenuItem onClick={() => setStatus("mark_sent", "Retainer marked as sent.")}>
                        Mark as sent
                      </DropdownMenuItem>
                    )}
                    {canMarkPaid && (
                      <DropdownMenuItem onClick={() => setStatus("mark_paid", "Retainer marked as paid.")}>
                        Mark as paid
                      </DropdownMenuItem>
                    )}
                    {canMarkRefunded && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setConfirmRefund(true)}
                      >
                        Mark refunded
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
            {retainer.notes && (
              <div>
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="whitespace-pre-line">{retainer.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
        <CardContent>
          <div className="ml-auto max-w-sm space-y-1 text-sm">
            <TotalRow label="Amount" value={formatMoney(retainer.amount, currency)} />
            <TotalRow label="Applied" value={formatMoney(retainer.applied_amount, currency)} />
            <TotalRow label="Available" value={formatMoney(retainer.available_balance, currency)} bold />
          </div>
        </CardContent>
      </Card>

      <ApplyToInvoiceDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        customerId={retainer.customer_id}
        currency={currency}
        maxAmount={available}
        title="Apply retainer to invoice"
        onApply={async (invoiceId, amount) => {
          const { error } = await supabase.rpc("ops_apply_retainer_to_invoice" as any, {
            p_retainer: id,
            p_invoice: invoiceId,
            p_amount: amount,
          });
          if (error) throw error;
        }}
        onApplied={() => {
          toast.success("Retainer applied.");
          qc.invalidateQueries({ queryKey: ["ops", "retainer", id] });
          qc.invalidateQueries({ queryKey: ["ops", "retainers", "list"] });
          qc.invalidateQueries({ queryKey: ["ops", "invoices", "list"] });
          qc.invalidateQueries({ queryKey: ["ops", "customer-invoices", retainer.customer_id] });
        }}
      />

      <AlertDialog open={confirmRefund} onOpenChange={(o) => { if (!o) setConfirmRefund(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark retainer as refunded?</AlertDialogTitle>
            <AlertDialogDescription>
              This records that the retainer was refunded to the customer. Only allowed when nothing has been applied.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={acting}
              onClick={(e) => { e.preventDefault(); setStatus("mark_refunded", "Retainer marked as refunded."); }}
            >
              {acting ? "Working…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
