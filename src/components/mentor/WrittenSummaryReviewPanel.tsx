import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

type WrittenSubmission = {
  id: string;
  completion_id: string | null;
  iteration_number: number;
  content: string;
  char_count: number;
  submitted_at: string;
  review_decision: "approved" | "revision_requested" | null;
  reviewer_comments: string | null;
  reviewer_user_id: string | null;
  reviewed_at: string | null;
};

function formatDateTime(d?: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return d;
  }
}

interface Props {
  contentItemId: string;
  traineeId: string;
  onActionComplete: () => void;
}

export default function WrittenSummaryReviewPanel({ contentItemId, traineeId, onActionComplete }: Props) {
  const { toast } = useToast();
  const [approveComment, setApproveComment] = useState("");
  const [revisionComment, setRevisionComment] = useState("");
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [approving, setApproving] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["get_content_item_for_viewer", contentItemId, traineeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_content_item_for_viewer" as never, {
        p_content_item_id: contentItemId,
        p_user_id: traineeId,
      } as never);
      if (error) throw error;
      return data as any;
    },
  });

  const contentItem = detailQuery.data?.content_item ?? null;
  const submissions: WrittenSubmission[] = Array.isArray(detailQuery.data?.written_submissions)
    ? detailQuery.data.written_submissions
    : [];
  const latest: WrittenSubmission | null =
    submissions.length > 0 ? submissions[submissions.length - 1] : null;

  const callReview = async (decision: "approved" | "revision_requested", comments: string | null) => {
    if (!latest?.id) {
      toast({ title: "No submission", description: "Cannot review yet.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.rpc("mentor_review_submission" as never, {
      p_submission_id: latest.id,
      p_decision: decision,
      p_comments: comments,
    } as never);
    if (error) throw error;
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await callReview("approved", approveComment.trim() || null);
      toast({ title: "Submission approved" });
      onActionComplete();
      detailQuery.refetch();
    } catch (err: any) {
      toast({ title: "Could not approve", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setApproving(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionComment.trim()) {
      toast({ title: "Comment required", description: "Please add a revision comment.", variant: "destructive" });
      return;
    }
    setRequesting(true);
    try {
      await callReview("revision_requested", revisionComment.trim());
      toast({ title: "Revision requested" });
      setShowRevisionInput(false);
      setRevisionComment("");
      onActionComplete();
      detailQuery.refetch();
    } catch (err: any) {
      toast({ title: "Could not request revision", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setRequesting(false);
    }
  };

  if (detailQuery.isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading"
        className="flex items-center justify-center py-12"
      >
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (detailQuery.error || !contentItem) {
    return (
      <div className="py-8 text-center space-y-3">
        <p className="text-sm text-destructive">Failed to load review details.</p>
        <Button variant="outline" size="sm" onClick={() => detailQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-semibold text-base">{contentItem.title ?? "Untitled"}</h3>
        {contentItem.description && (
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {contentItem.description}
          </p>
        )}
      </div>

      {submissions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          The trainee has not submitted this written summary yet.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Iteration history</h4>
            {submissions.map((s, idx) => {
              const isLatest = idx === submissions.length - 1;
              const decisionLabel =
                s.review_decision === "approved"
                  ? "Approved"
                  : s.review_decision === "revision_requested"
                    ? "Revision requested"
                    : null;
              return (
                <div key={s.id} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Iteration {s.iteration_number}</span>
                      {decisionLabel && (
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {decisionLabel}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDateTime(s.submitted_at)}</span>
                  </div>

                  <Collapsible defaultOpen={isLatest} className="group">
                    <div className="text-sm text-foreground/90 leading-relaxed group-data-[state=open]:hidden">
                      {s.content && s.content.length > 120 ? s.content.slice(0, 120) + "…" : s.content ?? ""}
                    </div>
                    <CollapsibleContent>
                      <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {s.content ?? ""}
                      </div>
                    </CollapsibleContent>
                    <div className="flex items-center justify-between pt-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <span className="group-data-[state=open]:hidden">Show full submission</span>
                          <span className="group-data-[state=closed]:hidden">Hide</span>
                        </Button>
                      </CollapsibleTrigger>
                      <span className="text-xs text-muted-foreground">{s.char_count} chars</span>
                    </div>
                  </Collapsible>

                  {s.review_decision && (
                    <div className="pt-2 border-t space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Review decision</span>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {decisionLabel}
                        </Badge>
                      </div>
                      {s.reviewer_comments &&
                        (s.reviewer_comments.length > 200 ? (
                          <Collapsible defaultOpen={false} className="group">
                            <div className="text-sm whitespace-pre-wrap group-data-[state=open]:hidden">
                              {s.reviewer_comments.slice(0, 80) + "…"}
                            </div>
                            <CollapsibleContent>
                              <div className="text-sm whitespace-pre-wrap">{s.reviewer_comments}</div>
                            </CollapsibleContent>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <span className="group-data-[state=open]:hidden">Show full comment</span>
                                <span className="group-data-[state=closed]:hidden">Hide</span>
                              </Button>
                            </CollapsibleTrigger>
                          </Collapsible>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{s.reviewer_comments}</p>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {latest && latest.review_decision === null && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h4 className="text-sm font-semibold">Mentor actions</h4>
              <div className="space-y-2">
                <Textarea
                  value={approveComment}
                  onChange={(e) => setApproveComment(e.target.value)}
                  placeholder="Optional comment for approval…"
                  rows={2}
                />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleApprove} disabled={approving || requesting}>
                    {approving && <Loader2 aria-hidden="true" className="h-4 w-4 mr-2 animate-spin" />}
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRevisionInput((s) => !s)}
                    disabled={approving || requesting}
                  >
                    Request Revision
                  </Button>
                </div>
              </div>

              {showRevisionInput && (
                <div className="space-y-2 pt-2 border-t">
                  <Textarea
                    value={revisionComment}
                    onChange={(e) => setRevisionComment(e.target.value)}
                    placeholder="Explain what the trainee should revise…"
                    rows={4}
                  />
                  <Button
                    size="sm"
                    onClick={handleRequestRevision}
                    disabled={requesting || !revisionComment.trim()}
                  >
                    {requesting && <Loader2 aria-hidden="true" className="h-4 w-4 mr-2 animate-spin" />}
                    Submit revision request
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
