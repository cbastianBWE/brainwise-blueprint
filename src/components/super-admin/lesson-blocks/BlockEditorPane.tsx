import type { EditorBlock } from "./blockTypeMeta";
import { TextBlockForm } from "./block-forms/TextBlockForm";
import { HeadingBlockForm } from "./block-forms/HeadingBlockForm";
import { DividerBlockForm } from "./block-forms/DividerBlockForm";
import { ImageBlockForm } from "./block-forms/ImageBlockForm";
import { VideoEmbedBlockForm } from "./block-forms/VideoEmbedBlockForm";
import { QuoteBlockForm } from "./block-forms/QuoteBlockForm";
import { ListBlockForm } from "./block-forms/ListBlockForm";
import { CalloutBlockForm } from "./block-forms/CalloutBlockForm";
import { EmbedAudioBlockForm } from "./block-forms/EmbedAudioBlockForm";
import { BLOCK_TYPE_META } from "./blockTypeMeta";

interface Props {
  block: EditorBlock | null;
  onChange: (next: EditorBlock) => void;
  contentItemId: string;
}

export function BlockEditorPane({ block, onChange, contentItemId }: Props) {
  if (!block) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Select a block from the left to edit, or use + Add block to create one.
      </div>
    );
  }

  const handleConfig = (nextConfig: Record<string, unknown>) =>
    onChange({ ...block, config: nextConfig });

  const meta = BLOCK_TYPE_META[block.block_type];
  const cfg: any = block.config;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 border-b pb-2">
        <meta.icon className="h-4 w-4 text-muted-foreground" />
        <div className="font-display text-base font-semibold tracking-tight" style={{ color: "#021F36" }}>
          {meta.label}
        </div>
      </div>
      {block.block_type === "text" && (
        <TextBlockForm value={cfg} onConfigChange={handleConfig} />
      )}
      {block.block_type === "heading" && (
        <HeadingBlockForm value={cfg} onConfigChange={handleConfig} />
      )}
      {block.block_type === "divider" && <DividerBlockForm />}
      {block.block_type === "image" && (
        <ImageBlockForm
          value={cfg}
          onConfigChange={handleConfig}
          contentItemId={contentItemId}
        />
      )}
      {block.block_type === "video_embed" && (
        <VideoEmbedBlockForm
          value={cfg}
          onConfigChange={handleConfig}
          contentItemId={contentItemId}
        />
      )}
      {block.block_type === "quote" && (
        <QuoteBlockForm value={cfg} onConfigChange={handleConfig} />
      )}
      {block.block_type === "list" && (
        <ListBlockForm value={cfg} onConfigChange={handleConfig} />
      )}
      {block.block_type === "callout" && (
        <CalloutBlockForm value={cfg} onConfigChange={handleConfig} />
      )}
      {block.block_type === "embed_audio" && (
        <EmbedAudioBlockForm
          value={cfg}
          onConfigChange={handleConfig}
          contentItemId={contentItemId}
        />
      )}
    </div>
  );
}
