import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Plus } from "lucide-react";
import AccountFormDialog from "./AccountFormDialog";
import ContactCrmFormDialog from "./ContactCrmFormDialog";
import DealFormDialog from "./DealFormDialog";
import EntityTimeline from "./EntityTimeline";
import { formatMoney } from "./_shared";

export default function OperationsAccountDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);

  const accountQ = useQuery({
    queryKey: ["ops", "account", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("accounts" as any)
        .select("id, name, account_number, type, phone, website, domain, employee_count_band, revenue_band, description, customer_id, parent_account_id, owner:users(full_name), industry:picklist_values(label), parent:accounts!accounts_parent_account_id_fkey(name), customer:customers(display_name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const contactsQ = useQuery({
    queryKey: ["ops", "account", "contacts", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("contact_persons" as any)
        .select("id, first_name, last_name, email, title, is_primary")
        .eq("account_id", id)
        .order("last_name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const dealsQ = useQuery({
    queryKey: ["ops", "account", "deals", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("deals" as any)
        .select("id, name, amount, currency_code, stage:deal_stages(name)")
        .eq("account_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  if (accountQ.isLoading) return <div className="p-6 text-muted-foreground text-sm">Loading…</div>;
  const account = accountQ.data;
  if (!account) return <div className="p-6 text-muted-foreground text-sm">Account not found.</div>;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold">{account.name}</h1>
                {account.type && <Badge variant="secondary" className="capitalize">{account.type}</Badge>}
              </div>
              <div className="text-sm text-muted-foreground">
                {account.owner?.full_name && <>Owner: {account.owner.full_name}</>}
                {account.industry?.label && <> · {account.industry.label}</>}
                {account.account_number && <> · #{account.account_number}</>}
              </div>
              <div className="text-sm text-muted-foreground">
                {account.website ?? account.domain ?? "—"}
                {account.phone && <> · {account.phone}</>}
              </div>
              {account.parent_account_id && (
                <div className="text-sm">
                  <Link className="underline" to={`/operations/accounts/${account.parent_account_id}`}>
                    Parent: {account.parent?.name ?? "—"}
                  </Link>
                </div>
              )}
              {account.customer_id && (
                <div className="text-sm">
                  <Link className="underline" to={`/operations/customers/${account.customer_id}`}>
                    Linked customer: {account.customer?.display_name ?? "—"}
                  </Link>
                </div>
              )}
            </div>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent />
      </Card>

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contacts</CardTitle>
              <Button size="sm" onClick={() => setContactOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Add contact
              </Button>
            </CardHeader>
            <CardContent>
              {contactsQ.isLoading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : !contactsQ.data || contactsQ.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">No contacts yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contactsQ.data.map((c: any) => (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/operations/contacts/${c.id}`)}>
                        <TableCell className="font-medium">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                        <TableCell>{c.title ?? "—"}</TableCell>
                        <TableCell>{c.email ?? "—"}</TableCell>
                        <TableCell>{c.is_primary && <Badge>Primary</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Deals</CardTitle>
              <Button size="sm" onClick={() => setDealOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />New deal
              </Button>
            </CardHeader>
            <CardContent>
              {dealsQ.isLoading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : !dealsQ.data || dealsQ.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">No deals yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dealsQ.data.map((d: any) => (
                      <TableRow key={d.id} className="cursor-pointer" onClick={() => navigate(`/operations/deals/${d.id}`)}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell>{d.stage?.name ?? "—"}</TableCell>
                        <TableCell>{formatMoney(d.amount, d.currency_code)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <EntityTimeline entityType="account" entityId={id} />
        </TabsContent>
      </Tabs>

      <AccountFormDialog
        open={editOpen}
        onOpenChange={(o) => { setEditOpen(o); if (!o) qc.invalidateQueries({ queryKey: ["ops", "account", id] }); }}
        row={account}
      />
      <ContactCrmFormDialog
        open={contactOpen}
        onOpenChange={(o) => { setContactOpen(o); if (!o) qc.invalidateQueries({ queryKey: ["ops", "account", "contacts", id] }); }}
        row={null}
      />
      <DealFormDialog
        open={dealOpen}
        onOpenChange={(o) => { setDealOpen(o); if (!o) qc.invalidateQueries({ queryKey: ["ops", "account", "deals", id] }); }}
        row={null}
      />
    </div>
  );
}
