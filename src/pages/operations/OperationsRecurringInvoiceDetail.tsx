import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { StatusBadge, formatMoney, formatDate } from "./_shared";

export default function OperationsRecurringInvoiceDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const templateQ = useQuery({
    queryKey: ["ops", "recurring-invoice", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("recurring_invoice_templates")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const t: any = templateQ.data;

  const customerQ = useQuery({
    queryKey: ["ops", "customer", t?.customer_id],
    enabled: !!t?.customer_id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("customers")
        .select("id, display_name")
        .eq("id", t.customer_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const generatedQ = useQuery({
    queryKey: ["ops", "recurring-invoice-generated", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("invoices")
        .select("id, invoice_number, status, issue_date, total_amount, currency_code")
        .eq("parent_recurring_id", id)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const togglePauseResume = async () => {
    if (!t) return;
    const next = t.status === "active" ? "paused" : "active";
    try {
      const { error } = await opsSupabase
        .from("recurring_invoice_templates")
        .update({ status: next })
        .eq("id", id);
      if (error) throw error;
      toast.success(next === "paused" ? "Paused" : "Resumed");
      qc.invalidateQueries({ queryKey: ["ops", "recurring-invoice", id] });
      qc.invalidateQueries({ queryKey: ["ops", "recurring-invoices", "list"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update");
    }
  };

  const templateLines: any[] = Array.isArray(t?.template_lines) ? t.template_lines : [];
  const currency = t?.currency_code ?? "USD";

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-3">
              {t?.name ?? (templateQ.isLoading ? "Loading…" : "Template")}
              {t && <StatusBadge status={t.status} />}
            </CardTitle>
            {t && (
              <p className="text-sm text-muted-foreground capitalize">
                every {t.interval_count} {t.frequency} · next {formatDate(t.next_run_date)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!t} onClick={() => navigate(`/operations/recurring-invoices/${id}/edit`)}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button variant="outline" size="sm" disabled={!t} onClick={togglePauseResume}>
              {t?.status === "active" ? "Pause" : "Resume"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templateQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !t ? (
            <p className="text-destructive text-sm">Template not found.</p>
          ) : (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">Customer</dt><dd>{customerQ.data?.display_name ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Currency</dt><dd>{t.currency_code}</dd></div>
              <div><dt className="text-muted-foreground">Start date</dt><dd>{formatDate(t.start_date)}</dd></div>
              <div><dt className="text-muted-foreground">End date</dt><dd>{formatDate(t.end_date)}</dd></div>
              <div><dt className="text-muted-foreground">Max occurrences</dt><dd>{t.max_occurrences ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Payment terms (days)</dt><dd>{t.payment_terms_days}</dd></div>
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Template lines</CardTitle></CardHeader>
        <CardContent>
          {templateLines.length === 0 ? (
            <p className="text-muted-foreground text-sm">No lines.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templateLines.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{l.description ?? "—"}</TableCell>
                    <TableCell className="text-right">{l.quantity ?? 1}</TableCell>
                    <TableCell className="text-right">{formatMoney(l.unit_price ?? 0, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Generated invoices</CardTitle></CardHeader>
        <CardContent>
          {generatedQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !generatedQ.data || generatedQ.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No invoices generated yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Issue date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedQ.data.map((inv: any) => (
                  <TableRow
                    key={inv.id}
                    onClick={() => navigate(`/operations/invoices/${inv.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{formatDate(inv.issue_date)}</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell className="text-right">{formatMoney(inv.total_amount, inv.currency_code)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
