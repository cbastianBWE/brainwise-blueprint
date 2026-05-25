import { Node, mergeAttributes } from "@tiptap/core";

export type CitationsStyle = "numbered" | "bracketed";

function clampStyle(v: string | null): CitationsStyle {
  return v === "bracketed" ? "bracketed" : "numbered";
}

// §151 (H5 Cycle 2): import-fallback helpers for external citation markup.
function citationsParentFallbackAttrs(el: unknown) {
  if (!(el instanceof HTMLElement)) return false;
  return {
    style: "numbered" as CitationsStyle,
    title:
      el.querySelector("h1, h2, h3, h4, h5, h6")?.textContent?.trim() ?? null,
  };
}

function citationEntryFallbackAttrs(el: unknown) {
  if (!(el instanceof HTMLElement)) return false;
  return {
    link: el.querySelector("a")?.getAttribute("href") ?? null,
  };
}

/**
 * newsletterCitations — composite parent containing 1+ citation entries.
 * Numbering is driven by CSS counters on the inner <ol> — no JS reindex.
 */
export const NewsletterCitations = Node.create({
  name: "newsletterCitations",
  group: "block",
  content: "newsletterCitationEntry+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      style: {
        default: "numbered" as CitationsStyle,
        parseHTML: (el) => clampStyle(el.getAttribute("data-style")),
        renderHTML: (attrs) => ({ "data-style": attrs.style }),
      },
      title: { default: null as string | null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "section[data-newsletter-citations]",
        priority: 60,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            style: clampStyle(el.getAttribute("data-style")),
            title:
              el.querySelector("[data-newsletter-citations-title]")
                ?.textContent ?? null,
          };
        },
        contentElement: (el) =>
          (el as HTMLElement).querySelector(
            "[data-newsletter-citations-list]",
          ) || (el as HTMLElement),
      },
      {
        tag: "ol[data-newsletter-citations]",
        priority: 60,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            style: clampStyle(el.getAttribute("data-style")),
            title: null,
          };
        },
      },
      // §151 (H5 Cycle 2): import-fallback rules. Two pairs — section
      // wrapper with contentElement descent, and bare <ol> direct match (Q8).
      {
        tag: "section.citations",
        priority: 51,
        getAttrs: (el) => citationsParentFallbackAttrs(el),
        contentElement: (el) => {
          if (!(el instanceof HTMLElement)) return el as HTMLElement;
          return (el.querySelector("ol, ul") as HTMLElement) || el;
        },
      },
      {
        tag: "section.references",
        priority: 51,
        getAttrs: (el) => citationsParentFallbackAttrs(el),
        contentElement: (el) => {
          if (!(el instanceof HTMLElement)) return el as HTMLElement;
          return (el.querySelector("ol, ul") as HTMLElement) || el;
        },
      },
      {
        tag: "ol.citations",
        priority: 51,
        getAttrs: () => ({
          style: "numbered" as CitationsStyle,
          title: null,
        }),
      },
      {
        tag: "ol.references",
        priority: 51,
        getAttrs: () => ({
          style: "numbered" as CitationsStyle,
          title: null,
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const title = node.attrs.title as string | null;
    const style = clampStyle((node.attrs.style as string) ?? null);

    const inner: unknown[] = [];
    if (title) {
      inner.push([
        "h4",
        { "data-newsletter-citations-title": "true" },
        title,
      ]);
    }
    inner.push(["ol", { "data-newsletter-citations-list": "true" }, 0]);

    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-citations": "true",
        "data-style": style,
      }),
      ...inner,
    ] as never;
  },
});

/**
 * newsletterCitationEntry — child of newsletterCitations. Holds editable
 * inline content + an optional external link rendered as a superscript arrow.
 * Not a member of any group — only valid inside the parent.
 */
export const NewsletterCitationEntry = Node.create({
  name: "newsletterCitationEntry",
  content: "inline*",
  defining: false,

  addAttributes() {
    return {
      link: {
        default: null as string | null,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-link");
          return v && v.length > 0 ? v : null;
        },
        renderHTML: (attrs) => ({ "data-link": attrs.link ?? "" }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "li[data-newsletter-citation-entry]",
        priority: 60,
        contentElement: (el) =>
          (el as HTMLElement).querySelector(
            "[data-newsletter-citation-entry-body]",
          ) || (el as HTMLElement),
      },
      // §151 (H5 Cycle 2): import-fallback rules for external citation list items.
      {
        tag: "section.citations li",
        priority: 51,
        getAttrs: (el) => citationEntryFallbackAttrs(el),
      },
      {
        tag: "section.references li",
        priority: 51,
        getAttrs: (el) => citationEntryFallbackAttrs(el),
      },
      {
        tag: "ol.citations > li",
        priority: 51,
        getAttrs: (el) => citationEntryFallbackAttrs(el),
      },
      {
        tag: "ol.references > li",
        priority: 51,
        getAttrs: (el) => citationEntryFallbackAttrs(el),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const link = (node.attrs.link as string | null) ?? null;
    const children: unknown[] = [
      ["span", { "data-newsletter-citation-entry-body": "true" }, 0],
    ];
    if (link) {
      children.push([
        "a",
        {
          "data-newsletter-citation-entry-link": "true",
          href: link,
          target: "_blank",
          rel: "noopener noreferrer",
        },
        "↗",
      ]);
    }
    return [
      "li",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-citation-entry": "true",
        "data-link": link ?? "",
      }),
      ...children,
    ] as never;
  },
});
