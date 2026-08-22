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
  const [credits, setCredits] = useState<number | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", role: "", relationship: "" });

  const refresh = useCallback(
    async (id: string) => {
      const [{ data: prog }, { data: list }, { data: sub }, { data: cred }] = await Promise.all([
        supabase.rpc("bw_360_progress", { p_cycle: id }),
        supabase.rpc("bw_360_rater_list", { p_cycle: id }),
        supabase
          .from("three_sixty_submissions")
          .select("id, submitted_at")
          .eq("cycle_id", id)
          .eq("is_self", true)
          .maybeSingle(),
        // The 360 has its own pool of AI calls. Keep the balance current as
        // raters answer; there is no self-serve top-up, so this is display only.
        supabase.rpc("bw_360_my_credits"),
      ]);
      setProgress((prog as unknown as Progress) ?? null);
      setRaters(((list || []) as Rater[]).filter((r) => !r.revoked_at));
      setSelfSubmission(sub?.id ?? null);
      setSelfSubmitted(!!sub?.submitted_at);
      const c = (cred as unknown as { credits?: number } | null)?.credits;
      if (typeof c === "number") setCredits(c);
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
      const started = (data || {}) as unknown as { cycle_id?: string; credits?: number };
      const id = started.cycle_id;
      if (typeof started.credits === "number") setCredits(started.credits);
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
    // The cycle is open either way. Only the send can fail, and if it does the
    // nightly sweep picks these raters up, so say that rather than "failed".
    const { data: sent, error: sendErr } = await supabase.rpc("bw_360_send_invitations", {
      p_cycle: cycleId,
    });
    setBusy(false);
    const s = (sent || {}) as { ok?: boolean; sent?: number };
    if (sendErr || s.ok === false) {
      toast.warning(
        "Your 360 is open, but the invitations could not be sent just now. We will try again automatically within a day. You can also send them yourself with the reminder button.",
      );
    } else {
      toast.success(s.sent ? `Invitations sent to ${s.sent} people.` : "Your 360 is open.");
    }

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
  // Every count and gate comes from bw_360_progress.
  const minInvited = progress.min_invited ?? 0;
  const maxInvited = progress.max_invited ?? 0;
  const participants = progress.participants ?? 0;
  const maxParticipants = progress.max_participants ?? 0;
  const slotsLeft = progress.slots_left ?? 0;
  const invited = progress.invited ?? 0;
  const atCeiling = slotsLeft <= 0;
  const canOpen = invited >= minInvited;
  const selfDone = selfSubmitted || !!progress.self_submitted;
  const dueLabel = formatDue(progress.due_at);

  // The 360's own pool. Silent above 60, a quiet line from 1 to 60, and an
  // explanation at 0 that the summary still arrives on the due date.
  const creditNote =
    credits === null || status === "draft" || credits > 60 ? null : credits > 0 ? (
      <p className="text-xs text-muted-foreground">AI credits left for your 360: {credits}.</p>
    ) : (
      <p className="text-xs text-muted-foreground">
        You have used all the AI credits included with your 360. Follow-up questions are turned off
        for the rest of it, and your summary will still be written on {dueLabel}.
      </p>
    );



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
              A 360 is you and up to {maxInvited} others, {maxParticipants} participants in all. Ask at
              least {minInvited} people. Nobody, including you, ever sees who said what.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {participants} of {maxParticipants} participants
              </Badge>
              {!atCeiling && slotsLeft <= 3 && (
                <span className="text-xs text-muted-foreground">
                  {slotsLeft === 1 ? "1 more you can ask" : `${slotsLeft} more you can ask`}
                </span>
              )}
              {atCeiling && (
                <span className="text-xs text-muted-foreground">
                  You can ask up to {maxInvited} people. Withdraw someone if you want to add somebody else.
                </span>
              )}
            </div>

            <fieldset disabled={atCeiling} className="space-y-3 disabled:opacity-60">
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
              <Button type="button" onClick={addRater} disabled={busy || atCeiling}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add this person
              </Button>
            </fieldset>
          </Card>

          {/* Encouragement, never a gate. There is no "this is my manager" field. */}
          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-semibold">Include your manager</h3>
            <p className="text-sm text-muted-foreground">
              A 360 without the person you report to is missing the view that matters most, and their
              answers are unattributed like everyone else's.
            </p>
            <p className="text-sm text-muted-foreground">
              A good list is your manager, two or three peers, two or three people who report to you,
              and anyone else whose view you would act on.
            </p>
          </Card>

          {/* The self version exists from the moment the cycle opens, so say so now. */}
          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-semibold">You answer these questions too</h3>
            <p className="text-sm text-muted-foreground">
              You will answer the same questions about yourself. Your answers are compared with what
              comes back, and that comparison is the most useful part of your summary.
            </p>
          </Card>

          <RaterList raters={raters} onRevoke={revoke} busy={busy} />

          <div className="space-y-2 rounded-md border bg-muted/30 p-4">
            <p className="text-sm">
              {!canOpen
                ? `Add ${minInvited - invited} more before you can open your 360.`
                : "When you open your 360, everyone on this list is emailed an invitation."}
            </p>
            <Button type="button" onClick={openCycle} disabled={busy || !canOpen}>
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
            {creditNote}
            <div>
              <Button type="button" variant="outline" size="sm" onClick={remind} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send a reminder
              </Button>
            </div>
          </Card>

          {/* Until the subject answers their own version, this is the loudest
              thing on the screen: the summary compares it question by question. */}
          {selfDone ? (
            <>
              <RaterList raters={raters} onRevoke={revoke} busy={busy} />
              <div className="space-y-3">
                <h3 className="text-base font-semibold">Your own answers</h3>
                <p className="text-sm text-muted-foreground">
                  You have answered your own version. It is compared with what comes back.
                </p>
              </div>
            </>
          ) : (
            <>
              <Card className="space-y-3 border-primary/40 bg-primary/5 p-4">
                <h3 className="text-base font-semibold">Answer your own version</h3>
                <p className="text-sm text-muted-foreground">
                  Your summary compares your own answers with what comes back, question by question,
                  and that comparison is the most useful part of it. Questions you skip show as
                  "You did not answer this one."
                </p>
                {selfSubmission ? (
                  <AnswerFlow submissionId={selfSubmission} onSubmitted={() => setSelfSubmitted(true)} />
                ) : (
                  <p className="text-sm text-muted-foreground">Your own version is not ready yet.</p>
                )}
              </Card>

              <RaterList raters={raters} onRevoke={revoke} busy={busy} />
            </>
          )}

        </div>
      )}

      {/* ---- Ready: enough answers, summary not written yet ---- */}
      {status !== "draft" && !summarised && progress.summary_eligible && (
        <Card className="space-y-2 p-4">
          <h3 className="text-sm font-semibold">Enough people have answered</h3>
          <p className="text-sm text-muted-foreground">
            Your summary is written automatically on {dueLabel}. You can have it built now if you do
            not want to wait, and more answers arriving afterwards are still included.
          </p>
          <div>
            <Button type="button" variant="outline" size="sm" onClick={buildNow} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Build it now
            </Button>
          </div>
          {creditNote}
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
