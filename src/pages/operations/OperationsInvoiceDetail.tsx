import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge, formatMoney, formatDate } from "./_shared";
import { downloadDocumentPdf, generateDocumentPdf } from "@/lib/operations/documentPdf";
import RecordPaymentDialog from "./RecordPaymentDialog";

const PAID_TERMINAL = new Set(["paid", "void", "written_off"]);
const maskTail = (v: string | null | undefined) => (v ? "••••" + String(v).slice(-4) : "—");
const WRITE_OFF_STATUSES = new Set(["sent", "viewed", "overdue", "partially_paid"]);

export default function OperationsInvoiceDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "void" | "write_off" | "delete">(null);
  const [acting, setActing] = useState(false);
  const [sending, setSending] = useState(false);
  const [refundPayment, setRefundPayment] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [attachReceipts, setAttachReceipts] = useState(false);

  const invoiceQ = useQuery({
    queryKey: ["ops", "invoice", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase.from("invoices").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const inv = invoiceQ.data as any;

  const customerQ = useQuery({
    queryKey: ["ops", "invoice-customer", inv?.customer_id],
    enabled: !!inv?.customer_id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("customers")
        .select("display_name, email, billing_address")
        .eq("id", inv.customer_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const linesQ = useQuery({
    queryKey: ["ops", "invoice-lines", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("document_lines")
        .select("description, quantity, unit_price, line_total, line_type, sort_order")
        .eq("document_type", "invoice")
        .eq("document_id", id)
        .neq("line_type", "header")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const paymentsQ = useQuery({
    queryKey: ["ops", "invoice-payments", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ops_list_invoice_payments" as any, { p_invoice: id });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const orgBrandingQ = useQuery({
    queryKey: ["ops", "org-branding"],
    queryFn: async () => {
      const { data, error } = await opsSupabase.from("organizations" as any).select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const sendReceiptsQ = useQuery({
    queryKey: ["ops", "invoice-expense-receipts", inv?.id],
    enabled: sendOpen && !!inv?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ops_get_invoice_expense_receipts" as any, { p_invoice: inv.id });
      if (error) throw error;
      return (data ?? []) as Array<{ receipt_storage_path: string; suggested_filename: string }>;
    },
  });
  const receiptCount = sendReceiptsQ.data?.length ?? 0;

  // Handle ?paid=1 / ?canceled=1
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paid = params.get("paid");
    const canceled = params.get("canceled");
    if (!paid && !canceled) return;
    if (paid === "1") {
      toast.success("Payment received. Updating invoice…");
      qc.invalidateQueries({ queryKey: ["ops", "invoice", id] });
      qc.invalidateQueries({ queryKey: ["ops", "invoice-payments", id] });
    } else if (canceled === "1") {
      toast.info("Payment canceled.");
    }
    navigate(location.pathname, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const balanceDue = Number(inv?.balance_due ?? 0);
  const canPay = !!inv && balanceDue > 0 && !PAID_TERMINAL.has((inv.status ?? "").toLowerCase());

  async function handlePayNow() {
    if (!inv) return;
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("ops-invoice-checkout", {
        body: { invoice_id: inv.id },
      });
      if (error) {
        const ctxMsg = await readFunctionsErrorMessage(error);
        toast.error(ctxMsg ?? "Could not start checkout.");
        return;
      }
      if (data?.url) {
        window.location.href = data.url as string;
        return;
      }
      toast.error("Checkout did not return a URL.");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start checkout.");
    } finally {
      setPaying(false);
    }
  }

  function handleDownload(kind: "invoice" | "receipt", template: "standard" | "corporate" | "detailed") {
    const branding = (orgBrandingQ.data ?? {}) as any;
    const data = {
      number: inv.invoice_number,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      currency_code: inv.currency_code,
      subtotal_amount: inv.subtotal_amount,
      discount_amount: inv.discount_amount,
      tax_amount: inv.tax_amount,
      adjustment_amount: inv.adjustment_amount,
      total_amount: inv.total_amount,
      amount_paid: inv.amount_paid,
      balance_due: inv.balance_due,
      notes_to_customer: inv.notes_to_customer,
      terms_and_conditions: inv.terms_and_conditions,
      lines: (linesQ.data ?? []).filter((l: any) => l.line_type !== "header"),
    };
    const billTo = {
      display_name: cust?.display_name,
      email: cust?.email,
      billing_address: cust?.billing_address,
    };
    const label = kind === "receipt" ? "Receipt" : "Invoice";
    downloadDocumentPdf({ kind, template, data, branding, billTo }, `${label}-${inv.invoice_number}.pdf`);
  }



  function invalidateInvoice() {
    qc.invalidateQueries({ queryKey: ["ops", "invoice", inv.id] });
    qc.invalidateQueries({ queryKey: ["ops", "invoices", "list"] });
    qc.invalidateQueries({ queryKey: ["ops", "invoice-payments", inv.id] });
    if (inv?.customer_id) {
      qc.invalidateQueries({ queryKey: ["ops", "customer-invoices", inv.customer_id] });
    }
  }

  function openRefund(p: any) {
    setRefundPayment(p);
    setRefundAmount(String(p.refundable_amount ?? ""));
  }

  async function handleRefund() {
    if (!refundPayment) return;
    const amt = Number(refundAmount);
    const max = Number(refundPayment.refundable_amount);
    if (!(amt > 0)) { toast.error("Enter an amount greater than 0."); return; }
    if (amt > max) { toast.error(`Amount exceeds the refundable balance (${max}).`); return; }
    setRefunding(true);
    try {
      const { data, error } = await supabase.functions.invoke("ops-issue-refund", {
        body: { payment_id: refundPayment.payment_id, amount: amt },
      });
      if (error || (data as any)?.error) {
        const ctxMsg = error ? await readFunctionsErrorMessage(error) : null;
        toast.error(ctxMsg ?? (data as any)?.error ?? error?.message ?? "Refund failed");
        return;
      }
      toast.success("Refund issued. The invoice updates once Stripe confirms (a few seconds).");
      setRefundPayment(null);
      invalidateInvoice();
    } finally {
      setRefunding(false);
    }
  }

  async function handleMarkSent() {
    const { error } = await supabase.rpc("ops_set_invoice_status", { p_id: inv.id, p_action: "mark_sent" });
    if (error) { toast.error(error.message ?? "Action failed"); return; }
    toast.success("Invoice marked as sent.");
    invalidateInvoice();
  }

  async function handleClone() {
    const { data, error } = await supabase.rpc("ops_clone_invoice", { p_id: inv.id });
    if (error) { toast.error(error.message ?? "Action failed"); return; }
    toast.success("Invoice cloned.");
    navigate(`/operations/invoices/${data}`);
  }

  async function handleSendInvoice() {
    setSending(true);
    try {
      let attachment_path: string | undefined;
      try {
        const branding = (orgBrandingQ.data ?? {}) as any;
        const docData = {
          number: inv.invoice_number,
          issue_date: inv.issue_date,
          due_date: inv.due_date,
          currency_code: inv.currency_code,
          subtotal_amount: inv.subtotal_amount,
          discount_amount: inv.discount_amount,
          tax_amount: inv.tax_amount,
          adjustment_amount: inv.adjustment_amount,
          total_amount: inv.total_amount,
          amount_paid: inv.amount_paid,
          balance_due: inv.balance_due,
          notes_to_customer: inv.notes_to_customer,
          terms_and_conditions: inv.terms_and_conditions,
          lines: (linesQ.data ?? []).filter((l: any) => l.line_type !== "header"),
        };
        const billTo = {
          display_name: cust?.display_name,
          email: cust?.email,
          billing_address: cust?.billing_address,
        };
        const blob = await generateDocumentPdf({ kind: "invoice", template: "standard", data: docData, branding, billTo });
        const path = `${inv.org_id}/Invoice-${inv.id}.pdf`;
        const up = await supabase.storage
          .from("operations-documents")
          .upload(path, blob, { upsert: true, contentType: "application/pdf" });
        if (!up.error) attachment_path = path;
      } catch {
        // If PDF generation/upload fails, send the email without an attachment.
      }

      const { data, error } = await supabase.functions.invoke("ops-invoice-send", {
        body: { invoice_id: inv.id, attachment_path, include_expense_receipts: attachReceipts },
      });
      if (error || (data as any)?.error) {
        const ctxMsg = error ? await readFunctionsErrorMessage(error) : null;
        toast.error(ctxMsg ?? (data as any)?.error ?? error?.message ?? "Email failed");
        return;
      }
      toast.success((data as any)?.attached ? "Invoice emailed with the PDF attached." : "Invoice emailed to the customer.");
      invalidateInvoice();
      setSendOpen(false);
    } finally {
      setSending(false);
    }
  }

  async function handleSendReceipt() {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("ops-payment-receipt", { body: { invoice_id: inv.id } });
      if (error || (data as any)?.error) {
        const ctxMsg = error ? await readFunctionsErrorMessage(error) : null;
        toast.error(ctxMsg ?? (data as any)?.error ?? error?.message ?? "Email failed");
        return;
      }
      toast.success("Receipt emailed to the customer.");
    } finally {
      setSending(false);
    }
  }

  async function runConfirmed() {
    if (!confirm) return;
    setActing(true);
    try {
      if (confirm === "void") {
        const { error } = await supabase.rpc("ops_set_invoice_status", { p_id: inv.id, p_action: "void" });
        if (error) { toast.error(error.message ?? "Action failed"); return; }
        toast.success("Invoice voided.");
        invalidateInvoice();
      } else if (confirm === "write_off") {
        const { error } = await supabase.rpc("ops_set_invoice_status", { p_id: inv.id, p_action: "write_off" });
        if (error) { toast.error(error.message ?? "Action failed"); return; }
        toast.success("Invoice written off.");
        invalidateInvoice();
      } else if (confirm === "delete") {
        const { error } = await supabase.rpc("ops_delete_draft_invoice", { p_id: inv.id });
        if (error) { toast.error(error.message ?? "Action failed"); return; }
        toast.success("Draft deleted.");
        qc.invalidateQueries({ queryKey: ["ops", "invoices", "list"] });
        navigate("/operations/invoices");
      }
      setConfirm(null);
    } finally {
      setActing(false);
    }
  }

  const status = (inv?.status ?? "").toLowerCase();
  const amountPaid = Number(inv?.amount_paid ?? 0);
  const canMarkSent = status === "draft";
  const canVoid = amountPaid === 0 && !PAID_TERMINAL.has(status);
  const canWriteOff = WRITE_OFF_STATUSES.has(status);
  const canDeleteDraft = status === "draft";
  const hasDestructive = canVoid || canWriteOff || canDeleteDraft;
  const canSendInvoice = status !== "void" && status !== "written_off";
  const canSendReceipt = amountPaid > 0;
  const hasSendItems = canSendInvoice || canSendReceipt;

  if (invoiceQ.isLoading) {
    return <div className="p-6 text-muted-foreground text-sm">Loading…</div>;
  }
  if (!inv) {
    return <div className="p-6 text-destructive text-sm">Invoice not found.</div>;
  }

  const currency = inv.currency_code;
  const cust = customerQ.data as any;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3">
                <span>Invoice {inv.invoice_number}</span>
                <StatusBadge status={inv.status} />
              </CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Issued {formatDate(inv.issue_date)} · Due {formatDate(inv.due_date)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(inv.status === "draft" || inv.status === "sent") && (
                <Button variant="outline" onClick={() => navigate(`/operations/invoices/${inv.id}/edit`)}>
                  Edit
                </Button>
              )}
              {canPay && (
                <Button variant="outline" onClick={() => setRecordOpen(true)}>
                  Record payment
                </Button>
              )}
              {canPay && (
                <Button onClick={handlePayNow} disabled={paying}>
                  {paying ? "Starting checkout…" : "Pay now"}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Download PDF <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDownload("invoice", "standard")}>Invoice · Standard</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("invoice", "corporate")}>Invoice · Corporate</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("invoice", "detailed")}>Invoice · Detailed</DropdownMenuItem>
                  {amountPaid > 0 && <DropdownMenuSeparator />}
                  {amountPaid > 0 && (
                    <DropdownMenuItem onClick={() => handleDownload("receipt", "standard")}>Receipt · Standard</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Actions <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canSendInvoice && (
                    <DropdownMenuItem disabled={sending} onClick={() => { setAttachReceipts(false); setSendOpen(true); }}>
                      Send invoice to customer
                    </DropdownMenuItem>
                  )}
                  {canSendReceipt && (
                    <DropdownMenuItem disabled={sending} onClick={handleSendReceipt}>
                      Send payment receipt
                    </DropdownMenuItem>
                  )}
                  {hasSendItems && <DropdownMenuSeparator />}
                  {canMarkSent && (
                    <DropdownMenuItem onClick={handleMarkSent}>Mark as sent</DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleClone}>Clone</DropdownMenuItem>
                  {hasDestructive && <DropdownMenuSeparator />}
                  {canVoid && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirm("void")}
                    >
                      Void
                    </DropdownMenuItem>
                  )}
                  {canWriteOff && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirm("write_off")}
                    >
                      Write off
                    </DropdownMenuItem>
                  )}
                  {canDeleteDraft && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirm("delete")}
                    >
                      Delete draft
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
              <dt className="text-muted-foreground">Billing address</dt>
              <dd className="whitespace-pre-line">{formatAddress(cust?.billing_address)}</dd>
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
            <TotalRow label="Subtotal" value={formatMoney(inv.subtotal_amount, currency)} />
            <TotalRow label="Tax" value={formatMoney(inv.tax_amount, currency)} />
            <TotalRow label="Total" value={formatMoney(inv.total_amount, currency)} bold />
            <TotalRow label="Amount paid" value={formatMoney(inv.amount_paid, currency)} />
            <TotalRow label="Balance due" value={formatMoney(inv.balance_due, currency)} bold />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
        <CardContent>
          {paymentsQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !paymentsQ.data || paymentsQ.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No payments recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Refunded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsQ.data.map((p: any) => (
                  <TableRow key={p.payment_id}>
                    <TableCell>{formatDate(p.payment_date)}</TableCell>
                    <TableCell className="capitalize">{String(p.payment_mode).replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-right">{formatMoney(p.allocated_amount, currency)}</TableCell>
                    <TableCell className="text-right">{Number(p.refunded_amount) > 0 ? formatMoney(p.refunded_amount, currency) : "—"}</TableCell>
                    <TableCell className="text-right">
                      {p.is_stripe && Number(p.refundable_amount) > 0 ? (
                        <Button variant="outline" size="sm" onClick={() => openRefund(p)}>Refund</Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>



      <RecordPaymentDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        invoiceId={inv.id}
        customerId={inv.customer_id}
        balanceDue={Number(inv.balance_due)}
        currency={inv.currency_code}
      />

      <AlertDialog open={confirm !== null} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "void" && "Void this invoice?"}
              {confirm === "write_off" && "Write off this invoice?"}
              {confirm === "delete" && "Delete this draft?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "void" && "This marks the invoice as void. This cannot be undone."}
              {confirm === "write_off" && "This marks the remaining balance as written off."}
              {confirm === "delete" && "The draft invoice will be permanently deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={acting}
              onClick={(e) => { e.preventDefault(); runConfirmed(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {acting ? "Working…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={refundPayment !== null} onOpenChange={(o) => { if (!o) setRefundPayment(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Refundable: {refundPayment ? formatMoney(refundPayment.refundable_amount, currency) : ""}
            </p>
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Refund amount</Label>
              <Input
                id="refund-amount"
                type="number"
                step="0.01"
                min="0"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The refund is sent to Stripe now; the invoice balance updates automatically once Stripe confirms.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundPayment(null)} disabled={refunding}>Cancel</Button>
            <Button onClick={handleRefund} disabled={refunding}>
              {refunding ? "Refunding…" : "Issue refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sendOpen} onOpenChange={(o) => { if (!sending) setSendOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send invoice {inv?.invoice_number}</DialogTitle>
            <DialogDescription>
              Emails the invoice{cust?.email ? ` to ${cust.email}` : ""} with the PDF attached.
            </DialogDescription>
          </DialogHeader>
          {receiptCount > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={attachReceipts} onCheckedChange={(v) => setAttachReceipts(v === true)} />
              Attach {receiptCount} expense receipt{receiptCount === 1 ? "" : "s"}
            </label>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={sending}>Cancel</Button>
            <Button onClick={() => handleSendInvoice()} disabled={sending}>
              {sending ? "Sending…" : "Send invoice"}
            </Button>
          </DialogFooter>
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

function formatAddress(addr: any): string {
  if (!addr) return "—";
  if (typeof addr === "string") return addr;
  const parts = [addr.line1, addr.line2, [addr.city, addr.state, addr.postal_code].filter(Boolean).join(", "), addr.country];
  return parts.filter(Boolean).join("\n") || "—";
}

async function readFunctionsErrorMessage(error: any): Promise<string | null> {
  try {
    const ctx = error?.context;
    if (!ctx) return error?.message ?? null;
    // ctx is usually a Response
    if (typeof ctx.json === "function") {
      const body = await ctx.clone().json().catch(() => null);
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    }
    if (typeof ctx.text === "function") {
      const txt = await ctx.clone().text().catch(() => "");
      if (txt) return txt;
    }
    if (typeof ctx === "object" && (ctx.error || ctx.message)) {
      return String(ctx.error ?? ctx.message);
    }
  } catch {
    /* ignore */
  }
  return error?.message ?? null;
}
