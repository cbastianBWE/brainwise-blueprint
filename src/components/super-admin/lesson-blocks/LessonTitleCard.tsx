import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { buildLessonToc } from "./lessonToc";

interface BrandRow {
  logo_path: string | null;
  color_primary: string | null;
  color_cta: string | null;
  color_surface: string | null;
  color_accent: string | null;
  font_display_key: string | null;
  font_body_key: string | null;
}

interface ContentItemLike {
  id: string;
  title?: string | null;
  description?: string | null;
}

interface Props {
  contentItem: ContentItemLike;
  blocks: any[];
  onStart: (blockId: string) => void;
}

const FONT_MAP: Record<string, string> = {
  inter: '"Inter", system-ui, sans-serif',
  manrope: '"Manrope", system-ui, sans-serif',
  poppins: '"Poppins", system-ui, sans-serif',
  lora: '"Lora", Georgia, serif',
  merriweather: '"Merriweather", Georgia, serif',
  playfair: '"Playfair Display", Georgia, serif',
  source_serif: '"Source Serif Pro", Georgia, serif',
  ibm_plex_sans: '"IBM Plex Sans", system-ui, sans-serif',
  ibm_plex_serif: '"IBM Plex Serif", Georgia, serif',
};

function resolveFont(key: string | null | undefined): string | null {
  if (!key) return null;
  return FONT_MAP[key.toLowerCase()] ?? null;
}

export function LessonTitleCard({ contentItem, blocks, onStart }: Props) {
  const [brand, setBrand] = useState<BrandRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("lesson_brands")
        .select("*")
        .eq("content_item_id", contentItem.id)
        .maybeSingle();
      if (!cancelled) setBrand((data as BrandRow) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [contentItem.id]);

  const toc = buildLessonToc(blocks);

  const logoUrl = brand?.logo_path
    ? supabase.storage.from("lesson-branding").getPublicUrl(brand.logo_path).data.publicUrl
    : null;

  const displayFont = resolveFont(brand?.font_display_key);
  const bodyFont = resolveFont(brand?.font_body_key);

  const styleVars: React.CSSProperties = {
    ["--cover-primary" as any]: brand?.color_primary ?? "#021F36",
    ["--cover-cta" as any]: brand?.color_cta ?? "#F5741A",
    ["--cover-surface" as any]: brand?.color_surface ?? "#F9F7F1",
    ["--cover-accent" as any]: brand?.color_accent ?? "#006D77",
    ...(displayFont ? { ["--font-display" as any]: displayFont } : {}),
    ...(bodyFont ? { ["--font-body" as any]: bodyFont } : {}),
    backgroundColor: "var(--cover-surface)",
    color: "var(--cover-primary)",
    fontFamily: bodyFont ?? undefined,
  };

  const firstBlockId = toc[0]?.blockId ?? null;

  return (
    <div
      className="mb-6 overflow-hidden rounded-xl border shadow-sm"
      style={styleVars}
    >
      <div className="flex flex-col gap-6 p-8 md:p-10">
        {logoUrl && (
          <img
            src={logoUrl}
            alt=""
            className="h-12 w-auto self-start object-contain"
          />
        )}
        <h1
          className="text-3xl font-semibold leading-tight md:text-4xl"
          style={{ color: "var(--cover-primary)", fontFamily: displayFont ?? undefined }}
        >
          {contentItem.title ?? "Untitled lesson"}
        </h1>
        {contentItem.description && (
          <p className="max-w-2xl text-base opacity-80">{contentItem.description}</p>
        )}

        {toc.length > 0 && (
          <div className="space-y-2">
            <div
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--cover-accent)" }}
            >
              In this lesson
            </div>
            <ul className="space-y-1">
              {toc.map((t) => (
                <li key={t.blockId} style={{ paddingLeft: `${Math.max(0, t.level - 2) * 12}px` }}>
                  <button
                    type="button"
                    onClick={() => onStart(t.blockId)}
                    className="text-left text-sm underline-offset-2 hover:underline"
                    style={{ color: "var(--cover-primary)" }}
                  >
                    {t.text}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <Button
            type="button"
            onClick={() => firstBlockId && onStart(firstBlockId)}
            disabled={!firstBlockId}
            className="text-white hover:opacity-90"
            style={{ backgroundColor: "var(--cover-cta)" }}
          >
            Start lesson
          </Button>
        </div>
      </div>
    </div>
  );
}

export default LessonTitleCard;
