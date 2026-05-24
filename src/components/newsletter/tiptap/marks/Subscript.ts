import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    subscript: {
      toggleSubscript: () => ReturnType;
    };
  }
}

export const Subscript = Mark.create({
  name: "subscript",

  parseHTML() {
    return [{ tag: "sub" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "sub",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-subscript": "true",
        class: "newsletter-subscript",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleSubscript:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});
