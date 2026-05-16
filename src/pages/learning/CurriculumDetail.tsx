import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CircleCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tile } from "@/components/tile/Tile";
import { resolveThumbnailUrls } from "@/lib/assetUrls";
import { enrolledStatusToCompletionStatus } from "@/lib/learningStatus";
import PaidEnrollmentNudgeModal from "@/components/resources/PaidEnrollmentNudgeModal";

function titleCaseSlug(s?: string | null): string {
  if (!s) return "";
  return s
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function prereqLabel(module: any, modules: any[]): string | null {
  const pid = module?.prerequisite_module_id;
  if (!pid) return null;
  const m = modules.find((x) => x.module_id === pid);
  return m?.name ?? null;
}

export default function CurriculumDetail() {
  const { curriculumId } = useParams<{ curriculumId: string }>();
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

  const curriculumQuery = useQuery({
    queryKey: ["get_curriculum_detail", curriculumId, userId],
    enabled: !!curriculumId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_curriculum_detail" as never,
        {
          p_curriculum_id: curriculumId,
          p_user_id: userId,
        } as never,
      );
      if (error) throw error;
      return data as any;
    },
  });

  const data = curriculumQuery.data;
  const curriculum = data?.curriculum ?? null;
  const userAssignment = data?.user_assignment ?? null;
  const recommendedNext = data?.recommended_next ?? null;
  const modules: any[] = data?.modules ?? [];
  const parentCertPaths: any[] = data?.parent_cert_paths ?? [];

  const assetIds = useMemo(() => {
    const ids = new Set<string>();
    if (curriculum?.thumbnail_asset_id) ids.add(curriculum.thumbnail_asset_id);
    for (const m of modules) {
      if (m?.thumbnail_asset_id) ids.add(m.thumbnail_asset_id);
    }
    return Array.from(ids).sort();
  }, [curriculum, modules]);

  const { data: thumbnailMap } = useQuery({
    queryKey: ["thumbnail-urls", assetIds],
    queryFn: () => resolveThumbnailUrls(assetIds),
    enabled: assetIds.length > 0,
  });

  const handleEnroll = async () => {
    if (!curriculumId || !curriculum) return;

    const { data: rpcData, error } = await supabase.rpc(
      "self_enroll_in_curriculum" as never,
      { p_curriculum_id: curriculumId } as never,
    );

    if (error) {
      const msg = error.message || error.toString() || "Unknown error";
      let description = msg;
      if (msg.includes("not_self_enrollable"))
        description = "This curriculum isn't open for self-enrollment.";
      else if (msg.includes("already_assigned_active"))
        description = "You're already enrolled.";
      else if (msg.includes("is_not_standalone"))
        description =
          "This curriculum is part of a certification path — enroll at the path level.";
      else if (msg.includes("not_published"))
        description = "This curriculum isn't available yet.";
      toast({ title: "Could not enroll", description, variant: "destructive" });
      return;
    }

    if ((rpcData as any)?.status === "payment_required") {
      setPaidNudgeState({
        open: true,
        entityName: curriculum.name ?? null,
        priceCents: (rpcData as any).price_cents ?? null,
      });
      return;
    }

    toast({
      title: "Enrolled!",
      description: `You're enrolled in ${curriculum.name}.`,
    });
    await queryClient.invalidateQueries({
      queryKey: ["get_curriculum_detail", curriculumId],
    });
    await queryClient.invalidateQueries({ queryKey: ["get_user_learning_state"] });
    await queryClient.invalidateQueries({ queryKey: ["list_available_learning"] });
  };

  if (curriculumQuery.isLoading || !userId) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (curriculumQuery.isError || !curriculum) {
    const err = curriculumQuery.error as any;
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="rounded-md border border-destructive/30 bg-card p-6 text-destructive">
          Could not load this curriculum.{" "}
          {err?.message ?? "Please try again."}
        </div>
      </div>
    );
  }

  const heroThumbUrl = curriculum.thumbnail_asset_id
    ? thumbnailMap?.get(curriculum.thumbnail_asset_id) ?? null
    : null;

  const heroBackground = heroThumbUrl
    ? `linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.2)), url(${heroThumbUrl})`
    : `linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.2)), linear-gradient(135deg, var(--bw-navy) 0%, var(--bw-navy-700) 100%)`;

  const isCompleted = userAssignment?.status === "completed";
  const isEnrolled = !!userAssignment;
  const isSelfEnrollable = curriculum.is_self_enrollable === true;
  const firstParent = parentCertPaths[0] ?? null;
  const moreParents = parentCertPaths.length > 1 ? parentCertPaths.length - 1 : 0;

  const summedMinutes = modules.reduce(
    (acc, m) => acc + (Number(m.estimated_minutes) || 0),
    0,
  );
  const totalMinutes =
    Number(curriculum.estimated_minutes) > 0
      ? Number(curriculum.estimated_minutes)
      : summedMinutes;

  // CTA branch
  let cta:
    | { label: string; onClick: () => void; outline?: boolean }
    | null = null;
  let stripLabel = "Ready to begin?";
  let stripNotice: string | null = null;

  if (isCompleted) {
    stripLabel = "You've completed this curriculum.";
    cta = {
      label: "Review",
      outline: true,
      onClick: () => {
        if (modules[0]) navigate(`/learning/module/${modules[0].module_id}`);
      },
    };
  } else if (isEnrolled && recommendedNext) {
    stripLabel = "Continue your progress.";
    cta = {
      label: "Resume",
      onClick: () => {
        // TODO Group W: route directly to content item viewer using
        // recommendedNext.content_item_id once viewers ship.
        navigate(`/learning/module/${recommendedNext.module_id}`);
      },
    };
  } else if (!isEnrolled && !isSelfEnrollable && firstParent) {
    stripLabel = "This curriculum is part of a certification path.";
    cta = {
      label: `Enroll in ${firstParent.name}`,
      onClick: () =>
        navigate(`/learning/cert-path/${firstParent.certification_path_id}`),
    };
  } else if (!isEnrolled && !isSelfEnrollable && !firstParent) {
    stripNotice = "This curriculum is not currently open for enrollment.";
  } else if (!isEnrolled) {
    stripLabel = "Ready to begin?";
    cta = { label: "Enroll", onClick: handleEnroll };
  } else if (isEnrolled && !recommendedNext && !isCompleted) {
    stripLabel = "Continue your progress.";
    cta = {
      label: "Start",
      onClick: () => {
        if (modules[0]) navigate(`/learning/module/${modules[0].module_id}`);
      },
    };
  }

  const parentRequired =
    firstParent && firstParent.is_required === true ? true : false;

  return (
    <div className="space-y-6 pb-10">
      {/* Back button */}
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
                {curriculum.name}
              </h1>
              {curriculum.description && (
                <p className="text-sm md:text-base text-white/85 line-clamp-2 mt-2">
                  {curriculum.description}
                </p>
              )}
              {firstParent && (
                <div className="mt-3">
                  <button
                    onClick={() =>
                      navigate(
                        `/learning/cert-path/${firstParent.certification_path_id}`,
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white bg-white/15 backdrop-blur-sm hover:bg-white/25 transition-colors"
                  >
                    Part of {firstParent.name}
                    {moreParents > 0 ? ` +${moreParents} more` : ""}
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
      <div className="border-b bg-background -mt-6 px-4 sm:px-6 py-4 flex items-center justify-between">
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

      {/* At-a-glance metadata */}
      <div className="px-4 sm:px-6 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground bg-muted border border-border">
          {modules.length} modules
        </span>
        {totalMinutes > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground bg-muted border border-border">
            {totalMinutes} min total
          </span>
        )}
        {curriculum.mode && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground bg-muted border border-border">
            {titleCaseSlug(curriculum.mode)}
          </span>
        )}
        {parentCertPaths.length > 0 &&
          (parentRequired ? (
            <span className="rounded-full px-2 py-1 text-xs font-semibold text-white bg-[var(--bw-orange)]">
              Required
            </span>
          ) : (
            <span className="border border-border text-muted-foreground rounded-full px-2 py-1 text-xs">
              Optional
            </span>
          ))}
      </div>

      {/* Modules */}
      <section className="px-4 sm:px-6 space-y-3">
        <h2 className="text-lg font-semibold text-foreground mb-3">Modules</h2>
        {modules.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            This curriculum has no modules yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {modules.map((m) => (
              <Tile
                key={m.module_id}
                variant="module"
                name={m.name}
                summary={m.description}
                thumbnailUrl={
                  m.thumbnail_asset_id
                    ? thumbnailMap?.get(m.thumbnail_asset_id) ?? null
                    : null
                }
                status={enrolledStatusToCompletionStatus(
                  m.module_completion?.status,
                )}
                required={m.is_required ? "required" : "optional"}
                estimatedMinutes={m.estimated_minutes ?? null}
                prerequisiteName={prereqLabel(m, modules)}
                detailPageMode={true}
                onClick={() => navigate(`/learning/module/${m.module_id}`)}
              />
            ))}
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
