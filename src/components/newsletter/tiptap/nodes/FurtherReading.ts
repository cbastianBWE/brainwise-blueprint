import { Node, mergeAttributes } from "@tiptap/core";
import type { NewsletterFurtherReadingEntry } from "../types";

function sanitizeEntries(raw: unknown): NewsletterFurtherReadingEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => ({
      title: typeof e.title === "string" ? e.title : "",
      url: typeof e.url === "string" ? e.url : "",
      source: typeof e.source === "string" ? e.source : null,
      description: typeof e.description === "string" ? e.description : null,
    }));
}

/**
 * newsletterFurtherReading — atom block with an array of external links.
 */
export const NewsletterFurtherReading = Node.create({
  name: "newsletterFurtherReading",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      entries: { default: [] as NewsletterFurtherReadingEntry[] },
      title: { default: null as string | null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "section[data-newsletter-further-reading]",
        priority: 51,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const raw = el.getAttribute("data-entries");
          let entries: NewsletterFurtherReadingEntry[] = [];
          if (raw) {
            try {
              entries = sanitizeEntries(JSON.parse(raw));
            } catch {
              /* noop */
            }
          }
          return {
            entries,
            title:
              el.querySelector("[data-newsletter-further-reading-title]")
                ?.textContent ?? null,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const entries =
      (node.attrs.entries as NewsletterFurtherReadingEntry[]) || [];
    const title = (node.attrs.title as string | null) ?? null;

    const items = entries.map((e) => {
      const children: unknown[] = [
        [
          "a",
          {
            "data-newsletter-further-reading-entry-link": "true",
            href: e.url,
            target: "_blank",
            rel: "noopener noreferrer",
          },
          e.title || e.url,
        ],
      ];
      if (e.source) {
        children.push([
          "span",
          { "data-newsletter-further-reading-entry-source": "true" },
          e.source,
        ]);
      }
      if (e.description) {
        children.push([
          "span",
          { "data-newsletter-further-reading-entry-description": "true" },
          e.description,
        ]);
      }
      return [
        "li",
        { "data-newsletter-further-reading-entry": "true" },
        ...children,
      ];
    });

    const inner: unknown[] = [];
    if (title) {
      inner.push([
        "h4",
        { "data-newsletter-further-reading-title": "true" },
        title,
      ]);
    }
    inner.push([
      "ul",
      { "data-newsletter-further-reading-list": "true" },
      ...items,
    ]);

    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-further-reading": "true",
        "data-entries": JSON.stringify(entries),
      }),
      ...inner,
    ] as never;
  },
});
