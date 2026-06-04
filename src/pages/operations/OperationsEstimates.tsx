import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StatusBadge, formatMoney, formatDate } from "./_shared";

export default function OperationsEstimates() {
  const navigate = useNavigate();

  const estimatesQ = useQuery({
    queryKey: ["ops", "estimates", "list"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("estimates")
        .select("id, estimate_number, status, issue_date, expiration_date, total_amount, currency_code, customer_id")
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

  const loading = estimatesQ.isLoading || customersQ.isLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Estimates</h1>
          <p className="text-muted-foreground text-sm">Operations · All estimates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/operations/estimates/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New estimate
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>All estimates</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !estimatesQ.data || estimatesQ.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No estimates yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estimate #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issue date</TableHead>
                  <TableHead>Expiration date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimatesQ.data.map((est) => (
                  <TableRow
                    key={est.id}
                    onClick={() => navigate(`/operations/estimates/${est.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{est.estimate_number}</TableCell>
                    <TableCell>{nameById.get(est.customer_id) ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={est.status} /></TableCell>
                    <TableCell>{formatDate(est.issue_date)}</TableCell>
                    <TableCell>{formatDate(est.expiration_date)}</TableCell>
                    <TableCell className="text-right">{formatMoney(est.total_amount, est.currency_code)}</TableCell>
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
