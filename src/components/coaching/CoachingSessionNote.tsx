import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCoachingShare } from "@/hooks/useCoachingShare";

/**
 * Persistent, non-dismissible statement of who can read what the person writes.
 * The wording is driven by whether they have a practitioner.
 */
export function CoachingVisibilityLine({ className }: { className?: string }) {
  const { coachUserId, loading } = useCoachingShare();
  if (loading) return null;
  return (
    <p className={`text-xs text-muted-foreground ${className ?? ""}`}>
      {coachUserId ? "Your practitioner can read this." : "Only you can see this."}
    </p>
  );
}

interface Props {
  sessionId: string;
  /** False when a practitioner is reading a client's session. */
  editable: boolean;
  /** Only meaningful when editable is false. */
  readOnlyBody?: string | null;
  bare?: boolean;
}

interface NoteRow {
  id: string;
  body: string;
  updated_at: string;
}

export default function CoachingSessionNote({
  sessionId,
  editable,
  readOnlyBody,
  bare,
}: Props) {
  const { user } = useAuth();
  const { coachUserId, loading: shareLoading } = useCoachingShare();
  const placeholder = shareLoading
    ? "Notes for yourself."
    : coachUserId
      ? "Notes for yourself. Your practitioner can read these."
      : "Notes for yourself. Only you can see these.";

  // The user_id filter is REQUIRED: RLS on coaching_notes also exposes rows to
  // the client's practitioner and to super admins, so an unfiltered read can
  // return someone else's note — or several rows, breaking maybeSingle().
  const noteQuery = useQuery({
    queryKey: ["coaching-note", sessionId, user?.id],
    enabled: !!user?.id && editable,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_notes" as any)
        .select("id, body, updated_at")
        .eq("session_id", sessionId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return ((data as any) as NoteRow | null) ?? null;
    },
  });

  const [body, setBody] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const ready = !editable || (!!user?.id && !noteQuery.isPending);

  useEffect(() => {
    if (!editable || hydrated || !ready) return;
    setBody(noteQuery.data?.body ?? "");
    setHydrated(true);
  }, [editable, hydrated, ready, noteQuery.data]);

  // Debounced autosave with flush-on-unmount, mirroring NotesPanel.
  const timer = useRef<number | null>(null);
  const pending = useRef<string | null>(null);
  const lastSaved = useRef<string | null>(null);

  useEffect(() => {
    if (!editable || !hydrated) return;
    if (lastSaved.current === null) {
      lastSaved.current = body;
      return;
    }
    if (body === lastSaved.current) return;

    if (timer.current) window.clearTimeout(timer.current);
    pending.current = body;

    const save = async (value: string) => {
      const { error } = await supabase.rpc("bw_coaching_note_save" as any, {
        p_session_id: sessionId,
        p_body: value,
      });
      if (error) {
        setSaveError("Couldn't save your note. It will retry as you keep typing.");
        return;
      }
      lastSaved.current = value;
      setSaveError(null);
      setSavedAt(Date.now());
    };

    timer.current = window.setTimeout(async () => {
      const value = pending.current ?? "";
      pending.current = null;
      setSaving(true);
      await save(value);
      setSaving(false);
    }, 900);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      const p = pending.current;
      if (p !== null) {
        pending.current = null;
        void save(p);
      }
    };
  }, [body, hydrated, editable, sessionId]);

  useEffect(() => {
    if (savedAt === null) return;
    const t = window.setTimeout(() => setSavedAt(null), 3000);
    return () => window.clearTimeout(t);
  }, [savedAt]);

  const wrap = (inner: React.ReactNode) => {
    if (bare) return <>{inner}</>;
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {editable ? "My notes" : "Client's note"}
          </CardTitle>
        </CardHeader>
        <CardContent>{inner}</CardContent>
      </Card>
    );
  };

  if (!editable) {
    const text = (readOnlyBody ?? "").trim();
    if (!text) return null;
    return wrap(
      <div className="space-y-2">
        {bare && (
          <p className="text-xs font-medium text-muted-foreground">Client's note</p>
        )}
        <div className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm text-foreground">
          {text}
        </div>
      </div>,
    );
  }

  if (!ready) {
    return wrap(
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>,
    );
  }

  return wrap(
    <div className="space-y-2">
      <Label htmlFor={`coaching-note-${sessionId}`} className="sr-only">
        My notes
      </Label>
      <Textarea
        id={`coaching-note-${sessionId}`}
        rows={6}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Notes for yourself. Your practitioner can read these."
        className="min-h-[9rem] resize-y"
      />
      <div className="flex h-4 items-center gap-2 text-xs text-muted-foreground">
        {saving ? (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </span>
        ) : savedAt ? (
          <span className="transition-opacity">Saved</span>
        ) : null}
        {saveError && <span className="text-destructive">{saveError}</span>}
      </div>
      <CoachingVisibilityLine />
    </div>,
  );
}
