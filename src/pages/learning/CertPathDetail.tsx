import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Award, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tile } from "@/components/tile/Tile";
import {
  INSTRUMENT_BADGE_BG,
  INSTRUMENT_BADGE_LABEL,
  type InstrumentCode,
} from "@/components/tile/tileVariants";
import { resolveThumbnailUrls } from "@/lib/assetUrls";
import { enrolledStatusToCompletionStatus } from "@/lib/learningStatus";
import PaidEnrollmentNudgeModal from "@/components/resources/PaidEnrollmentNudgeModal";

const DIMENSION_COLOR: Record<string, string> = {
  // PTP
  "DIM-PTP-01": "var(--bw-navy)",
  "DIM-PTP-02": "var(--bw-teal)",
  "DIM-PTP-03": "var(--bw-slate)",
  "DIM-PTP-04": "var(--bw-plum)",
  "DIM-PTP-05": "var(--bw-forest)",
  // NAI
  "DIM-NAI-01": "var(--bw-navy)",
  "DIM-NAI-02": "var(--bw-orange)",
  "DIM-NAI-03": "var(--bw-teal)",
  "DIM-NAI-04": "var(--bw-plum)",
  "DIM-NAI-05": "var(--bw-mustard)",
};

const INSTRUMENT_FALLBACK_COLOR: Record<string, string> = {
  "INST-001": "var(--bw-navy)",
  "INST-002": "var(--bw-mustard)",
  "INST-003": "var(--bw-forest)",
  "INST-004": "var(--bw-slate)",
};

function dimensionColorFor(dimensionId: string, instrumentId: string): string {
  return (
    DIMENSION_COLOR[dimensionId] ??
    INSTRUMENT_FALLBACK_COLOR[instrumentId] ??
    "var(--bw-slate)"
  );
}

function titleCaseSlug(s?: string | null): string {
  if (!s) return "";
  return s
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export default function CertPathDetail() {
  const { certPathId } = useParams<{ certPathId: string }>();
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

  const certPathQuery = useQuery({
    queryKey: ["get_cert_path_detail", certPathId, userId],
    enabled: !!certPathId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_cert_path_detail" as never,
        {
          p_certification_path_id: certPathId,
          p_user_id: userId,
        } as never,
      );
      if (error) throw error;
      return data as any;
    },
  });

  const data = certPathQuery.data;
  const certPath = data?.certification_path ?? null;
  const userCertification = data?.user_certification ?? null;
  const recommendedNext = data?.recommended_next ?? null;
  const curricula: any[] = data?.curricula ?? [];
  const dimensions: any[] = data?.dimension_competencies ?? [];

  const assetIds = useMemo(() => {
    const ids = new Set<string>();
    if (certPath?.thumbnail_asset_id) ids.add(certPath.thumbnail_asset_id);
    for (const c of curricula) {
      if (c?.thumbnail_asset_id) ids.add(c.thumbnail_asset_id);
    }
    return Array.from(ids).sort();
  }, [certPath, curricula]);

  const { data: thumbnailMap } = useQuery({
    queryKey: ["thumbnail-urls", assetIds],
    queryFn: () => resolveThumbnailUrls(assetIds),
    enabled: assetIds.length > 0,
  });

  const handleEnroll = async () => {
    if (!certPathId || !certPath) return;

    const { data: rpcData, error } = await supabase.rpc(
      "self_enroll_in_certification_path" as never,
      { p_certification_path_id: certPathId } as never,
    );

    if (error) {
      const msg = error.message || error.toString() || "Unknown error";
      let description = msg;
      if (msg.includes("not_self_enrollable"))
        description = "This certification path isn't open for self-enrollment.";
      else if (msg.includes("already_assigned_active"))
        description = "You're already enrolled.";
      else if (msg.includes("already_has_active_certification"))
        description = "You already have an active certification of this type.";
      else if (msg.includes("not_published"))
        description = "This certification path isn't available yet.";
      toast({ title: "Could not enroll", description, variant: "destructive" });
      return;
    }

    if ((rpcData as any)?.status === "payment_required") {
      setPaidNudgeState({
        open: true,
        entityName: certPath.name ?? null,
        priceCents: (rpcData as any).price_cents ?? null,
      });
      return;
    }

    toast({
      title: "Enrolled!",
      description: `You're enrolled in ${certPath.name}.`,
    });
    await queryClient.invalidateQueries({
      queryKey: ["get_cert_path_detail", certPathId],
    });
    await queryClient.invalidateQueries({ queryKey: ["get_user_learning_state"] });
    await queryClient.invalidateQueries({ queryKey: ["list_available_learning"] });
  };

  if (certPathQuery.isLoading || !userId) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (certPathQuery.isError || !certPath) {
    const err = certPathQuery.error as any;
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/resources")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="rounded-md border border-destructive/30 bg-card p-6 text-destructive">
          Could not load this certification path.{" "}
          {err?.message ?? "Please try again."}
        </div>
      </div>
    );
  }

  const heroThumbUrl = certPath.thumbnail_asset_id
    ? thumbnailMap?.get(certPath.thumbnail_asset_id) ?? null
    : null;

  const heroBackground = heroThumbUrl
    ? `linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.2)), url(${heroThumbUrl})`
    : `linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.2)), linear-gradient(135deg, var(--bw-navy) 0%, var(--bw-navy-700) 100%)`;

  const instrumentIds: string[] = certPath.cert_instrument_ids ?? [];
  const isCertified = userCertification?.status === "certified";
  const isEnrolled = !!userCertification;
  const totalMinutes = curricula.reduce(
    (acc, c) => acc + (Number(c.estimated_minutes) || 0),
    0,
  );
  const anyMissingScore = dimensions.some((d) => d.user_mean == null);

  // CTA branch
  let cta: { label: string; onClick: () => void; outline?: boolean } | null =
    null;
  if (isCertified) {
    cta = {
      label: "Review",
      outline: true,
      onClick: () => {
        if (curricula[0])
          navigate(`/learning/curriculum/${curricula[0].curriculum_id}`);
      },
    };
  } else if (isEnrolled && recommendedNext) {
    cta = {
      label: "Resume",
      onClick: () => {
        // TODO Group W: route directly to content item viewer using
        // recommendedNext.content_item_id once viewers ship.
        navigate(`/learning/curriculum/${recommendedNext.curriculum_id}`);
      },
    };
  } else if (!isEnrolled) {
    cta = { label: "Enroll", onClick: handleEnroll };
  } else if (isEnrolled && !recommendedNext && !isCertified) {
    cta = {
      label: "Start",
      onClick: () => {
        if (curricula[0])
          navigate(`/learning/curriculum/${curricula[0].curriculum_id}`);
      },
    };
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Back button */}
      <div className="px-4 pt-4 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/resources")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      {/* Hero */}
      <div
        className="relative h-[180px] md:h-[240px] lg:h-[320px] w-full bg-cover bg-center"
        style={{ backgroundImage: heroBackground }}
      >
        <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-6">
          <div className="flex flex-wrap gap-2">
            {instrumentIds.map((code) => (
              <span
                key={code}
                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                style={{
                  backgroundColor:
                    INSTRUMENT_BADGE_BG[code as InstrumentCode] ??
                    "var(--bw-slate)",
                }}
              >
                {INSTRUMENT_BADGE_LABEL[code as InstrumentCode] ?? code}
              </span>
            ))}
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                {certPath.name}
              </h1>
              {certPath.description && (
                <p className="text-sm md:text-base text-white/85 line-clamp-2 mt-2">
                  {certPath.description}
                </p>
              )}
            </div>
            {isCertified && (
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold text-white flex items-center gap-1 shrink-0"
                style={{ backgroundColor: "var(--bw-plum)" }}
              >
                <Award className="h-3.5 w-3.5" /> Certified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action strip */}
      <div className="border-b bg-background -mt-6 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {isCertified
            ? "You've earned this certification."
            : isEnrolled
              ? "Continue your progress."
              : "Ready to begin?"}
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
          {curricula.length} curricula
        </span>
        {totalMinutes > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground bg-muted border border-border">
            {totalMinutes} min total
          </span>
        )}
        {certPath.certification_type && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground bg-muted border border-border">
            {titleCaseSlug(certPath.certification_type)}
          </span>
        )}
        {certPath.delivery_mode && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground bg-muted border border-border">
            {titleCaseSlug(certPath.delivery_mode)}
          </span>
        )}
      </div>

      {/* Dimension competencies */}
      {dimensions.length > 0 && (
        <section className="px-4 sm:px-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Builds competency in
          </h2>
          <div
            className={`grid gap-3 grid-cols-1 sm:grid-cols-2 ${
              dimensions.length >= 5
                ? "lg:grid-cols-5"
                : dimensions.length >= 4
                  ? "lg:grid-cols-4"
                  : "lg:grid-cols-3"
            }`}
          >
            {dimensions.map((d) => {
              const color = dimensionColorFor(d.dimension_id, d.instrument_id);
              const instrumentLabel =
                INSTRUMENT_BADGE_LABEL[d.instrument_id as InstrumentCode] ??
                d.instrument_id;
              return (
                <div
                  key={d.dimension_id}
                  className="rounded-lg border bg-card p-4 border-l-4"
                  style={{ borderLeftColor: color }}
                >
                  <div className="text-sm font-semibold text-foreground">
                    {d.dimension_name}
                  </div>
                  {d.short_name && d.short_name !== d.dimension_name && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {d.short_name}
                    </div>
                  )}
                  <div className="mt-3">
                    {d.user_mean != null ? (
                      <>
                        <div className="text-2xl font-bold text-foreground">
                          {Math.round(d.user_mean)}
                        </div>
                        {d.user_band && (
                          <div className="text-xs text-muted-foreground">
                            {titleCaseSlug(d.user_band)}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Take your {instrumentLabel} assessment to see your score
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {anyMissingScore && (
            <button
              onClick={() => navigate("/dashboard")}
              className="text-sm text-primary hover:underline mt-2"
            >
              Take your assessments to see your full competency picture
            </button>
          )}
        </section>
      )}

      {/* Curricula */}
      <section className="px-4 sm:px-6 space-y-3">
        <h2 className="text-lg font-semibold text-foreground mb-3">Curricula</h2>
        {curricula.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            This certification path has no curricula yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {curricula.map((c) => (
              <Tile
                key={c.curriculum_id}
                variant="curriculum"
                name={c.name}
                summary={c.description}
                thumbnailUrl={
                  c.thumbnail_asset_id
                    ? thumbnailMap?.get(c.thumbnail_asset_id) ?? null
                    : null
                }
                status={enrolledStatusToCompletionStatus(
                  c.user_assignment?.status,
                )}
                required={c.is_required ? "required" : "optional"}
                estimatedMinutes={c.estimated_minutes ?? null}
                detailPageMode={true}
                onClick={() =>
                  navigate(`/learning/curriculum/${c.curriculum_id}`)
                }
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
