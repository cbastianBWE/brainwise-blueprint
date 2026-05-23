import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { NotificationRow, GetUserNotificationsResult } from "@/types/notifications";

interface Props {
  open: boolean;
  onClose: () => void;
}

function safeInternalPath(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return null;
  }
}

export function NotificationDropdown({ open, onClose }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const unreadSnapshot = useRef<Set<string>>(new Set());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["notif", "dropdown"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_notifications", {
        p_limit: 10,
        p_before: undefined,
        p_filter: "all",
      });
      if (error) throw error;
      const result = (data ?? {}) as unknown as GetUserNotificationsResult;
      return (result.items ?? []) as NotificationRow[];
    },
    enabled: open,
    staleTime: 0,
  });

  // Snapshot unread ids on first payload after opening, mark them read once.
  useEffect(() => {
    if (!open || !data) return;
    if (unreadSnapshot.current.size > 0) return;
    const unread = data.filter((n) => !n.read_at).map((n) => n.id);
    if (unread.length === 0) return;
    unread.forEach((id) => unreadSnapshot.current.add(id));
    (async () => {
      const { error } = await supabase.rpc("mark_notifications_read", { p_ids: unread });
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["notif", "unreadCount"] });
        queryClient.invalidateQueries({ queryKey: ["notif", "list"] });
      }
    })();
  }, [open, data, queryClient]);

  // Reset snapshot when dropdown closes
  useEffect(() => {
    if (!open) unreadSnapshot.current = new Set();
  }, [open]);

  const handleRowClick = (n: NotificationRow) => {
    const path = safeInternalPath(n.action_url);
    if (path) {
      onClose();
      navigate(path);
    }
  };

  const handleMarkAllRead = async () => {
    const { error } = await supabase.rpc("mark_all_notifications_read");
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["notif", "unreadCount"] });
      queryClient.invalidateQueries({ queryKey: ["notif", "dropdown"] });
      queryClient.invalidateQueries({ queryKey: ["notif", "list"] });
    }
  };

  return (
    <div className="flex flex-col max-h-[480px]">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Notifications</h3>
        <button
          type="button"
          onClick={handleMarkAllRead}
          aria-label="Mark all notifications as read"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Mark all read
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {isError && (
          <div className="px-4 py-6 text-center text-sm">
            <p className="text-muted-foreground mb-2">Couldn't load notifications.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        )}
        {!isLoading && !isError && data && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">You're all caught up</p>
          </div>
        )}
        {!isLoading && !isError && data && data.map((n) => {
          const wasUnread = unreadSnapshot.current.has(n.id) || !n.read_at;
          const path = safeInternalPath(n.action_url);
          const clickable = !!path;
          return (
            <div
              key={n.id}
              onClick={() => handleRowClick(n)}
              className={`px-4 py-3 border-b last:border-b-0 flex gap-3 ${
                clickable ? "cursor-pointer hover:bg-accent" : ""
              } ${wasUnread ? "bg-primary/5" : ""}`}
            >
              <div className="pt-1.5">
                <span
                  className={`block h-2 w-2 rounded-full ${
                    wasUnread ? "bg-primary" : "bg-transparent"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{n.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t px-4 py-2 text-center">
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => {
            onClose();
            navigate("/notifications");
          }}
        >
          View all
        </button>
      </div>
    </div>
  );
}
