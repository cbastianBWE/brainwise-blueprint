import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatDate } from "@/pages/operations/_shared";

const PAID_TERMINAL = new Set(["paid", "void", "written_off"]);

type PublicDoc = {
  document_type: "invoice" | "estimate";
  purpose?: string;
  document: any;
  customer: {
    display_name: string;
    remit_bank_name?: string | null;
    remit_account_type?: string | null;
    remit_routing_number?: string | null;
    remit_account_number?: string | null;
  };
  org: { name: string };
  card_fee?: { enabled: boolean; bank_total: number; card_total: number };
  lines: Array<{ description: string | null; quantity: number | null; unit_price: number | null; line_total: number | null }>;
};

export default function PublicInvoicePay() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<PublicDoc | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("ops_get_public_document_by_token" as any, { p_token: token });
      if (error || !data) {
        setInvalid(true);
        return;
      }
      const d = data as unknown as PublicDoc;
      if (!d || d.document_type !== "invoice") {
        setInvalid(true);
        return;
      }
      setDoc(d);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paid = params.get("paid");
    const canceled = params.get("canceled");
    if (!paid && !canceled) return;
    if (paid === "1") {
      toast.success("Payment received");
      load();
    } else if (canceled === "1") {
      toast.info("Payment canceled");
    }
    navigate(location.pathname, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePayNow() {
    setStarting(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("ops-public-invoice-checkout", { body: { token } });
      if (error) {
        setErrorMsg(error.message ?? "Could not start checkout.");
        return;
      }
      if ((data as any)?.url) {
        window.location.href = (data as any).url as string;
        return;
      }
      setErrorMsg("Checkout did not return a URL.");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Could not start checkout.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-10 px-4">
      <h1 className="text-xl font-semibold tracking-tight mb-6">BrainWise</h1>
      <div className="w-full max-w-2xl">
        {loading ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Loading…</CardContent></Card>
        ) : invalid || !doc ? (
          <Card>
            <CardHeader><CardTitle>Link no longer valid</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This payment link is no longer valid. Please contact the sender for an updated link.
            </CardContent>
          </Card>
        ) : (
          <PaidContent doc={doc} starting={starting} errorMsg={errorMsg} onPay={handlePayNow} />
        )}
      </div>
    </div>
  );
}

function PaidContent({ doc, starting, errorMsg, onPay }: { doc: PublicDoc; starting: boolean; errorMsg: string | null; onPay: () => void }) {
  const invoice = doc.document;
  const currency = invoice.currency_code;
  const status = (invoice.status ?? "").toLowerCase();
  const balanceDue = Number(invoice.balance_due ?? 0);
  const canPay = invoice.collects_payment === true && balanceDue > 0 && !PAID_TERMINAL.has(status);
  const fullyPaid = balanceDue <= 0 || status === "paid";

  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">{doc.org?.name}</p>
        <CardTitle>Invoice {invoice.number}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Billed to {doc.customer?.display_name} · Issued {formatDate(invoice.issue_date)}
          {invoice.due_date ? ` · Due ${formatDate(invoice.due_date)}` : ""}
        </p>
      </CardHeader>
      <CardContent>
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
            {doc.lines.map((l, i) => (
              <TableRow key={i}>
                <TableCell>{l.description ?? "—"}</TableCell>
                <TableCell className="text-right">{l.quantity ?? "—"}</TableCell>
                <TableCell className="text-right">{formatMoney(l.unit_price, currency)}</TableCell>
                <TableCell className="text-right">{formatMoney(l.line_total, currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-6 ml-auto max-w-sm space-y-1 text-sm">
          <Row label="Subtotal" value={formatMoney(invoice.subtotal_amount, currency)} />
          <Row label="Tax" value={formatMoney(invoice.tax_amount, currency)} />
          <Row label="Total" value={formatMoney(invoice.total_amount, currency)} bold />
          <Row label="Amount paid" value={formatMoney(invoice.amount_paid, currency)} />
          <Row label="Balance due" value={formatMoney(invoice.balance_due, currency)} bold />
        </div>

        {(() => {
          const r = doc.customer;
          const hasRemit = r?.remit_bank_name || r?.remit_account_number || r?.remit_routing_number;
          if (!hasRemit) return null;
          return (
            <div className="mt-6 rounded-md border p-4 text-sm space-y-1">
              <p className="font-medium">Pay by bank transfer</p>
              {r.remit_bank_name && (<div><span className="text-muted-foreground">Bank: </span>{r.remit_bank_name}</div>)}
              {r.remit_account_type && (<div><span className="text-muted-foreground">Account type: </span><span className="capitalize">{r.remit_account_type}</span></div>)}
              {r.remit_routing_number && (<div><span className="text-muted-foreground">Routing number: </span>{r.remit_routing_number}</div>)}
              {r.remit_account_number && (<div><span className="text-muted-foreground">Account number: </span>{r.remit_account_number}</div>)}
            </div>
          );
        })()}


        <div className="mt-6 flex flex-col items-end gap-2">
          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
          {canPay ? (
            <Button onClick={onPay} disabled={starting}>
              {starting ? "Starting checkout…" : "Pay now"}
            </Button>
          ) : fullyPaid ? (
            <p className="text-sm text-muted-foreground">This invoice is paid in full.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
