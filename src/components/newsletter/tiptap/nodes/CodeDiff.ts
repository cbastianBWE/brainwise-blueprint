import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterCodeDiff — atom block with before/after text panes.
 */
export const NewsletterCodeDiff = Node.create({
  name: "newsletterCodeDiff",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      before_text: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-before") || "",
        renderHTML: (attrs) => ({ "data-before": attrs.before_text }),
      },
      after_text: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-after") || "",
        renderHTML: (attrs) => ({ "data-after": attrs.after_text }),
      },
      language: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-language") || null,
        renderHTML: (attrs) =>
          attrs.language ? { "data-language": attrs.language } : {},
      },
      filename: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-filename") || null,
        renderHTML: (attrs) =>
          attrs.filename ? { "data-filename": attrs.filename } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-newsletter-code-diff]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            before_text: el.getAttribute("data-before") || "",
            after_text: el.getAttribute("data-after") || "",
            language: el.getAttribute("data-language") || null,
            filename: el.getAttribute("data-filename") || null,
          };
        },
      },
      {
        tag: "div.code-diff",
        priority: 51,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const langClass = el
            .querySelector("[class*='language-']")
            ?.className.match(/language-(\w+)/)?.[1];
          return {
            before_text:
              el.querySelector(".before, .diff-before, [data-side='before']")
                ?.textContent ?? "",
            after_text:
              el.querySelector(".after, .diff-after, [data-side='after']")
                ?.textContent ?? "",
            language: el.getAttribute("data-language") || langClass || null,
            filename:
              el
                .querySelector(".filename, .file-name, [data-filename]")
                ?.textContent?.trim() ?? null,
          };
        },
      },
      {
        tag: "div.diff",
        priority: 51,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            before_text:
              el.querySelector(".before, .diff-before")?.textContent ?? "",
            after_text:
              el.querySelector(".after, .diff-after")?.textContent ?? "",
            language: null,
            filename: null,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const before = (node.attrs.before_text as string) || "";
    const after = (node.attrs.after_text as string) || "";
    const language = node.attrs.language as string | null;
    const filename = node.attrs.filename as string | null;

    const inner: unknown[] = [];
    if (filename) {
      inner.push([
        "div",
        { class: "newsletter-code-diff__filename" },
        filename,
      ]);
    }
    inner.push([
      "div",
      { class: "newsletter-code-diff__panes" },
      [
        "div",
        { class: "newsletter-code-diff__pane newsletter-code-diff__pane--before" },
        ["div", { class: "newsletter-code-diff__label" }, "Before"],
        ["pre", {}, ["code", {}, before]],
      ],
      [
        "div",
        { class: "newsletter-code-diff__pane newsletter-code-diff__pane--after" },
        ["div", { class: "newsletter-code-diff__label" }, "After"],
        ["pre", {}, ["code", {}, after]],
      ],
    ]);

    const wrapperAttrs: Record<string, string> = {
      "data-newsletter-code-diff": "true",
      "data-before": before,
      "data-after": after,
      class: "newsletter-code-diff",
    };
    if (language) wrapperAttrs["data-language"] = language;
    if (filename) wrapperAttrs["data-filename"] = filename;

    return [
      "div",
      mergeAttributes(HTMLAttributes, wrapperAttrs),
      ...inner,
    ] as never;
  },
});
