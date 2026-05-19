import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Archive, Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { NotificationRow, NotificationFilter } from "@/types/notifications";

const PAGE_SIZE = 20;

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

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [pages, setPages] = useState<NotificationRow[][]>([]);
  const [reachedEnd, setReachedEnd] = useState(false);

  const before = useMemo(() => {
    const flat = pages.flat();
    return flat.length > 0 ? flat[flat.length - 1].created_at : undefined;
  }, [pages]);

  const { isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["notif", "list", filter, pages.length],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_notifications", {
        p_limit: PAGE_SIZE,
        p_before: before,
        p_filter: filter,
      });
      if (error) throw error;
      const rows = (data ?? []) as unknown as NotificationRow[];
      setPages((prev) => {
        const next = [...prev];
        next[next.length === 0 ? 0 : next.length - 1] = rows;
        // ensure last index aligns with pages.length used as a key
        if (next.length < pages.length + 1) next.push(rows);
        return next;
      });
      if (rows.length < PAGE_SIZE) setReachedEnd(true);
      return rows;
    },
  });

  const items = pages.flat();

  const changeFilter = (f: NotificationFilter) => {
    setFilter(f);
    setPages([]);
    setReachedEnd(false);
  };

  const loadMore = () => {
    if (reachedEnd || isFetching) return;
    setPages((prev) => [...prev, []]);
  };

  const handleArchive = async (id: string) => {
    const { error } = await supabase.rpc("archive_notification", { p_id: id });
    if (error) {
      toast.error("Couldn't archive");
      return;
    }
    setPages([]);
    setReachedEnd(false);
    queryClient.invalidateQueries({ queryKey: ["notif", "unreadCount"] });
    queryClient.invalidateQueries({ queryKey: ["notif", "dropdown"] });
    refetch();
  };

  const handleMarkAllRead = async () => {
    const { error } = await supabase.rpc("mark_all_notifications_read");
    if (error) {
      toast.error("Couldn't mark all read");
      return;
    }
    setPages([]);
    setReachedEnd(false);
    queryClient.invalidateQueries({ queryKey: ["notif", "unreadCount"] });
    queryClient.invalidateQueries({ queryKey: ["notif", "dropdown"] });
    refetch();
  };

  const handleRowClick = (n: NotificationRow) => {
    const path = safeInternalPath(n.action_url);
    if (path) navigate(path);
  };

  const emptyCopy = {
    all: "No notifications",
    unread: "Nothing unread",
    archived: "Nothing archived",
  }[filter];

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
          Mark all read
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => changeFilter(v as NotificationFilter)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && items.length === 0 && (
        <Card className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </Card>
      )}

      {isError && (
        <Card className="p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Couldn't load notifications.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
        </Card>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <Card className="p-10 flex flex-col items-center text-muted-foreground">
          <Bell className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">{emptyCopy}</p>
        </Card>
      )}

      {items.length > 0 && (
        <Card className="divide-y">
          {items.map((n) => {
            const path = safeInternalPath(n.action_url);
            const clickable = !!path;
            return (
              <div
                key={n.id}
                onClick={() => handleRowClick(n)}
                className={`flex gap-3 p-4 ${
                  clickable ? "cursor-pointer hover:bg-accent" : ""
                } ${!n.read_at ? "bg-primary/5" : ""}`}
              >
                <div className="pt-1.5">
                  <span
                    className={`block h-2 w-2 rounded-full ${
                      !n.read_at ? "bg-primary" : "bg-transparent"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {filter !== "archived" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="self-start"
                    aria-label="Archive notification"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchive(n.id);
                    }}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {!reachedEnd && items.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
