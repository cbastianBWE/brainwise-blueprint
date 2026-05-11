import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  Library, Trophy, GraduationCap, BookOpenText, Layers,
  Video, FileQuestion, PenLine, Users, Upload, ExternalLink, CalendarClock,
  ChevronRight, ChevronDown, Search, Plus, Loader2, Save, Archive,
} from "lucide-react";

const CERT_INSTRUMENTS = [
  { id: "INST-001", label: "PTP" },
  { id: "INST-002", label: "NAI" },
  { id: "INST-003", label: "AIRSA" },
  { id: "INST-004", label: "HSS" },
];

const CERTIFICATION_TYPES = [
  { value: "ptp_coach", label: "PTP Coach" },
  { value: "ai_transformation_coach", label: "AI Transformation Coach" },
  { value: "ai_transformation_ptp_coach", label: "AI Transformation + PTP Coach" },
  { value: "my_brainwise_coach", label: "My BrainWise Coach" },
];

const DELIVERY_MODES = [
  { value: "self_paced", label: "Self-paced" },
  { value: "cohort",     label: "Cohort" },
];

const CURRICULUM_MODES = [
  { value: "free_order",  label: "Free order" },
  { value: "sequential",  label: "Sequential" },
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

type NodeType = "cp" | "cu" | "mo" | "ci";

interface TreeNode {
  type: NodeType;
  id: string;
  name: string;
  isPublished?: boolean;
  itemType?: string;
  children: TreeNode[];
}

const TYPE_LABELS: Record<NodeType, string> = {
  cp: "Certification path",
  cu: "Curriculum",
  mo: "Module",
  ci: "Content item",
};

function ItemTypeIcon({ itemType, className }: { itemType?: string; className?: string }) {
  const map: Record<string, typeof Video> = {
    video: Video,
    quiz: FileQuestion,
    written_summary: PenLine,
    skills_practice: Users,
    file_upload: Upload,
    external_link: ExternalLink,
    live_event: CalendarClock,
    lesson_blocks: Layers,
  };
  const Icon = (itemType && map[itemType]) || Layers;
  return <Icon className={className} />;
}

function NodeTypeIcon({ node, className }: { node: TreeNode; className?: string }) {
  if (node.type === "cp") return <Trophy className={className} />;
  if (node.type === "cu") return <GraduationCap className={className} />;
  if (node.type === "mo") return <BookOpenText className={className} />;
  return <ItemTypeIcon itemType={node.itemType} className={className} />;
}

function nodeKey(n: TreeNode) {
  return `${n.type}:${n.id}`;
}

function collectVisible(
  nodes: TreeNode[],
  query: string,
): { filtered: TreeNode[]; autoExpand: Set<string> } {
  const autoExpand = new Set<string>();
  const q = query.trim().toLowerCase();
  if (!q) return { filtered: nodes, autoExpand };

  const walk = (n: TreeNode): TreeNode | null => {
    const selfMatch = n.name.toLowerCase().includes(q);
    const kids = n.children.map(walk).filter(Boolean) as TreeNode[];
    if (selfMatch || kids.length > 0) {
      if (kids.length > 0) autoExpand.add(nodeKey(n));
      return { ...n, children: kids };
    }
    return null;
  };

  const filtered = nodes.map(walk).filter(Boolean) as TreeNode[];
  return { filtered, autoExpand };
}

interface RowProps {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  selectedKey: string | null;
  onToggle: (k: string) => void;
  onSelect: (k: string) => void;
}

function TreeRow({ node, depth, expanded, selectedKey, onToggle, onSelect }: RowProps) {
  const key = nodeKey(node);
  const canExpand = node.type !== "ci";
  const isOpen = expanded.has(key);
  const isSelected = selectedKey === key;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(key)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(key);
          }
        }}
        className={cn(
          "group flex items-center gap-1.5 rounded-sm py-1 pr-2 cursor-pointer text-sm",
          isSelected ? "bg-muted" : "hover:bg-muted/50",
        )}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        {canExpand ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(key);
            }}
            className="flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="inline-block h-4 w-4" />
        )}
        <NodeTypeIcon node={node} className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate" title={node.name}>{node.name}</span>
        {node.type !== "ci" && (
          <Badge variant={node.isPublished ? "default" : "secondary"} className="ml-auto shrink-0">
            {node.isPublished ? "Published" : "Draft"}
          </Badge>
        )}
      </div>
      {canExpand && isOpen && node.children.map((c) => (
        <TreeRow
          key={nodeKey(c)}
          node={c}
          depth={depth + 1}
          expanded={expanded}
          selectedKey={selectedKey}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function AttachedCurriculaSection({
  certPathId,
  onAddClick,
}: { certPathId: string; onAddClick: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["cert-path-attached-curricula", certPathId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certification_path_curricula")
        .select("id, display_order, is_required, curriculum:curricula(id, name, is_published, archived_at)")
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
  onRefetch?: () => void;
}

function CertPathEditor({
  mode, initial, allCertPaths, allCurricula, attachedCurriculumIds,
  onSaved, onArchived, onCancelCreate,
  onRequestCreateAttachedCurriculum, onRefetch,
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
    onRefetch?.();
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


interface CurriculumEditorProps {
  mode: "create" | "edit";
  initial: any | null;
  allCurricula: any[];
  allCertPaths: any[];
  attachToCertPathId: string | null;
  onSaved: (newId?: string, attachedCertPathId?: string | null) => void;
  onArchived?: () => void;
  onCancelCreate?: () => void;
}

function CurriculumEditor({
  mode, initial, allCurricula, allCertPaths, attachToCertPathId,
  onSaved, onArchived, onCancelCreate,
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
    </Card>
  );
}

export default function ContentAuthoring() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const initialExpanded = useMemo(() => {
    const raw = searchParams.get("expanded");
    return new Set<string>(raw ? raw.split(",").filter(Boolean) : []);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);
  const [selectedKey, setSelectedKey] = useState<string | null>(searchParams.get("selected"));

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["content-authoring-tree"],
    queryFn: async () => {
      const [certPaths, curricula, modules, contentItems, cpcLinks, cmLinks] = await Promise.all([
        supabase.from("certification_paths").select("*").is("archived_at", null).order("display_order").order("name"),
        supabase.from("curricula").select("*").is("archived_at", null).order("name"),
        supabase.from("modules").select("*").is("archived_at", null).order("name"),
        supabase.from("content_items").select("*").is("archived_at", null).order("display_order"),
        supabase.from("certification_path_curricula").select("*").order("display_order"),
        supabase.from("curriculum_modules").select("*").order("display_order"),
      ]);
      for (const r of [certPaths, curricula, modules, contentItems, cpcLinks, cmLinks]) {
        if (r.error) throw r.error;
      }
      return {
        certPaths: certPaths.data ?? [],
        curricula: curricula.data ?? [],
        modules: modules.data ?? [],
        contentItems: contentItems.data ?? [],
        cpcLinks: cpcLinks.data ?? [],
        cmLinks: cmLinks.data ?? [],
      };
    },
    staleTime: 30_000,
  });

  const { certPathTree, standaloneCurricula, standaloneModules, allKeyMap } = useMemo(() => {
    const empty = { certPathTree: [] as TreeNode[], standaloneCurricula: [] as TreeNode[], standaloneModules: [] as TreeNode[], allKeyMap: new Map<string, TreeNode[]>() };
    if (!data) return empty;

    const { certPaths, curricula, modules, contentItems, cpcLinks, cmLinks } = data;

    const itemsByModule = new Map<string, any[]>();
    for (const ci of contentItems) {
      const arr = itemsByModule.get(ci.module_id) ?? [];
      arr.push(ci);
      itemsByModule.set(ci.module_id, arr);
    }

    const buildModuleNode = (m: any): TreeNode => ({
      type: "mo",
      id: m.id,
      name: m.name ?? m.title ?? "(unnamed module)",
      isPublished: !!m.is_published,
      children: (itemsByModule.get(m.id) ?? []).map((ci): TreeNode => ({
        type: "ci",
        id: ci.id,
        name: ci.name ?? ci.title ?? "(unnamed item)",
        itemType: ci.item_type,
        children: [],
      })),
    });

    const moduleById = new Map(modules.map((m: any) => [m.id, m]));
    const curriculumById = new Map(curricula.map((c: any) => [c.id, c]));

    const modulesByCurriculum = new Map<string, any[]>();
    for (const link of [...cmLinks].sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))) {
      const m = moduleById.get((link as any).module_id);
      if (!m) continue;
      const arr = modulesByCurriculum.get((link as any).curriculum_id) ?? [];
      arr.push(m);
      modulesByCurriculum.set((link as any).curriculum_id, arr);
    }

    const buildCurriculumNode = (c: any): TreeNode => ({
      type: "cu",
      id: c.id,
      name: c.name ?? c.title ?? "(unnamed curriculum)",
      isPublished: !!c.is_published,
      children: (modulesByCurriculum.get(c.id) ?? []).map(buildModuleNode),
    });

    const curriculaByCertPath = new Map<string, any[]>();
    for (const link of [...cpcLinks].sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))) {
      const c = curriculumById.get((link as any).curriculum_id);
      if (!c) continue;
      const arr = curriculaByCertPath.get((link as any).certification_path_id) ?? [];
      arr.push(c);
      curriculaByCertPath.set((link as any).certification_path_id, arr);
    }

    const certPathTree: TreeNode[] = certPaths.map((cp: any) => ({
      type: "cp" as const,
      id: cp.id,
      name: cp.name ?? cp.title ?? "(unnamed cert path)",
      isPublished: !!cp.is_published,
      children: (curriculaByCertPath.get(cp.id) ?? []).map(buildCurriculumNode),
    }));

    const linkedCurriculumIds = new Set(cpcLinks.map((l: any) => l.curriculum_id));
    const standaloneCurricula: TreeNode[] = curricula
      .filter((c: any) => !linkedCurriculumIds.has(c.id))
      .map(buildCurriculumNode);

    const linkedModuleIds = new Set(cmLinks.map((l: any) => l.module_id));
    const standaloneModules: TreeNode[] = modules
      .filter((m: any) => !linkedModuleIds.has(m.id))
      .map(buildModuleNode);

    // build ancestor map for breadcrumbs
    const allKeyMap = new Map<string, TreeNode[]>();
    const walk = (n: TreeNode, ancestors: TreeNode[]) => {
      const path = [...ancestors, n];
      allKeyMap.set(nodeKey(n), path);
      for (const c of n.children) walk(c, path);
    };
    for (const n of [...certPathTree, ...standaloneCurricula, ...standaloneModules]) walk(n, []);

    return { certPathTree, standaloneCurricula, standaloneModules, allKeyMap };
  }, [data]);

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (expanded.size > 0) params.set("expanded", Array.from(expanded).join(","));
    else params.delete("expanded");
    if (selectedKey) params.set("selected", selectedKey);
    else params.delete("selected");
    setSearchParams(params, { replace: true });
  }, [expanded, selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleNode = (k: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const selectNode = (k: string) => setSelectedKey(k);

  const handleComingSoon = () => {
    toast({ title: "Coming in the next prompt" });
  };

  const sectionsRaw: { label: string; nodes: TreeNode[] }[] = [
    { label: "Certification Paths", nodes: certPathTree },
    { label: "Standalone Curricula", nodes: standaloneCurricula },
    { label: "Standalone Modules", nodes: standaloneModules },
  ];

  const sections = sectionsRaw.map((s) => {
    const { filtered, autoExpand } = collectVisible(s.nodes, debouncedSearch);
    return { ...s, nodes: filtered, autoExpand };
  });

  const effectiveExpanded = useMemo(() => {
    if (!debouncedSearch.trim()) return expanded;
    const merged = new Set(expanded);
    for (const s of sections) for (const k of s.autoExpand) merged.add(k);
    return merged;
  }, [expanded, debouncedSearch, sections]);

  const totalTopLevel = certPathTree.length + standaloneCurricula.length + standaloneModules.length;
  const selectedPath = selectedKey ? allKeyMap.get(selectedKey) ?? null : null;
  const selectedNode = selectedPath ? selectedPath[selectedPath.length - 1] : null;

  const isCurriculumCreate = selectedKey?.startsWith("cu:new") ?? false;
  const curriculumCreateAttachToCpId = (() => {
    if (!selectedKey) return null;
    if (!selectedKey.startsWith("cu:new:")) return null;
    return selectedKey.slice("cu:new:".length) || null;
  })();

  const cpAttachedIds = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const link of (data?.cpcLinks ?? []) as any[]) {
      const set = m.get(link.certification_path_id) ?? new Set<string>();
      set.add(link.curriculum_id);
      m.set(link.certification_path_id, set);
    }
    return m;
  }, [data?.cpcLinks]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content Authoring</h1>
        <p className="text-muted-foreground mt-1">
          Build certification paths, curricula, modules, lessons, and content items. Super admin only.
        </p>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: "380px 1fr" }}>
        {/* Tree navigator */}
        <Card className="flex flex-col h-[calc(100vh-220px)]">
          <CardHeader className="space-y-3 pb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search content..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedKey("cp:new")}>
                <Plus className="h-3.5 w-3.5" /> Cert Path
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedKey("cu:new")}>
                <Plus className="h-3.5 w-3.5" /> Curriculum
              </Button>
              <Button size="sm" variant="outline" onClick={handleComingSoon}>
                <Plus className="h-3.5 w-3.5" /> Module
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pt-0">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-muted-foreground">Could not load content tree.</p>
                <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
              </div>
            ) : totalTopLevel === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Library className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No content authored yet.</p>
                <p className="text-xs text-muted-foreground">Click + Cert Path to start.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sections.map((section) => (
                  <div key={section.label} className="space-y-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.label}
                    </h3>
                    {section.nodes.length === 0 ? (
                      <p className="pl-2 text-xs italic text-muted-foreground">(none)</p>
                    ) : (
                      section.nodes.map((n) => (
                        <TreeRow
                          key={nodeKey(n)}
                          node={n}
                          depth={0}
                          expanded={effectiveExpanded}
                          selectedKey={selectedKey}
                          onToggle={toggleNode}
                          onSelect={selectNode}
                        />
                      ))
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right pane */}
        <div>
          {!selectedNode && selectedKey !== "cp:new" && !isCurriculumCreate ? (
            <Card>
              <CardContent className="flex items-center justify-center py-24">
                <p className="text-sm text-muted-foreground">
                  Select an item from the tree to view or edit.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                {selectedKey === "cp:new" ? (
                  <span className="font-medium text-foreground">New certification path</span>
                ) : isCurriculumCreate ? (
                  curriculumCreateAttachToCpId ? (
                    <>
                      <span>
                        Cert path: {(data?.certPaths ?? []).find((p: any) => p.id === curriculumCreateAttachToCpId)?.name ?? "(unknown)"}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">New curriculum</span>
                    </>
                  ) : (
                    <span className="font-medium text-foreground">New curriculum</span>
                  )
                ) : (
                  selectedPath!.map((n, idx) => {
                    const isLast = idx === selectedPath!.length - 1;
                    const label = `${TYPE_LABELS[n.type]}: ${n.name}`;
                    return (
                      <span key={nodeKey(n)} className="flex items-center gap-1">
                        {isLast ? (
                          <span className="font-medium text-foreground">{label}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => selectNode(nodeKey(n))}
                            className="hover:text-foreground hover:underline"
                          >
                            {label}
                          </button>
                        )}
                        {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
                      </span>
                    );
                  })
                )}
              </div>

              {selectedKey === "cp:new" ? (
                <CertPathEditor
                  key="cp:new"
                  mode="create"
                  initial={null}
                  allCertPaths={data?.certPaths ?? []}
                  allCurricula={data?.curricula ?? []}
                  attachedCurriculumIds={new Set()}
                  onSaved={(newId) => {
                    refetch();
                    if (newId) setSelectedKey(`cp:${newId}`);
                    else setSelectedKey(null);
                  }}
                  onCancelCreate={() => setSelectedKey(null)}
                />
              ) : selectedNode?.type === "cp" ? (
                <CertPathEditor
                  key={`cp:${selectedNode.id}`}
                  mode="edit"
                  initial={(data?.certPaths ?? []).find((p: any) => p.id === selectedNode.id) ?? null}
                  allCertPaths={data?.certPaths ?? []}
                  allCurricula={data?.curricula ?? []}
                  attachedCurriculumIds={cpAttachedIds.get(selectedNode.id) ?? new Set()}
                  onSaved={() => refetch()}
                  onArchived={() => {
                    refetch();
                    setSelectedKey(null);
                  }}
                  onRequestCreateAttachedCurriculum={() => {
                    setSelectedKey(`cu:new:${selectedNode.id}`);
                  }}
                  onRefetch={() => refetch()}
                />
              ) : isCurriculumCreate ? (
                <CurriculumEditor
                  key={selectedKey ?? "cu:new"}
                  mode="create"
                  initial={null}
                  allCurricula={data?.curricula ?? []}
                  allCertPaths={data?.certPaths ?? []}
                  attachToCertPathId={curriculumCreateAttachToCpId}
                  onSaved={(newId) => {
                    refetch();
                    if (newId) setSelectedKey(`cu:${newId}`);
                    else setSelectedKey(null);
                  }}
                  onCancelCreate={() => setSelectedKey(null)}
                />
              ) : selectedNode?.type === "cu" ? (
                <CurriculumEditor
                  key={`cu:${selectedNode.id}`}
                  mode="edit"
                  initial={(data?.curricula ?? []).find((c: any) => c.id === selectedNode.id) ?? null}
                  allCurricula={data?.curricula ?? []}
                  allCertPaths={data?.certPaths ?? []}
                  attachToCertPathId={null}
                  onSaved={() => refetch()}
                  onArchived={() => {
                    refetch();
                    setSelectedKey(null);
                  }}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>{TYPE_LABELS[selectedNode!.type]} editor</CardTitle>
                    <CardDescription>
                      The {TYPE_LABELS[selectedNode!.type].toLowerCase()} editor will be built in the next prompt.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</p>
                      <p className="mt-1 text-sm">{selectedNode!.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ID</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{selectedNode!.id}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
