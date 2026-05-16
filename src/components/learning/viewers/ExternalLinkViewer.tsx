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
    <div className="space-y-4">
      {url ? (
        <div className="rounded-lg border bg-card p-4 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 text-sm text-muted-foreground truncate">{url}</div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
          >
            <ExternalLink className="h-4 w-4" /> Open resource
          </a>
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No link configured.
        </div>
      )}

      {isCompleted ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--bw-forest)" }}>
            <CircleCheck className="h-4 w-4" /> Completed
          </div>
          {savedReflection && (
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs font-semibold text-muted-foreground mb-1">Your reflection</div>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{savedReflection}</p>
            </div>
          )}
        </div>
      ) : isSelf ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Reflection <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              rows={4}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="What did you take away from this resource?"
              disabled={isReporting}
            />
          </div>
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
