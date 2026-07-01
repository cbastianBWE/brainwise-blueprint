import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import JustificationModal from "@/components/impersonation/JustificationModal";
import JustifiedActionDialog from "@/components/justified-action/JustifiedActionDialog";
import type { MemberRow } from "./types";
import MemberDrawerLearning from "./MemberDrawerLearning";
import MemberDrawerAssignments from "./MemberDrawerAssignments";
import MemberDrawerCoach from "./MemberDrawerCoach";
import MemberDrawerAudit from "./MemberDrawerAudit";

import MemberDrawerAccess from "./MemberDrawerAccess";

type TabId = "learning" | "assignments" | "coach" | "access" | "audit";

interface Props {
  open: boolean;
  member: MemberRow | null;
  activeTab: TabId;
  currentUserId: string | undefined;
  embedded?: boolean;
  onTabChange: (tab: TabId) => void;
  onClose: () => void;
}

const formatAccountType = (t: string | null): string => {
  if (!t) return "—";
  return t.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

function MemberDrawerBody({
  member,
  activeTab,
  currentUserId,
  setHasUnsavedChanges,
  onTabChange,
}: {
  member: MemberRow;
  activeTab: TabId;
  currentUserId: string | undefined;
  setHasUnsavedChanges: (v: boolean) => void;
  onTabChange: (t: TabId) => void;
}) {
  const queryClient = useQueryClient();
  const [impersonateTarget, setImpersonateTarget] = useState<MemberRow | null>(null);
  const [mentorDialogOpen, setMentorDialogOpen] = useState(false);
  const [revokeDevicesOpen, setRevokeDevicesOpen] = useState(false);
  const isSelf = member.user_id === currentUserId;
  const showCoach = member.show_coach_tab;
  const showAccess = member.organization_id === null;
  const nextIsMentor = !member.is_mentor;

  useEffect(() => {
    setHasUnsavedChanges(mentorDialogOpen);
  }, [mentorDialogOpen, setHasUnsavedChanges]);

  useEffect(() => {
    setHasUnsavedChanges(revokeDevicesOpen);
  }, [revokeDevicesOpen, setHasUnsavedChanges]);

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 border-b bg-background p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold truncate">
              {member.full_name || member.email}
            </div>
            {member.full_name && (
              <div className="text-xs text-muted-foreground truncate">{member.email}</div>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <Badge variant="outline">{formatAccountType(member.account_type)}</Badge>
              <span className="text-xs text-muted-foreground">
                {member.organization_name ?? "—"}
              </span>
              {member.account_status === "active" ? (
                <Badge
                  aria-label="Account status: Active"
                  className="border-transparent"
                  style={{
                    backgroundColor: "color-mix(in oklab, var(--bw-forest) 12%, white)",
                    color: "var(--bw-forest)",
                  }}
                >
                  Active
                </Badge>
              ) : (
                <Badge aria-label="Account status: Not active" variant="secondary">
                  Not active
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Mentor</span>
              <Switch
                checked={member.is_mentor}
                onCheckedChange={() => setMentorDialogOpen(true)}
                aria-label={`Mentor role for ${member.full_name ?? member.email}`}
              />
            </span>
            <Button
              size="sm"
              disabled={isSelf}
              onClick={() => setImpersonateTarget(member)}
            >
              Impersonate
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>Reset MFA (coming soon)</DropdownMenuItem>
                <DropdownMenuItem disabled>
                  Trigger password reset (coming soon)
                </DropdownMenuItem>
                <DropdownMenuItem disabled>View access history (coming soon)</DropdownMenuItem>
                <DropdownMenuItem disabled>
                  Force pseudonymization (coming soon)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as TabId)}>
          <TabsList>
            <TabsTrigger value="learning">Learning</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            {showCoach && <TabsTrigger value="coach">Coach</TabsTrigger>}
            {showAccess && <TabsTrigger value="access">Access</TabsTrigger>}
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "learning" && (
          <MemberDrawerLearning
            userId={member.user_id}
            setHasUnsavedChanges={setHasUnsavedChanges}
          />
        )}
        {activeTab === "assignments" && (
          <MemberDrawerAssignments
            userId={member.user_id}
            fullName={member.full_name}
            setHasUnsavedChanges={setHasUnsavedChanges}
          />
        )}
        {activeTab === "coach" && showCoach && (
          <MemberDrawerCoach
            userId={member.user_id}
            fullName={member.full_name}
            email={member.email}
            accountType={member.account_type}
            organizationName={member.organization_name}
            setHasUnsavedChanges={setHasUnsavedChanges}
          />
        )}
        {activeTab === "access" && showAccess && (
          <MemberDrawerAccess
            userId={member.user_id}
            accountType={member.account_type}
            organizationId={member.organization_id}
            email={member.email}
            fullName={member.full_name}
            setHasUnsavedChanges={setHasUnsavedChanges}
          />
        )}
        {activeTab === "audit" && <MemberDrawerAudit userId={member.user_id} />}
      </div>

      <JustificationModal
        target={
          impersonateTarget
            ? {
                user_id: impersonateTarget.user_id,
                email: impersonateTarget.email,
                full_name: impersonateTarget.full_name,
                account_type: impersonateTarget.account_type,
              }
            : null
        }
        onClose={() => setImpersonateTarget(null)}
      />

      <JustifiedActionDialog
        open={mentorDialogOpen}
        onOpenChange={setMentorDialogOpen}
        title={nextIsMentor ? "Grant mentor role" : "Revoke mentor role"}
        description={
          <span>
            You are about to {nextIsMentor ? "grant" : "revoke"} the mentor role for{" "}
            <strong>{member.full_name ?? member.email}</strong>.
          </span>
        }
        successTitle={nextIsMentor ? "Mentor role granted" : "Mentor role revoked"}
        onSubmit={async (reason) => {
          const { data, error } = await supabase.rpc("set_mentor_role" as any, {
            p_user_id: member.user_id,
            p_is_mentor: nextIsMentor,
            p_reason: reason,
          } as any);
          if (error) throw error;
          const result = data as {
            user_id: string;
            is_mentor: boolean;
            changed: boolean;
          };
          await queryClient.invalidateQueries({ queryKey: ["members-search"] });
          return {
            changed: result.changed,
            note: result.changed
              ? undefined
              : nextIsMentor
                ? "This user is already a mentor."
                : "This user is already not a mentor.",
          };
        }}
      />
    </div>
  );
}

export default function MemberDrawer({
  open,
  member,
  activeTab,
  currentUserId,
  embedded,
  onTabChange,
  onClose,
}: Props) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) return;
    if (hasUnsavedChanges) {
      setConfirmDiscardOpen(true);
      return;
    }
    onClose();
  };

  if (embedded) {
    if (!member) return null;
    return (
      <div className="h-[calc(100vh-4rem)] border rounded-lg overflow-hidden">
        <MemberDrawerBody
          member={member}
          activeTab={activeTab}
          currentUserId={currentUserId}
          setHasUnsavedChanges={setHasUnsavedChanges}
          onTabChange={onTabChange}
        />
      </div>
    );
  }

  return (
    <>
      <Sheet open={open && !!member} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[720px] p-0 overflow-y-auto">
          {member && (
            <MemberDrawerBody
              member={member}
              activeTab={activeTab}
              currentUserId={currentUserId}
              setHasUnsavedChanges={setHasUnsavedChanges}
              onTabChange={onTabChange}
            />
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You have unsaved changes. Discard and close?
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDiscardOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDiscardOpen(false);
                onClose();
              }}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
