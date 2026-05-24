import { Mark, mergeAttributes } from "@tiptap/core";

export type HighlightColor = "yellow" | "orange" | "forest" | "pink" | "blue";
const COLORS: HighlightColor[] = ["yellow", "orange", "forest", "pink", "blue"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    highlight: {
      setHighlight: (attrs?: { color?: HighlightColor }) => ReturnType;
      unsetHighlight: () => ReturnType;
      toggleHighlight: (attrs?: { color?: HighlightColor }) => ReturnType;
    };
  }
}

export const Highlight = Mark.create({
  name: "highlight",

  addAttributes() {
    return {
      color: {
        default: "yellow" as HighlightColor,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-color");
          return COLORS.includes(v as HighlightColor)
            ? (v as HighlightColor)
            : "yellow";
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: "mark[data-newsletter-highlight]" },
      { tag: "span.highlight" },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const color = (node.attrs.color as HighlightColor) || "yellow";
    return [
      "mark",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-highlight": "true",
        "data-color": color,
        class: `newsletter-highlight newsletter-highlight--${color}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setHighlight:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, { color: attrs?.color ?? "yellow" }),
      unsetHighlight:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
      toggleHighlight:
        (attrs) =>
        ({ commands }) =>
          commands.toggleMark(this.name, { color: attrs?.color ?? "yellow" }),
    };
  },
});
