import { useState } from "react";
import { ExternalLink, Loader2, CircleCheck } from "lucide-react";
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

export default function ExternalLinkViewer({
  contentItem,
  completion,
  viewerRole,
  reportCompletion,
  isReporting,
}: ViewerProps) {
  const { toast } = useToast();
  const url = contentItem.external_url as string | null;
  const title = (contentItem.title as string | null) ?? "External resource";
  const isCompleted = completion?.status === "completed";
  const savedReflection = completion?.external_link_reflection_text as string | null;
  const isSelf = viewerRole === "self";

  const [reflection, setReflection] = useState("");

  const markDone = async () => {
    const trimmed = reflection.trim();
    const result = await reportCompletion("confirm_external_link", {
      p_content_item_id: contentItem.id,
      p_reflection_text: trimmed.length > 0 ? trimmed : null,
    });
    if (!result.ok) {
      toast({
        title: "Could not mark as done",
        description: result.error ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Resource card */}
      {url ? (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">
              This resource opens in a new tab.
            </p>
          </div>
          <div className="text-xs text-muted-foreground break-all">{url}</div>
          <div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
            >
              <ExternalLink className="h-4 w-4" /> Open resource
            </a>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No link configured.
        </div>
      )}

      {/* Completion / reflection */}
      {isCompleted ? (
        <div className="rounded-lg border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--bw-forest)" }}>
            <CircleCheck className="h-4 w-4" /> Completed
          </div>
          {savedReflection && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">Your reflection</div>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{savedReflection}</p>
            </div>
          )}
        </div>
      ) : isSelf ? (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              Reflection <span className="text-muted-foreground font-normal">(optional)</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              What did you take away from this resource?
            </p>
          </div>
          <Textarea
            rows={4}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Jot down a takeaway, question, or next step…"
            disabled={isReporting}
          />
          <div className="flex justify-end">
            <Button
              onClick={markDone}
              disabled={isReporting}
              className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
            >
              {isReporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Mark as done
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
