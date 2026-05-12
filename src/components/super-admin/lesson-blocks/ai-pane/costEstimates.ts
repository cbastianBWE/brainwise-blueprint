// Static cost estimate strings shown to authors at decision points.
export const COST_ESTIMATES = {
  generateOutline: "Estimated cost: ~$0.05–$0.15 (depends on doc length and conversation history)",
  expandFullContent: (n: number) =>
    `Estimated cost: ~$0.10–$0.30 (this is the heaviest call). Building ${n} block${n === 1 ? "" : "s"}.`,
  iterateOutlineItem: "~$0.01",
  iterateFullBlock: "~$0.03",
  refineWithAi: "~$0.03",
} as const;
