/**
 * Slash command items + suggestion plugin factory.
 *
 * Uses @tiptap/suggestion + tippy.js. The popup is rendered with vanilla DOM
 * but driven by a React-style item registry below (label, icon, description,
 * command). Keyboard nav (arrows / enter / escape) handled in onKeyDown.
 */
import { Extension, type Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type ComponentType,
} from "react";
import {
  Heading2,
  Heading3,
  Heading4,
  Minus,
  Code,
  Quote,
  Info,
  AlertTriangle,
  MessageSquare,
  ListChecks,
  Star,
  TrendingUp,
  Film,
  Image as ImageIcon,
  Columns2,
  ListOrdered,
  Tag,
  AlignLeft,
  MessageSquareMore,
  SeparatorHorizontal,
  BookMarked,
  User,
  CheckSquare,
  Hash,
  Layers,
  Columns3,
  Columns4,
  Images,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SlashCmdContext {
  /** Triggers the toolbar's image picker. Set by NewsletterEditor at mount. */
  pickImage?: () => void;
}

const ctx: SlashCmdContext = {};
export function setSlashCommandContext(next: SlashCmdContext) {
  ctx.pickImage = next.pickImage;
}

export interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  category: "BASIC" | "EDITORIAL" | "MEDIA" | "LAYOUT";
  icon: ComponentType<{ className?: string }>;
  /** Aliases for filtering. */
  keywords?: string[];
  run: (editor: Editor, range: Range) => void;
}

const deleteRange = (editor: Editor, range: Range) =>
  editor.chain().focus().deleteRange(range);

export const SLASH_COMMANDS: SlashCommandItem[] = [
  // BASIC
  {
    id: "h2",
    label: "Heading 2",
    description: "Section heading.",
    category: "BASIC",
    icon: Heading2,
    keywords: ["heading"],
    run: (e, r) => deleteRange(e, r).setNode("heading", { level: 2 }).run(),
  },
  {
    id: "h3",
    label: "Heading 3",
    description: "Subsection heading.",
    category: "BASIC",
    icon: Heading3,
    keywords: ["heading"],
    run: (e, r) => deleteRange(e, r).setNode("heading", { level: 3 }).run(),
  },
  {
    id: "h4",
    label: "Heading 4",
    description: "Small heading.",
    category: "BASIC",
    icon: Heading4,
    keywords: ["heading"],
    run: (e, r) => deleteRange(e, r).setNode("heading", { level: 4 }).run(),
  },
  {
    id: "divider",
    label: "Divider",
    description: "Horizontal rule between sections.",
    category: "BASIC",
    icon: Minus,
    keywords: ["hr", "rule"],
    run: (e, r) => deleteRange(e, r).setHorizontalRule().run(),
  },
  {
    id: "section-rule",
    label: "Section rule",
    description: "Numbered or styled section divider.",
    category: "BASIC",
    icon: SeparatorHorizontal,
    keywords: ["divider", "section", "break", "hr"],
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterSectionRule",
          attrs: { number: "", style: "plain", title: null },
        })
        .run(),
  },
  {
    id: "code",
    label: "Code block",
    description: "Preformatted code with syntax styling.",
    category: "BASIC",
    icon: Code,
    keywords: ["code", "pre"],
    run: (e, r) => deleteRange(e, r).toggleCodeBlock().run(),
  },
  {
    id: "quote",
    label: "Blockquote",
    description: "Short inline citation.",
    category: "BASIC",
    icon: Quote,
    keywords: ["blockquote"],
    run: (e, r) => deleteRange(e, r).toggleBlockquote().run(),
  },

  // EDITORIAL
  {
    id: "pullquote",
    label: "Pullquote",
    description: "Large decorative quotation.",
    category: "EDITORIAL",
    icon: Quote,
    keywords: ["pull", "quote", "feature"],
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterPullquote",
          attrs: { attribution: null },
          content: [{ type: "text", text: " " }],
        })
        .run(),
  },
  {
    id: "callout-info",
    label: "Info callout",
    description: "Teal-accented contextual note.",
    category: "EDITORIAL",
    icon: Info,
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterCallout",
          attrs: { variant: "info", title: null },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    id: "callout-warning",
    label: "Warning callout",
    description: "Amber-accented caution.",
    category: "EDITORIAL",
    icon: AlertTriangle,
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterCallout",
          attrs: { variant: "warning", title: null },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    id: "callout-quote",
    label: "Quote callout",
    description: "Navy-accented serif quotation block.",
    category: "EDITORIAL",
    icon: MessageSquare,
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterCallout",
          attrs: { variant: "quote", title: null },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    id: "callout-tldr",
    label: "TL;DR callout",
    description: "Quick summary at top of article.",
    category: "EDITORIAL",
    icon: ListChecks,
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterCallout",
          attrs: { variant: "tldr", title: "TL;DR" },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    id: "callout-key",
    label: "Key takeaway",
    description: "Plum-accented high-signal insight.",
    category: "EDITORIAL",
    icon: Star,
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterCallout",
          attrs: { variant: "key_takeaway", title: "Key takeaway" },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    id: "stat",
    label: "Stat callout",
    description: "Large numeric statistic with label and source.",
    category: "EDITORIAL",
    icon: TrendingUp,
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterStatCallout",
          attrs: { value: "", label: "", source: null },
        })
        .run(),
  },
  {
    id: "eyebrow",
    label: "Eyebrow",
    description: "Small-caps category tag above a heading.",
    category: "EDITORIAL",
    icon: Tag,
    keywords: ["kicker", "category", "tag"],
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterEyebrow",
          attrs: { variant: "default", with_rule: true },
          content: [{ type: "text", text: " " }],
        })
        .run(),
  },
  {
    id: "lead",
    label: "Lead paragraph",
    description: "Large opening paragraph (deck, lede, or pullout style).",
    category: "EDITORIAL",
    icon: AlignLeft,
    keywords: ["lede", "deck", "standfirst"],
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterLead",
          attrs: { dropcap: false, style: "deck" },
          content: [{ type: "text", text: " " }],
        })
        .run(),
  },
  {
    id: "aside",
    label: "Aside",
    description: "Secondary content box for tangential notes.",
    category: "EDITORIAL",
    icon: MessageSquareMore,
    keywords: ["sidebar", "background"],
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterAside",
          attrs: { label: null, tone: "default" },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    id: "byline",
    label: "Byline",
    description: "Author and meta strip with editable entries.",
    category: "EDITORIAL",
    icon: User,
    keywords: ["author", "meta", "byline", "credit"],
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterByline",
          attrs: { entries: [], separator_style: "dot" },
        })
        .run(),
  },

  // MEDIA
  {
    id: "embed",
    label: "Embed",
    description: "YouTube, Vimeo, Spotify, or generic iframe.",
    category: "MEDIA",
    icon: Film,
    keywords: ["youtube", "vimeo", "spotify", "iframe", "video"],
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterEmbed",
          attrs: { provider: "youtube", embed_id: "", url: "", title: null },
        })
        .run(),
  },
  {
    id: "image",
    label: "Image",
    description: "Upload an image from your device.",
    category: "MEDIA",
    icon: ImageIcon,
    keywords: ["upload", "picture", "photo"],
    run: (e, r) => {
      deleteRange(e, r).run();
      // Defer so the deletion commits before the file dialog opens.
      setTimeout(() => ctx.pickImage?.(), 0);
    },
  },

  // LAYOUT
  {
    id: "two-column",
    label: "Two columns",
    description: "Side-by-side panes (collapses on mobile).",
    category: "LAYOUT",
    icon: Columns2,
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterTwoColumn",
          content: [
            { type: "newsletterTwoColumnPane", content: [{ type: "paragraph" }] },
            { type: "newsletterTwoColumnPane", content: [{ type: "paragraph" }] },
          ],
        })
        .run(),
  },
  {
    id: "key-moments",
    label: "Key moments",
    description: "Timeline of numbered moments.",
    category: "LAYOUT",
    icon: ListOrdered,
    keywords: ["timeline"],
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterKeyMoments",
          attrs: { title: null },
          content: [
            {
              type: "newsletterKeyMoment",
              attrs: { title: "" },
              content: [{ type: "paragraph" }],
            },
          ],
        })
        .run(),
  },
  {
    id: "step-list",
    label: "Step list",
    description: "Numbered process with editable step titles.",
    category: "LAYOUT",
    icon: ListOrdered,
    keywords: ["steps", "process", "numbered", "how-to"],
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterStepList",
          attrs: { style: "vertical", connector: "line" },
          content: [
            {
              type: "newsletterStep",
              content: [
                {
                  type: "heading",
                  attrs: { level: 4 },
                  content: [{ type: "text", text: "Step title" }],
                },
                { type: "paragraph" },
              ],
            },
          ],
        })
        .run(),
  },
  {
    id: "checklist",
    label: "Checklist",
    description: "Task list with clickable checkboxes.",
    category: "LAYOUT",
    icon: CheckSquare,
    keywords: ["checklist", "tasks", "todo", "checkboxes"],
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterChecklist",
          content: [
            {
              type: "newsletterChecklistItem",
              attrs: { checked: false },
              content: [{ type: "text", text: " " }],
            },
          ],
        })
        .run(),
  },
  {
    id: "domain-grid",
    label: "Domain grid",
    description: "Numbered metric rows with tags and counts.",
    category: "LAYOUT",
    icon: Hash,
    keywords: ["grid", "domains", "metrics", "rows"],
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterDomainGrid",
          attrs: { style: "rows", show_numbers: true },
          content: [
            {
              type: "newsletterDomainRow",
              attrs: {
                number: "01",
                label: "",
                tag_text: null,
                tag_variant: null,
                description: "",
                count_value: "",
                count_label: "",
              },
            },
          ],
        })
        .run(),
  },
  {
    id: "index-row",
    label: "Index cards",
    description: "Side-by-side comparison metric cards.",
    category: "LAYOUT",
    icon: Layers,
    keywords: ["indices", "metrics", "comparison", "cards"],
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterIndexRow",
          attrs: { columns: 2 },
          content: [
            {
              type: "newsletterIndexCard",
              attrs: {
                tag: "",
                name: "",
                formula: null,
                note: "",
                accent_color: "orange",
              },
            },
            {
              type: "newsletterIndexCard",
              attrs: {
                tag: "",
                name: "",
                formula: null,
                note: "",
                accent_color: "forest",
              },
            },
          ],
        })
        .run(),
  },
  {
    id: "three-column",
    label: "Three columns",
    description: "Three side-by-side panes (collapses on mobile).",
    category: "LAYOUT",
    icon: Columns3,
    keywords: ["three", "3col", "columns", "tri"],
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterThreeColumn",
          content: [
            { type: "newsletterThreeColumnPane", content: [{ type: "paragraph" }] },
            { type: "newsletterThreeColumnPane", content: [{ type: "paragraph" }] },
            { type: "newsletterThreeColumnPane", content: [{ type: "paragraph" }] },
          ],
        })
        .run(),
  },
  {
    id: "four-column",
    label: "Four columns",
    description: "Four side-by-side panes (stacks 2x2 on tablet).",
    category: "LAYOUT",
    icon: Columns4,
    keywords: ["four", "4col", "columns", "quad"],
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterFourColumn",
          content: [
            { type: "newsletterFourColumnPane", content: [{ type: "paragraph" }] },
            { type: "newsletterFourColumnPane", content: [{ type: "paragraph" }] },
            { type: "newsletterFourColumnPane", content: [{ type: "paragraph" }] },
            { type: "newsletterFourColumnPane", content: [{ type: "paragraph" }] },
          ],
        })
        .run(),
  },
  {
    id: "image-gallery",
    label: "Image gallery",
    description: "Multi-image grid; each cell uploads independently.",
    category: "LAYOUT",
    icon: Images,
    keywords: ["gallery", "grid", "images", "photos"],
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterImageGallery",
          attrs: { columns: 2, gap: "normal" },
          content: [
            {
              type: "newsletterImage",
              attrs: {
                asset_id: null,
                alt: "",
                caption: "",
                width: "inline",
                import_failed_src: null,
              },
            },
            {
              type: "newsletterImage",
              attrs: {
                asset_id: null,
                alt: "",
                caption: "",
                width: "inline",
                import_failed_src: null,
              },
            },
          ],
        })
        .run(),
  },
  {
    id: "stat-grid",
    label: "Stat grid",
    description: "Grid of multiple stat callouts.",
    category: "LAYOUT",
    icon: BarChart3,
    keywords: ["stats", "grid", "metrics", "numbers"],
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterStatGrid",
          attrs: { columns: 4 },
          content: [
            { type: "newsletterStatCallout", attrs: { value: "", label: "", source: null } },
            { type: "newsletterStatCallout", attrs: { value: "", label: "", source: null } },
            { type: "newsletterStatCallout", attrs: { value: "", label: "", source: null } },
            { type: "newsletterStatCallout", attrs: { value: "", label: "", source: null } },
          ],
        })
        .run(),
  },
  {
    id: "masthead",
    label: "Masthead",
    description: "Publication identity strip with issue and date labels.",
    category: "LAYOUT",
    icon: BookMarked,
    keywords: ["header", "publication", "issue", "topbar"],
    run: (e, r) =>
      deleteRange(e, r)
        .insertContent({
          type: "newsletterMasthead",
          attrs: {
            publication: "",
            issue_label: null,
            date_label: null,
            logo_glyph: null,
          },
        })
        .run(),
  },
];

function filterItems(query: string): SlashCommandItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((it) => {
    const hay = [it.label, it.id, ...(it.keywords ?? [])]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

// ---------- Popup component ----------

interface SlashMenuPopupProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export interface SlashMenuPopupRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export const SlashMenuPopup = forwardRef<SlashMenuPopupRef, SlashMenuPopupProps>(
  function SlashMenuPopup({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "ArrowUp") {
          setSelectedIndex(
            (i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1),
          );
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          const item = items[selectedIndex];
          if (item) command(item);
          return true;
        }
        return false;
      },
    }));

    if (!items.length) {
      return (
        <div className="rounded-lg border border-[var(--border-1)] bg-white px-4 py-3 text-xs text-[var(--fg-4)] shadow-lg">
          No matches
        </div>
      );
    }

    // Group preserving order
    const groups: Array<{ category: string; items: SlashCommandItem[] }> = [];
    for (const item of items) {
      const last = groups[groups.length - 1];
      if (last && last.category === item.category) {
        last.items.push(item);
      } else {
        groups.push({ category: item.category, items: [item] });
      }
    }

    let flatIdx = -1;
    return (
      <div className="max-h-[360px] w-[320px] overflow-y-auto rounded-lg border border-[var(--border-1)] bg-white p-2 shadow-lg animate-in fade-in zoom-in-95 duration-150">
        {groups.map((group) => (
          <div key={group.category} className="mb-1 last:mb-0">
            <div
              className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--fg-4)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {group.category}
            </div>
            {group.items.map((item) => {
              flatIdx += 1;
              const active = flatIdx === selectedIndex;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(items.indexOf(item))}
                  onClick={() => command(item)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors",
                    active
                      ? "border-l-2 border-[var(--accent-soft)] bg-[#F5741A]/15 text-[#F5741A]"
                      : "border-l-2 border-transparent text-[var(--fg-1)] hover:bg-[var(--bw-cream-200)]",
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      active ? "text-[#F5741A]" : "text-[var(--fg-2)]",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-tight">
                      {item.label}
                    </div>
                    <div
                      className={cn(
                        "mt-0.5 text-[11px] leading-snug",
                        active ? "text-[#F5741A]/80" : "text-[var(--fg-3)]",
                      )}
                    >
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  },
);

// ---------- Extension ----------

export const NewsletterSlashCommand = Extension.create({
  name: "newsletterSlashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        allowSpaces: false,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: SlashCommandItem;
        }) => {
          props.run(editor, range);
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => filterItems(query),
        render: () => {
          let component: ReactRenderer<SlashMenuPopupRef> | null = null;
          let popup: TippyInstance[] | null = null;

          return {
            onStart: (props: SuggestionProps<SlashCommandItem>) => {
              component = new ReactRenderer(SlashMenuPopup, {
                props,
                editor: props.editor,
              });
              if (!props.clientRect) return;
              popup = tippy("body", {
                getReferenceClientRect: props.clientRect as any,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                arrow: false,
                offset: [0, 8],
              });
            },
            onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
              component?.updateProps(props);
              if (!props.clientRect) return;
              popup?.[0]?.setProps({
                getReferenceClientRect: props.clientRect as any,
              });
            },
            onKeyDown: (props: { event: KeyboardEvent }) => {
              if (props.event.key === "Escape") {
                popup?.[0]?.hide();
                return true;
              }
              return component?.ref?.onKeyDown(props.event) ?? false;
            },
            onExit: () => {
              popup?.[0]?.destroy();
              component?.destroy();
              popup = null;
              component = null;
            },
          };
        },
      }),
    ];
  },
});
