import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StatusBadge, formatMoney, formatDate } from "./_shared";

export default function OperationsCreditNotes() {
  const navigate = useNavigate();

  const cnQ = useQuery({
    queryKey: ["ops", "credit-notes", "list"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("credit_notes")
        .select("id, credit_note_number, status, issue_date, total_amount, balance, currency_code, customer_id")
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

  const loading = cnQ.isLoading || customersQ.isLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Credit notes</h1>
          <p className="text-muted-foreground text-sm">Operations · All credit notes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/operations/credit-notes/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New credit note
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>All credit notes</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !cnQ.data || cnQ.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No credit notes yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Credit note #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issue date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cnQ.data.map((cn) => (
                  <TableRow
                    key={cn.id}
                    onClick={() => navigate(`/operations/credit-notes/${cn.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{cn.credit_note_number}</TableCell>
                    <TableCell>{nameById.get(cn.customer_id) ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={cn.status} /></TableCell>
                    <TableCell>{formatDate(cn.issue_date)}</TableCell>
                    <TableCell className="text-right">{formatMoney(cn.total_amount, cn.currency_code)}</TableCell>
                    <TableCell className="text-right">{formatMoney(cn.balance, cn.currency_code)}</TableCell>
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
