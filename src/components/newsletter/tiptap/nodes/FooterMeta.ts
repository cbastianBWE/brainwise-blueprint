import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterFooterMeta — atom block rendered at article end with tags + labels.
 * P6a ships with manually-entered values; auto-sync from article fields is
 * deferred to a later cycle.
 */
export const NewsletterFooterMeta = Node.create({
  name: "newsletterFooterMeta",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      tags: { default: [] as string[] },
      issue_label: { default: null as string | null },
      published_label: { default: null as string | null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "footer[data-newsletter-footer-meta]",
        priority: 51,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const tagsRaw = el.getAttribute("data-tags");
          let tags: string[] = [];
          if (tagsRaw) {
            try {
              const parsed = JSON.parse(tagsRaw);
              if (Array.isArray(parsed)) {
                tags = parsed.filter((t): t is string => typeof t === "string");
              }
            } catch {
              /* noop */
            }
          }
          const issue = el.getAttribute("data-issue-label");
          const published = el.getAttribute("data-published-label");
          return {
            tags,
            issue_label: issue && issue.length > 0 ? issue : null,
            published_label:
              published && published.length > 0 ? published : null,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const tags = (node.attrs.tags as string[]) || [];
    const issue = (node.attrs.issue_label as string | null) ?? null;
    const published = (node.attrs.published_label as string | null) ?? null;

    const tagItems = tags.map((t) => [
      "li",
      { "data-newsletter-footer-meta-tag": "true" },
      t,
    ]);

    const labels: unknown[] = [];
    if (issue) {
      labels.push([
        "span",
        { "data-newsletter-footer-meta-issue": "true" },
        issue,
      ]);
    }
    if (published) {
      labels.push([
        "span",
        { "data-newsletter-footer-meta-published": "true" },
        published,
      ]);
    }

    return [
      "footer",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-footer-meta": "true",
        "data-tags": JSON.stringify(tags),
        "data-issue-label": issue ?? "",
        "data-published-label": published ?? "",
      }),
      ["ul", { "data-newsletter-footer-meta-tags": "true" }, ...tagItems],
      ["div", { "data-newsletter-footer-meta-labels": "true" }, ...labels],
    ] as never;
  },
});
