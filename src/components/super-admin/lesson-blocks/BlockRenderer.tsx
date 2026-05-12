import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleWithFontSize } from "./TextStyleWithFontSize";
import { Link } from "@tiptap/extension-link";
import { useEffect } from "react";
import {
  Info,
  AlertTriangle,
  CheckCircle2,
  Star,
  Image as ImageIcon,
  Music as MusicIcon,
  Video as VideoIcon,
} from "lucide-react";
import type { EditorBlock, TipTapDocJSON } from "./blockTypeMeta";

interface BlockRendererProps {
  block: EditorBlock;
  assetUrlMap: Map<string, string>;
  mode?: "editor" | "trainee";
}

function ReadOnlyTipTap({ json }: { json: TipTapDocJSON | null | undefined }) {
  const editor = useEditor({
    editable: false,
    extensions: [StarterKit, TextStyle, Link.configure({ openOnClick: true })],
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

function ListRender({ items, ordered }: { items: any[]; ordered: boolean }) {
  const ListTag = (ordered ? "ol" : "ul") as "ol" | "ul";
  return (
    <div className="tiptap-prose prose-base max-w-none">
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

export function BlockRenderer({ block, assetUrlMap }: BlockRendererProps) {
  const cfg: any = block.config ?? {};
  switch (block.block_type) {
    case "text":
      return <ReadOnlyTipTap json={cfg.body} />;
    case "heading":
      return <HeadingRender text={cfg.text ?? ""} level={cfg.level ?? 2} />;
    case "divider": {
      const dividerColor = (cfg.color as string | undefined) || "#021F36";
      return (
        <div className="my-4">
          <div
            className="h-[3px] w-full rounded-full"
            style={{ background: dividerColor }}
          />
        </div>
      );
    }
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
      return <ListRender items={cfg.items ?? []} ordered={!!cfg.ordered} />;
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
    default:
      return null;
  }
}
