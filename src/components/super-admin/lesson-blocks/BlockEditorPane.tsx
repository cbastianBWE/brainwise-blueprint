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

interface Props {
  block: EditorBlock | null;
  onChange: (next: EditorBlock) => void;
  contentItemId: string;
}

export function BlockEditorPane({ block, onChange, contentItemId }: Props) {
  if (!block) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Select a block from the stack to edit.
      </div>
    );
  }

  const handleConfig = (nextConfig: Record<string, unknown>) =>
    onChange({ ...block, config: nextConfig });

  const cfg: any = block.config;

  return (
    <div className="space-y-4 p-4">
      {block.block_type === "text" && (
        <TextBlockForm value={cfg} onConfigChange={handleConfig} />
      )}
      {block.block_type === "heading" && (
        <HeadingBlockForm value={cfg} onConfigChange={handleConfig} />
      )}
      {block.block_type === "divider" && (
        <DividerBlockForm value={cfg} onConfigChange={handleConfig} />
      )}
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
