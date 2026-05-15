import ResourceGridTab from "./ResourceGridTab";
import type { ResourceTab } from "./types";

export default function CoachResourcesTab({ tab }: { tab: ResourceTab }) {
  return (
    <ResourceGridTab
      tab={tab}
      emptyStateText="No coach resources have been published yet."
    />
  );
}
