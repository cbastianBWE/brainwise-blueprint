import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleWithFontSize } from "./TextStyleWithFontSize";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Strikethrough,
  List as ListIcon,
  ListOrdered,
  Heading2,
  Heading3,
  Heading4,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { TipTapDocJSON } from "./blockTypeMeta";

interface RichTextEditorProps {
  value: TipTapDocJSON | null;
  onChange: (next: TipTapDocJSON) => void;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled,
  compact,
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value ?? "",
    editable: !disabled,
    onUpdate: ({ editor: e }) => onChangeRef.current(e.getJSON() as TipTapDocJSON),
  });

  useEffect(() => {
    if (!editor || value == null) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      editor.commands.setContent(value as any, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  if (!editor) return null;

  const btnClass = (active: boolean) =>
    cn(
      "h-7 w-7 p-0 text-xs",
      active && "bg-[#F5741A]/15 text-[#F5741A] hover:bg-[#F5741A]/20",
    );

  return (
    <div className="rounded-md border bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b p-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={btnClass(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          aria-label="Bold"
        >
          <BoldIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={btnClass(editor.isActive("italic"))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          aria-label="Italic"
        >
          <ItalicIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={btnClass(editor.isActive("strike"))}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={disabled}
          aria-label="Strike"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={btnClass(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          aria-label="Bullet list"
        >
          <ListIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={btnClass(editor.isActive("orderedList"))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          aria-label="Numbered list"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={btnClass(editor.isActive("heading", { level: 2 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled}
          aria-label="Heading 2"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={btnClass(editor.isActive("heading", { level: 3 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={disabled}
          aria-label="Heading 3"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={btnClass(editor.isActive("heading", { level: 4 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          disabled={disabled}
          aria-label="Heading 4"
        >
          <Heading4 className="h-3.5 w-3.5" />
        </Button>
        {!compact && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "h-7 px-2 text-xs",
              editor.getAttributes("textStyle")?.fontSize === "lead" &&
                "bg-[#F5741A]/15 text-[#F5741A] hover:bg-[#F5741A]/20",
            )}
            onClick={() => {
              const isLead = editor.getAttributes("textStyle")?.fontSize === "lead";
              if (isLead) {
                editor.chain().focus().setMark("textStyle", { fontSize: null }).run();
              } else {
                editor.chain().focus().setMark("textStyle", { fontSize: "lead" }).run();
              }
            }}
            disabled={disabled}
            aria-label="Lead paragraph"
            title="Larger paragraph text"
          >
            Lead
          </Button>
        )}
        <Popover
          open={linkOpen}
          onOpenChange={(open) => {
            setLinkOpen(open);
            if (open) {
              const existing = editor.getAttributes("link")?.href ?? "";
              setLinkUrl(existing);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={btnClass(editor.isActive("link"))}
              disabled={disabled}
              aria-label="Link"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-2">
            <div className="text-xs font-medium">Link URL</div>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
            />
            <div className="flex justify-between gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setLinkOpen(false);
                }}
              >
                Remove
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setLinkOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const url = linkUrl.trim();
                    if (!url) {
                      editor.chain().focus().unsetLink().run();
                    } else {
                      editor
                        .chain()
                        .focus()
                        .extendMarkRange("link")
                        .setLink({ href: url })
                        .run();
                    }
                    setLinkOpen(false);
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div
        className={cn(
          "tiptap-prose px-3 py-2",
          compact ? "min-h-[60px]" : "min-h-[120px]",
        )}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
