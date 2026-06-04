import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { formatMoney, formatDate } from "./_shared";
import RecurringExpenseFormDialog from "./RecurringExpenseFormDialog";

export default function OperationsRecurringExpenses() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const listQ = useQuery({
    queryKey: ["ops", "recurring-expenses", "list"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("recurring_expense_templates")
        .select("id, vendor_name, amount, currency_code, frequency, interval_count, next_run_date, end_date, is_active")
        .order("next_run_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleActive = async (row: any) => {
    try {
      const { error } = await opsSupabase
        .from("recurring_expense_templates")
        .update({ is_active: !row.is_active })
        .eq("id", row.id);
      if (error) throw error;
      toast.success(row.is_active ? "Paused" : "Activated");
      qc.invalidateQueries({ queryKey: ["ops", "recurring-expenses", "list"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update");
    }
  };

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (row: any) => { setEditing(row); setDialogOpen(true); };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Recurring expenses</h1>
          <p className="text-muted-foreground text-sm">Operations · Overhead expense templates</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          New recurring expense
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>All templates</CardTitle></CardHeader>
        <CardContent>
          {listQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !listQ.data || listQ.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recurring expenses yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next run</TableHead>
                  <TableHead>End date</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQ.data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.vendor_name ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.amount, r.currency_code)}</TableCell>
                    <TableCell className="capitalize">every {r.interval_count} {r.frequency}</TableCell>
                    <TableCell>{formatDate(r.next_run_date)}</TableCell>
                    <TableCell>{formatDate(r.end_date)}</TableCell>
                    <TableCell>{r.is_active ? "Active" : "Paused"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toggleActive(r)}>
                          {r.is_active ? "Pause" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RecurringExpenseFormDialog open={dialogOpen} onOpenChange={setDialogOpen} template={editing} />
    </div>
  );
}
