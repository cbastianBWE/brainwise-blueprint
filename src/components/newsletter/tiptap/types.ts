/**
 * Type definitions for the newsletter TipTap document shape.
 *
 * The body of a newsletter article is stored as ProseMirror/TipTap JSON in
 * `newsletter_articles.body_tiptap`. These types describe the canonical shape
 * shared by:
 *   - the G4-A authoring editor
 *   - the G6 read-only public reader
 *   - the convert_html_to_tiptap Edge Function (HTML import path)
 *
 * Per §133: image and embed `src` attributes are NEVER stored in the doc.
 * `newsletterImage` carries an `asset_id` that resolves to a Storage URL at
 * render time; `newsletterEmbed` carries `provider` + `embed_id` which feed
 * the `buildEmbedSrc` allowlist helper. The doc is portable across Storage
 * path migrations, CDN swaps, and provider URL changes.
 */

export type CalloutVariant =
  | "info"
  | "warning"
  | "quote"
  | "tldr"
  | "key_takeaway";

export type EmbedProvider = "youtube" | "spotify" | "vimeo" | "generic";

export type NewsletterImageWidth = "inline" | "full_bleed" | "wide";

// ---- Per-node attrs interfaces ----

export interface NewsletterImageAttrs {
  asset_id: string | null;
  alt: string;
  caption: string;
  width: NewsletterImageWidth;
}

export interface NewsletterCalloutAttrs {
  variant: CalloutVariant;
  title: string | null;
}

export interface NewsletterStatCalloutAttrs {
  value: string;
  label: string;
  source: string | null;
}

export interface NewsletterEmbedAttrs {
  provider: EmbedProvider;
  embed_id: string;
  url: string;
  title: string | null;
}

export interface NewsletterPullquoteAttrs {
  attribution: string | null;
}

export interface NewsletterKeyMomentsAttrs {
  title: string | null;
}

export interface NewsletterKeyMomentAttrs {
  title: string;
}

// ---- Generic TipTap JSON shapes ----

export interface TipTapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TipTapTextNode {
  type: "text";
  text: string;
  marks?: TipTapMark[];
}

interface BaseNode<TType extends string, TAttrs = undefined> {
  type: TType;
  attrs?: TAttrs;
  content?: NewsletterTipTapNode[];
  marks?: TipTapMark[];
}

// Built-in StarterKit nodes used by newsletter
export type StarterKitNode =
  | BaseNode<"paragraph">
  | BaseNode<"heading", { level: 2 | 3 | 4 }>
  | BaseNode<"bulletList">
  | BaseNode<"orderedList", { start?: number }>
  | BaseNode<"listItem">
  | BaseNode<"blockquote">
  | BaseNode<"codeBlock", { language?: string | null }>
  | BaseNode<"horizontalRule">
  | BaseNode<"hardBreak">;

// Custom newsletter nodes
export type CustomNewsletterNode =
  | BaseNode<"newsletterImage", NewsletterImageAttrs>
  | BaseNode<"newsletterCallout", NewsletterCalloutAttrs>
  | BaseNode<"newsletterStatCallout", NewsletterStatCalloutAttrs>
  | BaseNode<"newsletterEmbed", NewsletterEmbedAttrs>
  | BaseNode<"newsletterPullquote", NewsletterPullquoteAttrs>
  | BaseNode<"newsletterTwoColumn">
  | BaseNode<"newsletterTwoColumnPane">
  | BaseNode<"newsletterKeyMoments", NewsletterKeyMomentsAttrs>
  | BaseNode<"newsletterKeyMoment", NewsletterKeyMomentAttrs>;

export type NewsletterTipTapNode =
  | TipTapTextNode
  | StarterKitNode
  | CustomNewsletterNode;

export interface NewsletterTipTapDoc {
  type: "doc";
  content: NewsletterTipTapNode[];
}
