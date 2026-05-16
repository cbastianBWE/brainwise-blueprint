import { useMemo, useState } from "react";
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
import { resolveThumbnailUrls } from "@/lib/assetUrls";
import { CONTENT_ITEM_TYPE_LABEL } from "@/components/tile/tileVariants";
import PaidEnrollmentNudgeModal from "@/components/resources/PaidEnrollmentNudgeModal";

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

  const moduleQuery = useQuery({
    queryKey: ["get_module_detail", moduleId, userId],
    enabled: !!moduleId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_module_detail" as never, {
        p_module_id: moduleId,
        p_user_id: userId,
      } as never);
      if (error) throw error;
      return data as any;
    },
  });

  const data = moduleQuery.data;
  const module_ = data?.module ?? null;
  const userAssignment = data?.user_assignment ?? null;
  const moduleCompletion = data?.module_completion ?? null;
  const recommendedNext = data?.recommended_next ?? null;
  const contentItems: any[] = data?.content_items ?? [];
  const parentCurricula: any[] = data?.parent_curricula ?? [];
  const parentCertPaths: any[] = data?.parent_cert_paths ?? [];

  const assetIds = useMemo(() => {
    const ids = new Set<string>();
    if (module_?.thumbnail_asset_id) ids.add(module_.thumbnail_asset_id);
    for (const ci of contentItems) {
      if (ci?.thumbnail_asset_id) ids.add(ci.thumbnail_asset_id);
    }
    return Array.from(ids).sort();
  }, [module_, contentItems]);

  const { data: thumbnailMap } = useQuery({
    queryKey: ["thumbnail-urls", assetIds],
    queryFn: () => resolveThumbnailUrls(assetIds),
    enabled: assetIds.length > 0,
  });

  const handleEnroll = async () => {
    if (!moduleId || !module_) return;

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

    if ((rpcData as any)?.status === "payment_required") {
      setPaidNudgeState({
        open: true,
        entityName: module_.name ?? null,
        priceCents: (rpcData as any).price_cents ?? null,
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
  };

  if (moduleQuery.isLoading || !userId) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (moduleQuery.isError || !module_) {
    const err = moduleQuery.error as any;
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="rounded-md border border-destructive/30 bg-card p-6 text-destructive">
          Could not load this module. {err?.message ?? "Please try again."}
        </div>
      </div>
    );
  }

  const heroThumbUrl = module_.thumbnail_asset_id
    ? thumbnailMap?.get(module_.thumbnail_asset_id) ?? null
    : null;

  const heroBackground = heroThumbUrl
    ? `linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.2)), url(${heroThumbUrl})`
    : `linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.2)), linear-gradient(135deg, var(--bw-navy) 0%, var(--bw-navy-700) 100%)`;

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

  // CTA branching
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
        // TODO Group W: route to content item viewer once it ships.
        if (contentItems[0])
          navigate(`/learning/content-item/${contentItems[0].content_item_id}`);
      },
    };
  } else if (recommendedNext && isAccessible) {
    stripLabel = "Continue your progress.";
    cta = {
      label: "Resume",
      onClick: () => {
        // TODO Group W: route to content item viewer once it ships.
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
          // TODO Group W: route to content item viewer once it ships.
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
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      {/* Hero */}
      <div
        className="relative h-[180px] md:h-[240px] lg:h-[320px] w-full bg-cover bg-center"
        style={{ backgroundImage: heroBackground }}
      >
        <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-6">
          <div />
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white">
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
            variant={cta.outline ? "outline" : "default"}
            className={
              cta.outline
                ? undefined
                : "bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
            }
          >
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
                    // TODO Group W: content item viewer route ships here.
                    navigate(`/learning/content-item/${ci.content_item_id}`)
                  }
                  role="button"
                  tabIndex={0}
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
                  <div className="flex items-center gap-1 shrink-0">
                    {isItemCompleted ? (
                      <CircleCheck
                        className="h-5 w-5"
                        style={{ color: "var(--bw-forest)" }}
                      />
                    ) : isItemInProgress ? (
                      <Clock
                        className="h-5 w-5"
                        style={{ color: "var(--bw-amber)" }}
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
