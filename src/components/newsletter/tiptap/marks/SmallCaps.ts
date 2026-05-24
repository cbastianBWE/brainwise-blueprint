import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    smallCaps: {
      toggleSmallCaps: () => ReturnType;
    };
  }
}

export const SmallCaps = Mark.create({
  name: "smallCaps",

  parseHTML() {
    return [{ tag: "span.small-caps" }, { tag: "span[data-smallcaps]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-smallcaps": "true",
        class: "newsletter-smallcaps",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleSmallCaps:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});
