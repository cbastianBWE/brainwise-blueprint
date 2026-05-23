import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SaveAsTemplateDialog from "@/components/mentor/SaveAsTemplateDialog";
import type {
  FeedbackTemplate,
  FeedbackTemplatePanelType,
  ListFeedbackTemplatesResult,
} from "@/types/feedback-templates";

const PANEL_TYPES: FeedbackTemplatePanelType[] = ["written_summary", "skills_practice"];

function panelTypeLabel(type: FeedbackTemplatePanelType): string {
  return type === "written_summary" ? "Written Summary" : "Skills Practice";
}

function useTemplates(panelType: FeedbackTemplatePanelType) {
  return useQuery({
    queryKey: ["feedback_templates", panelType],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_feedback_templates" as never, {
        p_panel_type: panelType,
      } as never);
      if (error) throw error;
      const result = (data ?? {}) as unknown as ListFeedbackTemplatesResult;
      return (result.templates ?? []) as FeedbackTemplate[];
    },
  });
}

export default function FeedbackTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createPanelType, setCreatePanelType] = useState<FeedbackTemplatePanelType | null>(null);
  const [editing, setEditing] = useState<FeedbackTemplate | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FeedbackTemplate | null>(null);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase.rpc("delete_feedback_template" as never, {
      p_id: pendingDelete.id,
    } as never);
    if (error) {
      toast({
        title: "Couldn't delete template",
        description: error.message ?? "Please try again.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Template deleted" });
    queryClient.invalidateQueries({ queryKey: ["feedback_templates"] });
    setPendingDelete(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Feedback templates</h1>
        <p className="text-sm text-muted-foreground">
          Save and reuse feedback text across review panels. Templates are private to you.
        </p>
      </div>

      {PANEL_TYPES.map((panelType) => (
        <TemplateSection
          key={panelType}
          panelType={panelType}
          onCreate={() => setCreatePanelType(panelType)}
          onEdit={(t) => setEditing(t)}
          onDelete={(t) => setPendingDelete(t)}
        />
      ))}

      <SaveAsTemplateDialog
        open={createPanelType !== null}
        onOpenChange={(o) => !o && setCreatePanelType(null)}
        panelType={createPanelType ?? "written_summary"}
      />

      <SaveAsTemplateDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        panelType={editing?.panel_type ?? "written_summary"}
        editing={editing}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{pendingDelete?.template_name}". This action can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface TemplateSectionProps {
  panelType: FeedbackTemplatePanelType;
  onCreate: () => void;
  onEdit: (t: FeedbackTemplate) => void;
  onDelete: (t: FeedbackTemplate) => void;
}

function TemplateSection({ panelType, onCreate, onEdit, onDelete }: TemplateSectionProps) {
  const { data, isLoading, isError, refetch } = useTemplates(panelType);
  const templates = data ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>{panelTypeLabel(panelType)}</CardTitle>
            <CardDescription>
              {templates.length} {templates.length === 1 ? "template" : "templates"}
            </CardDescription>
          </div>
          <Button type="button" size="sm" onClick={onCreate}>
            <Plus aria-hidden="true" className="h-4 w-4 mr-2" />
            New template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div role="status" aria-label="Loading" className="flex items-center justify-center py-6">
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {isError && (
          <div className="py-6 text-center space-y-2">
            <p className="text-sm text-destructive">Couldn't load templates.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}
        {!isLoading && !isError && templates.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No templates yet. Click "New template" to create one.
          </p>
        )}
        {!isLoading && !isError && templates.length > 0 && (
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium">{t.template_name}</p>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                      {t.template_text}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(t)}
                      aria-label={`Edit ${t.template_name}`}
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(t)}
                      aria-label={`Delete ${t.template_name}`}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
