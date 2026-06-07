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
import AccountFormDialog from "./AccountFormDialog";
import SavedViewsBar from "./SavedViewsBar";

type Filters = { search?: string; type?: string };

const TYPES = ["customer", "prospect", "partner", "vendor", "reseller"];

export default function OperationsAccounts() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["ops", "accounts", "list", filters],
    queryFn: async () => {
      let q = opsSupabase
        .from("accounts" as any)
        .select("id, name, type, domain, website, created_at");
      if (filters.search) {
        const s = filters.search.replace(/[,()]/g, "");
        q = q.or(`name.ilike.%${s}%,domain.ilike.%${s}%`);
      }
      if (filters.type) q = q.eq("type", filters.type);
      q = q.order("name");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Accounts</h1>
          <p className="text-muted-foreground text-sm">CRM · Accounts</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />New account
        </Button>
      </div>

      <SavedViewsBar entityType="account" filters={filters} onApply={(f) => setFilters(f as Filters)} />

      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search name, domain…"
          className="w-[260px]"
          value={filters.search ?? ""}
          onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
        />
        <Select
          value={filters.type ?? "all"}
          onValueChange={(v) => setFilters({ ...filters, type: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>All accounts</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : error ? (
            <p className="text-destructive text-sm">Failed to load accounts.</p>
          ) : !data || data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No accounts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Domain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((a: any) => (
                  <TableRow
                    key={a.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/operations/accounts/${a.id}`)}
                  >
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="capitalize">{a.type ?? "—"}</TableCell>
                    <TableCell>{a.domain ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <AccountFormDialog open={createOpen} onOpenChange={setCreateOpen} row={null} />
    </div>
  );
}
