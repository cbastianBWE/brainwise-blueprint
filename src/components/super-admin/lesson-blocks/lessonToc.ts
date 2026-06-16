export interface TocEntry {
  blockId: string;
  text: string;
  level: number;
}

interface TocBlockInput {
  id?: string;
  client_id?: string;
  block_type: string;
  display_order?: number;
  config?: Record<string, unknown> | null;
}

export function buildLessonToc(blocks: TocBlockInput[] | null | undefined): TocEntry[] {
  if (!Array.isArray(blocks)) return [];
  const ordered = [...blocks].sort((a, b) => {
    const ao = typeof a.display_order === "number" ? a.display_order : 0;
    const bo = typeof b.display_order === "number" ? b.display_order : 0;
    return ao - bo;
  });
  const out: TocEntry[] = [];
  for (const b of ordered) {
    if (b.block_type !== "heading") continue;
    const cfg = (b.config ?? {}) as Record<string, unknown>;
    const text = String(cfg.text ?? "").trim();
    if (!text) continue;
    const lvl = Number(cfg.level ?? 2);
    const blockId = String(b.id ?? b.client_id ?? "");
    if (!blockId) continue;
    out.push({ blockId, text, level: Number.isFinite(lvl) ? lvl : 2 });
  }
  return out;
}
