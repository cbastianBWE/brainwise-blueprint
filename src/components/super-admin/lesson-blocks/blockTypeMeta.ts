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
  Hash as HashIcon,
  Columns2 as ColumnsIcon,
  ListCollapse as AccordionIcon,
  LayoutPanelTop as TabsIcon,
  MousePointerClick as ButtonStackIcon,
  Layers,
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
  | "embed_audio"
  | "stat_callout"
  | "statement_a_b"
  | "accordion"
  | "tabs"
  | "button_stack"
  | "flashcards";

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
    defaultConfig: () => ({ body: emptyDoc(), background_color: null, padding: "none" }),
  },
  heading: {
    label: "Heading",
    description: "Section header",
    icon: HeadingIcon,
    defaultConfig: () => ({ text: "", level: 2, background_color: null, padding: "none" }),
  },
  divider: {
    label: "Divider",
    description: "Horizontal rule",
    icon: Minus,
    defaultConfig: () => ({ color: "#021F36", background_color: null, padding: "none" }),
  },
  image: {
    label: "Image",
    description: "Upload an image",
    icon: ImageIcon,
    defaultConfig: () => ({ asset_id: null, alt: "", caption: null, background_color: null, padding: "none" }),
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
      background_color: null,
      padding: "none",
    }),
  },
  quote: {
    label: "Quote",
    description: "Blockquote with attribution",
    icon: Quote,
    defaultConfig: () => ({ body: emptyDoc(), attribution: null, background_color: null, padding: "none" }),
  },
  list: {
    label: "List",
    description: "Bullet or numbered list",
    icon: ListIcon,
    defaultConfig: () => ({
      items: [{ client_id: crypto.randomUUID(), body: emptyDoc() }],
      ordered: false,
      background_color: null,
      padding: "none",
    }),
  },
  callout: {
    label: "Callout",
    description: "Highlighted note",
    icon: AlertCircle,
    defaultConfig: () => ({ variant: "info", body: emptyDoc(), background_color: null, padding: "none" }),
  },
  embed_audio: {
    label: "Audio",
    description: "Embedded audio file",
    icon: Music,
    defaultConfig: () => ({ asset_id: null, transcript: null, background_color: null, padding: "none" }),
  },
  stat_callout: {
    label: "Stat callout",
    description: "Anchor a number with a label",
    icon: HashIcon,
    defaultConfig: () => ({
      stat: "",
      label: "",
      body: emptyDoc(),
      background_color: null,
      padding: "none",
    }),
  },
  statement_a_b: {
    label: "Statement A/B",
    description: "Side-by-side contrast",
    icon: ColumnsIcon,
    defaultConfig: () => ({
      a_label: "",
      a_body: emptyDoc(),
      b_label: "",
      b_body: emptyDoc(),
      variant: "contrast",
      background_color: null,
      padding: "none",
    }),
  },
  accordion: {
    label: "Accordion",
    description: "Collapsible sections",
    icon: AccordionIcon,
    defaultConfig: () => ({
      items: [
        { client_id: crypto.randomUUID(), title: "", body: emptyDoc() },
        { client_id: crypto.randomUUID(), title: "", body: emptyDoc() },
      ],
      background_color: null,
      padding: "none",
    }),
  },
  tabs: {
    label: "Tabs",
    description: "Parallel content branches",
    icon: TabsIcon,
    defaultConfig: () => ({
      tabs: [
        { client_id: crypto.randomUUID(), label: "Tab 1", body: emptyDoc() },
        { client_id: crypto.randomUUID(), label: "Tab 2", body: emptyDoc() },
      ],
      default_tab: 0,
      style: "underline",
      background_color: null,
      padding: "none",
    }),
  },
  button_stack: {
    label: "Buttons",
    description: "Link-out, jump-to-block, or section-break Continue buttons",
    icon: ButtonStackIcon,
    defaultConfig: () => ({
      buttons: [
        {
          client_id: crypto.randomUUID(),
          label: "",
          action_type: "link",
          url: "",
          target_block_client_id: null,
          section_title: null,
          variant: "primary",
        },
      ],
      layout: "stacked",
      caption: null,
      background_color: null,
      padding: "none",
    }),
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
  "stat_callout",
  "statement_a_b",
  "accordion",
  "tabs",
  "button_stack",
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
