import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { NotificationChannel, NotificationPreferenceRow, GetNotificationPreferencesResult } from "@/types/notifications";

const CHANNEL_OPTIONS: { value: NotificationChannel; label: string }[] = [
  { value: "both", label: "Both (email + in-app)" },
  { value: "email", label: "Email only" },
  { value: "in_app", label: "In-app only" },
  { value: "none", label: "Off" },
];

const PREFS_KEY = ["notif", "prefs"] as const;

export default function NotificationSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: PREFS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_notification_preferences");
      if (error) throw error;
      const result = (data ?? {}) as unknown as GetNotificationPreferencesResult;
      return (result.preferences ?? []) as NotificationPreferenceRow[];
    },
  });

  const grouped = useMemo(() => {
    if (!data) return [] as { category: string; rows: NotificationPreferenceRow[] }[];
    const map = new Map<string, NotificationPreferenceRow[]>();
    for (const row of data) {
      const cat = row.category ?? "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(row);
    }
    return Array.from(map.entries()).map(([category, rows]) => ({ category, rows }));
  }, [data]);

  const handleChange = async (row: NotificationPreferenceRow, next: NotificationChannel) => {
    const previous = row.effective_channel;
    // Optimistic, single-row update
    queryClient.setQueryData<NotificationPreferenceRow[]>(PREFS_KEY, (curr) => {
      if (!curr) return curr;
      return curr.map((r) =>
        r.notification_type === row.notification_type ? { ...r, effective_channel: next } : r,
      );
    });

    const { error } = await supabase.rpc("set_notification_preference", {
      p_notification_type: row.notification_type,
      p_channel: next,
    });

    if (error) {
      // Revert ONLY this row; leave any in-flight sibling changes alone.
      queryClient.setQueryData<NotificationPreferenceRow[]>(PREFS_KEY, (curr) => {
        if (!curr) return curr;
        return curr.map((r) =>
          r.notification_type === row.notification_type ? { ...r, effective_channel: previous } : r,
        );
      });
      toast.error("Couldn't save preference");
    } else {
      toast.success("Preference saved");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Notification preferences</h1>
        <p className="text-sm text-muted-foreground">
          Choose how you want to be notified for each event.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification preferences</CardTitle>
          <CardDescription>
            Updates apply immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div
              role="status"
              aria-label="Loading preferences"
              className="flex items-center justify-center py-10"
            >
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          {isError && (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Couldn't load preferences.</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
            </div>
          )}
          {!isLoading && !isError && grouped.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No notification types configured.
            </p>
          )}
          {!isLoading && !isError && grouped.length > 0 && (
            <div className="space-y-6">
              {grouped.map(({ category, rows }, idx) => (
                <div key={category} className="space-y-3">
                  {idx > 0 && <div className="border-t" />}
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">
                    {category}
                  </h3>
                  <div className="space-y-3">
                    {rows.map((row) => {
                      const disabled = !row.user_configurable;
                      const value = disabled ? row.default_channel : row.effective_channel;
                      return (
                        <div
                          key={row.notification_type}
                          className="flex items-center justify-between gap-4"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{row.description}</p>
                            {disabled && (
                              <p className="text-xs text-muted-foreground">Always on</p>
                            )}
                          </div>
                          <div className="w-[200px] shrink-0">
                            <Select
                              value={value}
                              disabled={disabled}
                              onValueChange={(v) => handleChange(row, v as NotificationChannel)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CHANNEL_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <NewsletterSubscriptionCard />
    </div>
  );
}

const NEWSLETTER_KEY = ["newsletter", "subscription"] as const;

type NewsletterSubResult = { subscribed: boolean; status: string | null };

function NewsletterSubscriptionCard() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: NEWSLETTER_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_newsletter_subscription");
      if (error) throw error;
      const result = (data ?? { subscribed: false, status: null }) as unknown as NewsletterSubResult;
      return result;
    },
  });

  const handleToggle = async (next: boolean) => {
    if (pending || !data) return;
    const previous = data.subscribed;
    setPending(true);
    queryClient.setQueryData<NewsletterSubResult>(NEWSLETTER_KEY, (curr) =>
      curr ? { ...curr, subscribed: next } : curr,
    );

    const revert = () => {
      queryClient.setQueryData<NewsletterSubResult>(NEWSLETTER_KEY, (curr) =>
        curr ? { ...curr, subscribed: previous } : curr,
      );
    };

    try {
      if (next) {
        const { data: res, error } = await supabase.rpc("opt_in_to_newsletter");
        if (error) throw error;
        const r = res as { success?: boolean; status?: string; error?: string } | null;
        if (r?.error === "delivery_problem") {
          revert();
          toast.error("There's a delivery issue with your email address. Please contact support.");
        } else if (r?.success) {
          queryClient.setQueryData<NewsletterSubResult>(NEWSLETTER_KEY, {
            subscribed: true,
            status: r.status ?? "confirmed",
          });
          toast.success("Subscribed to the newsletter");
        } else {
          revert();
          toast.error("Couldn't update subscription");
        }
      } else {
        const { data: res, error } = await supabase.rpc("opt_out_of_newsletter");
        if (error) throw error;
        const r = res as { success?: boolean; status?: string } | null;
        if (r?.success) {
          queryClient.setQueryData<NewsletterSubResult>(NEWSLETTER_KEY, {
            subscribed: false,
            status: r.status ?? null,
          });
          toast.success("Unsubscribed from the newsletter");
        } else {
          revert();
          toast.error("Couldn't update subscription");
        }
      }
    } catch {
      revert();
      toast.error("Couldn't update subscription");
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">BrainWise Newsletter</CardTitle>
        <CardDescription>Occasional updates from the BrainWise team.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div
            role="status"
            aria-label="Loading subscription"
            className="flex items-center justify-center py-6"
          >
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}
        {isError && (
          <div className="py-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Couldn't load subscription.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        )}
        {!isLoading && !isError && data && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Label htmlFor="newsletter-subscription" className="text-sm">
                Receive the BrainWise newsletter by email.
              </Label>
            </div>
            <Switch
              id="newsletter-subscription"
              checked={data.subscribed}
              disabled={pending}
              onCheckedChange={handleToggle}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
