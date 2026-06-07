import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pencil, ArrowRightLeft, MailCheck, Building2 } from "lucide-react";
import LeadFormDialog from "./LeadFormDialog";
import ConvertLeadDialog from "./ConvertLeadDialog";
import EntityTimeline from "./EntityTimeline";
import { formatDate } from "./_shared";

export default function OperationsLeadDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  const leadQ = useQuery({
    queryKey: ["ops", "lead", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("leads" as any)
        .select("id, salutation, first_name, last_name, company_name_text, title, email, phone, mobile, score, status_id, archived_at, converted_at, converted_account_id, converted_contact_id, converted_deal_id, status:lead_statuses(name,color), source:picklist_values!leads_source_id_fkey(label), industry:picklist_values!leads_industry_id_fkey(label)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  if (leadQ.isLoading) return <div className="p-6 text-muted-foreground text-sm">Loading…</div>;
  const lead = leadQ.data;
  if (!lead) return <div className="p-6 text-muted-foreground text-sm">Lead not found.</div>;

  const fullName = [lead.salutation, lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—";
  const converted = !!lead.converted_at;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold">{fullName}</h1>
                {lead.status?.name && <Badge variant="secondary">{lead.status.name}</Badge>}
                {converted && <Badge>Converted</Badge>}
              </div>
              <div className="text-sm text-muted-foreground">
                {lead.company_name_text ?? "—"}
                {lead.title && <> · {lead.title}</>}
                {lead.source?.label && <> · Source: {lead.source.label}</>}
                {lead.score != null && <> · Score: {lead.score}</>}
              </div>
              <div className="text-sm text-muted-foreground">
                {lead.email ?? "—"}{lead.phone && <> · {lead.phone}</>}{lead.mobile && <> · {lead.mobile}</>}
              </div>
              {converted && (
                <div className="text-sm">
                  {lead.converted_account_id && (
                    <Link className="underline mr-3" to={`/operations/accounts/${lead.converted_account_id}`}>View account</Link>
                  )}
                  {lead.converted_deal_id && (
                    <Link className="underline" to={`/operations/deals/${lead.converted_deal_id}`}>View deal</Link>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />Edit
              </Button>
              {!converted && (
                <Button onClick={() => setConvertOpen(true)}>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />Convert
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent />
      </Card>

      <EntityTimeline entityType="lead" entityId={id} />

      <LeadFormDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) qc.invalidateQueries({ queryKey: ["ops", "lead", id] });
        }}
        row={lead}
      />
      <ConvertLeadDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        leadId={id}
        onConverted={() => {
          qc.invalidateQueries({ queryKey: ["ops", "lead", id] });
          qc.invalidateQueries({ queryKey: ["ops", "leads", "list"] });
        }}
      />
    </div>
  );
}
