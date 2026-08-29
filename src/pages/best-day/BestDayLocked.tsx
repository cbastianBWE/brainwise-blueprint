import { useNavigate } from "react-router-dom";
import { ArrowRight, Coffee, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EXAMPLE = [
  { kind: "work", title: "Draft the board update", detail: "Hardest thinking first, while focus is cheap", minutes: 50 },
  { kind: "break", title: "Walk outside", detail: "No phone. This is what makes the next block work", minutes: 15 },
  { kind: "work", title: "Client call prep", detail: "Twenty minutes is enough. Stop when the notes are usable", minutes: 25 },
  { kind: "work", title: "Inbox and approvals", detail: "Batched, once, rather than all morning", minutes: 30 },
  { kind: "break", title: "Proper lunch", detail: "Away from the desk", minutes: 40 },
  { kind: "work", title: "Team one-to-one", detail: "Scheduled anchor, everything else moves around it", minutes: 45 },
];

export default function BestDayLocked() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <Sunrise className="h-6 w-6" />
          <span className="text-sm font-semibold uppercase tracking-wide">Best Day Organizer</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Plan tomorrow morning in under two minutes</h1>
        <p className="text-muted-foreground">
          Each morning you answer a few quick questions about what is on your plate, how much of the day is
          already committed, and how you are feeling. A short conversation fills in the gaps, and you get a
          sequenced plan for the day, breaks included. Through the day you tick things off, move what did not
          happen, and let go of what keeps sliding.
        </p>
        <p className="text-muted-foreground">
          The sequencing is personalised from your Personal Threat Profile, so the plan works with how you
          respond to pressure rather than against it. That is why the profile comes first.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">A planned day looks like this</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">
            Protect the morning for the board update, then keep the afternoon light.
          </p>
          <ol className="space-y-2">
            {EXAMPLE.map((b, i) => (
              <li
                key={i}
                className={
                  b.kind === "break"
                    ? "flex items-start gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3"
                    : "flex items-start gap-3 rounded-lg border bg-card p-3"
                }
              >
                <div className="mt-0.5 shrink-0 text-muted-foreground">
                  {b.kind === "break" ? <Coffee className="h-4 w-4" /> : <span className="text-xs font-semibold">{i + 1}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{b.detail}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{b.minutes} min</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">An example day, not your data.</p>
        </CardContent>
      </Card>

      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Take your Personal Threat Profile to unlock it</p>
            <p className="text-sm text-muted-foreground">
              It takes about twenty minutes, once. After that the organizer is ready every morning.
            </p>
          </div>
          <Button onClick={() => navigate("/assessment")} className="shrink-0">
            Start my profile
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
