// The subject's side of the 360. One widget, four states: draft (choose who
// to ask), collecting (their own answers, and who has come back), ready
// (enough answers, summary pending) and summarised (the summary).
// Who answered is never shown. Counts only.
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Send, Trash2, Users, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AnswerFlow } from "../../three-sixty/AnswerFlow";
import { ThreeSixtySummary } from "../../three-sixty/ThreeSixtySummary";

interface Progress {
  found: boolean;
  status?: string;
  invited?: number;
  submitted?: number;
  min_submitted?: number;
  min_invited?: number;
  max_invited?: number;
  participants?: number;
  max_participants?: number;
  slots_left?: number;
  self_started?: boolean;
  self_submitted?: boolean;
  summary_eligible?: boolean;
  due_at?: string | null;
  days_left?: number | null;
  closed?: boolean;
  summary_generated_at?: string | null;
}

interface Rater {
  rater_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string | null;
  relationship: string | null;
  invited_at: string | null;
  revoked_at: string | null;
}

// No hardcoded floors or ceilings: every number comes from bw_360_progress.


export function ThreeSixtyWidget({
  step,
  userId,
  sessionId,
}: {
  step: { intro?: string; title?: string } & Record<string, any>;
  userId: string;
  /** The coaching session this widget lives in, used to fold themes into the rolling summary. */
  sessionId?: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [raters, setRaters] = useState<Rater[]>([]);
  const [selfSubmission, setSelfSubmission] = useState<string | null>(null);
  const [selfSubmitted, setSelfSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", role: "", relationship: "" });

  const refresh = useCallback(
    async (id: string) => {
      const [{ data: prog }, { data: list }, { data: sub }] = await Promise.all([
        supabase.rpc("bw_360_progress", { p_cycle: id }),
        supabase.rpc("bw_360_rater_list", { p_cycle: id }),
        supabase
          .from("three_sixty_submissions")
          .select("id, submitted_at")
          .eq("cycle_id", id)
          .eq("is_self", true)
          .maybeSingle(),
      ]);
      setProgress((prog as unknown as Progress) ?? null);
      setRaters(((list || []) as Rater[]).filter((r) => !r.revoked_at));
      setSelfSubmission(sub?.id ?? null);
      setSelfSubmitted(!!sub?.submitted_at);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("bw_360_start_cycle");
      if (cancelled) return;
      if (error) {
        toast.error("Your 360 could not be started.");
        setLoading(false);
        return;
      }
      const id = (data as any)?.cycle_id as string | undefined;
      if (!id) {
        setLoading(false);
        return;
      }
      setCycleId(id);
      await refresh(id);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, refresh]);

  const addRater = async () => {
    if (!cycleId) return;
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error("A name and an email address are needed.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("bw_360_add_rater", {
      p_cycle: cycleId,
      p_full_name: form.full_name.trim(),
      p_email: form.email.trim(),
      p_phone: null,
      p_role: form.role.trim() || null,
      p_relationship: form.relationship.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error("That person could not be added.");
      return;
    }
    const res = (data || {}) as { ok?: boolean; error?: string; max_invited?: number };
    if (!res.ok) {
      toast.error(
        res.error === "duplicate_email"
          ? "You have already asked that person."
          : res.error === "self"
            ? "You cannot ask yourself."
            : res.error === "too_many_raters"
              ? `You can ask up to ${res.max_invited ?? progress?.max_invited} people. Withdraw someone if you want to add somebody else.`
              : "That person could not be added.",
      );
      if (res.error === "too_many_raters") await refresh(cycleId);
      return;
    }

    setForm({ full_name: "", email: "", role: "", relationship: "" });
    await refresh(cycleId);
  };

  const revoke = async (raterId: string) => {
    if (!cycleId) return;
    setBusy(true);
    const { error } = await supabase.rpc("bw_360_revoke_rater", { p_rater: raterId });
    setBusy(false);
    if (error) {
      toast.error("That could not be withdrawn.");
      return;
    }
    await refresh(cycleId);
  };

  const openCycle = async () => {
    if (!cycleId) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("bw_360_open_cycle", { p_cycle: cycleId });
    if (error) {
      setBusy(false);
      toast.error("Your 360 could not be opened.");
      return;
    }
    const res = (data || {}) as { ok?: boolean; error?: string; min_invited?: number };
    if (!res.ok) {
      setBusy(false);
      toast.error(
        res.error === "not_enough_raters"
          ? `Ask at least ${res.min_invited ?? progress?.min_invited} people before you open your 360.`
          : "Your 360 is already open.",
      );

      await refresh(cycleId);
      return;
    }
    const { data: sent } = await supabase.rpc("bw_360_send_invitations", { p_cycle: cycleId });
    setBusy(false);
    const s = (sent || {}) as { sent?: number };
    toast.success(s.sent ? `Invitations sent to ${s.sent} people.` : "Your 360 is open.");
    await refresh(cycleId);
  };

  const remind = async () => {
    if (!cycleId) return;
    setBusy(true);
    const { error } = await supabase.rpc("bw_360_send_invitations", {
      p_cycle: cycleId,
      p_resend: true,
      p_reminder: true,
      p_respect_cadence: true,
    });
    setBusy(false);
    if (error) toast.error("Reminders could not be sent.");
    else toast.success("Reminders sent to anyone who has not answered.");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Opening your 360…
      </div>
    );
  }

  if (!cycleId || !progress?.found) {
    return <p className="text-sm text-muted-foreground">Your 360 could not be opened right now.</p>;
  }

  const status = progress.status;
  const summarised = !!progress.summary_generated_at;

  return (
    <div className="space-y-6">
      {step.intro && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{step.intro}</p>}

      {/* ---- Draft: choose who to ask ---- */}
      {status === "draft" && (
        <div className="space-y-4">
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Who are you asking?</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Ask at least {MIN_INVITED} people. Nobody, including you, ever sees who said what.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="r-name">Name</Label>
                <Input
                  id="r-name"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="r-email">Email</Label>
                <Input
                  id="r-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="r-role">Their role (optional)</Label>
                <Input
                  id="r-role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="r-rel">How you work together (optional)</Label>
                <Input
                  id="r-rel"
                  value={form.relationship}
                  onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
                />
              </div>
            </div>
            <Button type="button" onClick={addRater} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add this person
            </Button>
          </Card>

          <RaterList raters={raters} onRevoke={revoke} busy={busy} />

          <div className="space-y-2 rounded-md border bg-muted/30 p-4">
            <p className="text-sm">
              {raters.length < MIN_INVITED
                ? `Add ${MIN_INVITED - raters.length} more before you can open your 360.`
                : "When you open your 360, everyone on this list is emailed an invitation."}
            </p>
            <Button type="button" onClick={openCycle} disabled={busy || raters.length < MIN_INVITED}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Open my 360 and send the invitations
            </Button>
          </div>
        </div>
      )}

      {/* ---- Collecting ---- */}
      {status === "collecting" && (
        <div className="space-y-6">
          <Card className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {progress.submitted ?? 0} of {progress.invited ?? 0} have answered
              </Badge>
              {typeof progress.days_left === "number" && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {progress.days_left === 0 ? "Closing today" : `${progress.days_left} days left`}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Your summary is written once at least {progress.min_submitted ?? 3} people have answered.
              You will never be told who did.
            </p>
            <div>
              <Button type="button" variant="outline" size="sm" onClick={remind} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send a reminder
              </Button>
            </div>
          </Card>

          <RaterList raters={raters} onRevoke={revoke} busy={busy} />

          <div className="space-y-3">
            <h3 className="text-base font-semibold">Your own answers</h3>
            {selfSubmitted ? (
              <p className="text-sm text-muted-foreground">
                You have answered your own version. It is compared with what comes back.
              </p>
            ) : selfSubmission ? (
              <AnswerFlow submissionId={selfSubmission} onSubmitted={() => setSelfSubmitted(true)} />
            ) : (
              <p className="text-sm text-muted-foreground">Your own version is not ready yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ---- Ready: enough answers, summary not written yet ---- */}
      {status !== "draft" && !summarised && progress.summary_eligible && (
        <Card className="space-y-1 p-4">
          <h3 className="text-sm font-semibold">Enough people have answered</h3>
          <p className="text-sm text-muted-foreground">
            Your summary is being written. It appears here when it is ready, and you will be told.
          </p>
        </Card>
      )}

      {/* ---- Summarised ---- */}
      {summarised && (
        <ThreeSixtySummary cycleId={cycleId} sessionId={sessionId ?? undefined} />
      )}
    </div>
  );
}

function RaterList({
  raters,
  onRevoke,
  busy,
}: {
  raters: Rater[];
  onRevoke: (id: string) => void;
  busy: boolean;
}) {
  if (raters.length === 0) {
    return <p className="text-sm text-muted-foreground">You have not asked anyone yet.</p>;
  }
  return (
    <div className="space-y-2">
      {raters.map((r) => (
        <div key={r.rater_id} className="flex items-center gap-3 rounded-md border p-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{r.full_name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {[r.email, r.role, r.relationship].filter(Boolean).join(" · ")}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => onRevoke(r.rater_id)}
            aria-label={`Withdraw the invitation to ${r.full_name}`}
          >
            <Trash2 className="h-4 w-4" />
            Withdraw
          </Button>
        </div>
      ))}
    </div>
  );
}

export default ThreeSixtyWidget;
