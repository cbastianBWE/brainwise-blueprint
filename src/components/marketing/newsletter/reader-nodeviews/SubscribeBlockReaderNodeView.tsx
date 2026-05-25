import { NodeViewWrapper } from "@tiptap/react";
import SubscribeForm from "@/components/marketing/newsletter/SubscribeForm";

/**
 * Reader-path NodeView for newsletterSubscribeBlock. Mounts the live
 * SubscribeForm without modifying that component. The `source` string
 * lets server-side analytics attribute the signup to inline article CTAs.
 */
export default function SubscribeBlockReaderNodeView() {
  return (
    <NodeViewWrapper
      as="div"
      data-newsletter-subscribe-block="true"
      className="newsletter-subscribe-block my-6"
    >
      <SubscribeForm source="newsletter-article-inline" variant="inline" />
    </NodeViewWrapper>
  );
}
