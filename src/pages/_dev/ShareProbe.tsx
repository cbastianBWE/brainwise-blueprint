import CoachingShareControl from "@/components/coaching/CoachingShareControl";
import type { CoachingShare } from "@/hooks/useCoachingShare";

const mk = (o: Partial<CoachingShare>): CoachingShare =>
  ({
    coachUserId: null,
    hasPractitioner: false,
    alwaysShare: false,
    snapshotShareId: null,
    hasSnapshotShare: false,
    loading: false,
    pending: false,
    setAlwaysShare: async () => true,
    shareSnapshot: async () => true,
    ...o,
  }) as CoachingShare;

export default function ShareProbe() {
  const none = mk({});
  const withCoach = mk({ coachUserId: "x", hasPractitioner: true });
  const pending = mk({ coachUserId: "x", hasPractitioner: true, alwaysShare: true, pending: true });
  return (
    <div className="space-y-6 p-6">
      <div data-testid="none-card"><CoachingShareControl variant="card" share={none} /></div>
      <div data-testid="none-inline"><CoachingShareControl variant="inline" share={none} /></div>
      <div data-testid="none-section"><CoachingShareControl variant="section" share={none} /></div>
      <div data-testid="card"><CoachingShareControl variant="card" share={withCoach} /></div>
      <div data-testid="inline"><CoachingShareControl variant="inline" share={withCoach} /></div>
      <div data-testid="section"><CoachingShareControl variant="section" share={withCoach} /></div>
      <div data-testid="pending"><CoachingShareControl variant="section" share={pending} /></div>
    </div>
  );
}
