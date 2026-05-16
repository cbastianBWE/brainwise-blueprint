import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Save, Archive, Sparkles, Video, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ITEM_TYPE_OPTIONS, ItemTypeIcon } from "./_shared";
import { FileUploadField } from "@/components/super-admin/FileUploadField";

interface ContentItemEditorProps {
  mode: "create" | "edit";
  initial: any | null;
  parentModule: any | null;
  allModules: any[];
  attachToModuleId: string | null;
  onSaved: (newId?: string) => void;
  onArchived?: () => void;
  onCancelCreate?: () => void;
}

function ContentItemEditor({
  mode, initial, parentModule, attachToModuleId,
  onSaved, onArchived, onCancelCreate,
}: ContentItemEditorProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [itemType, setItemType] = useState<string>(initial?.item_type ?? "video");
  const [title, setTitle] = useState<string>(initial?.title ?? "");
  const [description, setDescription] = useState<string>(initial?.description ?? "");
  const [displayOrder, setDisplayOrder] = useState<string>(String(initial?.display_order ?? 0));
  const [isRequired, setIsRequired] = useState<boolean>(initial?.is_required ?? true);
  const [reason, setReason] = useState<string>("");
  const [thumbnailAssetId, setThumbnailAssetId] = useState<string | null>(initial?.thumbnail_asset_id ?? null);
  const [saving, setSaving] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiving, setArchiving] = useState(false);

  // video
  const [videoSourceType, setVideoSourceType] = useState<string>(initial?.video_source_type ?? "youtube_unlisted");
  const [videoSourceId, setVideoSourceId] = useState<string>(initial?.video_source_id ?? "");
  const [videoCompletionThreshold, setVideoCompletionThreshold] = useState<string>(
    initial?.video_completion_threshold_pct == null ? "95" : String(initial.video_completion_threshold_pct)
  );
  const [videoAiSummary, setVideoAiSummary] = useState<string>(initial?.video_ai_summary ?? "");

  // quiz
  const [quizPassThreshold, setQuizPassThreshold] = useState<string>(
    initial?.quiz_pass_threshold_pct == null ? "80" : String(initial.quiz_pass_threshold_pct)
  );
  const [quizShowCorrectMode, setQuizShowCorrectMode] = useState<string>(initial?.quiz_show_correct_mode ?? "after_pass");

  // written_summary
  const [writtenMinChars, setWrittenMinChars] = useState<string>(
    initial?.written_min_chars == null ? "100" : String(initial.written_min_chars)
  );
  const [writtenMaxChars, setWrittenMaxChars] = useState<string>(
    initial?.written_max_chars == null ? "" : String(initial.written_max_chars)
  );
  const [writtenCompletionMode, setWrittenCompletionMode] = useState<string>(
    initial?.written_completion_mode ?? "auto"
  );

  // skills_practice
  const [skillsSignoffRequired, setSkillsSignoffRequired] = useState<string>(
    initial?.skills_signoff_required ?? "trainee_only"
  );
  const [skillsActorInvitationRequired, setSkillsActorInvitationRequired] = useState<boolean>(
    initial?.skills_actor_invitation_required ?? false
  );
  const [skillsOptionalAttachment, setSkillsOptionalAttachment] = useState<boolean>(
    initial?.skills_optional_attachment ?? false
  );

  // file_upload
  const [fileUploadMaxMb, setFileUploadMaxMb] = useState<string>(
    initial?.file_upload_max_bytes == null ? "10" : String(Math.floor(initial.file_upload_max_bytes / (1024 * 1024)))
  );
  const [fileUploadAllowedExtensionsText, setFileUploadAllowedExtensionsText] = useState<string>(
    Array.isArray(initial?.file_upload_allowed_extensions)
      ? initial.file_upload_allowed_extensions.join(", ")
      : "pdf, docx"
  );

  // external_link
  const [externalUrl, setExternalUrl] = useState<string>(initial?.external_url ?? "");

  // live_event
  const [eventScheduledAt, setEventScheduledAt] = useState<string>(
    initial?.event_scheduled_at ? new Date(initial.event_scheduled_at).toISOString().slice(0, 16) : ""
  );
  const [eventExternalId, setEventExternalId] = useState<string>(initial?.event_external_id ?? "");

  // lesson_blocks
  const [lessonCompletionMode, setLessonCompletionMode] = useState<string>(
    initial?.lesson_completion_mode ?? "explicit_continue"
  );

  // AI draft state
  const [aiDraftingTitle, setAiDraftingTitle] = useState(false);
  const [aiDraftingDesc, setAiDraftingDesc] = useState(false);
  const [aiDraftingVideoSummary, setAiDraftingVideoSummary] = useState(false);
  const [aiDraftDialogOpen, setAiDraftDialogOpen] = useState(false);
  const [aiDraftTarget, setAiDraftTarget] = useState<"content_item_title" | "content_item_description" | "content_item_video_summary" | null>(null);
  const [aiAuthorPrompt, setAiAuthorPrompt] = useState("");
  const [aiVoicePresetKey, setAiVoicePresetKey] = useState<string>("conversational_coach");

  const { data: voicePresets, isLoading: voicePresetsLoading } = useQuery({
    queryKey: ["ai-authoring-voice-presets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_authoring_voice_presets")
        .select("preset_key, display_name, short_description")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const lessonBlocksCountQuery = useQuery({
    queryKey: ["lesson-blocks-count", initial?.id],
    enabled: mode === "edit" && itemType === "lesson_blocks" && !!initial?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("lesson_blocks" as any)
        .select("id", { count: "exact", head: true })
        .eq("content_item_id", initial!.id)
        .is("archived_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const blockCount = lessonBlocksCountQuery.data ?? null;

  const quizQuestionsCountQuery = useQuery({
    queryKey: ["quiz-questions-count", initial?.id],
    enabled: mode === "edit" && itemType === "quiz" && !!initial?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("quiz_questions")
        .select("id", { count: "exact", head: true })
        .eq("content_item_id", initial!.id)
        .is("archived_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const quizQuestionCount = quizQuestionsCountQuery.data ?? null;

  const reasonLen = reason.trim().length;
  const reasonOk = reasonLen >= 10;
  const archiveReasonLen = archiveReason.trim().length;

  const perTypeValid = useMemo(() => {
    switch (itemType) {
      case "video": {
        const t = Number(videoCompletionThreshold);
        // For supabase_storage, source_id is filled in AFTER create via FileUploadField (chicken-and-egg).
        // All other source types require the source_id at save time.
        const sourceIdOk = videoSourceType === "supabase_storage" || videoSourceId.trim() !== "";
        return videoSourceType.trim() !== "" && sourceIdOk && Number.isFinite(t) && t >= 1 && t <= 100;
      }
      case "quiz": {
        const t = Number(quizPassThreshold);
        return quizShowCorrectMode.trim() !== "" && Number.isFinite(t) && t >= 1 && t <= 100;
      }
      case "written_summary": {
        const min = Number(writtenMinChars);
        if (!Number.isFinite(min) || min < 1) return false;
        if (writtenMaxChars.trim() !== "") {
          const max = Number(writtenMaxChars);
          if (!Number.isFinite(max) || max < min) return false;
        }
        return writtenCompletionMode.trim() !== "";
      }
      case "skills_practice":
        return skillsSignoffRequired.trim() !== "";
      case "file_upload": {
        const mb = Number(fileUploadMaxMb);
        const exts = fileUploadAllowedExtensionsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        return Number.isFinite(mb) && mb > 0 && exts.length >= 1;
      }
      case "external_link":
        return externalUrl.trim() !== "";
      case "live_event":
        return eventScheduledAt.trim() !== "" && !Number.isNaN(new Date(eventScheduledAt).getTime());
      case "lesson_blocks":
        return lessonCompletionMode.trim() !== "";
      default:
        return false;
    }
  }, [
    itemType, videoSourceType, videoSourceId, videoCompletionThreshold,
    quizPassThreshold, quizShowCorrectMode,
    writtenMinChars, writtenMaxChars, writtenCompletionMode,
    skillsSignoffRequired,
    fileUploadMaxMb, fileUploadAllowedExtensionsText,
    externalUrl, eventScheduledAt, lessonCompletionMode,
  ]);

  const isDirty = useMemo(() => {
    if (mode === "create") return true;
    if (!initial) return false;
    return (
      title !== (initial.title ?? "") ||
      (description ?? "") !== (initial.description ?? "") ||
      String(displayOrder) !== String(initial.display_order ?? 0) ||
      isRequired !== (initial.is_required ?? true) ||
      thumbnailAssetId !== (initial.thumbnail_asset_id ?? null) ||
      reason.trim().length > 0 ||
      // per-type quick check (any change triggers dirty in edit)
      videoSourceType !== (initial.video_source_type ?? "youtube_unlisted") ||
      videoSourceId !== (initial.video_source_id ?? "") ||
      videoCompletionThreshold !== (initial.video_completion_threshold_pct == null ? "95" : String(initial.video_completion_threshold_pct)) ||
      videoAiSummary !== (initial.video_ai_summary ?? "") ||
      quizPassThreshold !== (initial.quiz_pass_threshold_pct == null ? "80" : String(initial.quiz_pass_threshold_pct)) ||
      quizShowCorrectMode !== (initial.quiz_show_correct_mode ?? "after_pass") ||
      writtenMinChars !== (initial.written_min_chars == null ? "100" : String(initial.written_min_chars)) ||
      writtenMaxChars !== (initial.written_max_chars == null ? "" : String(initial.written_max_chars)) ||
      writtenCompletionMode !== (initial.written_completion_mode ?? "auto") ||
      skillsSignoffRequired !== (initial.skills_signoff_required ?? "trainee_only") ||
      skillsActorInvitationRequired !== (initial.skills_actor_invitation_required ?? false) ||
      skillsOptionalAttachment !== (initial.skills_optional_attachment ?? false) ||
      externalUrl !== (initial.external_url ?? "") ||
      eventExternalId !== (initial.event_external_id ?? "") ||
      lessonCompletionMode !== (initial.lesson_completion_mode ?? "explicit_continue")
    );
  }, [
    mode, initial,
    title, description, displayOrder, isRequired, thumbnailAssetId, reason,
    videoSourceType, videoSourceId, videoCompletionThreshold, videoAiSummary,
    quizPassThreshold, quizShowCorrectMode,
    writtenMinChars, writtenMaxChars, writtenCompletionMode,
    skillsSignoffRequired, skillsActorInvitationRequired, skillsOptionalAttachment,
    externalUrl, eventExternalId, lessonCompletionMode,
  ]);

  const titleNonBlank = title.trim().length > 0;
  const itemTypeSelected = itemType.trim().length > 0;
  const canSave = !saving && titleNonBlank && itemTypeSelected && reasonOk && perTypeValid && isDirty;

  function mapRpcError(error: any): string {
    const msg: string = error?.message ?? "";
    const code: string = error?.code ?? "";
    if (msg.includes("reason_required_min_chars")) return "Reason must be at least 10 characters.";
    if (msg.includes("title_required")) return "Title is required.";
    if (msg.includes("item_type_change_forbidden")) return "Item type cannot be changed. Archive and recreate to switch types.";
    if (msg.includes("module_archived") || msg.includes("module_not_found")) return "The parent module is missing or archived.";
    if (msg.includes("video_required_fields_missing")) return "Video source type and ID are required.";
    if (msg.includes("external_url_required")) return "External URL is required.";
    if (msg.includes("event_scheduled_at_required")) return "Scheduled date/time is required.";
    if (msg.includes("already_archived")) return "This content item is already archived.";
    if (msg.includes("IMPERSONATION_DENIED")) return "This action is blocked while impersonating, even in act mode.";
    if (code === "42501") return "You do not have permission to perform this action.";
    return msg || "Could not save changes.";
  }

  const buildTypeConfig = (): Record<string, any> => {
    switch (itemType) {
      case "video":
        return {
          video_source_type: videoSourceType,
          video_source_id: videoSourceId.trim(),
          video_completion_threshold_pct: Number(videoCompletionThreshold) || 95,
        };
      case "quiz":
        return {
          quiz_pass_threshold_pct: Number(quizPassThreshold) || 80,
          quiz_show_correct_mode: quizShowCorrectMode,
        };
      case "written_summary":
        return {
          written_completion_mode: writtenCompletionMode,
          written_min_chars: Number(writtenMinChars),
          ...(writtenMaxChars.trim() !== "" && { written_max_chars: Number(writtenMaxChars) }),
        };
      case "skills_practice":
        return {
          skills_signoff_required: skillsSignoffRequired,
          skills_actor_invitation_required: skillsActorInvitationRequired,
          skills_optional_attachment: skillsOptionalAttachment,
        };
      case "file_upload":
        return {
          file_upload_max_bytes: Math.floor(Number(fileUploadMaxMb) * 1024 * 1024),
          file_upload_allowed_extensions: fileUploadAllowedExtensionsText
            .split(",")
            .map((s) => s.trim().toLowerCase().replace(/^\./, ""))
            .filter(Boolean),
        };
      case "external_link":
        return { external_url: externalUrl.trim() };
      case "live_event":
        return {
          event_scheduled_at: new Date(eventScheduledAt).toISOString(),
          ...(eventExternalId.trim() !== "" && { event_external_id: eventExternalId.trim() }),
        };
      case "lesson_blocks":
        return {};
      default:
        return {};
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    const payload: any = {
      p_id: mode === "edit" ? initial?.id ?? null : null,
      p_module_id: mode === "edit" ? initial?.module_id : attachToModuleId,
      p_item_type: itemType,
      p_title: title.trim(),
      p_description: description.trim() === "" ? null : description,
      p_display_order: Number(displayOrder) || 0,
      p_is_required: isRequired,
      p_type_config: buildTypeConfig(),
      p_lesson_completion_mode: itemType === "lesson_blocks" ? lessonCompletionMode : null,
      p_thumbnail_asset_id: thumbnailAssetId,
      p_reason: reason.trim(),
    };

    const { data, error } = await supabase.rpc("upsert_content_item", payload);
    setSaving(false);

    if (error) {
      toast({
        title: mode === "create" ? "Could not create content item" : "Could not save content item",
        description: mapRpcError(error),
        variant: "destructive",
      });
      return;
    }

    const newId = (data as any)?.id;
    toast({
      title: mode === "create" ? "Content item created" : "Content item saved",
      description: title.trim(),
    });
    setReason("");
    onSaved(newId);
  };

  const handleArchive = async () => {
    if (archiveReasonLen < 10 || archiving || !initial?.id) return;
    setArchiving(true);
    const { error } = await supabase.rpc("archive_content_item", {
      p_id: initial.id,
      p_reason: archiveReason.trim(),
    } as any);
    setArchiving(false);
    if (error) {
      toast({
        title: "Could not archive content item",
        description: mapRpcError(error),
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Content item archived", description: initial.title ?? "" });
    setArchiveDialogOpen(false);
    setArchiveReason("");
    onArchived?.();
  };

  const callDraftText = async (targetField: "content_item_title" | "content_item_description") => {
    if (!aiAuthorPrompt.trim()) {
      toast({ title: "Prompt required", description: "Describe what you want the AI to write.", variant: "destructive" });
      return;
    }
    if (targetField === "content_item_title") setAiDraftingTitle(true);
    else setAiDraftingDesc(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Not signed in", description: "Please sign in again.", variant: "destructive" });
        setAiDraftingTitle(false);
        setAiDraftingDesc(false);
        return;
      }

      const currentValue = targetField === "content_item_title" ? title : description;
      const surroundingContext = targetField === "content_item_title"
        ? `Module: ${parentModule?.name ?? "(unknown)"}\nDescription: ${description || "(none)"}`
        : `Module: ${parentModule?.name ?? "(unknown)"}\nTitle: ${title || "(none)"}\nItem type: ${itemType}`;

      const { data, error } = await supabase.functions.invoke("draft-text", {
        body: {
          target_field: targetField,
          author_prompt: aiAuthorPrompt.trim(),
          voice_preset_key: aiVoicePresetKey,
          surrounding_context: surroundingContext,
          current_value: currentValue || undefined,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        toast({ title: "AI draft failed", description: error.message ?? "Unknown error", variant: "destructive" });
        return;
      }
      if ((data as any)?.error) {
        toast({ title: "AI draft failed", description: (data as any).error, variant: "destructive" });
        return;
      }

      const payload = data as { text: string; length: number };
      if (targetField === "content_item_title") setTitle(payload.text);
      else setDescription(payload.text);

      toast({ title: "AI draft inserted", description: `${payload.length} characters generated` });
      setAiDraftDialogOpen(false);
      setAiAuthorPrompt("");
    } catch (e: any) {
      toast({ title: "AI draft failed", description: e?.message ?? "Network error", variant: "destructive" });
    } finally {
      setAiDraftingTitle(false);
      setAiDraftingDesc(false);
    }
  };

  const openAiDraft = (target: "content_item_title" | "content_item_description") => {
    setAiDraftTarget(target);
    setAiAuthorPrompt("");
    setAiDraftDialogOpen(true);
  };

  const titleText = mode === "create" ? "New content item" : (initial?.title ?? "Content item");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ItemTypeIcon itemType={itemType} className="h-5 w-5 text-primary" />
              {titleText}
            </CardTitle>
            <CardDescription>
              {mode === "create"
                ? parentModule
                  ? `Create a content item inside "${parentModule.name}".`
                  : "Create a content item."
                : "Edit this content item. To delete, use Archive."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Thumbnail</h3>
          <p className="text-xs text-muted-foreground">
            Optional. Shown wherever this content item appears in catalogs. If unset, a default BrainWise placeholder displays.
          </p>
          {mode === "create" ? (
            <div className="rounded-md border border-dashed p-4 text-sm italic text-muted-foreground">
              Save the content item first to add a thumbnail.
            </div>
          ) : (
            <FileUploadField
              assetKind="image"
              contentItemId={initial?.id ?? null}
              refField="thumbnail"
              value={thumbnailAssetId}
              onChange={setThumbnailAssetId}
              disabled={saving}
            />
          )}
        </div>

        {/* Title with AI draft */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="ci-title">Title *</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => openAiDraft("content_item_title")}
              disabled={saving || aiDraftingTitle}
            >
              {aiDraftingTitle
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Sparkles className="h-3.5 w-3.5" />}
              AI Draft
            </Button>
          </div>
          <Input
            id="ci-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Intro to PTP"
            disabled={saving}
          />
        </div>

        {/* Description with AI draft */}
        <div className="space-y-2">
          <Label htmlFor="ci-desc">Description</Label>
          <Textarea
            id="ci-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional. What this item covers."
            rows={3}
            disabled={saving}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => openAiDraft("content_item_description")}
            disabled={saving || aiDraftingDesc}
          >
            {aiDraftingDesc
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Sparkles className="h-3.5 w-3.5" />}
            AI Draft
          </Button>
        </div>

        {/* Item type */}
        <div className="space-y-2">
          <Label htmlFor="ci-type">Item type *</Label>
          <Select value={itemType} onValueChange={setItemType} disabled={saving || mode === "edit"}>
            <SelectTrigger id="ci-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEM_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mode === "edit" && (
            <p className="text-xs text-muted-foreground">
              Item type cannot be changed. Archive and recreate to switch types.
            </p>
          )}
        </div>

        {/* Display order + required */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ci-order">Display order</Label>
            <Input
              id="ci-order"
              type="number"
              min={0}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="flex items-end pb-1">
            <div className="flex items-center justify-between w-full">
              <div className="space-y-0.5">
                <Label htmlFor="ci-req" className="cursor-pointer">Required</Label>
                <p className="text-xs text-muted-foreground">Must be completed for the module.</p>
              </div>
              <Switch id="ci-req" checked={isRequired} onCheckedChange={setIsRequired} disabled={saving} />
            </div>
          </div>
        </div>

        {/* Per-type config */}
        <div className="space-y-4 rounded-md border border-dashed p-4">
          <h3 className="text-sm font-semibold text-foreground">Type-specific settings</h3>

          {itemType === "video" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Video source type</Label>
                <Select
                  value={videoSourceType}
                  onValueChange={(newType) => {
                    // Clear stale source_id when switching source types — prevents FileUploadField
                    // from rendering "uploaded" state with a YouTube/Vimeo ID that isn't a content_asset_id.
                    if (newType !== videoSourceType) {
                      setVideoSourceId("");
                    }
                    setVideoSourceType(newType);
                  }}
                  disabled={saving}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supabase_storage">Supabase Storage</SelectItem>
                    <SelectItem value="mux">Mux</SelectItem>
                    <SelectItem value="vimeo">Vimeo</SelectItem>
                    <SelectItem value="cloudflare_stream">Cloudflare Stream</SelectItem>
                    <SelectItem value="youtube_unlisted">YouTube (unlisted)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {videoSourceType === "supabase_storage" ? (
                <div className="space-y-2">
                  <Label>Video file</Label>
                  {initial?.id ? (
                    <FileUploadField
                      assetKind="video"
                      contentItemId={initial.id}
                      refField="content_item_video_source"
                      value={videoSourceId || null}
                      onChange={(newAssetId) => setVideoSourceId(newAssetId ?? "")}
                      disabled={saving}
                    />
                  ) : (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      Save the content item first. After saving, you'll be able to upload the video file or pick one from the library.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Video ID or URL</Label>
                  <Input value={videoSourceId} onChange={(e) => setVideoSourceId(e.target.value)} disabled={saving} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Completion threshold (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={videoCompletionThreshold}
                  onChange={(e) => setVideoCompletionThreshold(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          )}

          {itemType === "quiz" && (
            <div className="space-y-3">
              {mode === "edit" && initial?.id ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    navigate(`/super-admin/content-authoring/quizzes/${initial.id}`)
                  }
                  disabled={saving}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Edit quiz questions
                  {quizQuestionCount !== null && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({quizQuestionCount === 0
                        ? "no questions yet"
                        : quizQuestionCount === 1
                          ? "1 question"
                          : `${quizQuestionCount} questions`})
                    </span>
                  )}
                </Button>
              ) : (
                <p className="text-xs italic text-muted-foreground">
                  Save this content item first, then you can add quiz questions.
                </p>
              )}
              <div className="space-y-2">
                <Label>Pass threshold (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={quizPassThreshold}
                  onChange={(e) => setQuizPassThreshold(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label>Show correct answers</Label>
                <Select value={quizShowCorrectMode} onValueChange={setQuizShowCorrectMode} disabled={saving}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="after_pass">After pass</SelectItem>
                    <SelectItem value="after_each_attempt">After each attempt</SelectItem>
                    <SelectItem value="always">Always</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {itemType === "written_summary" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Completion mode</Label>
                <Select value={writtenCompletionMode} onValueChange={setWrittenCompletionMode} disabled={saving}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="coach_review_required">Coach review required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Min characters</Label>
                  <Input
                    type="number"
                    min={1}
                    value={writtenMinChars}
                    onChange={(e) => setWrittenMinChars(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max characters (optional)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={writtenMaxChars}
                    onChange={(e) => setWrittenMaxChars(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          )}

          {itemType === "skills_practice" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Sign-off required</Label>
                <Select value={skillsSignoffRequired} onValueChange={setSkillsSignoffRequired} disabled={saving}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trainee_only">Trainee only</SelectItem>
                    <SelectItem value="mentor_only">Mentor only</SelectItem>
                    <SelectItem value="both_required">Both required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="ci-actor" className="cursor-pointer">Actor invitation required</Label>
                <Switch id="ci-actor" checked={skillsActorInvitationRequired} onCheckedChange={setSkillsActorInvitationRequired} disabled={saving} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="ci-optatt" className="cursor-pointer">Optional attachment allowed</Label>
                <Switch id="ci-optatt" checked={skillsOptionalAttachment} onCheckedChange={setSkillsOptionalAttachment} disabled={saving} />
              </div>
            </div>
          )}

          {itemType === "file_upload" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Max upload size (MB)</Label>
                <Input
                  type="number"
                  min={1}
                  value={fileUploadMaxMb}
                  onChange={(e) => setFileUploadMaxMb(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label>Allowed extensions</Label>
                <Input
                  value={fileUploadAllowedExtensionsText}
                  onChange={(e) => setFileUploadAllowedExtensionsText(e.target.value)}
                  placeholder="pdf, docx, txt"
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">Comma-separated. Lowercased on save.</p>
              </div>
            </div>
          )}

          {itemType === "external_link" && (
            <div className="space-y-2">
              <Label>External URL *</Label>
              <Input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
                disabled={saving}
              />
            </div>
          )}

          {itemType === "live_event" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Scheduled at *</Label>
                <Input
                  type="datetime-local"
                  value={eventScheduledAt}
                  onChange={(e) => setEventScheduledAt(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label>External event ID</Label>
                <Input
                  value={eventExternalId}
                  onChange={(e) => setEventExternalId(e.target.value)}
                  placeholder="e.g. Zoom meeting ID"
                  disabled={saving}
                />
              </div>
            </div>
          )}

          {itemType === "lesson_blocks" && (
            <div className="space-y-3">
              {mode === "edit" && initial?.id ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    navigate(`/super-admin/content-authoring/lessons/${initial.id}`)
                  }
                  disabled={saving}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Edit lesson blocks
                  {blockCount !== null && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({blockCount === 0 ? "no blocks yet" : blockCount === 1 ? "1 block" : `${blockCount} blocks`})
                    </span>
                  )}
                </Button>
              ) : (
                <p className="text-xs italic text-muted-foreground">
                  Save this content item first, then you can add lesson blocks here.
                </p>
              )}
              <div className="space-y-2">
                <Label>Completion mode</Label>
                <Select value={lessonCompletionMode} onValueChange={setLessonCompletionMode} disabled={saving}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scroll_and_checks">Scroll and checks</SelectItem>
                    <SelectItem value="explicit_continue">Explicit continue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ci-reason">Reason for change *</Label>
          <Textarea
            id="ci-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Explain why you are making this change. Recorded in the super admin audit log."
            disabled={saving}
          />
          <p className={cn("text-xs", reasonLen >= 10 ? "text-muted-foreground" : "text-destructive")}>
            {reasonLen}/10 characters minimum.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2">
            {mode === "edit" && initial && !initial.archived_at && (
              <Button variant="destructive" onClick={() => setArchiveDialogOpen(true)} disabled={saving}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {mode === "create" && (
              <Button variant="outline" onClick={onCancelCreate} disabled={saving}>Cancel</Button>
            )}
            <Button onClick={handleSave} disabled={!canSave}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {mode === "create" ? "Create" : "Save changes"}
            </Button>
          </div>
        </div>
      </CardContent>

      <AlertDialog open={archiveDialogOpen} onOpenChange={(open) => {
        setArchiveDialogOpen(open);
        if (!open) setArchiveReason("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this content item?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{initial?.title}</span> will be marked archived
              and unpublished. Action recorded in the super admin audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ci-archive-reason">Reason for archiving *</Label>
            <Textarea
              id="ci-archive-reason"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              rows={3}
              placeholder="At least 10 characters."
              disabled={archiving}
            />
            <p className={cn("text-xs", archiveReasonLen >= 10 ? "text-muted-foreground" : "text-destructive")}>
              {archiveReasonLen}/10 characters minimum.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleArchive(); }}
              disabled={archiveReasonLen < 10 || archiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {archiving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Archive permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={aiDraftDialogOpen} onOpenChange={setAiDraftDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Draft</DialogTitle>
            <DialogDescription>
              Describe what you want the AI to write for the {aiDraftTarget === "content_item_title" ? "title" : "description"}.
              {aiDraftTarget === "content_item_title" ? title : description ? " Existing text will be refined." : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Author prompt</Label>
              <Textarea
                id="ai-prompt"
                value={aiAuthorPrompt}
                onChange={(e) => setAiAuthorPrompt(e.target.value)}
                rows={4}
                placeholder="e.g. An intro video about why prediction errors trigger threat responses in the brain."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-voice">Voice</Label>
              <Select value={aiVoicePresetKey} onValueChange={setAiVoicePresetKey} disabled={voicePresetsLoading}>
                <SelectTrigger id="ai-voice">
                  <SelectValue placeholder={voicePresetsLoading ? "Loading voices..." : "Select a voice"} />
                </SelectTrigger>
                <SelectContent>
                  {(voicePresets ?? []).map((p: any) => (
                    <SelectItem key={p.preset_key} value={p.preset_key}>
                      {p.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {voicePresets && voicePresets.length > 0 && voicePresets.find((p: any) => p.preset_key === aiVoicePresetKey) && (
                <p className="text-xs text-muted-foreground">
                  {voicePresets.find((p: any) => p.preset_key === aiVoicePresetKey)?.short_description}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAiDraftDialogOpen(false)} disabled={aiDraftingTitle || aiDraftingDesc}>
              Cancel
            </Button>
            <Button
              onClick={() => aiDraftTarget && callDraftText(aiDraftTarget)}
              disabled={!aiAuthorPrompt.trim() || aiDraftingTitle || aiDraftingDesc}
            >
              {(aiDraftingTitle || aiDraftingDesc) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Sparkles className="h-4 w-4 mr-2" />
              Generate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default ContentItemEditor;
