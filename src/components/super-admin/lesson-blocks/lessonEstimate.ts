export const BLOCK_MINUTE_WEIGHTS: Record<string, number> = {
  text: 0.6, quote: 0.5, callout: 0.5, list: 0.4,
  heading: 0.15, divider: 0.1, stat_callout: 0.3, statement_a_b: 0.4,
  image: 0.3, video_embed: 1.5, embed_audio: 1.0,
  accordion: 0.8, tabs: 0.8, button_stack: 0.1,
  flashcards: 1.0, card_sort: 1.0, scenario: 1.5, knowledge_check: 1.0,
};

export function estimateMinutes(blocks: { block_type: string }[]): number {
  let total = 0;
  for (const b of blocks) total += BLOCK_MINUTE_WEIGHTS[b.block_type] ?? 0.5;
  return Math.max(1, Math.round(total));
}
