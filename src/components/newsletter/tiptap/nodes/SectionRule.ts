import { Node, mergeAttributes } from "@tiptap/core";
import type { NewsletterSectionRuleStyle } from "../types";

const STYLES: NewsletterSectionRuleStyle[] = ["numbered", "plain", "titled", "dot"];

export const NewsletterSectionRule = Node.create({
  name: "newsletterSectionRule",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      number: { default: "" },
      style: {
        default: "plain" as NewsletterSectionRuleStyle,
        parseHTML: (el) => {
          const v = (el as HTMLElement).getAttribute("data-style");
          return STYLES.includes(v as NewsletterSectionRuleStyle)
            ? (v as NewsletterSectionRuleStyle)
            : "plain";
        },
      },
      title: { default: null as string | null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "hr.section-rule",
        priority: 60,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            number: el.getAttribute("data-number") || "",
            style:
              (el.getAttribute("data-style") as NewsletterSectionRuleStyle) ||
              "plain",
            title: el.getAttribute("data-title") || null,
          };
        },
      },
      {
        tag: "hr[data-numbered]",
        priority: 60,
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            number: el.getAttribute("data-numbered") || "",
            style: "numbered" as NewsletterSectionRuleStyle,
            title: null,
          };
        },
      },
      {
        tag: "hr.dot-divider",
        priority: 60,
        getAttrs: () => ({
          number: "",
          style: "dot" as NewsletterSectionRuleStyle,
          title: null,
        }),
      },
      {
        tag: "div.section-rule",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          // Prefer canonical data-* attrs (round-trip); fall back to visible
          // .section-rule-num / .section-rule-title for external import per §151.
          const dataNumber = el.getAttribute("data-number");
          const visibleNumber = el
            .querySelector(".section-rule-num")
            ?.textContent?.trim();
          const number =
            dataNumber && dataNumber.length > 0
              ? dataNumber
              : visibleNumber || "";

          const dataStyle = el.getAttribute(
            "data-style",
          ) as NewsletterSectionRuleStyle | null;
          const style: NewsletterSectionRuleStyle =
            dataStyle && STYLES.includes(dataStyle)
              ? dataStyle
              : visibleNumber
                ? "numbered"
                : "plain";

          const dataTitle = el.getAttribute("data-title");
          const visibleTitle = el
            .querySelector(".section-rule-title, .section-rule-label")
            ?.textContent?.trim();
          const title =
            dataTitle && dataTitle.length > 0
              ? dataTitle
              : visibleTitle || null;

          return { number, style, title };
        },
      },
      {
        tag: "div.section-break",
        getAttrs: () => ({
          number: "",
          style: "plain" as NewsletterSectionRuleStyle,
          title: null,
        }),
      },
      {
        tag: "[data-newsletter-section-rule]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            number: el.getAttribute("data-number") || "",
            style:
              (el.getAttribute("data-style") as NewsletterSectionRuleStyle) ||
              "plain",
            title: el.getAttribute("data-title") || null,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const style = (node.attrs.style as NewsletterSectionRuleStyle) || "plain";
    const number = (node.attrs.number as string) || "";
    const title = (node.attrs.title as string | null) || "";

    const wrapperAttrs: Record<string, string> = {
      "data-newsletter-section-rule": "true",
      "data-style": style,
      "data-number": number,
      "data-title": title,
      class: `newsletter-section-rule newsletter-section-rule--${style}`,
    };

    const inner: unknown[] = [];
    if (style === "numbered") {
      inner.push(["hr", { class: "newsletter-section-rule__rule" }]);
      inner.push([
        "span",
        { class: "newsletter-section-rule__number" },
        `[ ${number} ]`,
      ]);
      inner.push(["hr", { class: "newsletter-section-rule__rule" }]);
    } else if (style === "titled") {
      inner.push(["span", { class: "newsletter-section-rule__title" }, title]);
      inner.push(["hr", { class: "newsletter-section-rule__rule" }]);
    } else if (style === "dot") {
      inner.push(["span", { class: "newsletter-section-rule__dot" }, "·"]);
      inner.push(["span", { class: "newsletter-section-rule__dot" }, "·"]);
      inner.push(["span", { class: "newsletter-section-rule__dot" }, "·"]);
    } else {
      inner.push(["hr", { class: "newsletter-section-rule__rule" }]);
    }

    return ["div", mergeAttributes(HTMLAttributes, wrapperAttrs), ...inner] as never;
  },
});
