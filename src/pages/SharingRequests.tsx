import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface UserMini {
  id: string;
  full_name: string | null;
  email: string;
}

interface PeerRequest {
  id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  expires_at: string;
  requester: UserMini | null;
  target: UserMini | null;
}

const SELECT_FIELDS = `
  id, status, created_at, responded_at, expires_at,
  requester:org_users_public!requester_user_id (id, full_name, email),
  target:org_users_public!target_user_id (id, full_name, email)
`;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const yr = Math.floor(mo / 12);
  return `${yr} year${yr === 1 ? "" : "s"} ago`;
}

export default function SharingRequests() {
  const { user } = useAuth();
  const [received, setReceived] = useState<PeerRequest[]>([]);
  const [sent, setSent] = useState<PeerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [orgUsers, setOrgUsers] = useState<Array<{ id: string; email: string; full_name: string | null }>>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [sending, setSending] = useState(false);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: rec }, { data: snt }] = await Promise.all([
      (supabase as any)
        .from("peer_access_requests")
        .select(SELECT_FIELDS)
        .eq("target_user_id", user.id)
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("peer_access_requests")
        .select(SELECT_FIELDS)
        .eq("requester_user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    setReceived((rec as PeerRequest[]) || []);
    setSent((snt as PeerRequest[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Caller's own row is in org_users_public (same-org peer read covers self via existing "users: read own row" policy combined).
      // Fetch the caller's organization_id first.
      const { data: me } = await (supabase as any)
        .from("org_users_public")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      if (!me?.organization_id) return;

      const { data } = await (supabase as any)
        .from("org_users_public")
        .select("id, email, full_name")
        .eq("organization_id", me.organization_id)
        .is("deactivated_at", null)
        .neq("id", user.id)
        .order("email", { ascending: true });

      setOrgUsers((data as Array<{ id: string; email: string; full_name: string | null }>) || []);
    })();
  }, [user]);

  const handleSendRequest = async () => {
    if (!selectedTargetId) return;
    setSending(true);

    const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
      "peer_access_request_create",
      { p_target_user_id: selectedTargetId }
    );

    if (rpcError) {
      setSending(false);
      const code = (rpcError as any).code;
      if (code === "23505") {
        toast.error("You already have a pending request to this person.");
      } else if (code === "42501") {
        toast.error("You don't have permission to request access from this user.");
      } else if (code === "22023") {
        toast.error(rpcError.message || "Invalid request.");
      } else {
        toast.error("Could not send request. Please try again.");
      }
      return;
    }

    const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (!row) {
      setSending(false);
      toast.error("Unexpected response from server.");
      return;
    }

    const targetEmail = row.out_target_email as string;
    const targetName = (row.out_target_full_name as string | null) || targetEmail;
    const requesterName = (row.out_requester_full_name as string | null) || "A BrainWise user";
    const actionToken = row.out_action_token as string;
    const expiresAt = new Date(row.out_expires_at as string);
    const expiresLabel = expiresAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const baseUrl = "https://svprhtzawnbzmumxnhsq.supabase.co/functions/v1/peer-access-respond";
    const acceptUrl = `${baseUrl}?token=${encodeURIComponent(actionToken)}&action=accept`;
    const declineUrl = `${baseUrl}?token=${encodeURIComponent(actionToken)}&action=decline`;

    const subject = `${requesterName} is requesting access to your PTP results`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F9F7F1;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F7F1;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#021F36;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-family:'Poppins','Helvetica Neue',Arial,sans-serif;font-weight:800;letter-spacing:-0.01em;">BrainWise Enterprises</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-size:20px;color:#021F36;margin:0 0 16px;font-family:'Poppins','Helvetica Neue',Arial,sans-serif;font-weight:700;letter-spacing:-0.01em;">Peer access request</h2>
          <p style="font-size:15px;color:#021F36;line-height:1.6;margin:0 0 16px;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;font-weight:600;">Hi ${targetName},</p>
          <p style="font-size:15px;color:#4B4751;line-height:1.6;margin:0 0 16px;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">
            ${requesterName} is requesting access to view your PTP assessment results.
          </p>
          <p style="font-size:15px;color:#4B4751;line-height:1.6;margin:0 0 8px;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">
            You can accept or decline this request below. If you prefer to review your sharing settings instead, you can do that from inside BrainWise at any time.
          </p>
          <p style="font-size:14px;color:#6D6875;line-height:1.6;margin:0 0 28px;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">
            This request expires on ${expiresLabel}.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;"><tr>
            <td style="background:#F5741A;border-radius:999px;padding:14px 28px;">
              <a href="${acceptUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">Accept</a>
            </td>
            <td style="width:12px;">&nbsp;</td>
            <td style="background:#ffffff;border:1.5px solid #021F36;border-radius:999px;padding:10.5px 22.5px;">
              <a href="${declineUrl}" style="color:#021F36;text-decoration:none;font-size:15px;font-weight:600;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">Decline</a>
            </td>
          </tr></table>
          <p style="font-size:13px;color:#6D6875;line-height:1.5;margin:0;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">
            If you weren't expecting this request, you can safely ignore this email — no access will be granted.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #EDEAE0;text-align:center;">
          <p style="font-size:12px;color:#6D6875;margin:0;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;">© ${new Date().getFullYear()} BrainWise Enterprises. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    let emailOk = false;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            to: targetEmail,
            subject,
            html,
          }),
        }
      );
      emailOk = response.ok;
    } catch {
      emailOk = false;
    }

    setSending(false);
    setSelectedTargetId("");

    if (emailOk) {
      toast.success(`Request sent to ${targetName}.`);
    } else {
      toast.success(`Request created for ${targetName}, but the email could not be sent. They'll still see it in their inbox when they log in.`);
    }

    await loadAll();
  };

  const handleRespond = async (requestId: string, accept: boolean) => {
    setActing(requestId);
    const { error } = await (supabase as any).rpc("peer_access_request_respond", {
      p_request_id: requestId,
      p_accept: accept,
    });
    setActing(null);
    if (error) {
      toast.error("Failed to respond to request");
      return;
    }
    toast.success(accept ? "Request accepted" : "Request declined");
    await loadAll();
  };

  const renderReceivedStatus = (status: string) => {
    if (status === "pending") return <Badge variant="secondary">Pending</Badge>;
    if (status === "accepted") return <Badge>Accepted</Badge>;
    if (status === "declined") return <Badge variant="outline">Declined</Badge>;
    if (status === "expired") return <Badge variant="outline">Expired</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const renderSentStatus = (status: string) => {
    if (status === "accepted") return <Badge>Accepted</Badge>;
    return <Badge variant="secondary">No response</Badge>;
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Peer Access Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage incoming and outgoing PTP access requests within your organization.
        </p>
      </div>

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">Received</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-3 mt-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : received.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No requests yet.</CardContent></Card>
          ) : (
            received.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {r.requester?.full_name || r.requester?.email || "Unknown"}
                    </p>
                    {r.requester?.full_name && (
                      <p className="text-sm text-muted-foreground truncate">{r.requester.email}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{relativeTime(r.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.status === "pending" ? (
                      <>
                        <Button size="sm" onClick={() => handleRespond(r.id, true)} disabled={acting === r.id}>
                          {acting === r.id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRespond(r.id, false)} disabled={acting === r.id}>
                          Decline
                        </Button>
                      </>
                    ) : (
                      renderReceivedStatus(r.status)
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-3 mt-4">
          <Card>
            <CardContent className="py-4 space-y-3">
              <Label className="text-sm font-medium">Send a new request</Label>
              <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a colleague" />
                </SelectTrigger>
                <SelectContent>
                  {orgUsers.length === 0 ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground">No colleagues available.</div>
                  ) : (
                    orgUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <div className="flex justify-end">
                <Button onClick={handleSendRequest} disabled={!selectedTargetId || sending}>
                  {sending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Send Request
                </Button>
              </div>
            </CardContent>
          </Card>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : sent.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No requests yet.</CardContent></Card>
          ) : (
            sent.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {r.target?.full_name || r.target?.email || "Unknown"}
                    </p>
                    {r.target?.full_name && (
                      <p className="text-sm text-muted-foreground truncate">{r.target.email}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{relativeTime(r.created_at)}</p>
                  </div>
                  <div className="shrink-0">{renderSentStatus(r.status)}</div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
