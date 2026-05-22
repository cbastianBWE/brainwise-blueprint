import { useState } from "react";
import * as XLSX from "xlsx";
import { ChevronDown, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import BulkAssignModal from "./bulk/BulkAssignModal";
import BulkAssignMentorModal from "./bulk/BulkAssignMentorModal";
import BulkUnassignModal from "./bulk/BulkUnassignModal";
import BulkUnassignMentorModal from "./bulk/BulkUnassignMentorModal";
import BulkOverrideCompletionModal from "./bulk/BulkOverrideCompletionModal";
import ScheduleAssignmentModal from "./bulk/ScheduleAssignmentModal";
import type { BulkAssignType } from "./bulk/types";

interface Props {
  selectedCount: number;
  selectedUserIds: string[];
  traineeLabels: Map<string, string>;
  onClear: () => void;
  onActionComplete: () => void;
}

export default function MembersBulkActionsBar({
  selectedCount,
  selectedUserIds,
  traineeLabels,
  onClear,
  onActionComplete,
}: Props) {
  const [assignType, setAssignType] = useState<BulkAssignType | null>(null);
  const [unassignType, setUnassignType] = useState<"curriculum" | "module" | null>(null);
  const [mentorAssignOpen, setMentorAssignOpen] = useState(false);
  const [mentorUnassignOpen, setMentorUnassignOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  if (selectedCount < 1) return null;

  async function handleExportCompletionCsv() {
    if (selectedUserIds.length === 0) return;
    if (selectedUserIds.length > 500) {
      toast({
        title: "Export limited to 500 users at a time",
        description: `You have ${selectedUserIds.length} selected. Refine your selection and try again.`,
        variant: "destructive",
      });
      return;
    }
    setExporting(true);
    try {
      const { data, error } = await supabase.rpc("get_user_completion_export" as any, {
        p_user_ids: selectedUserIds,
      } as any);
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        user_id: string;
        user_email: string;
        user_full_name: string | null;
        tier: string;
        target_id: string;
        target_name: string;
        parent_path: string | null;
        status: string;
        started_at: string | null;
        completed_at: string | null;
        assigned_at: string | null;
      }>;
      if (rows.length === 0) {
        toast({ title: "No completion data to export" });
        return;
      }
      const aoa = [
        [
          "user_id",
          "user_email",
          "user_full_name",
          "tier",
          "target_id",
          "target_name",
          "parent_path",
          "status",
          "started_at",
          "completed_at",
          "assigned_at",
        ],
        ...rows.map((r) => [
          r.user_id,
          r.user_email,
          r.user_full_name ?? "",
          r.tier,
          r.target_id,
          r.target_name ?? "",
          r.parent_path ?? "",
          r.status ?? "",
          r.started_at ?? "",
          r.completed_at ?? "",
          r.assigned_at ?? "",
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `members-completion-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: `Exported ${rows.length} rows for ${selectedUserIds.length} users` });
    } catch (err) {
      toast({
        title: "Export failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-4 py-2 backdrop-blur">
      <span className="text-sm font-medium">{selectedCount} selected</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Assign <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setAssignType("cert_path")}>Cert path</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setAssignType("curriculum")}>Curriculum</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setAssignType("module")}>Module</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMentorAssignOpen(true)}>Mentor</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Unassign <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setUnassignType("curriculum")}>Curriculum</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setUnassignType("module")}>Module</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMentorUnassignOpen(true)}>Mentor</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}>
        Schedule
      </Button>

      <Button variant="outline" size="sm" onClick={() => setOverrideOpen(true)}>
        Override completion
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={exporting}>
            {exporting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Export <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={handleExportCompletionCsv}>
            Completion data (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            User directory (coming in 11.D)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto">
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-3.5 w-3.5 mr-1" />
          Clear selection
        </Button>
      </div>

      <BulkAssignModal
        open={assignType !== null}
        onOpenChange={(o) => !o && setAssignType(null)}
        initialType={assignType ?? "cert_path"}
        selectedUserIds={selectedUserIds}
        traineeLabels={traineeLabels}
        onComplete={() => {
          setAssignType(null);
          onActionComplete();
        }}
      />
      <BulkAssignMentorModal
        open={mentorAssignOpen}
        onOpenChange={setMentorAssignOpen}
        selectedUserIds={selectedUserIds}
        traineeLabels={traineeLabels}
        onComplete={() => {
          setMentorAssignOpen(false);
          onActionComplete();
        }}
      />
      <BulkUnassignModal
        open={unassignType !== null}
        onOpenChange={(o) => !o && setUnassignType(null)}
        initialType={unassignType ?? "curriculum"}
        selectedUserIds={selectedUserIds}
        traineeLabels={traineeLabels}
        onComplete={() => {
          setUnassignType(null);
          onActionComplete();
        }}
      />
      <BulkUnassignMentorModal
        open={mentorUnassignOpen}
        onOpenChange={setMentorUnassignOpen}
        selectedUserIds={selectedUserIds}
        traineeLabels={traineeLabels}
        onComplete={() => {
          setMentorUnassignOpen(false);
          onActionComplete();
        }}
      />
      <BulkOverrideCompletionModal
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
        selectedUserIds={selectedUserIds}
        traineeLabels={traineeLabels}
        onComplete={() => {
          setOverrideOpen(false);
          onActionComplete();
        }}
      />
      <ScheduleAssignmentModal
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        prefilledUserIds={selectedUserIds}
        traineeLabels={traineeLabels}
        onComplete={() => {
          setScheduleOpen(false);
          onActionComplete();
        }}
      />
    </div>
  );
}
