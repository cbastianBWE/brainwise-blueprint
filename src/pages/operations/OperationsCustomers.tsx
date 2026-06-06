import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CustomerFormDialog from "./CustomerFormDialog";

export default function OperationsCustomers() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["ops", "customers", "list"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("customers")
        .select("id, display_name, email, status, default_currency_code, created_at")
        .order("display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-muted-foreground text-sm">Operations · Customer accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/operations/import?entity=customers")}>
            Import CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New customer
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>All customers</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : error ? (
            <p className="text-destructive text-sm">Failed to load customers.</p>
          ) : !data || data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No customers yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow
                    key={c.id}
                    onClick={() => navigate(`/operations/customers/${c.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{c.display_name}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize">
                        {c.status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>{c.default_currency_code ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <CustomerFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
