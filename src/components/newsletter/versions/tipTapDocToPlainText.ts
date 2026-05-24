import type { NewsletterTipTapDoc } from "@/components/newsletter/tiptap/types";

type AnyNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: AnyNode[];
};

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "newsletterImage",
  "newsletterCallout",
  "newsletterStatCallout",
  "newsletterEmbed",
  "newsletterPullquote",
  "newsletterTwoColumn",
  "newsletterTwoColumnPane",
  "newsletterKeyMoments",
  "newsletterKeyMoment",
]);

function attrStr(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function walk(node: AnyNode, out: string[]): void {
  if (!node || typeof node !== "object") return;

  if (node.type === "text" && typeof node.text === "string") {
    out.push(node.text);
    return;
  }

  const isBlock = node.type && BLOCK_TYPES.has(node.type);
  const blockStart = out.length;

  switch (node.type) {
    case "newsletterImage": {
      const a = node.attrs ?? {};
      const alt = attrStr(a.alt);
      const caption = attrStr(a.caption);
      out.push(`[image${alt ? `: ${alt}` : ""}]${caption ? ` ${caption}` : ""}`);
      break;
    }
    case "newsletterEmbed": {
      const a = node.attrs ?? {};
      const provider = attrStr(a.provider);
      const title = attrStr(a.title);
      const url = attrStr(a.url);
      out.push(`[embed: ${provider} — ${title || url}]`);
      break;
    }
    case "newsletterStatCallout": {
      const a = node.attrs ?? {};
      out.push(`[stat: ${attrStr(a.value)} — ${attrStr(a.label)}]`);
      const source = attrStr(a.source);
      if (source) out.push(` (source: ${source})`);
      break;
    }
    case "newsletterCallout": {
      const a = node.attrs ?? {};
      const variant = attrStr(a.variant) || "callout";
      const title = attrStr(a.title);
      out.push(`[${variant}${title ? `: ${title}` : ""}]`);
      if (node.content) for (const c of node.content) walk(c, out);
      break;
    }
    case "newsletterPullquote": {
      const a = node.attrs ?? {};
      out.push(`[pullquote]`);
      if (node.content) for (const c of node.content) walk(c, out);
      const attribution = attrStr(a.attribution);
      if (attribution) out.push(` — ${attribution}`);
      break;
    }
    case "newsletterKeyMoments": {
      const a = node.attrs ?? {};
      out.push(`[key moments${a.title ? `: ${attrStr(a.title)}` : ""}]`);
      if (node.content) for (const c of node.content) walk(c, out);
      break;
    }
    case "newsletterKeyMoment": {
      const a = node.attrs ?? {};
      out.push(`• ${attrStr(a.title)}`);
      if (node.content) for (const c of node.content) walk(c, out);
      break;
    }
    case "newsletterTwoColumn":
    case "newsletterTwoColumnPane": {
      if (node.content) for (const c of node.content) walk(c, out);
      break;
    }
    case "horizontalRule":
      out.push("---");
      break;
    default:
      if (node.content) for (const c of node.content) walk(c, out);
  }

  if (isBlock && out.length > blockStart) {
    out.push("\n\n");
  }
}

export function tipTapDocToPlainText(doc: NewsletterTipTapDoc | null | undefined): string {
  if (!doc) return "";
  const out: string[] = [];
  walk(doc as AnyNode, out);
  return out.join("").replace(/\n{3,}/g, "\n\n").trim();
}
