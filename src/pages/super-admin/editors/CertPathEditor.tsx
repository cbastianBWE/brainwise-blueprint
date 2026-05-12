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
import { Checkbox } from "@/components/ui/checkbox";
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
  Trophy, GraduationCap, BookOpenText, Pencil, Plus,
  Search, Loader2, Save, Archive,
} from "lucide-react";
import {
  slugify, CERT_INSTRUMENTS, CERTIFICATION_TYPES, DELIVERY_MODES,
} from "./_shared";
import { FileUploadField } from "@/components/super-admin/FileUploadField";

function AttachedCurriculaSection({
  certPathId,
  onAddClick,
  onSelectCurriculum,
}: { certPathId: string; onAddClick: () => void; onSelectCurriculum: (curriculumId: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["cert-path-attached-curricula", certPathId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certification_path_curricula")
        .select("id, display_order, is_required, curriculum:curricula!curriculum_id(id, name, is_published, archived_at)")
        .eq("certification_path_id", certPathId)
        .order("display_order");
      if (error) throw error;
      return (data ?? []).filter((r: any) => r.curriculum && !r.curriculum.archived_at);
    },
    staleTime: 15_000,
  });

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Attached curricula</h3>
        <Button size="sm" variant="outline" onClick={onAddClick}>
          <Plus className="h-3.5 w-3.5" /> Add curriculum
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">No curricula attached yet.</p>
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
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span>{row.curriculum.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {row.is_required && (
                  <Badge variant="outline" className="text-xs">Required</Badge>
                )}
                <Badge variant={row.curriculum.is_published ? "default" : "secondary"} className="text-xs">
                  {row.curriculum.is_published ? "Published" : "Draft"}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onSelectCurriculum(row.curriculum.id)}
                  aria-label={`Edit ${row.curriculum.name}`}
                  title="Edit curriculum"
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

interface CertPathEditorProps {
  mode: "create" | "edit";
  initial: any | null;
  allCertPaths: any[];
  allCurricula: any[];
  attachedCurriculumIds: Set<string>;
  onSaved: (newId?: string) => void;
  onArchived?: () => void;
  onCancelCreate?: () => void;
  onRequestCreateAttachedCurriculum?: () => void;
  onRefetch?: () => void | Promise<void>;
  onExpandSelf?: () => void;
  onInvalidateAttachedList?: () => Promise<void>;
  onSelectCurriculum?: (curriculumId: string) => void;
}

function CertPathEditor({
  mode, initial, allCertPaths, allCurricula, attachedCurriculumIds,
  onSaved, onArchived, onCancelCreate,
  onRequestCreateAttachedCurriculum, onRefetch, onExpandSelf,
  onInvalidateAttachedList, onSelectCurriculum,
}: CertPathEditorProps) {
  const { toast } = useToast();

  const startingInstruments = useMemo<Set<string>>(() => {
    const arr = Array.isArray(initial?.cert_instrument_ids) ? initial.cert_instrument_ids : [];
    return new Set(arr.filter((x: any) => typeof x === "string"));
  }, [initial?.cert_instrument_ids]);

  const [slug, setSlug] = useState<string>(initial?.slug ?? "");
  const [name, setName] = useState<string>(initial?.name ?? "");
  const [description, setDescription] = useState<string>(initial?.description ?? "");
  const [certificationType, setCertificationType] = useState<string>(initial?.certification_type ?? "");
  const [deliveryMode, setDeliveryMode] = useState<string>(initial?.delivery_mode ?? "self_paced");
  const [instruments, setInstruments] = useState<Set<string>>(startingInstruments);
  const [prerequisitePathId, setPrerequisitePathId] = useState<string>(initial?.prerequisite_path_id ?? "__none__");
  const [isPublished, setIsPublished] = useState<boolean>(!!initial?.is_published);
  const [displayOrder, setDisplayOrder] = useState<string>(String(initial?.display_order ?? 0));
  const [reason, setReason] = useState<string>("");

  const [autoSlug, setAutoSlug] = useState<boolean>(mode === "create");
  const [saving, setSaving] = useState(false);

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiving, setArchiving] = useState(false);

  const [addCurriculumOpen, setAddCurriculumOpen] = useState(false);

  const [pullSearch, setPullSearch] = useState("");
  const [pullAttachingId, setPullAttachingId] = useState<string | null>(null);
  const suggestedNextOrder = useMemo(() => attachedCurriculumIds.size, [attachedCurriculumIds]);
  const [pullDisplayOrder, setPullDisplayOrder] = useState<string>(String(suggestedNextOrder));
  const [pullIsRequired, setPullIsRequired] = useState<boolean>(true);

  useEffect(() => {
    if (!addCurriculumOpen) {
      setPullDisplayOrder(String(suggestedNextOrder));
      setPullIsRequired(true);
      setPullSearch("");
    }
  }, [addCurriculumOpen, suggestedNextOrder]);

  const attachExistingCurriculum = async (curriculumId: string, _curriculumName: string) => {
    if (!initial?.id || pullAttachingId) return;
    setPullAttachingId(curriculumId);

    const existing = (allCurricula ?? []).find((c: any) => c.id === curriculumId);
    if (!existing) {
      setPullAttachingId(null);
      toast({
        title: "Could not attach curriculum",
        description: "Curriculum no longer exists. Refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    const orderNum = Number(pullDisplayOrder);
    const safeOrder = Number.isFinite(orderNum) && orderNum >= 0 ? Math.floor(orderNum) : 0;

    const payload = {
      p_id: existing.id,
      p_slug: existing.slug,
      p_name: existing.name,
      p_description: existing.description,
      p_mode: existing.mode,
      p_audience_tags: existing.audience_tags ?? [],
      p_estimated_minutes: existing.estimated_minutes,
      p_is_published: existing.is_published,
      p_certification_path_id: initial.id,
      p_attachment_display_order: safeOrder,
      p_attachment_is_required: pullIsRequired,
      p_prerequisite_curriculum_id: null,
      p_reason: `Attach existing curriculum "${existing.name}" to "${initial.name}" via Cert Path editor.`,
    };

    const { error } = await supabase.rpc("upsert_curriculum", payload as any);
    setPullAttachingId(null);

    if (error) {
      toast({
        title: "Could not attach curriculum",
        description: error.message ?? "Unknown error.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Curriculum attached",
      description: `${existing.name} → ${initial.name}`,
    });
    setAddCurriculumOpen(false);
    onExpandSelf?.();
    await Promise.all([
      onRefetch?.(),
      onInvalidateAttachedList?.(),
    ]);
  };

  useEffect(() => {
    if (autoSlug) setSlug(slugify(name));
  }, [name, autoSlug]);

  const isDirty = useMemo(() => {
    if (mode === "create") {
      return (
        slug.trim().length > 0 ||
        name.trim().length > 0 ||
        description.trim().length > 0 ||
        certificationType !== "" ||
        deliveryMode !== "self_paced" ||
        instruments.size > 0 ||
        prerequisitePathId !== "__none__" ||
        isPublished ||
        displayOrder !== "0" ||
        reason.trim().length > 0
      );
    }
    if (!initial) return false;
    const initialInstruments = startingInstruments;
    const instrumentsEqual =
      instruments.size === initialInstruments.size &&
      Array.from(instruments).every((x) => initialInstruments.has(x));
    return (
      slug !== (initial.slug ?? "") ||
      name !== (initial.name ?? "") ||
      (description ?? "") !== (initial.description ?? "") ||
      certificationType !== (initial.certification_type ?? "") ||
      deliveryMode !== (initial.delivery_mode ?? "self_paced") ||
      !instrumentsEqual ||
      prerequisitePathId !== (initial.prerequisite_path_id ?? "__none__") ||
      isPublished !== !!initial.is_published ||
      Number(displayOrder) !== (initial.display_order ?? 0) ||
      reason.trim().length > 0
    );
  }, [
    mode, initial, startingInstruments,
    slug, name, description, certificationType, deliveryMode,
    instruments, prerequisitePathId, isPublished, displayOrder, reason,
  ]);

  const reasonOk = reason.trim().length >= 10;
  const requiredOk =
    slug.trim().length > 0 &&
    name.trim().length > 0 &&
    certificationType !== "";
  const canSave = !saving && requiredOk && reasonOk && isDirty;

  const prerequisiteOptions = useMemo(() => {
    return (allCertPaths ?? [])
      .filter((p: any) => !p.archived_at)
      .filter((p: any) => !initial || p.id !== initial.id)
      .map((p: any) => ({ id: p.id, name: p.name ?? "(unnamed)" }));
  }, [allCertPaths, initial?.id]);

  const toggleInstrument = (id: string, checked: boolean) => {
    setInstruments((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  function mapRpcError(error: any): string {
    const msg: string = error?.message ?? "";
    const code: string = error?.code ?? "";
    if (msg.includes("reason_required_min_chars")) return "Reason must be at least 10 characters.";
    if (msg.includes("slug_required")) return "Slug is required.";
    if (msg.includes("name_required")) return "Name is required.";
    if (msg.includes("certification_type_required")) return "Certification type is required.";
    if (msg.includes("certification_path_archived")) return "This certification path is archived and cannot be edited.";
    if (msg.includes("certification_path_not_found")) return "Certification path no longer exists.";
    if (msg.includes("already_archived")) return "This certification path is already archived.";
    if (msg.includes("IMPERSONATION_DENIED") || msg.includes("permission_change")) {
      return "This action is blocked while impersonating, even in act mode.";
    }
    if (code === "23505") return "Slug already in use. Pick a different slug.";
    if (code === "23514") return "Invalid combination of fields. Check the certification type and delivery mode.";
    if (code === "42501") return "You do not have permission to perform this action.";
    return msg || "Could not save changes.";
  }

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    const orderNum = Number(displayOrder);
    const payload = {
      p_id: mode === "edit" ? initial?.id ?? null : null,
      p_slug: slug.trim(),
      p_name: name.trim(),
      p_description: description.trim() === "" ? null : description,
      p_certification_type: certificationType,
      p_delivery_mode: deliveryMode,
      p_cert_instrument_ids: Array.from(instruments),
      p_prerequisite_path_id: prerequisitePathId === "__none__" ? null : prerequisitePathId,
      p_is_published: isPublished,
      p_display_order: Number.isFinite(orderNum) ? orderNum : 0,
      p_reason: reason.trim(),
    };

    const { data, error } = await supabase.rpc("upsert_certification_path", payload as any);

    setSaving(false);

    if (error) {
      toast({
        title: mode === "create" ? "Could not create certification path" : "Could not save certification path",
        description: mapRpcError(error),
        variant: "destructive",
      });
      return;
    }

    const newId = (data as any)?.id;
    toast({
      title: mode === "create" ? "Certification path created" : "Certification path saved",
      description: name.trim(),
    });
    setReason("");
    onSaved(mode === "create" ? newId : undefined);
  };

  const handleArchive = async () => {
    if (archiveReason.trim().length < 10 || archiving || !initial?.id) return;
    setArchiving(true);
    const { error } = await supabase.rpc("archive_certification_path", {
      p_id: initial.id,
      p_reason: archiveReason.trim(),
    } as any);
    setArchiving(false);
    if (error) {
      toast({
        title: "Could not archive certification path",
        description: mapRpcError(error),
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Certification path archived",
      description: initial.name ?? "",
    });
    setArchiveDialogOpen(false);
    setArchiveReason("");
    onArchived?.();
  };

  const titleText = mode === "create" ? "New certification path" : (initial?.name ?? "Certification path");
  const reasonLen = reason.trim().length;
  const archiveReasonLen = archiveReason.trim().length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-muted-foreground" />
              {titleText}
            </CardTitle>
            <CardDescription>
              {mode === "create"
                ? "Define a new certification path. Choose its type, delivery mode, and the instruments it covers."
                : "Edit the certification path's metadata. To delete, use Archive."}
            </CardDescription>
          </div>
          {mode === "edit" && initial && (
            <Badge variant={initial.is_published ? "default" : "secondary"}>
              {initial.is_published ? "Published" : "Draft"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Identity</h3>

          <div className="space-y-2">
            <Label htmlFor="cp-name">Name *</Label>
            <Input
              id="cp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AI Transformation Coach"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp-slug">Slug *</Label>
            <Input
              id="cp-slug"
              value={slug}
              onChange={(e) => {
                setAutoSlug(false);
                setSlug(slugify(e.target.value));
              }}
              placeholder="ai-transformation-coach"
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Lowercase, hyphen-separated. Must be unique across all certification paths.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp-desc">Description</Label>
            <Textarea
              id="cp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional. What this path covers and who it's for."
              rows={3}
              disabled={saving}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Classification</h3>

          <div className="space-y-2">
            <Label htmlFor="cp-type">Certification type *</Label>
            <Select
              value={certificationType}
              onValueChange={setCertificationType}
              disabled={saving}
            >
              <SelectTrigger id="cp-type">
                <SelectValue placeholder="Select a certification type" />
              </SelectTrigger>
              <SelectContent>
                {CERTIFICATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cp-mode">Delivery mode</Label>
              <Select
                value={deliveryMode}
                onValueChange={setDeliveryMode}
                disabled={saving}
              >
                <SelectTrigger id="cp-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cp-order">Display order</Label>
              <Input
                id="cp-order"
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Instruments covered</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CERT_INSTRUMENTS.map((inst) => (
                <div key={inst.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cp-inst-${inst.id}`}
                    checked={instruments.has(inst.id)}
                    onCheckedChange={(checked) => toggleInstrument(inst.id, !!checked)}
                    disabled={saving}
                  />
                  <Label htmlFor={`cp-inst-${inst.id}`} className="cursor-pointer">
                    {inst.label}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              The instruments this path certifies the coach to administer.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp-prereq">Prerequisite path</Label>
            <Select
              value={prerequisitePathId}
              onValueChange={setPrerequisitePathId}
              disabled={saving}
            >
              <SelectTrigger id="cp-prereq">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {prerequisiteOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {prerequisiteOptions.length === 0 && (
              <p className="text-xs italic text-muted-foreground">
                No other certification paths exist yet.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Publishing</h3>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="cp-published" className="cursor-pointer">Published</Label>
              <p className="text-xs text-muted-foreground">
                Published paths are visible to authenticated users. Unpublished paths are super-admin only.
              </p>
            </div>
            <Switch
              id="cp-published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
              disabled={saving}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cp-reason">Reason for change *</Label>
          <Textarea
            id="cp-reason"
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
              {mode === "create" ? "Create" : "Save changes"}
            </Button>
          </div>
        </div>

        {mode === "edit" && initial?.id && (
          <AttachedCurriculaSection
            certPathId={initial.id}
            onAddClick={() => setAddCurriculumOpen(true)}
            onSelectCurriculum={(curriculumId) => onSelectCurriculum?.(curriculumId)}
          />
        )}
      </CardContent>

      <AlertDialog open={archiveDialogOpen} onOpenChange={(open) => {
        setArchiveDialogOpen(open);
        if (!open) setArchiveReason("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this certification path?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{initial?.name}</span> will be marked archived
              and unpublished. Attached curricula will remain but the path will no longer appear in the
              authoring tree or to learners. This action is recorded in the super admin audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cp-archive-reason">Reason for archiving *</Label>
            <Textarea
              id="cp-archive-reason"
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

      <Dialog open={addCurriculumOpen} onOpenChange={setAddCurriculumOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add curriculum to this path</DialogTitle>
            <DialogDescription>
              Attach an existing curriculum, or create a new one pre-attached to this path.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="existing">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Pull in existing</TabsTrigger>
              <TabsTrigger value="new">Create new</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-3 pt-3">
              <p className="text-sm text-muted-foreground">
                Pick from existing non-archived curricula not yet attached to this path.
              </p>

              <div className="space-y-3 rounded-md border border-dashed p-3 bg-muted/30">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Attachment settings
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cp-pull-order" className="text-xs">Display order</Label>
                    <Input
                      id="cp-pull-order"
                      type="number"
                      min={0}
                      value={pullDisplayOrder}
                      onChange={(e) => setPullDisplayOrder(e.target.value)}
                      disabled={pullAttachingId !== null}
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center justify-between w-full">
                      <div className="space-y-0.5">
                        <Label htmlFor="cp-pull-req" className="text-xs cursor-pointer">Required</Label>
                        <p className="text-xs text-muted-foreground">
                          Must be completed for certification.
                        </p>
                      </div>
                      <Switch
                        id="cp-pull-req"
                        checked={pullIsRequired}
                        onCheckedChange={setPullIsRequired}
                        disabled={pullAttachingId !== null}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Input
                placeholder="Search curricula..."
                value={pullSearch}
                onChange={(e) => setPullSearch(e.target.value)}
                disabled={pullAttachingId !== null}
              />

              {(() => {
                const filtered = (allCurricula ?? [])
                  .filter((c: any) => !c.archived_at)
                  .filter((c: any) => !attachedCurriculumIds.has(c.id))
                  .filter((c: any) => {
                    if (pullSearch.trim() === "") return true;
                    const q = pullSearch.toLowerCase();
                    return (
                      (c.name ?? "").toLowerCase().includes(q) ||
                      (c.slug ?? "").toLowerCase().includes(q)
                    );
                  });
                if (filtered.length === 0) {
                  return (
                    <p className="text-sm italic text-muted-foreground">
                      {(allCurricula ?? []).length === 0
                        ? "No curricula exist yet. Use 'Create new' to make one."
                        : "No curricula match. Try a different search, or use 'Create new'."}
                    </p>
                  );
                }
                return (
                  <div className="max-h-72 overflow-y-auto space-y-1 rounded-sm border p-1">
                    {filtered.map((c: any) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-sm px-3 py-2 text-sm hover:bg-muted"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <BookOpenText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{c.name}</div>
                            <div className="text-xs text-muted-foreground font-mono truncate">{c.slug}</div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => attachExistingCurriculum(c.id, c.name)}
                          disabled={pullAttachingId !== null}
                        >
                          {pullAttachingId === c.id ? (
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
                Create a fresh curriculum and attach it to this path in one step.
              </p>
              <Button
                onClick={() => {
                  setAddCurriculumOpen(false);
                  onRequestCreateAttachedCurriculum?.();
                }}
              >
                Open new-curriculum editor
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export { AttachedCurriculaSection };
export default CertPathEditor;
