import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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

type LineRow = {
  item_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount_amount: string;
};

type HeaderState = {
  customer_id: string;
  issue_date: string;
  due_date: string;
  payment_terms_days: string;
  currency_code: string;
  reference_number: string;
  discount_amount: string;
  shipping_amount: string;
  adjustment_amount: string;
  notes_to_customer: string;
  terms_and_conditions: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyLine = (): LineRow => ({
  item_id: "",
  description: "",
  quantity: "1",
  unit_price: "0",
  discount_amount: "0",
});

const emptyHeader = (): HeaderState => ({
  customer_id: "",
  issue_date: todayISO(),
  due_date: "",
  payment_terms_days: "",
  currency_code: "USD",
  reference_number: "",
  discount_amount: "0",
  shipping_amount: "0",
  adjustment_amount: "0",
  notes_to_customer: "",
  terms_and_conditions: "",
});

const toNum = (v: string, fallback = 0): number => {
  if (v === "" || v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function InvoiceForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();

  const [header, setHeader] = useState<HeaderState>(emptyHeader());
  const [lines, setLines] = useState<LineRow[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const setH = <K extends keyof HeaderState>(k: K, v: HeaderState[K]) =>
    setHeader((h) => ({ ...h, [k]: v }));

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

  const invoiceQ = useQuery({
    queryKey: ["ops", "invoice", id, "edit-prefill"],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("invoices")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const linesQ = useQuery({
    queryKey: ["ops", "invoice-lines", id, "edit-prefill"],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("document_lines")
        .select("item_id, description, quantity, unit_price, discount_amount, sort_order")
        .eq("document_type", "invoice")
        .eq("document_id", id!)
        .neq("line_type", "header")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Prefill from existing invoice (edit mode)
  useEffect(() => {
    if (!isEdit || prefilled) return;
    if (!invoiceQ.data || !linesQ.data) return;
    const inv: any = invoiceQ.data;
    setHeader({
      customer_id: inv.customer_id ?? "",
      issue_date: inv.issue_date ?? todayISO(),
      due_date: inv.due_date ?? "",
      payment_terms_days: inv.payment_terms_days != null ? String(inv.payment_terms_days) : "",
      currency_code: inv.currency_code ?? "USD",
      reference_number: inv.reference_number ?? "",
      discount_amount: inv.discount_amount != null ? String(inv.discount_amount) : "0",
      shipping_amount: inv.shipping_amount != null ? String(inv.shipping_amount) : "0",
      adjustment_amount: inv.adjustment_amount != null ? String(inv.adjustment_amount) : "0",
      notes_to_customer: inv.notes_to_customer ?? "",
      terms_and_conditions: inv.terms_and_conditions ?? "",
    });
    const rows = (linesQ.data as any[]).map((l) => ({
      item_id: l.item_id ?? "",
      description: l.description ?? "",
      quantity: l.quantity != null ? String(l.quantity) : "1",
      unit_price: l.unit_price != null ? String(l.unit_price) : "0",
      discount_amount: l.discount_amount != null ? String(l.discount_amount) : "0",
    }));
    setLines(rows.length > 0 ? rows : [emptyLine()]);
    setPrefilled(true);
  }, [isEdit, prefilled, invoiceQ.data, linesQ.data]);

  // Prefill customer from ?customer= query param (create mode)
  useEffect(() => {
    if (isEdit) return;
    const c = searchParams.get("customer");
    if (c && !header.customer_id) {
      setHeader((h) => ({ ...h, customer_id: c }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, searchParams]);

  // When customer changes in create mode, default currency from customer
  useEffect(() => {
    if (isEdit) return;
    if (!header.customer_id || !customersQ.data) return;
    const c = customersQ.data.find((x: any) => x.id === header.customer_id) as any;
    if (c?.default_currency_code) {
      setHeader((h) => ({ ...h, currency_code: c.default_currency_code }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [header.customer_id, customersQ.data]);

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
  const total = useMemo(
    () =>
      round2(
        subtotal -
          toNum(header.discount_amount, 0) +
          toNum(header.shipping_amount, 0) +
          toNum(header.adjustment_amount, 0),
      ),
    [subtotal, header.discount_amount, header.shipping_amount, header.adjustment_amount],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!header.customer_id) {
      setError("Customer is required.");
      return;
    }
    if (!lines.some((l) => l.description.trim().length > 0)) {
      setError("At least one line item with a description is required.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const p_header = {
      customer_id: header.customer_id,
      issue_date: header.issue_date || todayISO(),
      due_date: header.due_date || null,
      payment_terms_days:
        header.payment_terms_days === "" ? null : toNum(header.payment_terms_days, 0),
      currency_code: header.currency_code.trim() || "USD",
      reference_number: header.reference_number.trim() || null,
      discount_amount: toNum(header.discount_amount, 0),
      shipping_amount: toNum(header.shipping_amount, 0),
      adjustment_amount: toNum(header.adjustment_amount, 0),
      notes_to_customer: header.notes_to_customer.trim() || null,
      terms_and_conditions: header.terms_and_conditions.trim() || null,
    };

    const p_lines = lines.map((r) => ({
      item_id: r.item_id || null,
      description: r.description,
      quantity: toNum(r.quantity, 1),
      unit_price: toNum(r.unit_price, 0),
      discount_amount: toNum(r.discount_amount, 0),
    }));

    try {
      if (isEdit) {
        const { error } = await supabase.rpc("ops_update_invoice" as any, {
          p_id: id,
          p_header,
          p_lines,
        });
        if (error) throw error;
        toast.success("Invoice updated");
        invalidateAll(qc, id!, header.customer_id);
        navigate(`/operations/invoices/${id}`);
      } else {
        const { data, error } = await supabase.rpc("ops_create_invoice" as any, {
          p_header,
          p_lines,
        });
        if (error) throw error;
        const newId = data as unknown as string;
        toast.success("Invoice created");
        invalidateAll(qc, newId, header.customer_id);
        navigate(`/operations/invoices/${newId}`);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const currency = header.currency_code || "USD";
  const fmt = (n: number) => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
    } catch {
      return `${n.toFixed(2)} ${currency}`;
    }
  };

  if (isEdit && (invoiceQ.isLoading || linesQ.isLoading)) {
    return <div className="p-6 text-muted-foreground text-sm">Loading…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{isEdit ? "Edit invoice" : "New invoice"}</h1>
        <p className="text-muted-foreground text-sm">Operations · Invoice</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Header</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Customer *</Label>
                <Select
                  value={header.customer_id}
                  onValueChange={(v) => setH("customer_id", v)}
                  disabled={customersQ.isLoading}
                >
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
                <Input
                  id="issue_date" type="date"
                  value={header.issue_date}
                  onChange={(e) => setH("issue_date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due date</Label>
                <Input
                  id="due_date" type="date"
                  value={header.due_date}
                  onChange={(e) => setH("due_date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_terms_days">Payment terms (days)</Label>
                <Input
                  id="payment_terms_days" type="number" min={0}
                  value={header.payment_terms_days}
                  onChange={(e) => setH("payment_terms_days", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency_code">Currency</Label>
                <Input
                  id="currency_code"
                  value={header.currency_code}
                  onChange={(e) => setH("currency_code", e.target.value.toUpperCase())}
                  maxLength={3}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="reference_number">Reference number</Label>
                <Input
                  id="reference_number"
                  value={header.reference_number}
                  onChange={(e) => setH("reference_number", e.target.value)}
                />
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
                                it?.default_selling_price != null
                                  ? String(it.default_selling_price)
                                  : r.unit_price,
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
                        type="number" min={0} step="any"
                        className="text-right"
                        value={r.quantity}
                        onChange={(e) => setLine(i, { quantity: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" min={0} step="any"
                        className="text-right"
                        value={r.unit_price}
                        onChange={(e) => setLine(i, { unit_price: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" min={0} step="any"
                        className="text-right"
                        value={r.discount_amount}
                        onChange={(e) => setLine(i, { discount_amount: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(lineTotals[i])}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(i)}
                        disabled={lines.length <= 1}
                        aria-label="Remove line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Adjustments & totals</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount_amount">Discount</Label>
                <Input
                  id="discount_amount" type="number" min={0} step="any"
                  value={header.discount_amount}
                  onChange={(e) => setH("discount_amount", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping_amount">Shipping</Label>
                <Input
                  id="shipping_amount" type="number" min={0} step="any"
                  value={header.shipping_amount}
                  onChange={(e) => setH("shipping_amount", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjustment_amount">Adjustment</Label>
                <Input
                  id="adjustment_amount" type="number" step="any"
                  value={header.adjustment_amount}
                  onChange={(e) => setH("adjustment_amount", e.target.value)}
                />
              </div>
            </div>

            <div className="ml-auto max-w-sm space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{fmt(subtotal)}</span>
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

        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes_to_customer">Notes to customer</Label>
              <Textarea
                id="notes_to_customer" rows={3}
                value={header.notes_to_customer}
                onChange={(e) => setH("notes_to_customer", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="terms_and_conditions">Terms and conditions</Label>
              <Textarea
                id="terms_and_conditions" rows={3}
                value={header.terms_and_conditions}
                onChange={(e) => setH("terms_and_conditions", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEdit ? `/operations/invoices/${id}` : "/operations/invoices")}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, invoiceId: string, customerId: string) {
  qc.invalidateQueries({ queryKey: ["ops", "invoices", "list"] });
  qc.invalidateQueries({ queryKey: ["ops", "invoice", invoiceId] });
  if (customerId) {
    qc.invalidateQueries({ queryKey: ["ops", "customer-invoices", customerId] });
  }
}
