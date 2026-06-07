import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import LeadFormDialog from "./LeadFormDialog";

export default function OperationsLeads() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ops", "leads", "list"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("leads" as any)
        .select("id, salutation, first_name, last_name, company_name_text, email, phone, score, created_at, status:lead_statuses(name,color), source:picklist_values!leads_source_id_fkey(label)")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-muted-foreground text-sm">CRM · Leads</p>
        </div>
        <Button onClick={() => { setEditRow(null); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />New lead
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>All leads</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : error ? (
            <p className="text-destructive text-sm">Failed to load leads.</p>
          ) : !data || data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No leads yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((l: any) => (
                  <TableRow
                    key={l.id}
                    className="cursor-pointer"
                    onClick={() => { setEditRow(l); setCreateOpen(true); }}
                  >
                    <TableCell className="font-medium">{[l.first_name, l.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>{l.company_name_text ?? "—"}</TableCell>
                    <TableCell>{l.email ?? "—"}</TableCell>
                    <TableCell>{l.status?.name ?? "—"}</TableCell>
                    <TableCell>{l.score ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <LeadFormDialog open={createOpen} onOpenChange={setCreateOpen} row={editRow} />
    </div>
  );
}
