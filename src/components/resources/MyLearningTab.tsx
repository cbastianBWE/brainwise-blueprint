import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Folder, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Tile } from "@/components/tile/Tile";
import type { TileVariant, InstrumentCode } from "@/components/tile/tileVariants";
import { resolveTierThumbnailUrls, type ThumbnailMeta } from "@/lib/assetUrls";
import { enrolledStatusToCompletionStatus } from "@/lib/learningStatus";
import UpgradeNudgeModal from "./UpgradeNudgeModal";
import PaidEnrollmentNudgeModal from "./PaidEnrollmentNudgeModal";
import type { UpgradeEntityType } from "./types";

// ---------------------------------------------------------------------------
// RPC return shape types (§111 wrapper-shape discipline)
// ---------------------------------------------------------------------------

interface RecommendedNext {
  content_item_id: string;
  item_type: string;
  module_id: string;
  module_name: string;
  content_item_title: string;
  curriculum_id: string | null;
}

// Legacy assignment shapes — still returned by the RPC but no longer the
// consumption surface for the Assigned view (replaced by the
// assigned_cert_paths/_curricula/_modules arrays below).
interface LearningAssignment {
  assignment_id: string;
  curriculum_id: string;
  source: string;
  source_reference_id: string | null;
  cert_path_id: string | null;
  certification_id: string | null;
  assignment_status: string;
  assigned_at: string;
  due_at: string | null;
  completed_at: string | null;
  last_engaged_at: string;
  status_group: "in_progress" | "not_started" | "completed";
  name: string;
  description: string | null;
  thumbnail_asset_id: string | null;
  estimated_minutes: number | null;
  instrument_codes: string[];
  recommended_next: RecommendedNext | null;
  curriculum: Record<string, unknown>;
  modules: unknown[];
}

interface ModuleAssignment {
  assignment_id: string;
  module_id: string;
  source: string;
  source_reference_id: string | null;
  assignment_status: string;
  assigned_at: string;
  due_at: string | null;
  completed_at: string | null;
  last_engaged_at: string;
  status_group: "in_progress" | "not_started" | "completed";
  name: string;
  description: string | null;
  thumbnail_asset_id: string | null;
  estimated_minutes: number | null;
  recommended_next: RecommendedNext | null;
  module: Record<string, unknown>;
  items: unknown[];
  module_completion: unknown | null;
}

type EntityType = "cert_path" | "curriculum" | "module";

interface ResumeItem {
  entity_type: EntityType;
  entity_id: string;
  name: string;
  thumbnail_asset_id: string | null;
  status_group: "in_progress" | "not_started" | "completed";
  last_engaged_at: string;
}

interface AssignedCertPath {
  cert_path_id: string;
  name: string;
  description: string | null;
  thumbnail_asset_id: string | null;
  instrument_codes: string[];
  status_group: "in_progress" | "not_started" | "completed";
  last_engaged_at: string;
}

interface AssignedCurriculum {
  curriculum_id: string;
  slug: string;
  name: string;
  description: string | null;
  mode: string;
  estimated_minutes: number | null;
  thumbnail_asset_id: string | null;
  cert_path_id: string | null;
  status_group: "in_progress" | "not_started" | "completed";
  last_engaged_at: string;
}

interface AssignedModule {
  module_id: string;
  slug: string;
  name: string;
  description: string | null;
  estimated_minutes: number | null;
  thumbnail_asset_id: string | null;
  status_group: "in_progress" | "not_started" | "completed";
  last_engaged_at: string;
  is_direct_assignment: boolean;
}

interface UserLearningState {
  user_id: string;
  viewer_role: "self" | "mentor" | "super_admin";
  generated_at: string;
  assignments: LearningAssignment[];
  module_assignments: ModuleAssignment[];
  certifications: unknown[];
  mentor_relationships: unknown[];
  resume: ResumeItem[];
  assigned_cert_paths: AssignedCertPath[];
  assigned_curricula: AssignedCurriculum[];
  assigned_modules: AssignedModule[];
}

interface LearningFolder {
  folder_id: string;
  parent_folder_id: string | null;
  name: string;
  slug: string;
  display_order: number;
}

interface FolderItem {
  folder_id: string;
  entity_type: EntityType;
  entity_id: string;
  slug: string;
  name: string;
  description: string | null;
  thumbnail_asset_id: string | null;
  estimated_minutes: number | null;
  cert_instrument_ids: string[];
  is_self_enrollable: boolean;
  self_enroll_price_cents: number | null;
  self_enroll_currency: string | null;
  enrollment_status: string;
  is_accessible: boolean;
}

interface AvailableLearning {
  cert_paths: any[];
  standalone_curricula: any[];
  standalone_modules: any[];
  folders: LearningFolder[];
  folder_items: FolderItem[];
}

const STATUS_GROUP_ORDER = ["in_progress", "not_started", "completed"] as const;

function sortByStatusGroup<T extends { status_group?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ai = STATUS_GROUP_ORDER.indexOf((a.status_group ?? "not_started") as any);
    const bi = STATUS_GROUP_ORDER.indexOf((b.status_group ?? "not_started") as any);
    return ai - bi;
  });
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

function computeRecommendedNextLabel(entity: any): string | null {
  if (entity.status_group === "completed" || !entity.recommended_next) return null;
  const title =
    entity.recommended_next.content_item_title ?? entity.recommended_next.module_name;
  if (!title) return null;
  const verb = entity.status_group === "in_progress" ? "Continue with" : "Start with";
  return `${verb}: ${title}`;
}

function normalizeBrowse(raw: any, t: EntityType): any {
  const id =
    raw.cert_path_id ?? raw.curriculum_id ?? raw.module_id ?? raw.entity_id;
  const idField =
    t === "cert_path"
      ? "cert_path_id"
      : t === "curriculum"
      ? "curriculum_id"
      : "module_id";
  return {
    ...raw,
    [idField]: id,
    instrument_codes: raw.cert_instrument_ids ?? raw.instrument_codes ?? [],
  };
}

interface SectionProps {
  title: string;
  items: any[];
  emptyText: string;
  filteredEmptyText: string;
  isFiltered: boolean;
  entityType: EntityType;
  view: "enrolled" | "all_available";
  thumbnailMap: Map<string, ThumbnailMeta> | undefined;
  enrollingId: string | null;
  onTileClick: (entity: any, t: EntityType) => void;
  onEnroll: (entity: any, t: EntityType) => void;
  /** When true, render nothing if items is empty (no dashed empty box). */
  hideWhenEmpty?: boolean;
}

function Section({
  title,
  items,
  emptyText,
  filteredEmptyText,
  isFiltered,
  entityType,
  view,
  thumbnailMap,
  enrollingId,
  onTileClick,
  onEnroll,
  hideWhenEmpty = false,
}: SectionProps) {
  if (items.length === 0 && hideWhenEmpty) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {isFiltered ? filteredEmptyText : emptyText}
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
                    ? thumbnailMap?.get(entity.thumbnail_asset_id)?.url ?? null
                    : null
                }
                status={status}
                estimatedMinutes={entity.estimated_minutes ?? null}
                instrumentCodes={
                  entityType === "cert_path"
                    ? ((entity.instrument_codes ?? []) as InstrumentCode[])
                    : undefined
                }
                recommendedNextLabel={computeRecommendedNextLabel(entity)}
                locked={entity.is_accessible === false}
                onClick={() => onTileClick(entity, entityType)}
                inlineCtaLabel={showEnroll ? "Enroll" : undefined}
                onInlineCtaClick={
                  showEnroll ? () => onEnroll(entity, entityType) : undefined
                }
                inlineCtaLoading={showEnroll && enrollingId === id}
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
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [upgradeState, setUpgradeState] = useState<{
    open: boolean;
    entityType: UpgradeEntityType | null;
    entityName: string | null;
  }>({ open: false, entityType: null, entityName: null });
  const [paidNudgeState, setPaidNudgeState] = useState<{
    open: boolean;
    entityName: string | null;
    priceCents: number | null;
  }>({ open: false, entityName: null, priceCents: null });

  const learningQuery = useQuery({
    queryKey: ["get_user_learning_state", userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserLearningState> => {
      const { data, error } = await supabase.rpc("get_user_learning_state" as never, {
        p_user_id: userId,
      } as never);
      if (error) throw error;
      return data as unknown as UserLearningState;
    },
  });

  const availableQuery = useQuery({
    queryKey: ["list_available_learning", userId],
    enabled: !!userId,
    queryFn: async (): Promise<AvailableLearning> => {
      const { data, error } = await supabase.rpc("list_available_learning" as never, {
        p_user_id: userId,
      } as never);
      if (error) throw error;
      return data as unknown as AvailableLearning;
    },
  });

  // Reset folder drill-down when leaving Browse, or when the available
  // data set changes identity.
  useEffect(() => {
    if (view !== "all_available") setCurrentFolderId(null);
  }, [view]);
  useEffect(() => {
    setCurrentFolderId(null);
  }, [availableQuery.data]);

  // Smart default: empty Assigned => default to Browse & Enroll.
  useEffect(() => {
    if (viewInitialized) return;
    const ls = learningQuery.data;
    if (!ls) return;
    const ac = ls.assigned_cert_paths ?? [];
    const acu = ls.assigned_curricula ?? [];
    const am = ls.assigned_modules ?? [];
    if (ac.length === 0 && acu.length === 0 && am.length === 0) {
      setView("all_available");
    }
    setViewInitialized(true);
  }, [learningQuery.data, viewInitialized]);

  const assignedSections = useMemo(() => {
    const ls = learningQuery.data;
    return {
      certPaths: sortByStatusGroup(ls?.assigned_cert_paths ?? []) as any[],
      standaloneCurricula: sortByStatusGroup(ls?.assigned_curricula ?? []) as any[],
      standaloneModules: sortByStatusGroup(ls?.assigned_modules ?? []) as any[],
    };
  }, [learningQuery.data]);

  // ---- Browse view: folders + items derivation ----
  const folders = useMemo<LearningFolder[]>(
    () => availableQuery.data?.folders ?? [],
    [availableQuery.data],
  );
  const folderItems = useMemo<FolderItem[]>(
    () => availableQuery.data?.folder_items ?? [],
    [availableQuery.data],
  );

  const folderById = useMemo(
    () => new Map<string, LearningFolder>(folders.map((f) => [f.folder_id, f])),
    [folders],
  );

  const childrenOf = (parentId: string | null): LearningFolder[] =>
    folders
      .filter((f) => f.parent_folder_id === parentId)
      .sort(
        (a, b) =>
          a.display_order - b.display_order || a.name.localeCompare(b.name),
      );

  const subtreeItemCount = (folderId: string): number => {
    let count = 0;
    for (const fi of folderItems) {
      if (fi.folder_id === folderId) count += 1;
    }
    for (const child of folders.filter((f) => f.parent_folder_id === folderId)) {
      count += subtreeItemCount(child.folder_id);
    }
    return count;
  };

  const breadcrumbs = useMemo<LearningFolder[]>(() => {
    if (!currentFolderId) return [];
    const chain: LearningFolder[] = [];
    let cursor: string | null = currentFolderId;
    const guard = new Set<string>();
    while (cursor) {
      if (guard.has(cursor)) break;
      guard.add(cursor);
      const node = folderById.get(cursor);
      if (!node) break;
      chain.push(node);
      cursor = node.parent_folder_id;
    }
    return chain.reverse();
  }, [currentFolderId, folderById]);

  const isFiltered = search.trim().length > 0;

  const browseSections = useMemo(() => {
    const av = availableQuery.data;
    const rootCertPaths = (av?.cert_paths ?? []).map((r) => normalizeBrowse(r, "cert_path"));
    const rootCurricula = (av?.standalone_curricula ?? []).map((r) =>
      normalizeBrowse(r, "curriculum"),
    );
    const rootModules = (av?.standalone_modules ?? []).map((r) =>
      normalizeBrowse(r, "module"),
    );

    if (isFiltered) {
      // Flatten root + all folder items by type.
      const certs = [
        ...rootCertPaths,
        ...folderItems
          .filter((fi) => fi.entity_type === "cert_path")
          .map((fi) => normalizeBrowse(fi, "cert_path")),
      ];
      const curr = [
        ...rootCurricula,
        ...folderItems
          .filter((fi) => fi.entity_type === "curriculum")
          .map((fi) => normalizeBrowse(fi, "curriculum")),
      ];
      const mods = [
        ...rootModules,
        ...folderItems
          .filter((fi) => fi.entity_type === "module")
          .map((fi) => normalizeBrowse(fi, "module")),
      ];
      return { certPaths: certs, standaloneCurricula: curr, standaloneModules: mods };
    }

    if (currentFolderId === null) {
      return {
        certPaths: rootCertPaths,
        standaloneCurricula: rootCurricula,
        standaloneModules: rootModules,
      };
    }

    const here = folderItems.filter((fi) => fi.folder_id === currentFolderId);
    return {
      certPaths: here
        .filter((fi) => fi.entity_type === "cert_path")
        .map((fi) => normalizeBrowse(fi, "cert_path")),
      standaloneCurricula: here
        .filter((fi) => fi.entity_type === "curriculum")
        .map((fi) => normalizeBrowse(fi, "curriculum")),
      standaloneModules: here
        .filter((fi) => fi.entity_type === "module")
        .map((fi) => normalizeBrowse(fi, "module")),
    };
  }, [availableQuery.data, folderItems, currentFolderId, isFiltered]);

  const filterBySearch = (items: any[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = `${it.name ?? ""} ${it.description ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  };

  const visibleSections = useMemo(() => {
    const src = view === "enrolled" ? assignedSections : browseSections;
    return {
      certPaths: filterBySearch(src.certPaths),
      standaloneCurricula: filterBySearch(src.standaloneCurricula),
      standaloneModules: filterBySearch(src.standaloneModules),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, assignedSections, browseSections, search]);

  const levelSubfolders = view === "all_available" && !isFiltered ? childrenOf(currentFolderId) : [];

  // Collect entity ids per tier so we can call the SECURITY DEFINER tier
  // thumbnail RPC for each type. Items missing thumbnail_asset_id are
  // skipped (no point asking the RPC for them).
  const certPathIds = useMemo(
    () =>
      Array.from(
        new Set(
          visibleSections.certPaths
            .filter((e) => e?.thumbnail_asset_id)
            .map((e) => e.cert_path_id)
            .filter((id): id is string => typeof id === "string"),
        ),
      ).sort(),
    [visibleSections.certPaths],
  );
  const curriculumIds = useMemo(
    () =>
      Array.from(
        new Set(
          visibleSections.standaloneCurricula
            .filter((e) => e?.thumbnail_asset_id)
            .map((e) => e.curriculum_id)
            .filter((id): id is string => typeof id === "string"),
        ),
      ).sort(),
    [visibleSections.standaloneCurricula],
  );
  const moduleIds = useMemo(
    () =>
      Array.from(
        new Set(
          visibleSections.standaloneModules
            .filter((e) => e?.thumbnail_asset_id)
            .map((e) => e.module_id)
            .filter((id): id is string => typeof id === "string"),
        ),
      ).sort(),
    [visibleSections.standaloneModules],
  );

  const certPathThumbQuery = useQuery({
    queryKey: ["tier-thumb", "cert_path", certPathIds],
    queryFn: () => resolveTierThumbnailUrls("cert_path", certPathIds),
    enabled: certPathIds.length > 0,
  });
  const curriculumThumbQuery = useQuery({
    queryKey: ["tier-thumb", "curriculum", curriculumIds],
    queryFn: () => resolveTierThumbnailUrls("curriculum", curriculumIds),
    enabled: curriculumIds.length > 0,
  });
  const moduleThumbQuery = useQuery({
    queryKey: ["tier-thumb", "module", moduleIds],
    queryFn: () => resolveTierThumbnailUrls("module", moduleIds),
    enabled: moduleIds.length > 0,
  });

  // Re-index Map<entity_id, url> → Map<thumbnail_asset_id, ThumbnailMeta>
  // so the existing Section component keeps reading
  // `thumbnailMap?.get(entity.thumbnail_asset_id)?.url` unchanged.
  const thumbnailMap = useMemo(() => {
    const out = new Map<string, ThumbnailMeta>();
    const fold = (entities: any[], urlMap: Map<string, string> | undefined, idKey: string) => {
      if (!urlMap) return;
      for (const e of entities) {
        const url = urlMap.get(e?.[idKey]);
        if (url && e?.thumbnail_asset_id) {
          out.set(e.thumbnail_asset_id, { url, dominantColor: null });
        }
      }
    };
    fold(visibleSections.certPaths, certPathThumbQuery.data, "cert_path_id");
    fold(visibleSections.standaloneCurricula, curriculumThumbQuery.data, "curriculum_id");
    fold(visibleSections.standaloneModules, moduleThumbQuery.data, "module_id");
    return out;
  }, [
    visibleSections,
    certPathThumbQuery.data,
    curriculumThumbQuery.data,
    moduleThumbQuery.data,
  ]);

  // ---- Resume strip thumbnails (independent of section logic) ----
  const resume = useMemo<ResumeItem[]>(
    () => (learningQuery.data?.resume ?? []).slice(0, 3),
    [learningQuery.data],
  );
  const resumeIdsByType = useMemo(() => {
    const out: Record<EntityType, string[]> = {
      cert_path: [],
      curriculum: [],
      module: [],
    };
    for (const it of resume) {
      if (it.thumbnail_asset_id) out[it.entity_type].push(it.entity_id);
    }
    (Object.keys(out) as EntityType[]).forEach((k) => {
      out[k] = Array.from(new Set(out[k])).sort();
    });
    return out;
  }, [resume]);

  const resumeCertThumbQuery = useQuery({
    queryKey: ["tier-thumb", "cert_path", "resume", resumeIdsByType.cert_path],
    queryFn: () => resolveTierThumbnailUrls("cert_path", resumeIdsByType.cert_path),
    enabled: resumeIdsByType.cert_path.length > 0,
  });
  const resumeCurriculumThumbQuery = useQuery({
    queryKey: ["tier-thumb", "curriculum", "resume", resumeIdsByType.curriculum],
    queryFn: () => resolveTierThumbnailUrls("curriculum", resumeIdsByType.curriculum),
    enabled: resumeIdsByType.curriculum.length > 0,
  });
  const resumeModuleThumbQuery = useQuery({
    queryKey: ["tier-thumb", "module", "resume", resumeIdsByType.module],
    queryFn: () => resolveTierThumbnailUrls("module", resumeIdsByType.module),
    enabled: resumeIdsByType.module.length > 0,
  });

  const resumeThumbnailMap = useMemo(() => {
    const out = new Map<string, string>();
    const fold = (items: ResumeItem[], urlMap: Map<string, string> | undefined) => {
      if (!urlMap) return;
      for (const it of items) {
        const url = urlMap.get(it.entity_id);
        if (url && it.thumbnail_asset_id) out.set(it.thumbnail_asset_id, url);
      }
    };
    fold(
      resume.filter((r) => r.entity_type === "cert_path"),
      resumeCertThumbQuery.data,
    );
    fold(
      resume.filter((r) => r.entity_type === "curriculum"),
      resumeCurriculumThumbQuery.data,
    );
    fold(
      resume.filter((r) => r.entity_type === "module"),
      resumeModuleThumbQuery.data,
    );
    return out;
  }, [
    resume,
    resumeCertThumbQuery.data,
    resumeCurriculumThumbQuery.data,
    resumeModuleThumbQuery.data,
  ]);

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
    const id = entityIdOf(entity, t);
    if (enrollingId === id) return;
    setEnrollingId(id);
    try {
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
        const cents = (data as any).price_cents ?? null;
        setPaidNudgeState({
          open: true,
          entityName: entity.name ?? null,
          priceCents: cents,
        });
        return;
      }

      toast({
        title: "Enrolled!",
        description: `You're enrolled in ${entity.name}.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["get_user_learning_state"] });
      await queryClient.invalidateQueries({ queryKey: ["list_available_learning"] });
    } finally {
      setEnrollingId(null);
    }
  };

  // Render order, exact: !userId → error → loading → !hasAnyContent welcome → normal.

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

  if (learningQuery.isError || availableQuery.isError) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <h2 className="text-base font-semibold">Couldn't load your learning content</h2>
          <p className="text-sm text-muted-foreground">
            We hit an error fetching your enrollments. Please try again.
          </p>
          <Button
            size="sm"
            onClick={() => {
              learningQuery.refetch();
              availableQuery.refetch();
            }}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isLoading = learningQuery.isLoading || availableQuery.isLoading;
  if (isLoading) {
    return (
      <div
        className="flex min-h-[30vh] items-center justify-center"
        role="status"
        aria-label="Loading your learning content"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  const hasAnyContent =
    assignedSections.certPaths.length > 0 ||
    assignedSections.standaloneCurricula.length > 0 ||
    assignedSections.standaloneModules.length > 0 ||
    (availableQuery.data?.cert_paths?.length ?? 0) > 0 ||
    (availableQuery.data?.standalone_curricula?.length ?? 0) > 0 ||
    (availableQuery.data?.standalone_modules?.length ?? 0) > 0 ||
    folderItems.length > 0;

  if (!hasAnyContent) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <h2 className="text-base font-semibold">Welcome to BrainWise Learning</h2>
          <p className="text-sm text-muted-foreground">
            Your learning content will appear here once you're assigned a certification path,
            curriculum, or module. Check back soon, or contact your BrainWise admin if you expect
            to see content here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const searchQuoted = `"${search.trim()}"`;
  const filteredEmptyFor = (title: string) =>
    `No ${title.toLowerCase()} match ${searchQuoted}.`;

  const browseHasAnyVisibleItems =
    visibleSections.certPaths.length > 0 ||
    visibleSections.standaloneCurricula.length > 0 ||
    visibleSections.standaloneModules.length > 0;

  return (
    <div className="space-y-6">
      {resume.length > 0 && !isFiltered && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Where you left off</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {resume.map((item) => (
              <Tile
                key={`resume-${item.entity_type}-${item.entity_id}`}
                variant={item.entity_type}
                name={item.name}
                thumbnailUrl={
                  item.thumbnail_asset_id
                    ? resumeThumbnailMap.get(item.thumbnail_asset_id) ?? null
                    : null
                }
                status={enrolledStatusToCompletionStatus(item.status_group)}
                onClick={() =>
                  navigate(detailRouteFor(item.entity_type, item.entity_id))
                }
              />
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === "enrolled" ? "default" : "outline"}
            onClick={() => setView("enrolled")}
          >
            Assigned
          </Button>
          <Button
            size="sm"
            variant={view === "all_available" ? "default" : "outline"}
            onClick={() => setView("all_available")}
          >
            Browse & Enroll
          </Button>
        </div>
        <div className="relative max-w-md flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            aria-label="Search learning content"
            className="pl-9"
          />
        </div>
      </div>

      {view === "enrolled" ? (
        <>
          <Section
            title="Certification Paths"
            items={visibleSections.certPaths}
            emptyText="You're not assigned any certification paths yet. Browse & Enroll to explore."
            filteredEmptyText={filteredEmptyFor("Certification Paths")}
            isFiltered={isFiltered}
            entityType="cert_path"
            view={view}
            thumbnailMap={thumbnailMap}
            enrollingId={enrollingId}
            onTileClick={handleTileClick}
            onEnroll={handleEnrollClick}
          />
          <Section
            title="Curricula"
            items={visibleSections.standaloneCurricula}
            emptyText="No assigned curricula. Browse & Enroll to find one."
            filteredEmptyText={filteredEmptyFor("Curricula")}
            isFiltered={isFiltered}
            entityType="curriculum"
            view={view}
            thumbnailMap={thumbnailMap}
            enrollingId={enrollingId}
            onTileClick={handleTileClick}
            onEnroll={handleEnrollClick}
          />
          <Section
            title="Modules"
            items={visibleSections.standaloneModules}
            emptyText="No assigned modules. Browse & Enroll to find one."
            filteredEmptyText={filteredEmptyFor("Modules")}
            isFiltered={isFiltered}
            entityType="module"
            view={view}
            thumbnailMap={thumbnailMap}
            enrollingId={enrollingId}
            onTileClick={handleTileClick}
            onEnroll={handleEnrollClick}
          />
        </>
      ) : (
        <>
          {!isFiltered && breadcrumbs.length > 0 && (
            <nav
              aria-label="Folder breadcrumb"
              className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
            >
              <button
                type="button"
                onClick={() => setCurrentFolderId(null)}
                className="hover:text-foreground hover:underline"
              >
                All
              </button>
              {breadcrumbs.map((f, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <span key={f.folder_id} className="flex items-center gap-1">
                    <ChevronRight className="h-3.5 w-3.5" />
                    {isLast ? (
                      <span className="text-foreground font-medium">{f.name}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCurrentFolderId(f.folder_id)}
                        className="hover:text-foreground hover:underline"
                      >
                        {f.name}
                      </button>
                    )}
                  </span>
                );
              })}
            </nav>
          )}

          {!isFiltered && levelSubfolders.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {levelSubfolders.map((f) => {
                const count = subtreeItemCount(f.folder_id);
                return (
                  <button
                    key={f.folder_id}
                    type="button"
                    onClick={() => setCurrentFolderId(f.folder_id)}
                    className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent hover:border-accent-foreground/20"
                  >
                    <Folder className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {f.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {count} {count === 1 ? "item" : "items"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {isFiltered && !browseHasAnyVisibleItems ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No learning content matches your search.
            </div>
          ) : !isFiltered &&
            currentFolderId !== null &&
            !browseHasAnyVisibleItems &&
            levelSubfolders.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              This folder is empty.
            </div>
          ) : (
            <>
              <Section
                title="Certification Paths"
                items={visibleSections.certPaths}
                emptyText=""
                filteredEmptyText=""
                isFiltered={isFiltered}
                entityType="cert_path"
                view={view}
                thumbnailMap={thumbnailMap}
                enrollingId={enrollingId}
                onTileClick={handleTileClick}
                onEnroll={handleEnrollClick}
                hideWhenEmpty
              />
              <Section
                title="Curricula"
                items={visibleSections.standaloneCurricula}
                emptyText=""
                filteredEmptyText=""
                isFiltered={isFiltered}
                entityType="curriculum"
                view={view}
                thumbnailMap={thumbnailMap}
                enrollingId={enrollingId}
                onTileClick={handleTileClick}
                onEnroll={handleEnrollClick}
                hideWhenEmpty
              />
              <Section
                title="Modules"
                items={visibleSections.standaloneModules}
                emptyText=""
                filteredEmptyText=""
                isFiltered={isFiltered}
                entityType="module"
                view={view}
                thumbnailMap={thumbnailMap}
                enrollingId={enrollingId}
                onTileClick={handleTileClick}
                onEnroll={handleEnrollClick}
                hideWhenEmpty
              />
            </>
          )}
        </>
      )}

      <UpgradeNudgeModal
        open={upgradeState.open}
        onOpenChange={(open) => setUpgradeState((s) => ({ ...s, open }))}
        entityType={upgradeState.entityType}
        entityName={upgradeState.entityName}
      />

      <PaidEnrollmentNudgeModal
        open={paidNudgeState.open}
        onOpenChange={(open) =>
          setPaidNudgeState((s) => ({ ...s, open }))
        }
        entityName={paidNudgeState.entityName}
        priceCents={paidNudgeState.priceCents}
      />
    </div>
  );
}
