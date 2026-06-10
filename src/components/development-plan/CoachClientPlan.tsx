import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Status = "not_started" | "in_progress" | "done" | "paused";

interface PlanEntry {
  id: string;
  entry_date: string;
  note: string | null;
  progress_pct: number | null;
  metric_value: number | null;
  metric_label: string | null;
  created_at: string;
}
interface PlanComment {
  id: string;
  author_role: "client" | "coach";
  author_user_id: string;
  author_name: string | null;
  body: string;
  edited_at: string | null;
  created_at: string;
}
interface PlanItem {
  id: string;
  source: "ptp" | "custom";
  source_context: string | null;
  card_title: string | null;
  dimension_tags: string[] | null;
  action_text: string;
  status: Status;
  target_date: string | null;
  progress_pct: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  entries: PlanEntry[];
  comments: PlanComment[];
}

const STATUS_META: Record<Status, { label: string; color: string }> = {
  not_started: { label: "Not started", color: "var(--bw-muted, #6b7280)" },
  in_progress: { label: "In progress", color: "var(--bw-teal)" },
  done: { label: "Done", color: "var(--bw-green)" },
  paused: { label: "Paused", color: "var(--bw-mustard)" },
};

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

export function CoachClientPlan({ clientUserId }: { clientUserId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [editingComment, setEditingComment] = useState<{ id: string; body: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["coach-client-plan", clientUserId],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "dp_get_client_plan" as never,
        { p_client_user_id: clientUserId } as never
      );
      if (error) throw error;
      return data as { client_name: string | null; items: PlanItem[] };
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["coach-client-plan", clientUserId] });

  const addComment = async (itemId: string) => {
    const body = (commentDrafts[itemId] ?? "").trim();
    if (!body) { toast.error("Write a comment first."); return; }
    const { error } = await supabase.rpc("dp_add_comment" as never, { p_item_id: itemId, p_body: body } as never);
    if (error) { toast.error("Could not add comment."); return; }
    setCommentDrafts((prev) => ({ ...prev, [itemId]: "" }));
    refresh();
  };

  const saveEditComment = async () => {
    if (!editingComment) return;
    const body = editingComment.body.trim();
    if (!body) { toast.error("Comment can't be empty."); return; }
    const { error } = await supabase.rpc("dp_edit_comment" as never, { p_comment_id: editingComment.id, p_body: body } as never);
    if (error) { toast.error("Could not save comment."); return; }
    setEditingComment(null);
    refresh();
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase.rpc("dp_delete_comment" as never, { p_comment_id: commentId } as never);
    if (error) { toast.error("Could not delete comment."); return; }
    refresh();
  };

  const toggle = (id: string) =>
    setExpanded((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        This client hasn't shared a development plan with you.
      </p>
    );
  }

  const items = data.items ?? [];
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold" style={{ color: "var(--bw-navy)" }}>Development Plan</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">This client's development plan is empty.</p>
      ) : items.map((item) => {
        const pct = item.progress_pct ?? 0;
        const meta = STATUS_META[item.status] ?? STATUS_META.not_started;
        const isOpen = expanded.has(item.id);
        return (
          <Card key={item.id}>
            <CardContent className="py-5 space-y-3">
              <div>
                {item.card_title && (
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.card_title}</p>
                )}
                <p className="font-medium" style={{ color: "var(--bw-navy)" }}>{item.action_text}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span
                  className="px-2 py-0.5 rounded text-white"
                  style={{ backgroundColor: meta.color }}
                >
                  {meta.label}
                </span>
                {item.target_date && <span>Target: {formatDate(item.target_date)}</span>}
                <span>{pct}%</span>
              </div>
              <Progress value={pct} className="h-1" />

              <button
                type="button"
                onClick={() => toggle(item.id)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Log &amp; comments ({item.entries?.length ?? 0} / {item.comments?.length ?? 0})
              </button>

              {isOpen && (
                <div className="space-y-4 pt-2 border-t">
                  {item.entries && item.entries.length > 0 ? (
                    <div className="space-y-2">
                      {item.entries.map((e) => (
                        <div key={e.id} className="text-sm">
                          <p className="text-xs text-muted-foreground">{formatDate(e.entry_date)}</p>
                          {e.note && <p className="mt-0.5">{e.note}</p>}
                          <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                            {e.progress_pct != null && <span>Progress: {e.progress_pct}%</span>}
                            {e.metric_value != null && (
                              <span>{e.metric_label ? `${e.metric_label}: ` : ""}{e.metric_value}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No entries yet.</p>
                  )}

                  <div className="space-y-2 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" /> Comments
                    </p>
                    {item.comments && item.comments.length > 0 ? (
                      <div className="space-y-2">
                        {item.comments.map((c) => {
                          const mine = c.author_user_id === user?.id;
                          const isEditing = editingComment?.id === c.id;
                          return (
                            <div key={c.id} className="text-sm rounded-md border p-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {c.author_name ?? (c.author_role === "coach" ? "You" : "Client")}
                                </span>
                                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  {c.author_role}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(c.created_at)}{c.edited_at ? " (edited)" : ""}
                                </span>
                                {mine && !isEditing && (
                                  <span className="ml-auto flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground"
                                      onClick={() => setEditingComment({ id: c.id, body: c.body })}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground"
                                      onClick={() => deleteComment(c.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </span>
                                )}
                              </div>
                              {isEditing ? (
                                <div className="mt-1.5 space-y-1.5">
                                  <Textarea
                                    value={editingComment.body}
                                    onChange={(ev) => setEditingComment({ id: c.id, body: ev.target.value })}
                                    rows={2}
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={saveEditComment}>Save</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingComment(null)}>Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="mt-1">{c.body}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No comments yet.</p>
                    )}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a comment"
                        value={commentDrafts[item.id] ?? ""}
                        onChange={(ev) => setCommentDrafts((prev) => ({ ...prev, [item.id]: ev.target.value }))}
                      />
                      <Button size="sm" onClick={() => addComment(item.id)}>Comment</Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
