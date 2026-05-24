import { Node as TiptapNode, mergeAttributes } from "@tiptap/core";
import type { BylineEntry, NewsletterBylineSeparatorStyle } from "../types";

const SEPARATORS: NewsletterBylineSeparatorStyle[] = ["dot", "pipe", "slash"];
const SEPARATOR_CHARS: Record<NewsletterBylineSeparatorStyle, string> = {
  dot: "·",
  pipe: "|",
  slash: "/",
};
const SEPARATOR_CHAR_TO_STYLE: Record<string, NewsletterBylineSeparatorStyle> = {
  "·": "dot",
  "•": "dot",
  "|": "pipe",
  "/": "slash",
};

/**
 * Parse legacy byline HTML into entries[] + separator_style.
 * Walks children, splits on separator chars (·, •, |, /), and emits one entry
 * per segment. Detects <strong>/<b> → bold, <a href> → link.
 */
function parseBylineHtml(el: HTMLElement): {
  entries: BylineEntry[];
  separator_style: NewsletterBylineSeparatorStyle;
} {
  const raw = el.textContent || "";
  let bestSep: NewsletterBylineSeparatorStyle = "dot";
  let bestCount = 0;
  for (const [char, style] of Object.entries(SEPARATOR_CHAR_TO_STYLE)) {
    const count = (raw.match(new RegExp(`\\${char}`, "g")) || []).length;
    if (count > bestCount) {
      bestCount = count;
      bestSep = style;
    }
  }

  const segments: BylineEntry[] = [];
  let current: BylineEntry = { text: "", bold: false, link: null };

  const flushSegment = () => {
    const trimmed = current.text.trim();
    if (trimmed) segments.push({ ...current, text: trimmed });
    current = { text: "", bold: false, link: null };
  };

  const splitOnSeparators = (text: string): string[] =>
    text.split(/[·•|/]/);

  const walk = (n: ChildNode) => {
    if (n.nodeType === 3) {
      const text = n.textContent || "";
      const parts = splitOnSeparators(text);
      parts.forEach((part, i) => {
        if (i > 0) flushSegment();
        current.text += part;
      });
    } else if (n.nodeType === 1) {
      const childEl = n as HTMLElement;
      const tag = childEl.tagName.toLowerCase();
      if (tag === "strong" || tag === "b") {
        const prevBold = current.bold;
        current.bold = true;
        childEl.childNodes.forEach(walk);
        current.bold = prevBold || current.bold;
      } else if (tag === "a") {
        current.link = childEl.getAttribute("href") || null;
        childEl.childNodes.forEach(walk);
      } else {
        childEl.childNodes.forEach(walk);
      }
    }
  };

  el.childNodes.forEach(walk);
  flushSegment();

  return { entries: segments, separator_style: bestSep };
}

export const NewsletterByline = TiptapNode.create({
  name: "newsletterByline",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      entries: { default: [] as BylineEntry[] },
      separator_style: {
        default: "dot" as NewsletterBylineSeparatorStyle,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-separator");
          return SEPARATORS.includes(v as NewsletterBylineSeparatorStyle)
            ? (v as NewsletterBylineSeparatorStyle)
            : "dot";
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "[data-newsletter-byline]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const entriesRaw = el.getAttribute("data-entries");
          let entries: BylineEntry[] = [];
          if (entriesRaw) {
            try {
              const parsed = JSON.parse(entriesRaw);
              if (Array.isArray(parsed)) entries = parsed;
            } catch {
              /* fall through */
            }
          }
          if (entries.length === 0) {
            entries = parseBylineHtml(el).entries;
          }
          return {
            entries,
            separator_style:
              (el.getAttribute("data-separator") as NewsletterBylineSeparatorStyle) ||
              "dot",
          };
        },
      },
      {
        tag: "div.byline",
        getAttrs: (el) =>
          el instanceof HTMLElement ? parseBylineHtml(el) : false,
      },
      {
        tag: "p.byline",
        getAttrs: (el) =>
          el instanceof HTMLElement ? parseBylineHtml(el) : false,
      },
      {
        tag: "address.byline",
        getAttrs: (el) =>
          el instanceof HTMLElement ? parseBylineHtml(el) : false,
      },
      {
        tag: "[class~='byline']",
        getAttrs: (el) =>
          el instanceof HTMLElement ? parseBylineHtml(el) : false,
      },
      {
        tag: "[class~='author-meta']",
        getAttrs: (el) =>
          el instanceof HTMLElement ? parseBylineHtml(el) : false,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const entries = (node.attrs.entries as BylineEntry[]) || [];
    const separator_style =
      (node.attrs.separator_style as NewsletterBylineSeparatorStyle) || "dot";
    const sepChar = SEPARATOR_CHARS[separator_style];

    const wrapperAttrs: Record<string, string> = {
      "data-newsletter-byline": "true",
      "data-separator": separator_style,
      "data-entries": JSON.stringify(entries),
      class: `newsletter-byline newsletter-byline--${separator_style}`,
    };

    if (entries.length === 0) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          ...wrapperAttrs,
          class: `newsletter-byline newsletter-byline--${separator_style} newsletter-byline--empty`,
        }),
      ] as never;
    }

    const inner: unknown[] = [];
    entries.forEach((entry, i) => {
      if (i > 0) {
        inner.push(["span", { class: "newsletter-byline__sep" }, sepChar]);
      }
      const entryChildren: unknown[] = [];
      if (entry.link) {
        const linkInner: unknown[] = entry.bold
          ? [["strong", {}, entry.text]]
          : [entry.text];
        entryChildren.push([
          "a",
          { href: entry.link, class: "newsletter-byline__link" },
          ...linkInner,
        ]);
      } else if (entry.bold) {
        entryChildren.push(["strong", {}, entry.text]);
      } else {
        entryChildren.push(entry.text);
      }
      inner.push([
        "span",
        { class: "newsletter-byline__entry" },
        ...entryChildren,
      ]);
    });

    return [
      "div",
      mergeAttributes(HTMLAttributes, wrapperAttrs),
      ...inner,
    ] as never;
  },
});
