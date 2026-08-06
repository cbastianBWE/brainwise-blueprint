import { supabase } from "@/integrations/supabase/client";

/**
 * Content-blind coach surface for My Relationship.
 *
 * Everything here reads progress, counts, categories, severity and status.
 * There is deliberately no path to a couple's raw answers or disclosure text —
 * RLS gives practitioners no read on the underlying response tables.
 */

export interface RosterRow {
  relationship_id: string;
  partner_one: string;
  partner_two: string;
  run_number: number;
  core_total: number;
  one_done: number;
  two_done: number;
  open_alerts: number;
  max_open_severity: string | null;
  has_safeguarding: boolean;
  pacing_ceiling_module: number | null;
  last_activity: string | null;
}

export interface OverviewRow {
  activity_id: string;
  code: string;
  title: string;
  area_code: string | null;
  module_number: number;
  sequence: number;
  visibility_mode: string | null;
  one_status: string;
  two_status: string;
  barrier_cleared: boolean;
}

export interface SafetyAlertRow {
  alert_id: string;
  relationship_id: string;
  subject_label: string | null;
  categories: string[] | null;
  severity: string | null;
  status: string;
  safeguarding: boolean;
  created_at: string;
  acknowledged_at: string | null;
}

export type OkReason = { ok: boolean; reason: string } | undefined;

export const SEVERITY_LABEL: Record<string, string> = {
  crisis: "Crisis",
  tier3: "Tier 3",
  tier2: "Tier 2",
  ordinary: "Ordinary",
};

/** Quiet, token-driven severity styling. Never hardcode raw colors. */
export function severityClasses(sev: string | null): string {
  switch (sev) {
    case "crisis":
      return "bg-destructive text-destructive-foreground";
    case "tier3":
      return "bg-destructive/15 text-destructive border border-destructive/30";
    case "tier2":
      return "bg-accent text-accent-foreground border border-border";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

export const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  completed: "Completed",
};

export function statusClasses(status: string): string {
  switch (status) {
    case "completed":
      return "bg-primary/10 text-primary border border-primary/20";
    case "submitted":
      return "bg-accent text-accent-foreground border border-border";
    case "in_progress":
      return "bg-muted text-foreground border border-border";
    default:
      return "bg-muted/50 text-muted-foreground border border-border";
  }
}

export const ALERT_STATUSES = ["open", "acknowledged", "actioned", "resolved"] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export async function fetchRoster(): Promise<RosterRow[]> {
  const { data, error } = await supabase.rpc("relationship_coach_roster");
  if (error || !Array.isArray(data)) return [];
  return data as unknown as RosterRow[];
}

export async function fetchOverview(relationshipId: string): Promise<OverviewRow[]> {
  const { data, error } = await supabase.rpc("relationship_coach_overview", {
    p_relationship: relationshipId,
  });
  if (error || !Array.isArray(data)) return [];
  return data as unknown as OverviewRow[];
}

export async function fetchSafetyInbox(includeResolved: boolean): Promise<SafetyAlertRow[]> {
  const { data, error } = await supabase.rpc("relationship_coach_safety_inbox", {
    p_include_resolved: includeResolved,
  });
  if (error || !Array.isArray(data)) return [];
  return data as unknown as SafetyAlertRow[];
}

export function firstRow<T>(data: unknown): T | undefined {
  return (data as T[] | null)?.[0];
}
