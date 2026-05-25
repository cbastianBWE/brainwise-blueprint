import { Mark, mergeAttributes } from "@tiptap/core";

export interface DefinitionAttrs {
  definition_text: string;
  source: string | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    definition: {
      setDefinition: (attrs: {
        definition_text: string;
        source?: string | null;
      }) => ReturnType;
      unsetDefinition: () => ReturnType;
    };
  }
}

/**
 * definition — inline mark carrying a glossary definition (and optional
 * source URL) for the spanned term. Renders a dotted underline; tooltip
 * hover/tap is wired in the reader path (deferred for P7a).
 *
 * parseHTML scoped to `span[data-newsletter-definition]` at priority 60 so
 * it doesn't compete with the Accent mark on bare `span[data-*]` selectors.
 */
export const Definition = Mark.create({
  name: "definition",

  addAttributes() {
    return {
      definition_text: {
        default: "",
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-definition-text") ?? "",
        renderHTML: (attrs) => ({
          "data-definition-text": String(attrs.definition_text ?? ""),
        }),
      },
      source: {
        default: null as string | null,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-source");
          return v && v.length > 0 ? v : null;
        },
        renderHTML: (attrs) =>
          attrs.source ? { "data-source": String(attrs.source) } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-newsletter-definition]", priority: 60 }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-definition": "true",
        class: "newsletter-definition",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setDefinition:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, {
            definition_text: attrs.definition_text,
            source: attrs.source ?? null,
          }),
      unsetDefinition:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
