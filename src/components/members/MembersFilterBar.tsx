import { useState } from "react";
import { Search, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MembersFilterState, SavedView } from "./types";
import SavedViewsDropdown from "./SavedViewsDropdown";

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filters: MembersFilterState;
  onFiltersChange: (f: MembersFilterState) => void;

  savedViews: SavedView[];
  activeViewId: string | null;
  detached: boolean;
  changesCount: number;
  onSelectView: (viewId: string) => void;
  onSaveAsNew: (name: string) => void;
  onUpdateCurrent: () => void;
  onDiscardChanges: () => void;

  rightSlot?: React.ReactNode;
}

const ACCOUNT_TYPES = [
  "brainwise_super_admin",
  "org_admin",
  "company_admin",
  "coach",
  "corporate_employee",
  "individual",
];

const ACCOUNT_TYPE_LABEL = (t: string) =>
  t.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export default function MembersFilterBar({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  savedViews,
  activeViewId,
  detached,
  changesCount,
  onSelectView,
  onSaveAsNew,
  onUpdateCurrent,
  onDiscardChanges,
  rightSlot,
}: Props) {
  const [switchTargetId, setSwitchTargetId] = useState<string | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  const update = (patch: Partial<MembersFilterState>) =>
    onFiltersChange({ ...filters, ...patch });

  const handleSelectView = (viewId: string) => {
    if (detached && viewId !== activeViewId) {
      setSwitchTargetId(viewId);
      return;
    }
    onSelectView(viewId);
  };

  const handleDiscardClick = () => {
    if (changesCount >= 3) {
      setDiscardConfirmOpen(true);
    } else {
      onDiscardChanges();
    }
  };

  // Status chip label
  const statusLabel =
    filters.account_status_in === null
      ? "Status: All"
      : filters.account_status_in.length === 1 && filters.account_status_in[0] === "active"
        ? "Status: Active"
        : "Status: Not active";

  // Mentor chip label
  const mentorLabel =
    filters.is_mentor === null
      ? "Mentor: All"
      : filters.is_mentor
        ? "Mentor: Yes"
        : "Mentor: No";

  // Active assignments label
  const assignLabel =
    filters.has_active_assignments === null
      ? "Assignments: All"
      : filters.has_active_assignments
        ? "Has assignments"
        : "No assignments";

  const actorLabel = filters.is_coach_actor === null ? "Coach actor: All" : filters.is_coach_actor ? "Coach actor: Yes" : "Coach actor: No";
  const clientLabel = filters.is_coach_client === null ? "Coach client: All" : filters.is_coach_client ? "Coach client: Yes" : "Coach client: No";

  const accountTypesSelected = filters.account_types ?? [];
  const accountTypeLabel =
    accountTypesSelected.length === 0
      ? "Account type: All"
      : accountTypesSelected.length === 1
        ? `Type: ${ACCOUNT_TYPE_LABEL(accountTypesSelected[0])}`
        : `Type: ${accountTypesSelected.length} selected`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by email, name, or organization (min 2 chars)"
            className="pl-9"
          />
        </div>

        {/* Account type — multi-select */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {accountTypeLabel}
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Account type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ACCOUNT_TYPES.map((t) => {
              const checked = accountTypesSelected.includes(t);
              return (
                <DropdownMenuItem
                  key={t}
                  onSelect={(e) => {
                    e.preventDefault();
                    const next = checked
                      ? accountTypesSelected.filter((x) => x !== t)
                      : [...accountTypesSelected, t];
                    update({ account_types: next.length === 0 ? null : next });
                  }}
                >
                  <Checkbox checked={checked} className="mr-2" />
                  {ACCOUNT_TYPE_LABEL(t)}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mentor */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {mentorLabel}
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => update({ is_mentor: null })}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => update({ is_mentor: true })}>Mentor</DropdownMenuItem>
            <DropdownMenuItem onClick={() => update({ is_mentor: false })}>
              Not mentor
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {statusLabel}
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => update({ account_status_in: null })}>
              All
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => update({ account_status_in: ["active"] })}>
              Active
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                update({ account_status_in: ["departed_individual", "pseudonymized"] })
              }
            >
              Not active
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Active assignments */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {assignLabel}
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => update({ has_active_assignments: null })}>
              All
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => update({ has_active_assignments: true })}>
              Has any
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => update({ has_active_assignments: false })}>
              Has none
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Coach actor */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">{actorLabel}<ChevronDown className="h-3.5 w-3.5 ml-1" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => update({ is_coach_actor: null })}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => update({ is_coach_actor: true })}>Actor</DropdownMenuItem>
            <DropdownMenuItem onClick={() => update({ is_coach_actor: false })}>Not actor</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Coach client */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">{clientLabel}<ChevronDown className="h-3.5 w-3.5 ml-1" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => update({ is_coach_client: null })}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => update({ is_coach_client: true })}>Coach client</DropdownMenuItem>
            <DropdownMenuItem onClick={() => update({ is_coach_client: false })}>Not coach client</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More filters (cycle 1 stub) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="outline" size="sm" disabled>
                <Plus className="h-3.5 w-3.5 mr-1" /> More filters
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Available in cycle 2a</TooltipContent>
        </Tooltip>

        <div className="ml-auto flex items-center gap-2">
          {detached && (
            <Button variant="ghost" size="sm" onClick={handleDiscardClick}>
              Discard changes
            </Button>
          )}
          <SavedViewsDropdown
            savedViews={savedViews}
            activeViewId={activeViewId}
            detached={detached}
            onSelectView={handleSelectView}
            onSaveAsNew={onSaveAsNew}
            onUpdateCurrent={onUpdateCurrent}
          />
          {rightSlot}
        </div>
      </div>

      {/* Switch-while-detached confirm */}
      <Dialog
        open={switchTargetId !== null}
        onOpenChange={(o) => !o && setSwitchTargetId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You have unsaved changes to the current view. Switching will lose them unless you save first.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setSwitchTargetId(null)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const target = switchTargetId!;
                setSwitchTargetId(null);
                onDiscardChanges();
                onSelectView(target);
              }}
            >
              Discard changes
            </Button>
            <Button
              onClick={() => {
                const target = switchTargetId!;
                setSwitchTargetId(null);
                onUpdateCurrent();
                onSelectView(target);
              }}
            >
              Save and switch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard confirm (>=3 changes) */}
      <Dialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard {changesCount} changes?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will revert filter, sort, and column changes to the saved view.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDiscardConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDiscardConfirmOpen(false);
                onDiscardChanges();
              }}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
