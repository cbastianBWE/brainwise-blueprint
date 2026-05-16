import { Calendar, CircleCheck, Clock, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  contentItem: any;
  completion: any;
  viewerRole: "self" | "mentor" | "super_admin";
}

function formatSchedule(iso: string | null | undefined): string {
  if (!iso) return "Date to be announced";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "short",
    });
  } catch {
    return "Date to be announced";
  }
}

export default function LiveEventViewer({ contentItem, completion }: Props) {
  const status: string | null = completion?.live_event_attendance_status ?? null;

  let panel: { icon: any; tint: "teal" | "forest" | "gray"; text: string };
  if (status === "attended") {
    panel = { icon: CircleCheck, tint: "forest", text: "Attendance confirmed." };
  } else if (status === "registered") {
    panel = { icon: Calendar, tint: "teal", text: "You're registered for this event." };
  } else if (status === "missed") {
    panel = {
      icon: Info,
      tint: "gray",
      text: "Marked as missed. Contact your mentor if this is incorrect.",
    };
  } else {
    panel = {
      icon: Clock,
      tint: "teal",
      text: "Attendance not yet recorded — your mentor will mark this after the session.",
    };
  }

  const tintClass =
    panel.tint === "forest"
      ? "border-[var(--bw-forest)]/30 bg-[var(--bw-forest)]/5"
      : panel.tint === "gray"
        ? "border-[var(--bw-gray)]/30 bg-[var(--bw-gray)]/5"
        : "border-[var(--bw-teal)]/30 bg-[var(--bw-teal)]/5";
  const iconColor =
    panel.tint === "forest"
      ? "var(--bw-forest)"
      : panel.tint === "gray"
        ? "var(--bw-gray)"
        : "var(--bw-teal)";
  const PanelIcon = panel.icon;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{contentItem.title}</CardTitle>
        </CardHeader>
        {contentItem.description && (
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">{contentItem.description}</p>
          </CardContent>
        )}
      </Card>

      <div className="flex items-center gap-2 text-sm text-foreground">
        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
        <span>{formatSchedule(contentItem.event_scheduled_at)}</span>
      </div>

      {contentItem.event_external_id && (
        <div className="text-xs text-muted-foreground">Event ID: {contentItem.event_external_id}</div>
      )}

      <div className={`rounded-lg border p-4 ${tintClass}`}>
        <div className="flex items-start gap-3">
          <PanelIcon className="h-5 w-5 mt-0.5 shrink-0" style={{ color: iconColor }} />
          <div className="text-sm text-foreground">{panel.text}</div>
        </div>
      </div>
    </div>
  );
}
