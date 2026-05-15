import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Save, Archive, BookOpen, Plus, X } from "lucide-react";
import { FileUploadField } from "@/components/super-admin/FileUploadField";
import {
  GRANT_TYPE_OPTIONS, ACCOUNT_TYPE_OPTIONS, PLAN_TIER_OPTIONS,
  CORPORATE_LEVEL_OPTIONS, CONTENT_TYPE_OPTIONS, CERTIFICATION_TYPES,
} from "./_resourceShared";

interface ResourceEditorProps {
  mode: "create" | "edit";
  initial: any | null;
  resourceTabs: any[];
  organizations: any[];
  onSaved: (newId?: string) => void;
  onArchived?: () => void;
  onCancelCreate?: () => void;
}

interface GrantRow {
  uid: string;
  grant_type: string;
  grant_value: string;
  grant_org_id: string;
}

function newGrantRow(): GrantRow {
  return {
    uid: crypto.randomUUID(),
    grant_type: "",
    grant_value: "",
    grant_org_id: "",
  };
}

function rowComplete(r: GrantRow): boolean {
  if (!r.grant_type) return false;
  if (r.grant_type === "all_coaches") return true;
  if (r.grant_type === "organization") return !!r.grant_org_id;
  return !!r.grant_value;
}

function rowToPayload(r: GrantRow): any {
  if (r.grant_type === "all_coaches") return { grant_type: "all_coaches" };
  if (r.grant_type === "organization") return { grant_type: "organization", grant_org_id: r.grant_org_id };
  return { grant_type: r.grant_type, grant_value: r.grant_value };
}

export default function ResourceEditor({
  mode, initial, resourceTabs, organizations,
  onSaved, onArchived, onCancelCreate,
}: ResourceEditorProps) {
  const { toast } = useToast();

  const [title, setTitle] = useState<string>(initial?.title ?? "");
  const [summary, setSummary] = useState<string>(initial?.summary ?? "");
  const [urlOrContent, setUrlOrContent] = useState<string>(initial?.url_or_content ?? "");
  const [contentType, setContentType] = useState<string>(initial?.content_type ?? "");
  const [resourceTabId, setResourceTabId] = useState<string>(initial?.resource_tab_id ?? "");
  const [isPublished, setIsPublished] = useState<boolean>(!!initial?.is_published);
  const [thumbnailAssetId, setThumbnailAssetId] = useState<string | null>(initial?.thumbnail_asset_id ?? null);
  const [contentAssetId, setContentAssetId] = useState<string | null>(initial?.content_asset_id ?? null);
  const [reason, setReason] = useState<string>("");
  const [urlKind, setUrlKind] = useState<"external_link" | "inline_html" | "">(
    initial?.url_kind ?? ""
  );
  const [saving, setSaving] = useState(false);

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiving, setArchiving] = useState(false);

  // Grants state (edit mode only)
  const grantsQuery = useQuery({
    queryKey: ["resource_access_grants", initial?.id],
    enabled: mode === "edit" && !!initial?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resource_access_grants")
        .select("*")
        .eq("resource_id", initial.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [grantRows, setGrantRows] = useState<GrantRow[]>([]);
  const [grantReason, setGrantReason] = useState<string>("");
  const [savingGrants, setSavingGrants] = useState(false);

  useEffect(() => {
    if (grantsQuery.data) {
      setGrantRows(
        grantsQuery.data.map((g: any) => ({
          uid: g.id ?? crypto.randomUUID(),
          grant_type: g.grant_type ?? "",
          grant_value: g.grant_value ?? "",
          grant_org_id: g.grant_org_id ?? "",
        }))
      );
    }
  }, [grantsQuery.data]);

  const isDirty = useMemo(() => {
    if (mode === "create") {
      return (
        title.trim().length > 0 ||
        summary.trim().length > 0 ||
        urlOrContent.trim().length > 0 ||
        contentType !== "" ||
        resourceTabId !== "" ||
        isPublished ||
        thumbnailAssetId !== null ||
        contentAssetId !== null ||
        urlKind !== "" ||
        reason.trim().length > 0
      );
    }
    if (!initial) return false;
    return (
      title !== (initial.title ?? "") ||
      (summary ?? "") !== (initial.summary ?? "") ||
      (urlOrContent ?? "") !== (initial.url_or_content ?? "") ||
      (contentType ?? "") !== (initial.content_type ?? "") ||
      resourceTabId !== (initial.resource_tab_id ?? "") ||
      isPublished !== !!initial.is_published ||
      thumbnailAssetId !== (initial.thumbnail_asset_id ?? null) ||
      (contentAssetId ?? null) !== (initial.content_asset_id ?? null) ||
      urlKind !== (initial.url_kind ?? "") ||
      reason.trim().length > 0
    );
  }, [
    mode, initial, title, summary, urlOrContent, contentType,
    resourceTabId, isPublished, thumbnailAssetId, contentAssetId, urlKind, reason,
  ]);

  const reasonOk = reason.trim().length >= 10;
  const requiredOk = title.trim().length > 0 && resourceTabId.length > 0;
  const canSave = !saving && requiredOk && reasonOk && isDirty;

  function mapRpcError(error: any): string {
    const msg: string = error?.message ?? "";
    const code: string = error?.code ?? "";
    if (msg.includes("reason_required_min_chars")) return "Reason must be at least 10 characters.";
    if (msg.includes("title_required")) return "Title is required.";
    if (msg.includes("resource_tab_id_required")) return "A tab must be selected.";
    if (msg.includes("resource_tab_not_found")) return "The selected tab no longer exists.";
    if (msg.includes("cannot_place_resource_in_learning_tree_tab")) return "Resources cannot be placed in the My Learning tab.";
    if (msg.includes("resource_already_archived")) return "This resource is already archived.";
    if (msg.includes("resource_archived") || msg.includes("resource_not_found_or_archived") || msg.includes("resource_not_found")) {
      return "This resource is missing or archived.";
    }
    if (msg.includes("grants_must_be_array")) return "Could not save grants — invalid format.";
    if (msg.includes("content_asset_required_to_publish_")) {
      const m = msg.match(/content_asset_required_to_publish_(\w+)/);
      const type = m?.[1] ?? "resource";
      return `A content file is required before publishing a ${type}.`;
    }
    if (msg.includes("url_or_file_required_to_publish_")) {
      const m = msg.match(/url_or_file_required_to_publish_(\w+)/);
      const type = m?.[1] ?? "resource";
      return `Provide either a URL or a file before publishing this ${type}.`;
    }
    if (msg.includes("provide_url_or_file_not_both_to_publish_")) {
      const m = msg.match(/provide_url_or_file_not_both_to_publish_(\w+)/);
      const type = m?.[1] ?? "resource";
      return `For ${type} resources, provide either a URL OR a file — not both.`;
    }
    if (msg.includes("url_kind_required_to_publish_")) {
      return "Choose whether this URL should open externally or render inline before publishing.";
    }
    if (msg.includes("invalid_url_kind")) {
      return "Invalid URL behavior selection. Please re-select.";
    }
    if (code === "42501") return "You do not have permission to perform this action.";
    if (code === "23505") return "A resource conflict occurred.";
    return msg || "Could not save changes.";
  }

  const handleSave = async () => {
    if (!canSave) return;

    if (isPublished) {
      const hasUrl = urlOrContent.trim().length > 0;
      const hasFile = contentAssetId != null;

      if (contentType === "guide" || contentType === "worksheet" || contentType === "template") {
        if (!hasFile) {
          toast({
            title: "Content file required",
            description: `A content file is required before publishing a ${contentType}.`,
            variant: "destructive",
          });
          return;
        }
      }

      if (contentType === "article" || contentType === "video") {
        if (!hasUrl && !hasFile) {
          toast({
            title: "Content required",
            description: `Provide either a URL or a file before publishing this ${contentType}.`,
            variant: "destructive",
          });
          return;
        }
        if (hasUrl && hasFile) {
          toast({
            title: "Provide one, not both",
            description: `For ${contentType} resources, provide either a URL OR a file — not both.`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    if (isPublished && (contentType === "article" || contentType === "video")) {
      const hasUrl = urlOrContent.trim().length > 0;
      const hasFile = contentAssetId != null;
      if (hasUrl && !hasFile && !urlKind) {
        toast({
          title: "URL behavior required",
          description: "Choose whether this URL should open externally or render inline.",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);

    const payload: any = {
      p_id: mode === "edit" ? initial?.id ?? null : null,
      p_resource_tab_id: resourceTabId,
      p_title: title.trim(),
      p_summary: summary.trim() === "" ? null : summary,
      p_url_or_content: urlOrContent.trim() === "" ? null : urlOrContent,
      p_content_type: contentType || null,
      p_is_published: isPublished,
      p_thumbnail_asset_id: thumbnailAssetId,
      p_content_asset_id: contentAssetId,
      p_url_kind: urlKind === "" ? null : urlKind,
      p_reason: reason.trim(),
    };

    const { data, error } = await supabase.rpc("upsert_resource", payload);

    setSaving(false);

    if (error) {
      toast({
        title: mode === "create" ? "Could not create resource" : "Could not save resource",
        description: mapRpcError(error),
        variant: "destructive",
      });
      return;
    }

    const newId = (data as any)?.resource_id;
    toast({
      title: mode === "create" ? "Resource created" : "Resource saved",
      description: title.trim(),
    });
    setReason("");
    onSaved(mode === "create" ? newId : undefined);
  };

  const handleArchive = async () => {
    if (archiveReason.trim().length < 10 || archiving || !initial?.id) return;
    setArchiving(true);
    const { error } = await supabase.rpc("archive_resource", {
      p_id: initial.id,
      p_reason: archiveReason.trim(),
    } as any);
    setArchiving(false);
    if (error) {
      toast({
        title: "Could not archive resource",
        description: mapRpcError(error),
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Resource archived", description: initial.title ?? "" });
    setArchiveDialogOpen(false);
    setArchiveReason("");
    onArchived?.();
  };

  const handleSaveGrants = async () => {
    if (!initial?.id) return;
    if (grantReason.trim().length < 10) return;
    setSavingGrants(true);
    const grants = grantRows.filter(rowComplete).map(rowToPayload);
    const { error } = await supabase.rpc("set_resource_access_grants", {
      p_resource_id: initial.id,
      p_grants: grants as any,
      p_reason: grantReason.trim(),
    } as any);
    setSavingGrants(false);
    if (error) {
      toast({
        title: "Could not save access grants",
        description: mapRpcError(error),
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Access grants saved", description: `${grants.length} grant(s) active.` });
    setGrantReason("");
    grantsQuery.refetch();
  };

  const updateGrantRow = (uid: string, patch: Partial<GrantRow>) => {
    setGrantRows((rows) => rows.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  };
  const removeGrantRow = (uid: string) => {
    setGrantRows((rows) => rows.filter((r) => r.uid !== uid));
  };
  const addGrantRow = () => setGrantRows((rows) => [...rows, newGrantRow()]);

  const titleText = mode === "create" ? "New resource" : (initial?.title ?? "Resource");
  const reasonLen = reason.trim().length;
  const archiveReasonLen = archiveReason.trim().length;
  const grantReasonLen = grantReason.trim().length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              {titleText}
            </CardTitle>
            <CardDescription>
              {mode === "create"
                ? "Create a new resource. Tab assignment and title are required."
                : "Edit this resource. To delete, use Archive."}
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
        {/* Thumbnail */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Thumbnail</h3>
          <p className="text-xs text-muted-foreground">
            Optional. Shown alongside this resource in the Resources tab.
          </p>
          {mode === "create" ? (
            <div className="rounded-md border border-dashed p-4 text-sm italic text-muted-foreground">
              Save the resource first to add a thumbnail.
            </div>
          ) : (
            <FileUploadField
              assetKind="image"
              resourceId={initial?.id ?? null}
              refField="thumbnail"
              value={thumbnailAssetId}
              onChange={setThumbnailAssetId}
              disabled={saving}
            />
          )}
        </div>

        {/* Content file */}
        {contentType !== "" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Content file</h3>
            <p className="text-xs text-muted-foreground">
              {contentType === "article" || contentType === "video"
                ? `Optional. If you don't upload a file, provide a URL in "URL or content" below. Required to publish (one or the other).`
                : `The ${contentType} file users will download. Private — served via short-lived signed URLs. Required to publish.`}
            </p>
            {mode === "create" ? (
              <div className="rounded-md border border-dashed p-4 text-sm italic text-muted-foreground">
                Save the resource first to upload a content file.
              </div>
            ) : (
              <FileUploadField
                assetKind="document"
                resourceId={initial?.id ?? null}
                refField="content"
                value={contentAssetId}
                onChange={setContentAssetId}
                disabled={saving}
              />
            )}
          </div>
        )}

        {/* Identity */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Identity</h3>
          <div className="space-y-2">
            <Label htmlFor="r-title">Title *</Label>
            <Input
              id="r-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Getting Started with PTP"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-summary">Summary</Label>
            <Textarea
              id="r-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="Optional. A short blurb shown alongside the title."
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-url">URL or content</Label>
            <Textarea
              id="r-url"
              value={urlOrContent}
              onChange={(e) => setUrlOrContent(e.target.value)}
              rows={3}
              placeholder="External link or inline body content."
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              {contentType === "article" || contentType === "video"
                ? "Provide either a URL or upload a file above — not both."
                : contentType === "guide" || contentType === "worksheet" || contentType === "template"
                ? "Not used for this content type. Upload a file above instead."
                : "External link or inline body content."}
            </p>
          </div>

          {(contentType === "article" || contentType === "video") &&
            urlOrContent.trim().length > 0 &&
            contentAssetId == null && (
              <div className="space-y-2">
                <Label>How should this URL behave?</Label>
                <RadioGroup
                  value={urlKind}
                  onValueChange={(v) => setUrlKind(v as "external_link" | "inline_html")}
                  disabled={saving}
                  className="space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="external_link" id="urlkind-external" className="mt-1" />
                    <div className="space-y-0.5">
                      <Label htmlFor="urlkind-external" className="font-medium">
                        External link
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Clicking the tile opens this URL in a new browser tab. Best for linking to outside articles or sites the user should view at the source.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="inline_html" id="urlkind-inline" className="mt-1" />
                    <div className="space-y-0.5">
                      <Label htmlFor="urlkind-inline" className="font-medium">
                        Inline content
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {contentType === "video"
                          ? "Embeds the video inside our app (works for YouTube and Vimeo)."
                          : "Renders the HTML content directly inside our reader page. Use when the value above is an HTML body, not an external URL."}
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}
          <div className="space-y-2">
            <Label htmlFor="r-ctype">Content type</Label>
            <Select value={contentType} onValueChange={setContentType} disabled={saving}>
              <SelectTrigger id="r-ctype">
                <SelectValue placeholder="Choose a content type" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tab assignment */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Tab assignment</h3>
          <div className="space-y-2">
            <Label htmlFor="r-tab">Tab *</Label>
            <Select value={resourceTabId} onValueChange={setResourceTabId} disabled={saving}>
              <SelectTrigger id="r-tab">
                <SelectValue placeholder="Choose a tab" />
              </SelectTrigger>
              <SelectContent>
                {resourceTabs.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Publishing */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Publishing</h3>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="r-published" className="cursor-pointer">Published</Label>
              <p className="text-xs text-muted-foreground">
                Published resources are visible to users with matching access grants. Unpublished are super-admin only.
              </p>
            </div>
            <Switch
              id="r-published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
              disabled={saving}
            />
          </div>
        </div>

        {/* Access grants */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Access grants</h3>
          {mode === "create" ? (
            <div className="rounded-md border border-dashed p-4 text-sm italic text-muted-foreground">
              Save the resource first to configure access grants.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Define who can see this resource. Add one or more grants below. Grants are saved as a separate audited action.
              </p>

              {grantsQuery.isLoading ? (
                <p className="text-sm italic text-muted-foreground">Loading grants…</p>
              ) : grantRows.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">No grants yet.</p>
              ) : (
                <div className="space-y-2">
                  {grantRows.map((row) => (
                    <div key={row.uid} className="flex items-center gap-2">
                      <Select
                        value={row.grant_type}
                        onValueChange={(v) => updateGrantRow(row.uid, {
                          grant_type: v,
                          grant_value: "",
                          grant_org_id: "",
                        })}
                        disabled={savingGrants}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Grant type" />
                        </SelectTrigger>
                        <SelectContent>
                          {GRANT_TYPE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {row.grant_type === "account_type" && (
                        <Select
                          value={row.grant_value}
                          onValueChange={(v) => updateGrantRow(row.uid, { grant_value: v })}
                          disabled={savingGrants}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Account type" />
                          </SelectTrigger>
                          <SelectContent>
                            {ACCOUNT_TYPE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {row.grant_type === "plan_tier" && (
                        <Select
                          value={row.grant_value}
                          onValueChange={(v) => updateGrantRow(row.uid, { grant_value: v })}
                          disabled={savingGrants}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Plan tier" />
                          </SelectTrigger>
                          <SelectContent>
                            {PLAN_TIER_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {row.grant_type === "corporate_level" && (
                        <Select
                          value={row.grant_value}
                          onValueChange={(v) => updateGrantRow(row.uid, { grant_value: v })}
                          disabled={savingGrants}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Corporate level" />
                          </SelectTrigger>
                          <SelectContent>
                            {CORPORATE_LEVEL_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {row.grant_type === "coach_certification" && (
                        <Select
                          value={row.grant_value}
                          onValueChange={(v) => updateGrantRow(row.uid, { grant_value: v })}
                          disabled={savingGrants}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Certification" />
                          </SelectTrigger>
                          <SelectContent>
                            {CERTIFICATION_TYPES.map((o: any) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {row.grant_type === "organization" && (
                        <Select
                          value={row.grant_org_id}
                          onValueChange={(v) => updateGrantRow(row.uid, { grant_org_id: v })}
                          disabled={savingGrants}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {organizations.map((o: any) => (
                              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {row.grant_type === "all_coaches" && (
                        <div className="flex-1 text-xs italic text-muted-foreground px-2">
                          Applies to all coaches.
                        </div>
                      )}
                      {!row.grant_type && <div className="flex-1" />}

                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeGrantRow(row.uid)}
                        aria-label="Remove grant"
                        disabled={savingGrants}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addGrantRow}
                disabled={savingGrants}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add grant
              </Button>

              <div className="space-y-2 pt-2">
                <Label htmlFor="r-grant-reason">Reason for grants change *</Label>
                <Textarea
                  id="r-grant-reason"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  rows={2}
                  placeholder="Explain why grants are changing. Recorded in the super admin audit log."
                  disabled={savingGrants}
                />
                <p className={cn("text-xs", grantReasonLen >= 10 ? "text-muted-foreground" : "text-destructive")}>
                  {grantReasonLen}/10 characters minimum.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleSaveGrants}
                disabled={savingGrants || grantReasonLen < 10}
              >
                {savingGrants ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save grants
              </Button>
            </div>
          )}
        </div>

        {/* Reason for change */}
        <div className="space-y-2">
          <Label htmlFor="r-reason">Reason for change *</Label>
          <Textarea
            id="r-reason"
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

        {/* Action row */}
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
              <Button variant="outline" onClick={onCancelCreate} disabled={saving}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSave} disabled={!canSave}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {mode === "create" ? "Create" : "Save changes"}
            </Button>
          </div>
        </div>
      </CardContent>

      <AlertDialog
        open={archiveDialogOpen}
        onOpenChange={(open) => {
          setArchiveDialogOpen(open);
          if (!open) setArchiveReason("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this resource?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{initial?.title}</span> will be marked archived
              and unpublished. Action recorded in the super admin audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="r-archive-reason">Reason for archiving *</Label>
            <Textarea
              id="r-archive-reason"
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
    </Card>
  );
}
