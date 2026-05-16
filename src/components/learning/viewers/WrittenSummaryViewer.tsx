import { useState } from "react";
import { Loader2, Sparkles, CircleCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { CascadeResult } from "@/hooks/useCompletionReporter";

interface ViewerProps {
  contentItem: any;
  completion: any | null;
  viewerRole: "self" | "mentor" | "super_admin";
  reportCompletion: (
    rpcName: string,
    rpcArgs: Record<string, unknown>,
  ) => Promise<{ ok: boolean; cascade: CascadeResult | null; error?: string }>;
  isReporting: boolean;
}

export default function WrittenSummaryViewer({
  contentItem,
  completion,
  viewerRole,
  reportCompletion,
  isReporting,
}: ViewerProps) {
  const { toast } = useToast();
  const minChars = Number(contentItem.written_min_chars ?? 0);
  const maxChars = contentItem.written_max_chars ? Number(contentItem.written_max_chars) : null;
  const completionMode = contentItem.written_completion_mode as string | null;
  const status = completion?.status as string | null;
  const reviewStatus = completion?.written_review_status as string | null;
  const isSelf = viewerRole === "self";
  const alreadySubmitted = status === "completed" || status === "submitted" || !!reviewStatus;

  const [text, setText] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [assistUsed, setAssistUsed] = useState(false);

  if (!isSelf) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <h3 className="text-sm font-semibold">Submission</h3>
        <p className="text-sm text-muted-foreground">
          {alreadySubmitted ? `Submission on file. Review status: ${reviewStatus ?? "—"}` : "No submission yet."}
        </p>
      </div>
    );
  }

  if (alreadySubmitted) {
    const completed = status === "completed";
    return (
      <div className="rounded-lg border bg-card p-6 space-y-3">
        <div className="flex items-center gap-2 text-sm" style={{ color: completed ? "var(--bw-forest)" : "var(--bw-amber)" }}>
          <CircleCheck className="h-4 w-4" />
          {completed ? "Completed" : `Submitted for review${reviewStatus ? ` (${reviewStatus})` : ""}`}
        </div>
        {completion?.reviewer_comments && (
          <div className="text-sm text-foreground/90">
            <div className="font-semibold mb-1">Reviewer comments</div>
            <p>{completion.reviewer_comments}</p>
          </div>
        )}
      </div>
    );
  }

  const length = text.length;
  const meetsMin = length >= minChars;
  const meetsMax = maxChars === null || length <= maxChars;
  const canSubmit = meetsMin && meetsMax && !isReporting;

  const generateSuggestion = async () => {
    setDrafting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("content-item-ai-assist", {
        body: {
          content_item_id: contentItem.id,
          assist_type: "written_summary_starter",
        },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) {
        // FunctionsHttpError exposes the response on .context
        const ctx = (error as any)?.context;
        let payload: any = null;
        if (ctx && typeof ctx.json === "function") {
          try {
            payload = await ctx.json();
          } catch {
            /* ignore */
          }
        }
        if (payload?.error === "ai_assist_already_used") {
          setAssistUsed(true);
          return;
        }
        throw error;
      }
      const payload = data as any;
      if (payload?.error === "ai_assist_already_used") {
        setAssistUsed(true);
        return;
      }
      setSuggestion(payload?.text ?? null);
      setAssistUsed(true);
    } catch (e: any) {
      toast({
        title: "Could not generate suggestion",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDrafting(false);
    }
  };

  const submit = async () => {
    const result = await reportCompletion("submit_written_summary", {
      p_content_item_id: contentItem.id,
      p_content: text,
    });
    if (!result.ok) {
      toast({
        title: "Could not submit",
        description: result.error ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Your summary</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={generateSuggestion}
          disabled={drafting}
        >
          {drafting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Need a starting point?
        </Button>
      </div>

      {suggestion && (
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <div className="text-xs font-semibold text-muted-foreground mb-1">Suggested prompt</div>
          <p className="text-foreground/90 whitespace-pre-wrap">{suggestion}</p>
        </div>
      )}

      <Textarea
        rows={10}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your summary here…"
        disabled={isReporting}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          {length} / {minChars}
          {maxChars !== null ? ` (max ${maxChars})` : ""} characters
          {!meetsMin && minChars > 0 && (
            <span className="ml-2 text-destructive">Need {minChars - length} more</span>
          )}
          {!meetsMax && (
            <span className="ml-2 text-destructive">Over the maximum</span>
          )}
        </div>
        <Button
          onClick={submit}
          disabled={!canSubmit}
          className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
        >
          {isReporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {completionMode === "coach_review_required" ? "Submit for review" : "Submit"}
        </Button>
      </div>
    </div>
  );
}
