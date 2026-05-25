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
  BookMarked,
  Palette,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  Rows3,
  Columns3,
  Heading as HeadingIcon,
  Trash2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isSafeHttpUrl } from "@/lib/safeUrl";

type AccentColor = "orange" | "forest" | "teal" | "plum" | "mustard" | "navy";
type AccentStyle = "plain" | "italic" | "bold-italic";
type AccentWeight = "normal" | "heavy";
type HighlightColor = "yellow" | "orange" | "forest" | "pink" | "blue";

type Mode =
  | { kind: "default" }
  | { kind: "link"; url: string }
  | { kind: "abbr"; title: string }
  | {
      kind: "accent";
      color: AccentColor;
      style: AccentStyle;
      weight: AccentWeight;
    }
  | { kind: "highlight"; color: HighlightColor }
  | { kind: "definition"; definition_text: string; source: string }
  | { kind: "footnote_ref"; footnote_text: string };

interface NewsletterBubbleMenuProps {
  editor: Editor;
}

export function NewsletterBubbleMenu({ editor }: NewsletterBubbleMenuProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>({ kind: "default" });

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
        const $from = state.doc.resolve(from);
        const blockedParents = new Set([
          "newsletterStatCallout",
          "newsletterEmbed",
          "newsletterImage",
          "newsletterSectionRule",
          "newsletterByline",
          "newsletterMasthead",
          "newsletterFooterMeta",
          "newsletterFurtherReading",
          "newsletterAuthorBio",
          "newsletterCta",
          "newsletterSubscribeBlock",
          "newsletterRelatedArticles",
          "newsletterFootnotes",
        ]);
        if (blockedParents.has($from.parent.type.name)) return false;
        // Allow collapsed caret inside a table cell so table action
        // buttons appear without requiring a text selection.
        if (editor.isActive("table")) return true;
        if (from === to) return false;
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
    const handler = () => setMode({ kind: "default" });
    editor.on("selectionUpdate", handler);
    return () => {
      editor.off("selectionUpdate", handler);
    };
  }, [editor]);

  // Escape closes any open submenu
  useEffect(() => {
    if (mode.kind === "default") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode({ kind: "default" });
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mode.kind]);

  if (!mounted || !elRef.current) return null;

  const applyLink = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().unsetLink().run();
    } else if (isSafeHttpUrl(trimmed)) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: trimmed })
        .run();
    }
    setMode({ kind: "default" });
  };

  const applyAbbr = (title: string) => {
    const t = title.trim();
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
    setMode({ kind: "default" });
  };

  const applyDefinition = (definition_text: string, source: string) => {
    const dt = definition_text.trim();
    const src = source.trim();
    if (dt) {
      editor
        .chain()
        .focus()
        .extendMarkRange("definition")
        .setMark("definition", {
          definition_text: dt,
          source: src.length > 0 && isSafeHttpUrl(src) ? src : null,
        })
        .run();
    } else {
      editor.chain().focus().unsetMark("definition").run();
    }
    setMode({ kind: "default" });
  };

  const applyFootnoteRef = (footnote_text: string) => {
    const ft = footnote_text.trim();
    if (ft) {
      editor
        .chain()
        .focus()
        .extendMarkRange("footnoteRef")
        .setMark("footnoteRef", { footnote_text: ft })
        .run();
    } else {
      editor.chain().focus().unsetMark("footnoteRef").run();
    }
    setMode({ kind: "default" });
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

  const renderBody = () => {
    switch (mode.kind) {
      case "link": {
        const url = mode.url;
        return (
          <>
            <input
              type="text"
              value={url}
              onChange={(e) => setMode({ kind: "link", url: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyLink(url);
              }}
              placeholder="Paste URL"
              autoFocus
              className="h-7 w-48 rounded-full border-0 bg-transparent px-3 text-xs text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:outline-none"
            />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applyLink(url);
              }}
              className="rounded-full bg-[#F5741A] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#E06714]"
            >
              Apply
            </button>
          </>
        );
      }
      case "abbr": {
        const title = mode.title;
        return (
          <>
            <input
              type="text"
              value={title}
              onChange={(e) =>
                setMode({ kind: "abbr", title: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") applyAbbr(title);
              }}
              placeholder="Expanded form (e.g. World Health Organization)"
              autoFocus
              className="h-7 w-64 rounded-full border-0 bg-transparent px-3 text-xs text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:outline-none"
            />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applyAbbr(title);
              }}
              className="rounded-full bg-[#F5741A] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#E06714]"
            >
              Apply
            </button>
          </>
        );
      }
      case "definition": {
        const { definition_text, source } = mode;
        const sourceInvalid = source.length > 0 && !isSafeHttpUrl(source);
        return (
          <div className="flex w-80 flex-col gap-2 p-1">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[var(--fg-3)]">
                Definition
              </span>
              <input
                type="text"
                value={definition_text}
                onChange={(e) =>
                  setMode({ ...mode, definition_text: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyDefinition(definition_text, source);
                }}
                placeholder="What does this term mean?"
                autoFocus
                className="h-7 rounded-md border border-[var(--border-1)] bg-white px-2 text-xs text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:border-[#F5741A] focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[var(--fg-3)]">
                Source URL (optional)
              </span>
              <input
                type="text"
                value={source}
                onChange={(e) => setMode({ ...mode, source: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyDefinition(definition_text, source);
                }}
                placeholder="https://…"
                className={cn(
                  "h-7 rounded-md border bg-white px-2 text-xs text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:outline-none",
                  sourceInvalid
                    ? "border-red-500 focus:border-red-500"
                    : "border-[var(--border-1)] focus:border-[#F5741A]",
                )}
              />
            </div>
            <div className="flex items-center gap-1 pt-1">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyDefinition(definition_text, source);
                }}
                className="rounded-full bg-[#F5741A] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#E06714]"
              >
                Apply
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().unsetMark("definition").run();
                  setMode({ kind: "default" });
                }}
                className="rounded-full px-3 py-1 text-[11px] font-medium text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]"
              >
                Remove
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setMode({ kind: "default" });
                }}
                className="ml-auto rounded-full px-2 py-1 text-[11px] text-[var(--fg-3)] hover:bg-[var(--bw-cream-200)]"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      }
      case "footnote_ref": {
        const { footnote_text } = mode;
        return (
          <div className="flex w-80 flex-col gap-2 p-1">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[var(--fg-3)]">
                Footnote text
              </span>
              <textarea
                value={footnote_text}
                onChange={(e) =>
                  setMode({ kind: "footnote_ref", footnote_text: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    applyFootnoteRef(footnote_text);
                  }
                }}
                rows={4}
                placeholder="Footnote body (will appear in the Footnotes block)"
                autoFocus
                className="rounded-md border border-[var(--border-1)] bg-white px-2 py-1.5 text-xs text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:border-[#F5741A] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1 pt-1">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyFootnoteRef(footnote_text);
                }}
                className="rounded-full bg-[#F5741A] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#E06714]"
              >
                Apply
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().unsetMark("footnoteRef").run();
                  setMode({ kind: "default" });
                }}
                className="rounded-full px-3 py-1 text-[11px] font-medium text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]"
              >
                Remove
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setMode({ kind: "default" });
                }}
                className="ml-auto rounded-full px-2 py-1 text-[11px] text-[var(--fg-3)] hover:bg-[var(--bw-cream-200)]"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      }
      case "accent": {
        const m = mode;
        const ACCENT_COLORS: AccentColor[] = [
          "orange",
          "forest",
          "teal",
          "plum",
          "mustard",
          "navy",
        ];
        const ACCENT_STYLES: AccentStyle[] = ["plain", "italic", "bold-italic"];
        const ACCENT_WEIGHTS: AccentWeight[] = ["normal", "heavy"];
        const STYLE_LABELS: Record<AccentStyle, string> = {
          plain: "Plain",
          italic: "Italic",
          "bold-italic": "Bold-Italic",
        };
        const WEIGHT_LABELS: Record<AccentWeight, string> = {
          normal: "Normal",
          heavy: "Heavy",
        };
        return (
          <div className="flex w-72 flex-col gap-2 p-1">
            <div className="flex items-center gap-1.5">
              <span className="w-12 text-[10px] uppercase tracking-wider text-[var(--fg-3)]">
                Color
              </span>
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setMode({ ...m, color: c });
                  }}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 transition-all",
                    m.color === c
                      ? "border-[#F5741A] scale-110"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ background: `var(--bw-accent-${c})` }}
                  aria-label={c}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="w-12 text-[10px] uppercase tracking-wider text-[var(--fg-3)]">
                Style
              </span>
              {ACCENT_STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setMode({ ...m, style: s });
                  }}
                  className={cn(
                    "rounded-full px-3 py-0.5 text-[11px] font-medium transition-colors",
                    m.style === s
                      ? "bg-[#F5741A]/15 text-[#F5741A]"
                      : "text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]",
                  )}
                >
                  {STYLE_LABELS[s]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="w-12 text-[10px] uppercase tracking-wider text-[var(--fg-3)]">
                Weight
              </span>
              {ACCENT_WEIGHTS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setMode({ ...m, weight: w });
                  }}
                  className={cn(
                    "rounded-full px-3 py-0.5 text-[11px] font-medium transition-colors",
                    m.weight === w
                      ? "bg-[#F5741A]/15 text-[#F5741A]"
                      : "text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]",
                  )}
                >
                  {WEIGHT_LABELS[w]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 pt-1">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor
                    .chain()
                    .focus()
                    .setMark("accent", {
                      color: m.color,
                      style: m.style,
                      weight: m.weight,
                    })
                    .run();
                  setMode({ kind: "default" });
                }}
                className="rounded-full bg-[#F5741A] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#E06714]"
              >
                Apply
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().unsetMark("accent").run();
                  setMode({ kind: "default" });
                }}
                className="rounded-full px-3 py-1 text-[11px] font-medium text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]"
              >
                Remove
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setMode({ kind: "default" });
                }}
                className="ml-auto rounded-full px-2 py-1 text-[11px] text-[var(--fg-3)] hover:bg-[var(--bw-cream-200)]"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      }
      case "highlight": {
        const m = mode;
        const HIGHLIGHT_COLORS: HighlightColor[] = [
          "yellow",
          "orange",
          "forest",
          "pink",
          "blue",
        ];
        const COLOR_BG: Record<HighlightColor, string> = {
          yellow: "color-mix(in oklch, var(--bw-amber) 30%, white)",
          orange: "color-mix(in oklch, var(--bw-orange) 20%, white)",
          forest: "color-mix(in oklch, var(--bw-forest) 18%, white)",
          pink: "color-mix(in oklch, #FF7B9D 22%, white)",
          blue: "color-mix(in oklch, var(--bw-teal) 18%, white)",
        };
        return (
          <div className="flex items-center gap-1.5 p-1">
            <span className="text-[10px] uppercase tracking-wider text-[var(--fg-3)]">
              Highlight
            </span>
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor
                    .chain()
                    .focus()
                    .setMark("highlight", { color: c })
                    .run();
                  setMode({ kind: "default" });
                }}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-all",
                  m.color === c
                    ? "border-[#F5741A] scale-110"
                    : "border-transparent hover:scale-105",
                )}
                style={{ background: COLOR_BG[c] }}
                aria-label={c}
              />
            ))}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().unsetMark("highlight").run();
                setMode({ kind: "default" });
              }}
              className="ml-1 rounded-full px-2 py-1 text-[11px] font-medium text-[var(--fg-2)] hover:bg-[var(--bw-cream-200)]"
            >
              Remove
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setMode({ kind: "default" });
              }}
              className="rounded-full px-2 py-1 text-[11px] text-[var(--fg-3)] hover:bg-[var(--bw-cream-200)]"
            >
              Cancel
            </button>
          </div>
        );
      }
      default:
        return (
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
              onClick={() =>
                editor.chain().focus().toggleSuperscript().run()
              }
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
              onClick={() => {
                const existing = editor.getAttributes("highlight");
                setMode({
                  kind: "highlight",
                  color: (existing.color as HighlightColor) ?? "yellow",
                });
              }}
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
              onClick={() => {
                const existing = editor.getAttributes("accent");
                setMode({
                  kind: "accent",
                  color: (existing.color as AccentColor) ?? "orange",
                  style: (existing.style as AccentStyle) ?? "plain",
                  weight: (existing.weight as AccentWeight) ?? "normal",
                });
              }}
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
                setMode({ kind: "abbr", title: existingTitle ?? "" });
              }}
            >
              <BookOpen className="h-3.5 w-3.5" />
            </Btn>
            <Btn
              label="Definition"
              active={editor.isActive("definition")}
              onClick={() => {
                const existing = editor.getAttributes("definition");
                setMode({
                  kind: "definition",
                  definition_text: (existing.definition_text as string) ?? "",
                  source: (existing.source as string | null) ?? "",
                });
              }}
            >
              <BookMarked className="h-3.5 w-3.5" />
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
                const current = (editor.getAttributes("link").href as
                  | string
                  | undefined) ?? "";
                setMode({ kind: "link", url: current });
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
            {editor.isActive("table") && (
              <>
                <div className="mx-1 h-4 w-px bg-[var(--border-1)]" />
                <Btn
                  label="Row above"
                  onClick={() =>
                    editor.chain().focus().addRowBefore().run()
                  }
                >
                  <ArrowUpToLine className="h-3.5 w-3.5" />
                </Btn>
                <Btn
                  label="Row below"
                  onClick={() =>
                    editor.chain().focus().addRowAfter().run()
                  }
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                </Btn>
                <Btn
                  label="Delete row"
                  onClick={() => editor.chain().focus().deleteRow().run()}
                >
                  <Rows3 className="h-3.5 w-3.5" />
                </Btn>
                <div className="mx-1 h-4 w-px bg-[var(--border-1)]" />
                <Btn
                  label="Column before"
                  onClick={() =>
                    editor.chain().focus().addColumnBefore().run()
                  }
                >
                  <ArrowLeftToLine className="h-3.5 w-3.5" />
                </Btn>
                <Btn
                  label="Column after"
                  onClick={() =>
                    editor.chain().focus().addColumnAfter().run()
                  }
                >
                  <ArrowRightToLine className="h-3.5 w-3.5" />
                </Btn>
                <Btn
                  label="Delete column"
                  onClick={() =>
                    editor.chain().focus().deleteColumn().run()
                  }
                >
                  <Columns3 className="h-3.5 w-3.5" />
                </Btn>
                <div className="mx-1 h-4 w-px bg-[var(--border-1)]" />
                <Btn
                  label="Toggle header row"
                  onClick={() =>
                    editor.chain().focus().toggleHeaderRow().run()
                  }
                >
                  <HeadingIcon className="h-3.5 w-3.5" />
                </Btn>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().deleteTable().run();
                  }}
                  title="Delete table"
                  className="flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </>
        );
    }
  };

  const node = (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "flex rounded-2xl border border-[var(--border-1)] bg-white p-1 shadow-md animate-in fade-in zoom-in-95 duration-150",
          mode.kind === "accent" ? "items-stretch" : "items-center gap-0.5",
        )}
        onMouseDown={(e) => e.preventDefault()}
      >
        {renderBody()}
      </div>
    </TooltipProvider>
  );

  return createPortal(node, elRef.current);
}
