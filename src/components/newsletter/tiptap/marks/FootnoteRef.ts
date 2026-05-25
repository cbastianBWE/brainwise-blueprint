import { Mark, mergeAttributes } from "@tiptap/core";

export interface FootnoteRefMarkAttrs {
  footnote_text: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    footnoteRef: {
      setFootnoteRef: (attrs: { footnote_text: string }) => ReturnType;
      unsetFootnoteRef: () => ReturnType;
    };
  }
}

/**
 * footnoteRef — inline mark holding a footnote's body text on the anchor span.
 * The auto-numbered Footnotes block walks the doc at render time and collects
 * these in document order. Numbering is via CSS counter (see D5 in P7c spec).
 *
 * parseHTML scoped to `span[data-newsletter-footnote-ref]` at priority 60 to
 * avoid competing with other span[data-*] marks (Accent, Definition).
 */
export const FootnoteRef = Mark.create({
  name: "footnoteRef",

  addAttributes() {
    return {
      footnote_text: {
        default: "",
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-footnote-text") ?? "",
        renderHTML: (attrs) => ({
          "data-footnote-text": String(attrs.footnote_text ?? ""),
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: "span[data-newsletter-footnote-ref]", priority: 60 },
      {
        tag: 'sup > a[href^="#"]',
        priority: 51,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const href = el.getAttribute("href");
          if (!href || !href.startsWith("#")) return false;
          const id = href.slice(1);
          const doc = el.ownerDocument;
          const target = doc?.getElementById(id);
          const footnote_text = target?.textContent?.trim() ?? "";
          return { footnote_text };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-footnote-ref": "true",
        class: "newsletter-footnote-ref",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setFootnoteRef:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, {
            footnote_text: attrs.footnote_text,
          }),
      unsetFootnoteRef:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
