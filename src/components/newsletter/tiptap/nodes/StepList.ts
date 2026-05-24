import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterStepList — numbered process layout (parent + 1+ step children).
 *
 * Child `newsletterStep` is intentionally NOT in the 'block' group, so it can
 * only live inside this parent. Per §144 the parent's parseHTML is scoped to
 * `data-newsletter-step-list` at priority 60 so it beats StarterKit's bare
 * `ol` rule without affecting plain ordered lists elsewhere.
 */
export const NewsletterStepList = Node.create({
  name: "newsletterStepList",
  group: "block",
  content: "newsletterStep+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      style: { default: "vertical" as "vertical" | "horizontal" },
      connector: { default: "line" as "line" | "arrow" | "none" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "ol[data-newsletter-step-list]",
        priority: 60,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            style: el.getAttribute("data-step-style") || "vertical",
            connector: el.getAttribute("data-connector") || "line",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "ol",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-step-list": "true",
        "data-step-style": node.attrs.style,
        "data-connector": node.attrs.connector,
        class: "newsletter-step-list",
      }),
      0,
    ] as any;
  },
});

/**
 * newsletterStep — single step in the parent timeline.
 *
 * `content: "heading block*"` forces the first child to be a heading so the
 * step title is editable as a real H-node (no atom-attr title affordance).
 * Intentionally NOT in the 'block' group — parent-only placement.
 */
export const NewsletterStep = Node.create({
  name: "newsletterStep",
  content: "heading block*",
  defining: true,

  parseHTML() {
    return [{ tag: "li[data-newsletter-step]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "li",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-step": "true",
        class: "newsletter-step",
      }),
      0,
    ] as any;
  },
});
