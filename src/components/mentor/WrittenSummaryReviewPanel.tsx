import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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
  const submission = detailQuery.data?.written_submission ?? null;

  const callReview = async (decision: "approved" | "revision_requested", comments: string | null) => {
    if (!submission?.id) {
      toast({ title: "No submission", description: "Cannot review yet.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.rpc("mentor_review_submission" as never, {
      p_submission_id: submission.id,
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (detailQuery.error || !contentItem) {
    return <p className="text-sm text-destructive py-8 text-center">Failed to load review details.</p>;
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

      {!submission ? (
        <p className="text-sm text-muted-foreground py-4">
          The trainee has not submitted this written summary yet.
        </p>
      ) : (
        <>
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Trainee submission</h4>
              {typeof submission.char_count === "number" && (
                <span className="text-xs text-muted-foreground">{submission.char_count} chars</span>
              )}
            </div>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {submission.content ?? ""}
            </p>
          </div>

          {submission.review_decision ? (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold">Review decision</h4>
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {String(submission.review_decision).replace(/_/g, " ")}
                </Badge>
              </div>
              {submission.reviewer_comments && (
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{submission.reviewer_comments}</p>
              )}
            </div>
          ) : (
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
                    {approving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
                    {requesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
