import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Copy, Trash2, Loader2 } from "lucide-react";

const INSTRUMENTS = [
  { id: "PTP",   uuid: "02618e9a-d411-44cf-b316-fe368edeac03", name: "Personal Threat Profile" },
  { id: "NAI",   uuid: "77d1290f-1daf-44e0-931f-b9b8ad185520", name: "Neuroscience Adoption Index" },
  { id: "AIRSA", uuid: "abb62120-8cc8-435f-babc-dd6a27fbc235", name: "AI Readiness Skills Assessment" },
  { id: "HSS",   uuid: "90216d9d-153c-4b7b-abe0-1d7845c9e6e0", name: "Habit Stabilization Scorecard" },
];

interface Props {
  coachUserId: string | null;
  onChanged: () => void;
}

interface PendingRow {
  id: string;
  client_email: string;
  client_first_name: string | null;
  client_last_name: string | null;
  instrument_id: string;
  instrument_short_id: string;
  instrument_name: string;
  invitation_status: string;
  invitation_source: string;
  stripe_payment_intent_id: string | null;
  payment_mode: "self_pay" | "coach_paid";
  created_at: string;
  expires_at: string | null;
}

const sourceLabel = (s: string) =>
  s === "bulk" ? "Bulk" : s === "shareable_link" ? "Shareable link" : "Single";

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export default function PendingInvitations({ coachUserId, onChanged }: Props) {
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<PendingRow | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchPending = useCallback(async () => {
    if (!coachUserId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const nowIso = new Date().toISOString();
    const { data, error } = await (supabase as any)
      .from("coach_clients")
      .select("id, client_email, client_first_name, client_last_name, instrument_id, invitation_status, invitation_source, stripe_payment_intent_id, created_at, expires_at, revoked_at")
      .eq("coach_user_id", coachUserId)
      .in("invitation_status", ["sent", "opened"])
      .is("revoked_at", null)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[PendingInvitations] fetch error:", error);
      setRows([]);
      setLoading(false);
      return;
    }

    const enriched: PendingRow[] = (data ?? []).map((r: any) => {
      const instMatch = INSTRUMENTS.find(i => i.uuid === r.instrument_id);
      return {
        id: r.id,
        client_email: r.client_email,
        client_first_name: r.client_first_name,
        client_last_name: r.client_last_name,
        instrument_id: r.instrument_id,
        instrument_short_id: instMatch?.id ?? "—",
        instrument_name: instMatch?.name ?? "Unknown",
        invitation_status: r.invitation_status,
        invitation_source: r.invitation_source ?? "single",
        stripe_payment_intent_id: r.stripe_payment_intent_id,
        payment_mode: r.stripe_payment_intent_id ? "coach_paid" : "self_pay",
        created_at: r.created_at,
        expires_at: r.expires_at,
      };
    });
    console.log("[PendingInvitations] loaded rows:", enriched.length);
    setRows(enriched);
    setLoading(false);
  }, [coachUserId]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const copyLink = (row: PendingRow) => {
    const url = `${window.location.origin}/signup?email=${encodeURIComponent(row.client_email)}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    console.log("[PendingInvitations] coach_invitation_revoke payload:", { coach_client_id: revokeTarget.id });
    const { data, error } = await supabase.functions.invoke("coach_invitation_revoke", {
      body: { coach_client_id: revokeTarget.id },
    });
    console.log("[PendingInvitations] coach_invitation_revoke response:", { data, error });
    setRevoking(false);
    if (error) {
      toast.error("Revoke failed: " + ((error as any).message ?? "Unknown error"));
      return;
    }
    const recalc = (data as any)?.coupon_recalc;
    const couponBlurb = recalc
      ? recalc.deleted
        ? "Coupon voided."
        : `Coupon recalculated to $${(recalc.new_total / 100).toFixed(2)}.`
      : "";
    toast.success("Invitation revoked." + (couponBlurb ? " " + couponBlurb : ""));
    setRevokeTarget(null);
    fetchPending();
    onChanged();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pending Invitations</CardTitle>
        <CardDescription>
          {loading ? "Loading..." : `${rows.length} pending invitation${rows.length === 1 ? "" : "s"}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No pending invitations.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => {
                  const fullName = [r.client_first_name, r.client_last_name].filter(Boolean).join(" ") || "—";
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="max-w-[12rem] truncate">{fullName}</TableCell>
                      <TableCell className="max-w-[14rem] truncate">{r.client_email}</TableCell>
                      <TableCell>
                        <span title={r.instrument_name}>{r.instrument_short_id}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.payment_mode === "coach_paid" ? "default" : "outline"}>
                          {r.payment_mode === "coach_paid" ? "Coach" : "Self"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.invitation_source === "shareable_link" ? "Link" : sourceLabel(r.invitation_source)}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{format(new Date(r.created_at), "MMM d")}</TableCell>
                      <TableCell className="text-xs">
                        {r.expires_at ? format(new Date(r.expires_at), "MMM d") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{cap(r.invitation_status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {r.invitation_source === "shareable_link" && (
                            <Button size="sm" variant="outline" onClick={() => copyLink(r)}>
                              <Copy className="h-3 w-3 mr-1" /> Copy link
                            </Button>
                          )}
                          <Button size="sm" variant="outline" disabled title="Coming soon">
                            Resend
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setRevokeTarget(r)}>
                            <Trash2 className="h-3 w-3 mr-1" /> Revoke
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog
        open={revokeTarget !== null}
        onOpenChange={(o) => { if (!o) setRevokeTarget(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke invitation</DialogTitle>
          </DialogHeader>
          {revokeTarget && (
            <div className="space-y-3 text-sm">
              <p>
                Revoke invitation for <strong>{revokeTarget.client_email}</strong>?
                The link will become unusable. If you paid for this assessment, your coupon will be voided.
              </p>
              <p className="text-xs text-muted-foreground">
                Note: If the recipient has already started signing up, they may still be able to create an account with this email. Revocation prevents the coach-client linkage from forming, not the signup itself.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRevoke} disabled={revoking}>
              {revoking ? "Revoking..." : "Confirm Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
