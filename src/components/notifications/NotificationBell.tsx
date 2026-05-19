import { useState } from "react";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { NotificationDropdown } from "./NotificationDropdown";

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notif", "unreadCount"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_unread_notification_count");
      if (error) throw error;
      return typeof data === "number" ? data : 0;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const badge = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-white hover:bg-white/10 transition-colors"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center leading-none">
              {badge}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <NotificationDropdown open={open} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
