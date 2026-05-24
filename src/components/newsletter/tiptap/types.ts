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
  /** Forward-compat: set by convert-html-to-tiptap when image fetch fails. */
  import_failed_src: string | null;
  lightbox: boolean;
  lazy_load: boolean;
}

export interface NewsletterCalloutAttrs {
  variant: CalloutVariant;
  title: string | null;
  with_icon: boolean;
}

export interface NewsletterStatCalloutAttrs {
  value: string;
  label: string;
  source: string | null;
  trend: "up" | "down" | "flat" | null;
}

export interface NewsletterEmbedAttrs {
  provider: EmbedProvider;
  embed_id: string;
  url: string;
  title: string | null;
  aspect_ratio: "16:9" | "4:3" | "1:1" | "9:16";
}

export interface NewsletterPullquoteAttrs {
  attribution: string | null;
  alignment: "left" | "center" | "right";
}

export type TwoColumnGap = "tight" | "normal" | "wide";

export interface NewsletterTwoColumnAttrs {
  gap: TwoColumnGap;
}

export type KeyMomentsAccentColor =
  | "orange"
  | "forest"
  | "teal"
  | "plum"
  | "mustard"
  | "navy";

export interface NewsletterKeyMomentsAttrs {
  title: string | null;
  numbered: boolean;
  accent_color: KeyMomentsAccentColor;
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
  | BaseNode<"codeBlock", {
      language?: string | null;
      filename?: string | null;
      highlight_lines?: string | null;
    }>
  | BaseNode<"horizontalRule">
  | BaseNode<"hardBreak">;

export interface NewsletterEyebrowAttrs {
  variant: "default" | "accent" | "muted";
  with_rule: boolean;
}

export interface NewsletterLeadAttrs {
  dropcap: boolean;
  style: "deck" | "lede" | "pullout";
}

export interface NewsletterAsideAttrs {
  label: string | null;
  tone: "default" | "subtle";
}

export interface HighlightMarkAttrs {
  color: "yellow" | "orange" | "forest" | "pink" | "blue";
}

export interface AccentMarkAttrs {
  color: "orange" | "forest" | "teal" | "plum" | "mustard" | "navy";
  style: "plain" | "italic" | "bold-italic";
  weight: "normal" | "heavy";
}

export interface AbbrMarkAttrs {
  title: string;
}

export type NewsletterSectionRuleStyle = "numbered" | "plain" | "titled" | "dot";

export interface NewsletterSectionRuleAttrs {
  number: string;
  style: NewsletterSectionRuleStyle;
  title: string | null;
}

export interface NewsletterMastheadAttrs {
  publication: string;
  issue_label: string | null;
  date_label: string | null;
  logo_glyph: string | null;
}

export interface BylineEntry {
  text: string;
  bold: boolean;
  link: string | null;
}

export type NewsletterBylineSeparatorStyle = "dot" | "pipe" | "slash";

export interface NewsletterBylineAttrs {
  entries: BylineEntry[];
  separator_style: NewsletterBylineSeparatorStyle;
}

export interface NewsletterStepListAttrs {
  style: "vertical" | "horizontal";
  connector: "line" | "arrow" | "none";
}

export interface NewsletterChecklistItemAttrs {
  checked: boolean;
}

export type DomainTagVariant =
  | "threat"
  | "reward"
  | "neutral"
  | "success"
  | "warning";

export interface NewsletterDomainGridAttrs {
  style: "rows" | "cards";
  show_numbers: boolean;
}

export interface NewsletterDomainRowAttrs {
  number: string;
  label: string;
  tag_text: string | null;
  tag_variant: DomainTagVariant | null;
  description: string;
  count_value: string;
  count_label: string;
}

export type IndexCardAccentColor =
  | "orange"
  | "forest"
  | "teal"
  | "plum"
  | "mustard"
  | "navy";

export interface NewsletterIndexRowAttrs {
  columns: 2 | 3;
}

export interface NewsletterIndexCardAttrs {
  tag: string;
  name: string;
  formula: string | null;
  note: string;
  accent_color: IndexCardAccentColor;
}

export type GalleryGap = "tight" | "normal" | "wide";

export interface NewsletterImageGalleryAttrs {
  columns: 2 | 3 | 4;
  gap: GalleryGap;
}

export interface NewsletterStatGridAttrs {
  columns: 2 | 3 | 4;
}

// ---- Pass 5 Tier 1: Math / Terminal / CodeDiff / Chart ----

export type MathDisplay = "inline" | "block";

export interface NewsletterMathAttrs {
  latex: string;
  display: MathDisplay;
}

export type TerminalTheme = "dark" | "light";

export interface TerminalCommand {
  prompt: string;
  command: string;
  output: string;
}

export interface NewsletterTerminalAttrs {
  commands: TerminalCommand[];
  theme: TerminalTheme;
}

export interface NewsletterCodeDiffAttrs {
  before_text: string;
  after_text: string;
  language: string | null;
  filename: string | null;
}

export type ChartType =
  | "line"
  | "bar"
  | "pie"
  | "donut"
  | "area"
  | "image";

export interface NewsletterChartAttrs {
  chart_type: ChartType;
  data_json: string;
  caption: string | null;
}

// Custom newsletter nodes
export type CustomNewsletterNode =
  | BaseNode<"newsletterImage", NewsletterImageAttrs>
  | BaseNode<"newsletterCallout", NewsletterCalloutAttrs>
  | BaseNode<"newsletterStatCallout", NewsletterStatCalloutAttrs>
  | BaseNode<"newsletterEmbed", NewsletterEmbedAttrs>
  | BaseNode<"newsletterPullquote", NewsletterPullquoteAttrs>
  | BaseNode<"newsletterTwoColumn", NewsletterTwoColumnAttrs>
  | BaseNode<"newsletterTwoColumnPane">
  | BaseNode<"newsletterKeyMoments", NewsletterKeyMomentsAttrs>
  | BaseNode<"newsletterKeyMoment", NewsletterKeyMomentAttrs>
  | BaseNode<"newsletterEyebrow", NewsletterEyebrowAttrs>
  | BaseNode<"newsletterLead", NewsletterLeadAttrs>
  | BaseNode<"newsletterAside", NewsletterAsideAttrs>
  | BaseNode<"newsletterSectionRule", NewsletterSectionRuleAttrs>
  | BaseNode<"newsletterMasthead", NewsletterMastheadAttrs>
  | BaseNode<"newsletterByline", NewsletterBylineAttrs>
  | BaseNode<"newsletterStepList", NewsletterStepListAttrs>
  | BaseNode<"newsletterStep">
  | BaseNode<"newsletterChecklist">
  | BaseNode<"newsletterChecklistItem", NewsletterChecklistItemAttrs>
  | BaseNode<"newsletterDomainGrid", NewsletterDomainGridAttrs>
  | BaseNode<"newsletterDomainRow", NewsletterDomainRowAttrs>
  | BaseNode<"newsletterIndexRow", NewsletterIndexRowAttrs>
  | BaseNode<"newsletterIndexCard", NewsletterIndexCardAttrs>
  | BaseNode<"newsletterThreeColumn">
  | BaseNode<"newsletterThreeColumnPane">
  | BaseNode<"newsletterFourColumn">
  | BaseNode<"newsletterFourColumnPane">
  | BaseNode<"newsletterImageGallery", NewsletterImageGalleryAttrs>
  | BaseNode<"newsletterStatGrid", NewsletterStatGridAttrs>
  | BaseNode<"newsletterMath", NewsletterMathAttrs>
  | BaseNode<"newsletterTerminal", NewsletterTerminalAttrs>
  | BaseNode<"newsletterCodeDiff", NewsletterCodeDiffAttrs>
  | BaseNode<"newsletterChart", NewsletterChartAttrs>;

export type NewsletterTipTapNode =
  | TipTapTextNode
  | StarterKitNode
  | CustomNewsletterNode;

export interface NewsletterTipTapDoc {
  type: "doc";
  content: NewsletterTipTapNode[];
}
