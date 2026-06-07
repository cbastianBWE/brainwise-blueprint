import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import ContactCrmFormDialog from "./ContactCrmFormDialog";
import EntityTimeline from "./EntityTimeline";
import { formatDate } from "./_shared";

export default function OperationsContactDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const contactQ = useQuery({
    queryKey: ["ops", "contact", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("contact_persons" as any)
        .select("id, salutation, first_name, last_name, email, phone, mobile, title, department, linkedin_url, twitter_handle, account_id, customer_id, is_primary, marketing_opt_out, marketing_opt_out_at, transactional_opt_out, transactional_opt_out_at, description, account:accounts!contact_persons_account_id_fkey(name), owner:users(full_name), customer:customers(display_name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  if (contactQ.isLoading) return <div className="p-6 text-muted-foreground text-sm">Loading…</div>;
  const c = contactQ.data;
  if (!c) return <div className="p-6 text-muted-foreground text-sm">Contact not found.</div>;

  const fullName = [c.salutation, c.first_name, c.last_name].filter(Boolean).join(" ") || "—";

  const toggleConsent = async (field: "marketing_opt_out" | "transactional_opt_out", value: boolean) => {
    const tsField = `${field}_at`;
    const { error } = await opsSupabase
      .from("contact_persons" as any)
      .update({ [field]: value, [tsField]: value ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["ops", "contact", id] });
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold">{fullName}</h1>
                {c.is_primary && <Badge>Primary</Badge>}
              </div>
              <div className="text-sm text-muted-foreground">
                {c.title ?? "—"}{c.department && <> · {c.department}</>}
              </div>
              {c.account_id && (
                <div className="text-sm">
                  <Link className="underline" to={`/operations/accounts/${c.account_id}`}>
                    {c.account?.name ?? "Account"}
                  </Link>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {c.email ?? "—"}
                {c.phone && <> · {c.phone}</>}
                {c.mobile && <> · {c.mobile}</>}
              </div>
              {c.owner?.full_name && <div className="text-sm text-muted-foreground">Owner: {c.owner.full_name}</div>}
              {c.customer_id && (
                <div className="text-sm">
                  <Link className="underline" to={`/operations/customers/${c.customer_id}`}>
                    Linked customer: {c.customer?.display_name ?? "—"}
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

      <Card>
        <CardHeader><CardTitle>Consent</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Marketing opt-out</Label>
              {c.marketing_opt_out_at && (
                <p className="text-xs text-muted-foreground">Since {formatDate(c.marketing_opt_out_at)}</p>
              )}
            </div>
            <Switch
              checked={!!c.marketing_opt_out}
              onCheckedChange={(v) => toggleConsent("marketing_opt_out", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Transactional opt-out</Label>
              {c.transactional_opt_out_at && (
                <p className="text-xs text-muted-foreground">Since {formatDate(c.transactional_opt_out_at)}</p>
              )}
            </div>
            <Switch
              checked={!!c.transactional_opt_out}
              onCheckedChange={(v) => toggleConsent("transactional_opt_out", v)}
            />
          </div>
        </CardContent>
      </Card>

      <EntityTimeline entityType="contact" entityId={id} defaultEmail={c.email ?? undefined} />

      <ContactCrmFormDialog
        open={editOpen}
        onOpenChange={(o) => { setEditOpen(o); if (!o) qc.invalidateQueries({ queryKey: ["ops", "contact", id] }); }}
        row={c}
      />
    </div>
  );
}
