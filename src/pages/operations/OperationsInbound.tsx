import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Link2, Copy } from "lucide-react";
import { formatDate } from "./_shared";

type Row = {
  id: string;
  received_at: string | null;
  from_address: string | null;
  subject: string | null;
  match_status: string | null;
  matched_contact_id: string | null;
  matched_contact: { first_name: string | null; last_name: string | null } | null;
};

type Contact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export default function OperationsInbound() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "matched" | "unmatched">("all");
  const [linkRow, setLinkRow] = useState<Row | null>(null);
  const [term, setTerm] = useState("");

  const addrQ = useQuery({
    queryKey: ["ops", "inboxAddress"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ops_get_my_inbox_address" as any);
      if (error) throw error;
      return data as any;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["ops", "inboundIngestion"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("email_inbound_ingestion" as any)
        .select("id,received_at,from_address,subject,match_status,matched_contact_id,matched_contact:contact_persons(first_name,last_name)")
        .order("received_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const rows = useMemo(() => {
    const list = data ?? [];
    if (filter === "all") return list;
    return list.filter((r) => r.match_status === filter);
  }, [data, filter]);

  const { data: contacts } = useQuery({
    queryKey: ["ops", "inboundContactSearch", term],
    enabled: !!linkRow && term.trim().length >= 2,
    queryFn: async () => {
      const t = term.trim();
      const { data, error } = await opsSupabase
        .from("contact_persons" as any)
        .select("id,first_name,last_name,email")
        .or(`first_name.ilike.%${t}%,last_name.ilike.%${t}%,email.ilike.%${t}%`)
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as Contact[];
    },
  });

  const address = (addrQ.data as any)?.address ?? (typeof addrQ.data === "string" ? addrQ.data : null);

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    toast.success("Copied");
  };

  const handleLink = async (contact: Contact) => {
    if (!linkRow) return;
    const { error } = await supabase.rpc("ops_crm_email_link_inbound" as any, {
      p_ingestion_id: linkRow.id,
      p_entity_type: "contact",
      p_entity_id: contact.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Linked");
    qc.invalidateQueries({ queryKey: ["ops", "inboundIngestion"] });
    setLinkRow(null); setTerm("");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inbound</h1>
        <p className="text-muted-foreground text-sm">CRM · Inbound email inbox</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Forwarding address</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {addrQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : address ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{address}</span>
              <Button size="icon" variant="ghost" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No address available.</p>
          )}
          <p className="text-muted-foreground text-xs">
            BCC or forward emails to this address to log them in the CRM.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Inbound messages</CardTitle>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unmatched">Unmatched</SelectItem>
              <SelectItem value="matched">Matched</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No inbound messages.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked to</TableHead>
                  <TableHead className="w-40 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const linked = r.matched_contact
                    ? `${r.matched_contact.first_name ?? ""} ${r.matched_contact.last_name ?? ""}`.trim() || "—"
                    : "—";
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.received_at ? formatDate(r.received_at) : "—"}</TableCell>
                      <TableCell>{r.from_address ?? "—"}</TableCell>
                      <TableCell>{r.subject ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={r.match_status === "matched" ? "default" : "secondary"}>
                          {r.match_status === "matched" ? "Matched" : "Unmatched"}
                        </Badge>
                      </TableCell>
                      <TableCell>{linked}</TableCell>
                      <TableCell className="text-right">
                        {r.match_status === "unmatched" && (
                          <Button size="sm" variant="outline" onClick={() => { setLinkRow(r); setTerm(""); }}>
                            <Link2 className="h-4 w-4 mr-2" />Link to contact
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!linkRow} onOpenChange={(o) => { if (!o) { setLinkRow(null); setTerm(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Search contacts</Label>
              <Input
                placeholder="Name or email…"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                autoFocus
              />
            </div>
            <div className="border rounded divide-y max-h-72 overflow-auto">
              {term.trim().length < 2 ? (
                <p className="text-muted-foreground text-sm p-3">Type at least 2 characters.</p>
              ) : !contacts || contacts.length === 0 ? (
                <p className="text-muted-foreground text-sm p-3">No matches.</p>
              ) : (
                contacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleLink(c)}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                  >
                    <div className="font-medium">
                      {`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "(no name)"}
                    </div>
                    <div className="text-muted-foreground text-xs">{c.email ?? "—"}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
