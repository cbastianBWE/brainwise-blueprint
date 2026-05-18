import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CERT_LABELS: Record<string, string> = {
  ptp_coach: "PTP Certified Coach",
  ai_transformation_coach: "AI Transformation Certified Coach",
  ai_transformation_ptp_coach: "AI Transformation + PTP Certified Coach",
  my_brainwise_coach: "My BrainWise Coach",
};

type Status = string | null | undefined;

const REVIEW_ITEM_TYPES = new Set(["skills_practice", "live_event", "written_summary"]);

function statusBadgeClass(status: Status): string {
  switch (status) {
    case "in_progress":
      return "bg-amber-100 text-amber-900 hover:bg-amber-100 border-transparent dark:bg-amber-900/30 dark:text-amber-200";
    case "completed":
      return "bg-emerald-100 text-emerald-900 hover:bg-emerald-100 border-transparent dark:bg-emerald-900/30 dark:text-emerald-200";
    case "certified":
      return "bg-purple-100 text-purple-900 hover:bg-purple-100 border-transparent dark:bg-purple-900/30 dark:text-purple-200";
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

function needsReview(item: any): boolean {
  const s = item?.completion?.status;
  if (s === "revision_requested") return true;
  if (REVIEW_ITEM_TYPES.has(item?.item_type) && s === "in_progress") return true;
  return false;
}

export interface MentorProgressTreeProps {
  learningState: any;
  onItemClick?: (contentItemId: string, itemType: string) => void;
}

interface CertGroup {
  certification_id: string | null;
  cert_path_id: string;
  label: string;
  status: Status;
  assignments: any[];
}

export default function MentorProgressTree({ learningState, onItemClick }: MentorProgressTreeProps) {
  const assignments: any[] = Array.isArray(learningState?.assignments) ? learningState.assignments : [];
  const moduleAssignments: any[] = Array.isArray(learningState?.module_assignments)
    ? learningState.module_assignments
    : [];
  const certifications: any[] = Array.isArray(learningState?.certifications) ? learningState.certifications : [];

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

  const hasAnything =
    certGroups.length > 0 || directCurricula.length > 0 || moduleAssignments.length > 0;

  if (!hasAnything) {
    return (
      <div className="text-sm text-muted-foreground py-6 text-center">
        This learner has no assigned learning yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {certGroups.map((group) => (
        <CertPathNode key={group.cert_path_id} group={group} onItemClick={onItemClick} />
      ))}

      {directCurricula.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Directly Assigned Curricula</h3>
          <div className="space-y-3 pl-2 border-l border-border">
            {directCurricula.map((a) => (
              <CurriculumNode key={a.assignment_id} assignment={a} onItemClick={onItemClick} />
            ))}
          </div>
        </section>
      )}

      {moduleAssignments.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Directly Assigned Modules</h3>
          <div className="space-y-3 pl-2 border-l border-border">
            {moduleAssignments.map((m) => (
              <ModuleNode
                key={m.module_assignment_id ?? m.module_id}
                module={m}
                onItemClick={onItemClick}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CertPathNode({
  group,
  onItemClick,
}: {
  group: CertGroup;
  onItemClick?: MentorProgressTreeProps["onItemClick"];
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
        <StatusPill status={group.status} />
      </div>
      <div className="space-y-3 pl-4 border-l border-border">
        {group.assignments.map((a) => (
          <CurriculumNode key={a.assignment_id} assignment={a} onItemClick={onItemClick} />
        ))}
      </div>
    </section>
  );
}

function CurriculumNode({
  assignment,
  onItemClick,
}: {
  assignment: any;
  onItemClick?: MentorProgressTreeProps["onItemClick"];
}) {
  const name = assignment?.curriculum?.name ?? "Untitled Curriculum";
  const modules: any[] = Array.isArray(assignment?.modules) ? assignment.modules : [];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{name}</span>
        <StatusPill status={assignment?.status_group} />
      </div>
      {modules.length > 0 && (
        <div className="space-y-2 pl-4 border-l border-border">
          {modules.map((m) => (
            <ModuleNode key={m.module_id} module={m} onItemClick={onItemClick} />
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleNode({
  module: mod,
  onItemClick,
}: {
  module: any;
  onItemClick?: MentorProgressTreeProps["onItemClick"];
}) {
  const items: any[] = Array.isArray(mod?.items) ? mod.items : [];
  const status = mod?.module_completion?.status ?? "not_started";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">{mod?.name ?? "Untitled Module"}</span>
        <StatusPill status={status} />
      </div>
      {items.length > 0 && (
        <div className="space-y-1 pl-4 border-l border-border">
          {items.map((it) => (
            <ItemNode key={it.content_item_id} item={it} onItemClick={onItemClick} />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemNode({
  item,
  onItemClick,
}: {
  item: any;
  onItemClick?: MentorProgressTreeProps["onItemClick"];
}) {
  const status = item?.completion?.status ?? "not_started";
  const flagged = needsReview(item);
  const clickable = typeof onItemClick === "function";

  const content = (
    <div className="flex items-center gap-2 py-1">
      <span className="text-sm text-muted-foreground">{item?.title ?? "Untitled"}</span>
      <StatusPill status={status} />
      {flagged && (
        <Badge className="bg-orange-100 text-orange-900 hover:bg-orange-100 border-transparent text-[10px] dark:bg-orange-900/30 dark:text-orange-200">
          Needs review
        </Badge>
      )}
    </div>
  );

  if (clickable) {
    return (
      <button
        type="button"
        onClick={() => onItemClick!(item.content_item_id, item.item_type)}
        className="block w-full text-left rounded hover:bg-muted/50 px-1 transition-colors"
      >
        {content}
      </button>
    );
  }
  return <div className="px-1">{content}</div>;
}
