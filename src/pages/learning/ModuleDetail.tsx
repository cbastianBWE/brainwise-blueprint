import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  ChevronRight,
  Circle,
  CircleCheck,
  Clock,
  ExternalLink,
  FileText,
  HelpCircle,
  Loader2,
  PlayCircle,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { resolveTierThumbnailRows } from "@/lib/assetUrls";
import { CONTENT_ITEM_TYPE_LABEL } from "@/components/tile/tileVariants";
import PaidEnrollmentNudgeModal from "@/components/resources/PaidEnrollmentNudgeModal";

interface RecommendedNext {
  content_item_id: string;
  item_type: string;
  module_id: string;
  module_name: string;
  content_item_title: string;
  curriculum_id: string | null;
}

interface ContentItemCompletion {
  completion_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  attempts_count: number;
  video_watch_pct: number | null;
  video_last_position_seconds: number | null;
  quiz_best_score_pct: number | null;
  quiz_passed: boolean | null;
  written_review_status: string | null;
  skills_trainee_signed_off: boolean | null;
  skills_mentor_signed_off: boolean | null;
  reviewer_comments: string | null;
}

interface ContentItem {
  content_item_id: string;
  item_type: string;
  title: string;
  description: string | null;
  display_order: number;
  is_required: boolean;
  thumbnail_asset_id: string | null;
  video_source_type: string | null;
  video_source_id: string | null;
  video_completion_threshold_pct: number | null;
  quiz_pass_threshold_pct: number | null;
  quiz_show_correct_mode: string | null;
  written_min_chars: number | null;
  written_max_chars: number | null;
  written_completion_mode: string | null;
  skills_signoff_required: string | null;
  skills_actor_invitation_required: boolean | null;
  external_url: string | null;
  event_scheduled_at: string | null;
  lesson_completion_mode: string | null;
  config: Record<string, unknown> | null;
  completion: ContentItemCompletion | null;
  name?: string | null;
}

interface ModuleCompletion {
  completion_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
}

interface UserAssignment {
  assignment_id: string;
  status: string;
  source: string;
  source_reference_id: string | null;
  assigned_at: string;
  due_at: string | null;
  completed_at: string | null;
}

interface ParentCurriculum {
  curriculum_id: string;
  slug: string;
  name: string;
  display_order: number;
  prerequisite_module_id: string | null;
  is_required: boolean;
}

interface ParentCertPath {
  certification_path_id: string;
  slug: string;
  name: string;
}

interface ModuleRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  estimated_minutes: number | null;
  thumbnail_asset_id: string | null;
  is_published: boolean;
  is_self_enrollable: boolean;
  self_enroll_price_cents: number | null;
  self_enroll_currency: string | null;
}

interface ModuleDetailResponse {
  module: ModuleRecord;
  parent_curricula: ParentCurriculum[];
  parent_cert_paths: ParentCertPath[];
  user_assignment: UserAssignment | null;
  module_completion: ModuleCompletion | null;
  content_items: ContentItem[];
  recommended_next: RecommendedNext | null;
  user_id: string;
  viewer_role: "self" | "mentor" | "super_admin";
  generated_at: string;
}

interface EnrollPaymentRequired {
  status: "payment_required";
  price_cents: number | null;
}

type EnrollResponse = EnrollPaymentRequired | Record<string, unknown> | null;

function titleCaseSlug(s?: string | null): string {
  if (!s) return "";
  return s
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

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

export default function ModuleDetail() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [paidNudgeState, setPaidNudgeState] = useState<{
    open: boolean;
    entityName: string | null;
    priceCents: number | null;
  }>({ open: false, entityName: null, priceCents: null });

  const [isEnrolling, setIsEnrolling] = useState(false);

  const moduleQuery = useQuery({
    queryKey: ["get_module_detail", moduleId, userId],
    enabled: !!moduleId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_module_detail" as never, {
        p_module_id: moduleId,
        p_user_id: userId,
      } as never);
      if (error) throw error;
      return data as unknown as ModuleDetailResponse;
    },
  });

  const data = moduleQuery.data;
  const module_: ModuleRecord | null = data?.module ?? null;
  const userAssignment: UserAssignment | null = data?.user_assignment ?? null;
  const moduleCompletion: ModuleCompletion | null = data?.module_completion ?? null;
  const recommendedNext: RecommendedNext | null = data?.recommended_next ?? null;
  const contentItems: ContentItem[] = data?.content_items ?? [];
  const parentCurricula: ParentCurriculum[] = data?.parent_curricula ?? [];
  const parentCertPaths: ParentCertPath[] = data?.parent_cert_paths ?? [];

  const { data: heroMap } = useQuery({
    queryKey: ["tier-thumb-rows", "module", moduleId],
    queryFn: () =>
      resolveTierThumbnailRows("module", moduleId ? [moduleId] : []),
    enabled: !!moduleId,
  });

  const handleEnroll = async () => {
    if (!moduleId || !module_ || isEnrolling) return;
    setIsEnrolling(true);
    try {
      const { data: rpcData, error } = await supabase.rpc(
        "self_enroll_in_module" as never,
        { p_module_id: moduleId } as never,
      );

      if (error) {
        const msg = error.message || error.toString() || "Unknown error";
        let description = msg;
        if (msg.includes("not_self_enrollable"))
          description = "This module isn't open for self-enrollment.";
        else if (msg.includes("already_assigned_active"))
          description = "You're already enrolled.";
        else if (msg.includes("is_not_standalone"))
          description =
            "This module is part of a curriculum — enroll at the curriculum or path level.";
        else if (msg.includes("not_published"))
          description = "This module isn't available yet.";
        toast({ title: "Could not enroll", description, variant: "destructive" });
        return;
      }

      const enrollResponse = rpcData as unknown as EnrollResponse;
      if (enrollResponse && (enrollResponse as EnrollPaymentRequired).status === "payment_required") {
        const paidResponse = enrollResponse as EnrollPaymentRequired;
        setPaidNudgeState({
          open: true,
          entityName: module_.name ?? null,
          priceCents: paidResponse.price_cents ?? null,
        });
        return;
      }

      toast({
        title: "Enrolled!",
        description: `You're enrolled in ${module_.name}.`,
      });
      await queryClient.invalidateQueries({
        queryKey: ["get_module_detail", moduleId],
      });
      await queryClient.invalidateQueries({ queryKey: ["get_user_learning_state"] });
      await queryClient.invalidateQueries({ queryKey: ["list_available_learning"] });
    } finally {
      setIsEnrolling(false);
    }
  };

  if (moduleQuery.isLoading || !userId) {
    return (
      <div
        className="flex min-h-[30vh] items-center justify-center"
        role="status"
        aria-label="Loading module"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (moduleQuery.isError || !module_) {
    const err = moduleQuery.error as Error | null;
    return (
      <div className="p-6 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/resources");
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="rounded-md border border-destructive/30 bg-card p-6 text-destructive space-y-3">
          <div>
            Could not load this module. {err?.message ?? "Please try again."}
          </div>
          <Button size="sm" onClick={() => moduleQuery.refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const heroMeta = moduleId ? heroMap?.get(moduleId) ?? null : null;


  const heroOverlay = "linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.2))";
  const heroFallback =
    "linear-gradient(135deg, var(--bw-navy) 0%, var(--bw-navy-700) 100%)";
  // Bare hex colors are not valid in background-image; split solid into
  // background-color and keep gradient(s) in background-image.
  const heroBackgroundImage = heroMeta?.dominantColor
    ? heroOverlay
    : `${heroOverlay}, ${heroFallback}`;
  const heroBackgroundColor = heroMeta?.dominantColor ?? "transparent";

  const isCompleted = moduleCompletion?.status === "completed";
  const hasAnyItemCompleted = contentItems.some(
    (ci) => ci?.completion?.status === "completed",
  );
  const isInProgress = !isCompleted && hasAnyItemCompleted;
  const isEnrolledStandalone = !!userAssignment;
  const inCurriculum = parentCurricula.length > 0;
  const isAccessible = isEnrolledStandalone || inCurriculum;
  const isSelfEnrollable = module_.is_self_enrollable === true;

  const firstParentCurriculum = parentCurricula[0] ?? null;
  const moreParentCurricula =
    parentCurricula.length > 1 ? parentCurricula.length - 1 : 0;
  const firstParentCertPath = parentCertPaths[0] ?? null;
  const moreParentCertPaths =
    parentCertPaths.length > 1 ? parentCertPaths.length - 1 : 0;

  const parentRequired =
    firstParentCurriculum && firstParentCurriculum.is_required === true;

  // CTA decision tree, ordered by precedence:
  //   1. Completed                                                  → "Review" (first content item)
  //   2. recommendedNext + accessible                               → "Resume" (deep-link)
  //   3. Not enrolled + not in curriculum + self-enrollable         → "Enroll" (with paid-nudge branching)
  //   4. Not enrolled + not in curriculum + not self-enrollable     → notice: "Not currently open for enrollment"
  //   5. In curriculum + no recommended_next + not completed        → "Enroll via {curriculum name}"
  //   6. Accessible + no recommended_next + not completed           → "Start" (first content item)
  let cta:
    | { label: string; onClick: () => void; outline?: boolean }
    | null = null;
  let stripLabel = "Ready to begin?";
  let stripNotice: string | null = null;

  if (isCompleted) {
    stripLabel = "You've completed this module.";
    cta = {
      label: "Review",
      outline: true,
      onClick: () => {
        if (contentItems[0])
          navigate(`/learning/content-item/${contentItems[0].content_item_id}`);
      },
    };
  } else if (recommendedNext && isAccessible) {
    stripLabel = "Continue your progress.";
    cta = {
      label: "Resume",
      onClick: () => {
        navigate(`/learning/content-item/${recommendedNext.content_item_id}`);
      },
    };
  } else if (!isEnrolledStandalone && !inCurriculum && isSelfEnrollable) {
    stripLabel = "Ready to begin?";
    cta = { label: "Enroll", onClick: handleEnroll };
  } else if (!isEnrolledStandalone && !inCurriculum && !isSelfEnrollable) {
    stripNotice = "This module is not currently open for enrollment.";
  } else if (inCurriculum && !recommendedNext && !isCompleted) {
    stripLabel = "Enroll in the curriculum to access this module.";
    cta = {
      label: `Enroll via ${firstParentCurriculum.name}`,
      onClick: () =>
        navigate(`/learning/curriculum/${firstParentCurriculum.curriculum_id}`),
    };
  } else if (isAccessible && !recommendedNext && !isCompleted) {
    stripLabel = "Continue your progress.";
    if (contentItems[0]) {
      cta = {
        label: "Start",
        onClick: () => {
          navigate(
            `/learning/content-item/${contentItems[0].content_item_id}`,
          );
        },
      };
    }
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Back */}
      <div className="px-4 pt-4 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/resources");
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      {/* Hero */}
      <div
        className="relative h-[180px] md:h-[240px] lg:h-[320px] w-full"
        style={{ backgroundImage: heroBackgroundImage, backgroundColor: heroBackgroundColor }}
      >
        {/* Brand glyph is decorative — module name below provides semantic content. */}
        <img
          src="/brain-icon.png"
          alt=""
          aria-hidden="true"
          className="absolute top-4 right-4 h-12 w-12 md:h-14 md:w-14 opacity-90 pointer-events-none"
        />
        <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-6">
          <div />
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white line-clamp-2">
                {module_.name}
              </h1>
              {module_.description && (
                <p className="text-sm md:text-base text-white/85 line-clamp-2 mt-2">
                  {module_.description}
                </p>
              )}
              {firstParentCurriculum && (
                <div className="mt-3">
                  <button
                    onClick={() =>
                      navigate(
                        `/learning/curriculum/${firstParentCurriculum.curriculum_id}`,
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white bg-white/15 backdrop-blur-sm hover:bg-white/25 transition-colors"
                  >
                    Part of {firstParentCurriculum.name}
                    {moreParentCurricula > 0
                      ? ` +${moreParentCurricula} more`
                      : ""}
                  </button>
                </div>
              )}
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
        </div>
      </div>

      {/* Action strip */}
      <div className="border-b bg-background -mt-6 px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          {stripNotice ?? stripLabel}
        </div>
        {cta && (
          <Button
            onClick={cta.onClick}
            disabled={cta.label === "Enroll" && isEnrolling}
            variant={cta.outline ? "outline" : "default"}
            className={
              cta.outline
                ? undefined
                : "bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white disabled:opacity-60"
            }
          >
            {cta.label === "Enroll" && isEnrolling && (
              <Loader2 className="h-3 w-3 animate-spin mr-1.5" aria-hidden="true" />
            )}
            {cta.label}
          </Button>
        )}
      </div>

      {/* Metadata chips */}
      <div className="px-4 sm:px-6 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground bg-muted border border-border">
          {pluralize(contentItems.length, "item", "items")}
        </span>
        {Number(module_.estimated_minutes) > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground bg-muted border border-border">
            {module_.estimated_minutes} min
          </span>
        )}
        {inCurriculum &&
          (parentRequired ? (
            <span className="rounded-full px-2 py-1 text-xs font-semibold text-white bg-[var(--bw-orange)]">
              Required
            </span>
          ) : (
            <span className="border border-border text-muted-foreground rounded-full px-2 py-1 text-xs">
              Optional
            </span>
          ))}
        {firstParentCertPath && (
          <button
            onClick={() =>
              navigate(
                `/learning/cert-path/${firstParentCertPath.certification_path_id}`,
              )
            }
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground bg-muted border border-border hover:bg-muted/70 transition-colors"
          >
            Path: {firstParentCertPath.name}
            {moreParentCertPaths > 0 ? ` +${moreParentCertPaths} more` : ""}
          </button>
        )}
      </div>

      {/* Content items */}
      <section className="px-4 sm:px-6 space-y-3">
        <h2 className="text-lg font-semibold text-foreground mb-3">Content</h2>
        {contentItems.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            This module has no content yet.
          </div>
        ) : (
          <div className="space-y-2">
            {contentItems.map((ci) => {
              const { Icon, color } = getItemTypeIcon(ci.item_type);
              const typeLabel =
                CONTENT_ITEM_TYPE_LABEL[ci.item_type] ?? ci.item_type;
              const required = ci.is_required ? "Required" : "Optional";
              const status = ci?.completion?.status;
              const startedAt = ci?.completion?.started_at ?? null;
              const isItemCompleted = status === "completed";
              const isItemInProgress =
                !isItemCompleted &&
                (status === "in_progress" ||
                  (!!startedAt && status !== "completed"));

              return (
                <div
                  key={ci.content_item_id}
                  onClick={() =>
                    navigate(`/learning/content-item/${ci.content_item_id}`)
                  }
                  role="button"
                  tabIndex={0}
                  aria-label={`Open content item: ${ci.title ?? ci.name ?? "Untitled"}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/learning/content-item/${ci.content_item_id}`);
                    }
                  }}
                  className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-muted/50 cursor-pointer transition-colors min-h-[44px]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-5 w-5" style={{ color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {ci.title ?? ci.name}
                    </div>
                    {ci.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {ci.description}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {typeLabel} · {required}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isItemCompleted &&
                      ci?.completion?.completed_at &&
                      (ci.item_type === "external_link" ||
                        ci.item_type === "file_upload" ||
                        ci.item_type === "live_event") && (
                        <span className="text-[11px] text-muted-foreground rounded-full border border-border bg-muted px-2 py-0.5 whitespace-nowrap">
                          Completed{" "}
                          {new Date(ci.completion.completed_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    {isItemCompleted ? (
                      <CircleCheck
                        className="h-5 w-5"
                        style={{ color: "var(--bw-forest)" }}
                      />
                    ) : isItemInProgress ? (
                      <Clock
                        className="h-5 w-5"
                        style={{ color: "var(--bw-teal)" }}
                      />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <PaidEnrollmentNudgeModal
        open={paidNudgeState.open}
        onOpenChange={(open) => setPaidNudgeState((s) => ({ ...s, open }))}
        entityName={paidNudgeState.entityName}
        priceCents={paidNudgeState.priceCents}
      />
    </div>
  );
}
