import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import ContactCrmFormDialog from "./ContactCrmFormDialog";
import SavedViewsBar from "./SavedViewsBar";

type Filters = { search?: string; account_id?: string };

export default function OperationsContacts() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({});

  const { data: accounts = [] } = useQuery({
    queryKey: ["ops", "accounts", "options"],
    queryFn: async () => {
      const { data, error } = await opsSupabase.from("accounts" as any).select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["ops", "contacts", "list", filters],
    queryFn: async () => {
      let q = opsSupabase
        .from("contact_persons" as any)
        .select("id, first_name, last_name, email, title, account_id, account:accounts!contact_persons_account_id_fkey(name)");
      if (filters.search) {
        const s = filters.search.replace(/[,()]/g, "");
        q = q.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`);
      }
      if (filters.account_id) q = q.eq("account_id", filters.account_id);
      q = q.order("last_name");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="text-muted-foreground text-sm">CRM · Contacts</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />New contact
        </Button>
      </div>

      <SavedViewsBar entityType="contact" filters={filters} onApply={(f) => setFilters(f as Filters)} />

      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search name, email…"
          className="w-[260px]"
          value={filters.search ?? ""}
          onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
        />
        <Select
          value={filters.account_id ?? "all"}
          onValueChange={(v) => setFilters({ ...filters, account_id: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Account" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accounts.map((a: any) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>All contacts</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : error ? (
            <p className="text-destructive text-sm">Failed to load contacts.</p>
          ) : !data || data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No contacts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c: any) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/operations/contacts/${c.id}`)}
                  >
                    <TableCell className="font-medium">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>{c.title ?? "—"}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>{c.account?.name ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <ContactCrmFormDialog open={createOpen} onOpenChange={setCreateOpen} row={null} />
    </div>
  );
}
