import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    abbr: {
      setAbbr: (attrs: { title: string }) => ReturnType;
      unsetAbbr: () => ReturnType;
    };
  }
}

export const Abbr = Mark.create({
  name: "abbr",

  addAttributes() {
    return {
      title: {
        default: "",
        parseHTML: (el) => (el as HTMLElement).getAttribute("title") ?? "",
        renderHTML: (attrs) => {
          if (!attrs.title) return {};
          return { title: attrs.title };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "abbr[title]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "abbr",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-abbr": "true",
        class: "newsletter-abbr",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setAbbr:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, { title: attrs.title }),
      unsetAbbr:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
