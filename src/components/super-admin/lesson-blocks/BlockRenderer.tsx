import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleWithFontSize } from "./TextStyleWithFontSize";
import { Link } from "@tiptap/extension-link";
import { useEffect, useState, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import {
  Info,
  AlertTriangle,
  CheckCircle2,
  Star,
  Image as ImageIcon,
  Music as MusicIcon,
  Video as VideoIcon,
  ChevronRight,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { EditorBlock, TipTapDocJSON } from "./blockTypeMeta";

export type OnBlockComplete = (
  blockClientId: string,
  completionData?: unknown,
) => void;

export interface SavedBlockProgress {
  status: "in_progress" | "completed";
  completion_data: unknown;
}

interface BlockRendererProps {
  block: EditorBlock;
  assetUrlMap: Map<string, string>;
  mode?: "editor" | "trainee";
  /**
   * Trainee-only. Fires once on the live false → true transition of the
   * block's per-renderer "done" flag. Receives an optional state snapshot
   * which the caller may persist (e.g. to lesson_block_progress).
   * Does NOT fire for blocks that are already complete on mount — those
   * are handled by the caller using savedProgress directly.
   */
  onBlockComplete?: OnBlockComplete;
  /**
   * Trainee-only. DB-backed prior progress for this block. When present and
   * status === "completed", the renderer seeds its in-memory state from
   * completion_data and suppresses the live-completion event. The DB is the
   * single source of truth — no sessionStorage is used.
   */
  savedProgress?: SavedBlockProgress | null;
}

function ReadOnlyTipTap({ json }: { json: TipTapDocJSON | null | undefined }) {
  const editor = useEditor({
    editable: false,
    extensions: [StarterKit, TextStyleWithFontSize, Link.configure({ openOnClick: true })],
    content: json ?? "",
  });
  useEffect(() => {
    if (!editor) return;
    const cur = editor.getJSON();
    if (JSON.stringify(cur) !== JSON.stringify(json ?? "")) {
      editor.commands.setContent((json ?? "") as any, { emitUpdate: false });
    }
  }, [json, editor]);
  if (!editor) return null;
  return (
    <div className="tiptap-prose prose-base max-w-none">
      <EditorContent editor={editor} />
    </div>
  );
}

function HeadingRender({ text, level }: { text: string; level: number }) {
  const safeLevel = level === 2 || level === 3 || level === 4 ? level : 2;
  const sizeClass =
    safeLevel === 2
      ? "text-3xl mt-8 mb-4"
      : safeLevel === 3
      ? "text-2xl mt-6 mb-3"
      : "text-xl mt-4 mb-2";
  const weightClass = safeLevel === 2 ? "font-bold" : "font-semibold";
  const Tag = `h${safeLevel}` as "h2" | "h3" | "h4";
  return (
    <Tag
      className={`font-display tracking-tight ${sizeClass} ${weightClass}`}
      style={{ color: "#021F36" }}
    >
      {text || (
        <span className="font-sans text-sm font-normal italic text-muted-foreground">
          Untitled heading
        </span>
      )}
    </Tag>
  );
}

function ImageRender({
  assetId,
  alt,
  caption,
  urlMap,
}: {
  assetId: string | null;
  alt: string;
  caption: string | null;
  urlMap: Map<string, string>;
}) {
  const url = assetId ? urlMap.get(assetId) : null;
  if (!url) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed bg-muted/30 text-sm text-muted-foreground">
        <ImageIcon className="mr-2 h-4 w-4" />
        No image uploaded
      </div>
    );
  }
  return (
    <figure className="space-y-2">
      <img
        src={url}
        alt={alt || ""}
        className="max-h-[480px] w-full rounded-md object-contain"
      />
      {caption && (
        <figcaption className="text-center text-xs text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function VideoRender({
  config,
  urlMap,
}: {
  config: any;
  urlMap: Map<string, string>;
}) {
  const url =
    config.source_type === "supabase_storage" && config.asset_id
      ? urlMap.get(config.asset_id)
      : null;
  if (config.source_type === "supabase_storage" && url) {
    return (
      <div className="space-y-2">
        <video
          src={url}
          controls
          className="w-full rounded-md bg-black"
          preload="metadata"
        >
          Your browser does not support video.
        </video>
        {config.title && <p className="text-sm font-medium">{config.title}</p>}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 text-sm text-muted-foreground">
        <VideoIcon className="h-5 w-5" />
        <div className="text-xs uppercase tracking-wide">
          {config.source_type ?? "video"}
        </div>
        <div className="text-xs">{config.source_id || "No source ID"}</div>
      </div>
      {config.title && <p className="text-sm font-medium">{config.title}</p>}
    </div>
  );
}

function QuoteRender({
  body,
  attribution,
}: {
  body: TipTapDocJSON | null;
  attribution: string | null;
}) {
  return (
    <blockquote
      className="space-y-2 border-l-4 pl-4 italic"
      style={{ borderColor: "#F5741A" }}
    >
      <ReadOnlyTipTap json={body} />
      {attribution && (
        <footer className="text-sm not-italic text-muted-foreground">
          — {attribution}
        </footer>
      )}
    </blockquote>
  );
}

function ListRender({
  items,
  ordered,
  markerColor,
}: {
  items: any[];
  ordered: boolean;
  markerColor?: string | null;
}) {
  const ListTag = (ordered ? "ol" : "ul") as "ol" | "ul";
  const styleVars = markerColor
    ? ({ "--list-marker-color": markerColor } as CSSProperties)
    : undefined;
  return (
    <div className="tiptap-prose prose-base max-w-none" style={styleVars}>
      <ListTag>
        {(items ?? []).map((it, idx) => (
          <li key={it.client_id ?? idx}>
            <ReadOnlyTipTap json={it.body} />
          </li>
        ))}
      </ListTag>
    </div>
  );
}

const CALLOUT_VARIANT_STYLES: Record<
  string,
  { bg: string; stripe: string; Icon: any }
> = {
  info: { bg: "#F0F8F9", stripe: "#006D77", Icon: Info },
  warning: { bg: "#FFF8E5", stripe: "#FFB703", Icon: AlertTriangle },
  success: { bg: "#EAF5F0", stripe: "#2D6A4F", Icon: CheckCircle2 },
  important: { bg: "#FDF1E8", stripe: "#F5741A", Icon: Star },
};

function CalloutRender({
  variant,
  body,
}: {
  variant: string;
  body: TipTapDocJSON | null;
}) {
  const v = CALLOUT_VARIANT_STYLES[variant] ?? CALLOUT_VARIANT_STYLES.info;
  const Icon = v.Icon;
  return (
    <div
      className="flex gap-3 rounded-md border-l-4 p-4"
      style={{ background: v.bg, borderColor: v.stripe }}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: v.stripe }} />
      <div className="flex-1">
        <ReadOnlyTipTap json={body} />
      </div>
    </div>
  );
}

function AudioRender({
  assetId,
  transcript,
  urlMap,
}: {
  assetId: string | null;
  transcript: string | null;
  urlMap: Map<string, string>;
}) {
  const url = assetId ? urlMap.get(assetId) : null;
  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3">
      {url ? (
        <audio src={url} controls className="w-full" preload="metadata" />
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MusicIcon className="h-4 w-4" />
          No audio uploaded
        </div>
      )}
      {transcript && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-muted-foreground">
            Transcript
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-sm">{transcript}</p>
        </details>
      )}
    </div>
  );
}

function paddingPxFor(token: unknown): number {
  switch (token) {
    case "small":
      return 12;
    case "medium":
      return 24;
    case "large":
      return 48;
    case "none":
    default:
      return 0;
  }
}

export function BlockRenderer({ block, assetUrlMap, mode, onBlockComplete, savedProgress }: BlockRendererProps) {
  const cfg: any = block.config ?? {};
  const bg = (cfg.background_color as string | null | undefined) ?? null;
  const padPx = paddingPxFor(cfg.padding);

  if (block.block_type === "divider") {
    const dividerColor = (cfg.color as string | undefined) || "#021F36";
    return (
      <div className="my-4" data-block-client-id={block.client_id}>
        <div
          className="h-[3px] w-full rounded-full"
          style={{ background: dividerColor }}
        />
      </div>
    );
  }

  const wrapperStyle: CSSProperties = {
    background: bg ?? undefined,
    paddingTop: padPx,
    paddingBottom: padPx,
    paddingLeft: bg ? 16 : undefined,
    paddingRight: bg ? 16 : undefined,
    borderRadius: bg ? 8 : undefined,
  };

  const renderInner = () => {
    switch (block.block_type) {
      case "text":
        return <ReadOnlyTipTap json={cfg.body} />;
      case "heading":
        return <HeadingRender text={cfg.text ?? ""} level={cfg.level ?? 2} />;
      case "image":
        return (
          <ImageRender
            assetId={cfg.asset_id ?? null}
            alt={cfg.alt ?? ""}
            caption={cfg.caption ?? null}
            urlMap={assetUrlMap}
          />
        );
      case "video_embed":
        return <VideoRender config={cfg} urlMap={assetUrlMap} />;
      case "quote":
        return (
          <QuoteRender body={cfg.body ?? null} attribution={cfg.attribution ?? null} />
        );
      case "list":
        return (
          <ListRender
            items={cfg.items ?? []}
            ordered={!!cfg.ordered}
            markerColor={cfg.marker_color ?? null}
          />
        );
      case "callout":
        return <CalloutRender variant={cfg.variant ?? "info"} body={cfg.body ?? null} />;
      case "embed_audio":
        return (
          <AudioRender
            assetId={cfg.asset_id ?? null}
            transcript={cfg.transcript ?? null}
            urlMap={assetUrlMap}
          />
        );
      case "stat_callout":
        return (
          <StatCalloutRender
            stat={cfg.stat ?? ""}
            label={cfg.label ?? ""}
            body={cfg.body ?? null}
            backgroundColor={bg}
          />
        );
      case "statement_a_b":
        return (
          <StatementABRender
            aLabel={cfg.a_label ?? ""}
            aBody={cfg.a_body ?? null}
            bLabel={cfg.b_label ?? ""}
            bBody={cfg.b_body ?? null}
            variant={cfg.variant === "neutral" ? "neutral" : "contrast"}
          />
        );
      case "accordion":
        return <AccordionRender items={cfg.items ?? []} />;
      case "tabs":
        return (
          <TabsRender
            tabs={cfg.tabs ?? []}
            defaultTab={cfg.default_tab ?? 0}
            style={cfg.style === "pills" ? "pills" : "underline"}
          />
        );
      case "button_stack":
        return (
          <ButtonStackRender
            buttons={cfg.buttons ?? []}
            layout={cfg.layout === "inline" ? "inline" : "stacked"}
            caption={cfg.caption ?? null}
          />
        );
      case "flashcards":
        return (
          <FlashcardsRender
            cards={cfg.cards ?? []}
            gatingRequired={cfg.gating_required === true}
            urlMap={assetUrlMap}
            mode={mode}
            blockClientId={block.client_id}
            onBlockComplete={onBlockComplete}
            savedProgress={savedProgress}
          />
        );
      case "card_sort":
        return (
          <CardSortRender
            buckets={cfg.buckets ?? []}
            cards={cfg.cards ?? []}
            gatingRequired={cfg.gating_required === true}
            urlMap={assetUrlMap}
            mode={mode}
            blockClientId={block.client_id}
            onBlockComplete={onBlockComplete}
            savedProgress={savedProgress}
          />
        );
      case "scenario":
        return (
          <ScenarioRender
            title={cfg.title ?? null}
            introMarkdown={cfg.intro_markdown ?? null}
            moments={cfg.moments ?? []}
            gatingRequired={cfg.gating_required === true}
            urlMap={assetUrlMap}
            mode={mode}
            blockClientId={block.client_id}
            onBlockComplete={onBlockComplete}
            savedProgress={savedProgress}
          />
        );
      case "knowledge_check":
        return (
          <KnowledgeCheckRender
            questions={cfg.questions ?? []}
            gatingRequired={cfg.gating_required === true}
            mode={mode}
            blockClientId={block.client_id}
            onBlockComplete={onBlockComplete}
            savedProgress={savedProgress}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="block-style-wrapper"
      style={wrapperStyle}
      data-block-client-id={block.client_id}
    >
      {renderInner()}
    </div>
  );
}

// === Session 64 additions — render components for 5 new block types ===

function StatCalloutRender({
  stat,
  label,
  body,
}: {
  stat: string;
  label: string;
  body: TipTapDocJSON | null;
  backgroundColor: string | null;
}) {
  return (
    <div className="bw-stat-callout">
      <div className="bw-stat-callout-number">{stat || "—"}</div>
      <div className="bw-stat-callout-label">{label}</div>
      {body && (
        <div className="bw-stat-callout-body">
          <ReadOnlyTipTap json={body} />
        </div>
      )}
    </div>
  );
}

function StatementABRender({
  aLabel,
  aBody,
  bLabel,
  bBody,
  variant,
}: {
  aLabel: string;
  aBody: TipTapDocJSON | null;
  bLabel: string;
  bBody: TipTapDocJSON | null;
  variant: "contrast" | "neutral";
}) {
  const variantClass = variant === "neutral" ? "is-neutral" : "is-contrast";
  return (
    <div className="bw-statement-ab">
      <div className={`bw-statement-card bw-statement-card-a ${variantClass}`}>
        {aLabel && <div className="bw-statement-card-label">{aLabel}</div>}
        <div className="tiptap-prose prose-base max-w-none">
          <ReadOnlyTipTap json={aBody} />
        </div>
      </div>
      <div className={`bw-statement-card bw-statement-card-b ${variantClass}`}>
        {bLabel && <div className="bw-statement-card-label">{bLabel}</div>}
        <div className="tiptap-prose prose-base max-w-none">
          <ReadOnlyTipTap json={bBody} />
        </div>
      </div>
    </div>
  );
}

function AccordionRender({
  items,
}: {
  items: Array<{ client_id: string; title: string; body: TipTapDocJSON | null }>;
}) {
  if (items.length === 0) return null;
  return (
    <Accordion type="multiple" className="w-full">
      {items.map((item) => (
        <AccordionItem key={item.client_id} value={item.client_id} className="bw-accordion-item">
          <AccordionTrigger className="bw-accordion-trigger">
            {item.title || "(untitled section)"}
          </AccordionTrigger>
          <AccordionContent className="bw-accordion-content">
            <div className="tiptap-prose prose-base max-w-none">
              <ReadOnlyTipTap json={item.body} />
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function TabsRender({
  tabs,
  defaultTab,
  style,
}: {
  tabs: Array<{ client_id: string; label: string; body: TipTapDocJSON | null }>;
  defaultTab: number;
  style: "underline" | "pills";
}) {
  if (tabs.length === 0) return null;
  const safeDefault = Math.min(Math.max(0, defaultTab), tabs.length - 1);
  const defaultValue = tabs[safeDefault]?.client_id ?? tabs[0].client_id;

  return (
    <Tabs defaultValue={defaultValue} className="w-full">
      <div className="flex justify-center mb-4">
        <TabsList
          className={
            style === "pills"
              ? "inline-flex h-auto flex-wrap gap-2 bg-transparent p-0 rounded-none"
              : "inline-flex h-auto flex-wrap gap-2 bg-transparent p-0 rounded-none border-b-0"
          }
        >
          {tabs.map((t) => (
            <TabsTrigger
              key={t.client_id}
              value={t.client_id}
              className={
                style === "pills"
                  ? "rounded-full bg-muted text-muted-foreground hover:bg-muted/70 hover:text-[#021F36] data-[state=active]:bg-[#F5741A] data-[state=active]:text-white data-[state=active]:shadow-none font-medium px-4 py-2 transition-colors"
                  : "rounded-none bg-transparent border-b-2 border-border text-muted-foreground hover:text-[#021F36] hover:border-muted-foreground data-[state=active]:text-[#021F36] data-[state=active]:border-[#F5741A] data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold font-medium px-4 py-2 transition-colors"
              }
            >
              {t.label || "(untitled)"}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((t) => (
        <TabsContent key={t.client_id} value={t.client_id} className="pt-2">
          <div className="tiptap-prose prose-base max-w-none">
            <ReadOnlyTipTap json={t.body} />
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function ButtonStackRender({
  buttons,
  layout,
  caption,
}: {
  buttons: Array<{
    client_id: string;
    label: string;
    action_type: "link" | "jump_to_block" | "continue";
    url: string | null;
    target_block_client_id: string | null;
    section_title?: string | null;
    variant: "primary" | "secondary";
  }>;
  layout: "stacked" | "inline";
  caption: string | null;
}) {
  if (buttons.length === 0) return null;
  const wrapperClass = layout === "inline" ? "bw-button-stack-inline" : "bw-button-stack-stacked";

  const handleJump = (targetClientId: string | null) => {
    if (!targetClientId) return;
    if (typeof document === "undefined") return;
    const target = document.querySelector(`[data-block-client-id="${targetClientId}"]`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <div className={wrapperClass}>
        {buttons.map((b) => {
          const buttonProps = {
            variant: b.variant === "secondary" ? ("outline" as const) : ("default" as const),
            style:
              b.variant === "primary"
                ? ({ backgroundColor: "#F5741A", color: "white" } as CSSProperties)
                : undefined,
          };
          const label = b.label || "(untitled)";
          if (b.action_type === "jump_to_block") {
            return (
              <Button
                key={b.client_id}
                {...buttonProps}
                onClick={() => handleJump(b.target_block_client_id)}
                disabled={!b.target_block_client_id}
              >
                {label}
              </Button>
            );
          }
          if (b.action_type === "continue") {
            const continueLabel =
              b.label && b.label.trim().length > 0 ? b.label : "Continue";
            return (
              <div
                key={b.client_id}
                className="bw-button-continue-wrapper my-8 flex w-full flex-col items-center gap-4"
              >
                <div
                  className="h-0.5 w-full"
                  style={{ backgroundColor: "#F5741A", opacity: 0.6 }}
                />
                <Button
                  {...buttonProps}
                  onClick={() => {
                    /* A later phase wires reveal logic; author view is a no-op. */
                  }}
                  className="bw-button-continue px-8 py-3 text-base font-medium"
                >
                  {continueLabel}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            );
          }
          const rawUrl = (b.url ?? "").trim();
          if (!rawUrl) {
            return (
              <Button key={b.client_id} {...buttonProps} disabled>
                {label}
              </Button>
            );
          }
          // Normalize bare domains (e.g. "google.com") to absolute https URLs.
          // Leave http(s)://, internal routes (/), mailto:, and tel: untouched.
          const hasScheme =
            rawUrl.startsWith("http://") ||
            rawUrl.startsWith("https://") ||
            rawUrl.startsWith("/") ||
            rawUrl.startsWith("mailto:") ||
            rawUrl.startsWith("tel:");
          const url = hasScheme ? rawUrl : `https://${rawUrl}`;
          const isExternal = url.startsWith("http://") || url.startsWith("https://");
          return (
            <Button key={b.client_id} {...buttonProps} asChild>
              <a
                href={url}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
              >
                {label}
              </a>
            </Button>
          );
        })}
      </div>
      {caption && caption.trim().length > 0 && (
        <p className="bw-button-stack-caption">{caption}</p>
      )}
    </>
  );
}

// === Session 67: flashcards renderer ===

type FlashcardConfig = {
  client_id: string;
  front: TipTapDocJSON | null;
  back: TipTapDocJSON | null;
  front_image_asset_id: string | null;
  front_caption: string | null;
  background_color: string | null;
};

// Locked auto-pair: brand background color → text color. Author picks bg;
// renderer derives text color. Sand and null get Navy text; everything else White.
const FLASHCARD_TEXT_COLOR_FOR_BG: Record<string, string> = {
  "#021F36": "#FFFFFF",
  "#F5741A": "#FFFFFF",
  "#F9F7F1": "#021F36",
  "#006D77": "#FFFFFF",
  "#7a5800": "#FFFFFF",
  "#6D6875": "#FFFFFF",
  "#3C096C": "#FFFFFF",
  "#2D6A4F": "#FFFFFF",
};

function getFlashcardTextColorForBg(bg: string | null | undefined): string {
  if (!bg) return "#021F36";
  return FLASHCARD_TEXT_COLOR_FOR_BG[bg] ?? "#021F36";
}

function FlashcardsRender({
  cards,
  urlMap,
  mode,
  blockClientId,
  onBlockComplete,
  savedProgress,
}: {
  cards: FlashcardConfig[];
  gatingRequired: boolean;
  urlMap: Map<string, string>;
  mode?: "editor" | "trainee";
  blockClientId: string;
  onBlockComplete?: OnBlockComplete;
  savedProgress?: SavedBlockProgress | null;
}) {
  const initialQueue = cards.map((c) => c.client_id);

  // Seed state from DB-backed savedProgress when present (trainee mode).
  const seed = (() => {
    if (mode !== "trainee" || !savedProgress) return null;
    const d = savedProgress.completion_data as any;
    if (!d || typeof d !== "object") return null;
    return {
      queue: Array.isArray(d.queue) ? (d.queue as string[]) : initialQueue,
      cursorIdx: typeof d.cursorIdx === "number" ? d.cursorIdx : 0,
      completed: new Set<string>(Array.isArray(d.completed) ? d.completed : []),
      reviewCounts:
        d.reviewCounts && typeof d.reviewCounts === "object" ? d.reviewCounts : {},
    };
  })();

  const [queue, setQueue] = useState<string[]>(seed?.queue ?? initialQueue);
  const [cursorIdx, setCursorIdx] = useState(seed?.cursorIdx ?? 0);
  const [completed, setCompleted] = useState<Set<string>>(
    seed?.completed ?? new Set(),
  );
  const [reviewCounts, setReviewCounts] = useState<Record<string, number>>(
    seed?.reviewCounts ?? {},
  );
  const [flipped, setFlipped] = useState(false);
  const [hasBeenFlipped, setHasBeenFlipped] = useState<Record<string, boolean>>({});

  // Reset flip state when card changes.
  useEffect(() => {
    setFlipped(false);
  }, [cursorIdx, queue]);

  if (cards.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed bg-muted/30 text-sm text-muted-foreground">
        No flashcards yet.
      </div>
    );
  }

  const cardsById = new Map(cards.map((c) => [c.client_id, c]));
  const allDone = completed.size >= cards.length;
  const currentId =
    !allDone && cursorIdx < queue.length ? queue[cursorIdx] : null;
  const current = currentId ? cardsById.get(currentId) ?? null : null;

  // Fire onBlockComplete once on the LIVE false → true transition. Blocks
  // already complete on mount (savedProgress.status === "completed") are
  // handled by the viewer using savedProgress directly, so suppress here.
  const completionFiredRef = useRef(savedProgress?.status === "completed");
  useEffect(() => {
    if (mode !== "trainee") return;
    if (allDone && !completionFiredRef.current && cards.length > 0) {
      completionFiredRef.current = true;
      onBlockComplete?.(blockClientId, {
        queue,
        cursorIdx,
        completed: Array.from(completed),
        reviewCounts,
      });
    }
    if (!allDone) completionFiredRef.current = false;
  }, [allDone, mode, blockClientId, onBlockComplete, cards.length, queue, cursorIdx, completed, reviewCounts]);

  const handleFlip = () => {
    if (!currentId) return;
    setFlipped((f) => !f);
    setHasBeenFlipped((m) => ({ ...m, [currentId]: true }));
  };

  const handleGotIt = () => {
    if (!currentId) return;
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(currentId);
      return next;
    });
    setCursorIdx((i) => Math.min(i + 1, queue.length));
  };

  const handleReviewAgain = () => {
    if (!currentId) return;
    setQueue((q) => [...q, currentId]);
    setReviewCounts((r) => ({ ...r, [currentId]: (r[currentId] ?? 0) + 1 }));
    setCursorIdx((i) => i + 1);
  };

  const handlePrev = () => {
    setCursorIdx((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    setCursorIdx((i) => Math.min(queue.length - 1, i + 1));
  };

  const handleReset = () => {
    setQueue(initialQueue);
    setCursorIdx(0);
    setCompleted(new Set());
    setReviewCounts({});
    setFlipped(false);
    setHasBeenFlipped({});
    completionFiredRef.current = false;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (allDone) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleFlip();
    }
  };

  const showRating = currentId ? hasBeenFlipped[currentId] === true : false;
  const frontImageUrl = current?.front_image_asset_id
    ? urlMap.get(current.front_image_asset_id) ?? null
    : null;
  const cardBg = current?.background_color ?? null;
  const faceStyle: CSSProperties = {
    backgroundColor: cardBg ?? "#FFFFFF",
    color: getFlashcardTextColorForBg(cardBg),
  };

  return (
    <div
      className="bw-flashcards-shell"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="bw-flashcards-progress">
        {allDone || !current ? (
          <>All cards reviewed · {cards.length} cards</>
        ) : (
          <>
            Card {cursorIdx + 1} of {queue.length} · {completed.size} of{" "}
            {cards.length} completed
          </>
        )}
      </div>

      {current && !allDone && (
        <>
          <div className="bw-flashcards-card-perspective">
            <div
              className={`bw-flashcards-card${flipped ? " is-flipped" : ""}`}
              onClick={handleFlip}
              role="button"
              aria-label="Flip card"
            >
              <div
                className="bw-flashcards-face bw-flashcards-face-front"
                style={faceStyle}
              >
                {frontImageUrl && (
                  <img
                    src={frontImageUrl}
                    alt=""
                    className="bw-flashcards-front-image"
                  />
                )}
                {current.front_caption && (
                  <div className="bw-flashcards-front-caption">
                    {current.front_caption}
                  </div>
                )}
                <div className="bw-flashcards-face-body">
                  <ReadOnlyTipTap json={current.front} />
                </div>
              </div>
              <div
                className="bw-flashcards-face bw-flashcards-face-back"
                style={faceStyle}
              >
                <div className="bw-flashcards-face-body">
                  <ReadOnlyTipTap json={current.back} />
                </div>
              </div>
            </div>
          </div>

          <div className="bw-flashcards-controls">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              disabled={cursorIdx === 0}
            >
              ← Prev
            </Button>
            <span className="bw-flashcards-controls-hint">
              Click card to flip · ←/→ to navigate
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              disabled={cursorIdx >= queue.length - 1}
            >
              Next →
            </Button>
          </div>

          {showRating && (
            <div className="bw-flashcards-rating">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleGotIt();
                }}
                style={{ backgroundColor: "#F5741A", color: "white" }}
              >
                Got it
              </Button>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReviewAgain();
                }}
                style={{ borderColor: "#021F36", color: "#021F36" }}
              >
                Review again
              </Button>
            </div>
          )}
        </>
      )}

      {allDone && (
        <div className="bw-flashcards-done">
          <p>All cards reviewed · {cards.length} cards</p>
          <button
            type="button"
            onClick={handleReset}
            className="bw-flashcards-done-reset underline"
            style={{ color: "#F5741A" }}
          >
            Review again
          </button>
        </div>
      )}
    </div>
  );
}

// === Session 69: card_sort renderer ===

type CardSortBucket = {
  client_id: string;
  title: string;
  description: string | null;
  outline_color: string | null;
};

type CardSortCardConfig = {
  client_id: string;
  content: TipTapDocJSON | null;
  correct_bucket_id: string | null;
  image_asset_id: string | null;
  caption: string | null;
  background_color: string | null;
};

const CARDSORT_TEXT_COLOR_FOR_BG: Record<string, string> = {
  "#021F36": "#FFFFFF",
  "#F5741A": "#FFFFFF",
  "#F9F7F1": "#021F36",
  "#006D77": "#FFFFFF",
  "#7a5800": "#FFFFFF",
  "#6D6875": "#FFFFFF",
  "#3C096C": "#FFFFFF",
  "#2D6A4F": "#FFFFFF",
};

function getCardSortTextColorForBg(bg: string | null | undefined): string {
  if (!bg) return "#021F36";
  return CARDSORT_TEXT_COLOR_FOR_BG[bg] ?? "#021F36";
}

const HOLDING_AREA_ID = "card-sort-holding";
const MIN_BUCKETS_FOR_RENDER = 2;
const MIN_CARDS_FOR_RENDER = 4;

type CardPlacement = "holding" | string;

type PerCardState = {
  placement: CardPlacement;
  locked: boolean;
  lastWrong: boolean;
};

function CardSortDraggableCard({
  card,
  state,
  buckets,
  urlMap,
  isOverlay,
}: {
  card: CardSortCardConfig;
  state: PerCardState;
  buckets: CardSortBucket[];
  urlMap: Map<string, string>;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.client_id,
    disabled: state.locked,
  });

  const imageUrl = card.image_asset_id ? urlMap.get(card.image_asset_id) ?? null : null;
  const correctBucket =
    state.lastWrong && card.correct_bucket_id
      ? buckets.find((b) => b.client_id === card.correct_bucket_id) ?? null
      : null;

  const cardBg = card.background_color ?? null;
  const cardStyle: CSSProperties = {
    backgroundColor: cardBg ?? "#FFFFFF",
    color: getCardSortTextColorForBg(cardBg),
  };

  const classes = [
    "bw-cardsort-card",
    state.locked ? "is-locked" : "",
    state.lastWrong ? "is-wrong" : "",
    isDragging ? "is-dragging" : "",
    isOverlay ? "is-overlay" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const tooltip = correctBucket
    ? `Correct bucket: ${correctBucket.title || "Untitled bucket"}`
    : undefined;

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      className={classes}
      style={cardStyle}
      title={tooltip}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
    >
      {state.locked && (
        <span className="bw-cardsort-card-badge bw-cardsort-card-badge-correct" aria-label="Correct">
          ✓
        </span>
      )}
      {state.lastWrong && (
        <span className="bw-cardsort-card-badge bw-cardsort-card-badge-wrong" aria-label="Wrong">
          ✕
        </span>
      )}
      {imageUrl && (
        <img className="bw-cardsort-card-image" src={imageUrl} alt={card.caption ?? ""} />
      )}
      {card.caption && <div className="bw-cardsort-card-caption">{card.caption}</div>}
      <div className="bw-cardsort-card-body">
        <ReadOnlyTipTap json={card.content} />
      </div>
    </div>
  );
}

function CardSortDroppable({
  id,
  className,
  style,
  children,
}: {
  id: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const cls = [className ?? "", isOver ? "is-over" : ""].filter(Boolean).join(" ");
  return (
    <div ref={setNodeRef} className={cls} style={style}>
      {children}
    </div>
  );
}

function CardSortRender({
  buckets,
  cards,
  urlMap,
  mode,
  blockClientId,
  onBlockComplete,
  onBlockProgress,
}: {
  buckets: CardSortBucket[];
  cards: CardSortCardConfig[];
  gatingRequired: boolean;
  urlMap: Map<string, string>;
  mode?: "editor" | "trainee";
  blockClientId: string;
  onBlockComplete?: OnBlockComplete;
  onBlockProgress?: OnBlockProgress;
}) {
  const sessionKey = `card_sort-pos:${blockClientId}`;

  const initialState = (): Record<string, PerCardState> => {
    const out: Record<string, PerCardState> = {};
    for (const c of cards) {
      out[c.client_id] = { placement: "holding", locked: false, lastWrong: false };
    }
    return out;
  };

  const [stateById, setStateById] = useState<Record<string, PerCardState>>(initialState);
  const [activeId, setActiveId] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (mode !== "trainee" || typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(sessionKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      const validBucketIds = new Set(buckets.map((b) => b.client_id));
      const next: Record<string, PerCardState> = {};
      for (const c of cards) {
        const prior = parsed[c.client_id];
        if (
          prior &&
          (prior.placement === "holding" || validBucketIds.has(prior.placement))
        ) {
          next[c.client_id] = {
            placement: prior.placement,
            locked: prior.locked === true,
            lastWrong: false,
          };
        } else {
          next[c.client_id] = { placement: "holding", locked: false, lastWrong: false };
        }
      }
      setStateById(next);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, mode]);

  useEffect(() => {
    if (mode !== "trainee" || typeof window === "undefined") return;
    try {
      const serializable: Record<string, { placement: CardPlacement; locked: boolean }> = {};
      for (const id of Object.keys(stateById)) {
        serializable[id] = {
          placement: stateById[id].placement,
          locked: stateById[id].locked,
        };
      }
      window.sessionStorage.setItem(sessionKey, JSON.stringify(serializable));
    } catch {
      /* ignore quota */
    }
  }, [stateById, sessionKey, mode]);

  useEffect(() => {
    if (mode === "trainee") return;
    setStateById(initialState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.map((c) => c.client_id).join("|"), mode]);

  const allCardsPlaced =
    cards.length > 0 && cards.every((c) => stateById[c.client_id]?.placement !== "holding");
  const allCorrectAndLocked =
    cards.length > 0 && cards.every((c) => stateById[c.client_id]?.locked === true);

  // Fire onBlockComplete + reportProgress once on transition to allCorrectAndLocked.
  const completionFiredRef = useRef(false);
  useEffect(() => {
    if (mode !== "trainee") return;
    if (allCorrectAndLocked && !completionFiredRef.current) {
      completionFiredRef.current = true;
      onBlockComplete?.(blockClientId);
      const snapshot: Record<string, { placement: CardPlacement; locked: boolean }> = {};
      for (const id of Object.keys(stateById)) {
        snapshot[id] = { placement: stateById[id].placement, locked: stateById[id].locked };
      }
      onBlockProgress?.({ blockClientId, status: "completed", data: snapshot });
    }
    if (!allCorrectAndLocked) completionFiredRef.current = false;
  }, [allCorrectAndLocked, mode, blockClientId, onBlockComplete, onBlockProgress, stateById]);

  const handleDragStart = (e: DragStartEvent) => {
    const id = e.active.id as string;
    setActiveId(id);
    setStateById((prev) => ({
      ...prev,
      [id]: { ...prev[id], lastWrong: false },
    }));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const cardId = active.id as string;
    const destination = over.id as string;
    const current = stateById[cardId];
    if (!current || current.locked) return;
    if (destination !== HOLDING_AREA_ID && !buckets.some((b) => b.client_id === destination)) {
      return;
    }
    setStateById((prev) => ({
      ...prev,
      [cardId]: {
        placement: destination === HOLDING_AREA_ID ? "holding" : destination,
        locked: false,
        lastWrong: false,
      },
    }));
  };

  const handleCheck = () => {
    setStateById((prev) => {
      const next: Record<string, PerCardState> = { ...prev };
      for (const c of cards) {
        const s = prev[c.client_id];
        if (!s || s.placement === "holding") continue;
        const isCorrect =
          c.correct_bucket_id !== null && s.placement === c.correct_bucket_id;
        if (isCorrect) {
          next[c.client_id] = { placement: s.placement, locked: true, lastWrong: false };
        } else {
          next[c.client_id] = { placement: "holding", locked: false, lastWrong: true };
        }
      }
      return next;
    });
  };

  const handleReset = () => {
    setStateById(initialState());
    if (mode === "trainee" && typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(sessionKey);
      } catch {
        /* ignore */
      }
    }
  };

  if (cards.length === 0 || buckets.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        Add at least {MIN_BUCKETS_FOR_RENDER} buckets and {MIN_CARDS_FOR_RENDER} cards to see the sort.
      </div>
    );
  }

  const cardsInBucket = (bucketId: string) =>
    cards.filter((c) => stateById[c.client_id]?.placement === bucketId);

  const cardsInHolding = cards.filter((c) => stateById[c.client_id]?.placement === "holding");

  const activeCard = activeId ? cards.find((c) => c.client_id === activeId) ?? null : null;
  const activeState = activeId ? stateById[activeId] ?? null : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="bw-cardsort-shell">
        <div className="bw-cardsort-progress">
          {allCorrectAndLocked
            ? "All cards placed correctly"
            : `${cards.length - cardsInHolding.length} of ${cards.length} cards placed`}
        </div>

        <div
          className="bw-cardsort-buckets"
          data-bucket-count={Math.min(Math.max(buckets.length, 2), 4)}
        >
          {buckets.map((bucket) => {
            const bucketStyle: CSSProperties = bucket.outline_color
              ? { borderColor: bucket.outline_color }
              : {};
            const titleStyle: CSSProperties = bucket.outline_color
              ? { color: bucket.outline_color }
              : {};
            return (
              <CardSortDroppable
                key={bucket.client_id}
                id={bucket.client_id}
                className="bw-cardsort-bucket"
                style={bucketStyle}
              >
                <div className="bw-cardsort-bucket-title-wrap">
                  <div className="bw-cardsort-bucket-title" style={titleStyle}>
                    {bucket.title || (
                      <span className="bw-cardsort-bucket-untitled">Untitled bucket</span>
                    )}
                  </div>
                  {bucket.description && (
                    <div className="bw-cardsort-bucket-description">{bucket.description}</div>
                  )}
                </div>

                <div className="bw-cardsort-bucket-cards">
                  {cardsInBucket(bucket.client_id).map((card) => (
                    <CardSortDraggableCard
                      key={card.client_id}
                      card={card}
                      state={stateById[card.client_id]}
                      buckets={buckets}
                      urlMap={urlMap}
                    />
                  ))}
                </div>
              </CardSortDroppable>
            );
          })}
        </div>

        <CardSortDroppable id={HOLDING_AREA_ID} className="bw-cardsort-holding">
          <div className="bw-cardsort-holding-label">
            {cardsInHolding.length > 0 ? "Drag cards into a bucket" : "Holding area (empty)"}
          </div>
          <div className="bw-cardsort-holding-cards">
            {cardsInHolding.map((card) => (
              <CardSortDraggableCard
                key={card.client_id}
                card={card}
                state={stateById[card.client_id]}
                buckets={buckets}
                urlMap={urlMap}
              />
            ))}
          </div>
        </CardSortDroppable>

        <div className="bw-cardsort-controls">
          {!allCorrectAndLocked ? (
            <Button
              type="button"
              onClick={handleCheck}
              disabled={!allCardsPlaced}
              style={
                allCardsPlaced
                  ? { backgroundColor: "#F5741A", color: "#FFFFFF" }
                  : undefined
              }
            >
              Check my answers
            </Button>
          ) : (
            <div className="bw-cardsort-done">
              <p>All cards sorted correctly.</p>
              <button
                type="button"
                onClick={handleReset}
                className="bw-cardsort-done-reset underline"
                style={{ color: "#F5741A" }}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeCard && activeState ? (
          <CardSortDraggableCard
            card={activeCard}
            state={activeState}
            buckets={buckets}
            urlMap={urlMap}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// === Session 70: scenario renderer ===

type ScenarioChoiceConfig = {
  client_id: string;
  choice_text: string;
  outcome_markdown: TipTapDocJSON | null;
};

type ScenarioMomentConfig = {
  client_id: string;
  moment_label: string | null;
  setup_markdown: TipTapDocJSON | null;
  setup_image_asset_id: string | null;
  prompt_type: "multiple_choice" | "reflection";
  choices: ScenarioChoiceConfig[] | null;
  reflection_prompt: string | null;
  outcome_markdown: TipTapDocJSON | null;
};

const REFLECTION_MAX_CHARS = 2000;

type ScenarioPersistedState = {
  cursorIdx: number;
  reflectionResponses: Record<string, string>;
  choiceSelected: Record<string, string>;
};

function ScenarioRender({
  title,
  introMarkdown,
  moments,
  urlMap,
  mode,
  blockClientId,
  onBlockComplete,
  onBlockProgress,
}: {
  title: string | null;
  introMarkdown: TipTapDocJSON | null;
  moments: ScenarioMomentConfig[];
  gatingRequired: boolean;
  urlMap: Map<string, string>;
  mode?: "editor" | "trainee";
  blockClientId: string;
  onBlockComplete?: OnBlockComplete;
  onBlockProgress?: OnBlockProgress;
}) {
  const sessionKey = `scenario-pos:${blockClientId}`;

  const [cursorIdx, setCursorIdx] = useState(0);
  const [reflectionResponses, setReflectionResponses] = useState<Record<string, string>>({});
  const [choiceSelected, setChoiceSelected] = useState<Record<string, string>>({});
  const [modalOutcome, setModalOutcome] = useState<TipTapDocJSON | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const continueBtnRef = useRef<HTMLButtonElement | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (mode !== "trainee" || typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(sessionKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ScenarioPersistedState>;
      const validMomentIds = new Set(moments.map((m) => m.client_id));
      if (
        typeof parsed.cursorIdx === "number" &&
        parsed.cursorIdx >= 0 &&
        parsed.cursorIdx <= moments.length
      ) {
        setCursorIdx(parsed.cursorIdx);
      }
      if (parsed.reflectionResponses && typeof parsed.reflectionResponses === "object") {
        const filtered: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed.reflectionResponses)) {
          if (validMomentIds.has(k) && typeof v === "string") filtered[k] = v;
        }
        setReflectionResponses(filtered);
      }
      if (parsed.choiceSelected && typeof parsed.choiceSelected === "object") {
        const filtered: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed.choiceSelected)) {
          if (validMomentIds.has(k) && typeof v === "string") filtered[k] = v;
        }
        setChoiceSelected(filtered);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, mode]);

  useEffect(() => {
    if (mode !== "trainee" || typeof window === "undefined") return;
    try {
      const payload: ScenarioPersistedState = {
        cursorIdx,
        reflectionResponses,
        choiceSelected,
      };
      window.sessionStorage.setItem(sessionKey, JSON.stringify(payload));
    } catch {
      /* ignore quota */
    }
  }, [cursorIdx, reflectionResponses, choiceSelected, sessionKey, mode]);

  const momentIdsKey = moments.map((m) => m.client_id).join("|");
  useEffect(() => {
    if (mode === "trainee") return;
    setCursorIdx(0);
    setReflectionResponses({});
    setChoiceSelected({});
    setModalOpen(false);
    setModalOutcome(null);
  }, [momentIdsKey, mode]);

  useEffect(() => {
    if (!modalOpen) return;
    const t = window.setTimeout(() => {
      continueBtnRef.current?.focus();
    }, 30);
    return () => window.clearTimeout(t);
  }, [modalOpen]);

  if (moments.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
        Add at least one moment to see the scenario.
      </div>
    );
  }

  const allDone = cursorIdx >= moments.length;
  const current = !allDone ? moments[cursorIdx] : null;
  const currentImageUrl =
    current?.setup_image_asset_id ? urlMap.get(current.setup_image_asset_id) ?? null : null;

  const completionFiredRef = useRef(false);
  useEffect(() => {
    if (mode !== "trainee") return;
    if (allDone && !completionFiredRef.current && moments.length > 0) {
      completionFiredRef.current = true;
      onBlockComplete?.(blockClientId);
      onBlockProgress?.({
        blockClientId,
        status: "completed",
        data: { cursorIdx, reflectionResponses, choiceSelected },
      });
    }
    if (!allDone) completionFiredRef.current = false;
  }, [allDone, mode, blockClientId, onBlockComplete, onBlockProgress, moments.length, cursorIdx, reflectionResponses, choiceSelected]);

  const openOutcome = (outcomeDoc: TipTapDocJSON | null) => {
    setModalOutcome(outcomeDoc);
    setModalOpen(true);
  };

  const handleChoicePick = (choice: ScenarioChoiceConfig) => {
    if (!current) return;
    setChoiceSelected((prev) => ({ ...prev, [current.client_id]: choice.client_id }));
    openOutcome(choice.outcome_markdown ?? null);
  };

  const handleReflectionSubmit = () => {
    if (!current) return;
    openOutcome(current.outcome_markdown ?? null);
  };

  const handleContinue = () => {
    setModalOpen(false);
    setCursorIdx((i) => i + 1);
  };

  const handleReplay = () => {
    setCursorIdx(0);
    setReflectionResponses({});
    setChoiceSelected({});
    setModalOpen(false);
    setModalOutcome(null);
    if (mode === "trainee" && typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(sessionKey);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="bw-scenario-shell">
      {title && <h3 className="bw-scenario-title">{title}</h3>}

      {introMarkdown && (
        <div className="bw-scenario-intro">
          <ReadOnlyTipTap json={introMarkdown} />
        </div>
      )}

      <div className="bw-scenario-progress">
        {allDone
          ? `Scenario complete · ${moments.length} moment${moments.length === 1 ? "" : "s"}`
          : `Moment ${cursorIdx + 1} of ${moments.length}`}
      </div>

      {current && (
        <div className="bw-scenario-moment">
          {current.moment_label && (
            <div className="bw-scenario-moment-label">{current.moment_label}</div>
          )}

          {currentImageUrl && (
            <img
              src={currentImageUrl}
              alt=""
              className="bw-scenario-setup-image"
            />
          )}

          <div className="bw-scenario-setup">
            <ReadOnlyTipTap json={current.setup_markdown ?? null} />
          </div>

          {current.prompt_type === "multiple_choice" && (
            <div className="bw-scenario-choices">
              {(current.choices ?? []).map((choice) => (
                <button
                  key={choice.client_id}
                  type="button"
                  className="bw-scenario-choice"
                  onClick={() => handleChoicePick(choice)}
                >
                  {choice.choice_text || (
                    <span className="bw-scenario-choice-untitled">(Untitled choice)</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {current.prompt_type === "reflection" && (
            <div className="bw-scenario-reflection">
              {current.reflection_prompt && (
                <p className="bw-scenario-reflection-prompt">{current.reflection_prompt}</p>
              )}
              <Textarea
                value={reflectionResponses[current.client_id] ?? ""}
                onChange={(e) =>
                  setReflectionResponses((prev) => ({
                    ...prev,
                    [current.client_id]: e.target.value.slice(0, REFLECTION_MAX_CHARS),
                  }))
                }
                maxLength={REFLECTION_MAX_CHARS}
                rows={5}
                placeholder="Your reflection…"
                className="bw-scenario-reflection-textarea"
              />
              <div className="bw-scenario-reflection-meta">
                <span>
                  {(reflectionResponses[current.client_id] ?? "").length} / {REFLECTION_MAX_CHARS}
                </span>
                <Button
                  type="button"
                  onClick={handleReflectionSubmit}
                  disabled={
                    (reflectionResponses[current.client_id] ?? "").trim().length === 0
                  }
                  style={{ backgroundColor: "#F5741A", color: "white" }}
                >
                  Submit reflection
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {allDone && (
        <div className="bw-scenario-done">
          <p>You've finished the scenario.</p>
          <button
            type="button"
            onClick={handleReplay}
            className="bw-scenario-done-reset underline"
            style={{ color: "#F5741A" }}
          >
            Replay scenario
          </button>
        </div>
      )}

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) handleContinue();
        }}
      >
        <DialogContent
          className="max-w-lg"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Outcome</DialogTitle>
          </DialogHeader>
          <div className="bw-scenario-modal-body">
            <ReadOnlyTipTap json={modalOutcome} />
          </div>
          <DialogFooter>
            <Button
              ref={continueBtnRef}
              type="button"
              onClick={handleContinue}
              style={{ backgroundColor: "#F5741A", color: "white" }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// === Session 71: knowledge_check renderer ===

type KCChoice = { client_id: string; choice_text: string; is_correct: boolean };
type KCBlank = { client_id: string; correct_value: string; acceptable_alternatives: string[] };
type KCPair = { client_id: string; left: string; right: string };
type KCRankItem = { client_id: string; item_text: string };
type KCTimelineEvent = { client_id: string; event_label: string };

type KnowledgeCheckQuestionConfig = {
  client_id: string;
  question_type:
    | "multiple_choice"
    | "multi_select"
    | "true_false"
    | "fill_in_blank"
    | "match"
    | "ranking"
    | "timeline";
  prompt_markdown: TipTapDocJSON | null;
  explanation_markdown: TipTapDocJSON | null;
  choices?: KCChoice[];
  blanks?: KCBlank[];
  pairs?: KCPair[];
  items?: KCRankItem[];
  events?: KCTimelineEvent[];
};

type KCPerQuestionState = {
  selectedSingle: string | null;
  selectedMulti: string[];
  blankValues: Record<string, string>;
  matchLinks: Record<string, string>;
  rankOrder: string[];
  timelineOrder: string[];
  revealed: boolean;
  lastWrong: boolean;
  /** True once trainee has clicked Check on this question at least once. */
  attempted: boolean;
};

const KC_IMPLEMENTED_TYPES = new Set([
  "multiple_choice",
  "multi_select",
  "true_false",
  "fill_in_blank",
  "match",
  "ranking",
  "timeline",
]);

function emptyKCState(): KCPerQuestionState {
  return {
    selectedSingle: null,
    selectedMulti: [],
    blankValues: {},
    matchLinks: {},
    rankOrder: [],
    timelineOrder: [],
    revealed: false,
    lastWrong: false,
    attempted: false,
  };
}

function stableShuffle<T extends { client_id: string }>(items: T[], seed: string): T[] {
  const hashStr = (s: string): number => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return h;
  };
  return [...items].sort((a, b) => hashStr(seed + a.client_id) - hashStr(seed + b.client_id));
}

function KnowledgeCheckRender({
  questions,
  mode,
  blockClientId,
  onBlockComplete,
  onBlockProgress,
}: {
  questions: KnowledgeCheckQuestionConfig[];
  gatingRequired: boolean;
  mode?: "editor" | "trainee";
  blockClientId: string;
  onBlockComplete?: OnBlockComplete;
  onBlockProgress?: OnBlockProgress;
}) {
  const sessionKey = `knowledge_check-pos:${blockClientId}`;

  const initialState = (): Record<string, KCPerQuestionState> => {
    const out: Record<string, KCPerQuestionState> = {};
    for (const q of questions) {
      const s = emptyKCState();
      if (q.question_type === "ranking" && (q.items ?? []).length > 0) {
        s.rankOrder = stableShuffle(q.items ?? [], `${blockClientId}:${q.client_id}`).map(
          (i) => i.client_id,
        );
      } else if (q.question_type === "timeline" && (q.events ?? []).length > 0) {
        s.timelineOrder = stableShuffle(q.events ?? [], `${blockClientId}:${q.client_id}`).map(
          (e) => e.client_id,
        );
      }
      out[q.client_id] = s;
    }
    return out;
  };

  const [stateById, setStateById] = useState<Record<string, KCPerQuestionState>>(initialState);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (mode !== "trainee" || typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(sessionKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      const next: Record<string, KCPerQuestionState> = {};
      for (const q of questions) {
        const prior = parsed[q.client_id];
        if (prior && typeof prior === "object") {
          next[q.client_id] = {
            selectedSingle: typeof prior.selectedSingle === "string" ? prior.selectedSingle : null,
            selectedMulti: Array.isArray(prior.selectedMulti)
              ? prior.selectedMulti.filter((s: any) => typeof s === "string")
              : [],
            blankValues:
              prior.blankValues && typeof prior.blankValues === "object" ? prior.blankValues : {},
            matchLinks:
              prior.matchLinks && typeof prior.matchLinks === "object" ? prior.matchLinks : {},
            rankOrder: Array.isArray(prior.rankOrder)
              ? prior.rankOrder.filter((s: any) => typeof s === "string")
              : [],
            timelineOrder: Array.isArray(prior.timelineOrder)
              ? prior.timelineOrder.filter((s: any) => typeof s === "string")
              : [],
            revealed: prior.revealed === true,
            lastWrong: false,
            attempted: prior.attempted === true || prior.revealed === true,
          };
        } else {
          next[q.client_id] = emptyKCState();
        }
      }
      // Reconcile ranking/timeline order against current items/events; seed if empty.
      for (const q of questions) {
        const s = next[q.client_id];
        if (!s) continue;
        if (q.question_type === "ranking") {
          if (s.rankOrder.length === 0 && (q.items ?? []).length > 0) {
            s.rankOrder = stableShuffle(q.items ?? [], `${blockClientId}:${q.client_id}`).map(
              (i) => i.client_id,
            );
          } else {
            const validIds = new Set((q.items ?? []).map((i) => i.client_id));
            s.rankOrder = s.rankOrder.filter((id) => validIds.has(id));
            for (const it of q.items ?? []) {
              if (!s.rankOrder.includes(it.client_id)) s.rankOrder.push(it.client_id);
            }
          }
        } else if (q.question_type === "timeline") {
          if (s.timelineOrder.length === 0 && (q.events ?? []).length > 0) {
            s.timelineOrder = stableShuffle(q.events ?? [], `${blockClientId}:${q.client_id}`).map(
              (e) => e.client_id,
            );
          } else {
            const validIds = new Set((q.events ?? []).map((e) => e.client_id));
            s.timelineOrder = s.timelineOrder.filter((id) => validIds.has(id));
            for (const ev of q.events ?? []) {
              if (!s.timelineOrder.includes(ev.client_id)) s.timelineOrder.push(ev.client_id);
            }
          }
        }
      }
      setStateById(next);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, mode]);

  useEffect(() => {
    if (mode !== "trainee" || typeof window === "undefined") return;
    try {
      const payload: Record<string, any> = {};
      for (const id of Object.keys(stateById)) {
        const s = stateById[id];
        payload[id] = {
          selectedSingle: s.selectedSingle,
          selectedMulti: s.selectedMulti,
          blankValues: s.blankValues,
          matchLinks: s.matchLinks,
          rankOrder: s.rankOrder,
          timelineOrder: s.timelineOrder,
          revealed: s.revealed,
        };
      }
      window.sessionStorage.setItem(sessionKey, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [stateById, sessionKey, mode]);

  const questionIdsKey = questions.map((q) => q.client_id).join("|");
  useEffect(() => {
    if (mode === "trainee") return;
    setStateById(initialState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIdsKey, mode]);

  if (questions.length === 0) {
    return (
      <div className="bw-kc-not-implemented">
        Add at least one question to see the knowledge check.
      </div>
    );
  }

  const handleSingleSelect = (qId: string, choiceId: string) => {
    setStateById((prev) => {
      const s = prev[qId];
      if (!s || s.revealed) return prev;
      return { ...prev, [qId]: { ...s, selectedSingle: choiceId, lastWrong: false } };
    });
  };

  const handleMultiToggle = (qId: string, choiceId: string) => {
    setStateById((prev) => {
      const s = prev[qId];
      if (!s || s.revealed) return prev;
      const has = s.selectedMulti.includes(choiceId);
      const nextMulti = has
        ? s.selectedMulti.filter((c) => c !== choiceId)
        : [...s.selectedMulti, choiceId];
      return { ...prev, [qId]: { ...s, selectedMulti: nextMulti, lastWrong: false } };
    });
  };

  const handleBlankChange = (qId: string, blankId: string, value: string) => {
    setStateById((prev) => {
      const s = prev[qId];
      if (!s || s.revealed) return prev;
      return {
        ...prev,
        [qId]: {
          ...s,
          blankValues: { ...s.blankValues, [blankId]: value },
          lastWrong: false,
        },
      };
    });
  };

  const handleMatchLink = (qId: string, leftId: string, rightId: string) => {
    setStateById((prev) => {
      const s = prev[qId];
      if (!s || s.revealed) return prev;
      const newLinks = { ...s.matchLinks, [leftId]: rightId };
      return { ...prev, [qId]: { ...s, matchLinks: newLinks, lastWrong: false } };
    });
  };

  const handleMatchClear = (qId: string, leftId: string) => {
    setStateById((prev) => {
      const s = prev[qId];
      if (!s || s.revealed) return prev;
      const next = { ...s.matchLinks };
      delete next[leftId];
      return { ...prev, [qId]: { ...s, matchLinks: next, lastWrong: false } };
    });
  };

  const handleRankReorder = (qId: string, fromIdx: number, toIdx: number) => {
    setStateById((prev) => {
      const s = prev[qId];
      if (!s || s.revealed) return prev;
      const next = [...s.rankOrder];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { ...prev, [qId]: { ...s, rankOrder: next, lastWrong: false } };
    });
  };

  const handleTimelineReorder = (qId: string, fromIdx: number, toIdx: number) => {
    setStateById((prev) => {
      const s = prev[qId];
      if (!s || s.revealed) return prev;
      const next = [...s.timelineOrder];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { ...prev, [qId]: { ...s, timelineOrder: next, lastWrong: false } };
    });
  };

  const handleCheck = (q: KnowledgeCheckQuestionConfig) => {
    const s = stateById[q.client_id];
    if (!s) return;
    let correct = false;
    if (q.question_type === "multiple_choice" || q.question_type === "true_false") {
      const picked = (q.choices ?? []).find((c) => c.client_id === s.selectedSingle);
      correct = picked?.is_correct === true;
    } else if (q.question_type === "multi_select") {
      const correctIds = new Set((q.choices ?? []).filter((c) => c.is_correct).map((c) => c.client_id));
      const pickedIds = new Set(s.selectedMulti);
      correct =
        correctIds.size === pickedIds.size && [...correctIds].every((id) => pickedIds.has(id));
    } else if (q.question_type === "fill_in_blank") {
      const blanks = q.blanks ?? [];
      correct =
        blanks.length > 0 &&
        blanks.every((b) => {
          const typed = (s.blankValues[b.client_id] ?? "").trim().toLowerCase();
          if (typed.length === 0) return false;
          if (typed === b.correct_value.trim().toLowerCase()) return true;
          return b.acceptable_alternatives.some((alt) => typed === alt.trim().toLowerCase());
        });
    } else if (q.question_type === "match") {
      const pairs = q.pairs ?? [];
      correct = pairs.length > 0 && pairs.every((p) => s.matchLinks[p.client_id] === p.client_id);
    } else if (q.question_type === "ranking") {
      const correctOrder = (q.items ?? []).map((i) => i.client_id);
      correct =
        s.rankOrder.length === correctOrder.length &&
        s.rankOrder.every((id, idx) => id === correctOrder[idx]);
    } else if (q.question_type === "timeline") {
      const correctOrder = (q.events ?? []).map((e) => e.client_id);
      correct =
        s.timelineOrder.length === correctOrder.length &&
        s.timelineOrder.every((id, idx) => id === correctOrder[idx]);
    }
    setStateById((prev) => ({
      ...prev,
      [q.client_id]: {
        ...s,
        revealed: correct ? true : s.revealed,
        lastWrong: !correct,
        attempted: true,
      },
    }));
  };

  const allCorrect = questions.every((q) => stateById[q.client_id]?.revealed === true);
  const allAttempted =
    questions.length > 0 &&
    questions.every((q) => stateById[q.client_id]?.attempted === true);

  // Fire onBlockComplete + reportProgress once when every question has been
  // attempted (clicked Check at least once, right or wrong). Do NOT gate on
  // allCorrect — that would block the lesson behind a perfect score.
  const completionFiredRef = useRef(false);
  useEffect(() => {
    if (mode !== "trainee") return;
    if (allAttempted && !completionFiredRef.current) {
      completionFiredRef.current = true;
      onBlockComplete?.(blockClientId);
      onBlockProgress?.({
        blockClientId,
        status: "completed",
        data: { stateById },
      });
    }
    if (!allAttempted) completionFiredRef.current = false;
  }, [allAttempted, mode, blockClientId, onBlockComplete, onBlockProgress, stateById]);

  return (
    <div className="bw-kc-shell">
      {questions.map((q, idx) => {
        const s = stateById[q.client_id] ?? emptyKCState();
        const isImplemented = KC_IMPLEMENTED_TYPES.has(q.question_type);
        const choices = q.choices ?? [];
        const canCheck =
          isImplemented &&
          (q.question_type === "multi_select"
            ? s.selectedMulti.length > 0
            : q.question_type === "fill_in_blank"
              ? (q.blanks ?? []).every(
                  (b) => (s.blankValues[b.client_id] ?? "").trim().length > 0,
                )
              : q.question_type === "match"
                ? (q.pairs ?? []).every((p) => s.matchLinks[p.client_id] !== undefined)
                : q.question_type === "ranking"
                  ? s.rankOrder.length === (q.items ?? []).length
                  : q.question_type === "timeline"
                    ? s.timelineOrder.length === (q.events ?? []).length
                    : s.selectedSingle !== null);

        return (
          <div key={q.client_id} className="bw-kc-question">
            <div className="bw-kc-question-number">
              Question {idx + 1} of {questions.length}
            </div>
            <div className="bw-kc-prompt">
              <ReadOnlyTipTap json={q.prompt_markdown} />
            </div>

            {!isImplemented && (
              <div className="bw-kc-not-implemented">
                This question type isn&apos;t supported yet in the trainee view.
              </div>
            )}

            {isImplemented &&
              (q.question_type === "multiple_choice" || q.question_type === "true_false") && (
                <div className="bw-kc-choices">
                  {choices.map((c) => {
                    const selected = s.selectedSingle === c.client_id;
                    const showCorrect = s.revealed && c.is_correct;
                    const showWrongPick = s.lastWrong && selected && !c.is_correct;
                    const cls = [
                      "bw-kc-choice",
                      selected ? "is-selected" : "",
                      showCorrect ? "is-correct" : "",
                      showWrongPick ? "is-wrong" : "",
                      s.revealed ? "is-locked" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <button
                        key={c.client_id}
                        type="button"
                        className={cls}
                        onClick={() => handleSingleSelect(q.client_id, c.client_id)}
                        disabled={s.revealed}
                      >
                        {c.choice_text}
                      </button>
                    );
                  })}
                </div>
              )}

            {isImplemented && q.question_type === "multi_select" && (
              <div className="bw-kc-choices">
                {choices.map((c) => {
                  const selected = s.selectedMulti.includes(c.client_id);
                  const showCorrect = s.revealed && c.is_correct;
                  const showWrongPick = s.lastWrong && selected && !c.is_correct;
                  const showMissed = s.lastWrong && !selected && c.is_correct;
                  const cls = [
                    "bw-kc-choice",
                    selected ? "is-selected" : "",
                    showCorrect ? "is-correct" : "",
                    showWrongPick ? "is-wrong" : "",
                    showMissed ? "is-missed" : "",
                    s.revealed ? "is-locked" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <button
                      key={c.client_id}
                      type="button"
                      className={cls}
                      onClick={() => handleMultiToggle(q.client_id, c.client_id)}
                      disabled={s.revealed}
                    >
                      {c.choice_text}
                    </button>
                  );
                })}
              </div>
            )}

            {isImplemented && q.question_type === "fill_in_blank" && (
              <div className="bw-kc-blanks">
                {(q.blanks ?? []).map((b, bi) => {
                  const typed = s.blankValues[b.client_id] ?? "";
                  const trimmedTyped = typed.trim().toLowerCase();
                  const isMatch =
                    trimmedTyped === b.correct_value.trim().toLowerCase() ||
                    b.acceptable_alternatives.some(
                      (alt) => trimmedTyped === alt.trim().toLowerCase(),
                    );
                  const cls = [
                    "bw-kc-blank-input",
                    s.revealed ? "is-revealed" : "",
                    s.lastWrong && !isMatch ? "is-wrong" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <div key={b.client_id} className="bw-kc-blank-row">
                      <span className="bw-kc-blank-label">Blank {bi + 1}</span>
                      <Input
                        value={typed}
                        onChange={(e) =>
                          handleBlankChange(q.client_id, b.client_id, e.target.value)
                        }
                        disabled={s.revealed}
                        className={cls}
                        placeholder="Type your answer"
                      />
                      {s.revealed && (
                        <span className="bw-kc-blank-correct">{b.correct_value}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {isImplemented && q.question_type === "match" && (
              <MatchTrainee
                question={q}
                state={s}
                onLink={(leftId, rightId) => handleMatchLink(q.client_id, leftId, rightId)}
                onClear={(leftId) => handleMatchClear(q.client_id, leftId)}
              />
            )}

            {isImplemented && q.question_type === "ranking" && (
              <RankingTrainee
                question={q}
                state={s}
                onReorder={(from, to) => handleRankReorder(q.client_id, from, to)}
              />
            )}

            {isImplemented && q.question_type === "timeline" && (
              <TimelineTrainee
                question={q}
                state={s}
                onReorder={(from, to) => handleTimelineReorder(q.client_id, from, to)}
              />
            )}

            {isImplemented && (
              <div className="bw-kc-controls">
                {!s.revealed ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleCheck(q)}
                    disabled={!canCheck}
                    style={{ backgroundColor: "#F5741A", color: "white" }}
                  >
                    Check answer
                  </Button>
                ) : (
                  <span className="bw-kc-correct-pill">✓ Correct</span>
                )}
                {s.lastWrong && !s.revealed && (
                  <span className="bw-kc-wrong-pill">Not quite — try again</span>
                )}
              </div>
            )}

            {s.revealed && q.explanation_markdown && (
              <div className="bw-kc-explanation">
                <ReadOnlyTipTap json={q.explanation_markdown} />
              </div>
            )}
          </div>
        );
      })}

      {allCorrect && questions.length > 0 && (
        <div className="bw-kc-done">All questions answered correctly.</div>
      )}
    </div>
  );
}

function MatchTrainee({
  question,
  state,
  onLink,
  onClear,
}: {
  question: KnowledgeCheckQuestionConfig;
  state: KCPerQuestionState;
  onLink: (leftId: string, rightId: string) => void;
  onClear: (leftId: string) => void;
}) {
  const [activeLeftId, setActiveLeftId] = useState<string | null>(null);
  const pairs = question.pairs ?? [];

  const rightsSorted = [...pairs].sort((a, b) =>
    a.client_id < b.client_id ? -1 : a.client_id > b.client_id ? 1 : 0,
  );

  const rightLinkedTo: Record<string, string> = {};
  for (const [leftId, rightId] of Object.entries(state.matchLinks)) {
    rightLinkedTo[rightId] = leftId;
  }

  const handleLeftClick = (leftId: string) => {
    if (state.revealed) return;
    if (state.matchLinks[leftId]) {
      onClear(leftId);
      setActiveLeftId(null);
      return;
    }
    setActiveLeftId(activeLeftId === leftId ? null : leftId);
  };

  const handleRightClick = (rightId: string) => {
    if (state.revealed) return;
    if (!activeLeftId) return;
    const priorLeftForThisRight = rightLinkedTo[rightId];
    if (priorLeftForThisRight && priorLeftForThisRight !== activeLeftId) {
      onClear(priorLeftForThisRight);
    }
    onLink(activeLeftId, rightId);
    setActiveLeftId(null);
  };

  return (
    <div className="bw-kc-match">
      <p className="bw-kc-match-instruction">
        {activeLeftId
          ? "Now click a right item to link it."
          : "Click a left item, then click its matching right item."}
      </p>
      <div className="bw-kc-match-grid">
        <div className="bw-kc-match-col">
          {pairs.map((p) => {
            const linkedRightId = state.matchLinks[p.client_id];
            const linkedRight = linkedRightId
              ? pairs.find((pp) => pp.client_id === linkedRightId)
              : null;
            const isActive = activeLeftId === p.client_id;
            const isCorrect = state.revealed && linkedRightId === p.client_id;
            const isWrong =
              state.lastWrong && linkedRightId !== undefined && linkedRightId !== p.client_id;
            const cls = [
              "bw-kc-match-left",
              isActive ? "is-active" : "",
              isCorrect ? "is-correct" : "",
              isWrong ? "is-wrong" : "",
              state.revealed ? "is-locked" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={p.client_id}
                type="button"
                className={cls}
                onClick={() => handleLeftClick(p.client_id)}
                disabled={state.revealed}
              >
                <span className="bw-kc-match-text">{p.left}</span>
                {linkedRight && (
                  <span className="bw-kc-match-link-indicator">→ {linkedRight.right}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="bw-kc-match-col">
          {rightsSorted.map((p) => {
            const linkedLeftId = rightLinkedTo[p.client_id];
            const isLinked = !!linkedLeftId;
            const isAvailableTarget = !!activeLeftId && !state.revealed;
            const cls = [
              "bw-kc-match-right",
              isLinked ? "is-linked" : "",
              isAvailableTarget ? "is-target" : "",
              state.revealed ? "is-locked" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={p.client_id}
                type="button"
                className={cls}
                onClick={() => handleRightClick(p.client_id)}
                disabled={state.revealed || !activeLeftId}
              >
                {p.right}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RankingTraineeItem({
  id,
  index,
  label,
  revealed,
  isCorrectPosition,
  isWrongPosition,
}: {
  id: string;
  index: number;
  label: string;
  revealed: boolean;
  isCorrectPosition: boolean;
  isWrongPosition: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: revealed,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const cls = [
    "bw-kc-rank-item",
    isCorrectPosition ? "is-correct" : "",
    isWrongPosition ? "is-wrong" : "",
    revealed ? "is-locked" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div ref={setNodeRef} style={style} className={cls} {...attributes} {...listeners}>
      <span className="bw-kc-rank-index">{index + 1}.</span>
      <span className="bw-kc-rank-label">{label}</span>
    </div>
  );
}

function RankingTrainee({
  question,
  state,
  onReorder,
}: {
  question: KnowledgeCheckQuestionConfig;
  state: KCPerQuestionState;
  onReorder: (fromIdx: number, toIdx: number) => void;
}) {
  const items = question.items ?? [];
  const itemsById = new Map(items.map((i) => [i.client_id, i]));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id).replace(/^kc-rank-trainee:/, "");
    const overId = String(over.id).replace(/^kc-rank-trainee:/, "");
    const from = state.rankOrder.indexOf(activeId);
    const to = state.rankOrder.indexOf(overId);
    if (from < 0 || to < 0) return;
    onReorder(from, to);
  };

  const correctOrder = items.map((i) => i.client_id);

  return (
    <div className="bw-kc-rank">
      <p className="bw-kc-rank-instruction">Drag items into the correct order.</p>
      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
        <SortableContext
          items={state.rankOrder.map((id) => `kc-rank-trainee:${id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="bw-kc-rank-list">
            {state.rankOrder.map((id, idx) => {
              const item = itemsById.get(id);
              if (!item) return null;
              const isCorrectPosition = state.revealed && correctOrder[idx] === id;
              const isWrongPosition = state.lastWrong && correctOrder[idx] !== id;
              return (
                <RankingTraineeItem
                  key={id}
                  id={`kc-rank-trainee:${id}`}
                  index={idx}
                  label={item.item_text}
                  revealed={state.revealed}
                  isCorrectPosition={isCorrectPosition}
                  isWrongPosition={isWrongPosition}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function TimelineTraineeItem({
  id,
  index,
  label,
  revealed,
  isCorrectPosition,
  isWrongPosition,
}: {
  id: string;
  index: number;
  label: string;
  revealed: boolean;
  isCorrectPosition: boolean;
  isWrongPosition: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: revealed,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const cls = [
    "bw-kc-timeline-event",
    isCorrectPosition ? "is-correct" : "",
    isWrongPosition ? "is-wrong" : "",
    revealed ? "is-locked" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div ref={setNodeRef} style={style} className={cls} {...attributes} {...listeners}>
      <span className="bw-kc-timeline-index">{index + 1}</span>
      <span className="bw-kc-timeline-label">{label}</span>
    </div>
  );
}

function TimelineTrainee({
  question,
  state,
  onReorder,
}: {
  question: KnowledgeCheckQuestionConfig;
  state: KCPerQuestionState;
  onReorder: (fromIdx: number, toIdx: number) => void;
}) {
  const events = question.events ?? [];
  const eventsById = new Map(events.map((e) => [e.client_id, e]));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id).replace(/^kc-timeline-trainee:/, "");
    const overId = String(over.id).replace(/^kc-timeline-trainee:/, "");
    const from = state.timelineOrder.indexOf(activeId);
    const to = state.timelineOrder.indexOf(overId);
    if (from < 0 || to < 0) return;
    onReorder(from, to);
  };

  const correctOrder = events.map((e) => e.client_id);

  return (
    <div className="bw-kc-timeline">
      <p className="bw-kc-timeline-instruction">
        Drag events into chronological order (earliest on the left).
      </p>
      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
        <SortableContext
          items={state.timelineOrder.map((id) => `kc-timeline-trainee:${id}`)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="bw-kc-timeline-track">
            {state.timelineOrder.map((id, idx) => {
              const ev = eventsById.get(id);
              if (!ev) return null;
              const isCorrectPosition = state.revealed && correctOrder[idx] === id;
              const isWrongPosition = state.lastWrong && correctOrder[idx] !== id;
              return (
                <TimelineTraineeItem
                  key={id}
                  id={`kc-timeline-trainee:${id}`}
                  index={idx}
                  label={ev.event_label}
                  revealed={state.revealed}
                  isCorrectPosition={isCorrectPosition}
                  isWrongPosition={isWrongPosition}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
