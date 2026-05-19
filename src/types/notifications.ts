// Local response types for Session 84 notification RPCs.
// The RPCs are typed in src/integrations/supabase/types.ts but most return Json;
// these interfaces narrow the documented shapes for safe consumption.

export type NotificationChannel = "both" | "email" | "in_app" | "none";
export type NotificationFilter = "all" | "unread" | "archived";

export interface NotificationRow {
  id: string;
  notification_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
  archived_at: string | null;
  // Server-rendered display via notification_display, denormalised into the row by the RPC.
  title: string;
  body: string;
  action_url: string | null;
  action_label: string | null;
}

export interface NotificationPreferenceRow {
  notification_type: string;
  category: string;
  description: string;
  default_channel: NotificationChannel;
  effective_channel: NotificationChannel;
  user_configurable: boolean;
}

export interface GetUserNotificationsResult {
  items: NotificationRow[];
  unread_count: number;
  limit: number;
  filter: string;
}

export interface GetNotificationPreferencesResult {
  preferences: NotificationPreferenceRow[];
}

