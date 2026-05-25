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
      // §151 (H5 Cycle 2): import-fallback rules for external task lists.
      { tag: "ul.task-list", priority: 51 },
      { tag: "ul.checklist", priority: 51 },
      { tag: 'ul[class~="todo"]', priority: 51 },
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
      // §151 (H5 Cycle 2): import-fallback rules. Reads <input type="checkbox">
      // state when present; defaults to false otherwise (Q7).
      {
        tag: "ul.task-list > li",
        priority: 51,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const cb = el.querySelector("input[type='checkbox']");
          return {
            checked: cb instanceof HTMLInputElement ? cb.checked : false,
          };
        },
      },
      {
        tag: "ul.checklist > li",
        priority: 51,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const cb = el.querySelector("input[type='checkbox']");
          return {
            checked: cb instanceof HTMLInputElement ? cb.checked : false,
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
