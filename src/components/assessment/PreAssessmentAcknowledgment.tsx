import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getAcknowledgmentWithHash, type AcknowledgmentContent } from "@/data/assessmentAcknowledgments";

interface Props {
  instrumentId: string;
  raterType: "self" | "manager";
  onConfirm: (versionHash: string) => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function PreAssessmentAcknowledgment({
  instrumentId,
  raterType,
  onConfirm,
  onCancel,
  loading = false,
}: Props) {
  const [content, setContent] = useState<(AcknowledgmentContent & { versionHash: string }) | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAcknowledgmentWithHash(instrumentId, raterType)
      .then((c) => {
        if (!cancelled) setContent(c);
      })
      .catch((e) => {
        if (!cancelled) setResolveError(e?.message || "Could not load acknowledgment");
      });
    return () => {
      cancelled = true;
    };
  }, [instrumentId, raterType]);

  if (resolveError) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-4 z-50">
        <Card className="max-w-2xl w-full">
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-destructive">{resolveError}</p>
            <Button variant="outline" onClick={onCancel}>Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background overflow-auto z-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Card>
          <CardContent className="p-6 sm:p-8 space-y-6">
            <h1 className="text-2xl font-semibold text-foreground">{content.title}</h1>
            <div className="prose prose-sm sm:prose-base max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground">
              <ReactMarkdown>{content.body}</ReactMarkdown>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={() => onConfirm(content.versionHash)} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {content.buttonLabel}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
