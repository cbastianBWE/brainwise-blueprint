import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuizImagePicker } from "./QuizImagePicker";
import { buildPair, type MatchPair } from "./MatchOptionsEditor";

const MIN_PAIRS = 2;
const MAX_PAIRS = 6;
const MAX_TEXT = 200;

interface Props {
  pairs: MatchPair[];
  onChange: (next: MatchPair[]) => void;
  imageUrlMap?: Map<string, string>;
}

export function MatchPictureOptionsEditor({ pairs, onChange, imageUrlMap }: Props) {
  const update = (key: string, patch: Partial<MatchPair>) => {
    onChange(pairs.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  };

  const addPair = () => {
    if (pairs.length >= MAX_PAIRS) return;
    onChange([...pairs, buildPair()]);
  };

  const removePair = (key: string) => {
    if (pairs.length <= MIN_PAIRS) return;
    onChange(pairs.filter((p) => p.key !== key));
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Define {MIN_PAIRS}-{MAX_PAIRS} pairs. Left side is a text prompt, right side is an image
        the trainee matches to it. Save the question first, then attach an image to each answer.
      </p>
      <div className="space-y-2">
        {pairs.map((pair, idx) => {
          const answerAssetId = pair.answer.option_image_asset_id ?? null;
          const previewUrl =
            answerAssetId && imageUrlMap ? imageUrlMap.get(answerAssetId) ?? null : null;
          return (
            <div key={pair.key} className="space-y-2 rounded-md border bg-background p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Pair {idx + 1}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removePair(pair.key)}
                  aria-label="Remove pair"
                  disabled={pairs.length <= MIN_PAIRS}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Prompt (left)
                  </Label>
                  <Input
                    value={pair.prompt.option_text}
                    onChange={(e) =>
                      update(pair.key, {
                        prompt: { ...pair.prompt, option_text: e.target.value },
                      })
                    }
                    maxLength={MAX_TEXT}
                    placeholder="Prompt"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Answer image (right)
                  </Label>
                  <QuizImagePicker
                    parentKind="quiz_answer_option"
                    parentId={pair.answer.id}
                    currentAssetId={answerAssetId}
                    previewUrl={previewUrl}
                    onAttached={(assetId) =>
                      update(pair.key, {
                        answer: { ...pair.answer, option_image_asset_id: assetId },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addPair}
        disabled={pairs.length >= MAX_PAIRS}
      >
        <Plus className="mr-1 h-4 w-4" />
        Add pair
      </Button>
      {pairs.length >= MAX_PAIRS && (
        <p className="text-xs text-muted-foreground">Max {MAX_PAIRS} pairs.</p>
      )}
    </div>
  );
}
