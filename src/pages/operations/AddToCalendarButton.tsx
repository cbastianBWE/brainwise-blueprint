import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { supabase } from "@/integrations/supabase/client";

type ActivityData = {
  subject: string | null;
  description: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  meeting_location: string | null;
};

type Fmt = "google" | "outlook_web" | "ics";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toUtcBasic(d: Date) {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeIcs(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export default function AddToCalendarButton({ activityId }: { activityId: string }) {
  const [cached, setCached] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadActivity = async (): Promise<ActivityData | null> => {
    if (cached) return cached;
    const { data, error } = await opsSupabase
      .from("activities" as any)
      .select("subject,description,scheduled_start_at,scheduled_end_at,meeting_location")
      .eq("id", activityId)
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Failed to load activity");
      return null;
    }
    const d = data as unknown as ActivityData;
    setCached(d);
    return d;
  };

  const recordUsage = (fmt: Fmt) => {
    try {
      void supabase
        .rpc("ops_record_calendar_link" as any, { p_activity: activityId, p_output_format: fmt })
        .then(() => {}, () => {});
    } catch {
      /* swallow */
    }
  };

  const handle = async (fmt: Fmt) => {
    setLoading(true);
    try {
      const a = await loadActivity();
      if (!a) return;
      if (!a.scheduled_start_at) {
        toast.error("Activity has no scheduled start time");
        return;
      }
      const start = new Date(a.scheduled_start_at);
      const end = a.scheduled_end_at
        ? new Date(a.scheduled_end_at)
        : new Date(start.getTime() + 60 * 60 * 1000);
      const subject = a.subject ?? "";
      const description = a.description ?? "";
      const location = a.meeting_location ?? "";

      if (fmt === "google") {
        const params = new URLSearchParams();
        params.set("action", "TEMPLATE");
        params.set("text", subject);
        params.set("dates", `${toUtcBasic(start)}/${toUtcBasic(end)}`);
        if (description) params.set("details", description);
        if (location) params.set("location", location);
        const url = `https://calendar.google.com/calendar/render?${params.toString()}`;
        window.open(url, "_blank", "noopener,noreferrer");
      } else if (fmt === "outlook_web") {
        const params = new URLSearchParams();
        params.set("path", "/calendar/action/compose");
        params.set("rru", "addevent");
        params.set("subject", subject);
        if (description) params.set("body", description);
        if (location) params.set("location", location);
        params.set("startdt", start.toISOString());
        params.set("enddt", end.toISOString());
        const url = `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const lines = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//BrainWise//CRM//EN",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          "BEGIN:VEVENT",
          `UID:${activityId}@brainwiseenterprises.com`,
          `DTSTAMP:${toUtcBasic(new Date())}`,
          `DTSTART:${toUtcBasic(start)}`,
          `DTEND:${toUtcBasic(end)}`,
          `SUMMARY:${escapeIcs(subject)}`,
        ];
        if (description) lines.push(`DESCRIPTION:${escapeIcs(description)}`);
        if (location) lines.push(`LOCATION:${escapeIcs(location)}`);
        lines.push("END:VEVENT", "END:VCALENDAR");
        const ics = lines.join("\r\n");
        const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a2 = document.createElement("a");
        a2.href = url;
        a2.download = `meeting-${activityId}.ics`;
        document.body.appendChild(a2);
        a2.click();
        document.body.removeChild(a2);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      recordUsage(fmt);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={loading}>
          <CalendarPlus className="h-4 w-4 mr-2" />
          Add to calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handle("google")}>Google Calendar</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle("outlook_web")}>Outlook (web)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle("ics")}>Download .ics</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
