import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PaidEnrollmentNudgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string | null;
  priceCents: number | null;
}

export default function PaidEnrollmentNudgeModal({
  open,
  onOpenChange,
  entityName,
  priceCents,
}: PaidEnrollmentNudgeModalProps) {
  const navigate = useNavigate();

  const formattedPrice =
    priceCents != null ? `$${(priceCents / 100).toFixed(2)}` : null;

  const handleContinue = () => {
    onOpenChange(false);
    navigate("/products#certifications");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Excited to have you joining {entityName ?? "this certification"}!
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <p>
                This certification is {formattedPrice ?? "a paid program"}. To
                begin, we'll take you to our certifications page where you can
                review the full details and complete enrollment.
              </p>
              <p>
                You'll find everything about what's included, the schedule, and
                how to get started.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not yet
          </Button>
          <Button onClick={handleContinue}>Take me there</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
