import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatMoney, formatDate } from "./_shared";
import DealFormDialog from "./DealFormDialog";

export default function OperationsDeals() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ops", "deals", "list"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("deals" as any)
        .select("id, name, amount, currency_code, close_date, created_at, account_id, pipeline_id, stage_id, stage:deal_stages(name), account:accounts(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Deals</h1>
          <p className="text-muted-foreground text-sm">CRM · Deals</p>
        </div>
        <Button onClick={() => { setEditRow(null); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />New deal
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>All deals</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : error ? (
            <p className="text-destructive text-sm">Failed to load deals.</p>
          ) : !data || data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No deals yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Close date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d: any) => (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer"
                    onClick={() => { setEditRow(d); setCreateOpen(true); }}
                  >
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.account?.name ?? "—"}</TableCell>
                    <TableCell>{formatMoney(d.amount, d.currency_code)}</TableCell>
                    <TableCell>{d.stage?.name ?? "—"}</TableCell>
                    <TableCell>{formatDate(d.close_date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <DealFormDialog open={createOpen} onOpenChange={setCreateOpen} row={editRow} />
    </div>
  );
}
