import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  mode: "user" | "org";
  adminUserId: string | null;
  adminEmail: string | null;
  defaultWorkspaceName: string;
}

interface MembershipStatus {
  provisioned: boolean;
  org_id?: string;
  org_name?: string;
  role?: string;
  status?: string;
}

export default function OperationsWorkspaceSection({
  mode,
  adminUserId,
  adminEmail,
  defaultWorkspaceName,
}: Props) {
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceName, setWorkspaceName] = useState(defaultWorkspaceName);
  const [email, setEmail] = useState(adminEmail ?? "");
  const [busy, setBusy] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("ops_admin_get_membership", {
      p_user_id: adminUserId,
    });
    if (error) {
      toast.error(`Failed to load operations status: ${error.message}`);
      setStatus({ provisioned: false });
    } else {
      setStatus((data ?? { provisioned: false }) as MembershipStatus);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUserId]);

  useEffect(() => {
    setWorkspaceName(defaultWorkspaceName);
  }, [defaultWorkspaceName]);
  useEffect(() => {
    setEmail(adminEmail ?? "");
  }, [adminEmail]);

  const provision = async () => {
    const name = workspaceName.trim();
    const useEmail = (mode === "user" ? adminEmail : email)?.trim();
    if (!name) {
      toast.error("Workspace name is required.");
      return;
    }
    if (!useEmail) {
      toast.error("Admin email is required.");
      return;
    }
    setBusy(true);
    const { error } = await (supabase.rpc as any)("ops_provision_customer_org", {
      p_org_name: name,
      p_admin_email: useEmail,
      p_admin_full_name: null,
      p_legal_name: null,
      p_org_email: null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? "Provisioning failed");
      return;
    }
    toast.success("Operations workspace provisioned.");
    await loadStatus();
  };

  return (
    <div className="rounded-md border p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Operations workspace</h3>
        <p className="text-xs text-muted-foreground">
          {mode === "user"
            ? "Provision an operations (CRM and Operations) workspace for this user. They become the workspace admin. The CRM and Operations modules above must also be On for the tools to appear."
            : "Provision an operations (CRM and Operations) workspace for this organization. The named admin becomes the first operations user and can add coworkers. The CRM and Operations modules above must also be On for the tools to appear."}
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : status?.provisioned ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{status.org_name}</span>
            <Badge variant="secondary">Provisioned</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Role: {status.role} · Status: {status.status}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ops-workspace-name">Workspace name</Label>
            <Input
              id="ops-workspace-name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Workspace name"
            />
          </div>
          {mode === "org" ? (
            <div className="space-y-1.5">
              <Label htmlFor="ops-admin-email">First operations admin (email)</Label>
              <Input
                id="ops-admin-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
              />
              <p className="text-xs text-muted-foreground">
                Defaults to this org's admin. They must already have an account.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Admin: {adminEmail ?? "—"}</p>
          )}
          <Button onClick={provision} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Provision workspace
          </Button>
        </div>
      )}
    </div>
  );
}
