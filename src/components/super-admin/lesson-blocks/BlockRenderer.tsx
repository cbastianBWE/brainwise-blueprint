import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleWithFontSize } from "./TextStyleWithFontSize";
import { Link } from "@tiptap/extension-link";
import { useEffect, type CSSProperties } from "react";
import {
  Info,
  AlertTriangle,
  CheckCircle2,
  Star,
  Image as ImageIcon,
  Music as MusicIcon,
  Video as VideoIcon,
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
import type { EditorBlock, TipTapDocJSON } from "./blockTypeMeta";

interface BlockRendererProps {
  block: EditorBlock;
  assetUrlMap: Map<string, string>;
  mode?: "editor" | "trainee";
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

export function BlockRenderer({ block, assetUrlMap }: BlockRendererProps) {
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
  const listClass = style === "pills" ? "bw-tabs-list-pills" : "bw-tabs-list-underline";
  const triggerClass = style === "pills" ? "bw-tabs-trigger-pills" : "bw-tabs-trigger-underline";

  return (
    <Tabs defaultValue={defaultValue} className="w-full">
      <div className="bw-tabs-list-wrapper">
        <TabsList className={listClass}>
          {tabs.map((t) => (
            <TabsTrigger key={t.client_id} value={t.client_id} className={triggerClass}>
              {t.label || "(untitled)"}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((t) => (
        <TabsContent key={t.client_id} value={t.client_id} className="pt-2">
          <div className="tiptap-prose">
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
    action_type: "link" | "jump_to_block";
    url: string | null;
    target_block_client_id: string | null;
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
          const url = b.url ?? "";
          if (!url) {
            return (
              <Button key={b.client_id} {...buttonProps} disabled>
                {label}
              </Button>
            );
          }
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
