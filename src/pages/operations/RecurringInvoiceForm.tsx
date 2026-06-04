import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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

const todayISO = () => new Date().toISOString().slice(0, 10);
const FREQS = ["daily", "weekly", "monthly", "quarterly", "yearly"] as const;

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

export default function RecurringInvoiceForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [interval, setInterval] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [nextRun, setNextRun] = useState(todayISO());
  const [endDate, setEndDate] = useState("");
  const [maxOccurrences, setMaxOccurrences] = useState("");
  const [terms, setTerms] = useState("30");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [termsText, setTermsText] = useState("");
  const [lines, setLines] = useState<LineRow[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

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

  const templateQ = useQuery({
    queryKey: ["ops", "recurring-invoice", id, "edit-prefill"],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("recurring_invoice_templates")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!isEdit || prefilled || !templateQ.data) return;
    const t: any = templateQ.data;
    setName(t.name ?? "");
    setCustomerId(t.customer_id ?? "");
    setFrequency(t.frequency ?? "monthly");
    setInterval(t.interval_count != null ? String(t.interval_count) : "1");
    setStartDate(t.start_date ?? "");
    setNextRun(t.next_run_date ?? todayISO());
    setEndDate(t.end_date ?? "");
    setMaxOccurrences(t.max_occurrences != null ? String(t.max_occurrences) : "");
    setTerms(t.payment_terms_days != null ? String(t.payment_terms_days) : "30");
    setCurrency(t.currency_code ?? "USD");
    setNotes(t.notes ?? "");
    setTermsText(t.terms ?? "");
    const raw = Array.isArray(t.template_lines) ? t.template_lines : [];
    const rows = raw.map((l: any) => ({
      item_id: l.item_id ?? "",
      description: l.description ?? "",
      quantity: l.quantity != null ? String(l.quantity) : "1",
      unit_price: l.unit_price != null ? String(l.unit_price) : "0",
      discount_amount: l.discount_amount != null ? String(l.discount_amount) : "0",
    }));
    setLines(rows.length > 0 ? rows : [emptyLine()]);
    setPrefilled(true);
  }, [isEdit, prefilled, templateQ.data]);

  useEffect(() => {
    if (isEdit) return;
    if (!customerId || !customersQ.data) return;
    const c = customersQ.data.find((x: any) => x.id === customerId) as any;
    if (c?.default_currency_code) setCurrency(c.default_currency_code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, customersQ.data]);

  const setLine = (idx: number, patch: Partial<LineRow>) =>
    setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addLine = () => setLines((rows) => [...rows, emptyLine()]);
  const removeLine = (idx: number) =>
    setLines((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== idx)));

  const lineTotals = useMemo(
    () => lines.map((r) => round2(toNum(r.quantity, 1) * toNum(r.unit_price, 0) - toNum(r.discount_amount, 0))),
    [lines],
  );
  const subtotal = useMemo(() => round2(lineTotals.reduce((a, b) => a + b, 0)), [lineTotals]);

  const fmt = (n: number) => {
    try { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n); }
    catch { return `${n.toFixed(2)} ${currency}`; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    if (!customerId) { setError("Customer is required."); return; }
    if (!nextRun) { setError("Next run date is required."); return; }
    if (!lines.some((l) => l.description.trim().length > 0)) {
      setError("At least one line item with a description is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const template_lines = lines.map((r) => ({
      item_id: r.item_id || null,
      description: r.description,
      quantity: toNum(r.quantity, 1),
      unit_price: toNum(r.unit_price, 0),
      discount_amount: toNum(r.discount_amount, 0),
    }));
    const payload = {
      customer_id: customerId,
      name: name.trim(),
      frequency,
      interval_count: Number(interval) || 1,
      start_date: startDate || null,
      next_run_date: nextRun,
      end_date: endDate || null,
      max_occurrences: maxOccurrences ? Number(maxOccurrences) : null,
      payment_terms_days: Number(terms) || 30,
      currency_code: currency || "USD",
      notes: notes.trim() || null,
      terms: termsText.trim() || null,
      template_lines: template_lines as any,
    };
    try {
      if (isEdit && id) {
        const { error } = await opsSupabase
          .from("recurring_invoice_templates")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        toast.success("Recurring invoice updated");
        qc.invalidateQueries({ queryKey: ["ops", "recurring-invoices", "list"] });
        qc.invalidateQueries({ queryKey: ["ops", "recurring-invoice", id] });
        navigate(`/operations/recurring-invoices/${id}`);
      } else {
        const { data, error } = await opsSupabase
          .from("recurring_invoice_templates")
          .insert(payload as any)
          .select("id")
          .single();
        if (error) throw error;
        const newId = (data as any)?.id as string;
        toast.success("Recurring invoice created");
        qc.invalidateQueries({ queryKey: ["ops", "recurring-invoices", "list"] });
        qc.invalidateQueries({ queryKey: ["ops", "recurring-invoice", newId] });
        navigate(`/operations/recurring-invoices/${newId}`);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save recurring invoice");
    } finally {
      setSubmitting(false);
    }
  };

  if (isEdit && templateQ.isLoading) {
    return <div className="p-6 text-muted-foreground text-sm">Loading…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{isEdit ? "Edit recurring invoice" : "New recurring invoice"}</h1>
        <p className="text-muted-foreground text-sm">Operations · Recurring invoice template</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Header</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="start_date">Start date</Label>
                <Input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="next_run">Next run date *</Label>
                <Input id="next_run" type="date" value={nextRun} onChange={(e) => setNextRun(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End date</Label>
                <Input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_occ">Max occurrences</Label>
                <Input id="max_occ" type="number" min="0" step="1" value={maxOccurrences} onChange={(e) => setMaxOccurrences(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="terms_days">Payment terms (days)</Label>
                <Input id="terms_days" type="number" min="0" step="1" value={terms} onChange={(e) => setTerms(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Line items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-2" /> Add line
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
                              unit_price: it?.default_selling_price != null ? String(it.default_selling_price) : r.unit_price,
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
                      <Input value={r.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Description" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={0} step="any" className="text-right" value={r.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={0} step="any" className="text-right" value={r.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={0} step="any" className="text-right" value={r.discount_amount} onChange={(e) => setLine(i, { discount_amount: e.target.value })} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(lineTotals[i])}</TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)} disabled={lines.length <= 1} aria-label="Remove line">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-end text-sm tabular-nums">
              <div className="space-y-1 text-right">
                <div>Subtotal: <span className="font-medium">{fmt(subtotal)}</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Notes & terms</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="terms_text">Terms</Label>
              <Textarea id="terms_text" rows={3} value={termsText} onChange={(e) => setTermsText(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={submitting}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Create"}</Button>
        </div>
      </form>
    </div>
  );
}
