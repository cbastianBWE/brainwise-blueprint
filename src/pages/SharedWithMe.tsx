import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MyResults from "@/pages/MyResults";
import { Button } from "@/components/ui/button";
import { Inbox, MessageSquare } from "lucide-react";

interface SharedWithMeEntry {
  share_id: string;
  owner_user_id: string;
  owner_name: string | null;
  shared_at: string;
}

export default function SharedWithMe() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<SharedWithMeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("list_ptp_shared_with_me");
      if (error) {
        console.error("list_ptp_shared_with_me error:", error);
        setEntries([]);
      } else {
        setEntries((data?.shared_with_me as SharedWithMeEntry[]) ?? []);
      }
      setLoading(false);
    })();
  }, [user]);

  const selectedEntry = entries.find((e) => e.owner_user_id === selectedOwnerId) || null;

  return (
    <div className="flex h-full min-h-screen">
      <aside className="w-72 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Shared With Me</h2>
          <p className="text-xs text-muted-foreground mt-1">
            PTP results other people have shared with you
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <p className="text-sm text-muted-foreground p-2">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">
              No one has shared their PTP results with you yet.
            </p>
          ) : (
            entries.map((e) => (
              <button
                key={e.share_id}
                onClick={() => setSelectedOwnerId(e.owner_user_id)}
                className={`w-full text-left p-3 rounded-md transition-colors ${
                  selectedOwnerId === e.owner_user_id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <p className="font-medium text-sm">{e.owner_name || "A BrainWise user"}</p>
                <p className={`text-xs mt-1 ${selectedOwnerId === e.owner_user_id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  Shared {new Date(e.shared_at).toLocaleDateString()}
                </p>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {selectedOwnerId ? (
          <MyResults key={selectedOwnerId} targetUserId={selectedOwnerId} isCoachView viewLabel={selectedEntry?.owner_name || "Shared user"} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Select a person on the left to view their PTP results</p>
            <p className="text-sm text-muted-foreground mt-2">
              Only people who have shared their results with you appear here
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
