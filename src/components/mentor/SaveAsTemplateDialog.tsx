import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type {
  FeedbackTemplate,
  FeedbackTemplatePanelType,
} from "@/types/feedback-templates";

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelType: FeedbackTemplatePanelType;
  initialText?: string;
  editing?: FeedbackTemplate | null;
}

export default function SaveAsTemplateDialog({
  open,
  onOpenChange,
  panelType,
  initialText = "",
  editing = null,
}: SaveAsTemplateDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [text, setText] = useState("");

  useEffect(() => {
    if (open) {
      setName(editing?.template_name ?? "");
      setText(editing?.template_text ?? initialText);
    }
  }, [open, editing, initialText]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("upsert_feedback_template" as never, {
        p_id: editing?.id ?? null,
        p_name: name.trim(),
        p_text: text,
        p_panel_type: panelType,
      } as never);
      if (error) throw error;
      return data as unknown as FeedbackTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback_templates"] });
      toast({ title: editing ? "Template updated" : "Template saved" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      const msg = err?.message ?? "Please try again.";
      const friendly =
        msg.includes("name_too_long")
          ? "Name is too long (max 200 characters)."
          : msg.includes("text_too_long")
            ? "Text is too long (max 5000 characters)."
            : msg.includes("name_required")
              ? "Please enter a name."
              : msg.includes("text_required")
                ? "Template text can't be empty."
                : msg;
      toast({
        title: editing ? "Couldn't update template" : "Couldn't save template",
        description: friendly,
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    name.trim().length > 0 &&
    text.trim().length > 0 &&
    name.length <= 200 &&
    text.length <= 5000 &&
    !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit template" : "Save as template"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the saved template. Changes apply immediately."
              : "Save this text as a reusable template for future reviews."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="template-name">
              Name
            </label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Approve - strong work"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">{name.length} / 200 characters</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="template-text">
              Template text
            </label>
            <Textarea
              id="template-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or type the feedback text you want to reuse…"
              rows={6}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground">{text.length} / 5000 characters</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit}>
            {mutation.isPending && <Loader2 aria-hidden="true" className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? "Save changes" : "Save template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
