import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { CodeBlock } from "@tiptap/extension-code-block";
import {
  Table,
  TableRow,
  TableHeader,
  TableCell,
} from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { isSafeHttpUrl } from "@/lib/safeUrl";
import { TextStyleWithFontSize } from "@/components/super-admin/lesson-blocks/TextStyleWithFontSize";

import { NewsletterImage } from "./nodes/Image";
import { NewsletterCallout } from "./nodes/Callout";
import { NewsletterStatCallout } from "./nodes/StatCallout";
import { NewsletterEmbed } from "./nodes/Embed";
import { NewsletterPullquote } from "./nodes/Pullquote";
import {
  NewsletterTwoColumn,
  NewsletterTwoColumnPane,
} from "./nodes/TwoColumn";
import {
  NewsletterKeyMoments,
  NewsletterKeyMoment,
} from "./nodes/KeyMoments";
import { NewsletterEyebrow } from "./nodes/Eyebrow";
import { NewsletterLead } from "./nodes/Lead";
import { NewsletterAside } from "./nodes/Aside";
import { NewsletterSectionRule } from "./nodes/SectionRule";
import { NewsletterMasthead } from "./nodes/Masthead";
import { NewsletterByline } from "./nodes/Byline";
import { NewsletterStepList, NewsletterStep } from "./nodes/StepList";
import {
  NewsletterChecklist,
  NewsletterChecklistItem,
} from "./nodes/Checklist";
import {
  NewsletterDomainGrid,
  NewsletterDomainRow,
} from "./nodes/DomainGrid";
import {
  NewsletterIndexRow,
  NewsletterIndexCard,
} from "./nodes/IndexRow";
import {
  NewsletterThreeColumn,
  NewsletterThreeColumnPane,
} from "./nodes/ThreeColumn";
import {
  NewsletterFourColumn,
  NewsletterFourColumnPane,
} from "./nodes/FourColumn";
import { NewsletterImageGallery } from "./nodes/ImageGallery";
import { NewsletterStatGrid } from "./nodes/StatGrid";
import { NewsletterMath } from "./nodes/Math";
import { NewsletterTerminal } from "./nodes/Terminal";
import { NewsletterCodeDiff } from "./nodes/CodeDiff";
import { NewsletterChart } from "./nodes/Chart";
import { NewsletterAudio } from "./nodes/Audio";
import { NewsletterImageCompare } from "./nodes/ImageCompare";
import { NewsletterFooterMeta } from "./nodes/FooterMeta";
import {
  NewsletterCitations,
  NewsletterCitationEntry,
} from "./nodes/Citations";
import { NewsletterFurtherReading } from "./nodes/FurtherReading";
import { NewsletterAuthorBio } from "./nodes/AuthorBio";
import { NewsletterCta } from "./nodes/CTA";
import { NewsletterSubscribeBlock } from "./nodes/SubscribeBlock";
import {
  NewsletterDisclosure,
  NewsletterDisclosureSummary,
} from "./nodes/Disclosure";
import { NewsletterRelatedArticles } from "./nodes/RelatedArticles";
import { NewsletterFootnotes } from "./nodes/Footnotes";

import { Accent } from "./marks/Accent";
import { SmallCaps } from "./marks/SmallCaps";
import { Superscript } from "./marks/Superscript";
import { Subscript } from "./marks/Subscript";
import { Underline } from "./marks/Underline";
import { Highlight } from "./marks/Highlight";
import { Keyboard } from "./marks/Keyboard";
import { Abbr } from "./marks/Abbr";
import { Definition } from "./marks/Definition";
import { FootnoteRef } from "./marks/FootnoteRef";

export interface BuildExtensionsOptions {
  editable: boolean;
  placeholder?: string;
}

/**
 * Extended CodeBlock — adds `filename` and `highlight_lines` attrs alongside
 * the built-in `language`. Registered standalone after disabling the
 * StarterKit-bundled CodeBlock so the schema name "codeBlock" resolves to
 * this extended class.
 */
export const NewsletterCodeBlock = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      filename: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-filename") || null,
        renderHTML: (attrs) =>
          attrs.filename ? { "data-filename": attrs.filename } : {},
      },
      highlight_lines: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-highlight-lines") || null,
        renderHTML: (attrs) =>
          attrs.highlight_lines
            ? { "data-highlight-lines": attrs.highlight_lines }
            : {},
      },
    };
  },
});

/**
 * Newsletter Table — class hook for the reader stylesheet.
 * Sub-extensions (TableRow / TableHeader / TableCell) ship as-is.
 */
export const NewsletterTable = Table.configure({
  resizable: false,
  HTMLAttributes: {
    class: "newsletter-table",
  },
});

/**
 * Single source of truth for the newsletter TipTap schema. Consumed by:
 *   - G4-A authoring editor (editable: true)
 *   - G6 read-only public reader (editable: false)
 *   - convert_html_to_tiptap Edge Function (server-side parse via JSDOM)
 *
 * The `editable` flag is accepted in the signature so downstream callers can
 * specialize later (e.g. G6 may want to drop Placeholder). For v1 the same
 * array is returned regardless — keeping schema parity is what guarantees
 * read/write round-trips don't drop nodes.
 */
export function buildExtensions(opts: BuildExtensionsOptions): Extensions {
  return [
    StarterKit.configure({
      // H1 is reserved for the article title field; body uses H2-H4 only.
      heading: { levels: [2, 3, 4] },
      // We register our own link extension below with safe-URL validation.
      link: false,
      // We register our own extended CodeBlock (NewsletterCodeBlock) below.
      codeBlock: false,
    }),
    TextStyleWithFontSize,
    Link.configure({
      openOnClick: false,
      validate: isSafeHttpUrl,
      autolink: true,
      protocols: ["http", "https", "mailto", "tel"],
    }),
    Placeholder.configure({
      placeholder: opts.placeholder ?? "",
    }),
    NewsletterCodeBlock,
    NewsletterTable,
    TableRow,
    TableHeader,
    TableCell,
    NewsletterImage,
    NewsletterCallout,
    NewsletterStatCallout,
    NewsletterEmbed,
    NewsletterPullquote,
    NewsletterTwoColumn,
    NewsletterTwoColumnPane,
    NewsletterKeyMoments,
    NewsletterKeyMoment,
    NewsletterEyebrow,
    NewsletterLead,
    NewsletterAside,
    NewsletterSectionRule,
    NewsletterMasthead,
    NewsletterByline,
    NewsletterStepList,
    NewsletterStep,
    NewsletterChecklist,
    NewsletterChecklistItem,
    NewsletterDomainGrid,
    NewsletterDomainRow,
    NewsletterIndexRow,
    NewsletterIndexCard,
    NewsletterThreeColumn,
    NewsletterThreeColumnPane,
    NewsletterFourColumn,
    NewsletterFourColumnPane,
    NewsletterImageGallery,
    NewsletterStatGrid,
    NewsletterMath,
    NewsletterTerminal,
    NewsletterCodeDiff,
    NewsletterChart,
    NewsletterAudio,
    NewsletterImageCompare,
    NewsletterFooterMeta,
    NewsletterCitations,
    NewsletterCitationEntry,
    NewsletterFurtherReading,
    NewsletterAuthorBio,
    NewsletterCta,
    NewsletterSubscribeBlock,
    NewsletterDisclosure,
    NewsletterDisclosureSummary,
    NewsletterRelatedArticles,
    Accent,
    SmallCaps,
    Superscript,
    Subscript,
    Underline,
    Highlight,
    Keyboard,
    Abbr,
    Definition,
  ];
}
