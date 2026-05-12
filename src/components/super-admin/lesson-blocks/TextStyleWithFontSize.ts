import { TextStyle } from "@tiptap/extension-text-style";

/**
 * TextStyle extended with a fontSize attribute that serializes to
 * data-font-size HTML attribute. Powers the "Lead paragraph" toggle.
 */
export const TextStyleWithFontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-font-size"),
        renderHTML: (attributes) => {
          if (!attributes.fontSize) return {};
          return { "data-font-size": attributes.fontSize };
        },
      },
    };
  },
});
