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
import { BubbleMenuPlugin } from "@tiptap/extension-bubble-menu";
import { PluginKey } from "@tiptap/pm/state";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Strikethrough,
  Code as CodeIcon,
  Link as LinkIcon,
  Underline as UnderlineIcon,
  Highlighter,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  CaseSensitive,
  Keyboard as KeyboardIcon,
  BookOpen,
  Palette,
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
  const [abbrMode, setAbbrMode] = useState(false);
  const [abbrTitle, setAbbrTitle] = useState("");

  // Create the host element once on mount and register the extension.
  useEffect(() => {
    const el = document.createElement("div");
    el.style.visibility = "hidden";
    document.body.appendChild(el);
    elRef.current = el;
    setMounted(true);

    const pluginKey = new PluginKey("newsletterBubbleMenu");
    const plugin = BubbleMenuPlugin({
      editor,
      element: el,
      pluginKey,
      shouldShow: ({ editor, from, to, state }) => {
        if (!editor.isEditable) return false;
        if (from === to) return false;
        const $from = state.doc.resolve(from);
        const blockedParents = new Set([
          "newsletterStatCallout",
          "newsletterEmbed",
          "newsletterImage",
        ]);
        if (blockedParents.has($from.parent.type.name)) return false;
        return true;
      },
    });
    editor.registerPlugin(plugin);

    return () => {
      try {
        editor.unregisterPlugin(pluginKey);
      } catch {
        /* noop */
      }
      el.remove();
      elRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);


  // Reset submenu modes whenever selection moves
  useEffect(() => {
    const handler = () => {
      setLinkMode(false);
      setLinkUrl("");
      setAbbrMode(false);
      setAbbrTitle("");
    };
    editor.on("selectionUpdate", handler);
    return () => {
      editor.off("selectionUpdate", handler);
    };
  }, [editor]);

  if (!mounted || !elRef.current) return null;

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

  const applyAbbr = () => {
    const t = abbrTitle.trim();
    if (t) {
      editor
        .chain()
        .focus()
        .extendMarkRange("abbr")
        .setMark("abbr", { title: t })
        .run();
    } else {
      editor.chain().focus().unsetMark("abbr").run();
    }
    setAbbrMode(false);
    setAbbrTitle("");
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
        ) : abbrMode ? (
          <>
            <input
              type="text"
              value={abbrTitle}
              onChange={(e) => setAbbrTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyAbbr();
                if (e.key === "Escape") {
                  setAbbrMode(false);
                  setAbbrTitle("");
                }
              }}
              placeholder="Expanded form (e.g. World Health Organization)"
              autoFocus
              className="h-7 w-64 rounded-full border-0 bg-transparent px-3 text-xs text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:outline-none"
            />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applyAbbr();
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
              label="Small caps"
              active={editor.isActive("smallCaps")}
              onClick={() => editor.chain().focus().toggleSmallCaps().run()}
            >
              <CaseSensitive className="h-3.5 w-3.5" />
            </Btn>
            <Btn
              label="Superscript"
              active={editor.isActive("superscript")}
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
            >
              <SuperscriptIcon className="h-3.5 w-3.5" />
            </Btn>
            <Btn
              label="Subscript"
              active={editor.isActive("subscript")}
              onClick={() => editor.chain().focus().toggleSubscript().run()}
            >
              <SubscriptIcon className="h-3.5 w-3.5" />
            </Btn>
            <Btn
              label="Underline"
              shortcut="⌘U"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </Btn>
            <Btn
              label="Highlight"
              active={editor.isActive("highlight")}
              onClick={() =>
                editor.chain().focus().toggleHighlight({ color: "yellow" }).run()
              }
            >
              <Highlighter className="h-3.5 w-3.5" />
            </Btn>
            <Btn
              label="Keyboard"
              active={editor.isActive("keyboard")}
              onClick={() => editor.chain().focus().toggleKeyboard().run()}
            >
              <KeyboardIcon className="h-3.5 w-3.5" />
            </Btn>
            <Btn
              label="Accent"
              active={editor.isActive("accent")}
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .toggleAccent({
                    color: "orange",
                    style: "plain",
                    weight: "normal",
                  })
                  .run()
              }
            >
              <Palette className="h-3.5 w-3.5" />
            </Btn>
            <Btn
              label="Abbreviation"
              active={editor.isActive("abbr")}
              onClick={() => {
                const existingTitle = editor.getAttributes("abbr").title as
                  | string
                  | undefined;
                setAbbrTitle(existingTitle ?? "");
                setAbbrMode(true);
              }}
            >
              <BookOpen className="h-3.5 w-3.5" />
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
          </>
        )}
      </div>
    </TooltipProvider>
  );

  return createPortal(node, elRef.current);
}
