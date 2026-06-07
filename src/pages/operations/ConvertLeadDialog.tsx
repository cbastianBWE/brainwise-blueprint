import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
  leadIds?: string[];
  onConverted?: () => void;
};

const AUTO = "__auto__";
const DEFAULT_PIPE = "__default__";

export default function ConvertLeadDialog({ open, onOpenChange, leadId, leadIds, onConverted }: Props) {
  const navigate = useNavigate();
  const bulk = !!leadIds && leadIds.length > 0;

  const [createDeal, setCreateDeal] = useState(true);
  const [dealName, setDealName] = useState("");
  const [dealAmount, setDealAmount] = useState("");
  const [pipelineId, setPipelineId] = useState(DEFAULT_PIPE);
  const [accountId, setAccountId] = useState(AUTO);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCreateDeal(true); setDealName(""); setDealAmount("");
      setPipelineId(DEFAULT_PIPE); setAccountId(AUTO);
    }
  }, [open]);

  const pipelinesQ = useQuery({
    queryKey: ["ops", "pipelines", "select"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("pipelines" as any)
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const accountsQ = useQuery({
    queryKey: ["ops", "accounts", "select"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("accounts" as any)
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const submit = async () => {
    setSubmitting(true);
    try {
      const p_options: Record<string, unknown> = { create_deal: createDeal };
      if (accountId !== AUTO) p_options.account_id = accountId;
      if (createDeal) {
        if (pipelineId !== DEFAULT_PIPE) p_options.pipeline_id = pipelineId;
        if (dealName.trim()) p_options.deal_name = dealName.trim();
        if (dealAmount.trim()) p_options.deal_amount = Number(dealAmount);
      }

      if (bulk) {
        const { data, error } = await supabase.rpc("ops_bulk_convert_leads" as any, {
          p_lead_ids: leadIds,
          p_options,
        });
        if (error) throw error;
        const conv = (data as any)?.converted_count ?? 0;
        const errs = (data as any)?.error_count ?? 0;
        toast.success(`${conv} converted, ${errs} failed`);
        onConverted?.();
        onOpenChange(false);
      } else {
        if (!leadId) throw new Error("No lead provided");
        const { data, error } = await supabase.rpc("ops_convert_lead" as any, {
          p_lead_id: leadId,
          p_options,
        });
        if (error) throw error;
        toast.success("Lead converted");
        onConverted?.();
        onOpenChange(false);
        const d = data as any;
        if (d?.deal_id) navigate(`/operations/deals/${d.deal_id}`);
        else if (d?.account_id) navigate(`/operations/accounts/${d.account_id}`);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to convert");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{bulk ? `Convert ${leadIds!.length} leads` : "Convert lead"}</DialogTitle>
          <DialogDescription>
            {bulk
              ? "Bulk convert the selected leads."
              : "Convert this lead into an account, contact, and (optionally) a deal."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="create_deal">Create deal</Label>
            <Switch id="create_deal" checked={createDeal} onCheckedChange={setCreateDeal} />
          </div>

          {createDeal && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {!bulk && (
                <>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Deal name</Label>
                    <Input value={dealName} onChange={(e) => setDealName(e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={dealAmount} onChange={(e) => setDealAmount(e.target.value)} placeholder="Optional" />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Pipeline</Label>
                <Select value={pipelineId} onValueChange={setPipelineId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEFAULT_PIPE}>Default pipeline</SelectItem>
                    {(pipelinesQ.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Link to account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO}>Auto (match domain or create new)</SelectItem>
                {(accountsQ.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Converting…" : bulk ? `Convert ${leadIds!.length}` : "Convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
