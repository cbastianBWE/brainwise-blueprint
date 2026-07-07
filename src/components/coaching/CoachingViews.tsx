import DOMPurify from "dompurify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface Negative {
  text: string;
  a?: string;
  b?: string;
  c?: string;
}

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export interface Responses {
  action?: string;
  positives?: string[];
  positiveAction?: string;
  negatives?: Negative[];
  analysis?: { html?: string; [k: string]: unknown };
  chat?: ChatMsg[];
  [k: string]: unknown;
}

export function AiAnalysisPanel({ html }: { html?: string }) {
  if (!html) return null;
  let src = html.trim();
  if (src.startsWith("```"))
    src = src.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
  const clean = DOMPurify.sanitize(src, {
    ALLOWED_TAGS: ["h3", "h4", "p", "ul", "ol", "li", "strong", "em", "br"],
    ALLOWED_ATTR: [],
  });
  return (
    <div
      className="prose prose-sm max-w-none rounded-lg border bg-muted/30 p-4"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

export function SynthesisView({ responses }: { responses: Responses }) {
  return (
    <div className="space-y-6">
      {responses.action && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">Your action</h3>
          <p className="mt-1 text-sm">{responses.action}</p>
        </div>
      )}
      {responses.positiveAction && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">Positive action</h3>
          <p className="mt-1 text-sm">{responses.positiveAction}</p>
        </div>
      )}
      {(responses.positives || []).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">Goals</h3>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {responses.positives!.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {(responses.negatives || []).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Safeguards</h3>
          {responses.negatives!.map((n, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{n.text}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {n.a && (
                  <div>
                    <span className="font-medium">Prevent: </span>
                    {n.a}
                  </div>
                )}
                {n.b && (
                  <div>
                    <span className="font-medium">In the moment: </span>
                    {n.b}
                  </div>
                )}
                {n.c && (
                  <div>
                    <span className="font-medium">Recover: </span>
                    {n.c}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatTranscript({ chat }: { chat: ChatMsg[] }) {
  if (!chat || chat.length === 0) return null;
  return (
    <div className="space-y-2 rounded-lg border p-3">
      {chat.map((m, i) => (
        <div
          key={i}
          className={
            m.role === "user"
              ? "ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
              : "mr-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm"
          }
        >
          <div className="whitespace-pre-wrap">{m.content}</div>
        </div>
      ))}
    </div>
  );
}
