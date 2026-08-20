import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface NotesPanelProps {
  contentItemId: string;
  /** Render the inner content only (no <section> wrapper / card chrome). */
  bare?: boolean;
}


interface NoteRow {
  id: string;
  body: string;
  shared_with_user_id: string | null;
  shared_at: string | null;
  updated_at: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function NotesPanel({ contentItemId, bare }: NotesPanelProps) {
  const { user } = useAuth();

  // Read approach: direct SELECT on learning_notes for this content item.
  // The user_id filter is REQUIRED: RLS on learning_notes also exposes notes
  // shared with the caller (as a mentor) and grants super admins every row, so
  // an unfiltered read can return someone else's private note — or several rows,
  // which would break maybeSingle(). Writes go exclusively through the RPCs.
  const noteQuery = useQuery({
    queryKey: ["learning-note", contentItemId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_notes")
        .select("id, body, shared_with_user_id, shared_at, updated_at")
        .eq("content_item_id", contentItemId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as NoteRow | null) ?? null;
    },
  });


  const [body, setBody] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [sharedAt, setSharedAt] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [archived, setArchived] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sharePending, setSharePending] = useState(false);

  // Hydrate once from the server, then let local edits own the textarea.
  const ready = !!user?.id && !noteQuery.isPending;
  useEffect(() => {
    if (hydrated || !ready) return;
    const n = noteQuery.data;
    setBody(n?.body ?? "");
    setIsShared(!!n?.shared_with_user_id);
    setSharedAt(n?.shared_at ?? null);
    setHydrated(true);
  }, [hydrated, ready, noteQuery.data]);


  // Debounced autosave — mirrors useDebouncedSave in
  // src/pages/coaching/runner/shared.tsx (timer ref + flush-on-unmount).
  const timer = useRef<number | null>(null);
  const pending = useRef<string | null>(null);
  const lastSaved = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || archived) return;
    if (lastSaved.current === null) {
      lastSaved.current = body;
      return;
    }
    if (body === lastSaved.current) return;

    if (timer.current) window.clearTimeout(timer.current);
    pending.current = body;

    const save = async (value: string) => {
      const { error } = await supabase.rpc("bw_learning_note_save", {
        p_content_item_id: contentItemId,
        p_body: value,
      });
      if (error) {
        if ((error.message || "").includes("content_item_archived")) {
          setArchived(true);
          setSaveError(null);
        } else {
          setSaveError("Couldn't save your note. It will retry as you keep typing.");
        }
        return;
      }
      lastSaved.current = value;
      setSaveError(null);
      setSavedAt(Date.now());
      if (value.trim().length === 0) {
        setIsShared(false);
        setSharedAt(null);
      }
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
  }, [body, hydrated, archived, contentItemId]);

  // Fade the "Saved" marker out after a few seconds.
  useEffect(() => {
    if (savedAt === null) return;
    const t = window.setTimeout(() => setSavedAt(null), 3000);
    return () => window.clearTimeout(t);
  }, [savedAt]);

  const toggleShare = async (next: boolean) => {
    setSharePending(true);
    setShareError(null);
    const { data, error } = await supabase.rpc("bw_learning_note_set_share", {
      p_content_item_id: contentItemId,
      p_share: next,
    });
    setSharePending(false);
    if (error) {
      const msg = error.message || "";
      if (msg.includes("no_active_mentor")) {
        setShareError("You don't have a certification mentor assigned yet.");
      } else if (msg.includes("note_not_found")) {
        setShareError("Write a note first, then you can share it.");
      } else {
        setShareError("Couldn't update sharing. Please try again.");
      }
      setIsShared(false);
      return;
    }
    const row = (Array.isArray(data) ? data[0] : data) as unknown as NoteRow | null;
    setIsShared(!!row?.shared_with_user_id);
    setSharedAt(row?.shared_at ?? null);
  };

  if (!ready) {
    const spinner = (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
    if (bare) return spinner;
    return (
      <section className="px-4 sm:px-6 pt-6">
        <Card>
          <CardContent className="p-0">{spinner}</CardContent>
        </Card>
      </section>
    );
  }

  const inner = (
    <div className="space-y-3">

          {archived ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This item is no longer active, so notes can't be edited. Your existing
                note is shown below.
              </p>
              <div className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm text-foreground">
                {body.trim().length > 0 ? body : "No note was saved for this item."}
              </div>
            </div>
          ) : (
            <>
              <Label htmlFor={`notes-${contentItemId}`} className="sr-only">
                My notes
              </Label>
              <Textarea
                id={`notes-${contentItemId}`}
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Notes for yourself. Only you can see these unless you share them."
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
            </>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t pt-3">
            <Switch
              id={`share-${contentItemId}`}
              checked={isShared}
              disabled={sharePending || archived}
              onCheckedChange={toggleShare}
            />
            <Label htmlFor={`share-${contentItemId}`} className="text-sm font-normal">
              Share this note with my mentor
            </Label>
          </div>
          {isShared && (
            <p className="text-xs text-muted-foreground">
              Shared with your certification mentor
              {sharedAt ? ` on ${formatDate(sharedAt)}` : ""}.
            </p>
          )}
          {shareError && <p className="text-xs text-muted-foreground">{shareError}</p>}
    </div>
  );

  if (bare) return inner;

  return (
    <section className="px-4 sm:px-6 pt-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">My notes</CardTitle>
        </CardHeader>
        <CardContent>{inner}</CardContent>
      </Card>
    </section>
  );

}
