import { useEffect, useState } from "react";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface TeamMemberDialogMember {
  id: string;
  user_id: string;
  billing_rate: number | null;
  cost_rate: number | null;
}

export interface TeamMemberDialogUser {
  id: string;
  full_name: string | null;
  email: string;
  default_billing_rate: number | null;
  default_cost_rate: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  orgId: string;
  mode: "add" | "edit";
  member?: TeamMemberDialogMember | null;
  memberName?: string;
  availableUsers: TeamMemberDialogUser[];
  onSaved: () => void;
}

function parseRate(s: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const trimmed = s.trim();
  if (trimmed === "") return { ok: true, value: null };
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return { ok: false, error: "Rate must be a number" };
  if (n < 0) return { ok: false, error: "Rate must be non-negative" };
  return { ok: true, value: n };
}

export default function TeamMemberDialog({
  open,
  onOpenChange,
  projectId,
  orgId,
  mode,
  member,
  memberName,
  availableUsers,
  onSaved,
}: Props) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [billingRate, setBillingRate] = useState<string>("");
  const [costRate, setCostRate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && member) {
      setSelectedUserId(member.user_id);
      setBillingRate(member.billing_rate == null ? "" : String(member.billing_rate));
      setCostRate(member.cost_rate == null ? "" : String(member.cost_rate));
    } else {
      setSelectedUserId("");
      setBillingRate("");
      setCostRate("");
    }
  }, [open, mode, member]);

  const handleUserChange = (uid: string) => {
    setSelectedUserId(uid);
    const u = availableUsers.find((x) => x.id === uid);
    if (u) {
      setBillingRate(u.default_billing_rate == null ? "" : String(u.default_billing_rate));
      setCostRate(u.default_cost_rate == null ? "" : String(u.default_cost_rate));
    }
  };

  const handleSave = async () => {
    const br = parseRate(billingRate);
    if (!br.ok) {
      toast.error(`Billing rate: ${br.error}`);
      return;
    }
    const cr = parseRate(costRate);
    if (!cr.ok) {
      toast.error(`Cost rate: ${cr.error}`);
      return;
    }
    setSaving(true);
    try {
      if (mode === "add") {
        if (!selectedUserId) {
          toast.error("Pick a team member");
          setSaving(false);
          return;
        }
        const { error } = await opsSupabase
          .from("project_users" as any)
          .insert({
            project_id: projectId,
            user_id: selectedUserId,
            org_id: orgId,
            billing_rate: br.value,
            cost_rate: cr.value,
          } as any);
        if (error) throw error;
        toast.success("Team member added");
      } else {
        if (!member) {
          setSaving(false);
          return;
        }
        const { error } = await opsSupabase
          .from("project_users" as any)
          .update({ billing_rate: br.value, cost_rate: cr.value } as any)
          .eq("id", member.id);
        if (error) throw error;
        toast.success("Team member updated");
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add team member" : "Edit team member"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="tm_user">Member</Label>
            {mode === "edit" ? (
              <Input id="tm_user" value={memberName ?? ""} readOnly disabled />
            ) : (
              <Select value={selectedUserId} onValueChange={handleUserChange}>
                <SelectTrigger id="tm_user">
                  <SelectValue placeholder={availableUsers.length === 0 ? "No users available" : "Select a member"} />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tm_billing">Billing rate</Label>
            <Input
              id="tm_billing"
              type="number"
              step="0.01"
              min="0"
              value={billingRate}
              onChange={(e) => setBillingRate(e.target.value)}
              placeholder="Leave blank for none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tm_cost">Cost rate</Label>
            <Input
              id="tm_cost"
              type="number"
              step="0.01"
              min="0"
              value={costRate}
              onChange={(e) => setCostRate(e.target.value)}
              placeholder="Leave blank for none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
