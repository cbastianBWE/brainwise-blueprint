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
import { Pencil, ArrowRightLeft, MailCheck, Building2, RefreshCw } from "lucide-react";
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
        .select("id, salutation, first_name, last_name, company_name_text, title, email, phone, mobile, score, status_id, archived_at, converted_at, converted_account_id, converted_contact_id, converted_deal_id, website, source_webhook_id, enrichment_data, last_enriched_at, status:lead_statuses(name,color), source:picklist_values!leads_source_id_fkey(label), industry:picklist_values!leads_industry_id_fkey(label)")
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
                {lead.source_webhook_id && (
                  <Badge variant="outline" className="ml-2">Captured via web form</Badge>
                )}
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

      <ScoreCard leadId={id} score={lead.score} />

      <EntityTimeline entityType="lead" entityId={id} />

      <EnrichmentCard
        leadId={id}
        email={lead.email}
        website={lead.website}
        enrichmentData={lead.enrichment_data}
        lastEnrichedAt={lead.last_enriched_at}
      />

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

type EnrichmentLogRow = {
  id: string;
  provider: string | null;
  enrichment_kind: string | null;
  status: string | null;
  error_detail: string | null;
  result: any;
  enqueued_at: string | null;
  processed_at: string | null;
};

function statusVariant(s: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (!s) return "secondary";
  const v = s.toLowerCase();
  if (v === "success" || v === "completed" || v === "ok") return "default";
  if (v === "error" || v === "failed") return "destructive";
  if (v === "queued" || v === "pending" || v === "processing") return "outline";
  return "secondary";
}

function EnrichmentCard({
  leadId,
  email,
  website,
  enrichmentData,
  lastEnrichedAt,
}: {
  leadId: string;
  email: string | null | undefined;
  website: string | null | undefined;
  enrichmentData: any;
  lastEnrichedAt: string | null | undefined;
}) {
  const qc = useQueryClient();
  const queryKey = ["ops", "lead-enrichment", leadId] as const;

  const logQ = useQuery({
    queryKey,
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("enrichment_log" as any)
        .select("id, provider, enrichment_kind, status, error_detail, result, enqueued_at, processed_at")
        .eq("lead_id", leadId)
        .order("enqueued_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EnrichmentLogRow[];
    },
  });

  const enqueue = async (provider: string, kind: string) => {
    const { error } = await supabase.rpc("ops_enqueue_enrichment" as any, {
      p_lead: leadId,
      p_provider: provider,
      p_kind: kind,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Queued — results appear within a few minutes");
    qc.invalidateQueries({ queryKey });
  };

  const hasEnrichment = enrichmentData && typeof enrichmentData === "object" && Object.keys(enrichmentData).length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle>Enrichment</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!email}
              onClick={() => enqueue("hunter", "email_verify")}
            >
              <MailCheck className="h-4 w-4 mr-2" />Verify email
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!email && !website}
              onClick={() => enqueue("apollo", "organization")}
            >
              <Building2 className="h-4 w-4 mr-2" />Enrich company
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasEnrichment && (
          <div className="space-y-2">
            <div className="text-sm font-medium">
              Merged data
              {lastEnrichedAt && (
                <span className="ml-2 text-muted-foreground font-normal">
                  · Last enriched {formatDate(lastEnrichedAt)}
                </span>
              )}
            </div>
            <pre className="text-xs bg-muted p-3 rounded max-h-64 overflow-auto">
              {JSON.stringify(enrichmentData, null, 2)}
            </pre>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-medium">Activity</div>
          {logQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !logQ.data || logQ.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No enrichment requests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logQ.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.provider ?? "—"}</TableCell>
                    <TableCell>{r.enrichment_kind ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status ?? "—"}</Badge>
                      {r.error_detail && (
                        <span className="ml-2 text-xs text-destructive">{r.error_detail}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(r.processed_at ?? r.enqueued_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreCard({ leadId, score }: { leadId: string; score: number | null | undefined }) {
  const qc = useQueryClient();
  const eventsKey = ["ops", "lead-score-events", leadId] as const;
  const [recomputing, setRecomputing] = useState(false);

  const eventsQ = useQuery({
    queryKey: eventsKey,
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("lead_score_events" as any)
        .select("id, score_before, score_after, score_delta, reason_text, event_at")
        .eq("lead_id", leadId)
        .order("event_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const recompute = async () => {
    setRecomputing(true);
    try {
      const { error } = await supabase.rpc("ops_recompute_lead_score" as any, { p_lead_id: leadId });
      if (error) { toast.error(error.message); return; }
      toast.success("Score recomputed");
      qc.invalidateQueries({ queryKey: ["ops", "lead", leadId] });
      qc.invalidateQueries({ queryKey: eventsKey });
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle>Lead score</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold tabular-nums">{score ?? 0}</span>
            <Button size="sm" variant="outline" disabled={recomputing} onClick={recompute}>
              <RefreshCw className="h-4 w-4 mr-2" />{recomputing ? "Recomputing…" : "Recompute"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm font-medium mb-2">History</div>
        {eventsQ.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : !eventsQ.data || eventsQ.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">No score changes recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventsQ.data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">{formatDate(e.event_at)}</TableCell>
                  <TableCell className={e.score_delta >= 0 ? "text-emerald-600" : "text-destructive"}>
                    {e.score_delta >= 0 ? `+${e.score_delta}` : e.score_delta}
                  </TableCell>
                  <TableCell className="tabular-nums">{e.score_before} → {e.score_after}</TableCell>
                  <TableCell>{e.reason_text ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
