/**
 * Composed newsletter authoring editor — the surface consumed by the G4-B
 * editor page.
 *
 * Architectural notes:
 *
 * - NodeView wiring: each G4-0 custom node is extended via `.extend({
 *     addNodeView: () => ReactNodeViewRenderer(View) })` in this module, NOT
 *   the shared @/components/newsletter/tiptap source. This keeps the schema
 *   module reusable by the read-only G6 reader and convert_html_to_tiptap
 *   Edge Function without dragging React/UI deps.
 *
 * - BubbleMenu: registered as a ProseMirror plugin via BubbleMenuPlugin (not
 *   the deprecated <BubbleMenu> React child). See NewsletterBubbleMenu.tsx.
 *
 * - Slash menu: @tiptap/suggestion + tippy.js. See NewsletterSlashMenu.tsx.
 *
 * - Floating "+": absolute-positioned overlay inside the relative editor
 *   wrapper. Reads cursor coords via view.coordsAtPos, throttled with rAF.
 *
 * - Image upload: routed through request-asset-upload (v5) →
 *   finalize-asset-upload (v3), with newsletter_article_id scope and
 *   ref_field='inline_image'. The image NodeView reads articleId from
 *   NewsletterEditorContext.
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { EditorContent, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import {
  buildExtensions,
  NewsletterCallout,
  NewsletterEmbed,
  NewsletterImage,
  NewsletterKeyMoment,
  NewsletterKeyMoments,
  NewsletterPullquote,
  NewsletterStatCallout,
  NewsletterTwoColumn,
  NewsletterTwoColumnPane,
  NewsletterSectionRule,
  NewsletterMasthead,
  NewsletterByline,
  NewsletterChecklistItem,
  NewsletterDomainRow,
  NewsletterIndexCard,
  NewsletterMath,
  NewsletterTerminal,
  NewsletterCodeDiff,
  NewsletterChart,
} from "@/components/newsletter/tiptap";
import { NewsletterCodeBlock } from "@/components/newsletter/tiptap/buildExtensions";
import type { NewsletterTipTapDoc } from "@/components/newsletter/tiptap/types";
import { ImageNodeView } from "@/components/newsletter/tiptap/nodeviews/ImageNodeView";
import { CalloutNodeView } from "@/components/newsletter/tiptap/nodeviews/CalloutNodeView";
import { StatCalloutNodeView } from "@/components/newsletter/tiptap/nodeviews/StatCalloutNodeView";
import { EmbedNodeView } from "@/components/newsletter/tiptap/nodeviews/EmbedNodeView";
import { PullquoteNodeView } from "@/components/newsletter/tiptap/nodeviews/PullquoteNodeView";
import { TwoColumnNodeView } from "@/components/newsletter/tiptap/nodeviews/TwoColumnNodeView";
import { TwoColumnPaneNodeView } from "@/components/newsletter/tiptap/nodeviews/TwoColumnPaneNodeView";
import { KeyMomentsNodeView } from "@/components/newsletter/tiptap/nodeviews/KeyMomentsNodeView";
import { KeyMomentNodeView } from "@/components/newsletter/tiptap/nodeviews/KeyMomentNodeView";
import { SectionRuleNodeView } from "@/components/newsletter/tiptap/nodeviews/SectionRuleNodeView";
import { MastheadNodeView } from "@/components/newsletter/tiptap/nodeviews/MastheadNodeView";
import { BylineNodeView } from "@/components/newsletter/tiptap/nodeviews/BylineNodeView";
import { ChecklistItemNodeView } from "@/components/newsletter/tiptap/nodeviews/ChecklistItemNodeView";
import { DomainRowNodeView } from "@/components/newsletter/tiptap/nodeviews/DomainRowNodeView";
import { IndexCardNodeView } from "@/components/newsletter/tiptap/nodeviews/IndexCardNodeView";
import { CodeBlockNodeView } from "@/components/newsletter/tiptap/nodeviews/CodeBlockNodeView";
import { MathNodeView } from "@/components/newsletter/tiptap/nodeviews/MathNodeView";
import { TerminalNodeView } from "@/components/newsletter/tiptap/nodeviews/TerminalNodeView";
import { CodeDiffNodeView } from "@/components/newsletter/tiptap/nodeviews/CodeDiffNodeView";
import { ChartNodeView } from "@/components/newsletter/tiptap/nodeviews/ChartNodeView";
import { NewsletterToolbar } from "./NewsletterToolbar";
import { NewsletterBubbleMenu } from "./NewsletterBubbleMenu";
import { NewsletterFloatingPlus } from "./NewsletterFloatingPlus";
import {
  NewsletterSlashCommand,
  setSlashCommandContext,
} from "./NewsletterSlashMenu";
import {
  NewsletterEditorContext,
  type NewsletterEditorContextValue,
} from "./NewsletterEditorContext";
import "tippy.js/dist/tippy.css";
import "@/styles/newsletter-prose.css";

export interface NewsletterEditorProps {
  articleId: string;
  initialContent: NewsletterTipTapDoc;
  onChange: (next: NewsletterTipTapDoc) => void;
  disabled?: boolean;
  placeholder?: string;
  onOpenImportHtml?: () => void;
}

export interface NewsletterEditorHandle {
  setContent: (next: NewsletterTipTapDoc) => void;
}

// Each node + its corresponding React NodeView. Extending here (not in G4-0)
// keeps the shared schema headless.
const NodeImageEdit = NewsletterImage.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
const NodeCalloutEdit = NewsletterCallout.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },
});
const NodeStatCalloutEdit = NewsletterStatCallout.extend({
  addNodeView() {
    return ReactNodeViewRenderer(StatCalloutNodeView);
  },
});
const NodeEmbedEdit = NewsletterEmbed.extend({
  addNodeView() {
    return ReactNodeViewRenderer(EmbedNodeView);
  },
});
const NodePullquoteEdit = NewsletterPullquote.extend({
  addNodeView() {
    return ReactNodeViewRenderer(PullquoteNodeView);
  },
});
const NodeTwoColumnEdit = NewsletterTwoColumn.extend({
  addNodeView() {
    return ReactNodeViewRenderer(TwoColumnNodeView);
  },
});
const NodeTwoColumnPaneEdit = NewsletterTwoColumnPane.extend({
  addNodeView() {
    return ReactNodeViewRenderer(TwoColumnPaneNodeView);
  },
});
const NodeKeyMomentsEdit = NewsletterKeyMoments.extend({
  addNodeView() {
    return ReactNodeViewRenderer(KeyMomentsNodeView);
  },
});
const NodeKeyMomentEdit = NewsletterKeyMoment.extend({
  addNodeView() {
    return ReactNodeViewRenderer(KeyMomentNodeView);
  },
});
const NodeSectionRuleEdit = NewsletterSectionRule.extend({
  addNodeView() {
    return ReactNodeViewRenderer(SectionRuleNodeView);
  },
});
const NodeMastheadEdit = NewsletterMasthead.extend({
  addNodeView() {
    return ReactNodeViewRenderer(MastheadNodeView);
  },
});
const NodeBylineEdit = NewsletterByline.extend({
  addNodeView() {
    return ReactNodeViewRenderer(BylineNodeView);
  },
});
const NodeChecklistItemEdit = NewsletterChecklistItem.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ChecklistItemNodeView);
  },
});
const NodeDomainRowEdit = NewsletterDomainRow.extend({
  addNodeView() {
    return ReactNodeViewRenderer(DomainRowNodeView);
  },
});
const NodeIndexCardEdit = NewsletterIndexCard.extend({
  addNodeView() {
    return ReactNodeViewRenderer(IndexCardNodeView);
  },
});
const NodeCodeBlockEdit = NewsletterCodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView);
  },
});

const EDITABLE_NODE_OVERRIDES = [
  NodeImageEdit,
  NodeCalloutEdit,
  NodeStatCalloutEdit,
  NodeEmbedEdit,
  NodePullquoteEdit,
  NodeTwoColumnEdit,
  NodeTwoColumnPaneEdit,
  NodeKeyMomentsEdit,
  NodeKeyMomentEdit,
  NodeSectionRuleEdit,
  NodeMastheadEdit,
  NodeBylineEdit,
  NodeChecklistItemEdit,
  NodeDomainRowEdit,
  NodeIndexCardEdit,
  NodeCodeBlockEdit,
];

const OVERRIDE_NAMES = new Set(EDITABLE_NODE_OVERRIDES.map((n) => n.name));

export const NewsletterEditor = forwardRef<NewsletterEditorHandle, NewsletterEditorProps>(function NewsletterEditor(
  { articleId, initialContent, onChange, disabled, placeholder, onOpenImportHtml },
  ref,
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const toolbarFileRef = useRef<{ open: () => void } | null>(null);

  const ctxValue = useMemo<NewsletterEditorContextValue>(
    () => ({ articleId }),
    [articleId],
  );

  const extensions = useMemo(() => {
    const base = buildExtensions({
      editable: !disabled,
      placeholder,
    });
    // Replace each headless node with its React-wrapped equivalent.
    const replaced = base.map((ext) => {
      if (OVERRIDE_NAMES.has(ext.name)) {
        return EDITABLE_NODE_OVERRIDES.find((n) => n.name === ext.name) ?? ext;
      }
      return ext;
    });
    replaced.push(NewsletterSlashCommand);
    return replaced;
  }, [disabled, placeholder]);

  const editor = useEditor(
    {
      extensions,
      content: initialContent,
      editable: !disabled,
      onUpdate: ({ editor: e }) => {
        onChangeRef.current(e.getJSON() as NewsletterTipTapDoc);
      },
    },
    [extensions],
  );

  useImperativeHandle(ref, () => ({
    setContent: (next: NewsletterTipTapDoc) => {
      if (!editor) return;
      editor.commands.setContent(next, { emitUpdate: true });
    },
  }), [editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  // Bridge: the slash menu's `/image` command needs to trigger the toolbar's
  // hidden file input. The toolbar exposes a setter via the ref below.
  useEffect(() => {
    setSlashCommandContext({
      pickImage: () => toolbarFileRef.current?.open(),
    });
    return () => setSlashCommandContext({});
  }, []);

  if (!editor) {
    return (
      <div className="newsletter-editor min-h-[400px] animate-pulse rounded-md bg-[var(--bw-cream-200)]" />
    );
  }

  return (
    <NewsletterEditorContext.Provider value={ctxValue}>
      <div className="newsletter-editor flex flex-col overflow-hidden rounded-lg border border-[var(--border-1)] bg-white shadow-sm">
        <NewsletterToolbar
          editor={editor}
          articleId={articleId}
          disabled={disabled}
          imageInputRef={toolbarFileRef}
          onOpenImportHtml={onOpenImportHtml}
        />
        <div
          ref={wrapperRef}
          className="relative"
          style={{
            paddingTop: "var(--s-6)",
            paddingBottom: "var(--s-12)",
            paddingLeft: "var(--s-8)",
            paddingRight: "var(--s-8)",
          }}
        >
          <NewsletterFloatingPlus editor={editor} containerRef={wrapperRef} />
          <div className="newsletter-prose mx-auto">
            <EditorContent editor={editor} className="min-h-[400px]" />
          </div>
          <NewsletterBubbleMenu editor={editor} />
        </div>
      </div>
    </NewsletterEditorContext.Provider>
  );
});

export { NewsletterEditorContext } from "./NewsletterEditorContext";
