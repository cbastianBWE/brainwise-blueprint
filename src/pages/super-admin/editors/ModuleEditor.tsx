import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Pencil, Plus, Loader2, Save, Archive, Layers } from "lucide-react";
import { slugify, ItemTypeIcon } from "./_shared";
import { FileUploadField } from "@/components/super-admin/FileUploadField";

function AttachedContentItemsSection({
  moduleId,
  onAddClick,
  onSelectContentItem,
}: { moduleId: string; onAddClick: () => void; onSelectContentItem: (contentItemId: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["module-attached-content-items", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items")
        .select("id, title, item_type, display_order, is_required, archived_at")
        .eq("module_id", moduleId)
        .is("archived_at", null)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 15_000,
  });

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Content items</h3>
        <Button size="sm" variant="outline" onClick={onAddClick}>
          <Plus className="h-3.5 w-3.5" /> Add content item
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">No content items yet.</p>
      ) : (
        <div className="space-y-1">
          {data.map((row: any) => (
            <div
              key={row.id}
              className="flex items-center justify-between rounded-sm border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-mono text-xs w-6 text-right">
                  {row.display_order ?? 0}
                </span>
                <ItemTypeIcon itemType={row.item_type} className="h-4 w-4 text-muted-foreground" />
                <span>{row.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {row.is_required && (
                  <Badge variant="outline" className="text-xs">Required</Badge>
                )}
                <Badge variant="secondary" className="text-xs">{row.item_type}</Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onSelectContentItem(row.id)}
                  aria-label={`Edit ${row.title}`}
                  title="Edit content item"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ModuleEditorProps {
  mode: "create" | "edit";
  initial: any | null;
  allModules: any[];
  allCurricula: any[];
  attachToCurriculumId: string | null;
  onSaved: (newId?: string, attachedCurriculumId?: string | null) => void;
  onArchived?: () => void;
  onCancelCreate?: () => void;
  onRequestCreateAttachedContentItem?: () => void;
  onRefetch?: () => void | Promise<void>;
  onExpandSelf?: () => void;
  onInvalidateAttachedContentItemsList?: () => Promise<void>;
  onSelectContentItem?: (contentItemId: string) => void;
}

function ModuleEditor({
  mode, initial, allModules, allCurricula, attachToCurriculumId,
  onSaved, onArchived, onCancelCreate,
  onRequestCreateAttachedContentItem, onSelectContentItem,
}: ModuleEditorProps) {
  const { toast } = useToast();

  const startingTagsText = useMemo(() => {
    const arr = Array.isArray(initial?.audience_tags) ? initial.audience_tags : [];
    return arr.filter((x: any) => typeof x === "string").join(", ");
  }, [initial?.audience_tags]);

  const [slug, setSlug] = useState<string>(initial?.slug ?? "");
  const [name, setName] = useState<string>(initial?.name ?? "");
  const [description, setDescription] = useState<string>(initial?.description ?? "");
  const [audienceTagsText, setAudienceTagsText] = useState<string>(startingTagsText);
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>(
    initial?.estimated_minutes == null ? "" : String(initial.estimated_minutes)
  );
  const [isPublished, setIsPublished] = useState<boolean>(!!initial?.is_published);
  const [reason, setReason] = useState<string>("");
  const [thumbnailAssetId, setThumbnailAssetId] = useState<string | null>(initial?.thumbnail_asset_id ?? null);

  const [attachmentDisplayOrder, setAttachmentDisplayOrder] = useState<string>("0");
  const [attachmentIsRequired, setAttachmentIsRequired] = useState<boolean>(true);
  const [attachmentPrerequisiteModuleId, setAttachmentPrerequisiteModuleId] = useState<string>("__none__");

  const [autoSlug, setAutoSlug] = useState<boolean>(mode === "create");
  const [saving, setSaving] = useState(false);

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (autoSlug) setSlug(slugify(name));
  }, [name, autoSlug]);

  const hasAttachmentSection = mode === "create" && !!attachToCurriculumId;
  const attachedCurriculum = useMemo(
    () => (attachToCurriculumId ? (allCurricula ?? []).find((c: any) => c.id === attachToCurriculumId) ?? null : null),
    [allCurricula, attachToCurriculumId]
  );

  const attachmentPrereqOptions = useMemo(() => {
    return (allModules ?? [])
      .filter((m: any) => !m.archived_at)
      .filter((m: any) => !initial || m.id !== initial.id);
  }, [allModules, initial?.id]);

  const parsedTags = useMemo(() => {
    return audienceTagsText
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [audienceTagsText]);

  const isDirty = useMemo(() => {
    if (mode === "create") {
      return (
        slug.trim().length > 0 ||
        name.trim().length > 0 ||
        description.trim().length > 0 ||
        audienceTagsText.trim().length > 0 ||
        estimatedMinutes.trim().length > 0 ||
        isPublished ||
        reason.trim().length > 0 ||
        (hasAttachmentSection && (
          attachmentDisplayOrder !== "0" ||
          attachmentIsRequired !== true ||
          attachmentPrerequisiteModuleId !== "__none__"
        ))
      );
    }
    if (!initial) return false;
    const initialMin = initial.estimated_minutes == null ? "" : String(initial.estimated_minutes);
    return (
      slug !== (initial.slug ?? "") ||
      name !== (initial.name ?? "") ||
      (description ?? "") !== (initial.description ?? "") ||
      audienceTagsText !== startingTagsText ||
      estimatedMinutes !== initialMin ||
      isPublished !== !!initial.is_published ||
      reason.trim().length > 0
    );
  }, [
    mode, initial, startingTagsText, hasAttachmentSection,
    slug, name, description, audienceTagsText, estimatedMinutes,
    isPublished, reason,
    attachmentDisplayOrder, attachmentIsRequired, attachmentPrerequisiteModuleId,
  ]);

  const reasonOk = reason.trim().length >= 10;
  const requiredOk = slug.trim().length > 0 && name.trim().length > 0;
  const minutesOk = (() => {
    const t = estimatedMinutes.trim();
    if (t === "") return true;
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 && Number.isInteger(n);
  })();
  const canSave = !saving && requiredOk && reasonOk && minutesOk && isDirty;

  function mapRpcError(error: any): string {
    const msg: string = error?.message ?? "";
    const code: string = error?.code ?? "";
    if (msg.includes("reason_required_min_chars")) return "Reason must be at least 10 characters.";
    if (msg.includes("slug_required")) return "Slug is required.";
    if (msg.includes("name_required")) return "Name is required.";
    if (msg.includes("module_archived")) return "This module is archived and cannot be edited.";
    if (msg.includes("module_not_found")) return "Module no longer exists.";
    if (msg.includes("curriculum_not_found_or_archived")) return "The curriculum is missing or archived.";
    if (msg.includes("already_archived")) return "This module is already archived.";
    if (msg.includes("IMPERSONATION_DENIED") || msg.includes("permission_change")) {
      return "This action is blocked while impersonating, even in act mode.";
    }
    if (code === "23505") return "Slug already in use. Pick a different slug.";
    if (code === "42501") return "You do not have permission to perform this action.";
    return msg || "Could not save changes.";
  }

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    const minutesNum = estimatedMinutes.trim() === "" ? null : Number(estimatedMinutes);
    const orderNum = hasAttachmentSection ? Number(attachmentDisplayOrder) : null;

    const payload: any = {
      p_id: mode === "edit" ? initial?.id ?? null : null,
      p_slug: slug.trim(),
      p_name: name.trim(),
      p_description: description.trim() === "" ? null : description,
      p_audience_tags: parsedTags,
      p_estimated_minutes: minutesNum,
      p_is_published: isPublished,
      p_curriculum_id: hasAttachmentSection ? attachToCurriculumId : null,
      p_attachment_display_order: hasAttachmentSection
        ? (Number.isFinite(orderNum!) ? orderNum : 0)
        : null,
      p_attachment_is_required: hasAttachmentSection ? attachmentIsRequired : null,
      p_prerequisite_module_id: hasAttachmentSection
        ? (attachmentPrerequisiteModuleId === "__none__" ? null : attachmentPrerequisiteModuleId)
        : null,
      p_reason: reason.trim(),
    };

    const { data, error } = await supabase.rpc("upsert_module", payload);

    setSaving(false);

    if (error) {
      toast({
        title: mode === "create" ? "Could not create module" : "Could not save module",
        description: mapRpcError(error),
        variant: "destructive",
      });
      return;
    }

    const responseModule = (data as any)?.module;
    const newId = responseModule?.id;
    const attachedCuId = (data as any)?.attachment?.curriculum_id ?? null;

    toast({
      title: mode === "create" ? "Module created" : "Module saved",
      description: name.trim(),
    });
    setReason("");
    onSaved(mode === "create" ? newId : undefined, attachedCuId);
  };

  const handleArchive = async () => {
    if (archiveReason.trim().length < 10 || archiving || !initial?.id) return;
    setArchiving(true);
    const { error } = await supabase.rpc("archive_module", {
      p_id: initial.id,
      p_reason: archiveReason.trim(),
    } as any);
    setArchiving(false);
    if (error) {
      toast({
        title: "Could not archive module",
        description: mapRpcError(error),
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Module archived",
      description: initial.name ?? "",
    });
    setArchiveDialogOpen(false);
    setArchiveReason("");
    onArchived?.();
  };

  const titleText = mode === "create" ? "New module" : (initial?.name ?? "Module");
  const reasonLen = reason.trim().length;
  const archiveReasonLen = archiveReason.trim().length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5 text-primary" />
              {titleText}
            </CardTitle>
            <CardDescription>
              {mode === "create"
                ? hasAttachmentSection && attachedCurriculum
                  ? `Create a new module and attach it to "${attachedCurriculum.name}".`
                  : "Create a standalone module. You can attach it to a curriculum later."
                : "Edit the module's metadata. To delete, use Archive."}
            </CardDescription>
          </div>
          {mode === "edit" && initial && (
            <Badge variant={initial.is_published ? "default" : "secondary"} className="shrink-0">
              {initial.is_published ? "Published" : "Draft"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Identity</h3>

          <div className="space-y-2">
            <Label htmlFor="mo-name">Name *</Label>
            <Input
              id="mo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Intro to PTP Theory"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mo-slug">Slug *</Label>
            <Input
              id="mo-slug"
              value={slug}
              onChange={(e) => {
                setAutoSlug(false);
                setSlug(slugify(e.target.value));
              }}
              placeholder="intro-to-ptp-theory"
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Lowercase, hyphen-separated. Must be unique across all modules.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mo-desc">Description</Label>
            <Textarea
              id="mo-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional. What this module covers and who it's for."
              rows={3}
              disabled={saving}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Classification</h3>

          <div className="space-y-2">
            <Label htmlFor="mo-minutes">Estimated minutes</Label>
            <Input
              id="mo-minutes"
              type="number"
              min={0}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              placeholder="Optional"
              disabled={saving}
            />
            {!minutesOk && estimatedMinutes.trim() !== "" && (
              <p className="text-xs text-destructive">
                Must be a non-negative whole number, or empty.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mo-tags">Audience tags</Label>
            <Input
              id="mo-tags"
              value={audienceTagsText}
              onChange={(e) => setAudienceTagsText(e.target.value)}
              placeholder="e.g. coach, beginner"
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated free-text tags. {parsedTags.length === 0
                ? "No tags."
                : `Parsed: ${parsedTags.join(", ")}`}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Publishing</h3>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mo-published" className="cursor-pointer">Published</Label>
              <p className="text-xs text-muted-foreground">
                Published modules are visible to authenticated users. Unpublished are super-admin only.
              </p>
            </div>
            <Switch
              id="mo-published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
              disabled={saving}
            />
          </div>
        </div>

        {hasAttachmentSection && attachedCurriculum && (
          <div className="space-y-4 rounded-md border border-dashed p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Attachment to "{attachedCurriculum.name}"
            </h3>
            <p className="text-xs text-muted-foreground">
              This module will be linked to the curriculum with the settings below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mo-att-order">Display order</Label>
                <Input
                  id="mo-att-order"
                  type="number"
                  min={0}
                  value={attachmentDisplayOrder}
                  onChange={(e) => setAttachmentDisplayOrder(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="flex items-end pb-1">
                <div className="flex items-center justify-between w-full">
                  <div className="space-y-0.5">
                    <Label htmlFor="mo-att-req" className="cursor-pointer">Required</Label>
                    <p className="text-xs text-muted-foreground">
                      Must be completed for the curriculum.
                    </p>
                  </div>
                  <Switch
                    id="mo-att-req"
                    checked={attachmentIsRequired}
                    onCheckedChange={setAttachmentIsRequired}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mo-att-prereq">Prerequisite module (within this curriculum)</Label>
              <Select
                value={attachmentPrerequisiteModuleId}
                onValueChange={setAttachmentPrerequisiteModuleId}
                disabled={saving}
              >
                <SelectTrigger id="mo-att-prereq">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {attachmentPrereqOptions.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {attachmentPrereqOptions.length === 0 && (
                <p className="text-xs italic text-muted-foreground">
                  No other modules exist yet.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="mo-reason">Reason for change *</Label>
          <Textarea
            id="mo-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Explain why you are making this change. Recorded in the super admin audit log."
            disabled={saving}
          />
          <p className={cn(
            "text-xs",
            reasonLen >= 10 ? "text-muted-foreground" : "text-destructive"
          )}>
            {reasonLen}/10 characters minimum.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2">
            {mode === "edit" && initial && !initial.archived_at && (
              <Button
                variant="destructive"
                onClick={() => setArchiveDialogOpen(true)}
                disabled={saving}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {mode === "create" && (
              <Button
                variant="outline"
                onClick={onCancelCreate}
                disabled={saving}
              >
                Cancel
              </Button>
            )}
            <Button onClick={handleSave} disabled={!canSave}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {mode === "create"
                ? hasAttachmentSection ? "Create and attach" : "Create"
                : "Save changes"}
            </Button>
          </div>
        </div>

        {mode === "edit" && initial?.id && (
          <AttachedContentItemsSection
            moduleId={initial.id}
            onAddClick={() => onRequestCreateAttachedContentItem?.()}
            onSelectContentItem={(contentItemId) => onSelectContentItem?.(contentItemId)}
          />
        )}
      </CardContent>

      <AlertDialog open={archiveDialogOpen} onOpenChange={(open) => {
        setArchiveDialogOpen(open);
        if (!open) setArchiveReason("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this module?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{initial?.name}</span> will be marked archived
              and unpublished. Content items inside the module remain. Attachments from curricula to this
              module will become orphaned but not deleted. Action recorded in the super admin audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="mo-archive-reason">Reason for archiving *</Label>
            <Textarea
              id="mo-archive-reason"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              rows={3}
              placeholder="At least 10 characters."
              disabled={archiving}
            />
            <p className={cn(
              "text-xs",
              archiveReasonLen >= 10 ? "text-muted-foreground" : "text-destructive"
            )}>
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
    </Card>
  );
}

export { AttachedContentItemsSection };
export default ModuleEditor;
