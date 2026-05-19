import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  item: any;
  userId: string;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp)$/i;

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground italic">{children}</div>;
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground min-w-[10rem]">{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

// ---------- Video ----------
function VideoArtifact({ item }: { item: any }) {
  const c = item?.completion;
  if (!c) return <EmptyNote>The learner has not started this item.</EmptyNote>;
  return (
    <div className="space-y-1">
      <KV label="Watch %" value={`${c.video_watch_pct ?? 0}%`} />
      <KV label="Threshold" value={`${item.video_completion_threshold_pct ?? "—"}%`} />
      <KV label="Last position (s)" value={c.video_last_position_seconds ?? "—"} />
      <KV label="Status" value={c.status ?? "—"} />
    </div>
  );
}

// ---------- get_content_item_for_viewer-backed views ----------
function useViewerDetail(contentItemId: string, userId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["admin-content-item-viewer", contentItemId, userId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_content_item_for_viewer" as never, {
        p_content_item_id: contentItemId,
        p_user_id: userId,
      } as never);
      if (error) throw error;
      return data as any;
    },
  });
}

function WrittenSummaryArtifact({ item, userId }: { item: any; userId: string }) {
  const q = useViewerDetail(item.content_item_id, userId, true);
  if (q.isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (q.error) return <EmptyNote>Could not load submission.</EmptyNote>;
  const completion = q.data?.completion;
  const submission = q.data?.written_submission ?? completion?.written_submission_text;
  if (!completion && !submission) {
    return <EmptyNote>The learner has not started this item.</EmptyNote>;
  }
  return (
    <div className="space-y-2">
      <KV label="Review status" value={completion?.written_review_status ?? "—"} />
      <KV label="Char count" value={submission ? String(submission.length) : "—"} />
      {completion?.reviewer_comments && (
        <KV label="Reviewer comments" value={completion.reviewer_comments} />
      )}
      <div className="text-sm font-medium pt-2">Submission</div>
      <div className="text-sm whitespace-pre-wrap rounded border p-3 bg-muted/30 max-h-60 overflow-y-auto">
        {submission ?? "(empty)"}
      </div>
    </div>
  );
}

function ExternalLinkArtifact({ item, userId }: { item: any; userId: string }) {
  const q = useViewerDetail(item.content_item_id, userId, true);
  if (q.isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (q.error) return <EmptyNote>Could not load completion.</EmptyNote>;
  const c = q.data?.completion;
  if (!c) return <EmptyNote>The learner has not started this item.</EmptyNote>;
  return (
    <div className="space-y-2">
      <KV label="Confirmed at" value={formatDate(c.external_link_confirmed_at)} />
      <KV label="URL" value={<span className="break-all">{item.external_url ?? "—"}</span>} />
      {c.external_link_reflection_text && (
        <>
          <div className="text-sm font-medium pt-2">Reflection</div>
          <div className="text-sm whitespace-pre-wrap rounded border p-3 bg-muted/30">
            {c.external_link_reflection_text}
          </div>
        </>
      )}
    </div>
  );
}

function LiveEventArtifact({ item, userId }: { item: any; userId: string }) {
  const q = useViewerDetail(item.content_item_id, userId, true);
  if (q.isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (q.error) return <EmptyNote>Could not load completion.</EmptyNote>;
  const c = q.data?.completion;
  if (!c) return <EmptyNote>The learner has not started this item.</EmptyNote>;
  return (
    <div className="space-y-1">
      <KV label="Attendance" value={c.live_event_attendance_status ?? "—"} />
      <KV label="Event at" value={formatDate(item.event_scheduled_at)} />
      {c.reviewer_comments && <KV label="Mentor notes" value={c.reviewer_comments} />}
    </div>
  );
}

// ---------- Skills practice ----------
function SkillsAttachment({
  label,
  contentItemId,
  userId,
  hasUrl,
}: {
  label: string;
  contentItemId: string;
  userId: string;
  hasUrl: boolean;
}) {
  const q = useQuery({
    queryKey: ["admin-skills-attachment", contentItemId, userId, label],
    enabled: hasUrl,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "skills-practice-attachment-upload",
        { body: { action: "read", content_item_id: contentItemId, role: "mentor", trainee_user_id: userId } },
      );
      if (error) throw error;
      return data as { signed_url: string };
    },
  });
  if (!hasUrl) return <span className="text-muted-foreground text-sm">{label}: —</span>;
  if (q.isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (!q.data?.signed_url) return <span className="text-muted-foreground text-sm">{label}: (unavailable)</span>;
  return (
    <a href={q.data.signed_url} target="_blank" rel="noreferrer" className="text-sm underline">
      {label}
    </a>
  );
}

function SkillsPracticeArtifact({ item, userId }: { item: any; userId: string }) {
  const q = useViewerDetail(item.content_item_id, userId, true);
  if (q.isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (q.error) return <EmptyNote>Could not load completion.</EmptyNote>;
  const c = q.data?.completion;
  if (!c) return <EmptyNote>The learner has not started this item.</EmptyNote>;
  const iterations: any[] = Array.isArray(q.data?.skills_iterations) ? q.data.skills_iterations : [];
  return (
    <div className="space-y-2">
      <KV label="Trainee signed off" value={c.skills_trainee_signed_off ? "Yes" : "No"} />
      <KV label="Mentor signed off" value={c.skills_mentor_signed_off ? "Yes" : "No"} />
      <div className="flex gap-3">
        <SkillsAttachment
          label="Trainee attachment"
          contentItemId={item.content_item_id}
          userId={userId}
          hasUrl={!!c.skills_attachment_url}
        />
        <SkillsAttachment
          label="Mentor attachment"
          contentItemId={item.content_item_id}
          userId={userId}
          hasUrl={!!c.skills_mentor_attachment_url}
        />
      </div>
      {iterations.length > 0 && (
        <div>
          <div className="text-sm font-medium pt-2">Iterations ({iterations.length})</div>
          <div className="space-y-1 text-sm">
            {iterations.map((it: any, idx: number) => (
              <div key={it.id ?? idx} className="rounded border p-2 bg-muted/20">
                <div className="text-xs text-muted-foreground">{formatDate(it.created_at)}</div>
                {it.notes && <div className="text-sm">{it.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Quiz ----------
function QuizAttemptDetail({ attemptId, mode }: { attemptId: string; mode: string | null }) {
  const q = useQuery({
    queryKey: ["admin-quiz-attempt-results", attemptId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_quiz_attempt_results" as never, {
        p_attempt_id: attemptId,
      } as never);
      if (error) throw error;
      return data as any;
    },
  });
  if (q.isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (q.error || !q.data) return <EmptyNote>Could not load attempt detail.</EmptyNote>;
  const reveal = q.data.reveal_correctness !== false; // default to true if undefined
  const questions: any[] = Array.isArray(q.data.questions) ? q.data.questions : [];
  return (
    <div className="space-y-2 mt-2">
      {!reveal && (
        <div className="text-xs italic text-muted-foreground">
          Correct answers hidden by this quiz's reveal settings ({mode ?? "—"}).
        </div>
      )}
      {questions.map((qn: any, i: number) => (
        <div key={qn.question_id ?? i} className="rounded border p-2 text-sm bg-muted/20">
          <div className="font-medium">
            {i + 1}. {qn.prompt ?? qn.question_text ?? "(question)"}
          </div>
          <div className="text-muted-foreground mt-1">
            Answer: {JSON.stringify(qn.learner_answer ?? qn.answer ?? null)}
          </div>
          {reveal && qn.is_correct !== undefined && (
            <div className={qn.is_correct ? "text-emerald-700" : "text-destructive"}>
              {qn.is_correct ? "Correct" : "Incorrect"}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function QuizArtifact({ item, userId }: { item: any; userId: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const attemptsQ = useQuery({
    queryKey: ["admin-quiz-attempts", item.content_item_id, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id,attempt_number,score_pct,passed,pass_threshold_pct,submitted_at,started_at")
        .eq("user_id", userId)
        .eq("content_item_id", item.content_item_id)
        .order("attempt_number", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  if (attemptsQ.isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (attemptsQ.error) return <EmptyNote>Could not load attempts.</EmptyNote>;
  const attempts = attemptsQ.data ?? [];
  if (attempts.length === 0) return <EmptyNote>The learner has not started this item.</EmptyNote>;
  return (
    <div className="space-y-2">
      {attempts.map((a: any) => {
        const open = expandedId === a.id;
        return (
          <div key={a.id} className="rounded border bg-muted/10">
            <button
              type="button"
              onClick={() => setExpandedId(open ? null : a.id)}
              className="w-full flex items-center gap-2 p-2 text-left text-sm hover:bg-muted/30"
            >
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span>Attempt #{a.attempt_number}</span>
              <Badge variant={a.passed ? "default" : "secondary"}>
                {a.passed ? "Passed" : "Failed"}
              </Badge>
              <span className="text-muted-foreground">{a.score_pct ?? "—"}%</span>
              <span className="text-muted-foreground ml-auto text-xs">
                {formatDate(a.submitted_at ?? a.started_at)}
              </span>
            </button>
            {open && (
              <div className="px-2 pb-2">
                <QuizAttemptDetail attemptId={a.id} mode={item.quiz_show_correct_mode ?? null} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- File upload ----------
function FileUploadArtifact({ item, userId }: { item: any; userId: string }) {
  const q = useQuery({
    queryKey: ["admin-file-upload-read", item.content_item_id, userId],
    queryFn: async () => {
      const res = await supabase.functions.invoke("content-item-file-upload", {
        body: { action: "read", content_item_id: item.content_item_id, target_user_id: userId },
      });
      if (res.error) {
        // Try to parse the error body for the no_file code.
        const ctxResp = (res.error as any)?.context?.response;
        if (ctxResp && typeof ctxResp.json === "function") {
          try {
            const body = await ctxResp.json();
            if (body?.error === "no_file") return { noFile: true } as const;
          } catch {
            /* fall through */
          }
        }
        throw res.error;
      }
      return res.data as { signed_url: string; filename: string };
    },
  });
  if (q.isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (q.error) return <EmptyNote>Could not load file: {(q.error as Error).message}</EmptyNote>;
  if ((q.data as any)?.noFile) {
    return <EmptyNote>The learner has not uploaded a file.</EmptyNote>;
  }
  const data = q.data as { signed_url: string; filename: string };
  const isImage = IMAGE_EXT.test(data.filename ?? "");
  return (
    <div className="space-y-2">
      <KV label="Filename" value={data.filename} />
      {isImage ? (
        <img
          src={data.signed_url}
          alt={data.filename}
          className="max-h-80 rounded border"
        />
      ) : (
        <a href={data.signed_url} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">
            Download {data.filename}
          </Button>
        </a>
      )}
    </div>
  );
}

// ---------- Lesson blocks ----------
function LessonBlocksArtifact({ item, userId }: { item: any; userId: string }) {
  const q = useQuery({
    queryKey: ["admin-lesson-block-progress", item.content_item_id, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_block_progress")
        .select("block_id,attempt_number,status,started_at,completed_at")
        .eq("user_id", userId)
        .eq("content_item_id", item.content_item_id)
        .order("block_id");
      if (error) throw error;
      return data ?? [];
    },
  });
  if (q.isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (q.error) return <EmptyNote>Could not load block progress.</EmptyNote>;
  const rows = q.data ?? [];
  if (rows.length === 0) return <EmptyNote>The learner has not started this item.</EmptyNote>;
  return (
    <div className="text-sm">
      <table className="w-full">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 pr-2">Block</th>
            <th className="py-1 pr-2">Attempt</th>
            <th className="py-1 pr-2">Status</th>
            <th className="py-1">Completed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={`${r.block_id}-${r.attempt_number}`} className="border-t">
              <td className="py-1 pr-2 font-mono text-xs">{String(r.block_id).slice(0, 8)}…</td>
              <td className="py-1 pr-2">{r.attempt_number ?? "—"}</td>
              <td className="py-1 pr-2">
                <Badge variant="outline">{r.status ?? "—"}</Badge>
              </td>
              <td className="py-1">{formatDate(r.completed_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Dispatcher ----------
export default function ContentItemArtifactPanel({ item, userId }: Props) {
  const itemType = item?.item_type;
  let body: React.ReactNode = null;
  switch (itemType) {
    case "video":
      body = <VideoArtifact item={item} />;
      break;
    case "written_summary":
      body = <WrittenSummaryArtifact item={item} userId={userId} />;
      break;
    case "external_link":
      body = <ExternalLinkArtifact item={item} userId={userId} />;
      break;
    case "live_event":
      body = <LiveEventArtifact item={item} userId={userId} />;
      break;
    case "skills_practice":
      body = <SkillsPracticeArtifact item={item} userId={userId} />;
      break;
    case "quiz":
      body = <QuizArtifact item={item} userId={userId} />;
      break;
    case "file_upload":
      body = <FileUploadArtifact item={item} userId={userId} />;
      break;
    case "lesson_blocks":
      body = <LessonBlocksArtifact item={item} userId={userId} />;
      break;
    default:
      body = <EmptyNote>Unsupported item type: {String(itemType)}</EmptyNote>;
  }
  return (
    <div className="rounded-md border bg-card p-3 mt-1 ml-6">
      <div className="text-xs text-muted-foreground mb-2">Type: {itemType}</div>
      {body}
    </div>
  );
}
