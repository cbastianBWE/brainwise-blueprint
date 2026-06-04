import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StatusBadge, formatMoney, formatDate } from "./_shared";

export default function OperationsInvoices() {
  const navigate = useNavigate();

  const invoicesQ = useQuery({
    queryKey: ["ops", "invoices", "list"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("invoices")
        .select("id, customer_id, invoice_number, status, issue_date, due_date, total_amount, balance_due, currency_code")
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const customersQ = useQuery({
    queryKey: ["ops", "customers", "name-map"],
    queryFn: async () => {
      const { data, error } = await opsSupabase.from("customers").select("id, display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    (customersQ.data ?? []).forEach((c) => m.set(c.id, c.display_name ?? ""));
    return m;
  }, [customersQ.data]);

  const loading = invoicesQ.isLoading || customersQ.isLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-muted-foreground text-sm">Operations · All invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/operations/invoices/from-work")}>
            <Plus className="h-4 w-4 mr-2" />
            From work
          </Button>
          <Button onClick={() => navigate("/operations/invoices/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New invoice
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>All invoices</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !invoicesQ.data || invoicesQ.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Issue date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesQ.data.map((inv) => (
                  <TableRow
                    key={inv.id}
                    onClick={() => navigate(`/operations/invoices/${inv.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{nameById.get(inv.customer_id) ?? "—"}</TableCell>
                    <TableCell>{formatDate(inv.issue_date)}</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell className="text-right">{formatMoney(inv.total_amount, inv.currency_code)}</TableCell>
                    <TableCell className="text-right">{formatMoney(inv.balance_due, inv.currency_code)}</TableCell>
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
