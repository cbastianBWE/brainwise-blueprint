import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Tile } from "@/components/tile/Tile";
import type { CompletionStatus, TileVariant } from "@/components/tile/tileVariants";
import { resolveThumbnailUrls } from "@/lib/assetUrls";
import UpgradeNudgeModal from "./UpgradeNudgeModal";
import type { UpgradeEntityType } from "./types";

type EntityType = "cert_path" | "curriculum" | "module";

const STATUS_GROUP_ORDER = ["in_progress", "not_started", "completed"] as const;

function sortByStatusGroup<T extends { status_group?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ai = STATUS_GROUP_ORDER.indexOf((a.status_group ?? "not_started") as any);
    const bi = STATUS_GROUP_ORDER.indexOf((b.status_group ?? "not_started") as any);
    return ai - bi;
  });
}

function enrolledStatusToCompletionStatus(status?: string | null): CompletionStatus {
  if (status === "completed") return "completed";
  if (status === "in_progress") return "in_progress";
  return null;
}

function shouldShowEnrollButton(entity: any): boolean {
  return (
    entity.is_self_enrollable === true &&
    entity.enrollment_status === "not_enrolled" &&
    entity.is_accessible === true
  );
}

function mapEnrollError(error: any): string {
  const msg = error?.message || error?.toString() || "Unknown error";
  if (msg.includes("not_self_enrollable")) return "This item isn't open for self-enrollment.";
  if (msg.includes("already_assigned_active")) return "You're already enrolled.";
  if (msg.includes("already_has_active_certification"))
    return "You already have an active certification of this type.";
  if (msg.includes("not_standalone"))
    return "This item is part of a path or curriculum — enroll in that instead.";
  if (msg.includes("not_published")) return "This item isn't available yet.";
  return msg;
}

function entityVariantFor(t: EntityType): TileVariant {
  return t;
}

function entityIdOf(entity: any, t: EntityType): string {
  return t === "cert_path"
    ? entity.cert_path_id
    : t === "curriculum"
    ? entity.curriculum_id
    : entity.module_id;
}

function detailRouteFor(t: EntityType, id: string): string {
  return t === "cert_path"
    ? `/learning/cert-path/${id}`
    : t === "curriculum"
    ? `/learning/curriculum/${id}`
    : `/learning/module/${id}`;
}

interface SectionProps {
  title: string;
  items: any[];
  emptyText: string;
  entityType: EntityType;
  view: "enrolled" | "all_available";
  thumbnailMap: Map<string, string> | undefined;
  onTileClick: (entity: any, t: EntityType) => void;
  onEnroll: (entity: any, t: EntityType) => void;
}

function Section({
  title,
  items,
  emptyText,
  entityType,
  view,
  thumbnailMap,
  onTileClick,
  onEnroll,
}: SectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((entity) => {
            const id = entityIdOf(entity, entityType);
            const showEnroll = view === "all_available" && shouldShowEnrollButton(entity);
            const status = enrolledStatusToCompletionStatus(
              entity.status_group ?? entity.enrollment_status,
            );
            return (
              <Tile
                key={`${entityType}-${id}`}
                variant={entityVariantFor(entityType)}
                name={entity.name}
                summary={entity.description}
                thumbnailUrl={
                  entity.thumbnail_asset_id
                    ? thumbnailMap?.get(entity.thumbnail_asset_id) ?? null
                    : null
                }
                status={status}
                estimatedMinutes={entity.estimated_minutes ?? null}
                locked={entity.is_accessible === false}
                onClick={() => onTileClick(entity, entityType)}
                inlineCtaLabel={showEnroll ? "Enroll" : undefined}
                onInlineCtaClick={
                  showEnroll ? () => onEnroll(entity, entityType) : undefined
                }
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function MyLearningTab() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"enrolled" | "all_available">("enrolled");
  const [viewInitialized, setViewInitialized] = useState(false);
  const [upgradeState, setUpgradeState] = useState<{
    open: boolean;
    entityType: UpgradeEntityType | null;
    entityName: string | null;
  }>({ open: false, entityType: null, entityName: null });

  const learningQuery = useQuery({
    queryKey: ["get_user_learning_state", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_learning_state" as never, {
        p_user_id: userId,
      } as never);
      if (error) throw error;
      return data as any;
    },
  });

  const availableQuery = useQuery({
    queryKey: ["list_available_learning", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_available_learning" as never, {
        p_user_id: userId,
      } as never);
      if (error) throw error;
      return data as any;
    },
  });

  // Smart default: empty enrolled => default to all_available.
  useEffect(() => {
    if (viewInitialized) return;
    const ls = learningQuery.data;
    if (!ls) return;
    const assignments = ls.assignments ?? [];
    const moduleAssignments = ls.module_assignments ?? [];
    if (assignments.length === 0 && moduleAssignments.length === 0) {
      setView("all_available");
    }
    setViewInitialized(true);
  }, [learningQuery.data, viewInitialized]);

  const enrolledSections = useMemo(() => {
    const ls = learningQuery.data;
    const assignments: any[] = ls?.assignments ?? [];
    const moduleAssignments: any[] = ls?.module_assignments ?? [];
    // Cert paths: dedupe by certification_id
    const certPathRows = assignments.filter((a) => a.certification_id != null);
    const seen = new Set<string>();
    const certPaths: any[] = [];
    for (const r of certPathRows) {
      const cpid = r.cert_path_id ?? r.certification_id;
      if (seen.has(cpid)) continue;
      seen.add(cpid);
      certPaths.push(r);
    }
    const standaloneCurricula = assignments.filter((a) => a.certification_id == null);
    return {
      certPaths: sortByStatusGroup(certPaths),
      standaloneCurricula: sortByStatusGroup(standaloneCurricula),
      standaloneModules: sortByStatusGroup(moduleAssignments),
    };
  }, [learningQuery.data]);

  const availableSections = useMemo(() => {
    const av = availableQuery.data;
    return {
      certPaths: (av?.cert_paths ?? []) as any[],
      standaloneCurricula: (av?.standalone_curricula ?? []) as any[],
      standaloneModules: (av?.standalone_modules ?? []) as any[],
    };
  }, [availableQuery.data]);

  const filterBySearch = (items: any[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = `${it.name ?? ""} ${it.description ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  };

  const visibleSections = useMemo(() => {
    const src = view === "enrolled" ? enrolledSections : availableSections;
    return {
      certPaths: filterBySearch(src.certPaths),
      standaloneCurricula: filterBySearch(src.standaloneCurricula),
      standaloneModules: filterBySearch(src.standaloneModules),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, enrolledSections, availableSections, search]);

  const assetIds = useMemo(() => {
    const ids = new Set<string>();
    const collect = (arr: any[]) => {
      for (const it of arr) if (it?.thumbnail_asset_id) ids.add(it.thumbnail_asset_id);
    };
    collect(visibleSections.certPaths);
    collect(visibleSections.standaloneCurricula);
    collect(visibleSections.standaloneModules);
    return Array.from(ids).sort();
  }, [visibleSections]);

  const { data: thumbnailMap } = useQuery({
    queryKey: ["thumbnail-urls", assetIds],
    queryFn: () => resolveThumbnailUrls(assetIds),
    enabled: assetIds.length > 0,
  });

  const handleTileClick = (entity: any, t: EntityType) => {
    if (entity.is_accessible === false) {
      setUpgradeState({
        open: true,
        entityType: t,
        entityName: entity.name ?? null,
      });
      return;
    }
    navigate(detailRouteFor(t, entityIdOf(entity, t)));
  };

  const handleEnrollClick = async (entity: any, t: EntityType) => {
    const rpcName =
      t === "cert_path"
        ? "self_enroll_in_certification_path"
        : t === "curriculum"
        ? "self_enroll_in_curriculum"
        : "self_enroll_in_module";
    const paramName =
      t === "cert_path"
        ? "p_certification_path_id"
        : t === "curriculum"
        ? "p_curriculum_id"
        : "p_module_id";
    const id = entityIdOf(entity, t);

    const { data, error } = await supabase.rpc(rpcName as never, {
      [paramName]: id,
    } as never);

    if (error) {
      toast({
        title: "Could not enroll",
        description: mapEnrollError(error),
        variant: "destructive",
      });
      return;
    }

    if ((data as any)?.status === "payment_required") {
      const cents = (data as any).price_cents ?? 0;
      toast({
        title: "Payment required",
        description: `${entity.name} costs $${(cents / 100).toFixed(
          2,
        )}. Payment flow coming soon — contact support to enroll.`,
      });
      return;
    }

    toast({
      title: "Enrolled!",
      description: `You're enrolled in ${entity.name}.`,
    });
    await queryClient.invalidateQueries({ queryKey: ["get_user_learning_state"] });
    await queryClient.invalidateQueries({ queryKey: ["list_available_learning"] });
  };

  if (!userId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Please sign in to view your learning.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isLoading = learningQuery.isLoading || availableQuery.isLoading;
  if (isLoading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === "enrolled" ? "default" : "outline"}
            onClick={() => setView("enrolled")}
          >
            Enrolled
          </Button>
          <Button
            size="sm"
            variant={view === "all_available" ? "default" : "outline"}
            onClick={() => setView("all_available")}
          >
            All Available
          </Button>
        </div>
        <div className="relative max-w-md flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-9"
          />
        </div>
      </div>

      {view === "enrolled" ? (
        <>
          <Section
            title="Certification Paths"
            items={visibleSections.certPaths}
            emptyText="You're not enrolled in any certification paths yet. Browse All Available to explore."
            entityType="cert_path"
            view={view}
            thumbnailMap={thumbnailMap}
            onTileClick={handleTileClick}
            onEnroll={handleEnrollClick}
          />
          <Section
            title="Standalone Curricula"
            items={visibleSections.standaloneCurricula}
            emptyText="No standalone curricula enrolled."
            entityType="curriculum"
            view={view}
            thumbnailMap={thumbnailMap}
            onTileClick={handleTileClick}
            onEnroll={handleEnrollClick}
          />
          <Section
            title="Standalone Modules"
            items={visibleSections.standaloneModules}
            emptyText="No standalone modules enrolled."
            entityType="module"
            view={view}
            thumbnailMap={thumbnailMap}
            onTileClick={handleTileClick}
            onEnroll={handleEnrollClick}
          />
        </>
      ) : (
        <>
          <Section
            title="Certification Paths"
            items={visibleSections.certPaths}
            emptyText="No certification paths available right now."
            entityType="cert_path"
            view={view}
            thumbnailMap={thumbnailMap}
            onTileClick={handleTileClick}
            onEnroll={handleEnrollClick}
          />
          <Section
            title="Standalone Curricula"
            items={visibleSections.standaloneCurricula}
            emptyText="No standalone curricula available right now."
            entityType="curriculum"
            view={view}
            thumbnailMap={thumbnailMap}
            onTileClick={handleTileClick}
            onEnroll={handleEnrollClick}
          />
          <Section
            title="Standalone Modules"
            items={visibleSections.standaloneModules}
            emptyText="No standalone modules available right now."
            entityType="module"
            view={view}
            thumbnailMap={thumbnailMap}
            onTileClick={handleTileClick}
            onEnroll={handleEnrollClick}
          />
        </>
      )}

      <UpgradeNudgeModal
        open={upgradeState.open}
        onOpenChange={(open) => setUpgradeState((s) => ({ ...s, open }))}
        entityType={upgradeState.entityType}
        entityName={upgradeState.entityName}
      />
    </div>
  );
}
