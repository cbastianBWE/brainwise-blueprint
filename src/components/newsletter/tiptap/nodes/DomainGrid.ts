import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterDomainGrid — numbered metric/domain rows (parent + 1+ rows).
 *
 * Child `newsletterDomainRow` is an atom (no inline content), so editing
 * its attrs requires a React NodeView (wired in NewsletterEditor.tsx per
 * §146). Schema stays headless.
 */
export const NewsletterDomainGrid = Node.create({
  name: "newsletterDomainGrid",
  group: "block",
  content: "newsletterDomainRow+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      style: {
        default: "rows" as "rows" | "cards",
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-grid-style") || "rows",
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-grid-style": String(attrs.style),
        }),
      },
      show_numbers: {
        default: true,
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-show-numbers") !== "false",
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-show-numbers": String(Boolean(attrs.show_numbers)),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "section[data-newsletter-domain-grid]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-domain-grid": "true",
        class: "newsletter-domain-grid",
      }),
      0,
    ] as any;
  },
});

/**
 * newsletterDomainRow — atom row inside DomainGrid.
 *
 * Intentionally NOT in 'block' group. Atom + selectable + draggable.
 * renderHTML emits a structured DOM so the document round-trips to plain
 * HTML cleanly (reader + export); the editor surface is the React NodeView.
 * Conditional tag chip is omitted from the array when `tag_text` is empty.
 */
export const NewsletterDomainRow = Node.create({
  name: "newsletterDomainRow",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      number: { default: "" },
      label: { default: "" },
      tag_text: { default: null as string | null },
      tag_variant: { default: null as string | null },
      description: { default: "" },
      count_value: { default: "" },
      count_label: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-newsletter-domain-row]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            number: el.getAttribute("data-number") || "",
            label: el.getAttribute("data-label") || "",
            tag_text: el.getAttribute("data-tag-text") || null,
            tag_variant: el.getAttribute("data-tag-variant") || null,
            description: el.getAttribute("data-description") || "",
            count_value: el.getAttribute("data-count-value") || "",
            count_label: el.getAttribute("data-count-label") || "",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const number = (node.attrs.number as string) || "";
    const label = (node.attrs.label as string) || "";
    const tagText = node.attrs.tag_text as string | null;
    const tagVariant = node.attrs.tag_variant as string | null;
    const description = (node.attrs.description as string) || "";
    const countValue = (node.attrs.count_value as string) || "";
    const countLabel = (node.attrs.count_label as string) || "";

    const labelChildren: any[] = [label];
    if (tagText) {
      labelChildren.push([
        "span",
        {
          class: `newsletter-domain-row__tag newsletter-domain-row__tag--${
            tagVariant || "neutral"
          }`,
        },
        tagText,
      ]);
    }

    const dataAttrs: Record<string, string> = {
      "data-newsletter-domain-row": "true",
      "data-number": number,
      "data-label": label,
      "data-description": description,
      "data-count-value": countValue,
      "data-count-label": countLabel,
      class: "newsletter-domain-row",
    };
    if (tagText) dataAttrs["data-tag-text"] = tagText;
    if (tagVariant) dataAttrs["data-tag-variant"] = tagVariant;

    return [
      "div",
      mergeAttributes(HTMLAttributes, dataAttrs),
      ["div", { class: "newsletter-domain-row__num" }, number],
      [
        "div",
        { class: "newsletter-domain-row__main" },
        ["div", { class: "newsletter-domain-row__label" }, ...labelChildren],
        ["div", { class: "newsletter-domain-row__desc" }, description],
      ],
      [
        "div",
        { class: "newsletter-domain-row__count" },
        ["div", { class: "newsletter-domain-row__count-value" }, countValue],
        ["div", { class: "newsletter-domain-row__count-label" }, countLabel],
      ],
    ] as any;
  },
});
