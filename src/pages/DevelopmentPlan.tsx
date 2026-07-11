import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Target, Loader2, Plus, ChevronDown, ChevronUp, Trash2, Archive, ArchiveRestore, Pencil, MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShareWithCoachDialog } from "@/components/development-plan/ShareWithCoachDialog";
import { PTP_DIMENSION_NAMES } from "@/lib/ptpDimensionColors";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReportCommitmentsTab from "@/components/development-plan/ReportCommitmentsTab";

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
  source: "ptp" | "custom" | "team_report" | "paired_report";
  source_context: string | null;
  card_title: string | null;
  dimension_tags: string[] | null;
  action_text: string;
  status: Status;
  target_date: string | null;
  progress_pct: number | null;
  sort_order: number;
  archived_at: string | null;
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
const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "paused", label: "Paused" },
];

interface EntryDraft {
  entry_date: string;
  note: string;
  progress_pct: string;
  metric_value: string;
  metric_label: string;
}
const emptyDraft = (): EntryDraft => ({
  entry_date: new Date().toISOString().slice(0, 10),
  note: "",
  progress_pct: "",
  metric_value: "",
  metric_label: "",
});

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

export default function DevelopmentPlan() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [entryDrafts, setEntryDrafts] = useState<Record<string, EntryDraft>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [editingComment, setEditingComment] = useState<{ id: string; body: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [creating, setCreating] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["development-plan", includeArchived],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "dp_list_my_plan" as never,
        { p_include_archived: includeArchived } as never
      );
      if (error) throw error;
      return data as { items: PlanItem[] };
    },
  });

  const allItems = (data?.items ?? []) as PlanItem[];
  const isMineSource = (i: PlanItem) => i.source === "ptp" || i.source === "custom";
  const activeItems = allItems.filter((i) => !i.archived_at && isMineSource(i));
  const archivedItems = allItems.filter((i) => i.archived_at && isMineSource(i));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["development-plan"] });

  const updateItem = async (id: string, payload: Record<string, unknown>) => {
    const { error } = await supabase.rpc(
      "dp_update_item" as never,
      { p_item_id: id, p_payload: payload } as never
    );
    if (error) { toast.error("Could not update. Please try again."); return; }
    refresh();
  };

  const archiveItem = async (id: string, archived: boolean) => {
    const { error } = await supabase.rpc(
      "dp_archive_item" as never,
      { p_item_id: id, p_archived: archived } as never
    );
    if (error) { toast.error("Could not update."); return; }
    toast.success(archived ? "Moved to archived" : "Restored to your plan");
    refresh();
  };

  const getDraft = (id: string): EntryDraft => entryDrafts[id] ?? emptyDraft();
  const setDraft = (id: string, patch: Partial<EntryDraft>) =>
    setEntryDrafts((prev) => ({ ...prev, [id]: { ...getDraft(id), ...patch } }));

  const addEntry = async (itemId: string) => {
    const d = getDraft(itemId);
    if (!d.note.trim() && !d.progress_pct && !d.metric_value) {
      toast.error("Add a note, progress, or a metric first.");
      return;
    }
    const { error } = await supabase.rpc("dp_add_entry" as never, {
      p_item_id: itemId,
      p_entry_date: d.entry_date || null,
      p_note: d.note.trim() || null,
      p_progress_pct: d.progress_pct ? Number(d.progress_pct) : null,
      p_metric_value: d.metric_value ? Number(d.metric_value) : null,
      p_metric_label: d.metric_label.trim() || null,
    } as never);
    if (error) { toast.error("Could not add entry."); return; }
    setEntryDrafts((prev) => ({ ...prev, [itemId]: emptyDraft() }));
    refresh();
  };

  const deleteEntry = async (entryId: string) => {
    const { error } = await supabase.rpc("dp_delete_entry" as never, { p_entry_id: entryId } as never);
    if (error) { toast.error("Could not delete entry."); return; }
    refresh();
  };

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

  const createCustom = async () => {
    if (!customText.trim()) { toast.error("Enter an action."); return; }
    setCreating(true);
    const { error } = await supabase.rpc("dp_create_custom_item" as never, {
      p_action_text: customText.trim(),
      p_target_date: customDate || null,
    } as never);
    setCreating(false);
    if (error) { toast.error("Could not add action."); return; }
    setCustomText(""); setCustomDate(""); setAddOpen(false);
    refresh();
  };

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const renderActiveItem = (item: PlanItem) => {
    const pct = item.progress_pct ?? 0;
    const isOpen = expanded.has(item.id);
    const draft = getDraft(item.id);
    const meta = STATUS_META[item.status] ?? STATUS_META.not_started;
    return (
      <Card key={item.id}>
        <CardContent className="py-5 space-y-3">
          <div>
            {item.card_title && (
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.card_title}</p>
            )}
            <p className="font-medium" style={{ color: "var(--bw-navy)" }}>{item.action_text}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={item.status} onValueChange={(v) => updateItem(item.id, { status: v })}>
              <SelectTrigger className="h-8 w-[150px]" style={{ borderColor: meta.color }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Target
              <Input
                type="date"
                className="h-8 w-[150px]"
                value={item.target_date ?? ""}
                onChange={(e) => updateItem(item.id, { target_date: e.target.value || null })}
              />
            </label>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-muted-foreground"
              onClick={() => archiveItem(item.id, true)}
            >
              <Archive className="h-4 w-4 mr-1.5" /> Archive
            </Button>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{pct}%</span>
            </div>
            <Slider
              key={`${item.id}-${pct}`}
              defaultValue={[pct]}
              min={0}
              max={100}
              step={5}
              onValueCommit={(v) => updateItem(item.id, { progress_pct: v[0] })}
            />
            <Progress value={pct} className="h-1" />
          </div>

          {item.dimension_tags && item.dimension_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.dimension_tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{PTP_DIMENSION_NAMES[tag] ?? tag}</span>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => toggleExpanded(item.id)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Log &amp; notes ({item.entries?.length ?? 0})
          </button>

          {isOpen && (
            <div className="space-y-4 pt-2 border-t">
              {item.entries && item.entries.length > 0 ? (
                <div className="space-y-2">
                  {item.entries.map((e) => (
                    <div key={e.id} className="flex items-start gap-2 text-sm">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">{formatDate(e.entry_date)}</p>
                        {e.note && <p className="mt-0.5">{e.note}</p>}
                        <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                          {e.progress_pct != null && <span>Progress: {e.progress_pct}%</span>}
                          {e.metric_value != null && (
                            <span>{e.metric_label ? `${e.metric_label}: ` : ""}{e.metric_value}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => deleteEntry(e.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No entries yet.</p>
              )}

              <div className="space-y-2 rounded-md bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">Add an entry</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={draft.entry_date}
                    onChange={(ev) => setDraft(item.id, { entry_date: ev.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Progress %"
                    value={draft.progress_pct}
                    onChange={(ev) => setDraft(item.id, { progress_pct: ev.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Metric value"
                    value={draft.metric_value}
                    onChange={(ev) => setDraft(item.id, { metric_value: ev.target.value })}
                  />
                  <Input
                    placeholder="Metric label"
                    value={draft.metric_label}
                    onChange={(ev) => setDraft(item.id, { metric_label: ev.target.value })}
                  />
                </div>
                <Textarea
                  placeholder="Note"
                  value={draft.note}
                  onChange={(ev) => setDraft(item.id, { note: ev.target.value })}
                  rows={2}
                />
                <Button size="sm" onClick={() => addEntry(item.id)}>Add entry</Button>
              </div>

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
                              {c.author_name ?? (c.author_role === "coach" ? "Coach" : "You")}
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
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--bw-navy)" }}>My Development Plan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track the actions you've chosen to work on, with progress, notes, and target dates.
          </p>
        </div>
        <div className="flex items-center gap-2">
        <ShareWithCoachDialog />
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add action</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add your own action</DialogTitle>
              <DialogDescription>Create a custom action to track alongside the ones from your reports.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Textarea
                placeholder="What do you want to work on?"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={3}
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Target date (optional)</span>
                <Input type="date" className="h-8 w-[160px]" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)} disabled={creating}>Cancel</Button>
              <Button onClick={createCustom} disabled={creating || !customText.trim()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add action
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </header>

      <Tabs defaultValue="mine">
        <TabsList className="mb-4">
          <TabsTrigger value="mine">My Development</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="paired">Paired</TabsTrigger>
        </TabsList>
        <TabsContent value="mine">

      {isLoading && (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      )}

      {error && !isLoading && (
        <p className="text-sm text-muted-foreground py-8">Could not load your development plan. Please try again.</p>
      )}

      {!isLoading && !error && (
        <>
          {activeItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center text-center gap-3">
                <Target className="h-10 w-10 text-muted-foreground" />
                <h2 className="text-lg font-semibold" style={{ color: "var(--bw-navy)" }}>Your development plan is empty</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Add actions from the Action Plan section of your PTP report, or add your own with the button above.
                </p>
                <Button onClick={() => navigate("/my-results")} className="mt-2">View my results</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">{activeItems.map(renderActiveItem)}</div>
          )}

          <div className="mt-8">
            <Button variant="ghost" size="sm" onClick={() => setIncludeArchived((v) => !v)}>
              {includeArchived ? "Hide archived" : "Show archived"}
            </Button>
            {includeArchived && (
              <div className="mt-3 space-y-2">
                {archivedItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No archived actions.</p>
                ) : (
                  archivedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-md border p-3 opacity-70">
                      <span className="flex-1 text-sm line-through">{item.action_text}</span>
                      <Button variant="ghost" size="sm" onClick={() => archiveItem(item.id, false)}>
                        <ArchiveRestore className="h-4 w-4 mr-1.5" /> Restore
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
