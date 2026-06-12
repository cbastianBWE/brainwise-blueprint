import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FolderPlus, Pencil, Trash2, Users, Loader2 } from "lucide-react";

interface DeptRow {
  id: string;
  name: string;
}

type DeleteMode = "reassign" | "unassign";

export default function CompanyDepartmentsSection({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const [renameRow, setRenameRow] = useState<DeptRow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamePending, setRenamePending] = useState(false);

  const [deleteRow, setDeleteRow] = useState<DeptRow | null>(null);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("unassign");
  const [reassignTo, setReassignTo] = useState<string>("");
  const [deletePending, setDeletePending] = useState(false);

  const load = useCallback(async () => {
    const [deptRes, usersRes] = await Promise.all([
      (supabase as any).from("departments").select("id, name").eq("organization_id", orgId),
      (supabase as any).from("admin_org_users_view").select("department_id").eq("organization_id", orgId),
    ]);
    if (deptRes.error) {
      toast({ title: "Failed to load departments", description: deptRes.error.message, variant: "destructive" });
    } else {
      const rows = ((deptRes.data || []) as DeptRow[]).slice().sort((a, b) => a.name.localeCompare(b.name));
      setDepartments(rows);
    }
    if (!usersRes.error) {
      const counts: Record<string, number> = {};
      for (const r of (usersRes.data || []) as { department_id: string | null }[]) {
        if (r.department_id) counts[r.department_id] = (counts[r.department_id] || 0) + 1;
      }
      setMemberCounts(counts);
    }
    setLoading(false);
  }, [orgId, toast]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    const { error } = await (supabase.rpc as any)("department_create", {
      p_organization_id: orgId,
      p_name: name,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Create failed", description: error.message, variant: "destructive" });
      return;
    }
    setNewName("");
    toast({ title: "Department created", description: name });
    await load();
  };

  const openRename = (row: DeptRow) => {
    setRenameRow(row);
    setRenameValue(row.name);
  };
  const handleRename = async () => {
    if (!renameRow) return;
    const newN = renameValue.trim();
    if (!newN || newN === renameRow.name) return;
    setRenamePending(true);
    const { error } = await (supabase.rpc as any)("department_rename", {
      p_dept_id: renameRow.id,
      p_new_name: newN,
    });
    setRenamePending(false);
    if (error) {
      toast({ title: "Rename failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Department renamed" });
    setRenameRow(null);
    await load();
  };

  const openDelete = (row: DeptRow) => {
    setDeleteRow(row);
    const count = memberCounts[row.id] || 0;
    const others = departments.filter((d) => d.id !== row.id);
    if (count === 0) {
      setDeleteMode("unassign");
      setReassignTo("");
    } else {
      setDeleteMode(others.length > 0 ? "reassign" : "unassign");
      setReassignTo("");
    }
  };

  const otherDepartments = useMemo(
    () => (deleteRow ? departments.filter((d) => d.id !== deleteRow.id) : []),
    [departments, deleteRow],
  );

  const deleteConfirmDisabled = (() => {
    if (!deleteRow) return true;
    if (deletePending) return true;
    const count = memberCounts[deleteRow.id] || 0;
    if (count > 0 && deleteMode === "reassign" && !reassignTo) return true;
    return false;
  })();

  const handleDelete = async () => {
    if (!deleteRow) return;
    setDeletePending(true);
    const { error } = await (supabase.rpc as any)("department_delete", {
      p_dept_id: deleteRow.id,
      p_action: deleteMode,
      p_reassign_to_dept_id: deleteMode === "reassign" ? reassignTo : null,
    });
    setDeletePending(false);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Department deleted", description: deleteRow.name });
    setDeleteRow(null);
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const deleteCount = deleteRow ? memberCounts[deleteRow.id] || 0 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Departments
            </CardTitle>
            <CardDescription>
              Create, rename, and delete departments for this organization.
            </CardDescription>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="new-dept-name">Create department</Label>
              <Input
                id="new-dept-name"
                placeholder="New department name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={creating}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim() && !creating) handleCreate();
                }}
              />
            </div>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
              Create
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                      No departments yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  departments.map((d) => {
                    const count = memberCounts[d.id] || 0;
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{count}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openRename(d)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => openDelete(d)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Rename dialog */}
      <Dialog
        open={!!renameRow}
        onOpenChange={(open) => !renamePending && !open && setRenameRow(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename department</DialogTitle>
            <DialogDescription>
              {renameRow ? `Currently "${renameRow.name}"` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-input">New name</Label>
            <Input
              id="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              disabled={renamePending}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameRow(null)} disabled={renamePending}>
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={renamePending || !renameValue.trim() || renameValue.trim() === renameRow?.name}
            >
              {renamePending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={!!deleteRow}
        onOpenChange={(open) => !deletePending && !open && setDeleteRow(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete department</DialogTitle>
            <DialogDescription>
              {deleteRow
                ? deleteCount === 0
                  ? `Delete "${deleteRow.name}"? This cannot be undone.`
                  : `"${deleteRow.name}" has ${deleteCount} member${deleteCount === 1 ? "" : "s"} assigned. Choose what to do with them before deleting.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {deleteRow && deleteCount > 0 && (
            <div className="space-y-3">
              <RadioGroup
                value={deleteMode}
                onValueChange={(v) => setDeleteMode(v as DeleteMode)}
                className="space-y-2"
              >
                <div className="flex items-start gap-2">
                  <RadioGroupItem
                    value="reassign"
                    id="del-reassign"
                    disabled={otherDepartments.length === 0 || deletePending}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="del-reassign" className="font-normal">
                      Move members to another department
                    </Label>
                    {deleteMode === "reassign" && (
                      <Select
                        value={reassignTo}
                        onValueChange={setReassignTo}
                        disabled={otherDepartments.length === 0 || deletePending}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              otherDepartments.length === 0
                                ? "No other departments available"
                                : "Select a department"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {otherDepartments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <RadioGroupItem
                    value="unassign"
                    id="del-unassign"
                    disabled={deletePending}
                    className="mt-1"
                  />
                  <Label htmlFor="del-unassign" className="font-normal">
                    Remove members from any department
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRow(null)} disabled={deletePending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteConfirmDisabled}>
              {deletePending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
