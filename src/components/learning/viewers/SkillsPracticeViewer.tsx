import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleCheck,
  Clock,
  Loader2,
  MessageCircle,
  Paperclip,
  Upload,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { CascadeResult } from "@/hooks/useCompletionReporter";

interface ViewerProps {
  contentItem: any;
  completion: any | null;
  viewerRole: "self" | "mentor" | "super_admin";
  reportCompletion: (
    rpcName: string,
    rpcArgs: Record<string, unknown>,
  ) => Promise<{ ok: boolean; cascade: CascadeResult | null; result?: unknown; error?: string }>;
  isReporting: boolean;
}

const MAX_BYTES = 200 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

function formatDate(d?: string | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

function mapSignoffError(msg?: string) {
  if (!msg) return "Could not record sign-off. Please try again.";
  if (msg.includes("trainee_signoff_not_permitted_for_this_item"))
    return "This item requires a mentor sign-off.";
  return msg;
}

export default function SkillsPracticeViewer({
  contentItem,
  completion,
  viewerRole,
  reportCompletion,
  isReporting,
}: ViewerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const isSelf = viewerRole === "self";
  const signoffRequired: "trainee_only" | "mentor_only" | "both_required" =
    contentItem.skills_signoff_required ?? "trainee_only";
  const allowAttachment = contentItem.skills_optional_attachment === true;
  const actorRequired = contentItem.skills_actor_invitation_required === true;

  const traineeSigned = completion?.skills_trainee_signed_off === true;
  const mentorSigned = completion?.skills_mentor_signed_off === true;
  const traineeSignedAt = completion?.skills_trainee_signed_off_at as string | null;
  const mentorSignedAt = completion?.skills_mentor_signed_off_at as string | null;
  const isCompleted = completion?.status === "completed";
  const revisionComment = completion?.skills_revision_comment as string | null;
  const revisionAt = completion?.skills_revision_requested_at as string | null;
  const hasRevision = typeof revisionComment === "string" && revisionComment.length > 0;
  const hasAttachment = !!completion?.skills_attachment_url;

  // Fetch viewable URL for existing trainee attachment
  const attachmentQuery = useQuery({
    queryKey: ["skills-practice-attachment", contentItem.id, completion?.id, "trainee"],
    enabled: hasAttachment,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "skills-practice-attachment-upload",
        {
          body: {
            action: "read",
            content_item_id: contentItem.id,
            role: "trainee",
          },
        },
      );
      if (error) throw error;
      return data as { signed_url: string; storage_path: string; expires_in_seconds: number };
    },
  });

  const handleSignoff = async () => {
    const res = await reportCompletion("mark_skills_practice_signoff", {
      p_content_item_id: contentItem.id,
      p_signoff_type: "trainee",
    });
    if (!res.ok) {
      toast({
        title: "Could not record sign-off",
        description: mapSignoffError(res.error),
        variant: "destructive",
      });
    }
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_BYTES) {
      toast({
        title: "File too large",
        description: "File exceeds the 200 MB limit.",
        variant: "destructive",
      });
      return;
    }
    if (file.type && !ALLOWED_MIME.has(file.type)) {
      toast({
        title: "Unsupported file type",
        description: "That file type isn't supported.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const reqRes = await supabase.functions.invoke(
        "skills-practice-attachment-upload",
        {
          body: {
            action: "request",
            content_item_id: contentItem.id,
            role: "trainee",
            mime_type: file.type,
            size_bytes: file.size,
            original_filename: file.name,
          },
        },
      );
      if (reqRes.error) throw reqRes.error;
      const { bucket, storage_path, upload_token } = reqRes.data as {
        bucket: string;
        storage_path: string;
        upload_token: string;
      };

      const up = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(storage_path, upload_token, file);
      if (up.error) throw up.error;

      const fin = await supabase.functions.invoke(
        "skills-practice-attachment-upload",
        {
          body: {
            action: "finalize",
            content_item_id: contentItem.id,
            role: "trainee",
            storage_path,
          },
        },
      );
      if (fin.error) throw fin.error;

      await queryClient.invalidateQueries({
        queryKey: ["content-item-viewer", contentItem.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["skills-practice-attachment", contentItem.id],
      });

      toast({ title: "Attachment uploaded" });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Decide which action panel to render
  const showTraineeSignoffButton =
    isSelf &&
    !isCompleted &&
    !hasRevision &&
    (signoffRequired === "trainee_only" ||
      (signoffRequired === "both_required" && !traineeSigned));

  const showAwaitingMentor =
    !isCompleted &&
    !hasRevision &&
    ((signoffRequired === "mentor_only") ||
      (signoffRequired === "both_required" && traineeSigned && !mentorSigned));

  const attachmentMime = attachmentQuery.data
    ? (completion?.skills_attachment_mime as string | undefined)
    : undefined;
  const isImageAttachment =
    typeof attachmentMime === "string" && attachmentMime.startsWith("image/");

  return (
    <div className="space-y-6">
      {/* Scenario */}
      <div className="rounded-lg border bg-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">Practice scenario</h2>
        {contentItem.description ? (
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {contentItem.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No scenario provided.
          </p>
        )}

        {actorRequired && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground border-t pt-3 mt-3">
            <Users className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              This practice involves an assessment actor. Coordination details
              will be provided separately.
            </span>
          </div>
        )}
      </div>

      {/* Revision requested */}
      {hasRevision && (
        <div
          className="rounded-lg border p-5 space-y-3"
          style={{
            backgroundColor: "color-mix(in srgb, var(--bw-mustard) 10%, transparent)",
            borderColor: "color-mix(in srgb, var(--bw-mustard) 40%, transparent)",
          }}
        >
          <div className="flex items-center gap-2">
            <MessageCircle
              className="h-5 w-5"
              style={{ color: "var(--bw-mustard)" }}
            />
            <h3 className="font-semibold">Revision requested</h3>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">
            {revisionComment}
          </p>
          {revisionAt && (
            <p className="text-xs text-muted-foreground">
              Requested {formatDate(revisionAt)}
            </p>
          )}
          {isSelf && (
            <Button
              onClick={handleSignoff}
              disabled={isReporting}
              className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
            >
              {isReporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Resubmit for sign-off
            </Button>
          )}
        </div>
      )}

      {/* Completed */}
      {isCompleted && (
        <div
          className="rounded-lg border p-5 space-y-2"
          style={{
            backgroundColor: "color-mix(in srgb, var(--bw-forest) 5%, transparent)",
            borderColor: "color-mix(in srgb, var(--bw-forest) 30%, transparent)",
          }}
        >
          <div className="flex items-center gap-2">
            <CircleCheck className="h-5 w-5" style={{ color: "var(--bw-forest)" }} />
            <h3 className="font-semibold">Practice completed</h3>
          </div>
          <div className="text-sm text-foreground/90 space-y-1">
            {traineeSignedAt && (
              <p>You signed off on {formatDate(traineeSignedAt)}.</p>
            )}
            {mentorSignedAt && (
              <p>Mentor signed off on {formatDate(mentorSignedAt)}.</p>
            )}
          </div>
        </div>
      )}

      {/* Awaiting mentor sign-off */}
      {showAwaitingMentor && (
        <div
          className="rounded-lg border p-5 space-y-2"
          style={{
            backgroundColor: "color-mix(in srgb, var(--bw-teal) 5%, transparent)",
            borderColor: "color-mix(in srgb, var(--bw-teal) 30%, transparent)",
          }}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" style={{ color: "var(--bw-teal)" }} />
            <h3 className="font-semibold">Awaiting mentor sign-off</h3>
          </div>
          <p className="text-sm text-foreground/90">
            {signoffRequired === "mentor_only"
              ? "A mentor will review this practice and sign off when it's complete. You can continue with other items in the meantime."
              : "You've done your part — a mentor will review and sign off. You can continue with other items in the meantime."}
          </p>
          {traineeSignedAt && signoffRequired === "both_required" && (
            <p className="text-xs text-muted-foreground">
              Your sign-off recorded {formatDate(traineeSignedAt)}.
            </p>
          )}
        </div>
      )}

      {/* Trainee sign-off action */}
      {showTraineeSignoffButton && (
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <h3 className="font-semibold">Ready to mark this complete?</h3>
          <p className="text-sm text-muted-foreground">
            Confirm that you've completed this practice scenario.
          </p>
          <Button
            onClick={handleSignoff}
            disabled={isReporting}
            className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
          >
            {isReporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            I've completed this practice
          </Button>
        </div>
      )}

      {/* Optional attachment */}
      {allowAttachment && (
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Supporting evidence (optional)</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Attach a photo, video, or document of your completed practice. This
            is optional and doesn't affect sign-off.
          </p>

          {hasAttachment ? (
            <div className="space-y-3">
              {attachmentQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading attachment…
                </div>
              ) : attachmentQuery.data ? (
                <>
                  {isImageAttachment && (
                    <img
                      src={attachmentQuery.data.signed_url}
                      alt="Practice attachment"
                      className="max-h-64 rounded-md border"
                    />
                  )}
                  <a
                    href={attachmentQuery.data.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-[var(--bw-teal)] underline underline-offset-2"
                  >
                    Open attachment
                  </a>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Attachment unavailable.
                </p>
              )}

              {isSelf && (
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePickFile}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Replace
                  </Button>
                </div>
              )}
            </div>
          ) : (
            isSelf && (
              <div>
                <Button
                  variant="outline"
                  onClick={handlePickFile}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? "Uploading…" : "Choose file"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Up to 200 MB. Images, video (mp4/webm/mov), PDF, or Office docs.
                </p>
              </div>
            )
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelected}
            accept="image/*,video/mp4,video/webm,video/quicktime,application/pdf,.docx,.xlsx,.pptx"
          />
        </div>
      )}
    </div>
  );
}
