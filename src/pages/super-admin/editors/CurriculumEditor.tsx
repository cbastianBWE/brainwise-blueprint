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
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpenText, Pencil, Plus, Search, Loader2, Save, Archive,
} from "lucide-react";
import { slugify, CURRICULUM_MODES } from "./_shared";
import { FileUploadField } from "@/components/super-admin/FileUploadField";

function AttachedModulesSection({
  curriculumId,
  onAddClick,
  onSelectModule,
}: { curriculumId: string; onAddClick: () => void; onSelectModule: (moduleId: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["curriculum-attached-modules", curriculumId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("curriculum_modules")
        .select("id, display_order, is_required, module:modules!module_id(id, name, is_published, archived_at)")
        .eq("curriculum_id", curriculumId)
        .order("display_order");
      if (error) throw error;
      return (data ?? []).filter((r: any) => r.module && !r.module.archived_at);
    },
    staleTime: 15_000,
  });

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Attached modules</h3>
        <Button size="sm" variant="outline" onClick={onAddClick}>
          <Plus className="h-3.5 w-3.5" /> Add module
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">No modules attached yet.</p>
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
                <BookOpenText className="h-4 w-4 text-muted-foreground" />
                <span>{row.module.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {row.is_required && (
                  <Badge variant="outline" className="text-xs">Required</Badge>
                )}
                <Badge variant={row.module.is_published ? "default" : "secondary"} className="text-xs">
                  {row.module.is_published ? "Published" : "Draft"}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onSelectModule(row.module.id)}
                  aria-label={`Edit ${row.module.name}`}
                  title="Edit module"
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

interface CurriculumEditorProps {
  mode: "create" | "edit";
  initial: any | null;
  allCurricula: any[];
  allCertPaths: any[];
  allModules: any[];
  attachedModuleIds: Set<string>;
  attachToCertPathId: string | null;
  onSaved: (newId?: string, attachedCertPathId?: string | null) => void;
  onArchived?: () => void;
  onCancelCreate?: () => void;
  onRequestCreateAttachedModule?: () => void;
  onRefetch?: () => void | Promise<void>;
  onExpandSelf?: () => void;
  onInvalidateAttachedModulesList?: () => Promise<void>;
  onSelectModule?: (moduleId: string) => void;
}

function CurriculumEditor({
  mode, initial, allCurricula, allCertPaths, allModules, attachedModuleIds, attachToCertPathId,
  onSaved, onArchived, onCancelCreate,
  onRequestCreateAttachedModule, onRefetch, onExpandSelf,
  onInvalidateAttachedModulesList, onSelectModule,
}: CurriculumEditorProps) {
  const { toast } = useToast();

  const startingTagsText = useMemo(() => {
    const arr = Array.isArray(initial?.audience_tags) ? initial.audience_tags : [];
    return arr.filter((x: any) => typeof x === "string").join(", ");
  }, [initial?.audience_tags]);

  const [slug, setSlug] = useState<string>(initial?.slug ?? "");
  const [name, setName] = useState<string>(initial?.name ?? "");
  const [description, setDescription] = useState<string>(initial?.description ?? "");
  const [curriculumMode, setCurriculumMode] = useState<string>(initial?.mode ?? "free_order");
  const [audienceTagsText, setAudienceTagsText] = useState<string>(startingTagsText);
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>(
    initial?.estimated_minutes == null ? "" : String(initial.estimated_minutes)
  );
  const [isPublished, setIsPublished] = useState<boolean>(!!initial?.is_published);
  const [reason, setReason] = useState<string>("");

  const [attachmentDisplayOrder, setAttachmentDisplayOrder] = useState<string>("0");
  const [attachmentIsRequired, setAttachmentIsRequired] = useState<boolean>(true);
  const [attachmentPrerequisiteCurriculumId, setAttachmentPrerequisiteCurriculumId] = useState<string>("__none__");

  const [autoSlug, setAutoSlug] = useState<boolean>(mode === "create");
  const [saving, setSaving] = useState(false);

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiving, setArchiving] = useState(false);

  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [pullModSearch, setPullModSearch] = useState("");
  const [pullModAttachingId, setPullModAttachingId] = useState<string | null>(null);
  const suggestedNextModOrder = useMemo(() => attachedModuleIds.size, [attachedModuleIds]);
  const [pullModDisplayOrder, setPullModDisplayOrder] = useState<string>(String(suggestedNextModOrder));
  const [pullModIsRequired, setPullModIsRequired] = useState<boolean>(true);

  useEffect(() => {
    if (!addModuleOpen) {
      setPullModDisplayOrder(String(suggestedNextModOrder));
      setPullModIsRequired(true);
      setPullModSearch("");
    }
  }, [addModuleOpen, suggestedNextModOrder]);

  const attachExistingModule = async (moduleId: string, _moduleName: string) => {
    if (!initial?.id || pullModAttachingId) return;
    setPullModAttachingId(moduleId);

    const existing = (allModules ?? []).find((m: any) => m.id === moduleId);
    if (!existing) {
      setPullModAttachingId(null);
      toast({
        title: "Could not attach module",
        description: "Module no longer exists. Refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    const orderNum = Number(pullModDisplayOrder);
    const safeOrder = Number.isFinite(orderNum) && orderNum >= 0 ? Math.floor(orderNum) : 0;

    const payload = {
      p_id: existing.id,
      p_slug: existing.slug,
      p_name: existing.name,
      p_description: existing.description,
      p_audience_tags: existing.audience_tags ?? [],
      p_estimated_minutes: existing.estimated_minutes,
      p_is_published: existing.is_published,
      p_curriculum_id: initial.id,
      p_attachment_display_order: safeOrder,
      p_attachment_is_required: pullModIsRequired,
      p_prerequisite_module_id: null,
      p_reason: `Attach existing module "${existing.name}" to "${initial.name}" via Curriculum editor.`,
    };

    const { error } = await supabase.rpc("upsert_module", payload as any);
    setPullModAttachingId(null);

    if (error) {
      toast({
        title: "Could not attach module",
        description: error.message ?? "Unknown error.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Module attached",
      description: `${existing.name} → ${initial.name}`,
    });
    setAddModuleOpen(false);
    onExpandSelf?.();
    await Promise.all([
      onRefetch?.(),
      onInvalidateAttachedModulesList?.(),
    ]);
  };

  useEffect(() => {
    if (autoSlug) setSlug(slugify(name));
  }, [name, autoSlug]);

  const hasAttachmentSection = mode === "create" && !!attachToCertPathId;
  const attachedCertPath = useMemo(
    () => (attachToCertPathId ? (allCertPaths ?? []).find((p: any) => p.id === attachToCertPathId) ?? null : null),
    [allCertPaths, attachToCertPathId]
  );

  const attachmentPrereqOptions = useMemo(() => {
    return (allCurricula ?? [])
      .filter((c: any) => !c.archived_at)
      .filter((c: any) => !initial || c.id !== initial.id);
  }, [allCurricula, initial?.id]);

  const isDirty = useMemo(() => {
    if (mode === "create") {
      return (
        slug.trim().length > 0 ||
        name.trim().length > 0 ||
        description.trim().length > 0 ||
        curriculumMode !== "free_order" ||
        audienceTagsText.trim().length > 0 ||
        estimatedMinutes.trim().length > 0 ||
        isPublished ||
        reason.trim().length > 0 ||
        (hasAttachmentSection && (
          attachmentDisplayOrder !== "0" ||
          attachmentIsRequired !== true ||
          attachmentPrerequisiteCurriculumId !== "__none__"
        ))
      );
    }
    if (!initial) return false;
    const initialMin = initial.estimated_minutes == null ? "" : String(initial.estimated_minutes);
    return (
      slug !== (initial.slug ?? "") ||
      name !== (initial.name ?? "") ||
      (description ?? "") !== (initial.description ?? "") ||
      curriculumMode !== (initial.mode ?? "free_order") ||
      audienceTagsText !== startingTagsText ||
      estimatedMinutes !== initialMin ||
      isPublished !== !!initial.is_published ||
      reason.trim().length > 0
    );
  }, [
    mode, initial, startingTagsText, hasAttachmentSection,
    slug, name, description, curriculumMode, audienceTagsText, estimatedMinutes,
    isPublished, reason,
    attachmentDisplayOrder, attachmentIsRequired, attachmentPrerequisiteCurriculumId,
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

  const parsedTags = useMemo(() => {
    return audienceTagsText
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [audienceTagsText]);

  function mapRpcError(error: any): string {
    const msg: string = error?.message ?? "";
    const code: string = error?.code ?? "";
    if (msg.includes("reason_required_min_chars")) return "Reason must be at least 10 characters.";
    if (msg.includes("slug_required")) return "Slug is required.";
    if (msg.includes("name_required")) return "Name is required.";
    if (msg.includes("curriculum_archived")) return "This curriculum is archived and cannot be edited.";
    if (msg.includes("curriculum_not_found")) return "Curriculum no longer exists.";
    if (msg.includes("certification_path_not_found_or_archived")) return "The certification path is missing or archived.";
    if (msg.includes("already_archived")) return "This curriculum is already archived.";
    if (msg.includes("IMPERSONATION_DENIED") || msg.includes("permission_change")) {
      return "This action is blocked while impersonating, even in act mode.";
    }
    if (code === "23505") return "Slug already in use. Pick a different slug.";
    if (code === "23514") return "Invalid combination of fields. Check the mode and other values.";
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
      p_mode: curriculumMode,
      p_audience_tags: parsedTags,
      p_estimated_minutes: minutesNum,
      p_is_published: isPublished,
      p_certification_path_id: hasAttachmentSection ? attachToCertPathId : null,
      p_attachment_display_order: hasAttachmentSection
        ? (Number.isFinite(orderNum!) ? orderNum : 0)
        : null,
      p_attachment_is_required: hasAttachmentSection ? attachmentIsRequired : null,
      p_prerequisite_curriculum_id: hasAttachmentSection
        ? (attachmentPrerequisiteCurriculumId === "__none__" ? null : attachmentPrerequisiteCurriculumId)
        : null,
      p_reason: reason.trim(),
    };

    const { data, error } = await supabase.rpc("upsert_curriculum", payload);

    setSaving(false);

    if (error) {
      toast({
        title: mode === "create" ? "Could not create curriculum" : "Could not save curriculum",
        description: mapRpcError(error),
        variant: "destructive",
      });
      return;
    }

    const responseCurriculum = (data as any)?.curriculum;
    const newId = responseCurriculum?.id;
    const attachedCpId = (data as any)?.attachment?.certification_path_id ?? null;

    toast({
      title: mode === "create" ? "Curriculum created" : "Curriculum saved",
      description: name.trim(),
    });
    setReason("");
    onSaved(mode === "create" ? newId : undefined, attachedCpId);
  };

  const handleArchive = async () => {
    if (archiveReason.trim().length < 10 || archiving || !initial?.id) return;
    setArchiving(true);
    const { error } = await supabase.rpc("archive_curriculum", {
      p_id: initial.id,
      p_reason: archiveReason.trim(),
    } as any);
    setArchiving(false);
    if (error) {
      toast({
        title: "Could not archive curriculum",
        description: mapRpcError(error),
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Curriculum archived",
      description: initial.name ?? "",
    });
    setArchiveDialogOpen(false);
    setArchiveReason("");
    onArchived?.();
  };

  const titleText = mode === "create" ? "New curriculum" : (initial?.name ?? "Curriculum");
  const reasonLen = reason.trim().length;
  const archiveReasonLen = archiveReason.trim().length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpenText className="h-5 w-5 text-primary" />
              {titleText}
            </CardTitle>
            <CardDescription>
              {mode === "create"
                ? hasAttachmentSection && attachedCertPath
                  ? `Create a new curriculum and attach it to "${attachedCertPath.name}".`
                  : "Create a standalone curriculum. You can attach it to a certification path later."
                : "Edit the curriculum's metadata. To delete, use Archive."}
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
            <Label htmlFor="cu-name">Name *</Label>
            <Input
              id="cu-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PTP Foundations"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cu-slug">Slug *</Label>
            <Input
              id="cu-slug"
              value={slug}
              onChange={(e) => {
                setAutoSlug(false);
                setSlug(slugify(e.target.value));
              }}
              placeholder="ptp-foundations"
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Lowercase, hyphen-separated. Must be unique across all curricula.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cu-desc">Description</Label>
            <Textarea
              id="cu-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional. What this curriculum covers and who it's for."
              rows={3}
              disabled={saving}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Classification</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cu-mode">Mode</Label>
              <Select
                value={curriculumMode}
                onValueChange={setCurriculumMode}
                disabled={saving}
              >
                <SelectTrigger id="cu-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRICULUM_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Sequential: learners must complete modules in order. Free order: any order.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cu-minutes">Estimated minutes</Label>
              <Input
                id="cu-minutes"
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="cu-tags">Audience tags</Label>
            <Input
              id="cu-tags"
              value={audienceTagsText}
              onChange={(e) => setAudienceTagsText(e.target.value)}
              placeholder="e.g. coach, advanced, ptp-track"
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
              <Label htmlFor="cu-published" className="cursor-pointer">Published</Label>
              <p className="text-xs text-muted-foreground">
                Published curricula are visible to authenticated users. Unpublished are super-admin only.
              </p>
            </div>
            <Switch
              id="cu-published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
              disabled={saving}
            />
          </div>
        </div>

        {hasAttachmentSection && attachedCertPath && (
          <div className="space-y-4 rounded-md border border-dashed p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Attachment to "{attachedCertPath.name}"
            </h3>
            <p className="text-xs text-muted-foreground">
              This curriculum will be linked to the certification path with the settings below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cu-att-order">Display order</Label>
                <Input
                  id="cu-att-order"
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
                    <Label htmlFor="cu-att-req" className="cursor-pointer">Required</Label>
                    <p className="text-xs text-muted-foreground">
                      Must be completed for certification.
                    </p>
                  </div>
                  <Switch
                    id="cu-att-req"
                    checked={attachmentIsRequired}
                    onCheckedChange={setAttachmentIsRequired}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cu-att-prereq">Prerequisite curriculum (within this path)</Label>
              <Select
                value={attachmentPrerequisiteCurriculumId}
                onValueChange={setAttachmentPrerequisiteCurriculumId}
                disabled={saving}
              >
                <SelectTrigger id="cu-att-prereq">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {attachmentPrereqOptions.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {attachmentPrereqOptions.length === 0 && (
                <p className="text-xs italic text-muted-foreground">
                  No other curricula exist yet.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="cu-reason">Reason for change *</Label>
          <Textarea
            id="cu-reason"
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
          <AttachedModulesSection
            curriculumId={initial.id}
            onAddClick={() => setAddModuleOpen(true)}
            onSelectModule={(moduleId) => onSelectModule?.(moduleId)}
          />
        )}
      </CardContent>

      <AlertDialog open={archiveDialogOpen} onOpenChange={(open) => {
        setArchiveDialogOpen(open);
        if (!open) setArchiveReason("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this curriculum?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{initial?.name}</span> will be marked archived
              and unpublished. Any modules attached to it remain. Attachments from certification paths to
              this curriculum will become orphaned but not deleted. Action recorded in the super admin audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cu-archive-reason">Reason for archiving *</Label>
            <Textarea
              id="cu-archive-reason"
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

      <Dialog open={addModuleOpen} onOpenChange={setAddModuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add module to this curriculum</DialogTitle>
            <DialogDescription>
              Attach an existing module, or create a new one pre-attached to this curriculum.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="existing">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Pull in existing</TabsTrigger>
              <TabsTrigger value="new">Create new</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-3 pt-3">
              <p className="text-sm text-muted-foreground">
                Pick from existing non-archived modules not yet attached to this curriculum.
              </p>

              <div className="space-y-3 rounded-md border border-dashed p-3 bg-muted/30">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Attachment settings
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cu-pullmod-order" className="text-xs">Display order</Label>
                    <Input
                      id="cu-pullmod-order"
                      type="number"
                      min={0}
                      value={pullModDisplayOrder}
                      onChange={(e) => setPullModDisplayOrder(e.target.value)}
                      disabled={pullModAttachingId !== null}
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center justify-between w-full">
                      <div className="space-y-0.5">
                        <Label htmlFor="cu-pullmod-req" className="text-xs cursor-pointer">Required</Label>
                        <p className="text-xs text-muted-foreground">
                          Must be completed for the curriculum.
                        </p>
                      </div>
                      <Switch
                        id="cu-pullmod-req"
                        checked={pullModIsRequired}
                        onCheckedChange={setPullModIsRequired}
                        disabled={pullModAttachingId !== null}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Input
                placeholder="Search modules..."
                value={pullModSearch}
                onChange={(e) => setPullModSearch(e.target.value)}
                disabled={pullModAttachingId !== null}
              />

              {(() => {
                const filtered = (allModules ?? [])
                  .filter((m: any) => !m.archived_at)
                  .filter((m: any) => !attachedModuleIds.has(m.id))
                  .filter((m: any) => {
                    if (pullModSearch.trim() === "") return true;
                    const q = pullModSearch.toLowerCase();
                    return (
                      (m.name ?? "").toLowerCase().includes(q) ||
                      (m.slug ?? "").toLowerCase().includes(q)
                    );
                  });
                if (filtered.length === 0) {
                  return (
                    <p className="text-sm italic text-muted-foreground">
                      {(allModules ?? []).length === 0
                        ? "No modules exist yet. Use 'Create new' to make one."
                        : "No modules match. Try a different search, or use 'Create new'."}
                    </p>
                  );
                }
                return (
                  <div className="max-h-72 overflow-y-auto space-y-1 rounded-sm border p-1">
                    {filtered.map((m: any) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-sm px-3 py-2 text-sm hover:bg-muted"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <BookOpenText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{m.name}</div>
                            <div className="text-xs text-muted-foreground font-mono truncate">{m.slug}</div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => attachExistingModule(m.id, m.name)}
                          disabled={pullModAttachingId !== null}
                        >
                          {pullModAttachingId === m.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Attach"
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </TabsContent>

            <TabsContent value="new" className="space-y-3 pt-3">
              <p className="text-sm text-muted-foreground">
                Create a fresh module and attach it to this curriculum in one step.
              </p>
              <Button
                onClick={() => {
                  setAddModuleOpen(false);
                  onRequestCreateAttachedModule?.();
                }}
              >
                Open new-module editor
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export { AttachedModulesSection };
export default CurriculumEditor;
