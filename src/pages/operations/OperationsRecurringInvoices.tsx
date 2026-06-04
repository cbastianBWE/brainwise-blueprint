import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StatusBadge, formatDate } from "./_shared";

export default function OperationsRecurringInvoices() {
  const navigate = useNavigate();

  const listQ = useQuery({
    queryKey: ["ops", "recurring-invoices", "list"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("recurring_invoice_templates")
        .select("id, name, status, frequency, interval_count, next_run_date, end_date, currency_code, customer_id")
        .order("created_at", { ascending: false });
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

  const loading = listQ.isLoading || customersQ.isLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Recurring invoices</h1>
          <p className="text-muted-foreground text-sm">Operations · Invoice templates</p>
        </div>
        <Button onClick={() => navigate("/operations/recurring-invoices/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New recurring invoice
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>All templates</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !listQ.data || listQ.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recurring invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next run</TableHead>
                  <TableHead>End date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQ.data.map((t: any) => (
                  <TableRow
                    key={t.id}
                    onClick={() => navigate(`/operations/recurring-invoices/${t.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{nameById.get(t.customer_id) ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="capitalize">every {t.interval_count} {t.frequency}</TableCell>
                    <TableCell>{formatDate(t.next_run_date)}</TableCell>
                    <TableCell>{formatDate(t.end_date)}</TableCell>
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
