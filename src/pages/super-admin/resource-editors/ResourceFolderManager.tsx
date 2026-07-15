import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Folder as FolderIcon, FolderPlus, Pencil, Move, Shield, Archive, Plus, X, Loader2, Save,
} from "lucide-react";
import {
  GRANT_TYPE_OPTIONS, ACCOUNT_TYPE_OPTIONS, PLAN_TIER_OPTIONS,
  CORPORATE_LEVEL_OPTIONS, CERTIFICATION_TYPES,
} from "./_resourceShared";

interface ResourceFolderManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: any[];
  organizations: any[];
  onChanged: () => void;
}

interface Folder {
  id: string;
  tab_id: string;
  parent_folder_id: string | null;
  name: string;
  slug: string;
  display_order: number;
  archived_at: string | null;
}

interface GrantRow {
  uid: string;
  grant_type: string;
  grant_value: string;
  grant_org_id: string;
}

function newGrantRow(): GrantRow {
  return { uid: crypto.randomUUID(), grant_type: "", grant_value: "", grant_org_id: "" };
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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function mapFolderError(error: any): string {
  const msg: string = error?.message ?? "";
  const code: string = error?.code ?? "";
  if (code === "23505" || msg.includes("duplicate")) return "A folder with that name already exists here.";
  if (msg.includes("resource_folder_tab_mismatch")) return "That folder belongs to a different tab.";
  if (msg.includes("reason_required_min_chars")) return "Reason must be at least 10 characters.";
  if (msg.includes("folder_has_children")) return "This folder has subfolders. Move or archive them first.";
  if (msg.includes("max_folder_depth") || msg.includes("folder_depth")) return "Only two levels of folders are allowed.";
  return msg || "Could not complete the action.";
}

type DialogState =
  | { kind: "none" }
  | { kind: "create"; parentId: string | null }
  | { kind: "rename"; folder: Folder }
  | { kind: "move"; folder: Folder }
  | { kind: "archive"; folder: Folder }
  | { kind: "grants"; folder: Folder };

export default function ResourceFolderManager({
  open, onOpenChange, tabs, organizations, onChanged,
}: ResourceFolderManagerProps) {
  const { toast } = useToast();
  const nonLearningTabs = useMemo(
    () => tabs.filter((t: any) => !t.is_learning_tree),
    [tabs]
  );

  const [tabId, setTabId] = useState<string>("");
  useEffect(() => {
    if (open && !tabId && nonLearningTabs.length > 0) {
      setTabId(nonLearningTabs[0].id);
    }
  }, [open, nonLearningTabs, tabId]);

  const foldersQuery = useQuery({
    queryKey: ["resource_folders_manage", tabId],
    enabled: open && !!tabId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resource_folders")
        .select("*")
        .eq("tab_id", tabId)
        .is("archived_at", null)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as Folder[];
    },
  });

  const folders = foldersQuery.data ?? [];
  const topLevel = useMemo(
    () => [...folders.filter((f) => !f.parent_folder_id)]
      .sort((a, b) => (a.display_order - b.display_order) || a.name.localeCompare(b.name)),
    [folders]
  );
  const childrenOf = (parentId: string) =>
    [...folders.filter((f) => f.parent_folder_id === parentId)]
      .sort((a, b) => (a.display_order - b.display_order) || a.name.localeCompare(b.name));

  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const closeDialog = () => setDialog({ kind: "none" });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Folders</DialogTitle>
            <DialogDescription>
              Organize resources into folders within a tab. Two levels only. All changes are audited.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tab</Label>
              <div className="flex items-center gap-2">
                <Select value={tabId} onValueChange={setTabId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose a tab" />
                  </SelectTrigger>
                  <SelectContent>
                    {nonLearningTabs.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDialog({ kind: "create", parentId: null })}
                  disabled={!tabId}
                >
                  <FolderPlus className="h-4 w-4 mr-1" /> New folder
                </Button>
              </div>
            </div>

            <div className="rounded-md border">
              {foldersQuery.isLoading ? (
                <div className="p-6 text-sm italic text-muted-foreground">Loading folders…</div>
              ) : topLevel.length === 0 ? (
                <div className="p-6 text-sm italic text-muted-foreground text-center">
                  No folders yet. Click "New folder" to create one.
                </div>
              ) : (
                <div className="divide-y">
                  {topLevel.map((f) => {
                    const subs = childrenOf(f.id);
                    return (
                      <div key={f.id}>
                        <FolderRow
                          folder={f}
                          isSubfolder={false}
                          onAddSub={() => setDialog({ kind: "create", parentId: f.id })}
                          onRename={() => setDialog({ kind: "rename", folder: f })}
                          onMove={() => setDialog({ kind: "move", folder: f })}
                          onGrants={() => setDialog({ kind: "grants", folder: f })}
                          onArchive={() => setDialog({ kind: "archive", folder: f })}
                        />
                        {subs.map((s) => (
                          <FolderRow
                            key={s.id}
                            folder={s}
                            isSubfolder
                            onAddSub={() => { /* never */ }}
                            onRename={() => setDialog({ kind: "rename", folder: s })}
                            onMove={() => setDialog({ kind: "move", folder: s })}
                            onGrants={() => setDialog({ kind: "grants", folder: s })}
                            onArchive={() => setDialog({ kind: "archive", folder: s })}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(dialog.kind === "create" || dialog.kind === "rename") && (
        <NameDialog
          key={dialog.kind === "create" ? `create-${dialog.parentId ?? "root"}` : `rename-${dialog.folder.id}`}
          state={dialog}
          tabId={tabId}
          folders={folders}
          onDone={() => {
            closeDialog();
            foldersQuery.refetch();
            onChanged();
          }}
          onCancel={closeDialog}
          toast={toast}
        />
      )}

      {dialog.kind === "move" && (
        <MoveDialog
          key={`move-${dialog.folder.id}`}
          folder={dialog.folder}
          topLevel={topLevel}
          folders={folders}
          onDone={() => {
            closeDialog();
            foldersQuery.refetch();
            onChanged();
          }}
          onCancel={closeDialog}
          toast={toast}
        />
      )}

      {dialog.kind === "archive" && (
        <ArchiveDialog
          key={`archive-${dialog.folder.id}`}
          folder={dialog.folder}
          onDone={() => {
            closeDialog();
            foldersQuery.refetch();
            onChanged();
          }}
          onCancel={closeDialog}
          toast={toast}
        />
      )}

      {dialog.kind === "grants" && (
        <GrantsDialog
          key={`grants-${dialog.folder.id}`}
          folder={dialog.folder}
          organizations={organizations}
          onDone={() => {
            closeDialog();
            onChanged();
          }}
          onCancel={closeDialog}
          toast={toast}
        />
      )}
    </>
  );
}

function FolderRow({
  folder, isSubfolder, onAddSub, onRename, onMove, onGrants, onArchive,
}: {
  folder: Folder;
  isSubfolder: boolean;
  onAddSub: () => void;
  onRename: () => void;
  onMove: () => void;
  onGrants: () => void;
  onArchive: () => void;
}) {
  return (
    <div className={cn("flex items-center gap-2 px-3 py-2", isSubfolder && "pl-10 bg-muted/30")}>
      <FolderIcon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="flex-1 truncate text-sm">{folder.name}</span>
      <div className="flex items-center gap-1">
        {!isSubfolder && (
          <Button size="sm" variant="ghost" onClick={onAddSub} title="Add subfolder">
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onRename} title="Rename">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onMove} title="Move">
          <Move className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onGrants} title="Grants">
          <Shield className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onArchive} title="Archive" className="text-destructive hover:text-destructive">
          <Archive className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function NameDialog({
  state, tabId, folders, onDone, onCancel, toast,
}: {
  state: Extract<DialogState, { kind: "create" } | { kind: "rename" }>;
  tabId: string;
  folders: Folder[];
  onDone: () => void;
  onCancel: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const isCreate = state.kind === "create";
  const [name, setName] = useState<string>(isCreate ? "" : state.folder.name);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const reasonLen = reason.trim().length;
  const slugOk = slugify(name).length > 0;
  const canSave = !saving && reasonLen >= 10 && slugOk && name.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSave) return;
    setSaving(true);

    let payload: any;
    if (isCreate) {
      const parentId = state.parentId;
      const siblings = folders.filter((f) => (f.parent_folder_id ?? null) === parentId);
      payload = {
        p_id: null,
        p_tab_id: tabId,
        p_parent_folder_id: parentId,
        p_name: name.trim(),
        p_slug: slugify(name),
        p_display_order: siblings.length,
        p_reason: reason.trim(),
      };
    } else {
      const f = state.folder;
      payload = {
        p_id: f.id,
        p_tab_id: f.tab_id,
        p_parent_folder_id: f.parent_folder_id,
        p_name: name.trim(),
        p_slug: slugify(name),
        p_display_order: f.display_order,
        p_reason: reason.trim(),
      };
    }

    const { error } = await supabase.rpc("upsert_resource_folder" as any, payload);
    setSaving(false);
    if (error) {
      toast({
        title: isCreate ? "Could not create folder" : "Could not rename folder",
        description: mapFolderError(error),
        variant: "destructive",
      });
      return;
    }
    toast({ title: isCreate ? "Folder created" : "Folder renamed", description: name.trim() });
    onDone();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isCreate
              ? state.parentId ? "New subfolder" : "New folder"
              : "Rename folder"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Name *</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Onboarding"
              disabled={saving}
            />
            {name.trim().length > 0 && !slugOk && (
              <p className="text-xs text-destructive">Name must contain letters or numbers.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="folder-reason">Reason *</Label>
            <Textarea
              id="folder-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Explain why. Recorded in the audit log."
              disabled={saving}
            />
            <p className={cn("text-xs", reasonLen >= 10 ? "text-muted-foreground" : "text-destructive")}>
              {reasonLen}/10 characters minimum.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSave}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isCreate ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MoveDialog({
  folder, topLevel, folders, onDone, onCancel, toast,
}: {
  folder: Folder;
  topLevel: Folder[];
  folders: Folder[];
  onDone: () => void;
  onCancel: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const TOP = "__top__";
  const [parentId, setParentId] = useState<string>(folder.parent_folder_id ?? TOP);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Guard: this folder cannot become a subfolder if it has children.
  const hasChildren = folders.some((f) => f.parent_folder_id === folder.id);

  const reasonLen = reason.trim().length;
  const candidates = topLevel.filter((t) => t.id !== folder.id);

  const canSave =
    !saving &&
    reasonLen >= 10 &&
    parentId !== (folder.parent_folder_id ?? TOP) &&
    (parentId === TOP || !hasChildren);

  const handleSubmit = async () => {
    if (!canSave) return;
    setSaving(true);
    const newParent = parentId === TOP ? null : parentId;
    const payload: any = {
      p_id: folder.id,
      p_tab_id: folder.tab_id,
      p_parent_folder_id: newParent,
      p_name: folder.name,
      p_slug: folder.slug,
      p_display_order: folder.display_order,
      p_reason: reason.trim(),
    };
    const { error } = await supabase.rpc("upsert_resource_folder" as any, payload);
    setSaving(false);
    if (error) {
      toast({ title: "Could not move folder", description: mapFolderError(error), variant: "destructive" });
      return;
    }
    toast({ title: "Folder moved", description: folder.name });
    onDone();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move "{folder.name}"</DialogTitle>
          <DialogDescription>Choose a new parent within the same tab.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {hasChildren && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
              This folder has subfolders and can only be a top-level folder.
            </div>
          )}
          <div className="space-y-2">
            <Label>New parent</Label>
            <Select value={parentId} onValueChange={setParentId} disabled={saving}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TOP}>(top level)</SelectItem>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id} disabled={hasChildren}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="move-reason">Reason *</Label>
            <Textarea
              id="move-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              disabled={saving}
            />
            <p className={cn("text-xs", reasonLen >= 10 ? "text-muted-foreground" : "text-destructive")}>
              {reasonLen}/10 characters minimum.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSave}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ArchiveDialog({
  folder, onDone, onCancel, toast,
}: {
  folder: Folder;
  onDone: () => void;
  onCancel: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const reasonLen = reason.trim().length;

  const handleSubmit = async () => {
    if (reasonLen < 10 || saving) return;
    setSaving(true);
    const { error } = await supabase.rpc("archive_resource_folder" as any, {
      p_folder_id: folder.id,
      p_reason: reason.trim(),
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not archive folder", description: mapFolderError(error), variant: "destructive" });
      return;
    }
    toast({ title: "Folder archived", description: folder.name });
    onDone();
  };

  return (
    <AlertDialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive "{folder.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Any subfolders will also be archived, and resources inside them will fall back to the tab root.
            This action is recorded in the audit log.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="archive-reason">Reason *</Label>
          <Textarea
            id="archive-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            disabled={saving}
          />
          <p className={cn("text-xs", reasonLen >= 10 ? "text-muted-foreground" : "text-destructive")}>
            {reasonLen}/10 characters minimum.
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleSubmit(); }}
            disabled={reasonLen < 10 || saving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function GrantsDialog({
  folder, organizations, onDone, onCancel, toast,
}: {
  folder: Folder;
  organizations: any[];
  onDone: () => void;
  onCancel: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const grantsQuery = useQuery({
    queryKey: ["resource_folder_access_grants", folder.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resource_folder_access_grants")
        .select("*")
        .eq("folder_id", folder.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [grantRows, setGrantRows] = useState<GrantRow[]>([]);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

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

  const reasonLen = reason.trim().length;
  const updateRow = (uid: string, patch: Partial<GrantRow>) =>
    setGrantRows((rows) => rows.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  const removeRow = (uid: string) => setGrantRows((rows) => rows.filter((r) => r.uid !== uid));
  const addRow = () => setGrantRows((rows) => [...rows, newGrantRow()]);

  const handleSubmit = async () => {
    if (reasonLen < 10 || saving) return;
    setSaving(true);
    const grants = grantRows.filter(rowComplete).map(rowToPayload);
    const { error } = await supabase.rpc("set_resource_folder_access_grants" as any, {
      p_folder_id: folder.id,
      p_grants: grants,
      p_reason: reason.trim(),
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save folder grants", description: mapFolderError(error), variant: "destructive" });
      return;
    }
    toast({ title: "Folder grants saved", description: `${grants.length} grant(s) active.` });
    onDone();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grants for "{folder.name}"</DialogTitle>
          <DialogDescription>
            Folder grants are additive. They broaden who can see the folder's resources and never hide anything a user already has access to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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
                    onValueChange={(v) => updateRow(row.uid, { grant_type: v, grant_value: "", grant_org_id: "" })}
                    disabled={saving}
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
                    <Select value={row.grant_value} onValueChange={(v) => updateRow(row.uid, { grant_value: v })} disabled={saving}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Account type" /></SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_TYPE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  )}
                  {row.grant_type === "plan_tier" && (
                    <Select value={row.grant_value} onValueChange={(v) => updateRow(row.uid, { grant_value: v })} disabled={saving}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Plan tier" /></SelectTrigger>
                      <SelectContent>
                        {PLAN_TIER_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  )}
                  {row.grant_type === "corporate_level" && (
                    <Select value={row.grant_value} onValueChange={(v) => updateRow(row.uid, { grant_value: v })} disabled={saving}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Corporate level" /></SelectTrigger>
                      <SelectContent>
                        {CORPORATE_LEVEL_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  )}
                  {row.grant_type === "coach_certification" && (
                    <Select value={row.grant_value} onValueChange={(v) => updateRow(row.uid, { grant_value: v })} disabled={saving}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Certification" /></SelectTrigger>
                      <SelectContent>
                        {CERTIFICATION_TYPES.map((o: any) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  )}
                  {row.grant_type === "organization" && (
                    <Select value={row.grant_org_id} onValueChange={(v) => updateRow(row.uid, { grant_org_id: v })} disabled={saving}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Organization" /></SelectTrigger>
                      <SelectContent>
                        {organizations.map((o: any) => (<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  )}
                  {row.grant_type === "all_coaches" && (
                    <div className="flex-1 text-xs italic text-muted-foreground px-2">Applies to all coaches.</div>
                  )}
                  {!row.grant_type && <div className="flex-1" />}

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeRow(row.uid)}
                    aria-label="Remove grant"
                    disabled={saving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button type="button" size="sm" variant="outline" onClick={addRow} disabled={saving}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add grant
          </Button>

          <div className="space-y-2 pt-2">
            <Label htmlFor="folder-grants-reason">Reason *</Label>
            <Textarea
              id="folder-grants-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Explain why grants are changing. Recorded in the audit log."
              disabled={saving}
            />
            <p className={cn("text-xs", reasonLen >= 10 ? "text-muted-foreground" : "text-destructive")}>
              {reasonLen}/10 characters minimum.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={reasonLen < 10 || saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save grants
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
