import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ContentItemArtifactPanel from "./ContentItemArtifactPanel";
import type { MarkTarget } from "./learning-tree-types";

const CERT_LABELS: Record<string, string> = {
  ptp_coach: "PTP Certified Coach",
  ai_transformation_coach: "AI Transformation Certified Coach",
  ai_transformation_ptp_coach: "AI Transformation + PTP Certified Coach",
  my_brainwise_coach: "My BrainWise Coach",
};

type Status = string | null | undefined;

function statusBadgeClass(status: Status): string {
  switch (status) {
    case "active":
    case "in_progress":
      return "bg-amber-100 text-amber-900 hover:bg-amber-100 border-transparent dark:bg-amber-900/30 dark:text-amber-200";
    case "completed":
      return "bg-emerald-100 text-emerald-900 hover:bg-emerald-100 border-transparent dark:bg-emerald-900/30 dark:text-emerald-200";
    case "certified":
      return "bg-purple-100 text-purple-900 hover:bg-purple-100 border-transparent dark:bg-purple-900/30 dark:text-purple-200";
    case "revoked":
      return "bg-destructive/10 text-destructive border-transparent";
    case "submitted_for_review":
      return "bg-blue-100 text-blue-900 hover:bg-blue-100 border-transparent dark:bg-blue-900/30 dark:text-blue-200";
    case "revision_requested":
      return "bg-orange-100 text-orange-900 hover:bg-orange-100 border-transparent dark:bg-orange-900/30 dark:text-orange-200";
    case "not_started":
    default:
      return "bg-muted text-muted-foreground hover:bg-muted border-transparent";
  }
}

function statusLabel(status: Status): string {
  if (!status) return "Not started";
  return status
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function StatusPill({ status }: { status: Status }) {
  return <Badge className={cn("text-[10px] font-medium", statusBadgeClass(status))}>{statusLabel(status)}</Badge>;
}

interface Props {
  userId: string;
  isImpersonating: boolean;
  onMark: (t: MarkTarget) => void;
}

interface CertGroup {
  certification_id: string | null;
  cert_path_id: string;
  label: string;
  status: Status;
  assignments: any[];
}

export default function AdminLearningTree({ userId, isImpersonating, onMark }: Props) {
  const stateQuery = useQuery({
    queryKey: ["get_user_learning_state", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_learning_state", {
        p_user_id: userId,
      });
      if (error) throw error;
      return data as any;
    },
  });

  const learningState = stateQuery.data;

  const assignments: any[] = Array.isArray(learningState?.assignments) ? learningState.assignments : [];
  const moduleAssignments: any[] = Array.isArray(learningState?.module_assignments)
    ? learningState.module_assignments
    : [];
  const certifications: any[] = Array.isArray(learningState?.certifications)
    ? learningState.certifications
    : [];

  const { certGroups, directCurricula } = useMemo(() => {
    const groups = new Map<string, CertGroup>();
    const direct: any[] = [];
    for (const a of assignments) {
      if (a?.cert_path_id) {
        const key = a.cert_path_id as string;
        if (!groups.has(key)) {
          const certMatch = certifications.find((c) => c?.certification_id === a.certification_id);
          const certType = certMatch?.certification_type ?? null;
          groups.set(key, {
            certification_id: a.certification_id ?? null,
            cert_path_id: key,
            label: (certType && CERT_LABELS[certType]) || certType || "Certification Path",
            status: certMatch?.status ?? null,
            assignments: [],
          });
        }
        groups.get(key)!.assignments.push(a);
      } else {
        direct.push(a);
      }
    }
    return { certGroups: Array.from(groups.values()), directCurricula: direct };
  }, [assignments, certifications]);

  // Certifications that exist with no curriculum assignments (still show so admin can grant/revoke).
  const orphanCerts = useMemo(() => {
    const usedIds = new Set(certGroups.map((g) => g.certification_id).filter(Boolean));
    return certifications.filter((c) => !usedIds.has(c?.certification_id));
  }, [certGroups, certifications]);

  if (stateQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading learning state…
      </div>
    );
  }
  if (stateQuery.error) {
    return <div className="text-sm text-destructive py-6">Failed to load: {(stateQuery.error as Error).message}</div>;
  }

  const hasAnything =
    certGroups.length > 0 ||
    directCurricula.length > 0 ||
    moduleAssignments.length > 0 ||
    orphanCerts.length > 0;

  if (!hasAnything) {
    return <div className="text-sm text-muted-foreground py-6 text-center">This learner has no assigned learning.</div>;
  }

  return (
    <div className="space-y-6">
      {certGroups.map((g) => (
        <CertPathNode
          key={g.cert_path_id}
          group={g}
          userId={userId}
          isImpersonating={isImpersonating}
          onMark={onMark}
        />
      ))}

      {orphanCerts.map((c) => (
        <CertOnlyNode key={c.certification_id} cert={c} isImpersonating={isImpersonating} onMark={onMark} />
      ))}

      {directCurricula.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Directly Assigned Curricula</h3>
          <div className="space-y-3 pl-2 border-l border-border">
            {directCurricula.map((a) => (
              <CurriculumNode
                key={a.assignment_id}
                assignment={a}
                userId={userId}
                isImpersonating={isImpersonating}
                onMark={onMark}
              />
            ))}
          </div>
        </section>
      )}

      {moduleAssignments.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Directly Assigned Modules</h3>
          <div className="space-y-3 pl-2 border-l border-border">
            {moduleAssignments.map((m) => (
              <ModuleNode
                key={m.assignment_id ?? m.module_id}
                module={m}
                userId={userId}
                isImpersonating={isImpersonating}
                onMark={onMark}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------- nodes ----------

function CertPathNode({
  group,
  userId,
  isImpersonating,
  onMark,
}: {
  group: CertGroup;
  userId: string;
  isImpersonating: boolean;
  onMark: (t: MarkTarget) => void;
}) {
  const [open, setOpen] = useState(false);
  const status = group.status;
  // Action: certified -> revoke; in_progress -> grant; revoked -> badge only.
  const showAction = status !== "revoked" && group.certification_id;
  const grant = status !== "certified";
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <h3 className="text-sm font-semibold">{group.label}</h3>
        <StatusPill status={status} />
        {showAction && (
          <Button
            size="sm"
            variant={grant ? "default" : "outline"}
            className="ml-auto"
            disabled={isImpersonating}
            onClick={() =>
              onMark({
                tier: "cert_path",
                entityName: group.label,
                certificationId: group.certification_id!,
                userId,
                complete: grant,
              })
            }
          >
            {grant ? "Grant certification" : "Revoke certification"}
          </Button>
        )}
      </div>
      {open && (
        <div className="space-y-3 pl-4 border-l border-border">
          {group.assignments.map((a) => (
            <CurriculumNode
              key={a.assignment_id}
              assignment={a}
              userId={userId}
              isImpersonating={isImpersonating}
              onMark={onMark}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CertOnlyNode({
  cert,
  isImpersonating,
  onMark,
}: {
  cert: any;
  isImpersonating: boolean;
  onMark: (t: MarkTarget) => void;
}) {
  const label = CERT_LABELS[cert.certification_type] ?? cert.certification_type ?? "Certification";
  const status = cert.status;
  const showAction = status !== "revoked";
  const grant = status !== "certified";
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{label}</h3>
        <StatusPill status={status} />
        {showAction && (
          <Button
            size="sm"
            variant={grant ? "default" : "outline"}
            className="ml-auto"
            disabled={isImpersonating}
            onClick={() =>
              onMark({
                tier: "cert_path",
                entityName: label,
                certificationId: cert.certification_id,
                userId: cert.user_id ?? "",
                complete: grant,
              })
            }
          >
            {grant ? "Grant certification" : "Revoke certification"}
          </Button>
        )}
      </div>
    </section>
  );
}

function CurriculumNode({
  assignment,
  userId,
  isImpersonating,
  onMark,
}: {
  assignment: any;
  userId: string;
  isImpersonating: boolean;
  onMark: (t: MarkTarget) => void;
}) {
  const [open, setOpen] = useState(false);
  const name = assignment?.curriculum?.name ?? "Untitled Curriculum";
  const status = assignment?.assignment_status as Status;
  const isComplete = status === "completed";
  const modules: any[] = Array.isArray(assignment?.modules) ? assignment.modules : [];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="text-sm font-medium">{name}</span>
        <StatusPill status={status} />
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          disabled={isImpersonating}
          onClick={() =>
            onMark({
              tier: "curriculum",
              entityName: name,
              assignmentId: assignment.assignment_id,
              userId,
              complete: !isComplete,
            })
          }
        >
          {isComplete ? "Mark incomplete" : "Mark complete"}
        </Button>
      </div>
      {open && modules.length > 0 && (
        <div className="space-y-2 pl-4 border-l border-border">
          {modules.map((m) => (
            <ModuleNode
              key={m.module_id}
              module={m}
              userId={userId}
              isImpersonating={isImpersonating}
              onMark={onMark}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleNode({
  module: mod,
  userId,
  isImpersonating,
  onMark,
}: {
  module: any;
  userId: string;
  isImpersonating: boolean;
  onMark: (t: MarkTarget) => void;
}) {
  const [open, setOpen] = useState(false);
  const items: any[] = Array.isArray(mod?.items) ? mod.items : [];
  const status = mod?.module_completion?.status ?? "not_started";
  const isComplete = status === "completed";
  const name = mod?.name ?? mod?.module?.name ?? "Untitled Module";
  const moduleId = mod?.module_id;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="text-sm">{name}</span>
        <StatusPill status={status} />
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          disabled={isImpersonating || !moduleId}
          onClick={() =>
            onMark({
              tier: "module",
              entityName: name,
              moduleId,
              userId,
              complete: !isComplete,
            })
          }
        >
          {isComplete ? "Mark incomplete" : "Mark complete"}
        </Button>
      </div>
      {open && items.length > 0 && (
        <div className="space-y-1 pl-4 border-l border-border">
          {items.map((it) => (
            <ItemNode
              key={it.content_item_id}
              item={it}
              userId={userId}
              isImpersonating={isImpersonating}
              onMark={onMark}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemNode({
  item,
  userId,
  isImpersonating,
  onMark,
}: {
  item: any;
  userId: string;
  isImpersonating: boolean;
  onMark: (t: MarkTarget) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = item?.completion?.status ?? "not_started";
  const isComplete = status === "completed";
  const title = item?.title ?? "Untitled";
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 py-1">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex items-center"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="text-sm text-muted-foreground">{title}</span>
        <StatusPill status={status} />
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          disabled={isImpersonating}
          onClick={() =>
            onMark({
              tier: "content_item",
              entityName: title,
              contentItemId: item.content_item_id,
              userId,
              complete: !isComplete,
            })
          }
        >
          {isComplete ? "Mark incomplete" : "Mark complete"}
        </Button>
      </div>
      {expanded && <ContentItemArtifactPanel item={item} userId={userId} />}
    </div>
  );
}
