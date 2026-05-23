/**
 * Bubble menu that floats above non-empty text selections.
 *
 * In TipTap v3 the React `<BubbleMenu />` component pattern is deprecated.
 * The canonical approach is the @tiptap/extension-bubble-menu Extension,
 * configured with an `element` ref pointing at a hidden DOM container that
 * the extension shows/hides over the current selection.
 *
 * We render a React subtree into that container via a portal — this gives
 * us shadcn Tooltip etc. while staying on the v3 extension API.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type Editor } from "@tiptap/react";
import { BubbleMenu as BubbleMenuExt } from "@tiptap/extension-bubble-menu";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Strikethrough,
  Code as CodeIcon,
  Link as LinkIcon,
  Type as TypeIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isSafeHttpUrl } from "@/lib/safeUrl";

interface NewsletterBubbleMenuProps {
  editor: Editor;
}

export function NewsletterBubbleMenu({ editor }: NewsletterBubbleMenuProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  // Create the host element once on mount and register the extension.
  useEffect(() => {
    const el = document.createElement("div");
    el.style.visibility = "hidden";
    document.body.appendChild(el);
    elRef.current = el;
    setMounted(true);

    const ext = BubbleMenuExt.configure({
      element: el,
      pluginKey: "newsletterBubbleMenu",
      shouldShow: ({ editor, from, to, state }) => {
        if (!editor.isEditable) return false;
        if (from === to) return false;
        // Hide inside atom/embeddable nodes where text marks don't apply.
        const $from = state.doc.resolve(from);
        const parent = $from.parent;
        const blockedParents = new Set([
          "newsletterStatCallout",
          "newsletterEmbed",
          "newsletterImage",
        ]);
        if (blockedParents.has(parent.type.name)) return false;
        return true;
      },
    });

    editor.extensionManager.extensions.push(ext);
    editor.registerPlugin(
      ext.config.addProseMirrorPlugins!.call({
        editor,
        options: ext.options,
        storage: ext.storage,
        name: ext.name,
        parent: undefined,
        type: undefined as any,
      } as any)[0],
    );

    return () => {
      try {
        editor.unregisterPlugin("newsletterBubbleMenu");
      } catch {
        /* noop */
      }
      el.remove();
      elRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Reset link mode whenever selection moves
  useEffect(() => {
    const handler = () => {
      setLinkMode(false);
      setLinkUrl("");
    };
    editor.on("selectionUpdate", handler);
    return () => {
      editor.off("selectionUpdate", handler);
    };
  }, [editor]);

  if (!mounted || !elRef.current) return null;

  const isLeadActive = editor.getAttributes("textStyle").fontSize === "lead";

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else if (isSafeHttpUrl(url)) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
    setLinkMode(false);
    setLinkUrl("");
  };

  const Btn = ({
    label,
    shortcut,
    active,
    onClick,
    children,
  }: {
    label: string;
    shortcut?: string;
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onClick();
          }}
          className={cn(
            "flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-xs font-medium transition-colors",
            active
              ? "bg-[#F5741A]/15 text-[#F5741A]"
              : "text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[11px]">
        {label}
        {shortcut && <span className="ml-1 opacity-70">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );

  const node = (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex items-center gap-0.5 rounded-full border border-[var(--border-1)] bg-white p-1 shadow-md animate-in fade-in zoom-in-95 duration-150"
        onMouseDown={(e) => e.preventDefault()}
      >
        {linkMode ? (
          <>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyLink();
                if (e.key === "Escape") setLinkMode(false);
              }}
              placeholder="Paste URL"
              autoFocus
              className="h-7 w-48 rounded-full border-0 bg-transparent px-3 text-xs text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:outline-none"
            />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applyLink();
              }}
              className="rounded-full bg-[#F5741A] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#E06714]"
            >
              Apply
            </button>
          </>
        ) : (
          <>
            <Btn
              label="Bold"
              shortcut="⌘B"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <BoldIcon className="h-3.5 w-3.5" />
            </Btn>
            <Btn
              label="Italic"
              shortcut="⌘I"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <ItalicIcon className="h-3.5 w-3.5" />
            </Btn>
            <Btn
              label="Strikethrough"
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </Btn>
            <Btn
              label="Inline code"
              shortcut="⌘E"
              active={editor.isActive("code")}
              onClick={() => editor.chain().focus().toggleCode().run()}
            >
              <CodeIcon className="h-3.5 w-3.5" />
            </Btn>
            <Btn
              label="Link"
              shortcut="⌘K"
              active={editor.isActive("link")}
              onClick={() => {
                const current = editor.getAttributes("link").href ?? "";
                setLinkUrl(current);
                setLinkMode(true);
              }}
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </Btn>
            <div className="mx-1 h-4 w-px bg-[var(--border-1)]" />
            <Btn
              label="Heading 2"
              active={editor.isActive("heading", { level: 2 })}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              H2
            </Btn>
            <Btn
              label="Heading 3"
              active={editor.isActive("heading", { level: 3 })}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
            >
              H3
            </Btn>
            <Btn
              label="Lead paragraph"
              active={isLeadActive}
              onClick={() => {
                const chain = editor.chain().focus();
                if (isLeadActive) {
                  chain.setMark("textStyle", { fontSize: null }).run();
                } else {
                  chain.setMark("textStyle", { fontSize: "lead" }).run();
                }
              }}
            >
              <TypeIcon className="mr-1 h-3 w-3" />
              Lead
            </Btn>
          </>
        )}
      </div>
    </TooltipProvider>
  );

  return createPortal(node, elRef.current);
}
