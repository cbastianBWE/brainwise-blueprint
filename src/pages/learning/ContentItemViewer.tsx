import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ExternalLink,
  FileText,
  HelpCircle,
  Loader2,
  PartyPopper,
  PlayCircle,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CONTENT_ITEM_TYPE_LABEL } from "@/components/tile/tileVariants";
import {
  useCompletionReporter,
  type CascadeResult,
  type CascadeTier,
} from "@/hooks/useCompletionReporter";
import VideoViewer from "@/components/learning/viewers/VideoViewer";
import WrittenSummaryViewer from "@/components/learning/viewers/WrittenSummaryViewer";
import ExternalLinkViewer from "@/components/learning/viewers/ExternalLinkViewer";
import QuizViewer from "@/components/learning/quiz/QuizViewer";
import SkillsPracticeViewer from "@/components/learning/viewers/SkillsPracticeViewer";
import FileUploadViewer from "@/components/learning/viewers/FileUploadViewer";
import LiveEventViewer from "@/components/learning/viewers/LiveEventViewer";

function getItemTypeIcon(itemType: string): { Icon: LucideIcon; color: string } {
  const map: Record<string, { Icon: LucideIcon; color: string }> = {
    video: { Icon: PlayCircle, color: "var(--bw-orange)" },
    quiz: { Icon: HelpCircle, color: "var(--bw-plum)" },
    written_summary: { Icon: FileText, color: "var(--bw-teal)" },
    skills_practice: { Icon: Award, color: "var(--bw-forest)" },
    file_upload: { Icon: Upload, color: "var(--bw-navy)" },
    external_link: { Icon: ExternalLink, color: "var(--bw-slate)" },
    live_event: { Icon: Calendar, color: "var(--bw-orange-600)" },
    lesson_blocks: { Icon: BookOpen, color: "var(--bw-mustard)" },
  };
  return map[itemType] ?? { Icon: FileText, color: "var(--bw-slate)" };
}

function mapError(message: string): string {
  if (message.includes("content_item_not_assigned"))
    return "You don't have access to this item.";
  if (message.includes("content_item_not_found"))
    return "This item could not be found.";
  if (message.includes("parent_module_unavailable"))
    return "This item isn't available right now.";
  if (message.includes("content_item_archived"))
    return "This item has been archived.";
  if (message.includes("authentication_required"))
    return "Please sign in to view this item.";
  if (message.includes("access_denied"))
    return "You don't have access to this item.";
  return "Could not load this item. Please try again.";
}

const CASCADE_COPY: Record<CascadeTier, { title: string; body: (name: string) => string }> = {
  content_item: { title: "Item complete", body: (n) => `You finished ${n}.` },
  module: { title: "Module complete", body: (n) => `You finished ${n}.` },
  curriculum: { title: "Curriculum complete", body: (n) => `You completed ${n}.` },
  certification: { title: "You're certified!", body: (n) => `You've earned ${n}.` },
};

interface PlaceholderProps {
  label: string;
}
function PlaceholderViewer({ label }: PlaceholderProps) {
  return (
    <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
      This {label.toLowerCase()} viewer is coming soon.
    </div>
  );
}

export default function ContentItemViewer() {
  const { contentItemId } = useParams<{ contentItemId: string }>();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const navigate = useNavigate();

  const [cascadeModal, setCascadeModal] = useState<CascadeResult | null>(null);

  const viewerQuery = useQuery({
    queryKey: ["content-item-viewer", contentItemId],
    enabled: !!contentItemId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_content_item_for_viewer" as never,
        { p_content_item_id: contentItemId } as never,
      );
      if (error) throw error;
      return data as any;
    },
  });

  const { reportCompletion, isReporting } = useCompletionReporter({
    userId: userId ?? "",
    contentItemId: contentItemId ?? "",
  });

  const openCascade = (c: CascadeResult | null) => {
    if (c && c.tier !== "content_item") setCascadeModal(c);
  };

  const wrappedReport = async (
    rpcName: string,
    rpcArgs: Record<string, unknown>,
  ) => {
    const result = await reportCompletion(rpcName, rpcArgs);
    if (result.ok) openCascade(result.cascade);
    return result;
  };

  // Auto-dismiss module-tier modal after 4s
  useEffect(() => {
    if (cascadeModal?.tier !== "module") return;
    const t = setTimeout(() => setCascadeModal(null), 4000);
    return () => clearTimeout(t);
  }, [cascadeModal]);

  // "More content below" scroll affordance
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [showMoreHint, setShowMoreHint] = useState(false);
  useEffect(() => {
    // Walk up from the root to find the actual scroll container
    const findScroller = (): HTMLElement | Window => {
      let el: HTMLElement | null = rootRef.current;
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        const oy = style.overflowY;
        if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight) {
          return el;
        }
        el = el.parentElement;
      }
      return window;
    };
    const scroller = findScroller();
    const compute = () => {
      if (scroller === window) {
        const sh = document.documentElement.scrollHeight;
        const ch = window.innerHeight;
        const st = window.scrollY;
        setShowMoreHint(st + ch < sh - 24);
      } else {
        const el = scroller as HTMLElement;
        setShowMoreHint(el.scrollTop + el.clientHeight < el.scrollHeight - 24);
      }
    };
    compute();
    const target: any = scroller;
    target.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      target.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [viewerQuery.data]);

  if (!userId || viewerQuery.isLoading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (viewerQuery.isError || !viewerQuery.data) {
    const err = viewerQuery.error as any;
    const friendly = mapError(err?.message ?? "");
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="rounded-md border border-destructive/30 bg-card p-6 text-destructive">
          {friendly}
        </div>
      </div>
    );
  }

  const data = viewerQuery.data;
  const contentItem = data.content_item;
  const completion = data.completion ?? null;
  const breadcrumb = data.breadcrumb ?? {};
  const nextItem = data.next_item ?? null;
  const viewerRole = (data.viewer_role ?? "self") as "self" | "mentor" | "super_admin";

  const itemType: string = contentItem.item_type;
  const typeLabel = CONTENT_ITEM_TYPE_LABEL[itemType] ?? itemType;
  const { Icon, color } = getItemTypeIcon(itemType);
  const isCompleted = completion?.status === "completed";

  const certPath = breadcrumb.certification_path ?? null;
  const curriculum = breadcrumb.curriculum ?? null;
  const moduleCrumb = breadcrumb.module ?? null;

  const renderViewer = () => {
    const props = {
      contentItem,
      completion,
      viewerRole,
      reportCompletion: wrappedReport,
      isReporting,
    };
    switch (itemType) {
      case "video":
        return <VideoViewer {...props} />;
      case "written_summary":
        return <WrittenSummaryViewer {...props} />;
      case "external_link":
        return <ExternalLinkViewer {...props} />;
      case "quiz":
        return <QuizViewer {...props} />;
      case "skills_practice":
        return <SkillsPracticeViewer {...props} />;
      case "file_upload":
        return <FileUploadViewer {...props} />;
      case "live_event":
        return <LiveEventViewer {...props} />;
      default:
        return <PlaceholderViewer label={typeLabel} />;
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Back */}
      <div className="px-4 pt-4 sm:px-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      {/* Breadcrumb */}
      {(certPath || curriculum || moduleCrumb) && (
        <div className="px-4 sm:px-6 flex flex-wrap items-center gap-1.5">
          {certPath && (
            <button
              onClick={() =>
                navigate(`/learning/cert-path/${certPath.certification_path_id}`)
              }
              className="rounded-full px-3 py-1 text-xs bg-muted border border-border hover:bg-muted/70 transition-colors"
            >
              {certPath.name}
            </button>
          )}
          {certPath && (curriculum || moduleCrumb) && (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {curriculum && (
            <button
              onClick={() =>
                navigate(`/learning/curriculum/${curriculum.curriculum_id}`)
              }
              className="rounded-full px-3 py-1 text-xs bg-muted border border-border hover:bg-muted/70 transition-colors"
            >
              {curriculum.name}
            </button>
          )}
          {curriculum && moduleCrumb && (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {moduleCrumb && (
            <button
              onClick={() => navigate(`/learning/module/${moduleCrumb.module_id}`)}
              className="rounded-full px-3 py-1 text-xs bg-muted border border-border hover:bg-muted/70 transition-colors"
            >
              {moduleCrumb.name}
            </button>
          )}
        </div>
      )}

      {/* Header band */}
      <div className="px-4 sm:px-6 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {contentItem.title}
              </h1>
              {contentItem.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {contentItem.description}
                </p>
              )}
            </div>
          </div>
          {isCompleted && (
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold text-white flex items-center gap-1 shrink-0"
              style={{ backgroundColor: "var(--bw-forest)" }}
            >
              <CircleCheck className="h-3.5 w-3.5" /> Completed
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground bg-muted border border-border">
            {typeLabel}
          </span>
          {contentItem.is_required ? (
            <span className="rounded-full px-2 py-1 text-xs font-semibold text-white bg-[var(--bw-orange)]">
              Required
            </span>
          ) : (
            <span className="border border-border text-muted-foreground rounded-full px-2 py-1 text-xs">
              Optional
            </span>
          )}
        </div>
      </div>

      {/* Viewer */}
      <section className="px-4 sm:px-6">{renderViewer()}</section>

      {/* Prev / Next footer */}
      <div className="px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
        {moduleCrumb ? (
          <Button
            variant="outline"
            onClick={() => navigate(`/learning/module/${moduleCrumb.module_id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to module
          </Button>
        ) : (
          <span />
        )}
        {nextItem && (
          <Button
            onClick={() => navigate(`/learning/content-item/${nextItem.content_item_id}`)}
            className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
          >
            Next: {nextItem.title}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Cascade celebration modal */}
      <Dialog open={!!cascadeModal} onOpenChange={(o) => !o && setCascadeModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cascadeModal ? CASCADE_COPY[cascadeModal.tier].title : ""}
            </DialogTitle>
            <DialogDescription>
              {cascadeModal?.entityName
                ? `Great work on ${cascadeModal.entityName}.`
                : "Great work!"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            {nextItem && (
              <Button
                onClick={() => {
                  setCascadeModal(null);
                  navigate(`/learning/content-item/${nextItem.content_item_id}`);
                }}
                className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
              >
                Next item
              </Button>
            )}
            <Button variant="outline" onClick={() => setCascadeModal(null)}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
