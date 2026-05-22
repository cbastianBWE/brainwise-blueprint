import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import JustificationModal from "@/components/impersonation/JustificationModal";
import type { MemberRow } from "./types";
import MemberDrawerLearning from "./MemberDrawerLearning";
import MemberDrawerAssignments from "./MemberDrawerAssignments";
import MemberDrawerCoach from "./MemberDrawerCoach";
import MemberDrawerAudit from "./MemberDrawerAudit";

type TabId = "learning" | "assignments" | "coach" | "audit";

interface Props {
  open: boolean;
  member: MemberRow | null;
  activeTab: TabId;
  currentUserId: string | undefined;
  embedded?: boolean; // full-page mode
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
  onTabChange,
}: {
  member: MemberRow;
  activeTab: TabId;
  currentUserId: string | undefined;
  onTabChange: (t: TabId) => void;
}) {
  const [impersonateTarget, setImpersonateTarget] = useState<MemberRow | null>(null);
  const isSelf = member.user_id === currentUserId;
  const showCoach = member.show_coach_tab;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
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
                <Badge className="bg-emerald-100 text-emerald-900 border-transparent hover:bg-emerald-100">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">Not active</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Mentor</span>
                  <Switch checked={member.is_mentor} disabled />
                </span>
              </TooltipTrigger>
              <TooltipContent>Available in cycle 2a</TooltipContent>
            </Tooltip>
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
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "learning" && <MemberDrawerLearning userId={member.user_id} />}
        {activeTab === "assignments" && <MemberDrawerAssignments />}
        {activeTab === "coach" && showCoach && (
          <MemberDrawerCoach
            userId={member.user_id}
            fullName={member.full_name}
            email={member.email}
            accountType={member.account_type}
            organizationName={member.organization_name}
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
  // Cycle 1: always false; cycle 2a will flip when forms are dirty.
  const [hasUnsavedChanges] = useState(false);
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
