import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Strikethrough,
  Code as CodeIcon,
  List as ListIcon,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { isSafeHttpUrl } from "@/lib/safeUrl";
import { uploadNewsletterImage } from "./uploadNewsletterImage";
import { invalidateNewsletterImageUrl } from "./useNewsletterImageUrl";
import { useToast } from "@/hooks/use-toast";

interface NewsletterToolbarProps {
  editor: Editor;
  articleId: string;
  disabled?: boolean;
  imageInputRef?: React.MutableRefObject<{ open: () => void } | null>;
}

type BlockKey = "paragraph" | "h2" | "h3" | "h4";

export function NewsletterToolbar({
  editor,
  articleId,
  disabled,
  imageInputRef,
}: NewsletterToolbarProps) {

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const blockValue: BlockKey = editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
      ? "h3"
      : editor.isActive("heading", { level: 4 })
        ? "h4"
        : "paragraph";

  const setBlock = (next: BlockKey) => {
    const chain = editor.chain().focus();
    if (next === "paragraph") chain.setParagraph().run();
    else if (next === "h2") chain.toggleHeading({ level: 2 }).run();
    else if (next === "h3") chain.toggleHeading({ level: 3 }).run();
    else if (next === "h4") chain.toggleHeading({ level: 4 }).run();
  };

  const btnClass = (active: boolean) =>
    cn(
      "h-7 w-7 p-0 text-xs transition-colors",
      active && "bg-[#F5741A]/15 text-[#F5741A] hover:bg-[#F5741A]/20",
    );

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else if (isSafeHttpUrl(url)) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    } else {
      toast({
        title: "Invalid URL",
        description: "Only http(s), mailto, and tel are allowed.",
        variant: "destructive",
      });
      return;
    }
    setLinkOpen(false);
    setLinkUrl("");
  };

  const handleImageFile = async (file: File) => {
    setUploading(true);
    try {
      const { asset_id } = await uploadNewsletterImage({
        file,
        articleId,
        refField: "inline_image",
      });
      invalidateNewsletterImageUrl(asset_id);
      editor
        .chain()
        .focus()
        .insertContent({
          type: "newsletterImage",
          attrs: {
            asset_id,
            alt: "",
            caption: "",
            width: "inline",
            import_failed_src: null,
          },
        })
        .run();
    } catch (e: any) {
      toast({
        title: "Image upload failed",
        description: e?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1 border-b border-[var(--border-1)] bg-white px-3 py-2">
      <Select
        value={blockValue}
        onValueChange={(v) => setBlock(v as BlockKey)}
        disabled={disabled}
      >
        <SelectTrigger className="h-7 w-[120px] text-xs" aria-label="Text style">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paragraph">Paragraph</SelectItem>
          <SelectItem value="h2">Heading 2</SelectItem>
          <SelectItem value="h3">Heading 3</SelectItem>
          <SelectItem value="h4">Heading 4</SelectItem>
        </SelectContent>
      </Select>

      <div className="mx-1 h-5 w-px bg-[var(--border-1)]" />

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
        aria-label="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={btnClass(editor.isActive("code"))}
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={disabled}
        aria-label="Inline code"
      >
        <CodeIcon className="h-3.5 w-3.5" />
      </Button>

      <div className="mx-1 h-5 w-px bg-[var(--border-1)]" />

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
        aria-label="Ordered list"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </Button>

      <div className="mx-1 h-5 w-px bg-[var(--border-1)]" />

      <Popover open={linkOpen} onOpenChange={setLinkOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={btnClass(editor.isActive("link"))}
            onClick={() => {
              const current = editor.getAttributes("link").href ?? "";
              setLinkUrl(current);
            }}
            disabled={disabled}
            aria-label="Link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[var(--fg-2)]">
              URL
            </label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://…"
              onKeyDown={(e) => e.key === "Enter" && applyLink()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              {editor.isActive("link") && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    setLinkOpen(false);
                  }}
                >
                  Remove
                </Button>
              )}
              <Button size="sm" onClick={applyLink}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={() => fileRef.current?.click()}
        disabled={disabled || uploading}
        aria-label="Insert image"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ImageIcon className="h-3.5 w-3.5" />
        )}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
          e.target.value = "";
        }}
      />

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        disabled={disabled}
        aria-label="Divider"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>

      <div className="ml-auto hidden text-[11px] text-[var(--fg-4)] sm:block">
        Type <kbd className="rounded border border-[var(--border-1)] bg-[var(--bw-cream-200)] px-1 py-0.5 font-mono text-[10px]">/</kbd> for more
      </div>
    </div>
  );
}
