import { ReactNode } from "react";
import {
  DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface FormDialogShellProps {
  title: string;
  description?: ReactNode;
  /** Scrolling body. */
  children: ReactNode;
  /** Pinned footer. Pass null for stages that have no action. */
  footer?: ReactNode;
  /** Width only, e.g. "max-w-lg". Do not pass height or overflow classes. */
  className?: string;
}

export default function FormDialogShell({
  title, description, children, footer, className,
}: FormDialogShellProps) {
  return (
    <DialogContent
      className={cn(
        "flex flex-col gap-0 p-0 max-h-[85vh] overflow-hidden",
        className,
      )}
    >
      <DialogHeader className="shrink-0 space-y-1.5 border-b px-6 py-4 pr-12 text-left">
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {children}
      </div>

      {footer ? (
        <div className="shrink-0 border-t bg-background px-6 py-4">
          {footer}
        </div>
      ) : null}
    </DialogContent>
  );
}
