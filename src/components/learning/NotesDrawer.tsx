import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NotebookPen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import NotesPanel from "./NotesPanel";

const SESSION_KEY = "bw-notes-drawer-open";

/**
 * Notes trigger + docked, NON-modal drawer for the content item page.
 * Non-modal so the video behind it stays playable and scrubbable.
 * Below `md` it falls back to the stacked NotesPanel card.
 */
export default function NotesDrawer({ contentItemId }: { contentItemId: string }) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open]);

  // Same key/shape as NotesPanel's read, so this shares its cache entry.
  const noteQuery = useQuery({
    queryKey: ["learning-note", contentItemId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_notes")
        .select("id, body, shared_with_user_id, shared_at, updated_at")
        .eq("content_item_id", contentItemId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const hasNote = !!(noteQuery.data?.body ?? "").trim();

  if (isMobile) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => setOpen((v) => !v)}
      >
        <NotebookPen className="h-4 w-4 mr-1.5" />
        Notes
        {hasNote && (
          <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-[var(--bw-orange)]" />
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen} modal={false}>
        <SheetContent
          side="right"
          hideOverlay
          className="w-full sm:max-w-md overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="mb-3">
            <SheetTitle className="text-base">My notes</SheetTitle>
          </SheetHeader>
          <NotesPanel contentItemId={contentItemId} bare />
        </SheetContent>
      </Sheet>
    </>
  );
}
