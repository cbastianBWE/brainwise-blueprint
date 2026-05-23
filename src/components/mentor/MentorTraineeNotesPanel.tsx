import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type {
  ListMentorTraineeNotesResult,
  MentorTraineeNote,
} from "@/types/mentor-trainee-notes";

interface Props {
  traineeId: string;
  // Pass-through from MentorTraineeDetail's stateQuery.data.mentor_relationships.
  mentorRelationships: any[];
}

function resolveAssignmentId(
  mentorRelationships: any[],
  callerUserId: string | undefined,
): { assignmentId: string | null; isActive: boolean } {
  if (!callerUserId) return { assignmentId: null, isActive: false };
  const owned = mentorRelationships.filter((m) => m?.mentor_user_id === callerUserId);
  if (owned.length === 0) return { assignmentId: null, isActive: false };
  const active = owned.find((m) => m?.ended_at === null);
  if (active) return { assignmentId: active.assignment_id, isActive: true };
  const sorted = [...owned].sort((a, b) =>
    (b?.assigned_at ?? "").localeCompare(a?.assigned_at ?? ""),
  );
  return { assignmentId: sorted[0]?.assignment_id ?? null, isActive: false };
}

function formatDateTime(d?: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return d;
  }
}

const MAX_NOTE_LEN = 10000;

export default function MentorTraineeNotesPanel({ traineeId, mentorRelationships }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [draftText, setDraftText] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MentorTraineeNote | null>(null);

  const { assignmentId, isActive } = useMemo(
    () => resolveAssignmentId(mentorRelationships, user?.id),
    [mentorRelationships, user?.id],
  );

  const notesQuery = useQuery({
    queryKey: ["mentor_trainee_notes", traineeId],
    enabled: !!traineeId && !!assignmentId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_mentor_trainee_notes" as never, {
        p_trainee_user_id: traineeId,
      } as never);
      if (error) throw error;
      const result = (data ?? {}) as unknown as ListMentorTraineeNotesResult;
      return (result.notes ?? []) as MentorTraineeNote[];
    },
  });

  const notes = notesQuery.data ?? [];

  if (!assignmentId) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          You're not currently this trainee's mentor. Assign yourself as their mentor via the
          Members surface to start adding notes.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to={`/super-admin/members?userId=${traineeId}`}>Open in Members</Link>
        </Button>
      </div>
    );
  }

  if (notesQuery.isLoading) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center"
      >
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        Loading notes…
      </div>
    );
  }

  if (notesQuery.isError) {
    return (
      <div className="py-8 text-center space-y-3">
        <p className="text-sm text-destructive">Couldn't load notes.</p>
        <Button variant="outline" size="sm" onClick={() => notesQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!assignmentId) return;
    if (!draftText.trim()) {
      toast({ title: "Note can't be empty", variant: "destructive" });
      return;
    }
    if (draftText.length > MAX_NOTE_LEN) {
      toast({
        title: "Note is too long",
        description: `Maximum ${MAX_NOTE_LEN} characters.`,
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("upsert_mentor_trainee_note" as never, {
        p_id: null,
        p_assignment_id: assignmentId,
        p_note_text: draftText,
      } as never);
      if (error) throw error;
      toast({ title: "Note saved" });
      setDraftText("");
      queryClient.invalidateQueries({ queryKey: ["mentor_trainee_notes", traineeId] });
    } catch (err: any) {
      toast({
        title: "Couldn't save note",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (note: MentorTraineeNote) => {
    setEditingId(note.id);
    setEditingText(note.note_text);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editingText.trim()) {
      toast({ title: "Note can't be empty", variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    try {
      const { error } = await supabase.rpc("upsert_mentor_trainee_note" as never, {
        p_id: editingId,
        p_assignment_id: null,
        p_note_text: editingText,
      } as never);
      if (error) throw error;
      toast({ title: "Note updated" });
      setEditingId(null);
      setEditingText("");
      queryClient.invalidateQueries({ queryKey: ["mentor_trainee_notes", traineeId] });
    } catch (err: any) {
      toast({
        title: "Couldn't update note",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase
      .from("mentor_trainee_notes" as never)
      .delete()
      .eq("id", pendingDelete.id);
    if (error) {
      toast({
        title: "Couldn't delete note",
        description: error.message ?? "Please try again.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Note deleted" });
    queryClient.invalidateQueries({ queryKey: ["mentor_trainee_notes", traineeId] });
    setPendingDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          placeholder="Add a note about this trainee — observations, patterns, anything worth remembering across sessions…"
          rows={4}
          maxLength={MAX_NOTE_LEN}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {draftText.length} / {MAX_NOTE_LEN.toLocaleString()} characters
          </p>
          <Button
            onClick={handleCreate}
            disabled={saving || draftText.trim().length === 0}
            size="sm"
          >
            {saving && <Loader2 aria-hidden="true" className="h-4 w-4 mr-2 animate-spin" />}
            Save note
          </Button>
        </div>
        {!isActive && (
          <p className="text-xs text-muted-foreground italic">
            Your mentorship with this trainee has ended. New notes will be attached to the most
            recent assignment.
          </p>
        )}
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No notes yet. Save your first one above.
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const isEditing = editingId === note.id;
            return (
              <div key={note.id} className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(note.created_at)}
                    {note.updated_at !== note.created_at && (
                      <span> (edited {formatDateTime(note.updated_at)})</span>
                    )}
                  </p>
                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEdit(note)}
                        aria-label="Edit note"
                      >
                        <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDelete(note)}
                        aria-label="Delete note"
                      >
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={4}
                      maxLength={MAX_NOTE_LEN}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={savingEdit}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={savingEdit || editingText.trim().length === 0}
                      >
                        {savingEdit && (
                          <Loader2 aria-hidden="true" className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Save changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {note.note_text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the note. This action can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
