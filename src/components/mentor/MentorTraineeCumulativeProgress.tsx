import { useMemo } from "react";

interface Props {
  // The full payload returned by get_user_learning_state(p_user_id).
  // Passed in from MentorTraineeDetail's stateQuery.data.
  learningState: any;
}

interface CumulativeStats {
  totalItems: number;
  completedItems: number;
  revisionRequested: number;
  submittedForReview: number;
  skillsSignoffPending: number;
  lastEngagedAt: string | null;
  certificationCount: number;
  curriculumCount: number;
}

function computeStats(learningState: any): CumulativeStats {
  const assignments: any[] = Array.isArray(learningState?.assignments)
    ? learningState.assignments
    : [];
  const moduleAssignments: any[] = Array.isArray(learningState?.module_assignments)
    ? learningState.module_assignments
    : [];
  const certifications: any[] = Array.isArray(learningState?.certifications)
    ? learningState.certifications
    : [];

  let totalItems = 0;
  let completedItems = 0;
  let revisionRequested = 0;
  let submittedForReview = 0;
  let skillsSignoffPending = 0;
  let lastEngagedAt: string | null = null;

  const walkAssignment = (asg: any) => {
    if (asg?.last_engaged_at) {
      if (!lastEngagedAt || asg.last_engaged_at > lastEngagedAt) {
        lastEngagedAt = asg.last_engaged_at;
      }
    }
    const modules: any[] = Array.isArray(asg?.modules) ? asg.modules : [];
    for (const m of modules) {
      const items: any[] = Array.isArray(m?.items) ? m.items : [];
      for (const item of items) {
        totalItems += 1;
        const c = item?.completion;
        if (!c) continue;
        if (c.status === "completed") completedItems += 1;
        if (c.status === "revision_requested") revisionRequested += 1;
        if (c.status === "submitted_for_review") submittedForReview += 1;
        if (
          item.item_type === "skills_practice" &&
          c.skills_trainee_signed_off === true &&
          c.skills_mentor_signed_off === false
        ) {
          skillsSignoffPending += 1;
        }
      }
    }
  };

  for (const asg of assignments) walkAssignment(asg);
  for (const ma of moduleAssignments) walkAssignment(ma);

  return {
    totalItems,
    completedItems,
    revisionRequested,
    submittedForReview,
    skillsSignoffPending,
    lastEngagedAt,
    certificationCount: certifications.length,
    curriculumCount: assignments.length,
  };
}

function formatRelativeDate(d: string | null): string {
  if (!d) return "Never";
  try {
    const date = new Date(d);
    return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return d;
  }
}

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
}

function StatTile({ label, value, sub }: StatTileProps) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const pendingPillStyle: React.CSSProperties = {
  backgroundColor: "color-mix(in oklab, var(--bw-amber) 18%, white)",
  color: "var(--bw-mustard)",
};

export default function MentorTraineeCumulativeProgress({ learningState }: Props) {
  const stats = useMemo(() => computeStats(learningState), [learningState]);

  const completionPct =
    stats.totalItems > 0 ? Math.round((stats.completedItems / stats.totalItems) * 100) : 0;

  const hasPendingActions =
    stats.revisionRequested > 0 ||
    stats.submittedForReview > 0 ||
    stats.skillsSignoffPending > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          label="Items completed"
          value={`${stats.completedItems} / ${stats.totalItems}`}
          sub={`${completionPct}% complete`}
        />
        <StatTile label="Curricula" value={String(stats.curriculumCount)} />
        <StatTile label="Certifications" value={String(stats.certificationCount)} />
        <StatTile label="Last activity" value={formatRelativeDate(stats.lastEngagedAt)} />
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Pending mentor actions</h3>
        {!hasPendingActions ? (
          <p className="text-sm text-muted-foreground">
            No actions pending. Trainee is up to date on all mentor-reviewed work.
          </p>
        ) : (
          <ul className="space-y-2">
            {stats.submittedForReview > 0 && (
              <li className="flex items-center justify-between text-sm">
                <span className="text-foreground/90">Written summaries awaiting review</span>
                <span
                  className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium min-w-[2rem]"
                  style={pendingPillStyle}
                >
                  {stats.submittedForReview}
                </span>
              </li>
            )}
            {stats.skillsSignoffPending > 0 && (
              <li className="flex items-center justify-between text-sm">
                <span className="text-foreground/90">
                  Skills practice items awaiting your sign-off
                </span>
                <span
                  className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium min-w-[2rem]"
                  style={pendingPillStyle}
                >
                  {stats.skillsSignoffPending}
                </span>
              </li>
            )}
            {stats.revisionRequested > 0 && (
              <li className="flex items-center justify-between text-sm">
                <span className="text-foreground/90">Items in revision-requested state</span>
                <span
                  className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium min-w-[2rem]"
                  style={pendingPillStyle}
                >
                  {stats.revisionRequested}
                </span>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
