import { useQuery } from "@tanstack/react-query";
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
  outcomes?: string[] | null;
}

interface Props {
  contentItem: ContentItemLike;
  blocks: any[];
  onStart: (blockId: string) => void;
  ctaLabel?: string;
  resumeHint?: string | null;
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

const BLOCK_MINUTE_WEIGHTS: Record<string, number> = {
  text: 0.6, quote: 0.5, callout: 0.5, list: 0.4,
  heading: 0.15, divider: 0.1, stat_callout: 0.3, statement_a_b: 0.4,
  image: 0.3, video_embed: 1.5, embed_audio: 1.0,
  accordion: 0.8, tabs: 0.8, button_stack: 0.1,
  flashcards: 1.0, card_sort: 1.0, scenario: 1.5, knowledge_check: 1.0,
};
function estimateMinutes(blocks: any[]): number {
  let total = 0;
  for (const b of blocks) total += BLOCK_MINUTE_WEIGHTS[b.block_type] ?? 0.5;
  return Math.max(1, Math.round(total));
}

function BrainWiseMark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="22" fill="currentColor" opacity="0.12" />
      <path
        d="M16 30c0-6 4-10 8-10s8 4 8 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="18" r="3" fill="currentColor" />
    </svg>
  );
}

export const lessonBrandQueryKey = (contentItemId: string) =>
  ["lesson-brand", contentItemId] as const;

export function LessonTitleCard({
  contentItem,
  blocks,
  onStart,
  ctaLabel = "Start lesson",
  resumeHint = null,
}: Props) {
  const { data: brand } = useQuery({
    queryKey: lessonBrandQueryKey(contentItem.id),
    enabled: !!contentItem.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("lesson_brands")
        .select("*")
        .eq("content_item_id", contentItem.id)
        .maybeSingle();
      return (data as BrandRow) ?? null;
    },
  });

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
    fontFamily: bodyFont ?? undefined,
  };

  const firstBlockId = toc[0]?.blockId ?? null;
  const minutes = estimateMinutes(blocks);
  const sectionCount = toc.length;
  const checkCount = blocks.filter((b) => b.block_type === "knowledge_check").length;
  const outcomes = Array.isArray(contentItem.outcomes)
    ? contentItem.outcomes.filter(Boolean)
    : [];

  const chip = (label: React.ReactNode, key: string) => (
    <span
      key={key}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
      style={{ borderColor: "var(--cover-accent)", color: "var(--cover-accent)" }}
    >
      {label}
    </span>
  );

  return (
    <div
      className="mb-8 overflow-hidden rounded-2xl border shadow-sm"
      style={{ ...styleVars, backgroundColor: "var(--cover-surface)", color: "var(--cover-primary)" }}
    >
      <div className="grid gap-8 p-8 md:grid-cols-[1.4fr_1fr] md:gap-12 md:p-12 lg:p-16">
        {/* Left column: hero */}
        <div className="flex flex-col gap-6">
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-12 w-auto object-contain" />
            ) : (
              <BrainWiseMark className="h-12 w-12" style={{ color: "var(--cover-cta)" }} />
            )}
          </div>

          <h1
            className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl"
            style={{ color: "var(--cover-primary)", fontFamily: displayFont ?? undefined }}
          >
            {contentItem.title ?? "Untitled lesson"}
          </h1>

          {contentItem.description && (
            <p className="max-w-2xl text-lg leading-relaxed opacity-80">
              {contentItem.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {chip(<>{minutes} min to complete</>, "min")}
            {sectionCount > 0 && chip(<>{sectionCount} sections</>, "sec")}
            {checkCount > 0 &&
              chip(
                <>
                  {checkCount} quick {checkCount === 1 ? "check" : "checks"}
                </>,
                "chk",
              )}
          </div>
        </div>

        {/* Right column: outcomes + CTA + ToC */}
        <div className="flex flex-col gap-8">
          {outcomes.length > 0 && (
            <div>
              <div
                className="mb-3 text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--cover-accent)" }}
              >
                By the end you'll be able to
              </div>
              <ul className="space-y-2">
                {outcomes.map((o, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed">
                    <span aria-hidden="true" style={{ color: "var(--cover-cta)" }}>
                      ✓
                    </span>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="lg"
              onClick={() => onStart(firstBlockId ?? "")}
              className="px-6 py-5 text-base font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: "var(--cover-cta)" }}
            >
              {ctaLabel}
            </Button>
            {resumeHint && (
              <span className="text-xs opacity-70">{resumeHint}</span>
            )}
          </div>

          {toc.length > 0 && (
            <div>
              <div
                className="mb-3 text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--cover-accent)" }}
              >
                What's inside
              </div>
              <ul className="space-y-1">
                {toc.map((t, i) => (
                  <li key={t.blockId}>
                    <button
                      type="button"
                      onClick={() => onStart(t.blockId)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] transition-colors hover:bg-white"
                      style={{ color: "var(--cover-primary)" }}
                    >
                      <span
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: "var(--cover-accent)",
                          color: "#fff",
                        }}
                      >
                        {i + 1}
                      </span>
                      <span className="flex-1">{t.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LessonTitleCard;
