import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import ItemFormDialog, { type ItemRecord } from "./ItemFormDialog";

type StatusFilter = "all" | "active" | "inactive";

const formatPrice = (v: number | null | undefined) => {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(v);
};

export default function OperationsItems() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ItemRecord | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["ops", "items", "list"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("items")
        .select("id, name, sku, type, default_selling_price, default_cost_price, status, description, stripe_tax_code")
        .order("name");
      if (error) throw error;
      return (data ?? []) as ItemRecord[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((i) => {
      if (statusFilter !== "all" && (i.status ?? "active") !== statusFilter) return false;
      if (q.length === 0) return true;
      const name = (i.name ?? "").toLowerCase();
      const sku = (i.sku ?? "").toLowerCase();
      return name.includes(q) || sku.includes(q);
    });
  }, [data, search, statusFilter]);

  const openCreate = () => {
    setEditItem(null);
    setDialogOpen(true);
  };
  const openEdit = (item: ItemRecord) => {
    setEditItem(item);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Items</h1>
          <p className="text-muted-foreground text-sm">Operations · Product & service catalog</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/operations/import?entity=items")}>
            Import CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New item
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>All items</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search by name or SKU"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : error ? (
            <p className="text-destructive text-sm">Failed to load items.</p>
          ) : !data || data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No items yet.</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">No items match the current filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Selling price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((i) => (
                  <TableRow
                    key={i.id}
                    onClick={() => openEdit(i)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell>{i.sku ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {i.type ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatPrice(i.default_selling_price)}</TableCell>
                    <TableCell>
                      <Badge variant={(i.status ?? "active") === "active" ? "default" : "secondary"} className="capitalize">
                        {i.status ?? "—"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <ItemFormDialog open={dialogOpen} onOpenChange={setDialogOpen} item={editItem} />
    </div>
  );
}
