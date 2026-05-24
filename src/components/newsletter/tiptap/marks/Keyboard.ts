import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    keyboard: {
      toggleKeyboard: () => ReturnType;
    };
  }
}

export const Keyboard = Mark.create({
  name: "keyboard",

  parseHTML() {
    return [{ tag: "kbd" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "kbd",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-keyboard": "true",
        class: "newsletter-keyboard",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleKeyboard:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});
