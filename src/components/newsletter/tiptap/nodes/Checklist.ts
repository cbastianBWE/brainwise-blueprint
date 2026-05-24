import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterChecklist — task list with checkboxes (parent + 1+ items).
 *
 * Headless schema — no React, no NodeView. The ChecklistItem React NodeView
 * is wired in NewsletterEditor.tsx via the EDITABLE_NODE_OVERRIDES registry.
 *
 * Per §144 the parent's parseHTML is scoped to `data-newsletter-checklist`
 * at priority 60 so it beats StarterKit's bare `ul` rule.
 */
export const NewsletterChecklist = Node.create({
  name: "newsletterChecklist",
  group: "block",
  content: "newsletterChecklistItem+",
  defining: true,
  isolating: true,

  parseHTML() {
    return [
      {
        tag: "ul[data-newsletter-checklist]",
        priority: 60,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "ul",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-checklist": "true",
        class: "newsletter-checklist",
      }),
      0,
    ] as any;
  },
});

/**
 * newsletterChecklistItem — single checkbox row.
 *
 * Intentionally NOT in the 'block' group — parent-only placement.
 * `checked` round-trips via `data-checked`. The reader path styles
 * strikethrough off `[data-checked="true"]`; the editor path uses the
 * ChecklistItemNodeView for an interactive checkbox.
 */
export const NewsletterChecklistItem = Node.create({
  name: "newsletterChecklistItem",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      checked: {
        default: false,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-checked") === "true",
        renderHTML: (attrs) => ({
          "data-checked": String(Boolean(attrs.checked)),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "li[data-newsletter-checklist-item]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            checked: el.getAttribute("data-checked") === "true",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const checked = Boolean(node.attrs.checked);
    return [
      "li",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-checklist-item": "true",
        class:
          "newsletter-checklist-item" +
          (checked ? " newsletter-checklist-item--checked" : ""),
      }),
      0,
    ] as any;
  },
});
