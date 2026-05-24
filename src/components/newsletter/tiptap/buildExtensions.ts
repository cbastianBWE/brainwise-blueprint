import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
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

import { Accent } from "./marks/Accent";
import { SmallCaps } from "./marks/SmallCaps";
import { Superscript } from "./marks/Superscript";
import { Subscript } from "./marks/Subscript";
import { Underline } from "./marks/Underline";
import { Highlight } from "./marks/Highlight";
import { Keyboard } from "./marks/Keyboard";
import { Abbr } from "./marks/Abbr";

export interface BuildExtensionsOptions {
  editable: boolean;
  placeholder?: string;
}

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
    Accent,
    SmallCaps,
    Superscript,
    Subscript,
    Underline,
    Highlight,
    Keyboard,
    Abbr,
  ];
}
