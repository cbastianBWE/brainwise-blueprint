import {
  Type,
  Heading as HeadingIcon,
  Minus,
  Image as ImageIcon,
  Video,
  Quote,
  List as ListIcon,
  AlertCircle,
  Music,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type BlockType =
  | "text"
  | "heading"
  | "divider"
  | "image"
  | "video_embed"
  | "quote"
  | "list"
  | "callout"
  | "embed_audio";

export type TipTapDocJSON = Record<string, unknown>;

export type EditorBlock = {
  client_id: string;
  block_type: BlockType;
  config: Record<string, unknown>;
};

const emptyDoc = (): TipTapDocJSON => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

export const BLOCK_TYPE_META: Record<
  BlockType,
  {
    label: string;
    description: string;
    icon: LucideIcon;
    defaultConfig: () => Record<string, unknown>;
  }
> = {
  text: {
    label: "Text",
    description: "Paragraph of rich text",
    icon: Type,
    defaultConfig: () => ({ body: emptyDoc() }),
  },
  heading: {
    label: "Heading",
    description: "Section header",
    icon: HeadingIcon,
    defaultConfig: () => ({ text: "", level: 2 }),
  },
  divider: {
    label: "Divider",
    description: "Horizontal rule",
    icon: Minus,
    defaultConfig: () => ({ color: "#021F36" }),
  },
  image: {
    label: "Image",
    description: "Upload an image",
    icon: ImageIcon,
    defaultConfig: () => ({ asset_id: null, alt: "", caption: null }),
  },
  video_embed: {
    label: "Video",
    description: "Embedded video",
    icon: Video,
    defaultConfig: () => ({
      asset_id: null,
      source_type: "supabase_storage",
      source_id: null,
      title: null,
    }),
  },
  quote: {
    label: "Quote",
    description: "Blockquote with attribution",
    icon: Quote,
    defaultConfig: () => ({ body: emptyDoc(), attribution: null }),
  },
  list: {
    label: "List",
    description: "Bullet or numbered list",
    icon: ListIcon,
    defaultConfig: () => ({
      items: [{ client_id: crypto.randomUUID(), body: emptyDoc() }],
      ordered: false,
    }),
  },
  callout: {
    label: "Callout",
    description: "Highlighted note",
    icon: AlertCircle,
    defaultConfig: () => ({ variant: "info", body: emptyDoc() }),
  },
  embed_audio: {
    label: "Audio",
    description: "Embedded audio file",
    icon: Music,
    defaultConfig: () => ({ asset_id: null, transcript: null }),
  },
};

export const IN_SCOPE_BLOCK_TYPES: BlockType[] = [
  "text",
  "heading",
  "divider",
  "image",
  "video_embed",
  "quote",
  "list",
  "callout",
  "embed_audio",
];

export const CALLOUT_COLORS: Record<string, string> = {
  info: "#006D77",
  warning: "#FFB703",
  success: "#2D6A4F",
  important: "#F5741A",
};

/** Walk a TipTap doc and concatenate all text nodes. */
export function extractTextFromTipTap(json: TipTapDocJSON | null | undefined): string {
  if (!json) return "";
  const out: string[] = [];
  const walk = (node: any) => {
    if (!node) return;
    if (typeof node.text === "string") out.push(node.text);
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(json);
  return out.join(" ").replace(/\s+/g, " ").trim();
}
