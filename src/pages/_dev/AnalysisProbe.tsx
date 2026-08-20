import { AiAnalysisPanel } from "@/components/coaching/CoachingViews";
export default function AnalysisProbe() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div data-probe="blocks">
        <AiAnalysisPanel
          analysis={{
            format: "blocks_v1",
            opening: "Opening frame sentence.",
            blocks: [
              { point: "Name the pattern first", body: "One to four sentences developing it.\nSecond line." },
              { point: "", body: "" },
              { body: "Body only card." },
            ],
            closing: "Closing line.",
            html: "<p>should not render</p>",
          }}
        />
      </div>
      <div data-probe="legacy">
        <AiAnalysisPanel analysis={{ format: "raw", html: "<h3>Heading</h3><p>Old <strong>session</strong> body.</p><ul><li>a</li></ul>" }} />
      </div>
      <div data-probe="htmlprop">
        <AiAnalysisPanel html="<p>Relationship activity <em>output</em>.</p>" />
      </div>
    </div>
  );
}
