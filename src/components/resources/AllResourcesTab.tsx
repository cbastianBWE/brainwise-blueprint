import ResourceGridTab from "./ResourceGridTab";
import type { ResourceTab } from "./types";

export default function AllResourcesTab({ tab }: { tab: ResourceTab }) {
  return (
    <ResourceGridTab
      tab={tab}
      emptyStateText="No resources have been published yet."
    />
  );
}
