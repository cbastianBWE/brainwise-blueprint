import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterDisclosure — collapsible <details> composite.
 *
 * Parent content `"newsletterDisclosureSummary block+"` forces an editable
 * summary child plus at least one block in the body. The browser handles
 * the native open/close in the reader path; the editor NodeView suppresses
 * native click-toggle on the summary so authoring the summary text doesn't
 * collapse the body.
 */
export const NewsletterDisclosure = Node.create({
  name: "newsletterDisclosure",
  group: "block",
  content: "newsletterDisclosureSummary block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      default_open: {
        default: false,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-default-open") === "true",
        renderHTML: (attrs) => ({
          "data-default-open": attrs.default_open ? "true" : "false",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "details[data-newsletter-disclosure]",
        priority: 60,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            default_open:
              el.getAttribute("data-default-open") === "true" ||
              el.hasAttribute("open"),
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const open = !!node.attrs.default_open;
    const attrs: Record<string, string> = {
      "data-newsletter-disclosure": "true",
      "data-default-open": open ? "true" : "false",
      class: "newsletter-disclosure",
    };
    if (open) attrs.open = "";
    return ["details", mergeAttributes(HTMLAttributes, attrs), 0];
  },
});

/**
 * newsletterDisclosureSummary — inline-only child. Parent-only placement
 * (not in 'block' group). Default DOM rendering is the desired output, so
 * no React NodeView is required.
 */
export const NewsletterDisclosureSummary = Node.create({
  name: "newsletterDisclosureSummary",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [
      { tag: "summary[data-newsletter-disclosure-summary]", priority: 60 },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "summary",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-disclosure-summary": "true",
        class: "newsletter-disclosure-summary",
      }),
      0,
    ];
  },
});
