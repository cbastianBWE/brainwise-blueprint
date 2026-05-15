import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { UpgradeEntityType } from "./types";

interface UpgradeNudgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: UpgradeEntityType | null;
  entityName: string | null;
}

function humanReadableType(t: UpgradeEntityType | null): string {
  switch (t) {
    case "article": return "article";
    case "guide": return "guide";
    case "video": return "video";
    case "worksheet": return "worksheet";
    case "template": return "template";
    case "cert_path": return "certification path";
    case "curriculum": return "curriculum";
    case "module": return "module";
    default: return "resource";
  }
}

export default function UpgradeNudgeModal({
  open,
  onOpenChange,
  entityType,
  entityName,
}: UpgradeNudgeModalProps) {
  const navigate = useNavigate();
  const typeLabel = humanReadableType(entityType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade to access this {typeLabel}</DialogTitle>
          <DialogDescription>
            {entityName
              ? `“${entityName}” isn't included in your current plan. Upgrade to unlock this ${typeLabel} and more.`
              : `This ${typeLabel} isn't included in your current plan. Upgrade to unlock it and more.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate("/pricing");
            }}
          >
            Upgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
