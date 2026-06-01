import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  articleId: string | null;
  status: string;
}

export function SendDispatchButton({ articleId, status }: Props) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  const disabled = !articleId || status !== "published";

  const runSend = async () => {
    if (!articleId) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("newsletter-dispatch", {
        body: { article_id: articleId, trigger_type: "manual" },
      });
      if (error) {
        // Edge function 409
        const ctx = (error as { context?: Response }).context;
        if (ctx && ctx.status === 409) {
          toast.error("Article must be published (and not archived) before sending.");
        } else {
          toast.error(`Send failed: ${error.message}`);
        }
        return;
      }
      const sent = data?.sent_count ?? 0;
      const failed = data?.failed_count ?? 0;
      const recipients = data?.recipient_count ?? 0;
      toast.success(`Sent to ${sent}/${recipients} subscribers${failed ? ` (${failed} failed)` : ""}`);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["newsletter-dispatches", articleId] });
    } catch (e) {
      toast.error(`Send failed: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  const trigger = (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={() => setOpen(true)}
    >
      <Send className="h-4 w-4" /> Send to subscribers
    </Button>
  );

  return (
    <>
      {disabled ? (
        <Tooltip>
          <TooltipTrigger asChild><span>{trigger}</span></TooltipTrigger>
          <TooltipContent>Publish the article before sending</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      <AlertDialog open={open} onOpenChange={(o) => { if (!sending) setOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this article to all subscribers?</AlertDialogTitle>
            <AlertDialogDescription>
              This is irreversible and will email real people. The dispatch will be recorded in the article's history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={sending}
              onClick={(e) => { e.preventDefault(); runSend(); }}
            >
              {sending ? (<><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>) : "Send now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
