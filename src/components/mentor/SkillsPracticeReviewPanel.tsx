import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck, Loader2, Paperclip, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  contentItemId: string;
  traineeId: string;
  onActionComplete: () => void;
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
    return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

export default function SkillsPracticeReviewPanel({ contentItemId, traineeId, onActionComplete }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [signingOff, setSigningOff] = useState(false);
  const [requestingRevision, setRequestingRevision] = useState(false);
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [revisionComment, setRevisionComment] = useState("");

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
  const completion = detailQuery.data?.completion ?? null;
  const iterations: any[] = Array.isArray(detailQuery.data?.skills_iterations)
    ? detailQuery.data.skills_iterations
    : [];

  const traineeAttachmentUrl = completion?.skills_attachment_url ?? null;
  const mentorAttachmentUrl = completion?.skills_mentor_attachment_url ?? null;
  const mentorSigned = completion?.skills_mentor_signed_off === true;

  const traineeAttachmentQuery = useQuery({
    queryKey: ["skills-practice-attachment", contentItemId, traineeId, "trainee-view"],
    enabled: !!traineeAttachmentUrl,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("skills-practice-attachment-upload", {
        body: { action: "read", content_item_id: contentItemId, role: "trainee", trainee_user_id: traineeId },
      });
      if (error) throw error;
      return data as { signed_url: string };
    },
  });

  const mentorAttachmentQuery = useQuery({
    queryKey: ["skills-practice-attachment", contentItemId, traineeId, "mentor-view"],
    enabled: !!mentorAttachmentUrl,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("skills-practice-attachment-upload", {
        body: { action: "read", content_item_id: contentItemId, role: "mentor", trainee_user_id: traineeId },
      });
      if (error) throw error;
      return data as { signed_url: string };
    },
  });

  const handleSignOff = async () => {
    setSigningOff(true);
    try {
      const { error } = await supabase.rpc("mark_skills_practice_signoff" as never, {
        p_content_item_id: contentItemId,
        p_signoff_type: "mentor",
        p_trainee_user_id: traineeId,
      } as never);
      if (error) throw error;
      toast({ title: "Sign-off recorded" });
      onActionComplete();
      detailQuery.refetch();
    } catch (err: any) {
      toast({ title: "Could not sign off", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setSigningOff(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionComment.trim()) {
      toast({ title: "Comment required", description: "Please add a revision comment.", variant: "destructive" });
      return;
    }
    setRequestingRevision(true);
    try {
      const { error } = await supabase.rpc("request_skills_revision" as never, {
        p_content_item_id: contentItemId,
        p_trainee_user_id: traineeId,
        p_revision_comment: revisionComment.trim(),
      } as never);
      if (error) throw error;
      toast({ title: "Revision requested" });
      setShowRevisionInput(false);
      setRevisionComment("");
      onActionComplete();
      detailQuery.refetch();
    } catch (err: any) {
      toast({ title: "Could not request revision", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setRequestingRevision(false);
    }
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast({ title: "File too large", description: "File exceeds the 200 MB limit.", variant: "destructive" });
      return;
    }
    if (file.type && !ALLOWED_MIME.has(file.type)) {
      toast({ title: "Unsupported file type", description: "That file type isn't supported.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const reqRes = await supabase.functions.invoke("skills-practice-attachment-upload", {
        body: {
          action: "request",
          content_item_id: contentItemId,
          role: "mentor",
          trainee_user_id: traineeId,
          mime_type: file.type,
          size_bytes: file.size,
          original_filename: file.name,
        },
      });
      if (reqRes.error) throw reqRes.error;
      const { bucket, storage_path, upload_token } = reqRes.data as {
        bucket: string;
        storage_path: string;
        upload_token: string;
      };

      const up = await supabase.storage.from(bucket).uploadToSignedUrl(storage_path, upload_token, file);
      if (up.error) throw up.error;

      const fin = await supabase.functions.invoke("skills-practice-attachment-upload", {
        body: {
          action: "finalize",
          content_item_id: contentItemId,
          role: "mentor",
          trainee_user_id: traineeId,
          storage_path,
        },
      });
      if (fin.error) throw fin.error;

      toast({ title: "Attachment uploaded" });
      onActionComplete();
      detailQuery.refetch();
      mentorAttachmentQuery.refetch();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
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


  const traineeMime: string | undefined = completion?.skills_attachment_mime;
  const mentorMime: string | undefined = completion?.skills_mentor_attachment_mime;
  const isImage = (m?: string) => typeof m === "string" && m.startsWith("image/");

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

      {/* Trainee attachment */}
      {traineeAttachmentUrl && (
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Trainee attachment</h4>
          </div>
          {traineeAttachmentQuery.isLoading ? (
            <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Loading…
            </div>

          ) : traineeAttachmentQuery.data ? (
            <>
              {isImage(traineeMime) && (
                <img src={traineeAttachmentQuery.data.signed_url} alt="Trainee attachment" className="max-h-64 rounded-md border" />
              )}
              <a
                href={traineeAttachmentQuery.data.signed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-primary underline underline-offset-2"
              >
                Open attachment
              </a>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Attachment unavailable.</p>
          )}
        </div>
      )}

      {/* Attempt history */}
      {iterations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Attempt history</h4>
          <div className="space-y-2">
            {iterations
              .slice()
              .reverse()
              .map((it, idx) => {
                const attemptNumber = iterations.length - idx;
                return (
                  <div key={it.id ?? attemptNumber} className="rounded-md border p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Attempt {attemptNumber}</span>
                      {it.outcome && (
                        <Badge variant="secondary" className="text-[10px]">
                          {it.outcome}
                        </Badge>
                      )}
                    </div>
                    {it.trainee_signed_off_at && (
                      <p className="text-xs text-muted-foreground">
                        Trainee signed off {formatDate(it.trainee_signed_off_at)}
                      </p>
                    )}
                    {it.mentor_signed_off_at && (
                      <p className="text-xs text-muted-foreground">
                        Mentor signed off {formatDate(it.mentor_signed_off_at)}
                      </p>
                    )}
                    {it.revision_comment && (
                      <p className="text-xs text-foreground/80 whitespace-pre-wrap mt-1">
                        <span className="font-medium">Revision comment:</span> {it.revision_comment}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Mentor actions */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h4 className="text-sm font-semibold">Mentor actions</h4>
        {mentorSigned ? (
          <div className="flex items-center gap-2 text-sm">
            <CircleCheck className="h-4 w-4" style={{ color: "var(--bw-forest)" }} aria-hidden="true" />
            <span>
              You signed off
              {completion?.skills_mentor_signed_off_at ? ` on ${formatDate(completion.skills_mentor_signed_off_at)}` : ""}.
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSignOff} disabled={signingOff || requestingRevision}>
              {signingOff && <Loader2 aria-hidden="true" className="h-4 w-4 mr-2 animate-spin" />}
              Sign Off
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowRevisionInput((s) => !s)}
              disabled={signingOff || requestingRevision}
            >
              Request Revision
            </Button>
          </div>
        )}

        {showRevisionInput && !mentorSigned && (
          <div className="space-y-2">
            <Textarea
              value={revisionComment}
              onChange={(e) => setRevisionComment(e.target.value)}
              placeholder="Explain what the trainee should revise…"
              rows={4}
            />
            <Button
              size="sm"
              onClick={handleRequestRevision}
              disabled={requestingRevision || !revisionComment.trim()}
            >
              {requestingRevision && <Loader2 aria-hidden="true" className="h-4 w-4 mr-2 animate-spin" />}
              Submit revision request
            </Button>
          </div>
        )}
      </div>

      {/* Mentor attachment */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Your attachment (mentor)</h4>
        </div>
        {mentorAttachmentUrl ? (
          mentorAttachmentQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : mentorAttachmentQuery.data ? (
            <div className="space-y-2">
              {isImage(mentorMime) && (
                <img src={mentorAttachmentQuery.data.signed_url} alt="Mentor attachment" className="max-h-64 rounded-md border" />
              )}
              <a
                href={mentorAttachmentQuery.data.signed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-primary underline underline-offset-2"
              >
                Open attachment
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Attachment unavailable.</p>
          )
        ) : null}

        <div>
          <Button variant="outline" size="sm" onClick={handlePickFile} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {mentorAttachmentUrl ? "Replace" : "Upload attachment"}
          </Button>
          <p className={cn("text-xs text-muted-foreground mt-2")}>
            Up to 200 MB. Images, video (mp4/webm/mov), PDF, or Office docs.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelected}
          accept="image/*,video/mp4,video/webm,video/quicktime,application/pdf,.docx,.xlsx,.pptx"
        />
      </div>
    </div>
  );
}
