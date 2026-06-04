import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { formatMoney } from "./_shared";

type LineRow = {
  item_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount_amount: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const emptyLine = (): LineRow => ({
  item_id: "",
  description: "",
  quantity: "1",
  unit_price: "0",
  discount_amount: "0",
});

const toNum = (v: string, fallback = 0): number => {
  if (v === "" || v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function CreditNoteForm() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(todayISO());
  const [currency, setCurrency] = useState("USD");
  const [reason, setReason] = useState("");
  const [tax, setTax] = useState("0");
  const [associatedInvoiceId, setAssociatedInvoiceId] = useState<string>("");
  const [lines, setLines] = useState<LineRow[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customersQ = useQuery({
    queryKey: ["ops", "customers", "select-list"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("customers")
        .select("id, display_name, default_currency_code")
        .order("display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const itemsQ = useQuery({
    queryKey: ["ops", "items", "select-list"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("items")
        .select("id, name, default_selling_price")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const invoicesQ = useQuery({
    queryKey: ["ops", "credit-note-form", "open-invoices", customerId],
    enabled: !!customerId,
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

  useEffect(() => {
    if (!customerId || !customersQ.data) return;
    const c = customersQ.data.find((x: any) => x.id === customerId) as any;
    if (c?.default_currency_code) setCurrency(c.default_currency_code);
    setAssociatedInvoiceId("");
  }, [customerId, customersQ.data]);

  const setLine = (idx: number, patch: Partial<LineRow>) =>
    setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addLine = () => setLines((rows) => [...rows, emptyLine()]);
  const removeLine = (idx: number) =>
    setLines((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== idx)));

  const lineTotals = useMemo(
    () =>
      lines.map((r) =>
        round2(toNum(r.quantity, 1) * toNum(r.unit_price, 0) - toNum(r.discount_amount, 0)),
      ),
    [lines],
  );
  const subtotal = useMemo(() => round2(lineTotals.reduce((a, b) => a + b, 0)), [lineTotals]);
  const total = useMemo(() => round2(subtotal + toNum(tax, 0)), [subtotal, tax]);

  const fmt = (n: number) => formatMoney(n, currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) { setError("Customer is required."); return; }
    if (!lines.some((l) => l.description.trim().length > 0)) {
      setError("At least one line item with a description is required.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const p_header = {
      customer_id: customerId,
      issue_date: issueDate || null,
      reason: reason.trim() || null,
      currency_code: (currency || "USD").trim() || "USD",
      tax_amount: Number(tax) || 0,
      associated_invoice_id: associatedInvoiceId || null,
    };
    const p_lines = lines.map((r) => ({
      item_id: r.item_id || null,
      description: r.description,
      quantity: toNum(r.quantity, 1),
      unit_price: toNum(r.unit_price, 0),
      discount_amount: toNum(r.discount_amount, 0),
    }));

    try {
      const { data, error } = await supabase.rpc("ops_create_credit_note" as any, { p_header, p_lines });
      if (error) throw error;
      const newId = data as unknown as string;
      toast.success("Credit note created");
      qc.invalidateQueries({ queryKey: ["ops", "credit-notes", "list"] });
      navigate(`/operations/credit-notes/${newId}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create credit note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New credit note</h1>
        <p className="text-muted-foreground text-sm">Operations · Credit note</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Header</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId} disabled={customersQ.isLoading}>
                  <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                  <SelectContent>
                    {(customersQ.data ?? []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="issue_date">Issue date</Label>
                <Input id="issue_date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax">Tax</Label>
                <Input id="tax" type="number" min={0} step="any" value={tax} onChange={(e) => setTax(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Associated invoice (optional)</Label>
                <Select
                  value={associatedInvoiceId || "__none__"}
                  onValueChange={(v) => setAssociatedInvoiceId(v === "__none__" ? "" : v)}
                  disabled={!customerId || invoicesQ.isLoading}
                >
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {(invoicesQ.data ?? []).map((inv: any) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number} — balance {formatMoney(inv.balance_due, inv.currency_code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Line items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-2" />
                Add line
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-56">Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24 text-right">Qty</TableHead>
                  <TableHead className="w-32 text-right">Unit price</TableHead>
                  <TableHead className="w-32 text-right">Discount</TableHead>
                  <TableHead className="w-32 text-right">Line total</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Select
                        value={r.item_id || "__custom__"}
                        onValueChange={(v) => {
                          if (v === "__custom__") {
                            setLine(i, { item_id: "" });
                          } else {
                            const it = (itemsQ.data ?? []).find((x: any) => x.id === v) as any;
                            setLine(i, {
                              item_id: v,
                              description: it?.name ?? r.description,
                              unit_price:
                                it?.default_selling_price != null ? String(it.default_selling_price) : r.unit_price,
                            });
                          }
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__custom__">Custom / free-form</SelectItem>
                          {(itemsQ.data ?? []).map((it: any) => (
                            <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={r.description}
                        onChange={(e) => setLine(i, { description: e.target.value })}
                        placeholder="Description"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" min={0} step="any" className="text-right"
                        value={r.quantity}
                        onChange={(e) => setLine(i, { quantity: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" min={0} step="any" className="text-right"
                        value={r.unit_price}
                        onChange={(e) => setLine(i, { unit_price: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" min={0} step="any" className="text-right"
                        value={r.discount_amount}
                        onChange={(e) => setLine(i, { discount_amount: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(lineTotals[i])}</TableCell>
                    <TableCell>
                      <Button
                        type="button" variant="ghost" size="icon"
                        onClick={() => removeLine(i)} disabled={lines.length <= 1}
                        aria-label="Remove line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-6 ml-auto max-w-sm space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="tabular-nums">{fmt(toNum(tax, 0))}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{fmt(total)}</span>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Totals shown here are a preview. The server computes the authoritative totals on save.
              </p>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/operations/credit-notes")} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Create credit note"}
          </Button>
        </div>
      </form>
    </div>
  );
}
