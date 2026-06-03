import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import CustomerFormDialog from "./CustomerFormDialog";
import { StatusBadge, formatMoney, formatDate } from "./_shared";

export default function OperationsCustomerDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const customerQ = useQuery({
    queryKey: ["ops", "customer", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase.from("customers").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const invoicesQ = useQuery({
    queryKey: ["ops", "customer-invoices", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("invoices")
        .select("id, invoice_number, status, issue_date, due_date, total_amount, balance_due, currency_code")
        .eq("customer_id", id)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const c = customerQ.data as any;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{c?.display_name ?? (customerQ.isLoading ? "Loading…" : "Customer")}</CardTitle>
        </CardHeader>
        <CardContent>
          {customerQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !c ? (
            <p className="text-destructive text-sm">Customer not found.</p>
          ) : (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">Email</dt><dd>{c.email ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Phone</dt><dd>{c.phone ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Status</dt><dd className="capitalize">{c.status ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Default currency</dt><dd>{c.default_currency_code ?? "—"}</dd></div>
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent>
          {invoicesQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !invoicesQ.data || invoicesQ.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Issue date</TableHead>
                  <TableHead>Due date</TableHead>
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
                    <TableCell>{formatDate(inv.issue_date)}</TableCell>
                    <TableCell>{formatDate(inv.due_date)}</TableCell>
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
