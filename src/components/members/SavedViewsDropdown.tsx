import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SavedView } from "./types";

interface Props {
  savedViews: SavedView[];
  activeViewId: string | null;
  detached: boolean;
  onSelectView: (viewId: string) => void;
  onSaveAsNew: (name: string) => void;
  onUpdateCurrent: () => void;
}

export default function SavedViewsDropdown({
  savedViews,
  activeViewId,
  detached,
  onSelectView,
  onSaveAsNew,
  onUpdateCurrent,
}: Props) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");

  const active = savedViews.find((v) => v.id === activeViewId);
  const activeLabel = active ? active.name : "All members";

  // Concurrent edits in two browser tabs may overwrite each other's writes.
  // For cycle 1 this is acceptable (single admin, low frequency). v2 will add
  // an optimistic version check via payload.version bump comparison.
  const handleSaveNew = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSaveAsNew(trimmed);
    setSaveOpen(false);
    setName("");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {detached && <span className="mr-1">●</span>}
            {activeLabel}
            <ChevronDown className="h-3.5 w-3.5 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {savedViews.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">No saved views</div>
          )}
          {savedViews.map((v) => (
            <DropdownMenuItem key={v.id} onClick={() => onSelectView(v.id)}>
              <span className="flex-1">
                {detached && v.id === activeViewId && <span className="mr-1">●</span>}
                {v.name}
              </span>
              {v.id === activeViewId && <Check className="h-3.5 w-3.5" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSaveOpen(true)}>
            Save current as new view…
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!detached || !activeViewId}
            onClick={() => onUpdateCurrent()}
          >
            Update current view
          </DropdownMenuItem>
          <DropdownMenuItem disabled>Manage views (coming soon)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save current view</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm">View name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Active coaches"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNew} disabled={!name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
