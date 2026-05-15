import { Tile } from "@/components/tile/Tile";

/**
 * TEMPORARY dev preview for the unified Tile primitive.
 * Not linked from the sidebar. Safe to delete once Group X is approved.
 */
export default function TilePreview() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Tile Preview (dev)</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">resource</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Tile
            variant="resource"
            name="How to use the PTP Snapshot"
            summary="A short walkthrough of the brain-state snapshot and how to interpret the four facets in your day-to-day work."
            thumbnailUrl={null}
            contentType="article"
            onClick={() => {}}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">cert_path</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Tile
            variant="cert_path"
            name="BrainWise Certified Coach"
            summary="Become certified to deliver PTP and NAI debriefs to your clients with full BrainWise authorisation."
            thumbnailUrl={null}
            instrumentCodes={["INST-001", "INST-002"]}
            required="required"
            prerequisiteName="Foundations of Brain-State Coaching"
            onClick={() => {}}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">content_item · in_progress</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Tile
            variant="content_item"
            name="Lesson 3: The Emotional Brain"
            summary="Walk through the limbic facets and how they show up in everyday workplace decisions."
            thumbnailUrl={null}
            status="in_progress"
            required="required"
            itemType="lesson_blocks"
            onClick={() => {}}
          />
        </div>
      </section>
    </div>
  );
}
