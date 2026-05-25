import { Node, mergeAttributes } from "@tiptap/core";

/**
 * newsletterSubscribeBlock — atom skeleton. Editor renders a disabled-look
 * preview NodeView; reader path mounts the real <SubscribeForm /> via a
 * dedicated reader NodeView. The doc itself carries no attrs.
 */
export const NewsletterSubscribeBlock = Node.create({
  name: "newsletterSubscribeBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [{ tag: "div[data-newsletter-subscribe-block]", priority: 60 }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-newsletter-subscribe-block": "true",
        class: "newsletter-subscribe-block",
      }),
    ];
  },
});
