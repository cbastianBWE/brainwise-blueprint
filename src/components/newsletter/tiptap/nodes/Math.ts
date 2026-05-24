import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterMath — atom block holding raw LaTeX source.
 * Phase 1: emit a readable `<code>` fallback. Phase 2 will swap in KaTeX.
 */
export const NewsletterMath = Node.create({
  name: "newsletterMath",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-latex") || "",
        renderHTML: (attrs) => ({ "data-latex": attrs.latex }),
      },
      display: {
        default: "block",
        parseHTML: (el) => {
          const v = el.getAttribute("data-display");
          return v === "inline" ? "inline" : "block";
        },
        renderHTML: (attrs) => ({ "data-display": attrs.display }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-newsletter-math]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            latex: el.getAttribute("data-latex") || "",
            display:
              el.getAttribute("data-display") === "inline" ? "inline" : "block",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const latex = (node.attrs.latex as string) || "";
    const display = (node.attrs.display as string) || "block";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-math": "true",
        "data-latex": latex,
        "data-display": display,
        class: `newsletter-math newsletter-math--${display}`,
      }),
      ["code", { class: "newsletter-math__source" }, latex],
    ] as never;
  },
});
