import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StatusBadge, formatMoney, formatDate } from "./_shared";

export default function OperationsRetainers() {
  const navigate = useNavigate();

  const retainersQ = useQuery({
    queryKey: ["ops", "retainers", "list"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("retainer_invoices")
        .select("id, retainer_number, status, issue_date, amount, available_balance, currency_code, customer_id")
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

  const loading = retainersQ.isLoading || customersQ.isLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Retainers</h1>
          <p className="text-muted-foreground text-sm">Operations · All retainers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/operations/retainers/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New retainer
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>All retainers</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !retainersQ.data || retainersQ.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No retainers yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Retainer #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issue date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retainersQ.data.map((r: any) => (
                  <TableRow
                    key={r.id}
                    onClick={() => navigate(`/operations/retainers/${r.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{r.retainer_number}</TableCell>
                    <TableCell>{nameById.get(r.customer_id) ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell>{formatDate(r.issue_date)}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.amount, r.currency_code)}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.available_balance, r.currency_code)}</TableCell>
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
