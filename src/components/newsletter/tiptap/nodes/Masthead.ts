import { Node, mergeAttributes } from "@tiptap/core";

export const NewsletterMasthead = Node.create({
  name: "newsletterMasthead",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      publication: { default: "" },
      issue_label: { default: null as string | null },
      date_label: { default: null as string | null },
      logo_glyph: { default: null as string | null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "header[data-newsletter-masthead]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            publication: el.getAttribute("data-publication") || "",
            issue_label: el.getAttribute("data-issue-label") || null,
            date_label: el.getAttribute("data-date-label") || null,
            logo_glyph: el.getAttribute("data-logo-glyph") || null,
          };
        },
      },
      { tag: "div.masthead" },
      { tag: "div.topbar" },
      { tag: "header.publication" },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const publication = (node.attrs.publication as string) || "";
    const issue = (node.attrs.issue_label as string | null) || "";
    const date = (node.attrs.date_label as string | null) || "";
    const glyph = (node.attrs.logo_glyph as string | null) || "";

    const inner: unknown[] = [];
    if (glyph) inner.push(["span", { class: "newsletter-masthead__glyph" }, glyph]);
    if (publication) {
      if (inner.length > 0)
        inner.push(["span", { class: "newsletter-masthead__separator" }, "·"]);
      inner.push([
        "span",
        { class: "newsletter-masthead__publication" },
        publication,
      ]);
    }
    if (issue) {
      if (inner.length > 0)
        inner.push(["span", { class: "newsletter-masthead__separator" }, "·"]);
      inner.push(["span", { class: "newsletter-masthead__issue" }, issue]);
    }
    if (date) {
      if (inner.length > 0)
        inner.push(["span", { class: "newsletter-masthead__separator" }, "·"]);
      inner.push(["span", { class: "newsletter-masthead__date" }, date]);
    }

    return [
      "header",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-masthead": "true",
        "data-publication": publication,
        "data-issue-label": issue,
        "data-date-label": date,
        "data-logo-glyph": glyph,
        class: "newsletter-masthead",
      }),
      ...inner,
    ] as never;
  },
});
