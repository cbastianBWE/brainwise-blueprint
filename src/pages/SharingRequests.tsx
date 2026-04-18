import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  requester:users!requester_user_id (id, full_name, email),
  target:users!target_user_id (id, full_name, email)
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
