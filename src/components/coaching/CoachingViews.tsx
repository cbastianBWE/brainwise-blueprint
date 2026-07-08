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

export function SynthesisView({ responses, steps }: { responses: Responses; steps?: any[] }) {
  if (!steps || steps.length === 0) return null;
  const rendered = new Set<string>();
  const defaultRiskLabels: Record<string, string> = { a: "Prevent", b: "In the moment", c: "Recover" };
  const sections: JSX.Element[] = [];
  for (const step of steps) {
    const w = step.widget;
    const key = step.key as string | undefined;
    if (["ai_panel", "synthesis", "image_select", "image_describe"].includes(w) || !key || rendered.has(key)) continue;
    const heading = step.summaryLabel || step.label || step.title || key;
    if (w === "textarea" || w === "content") {
      const v = (responses as any)[key];
      if (typeof v === "string" && v.trim()) {
        rendered.add(key);
        sections.push(
          <div key={key}>
            <h3 className="text-sm font-semibold text-muted-foreground">{heading}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm">{v}</p>
          </div>
        );
      }
    } else if (w === "list_builder") {
      const arr = (responses as any)[key] as string[] | undefined;
      if (Array.isArray(arr) && arr.length > 0) {
        rendered.add(key);
        const priorityKey = step.prioritize?.priorityKey as string | undefined;
        const prioritized = priorityKey
          ? new Set(((responses as any)[priorityKey] as string[] | undefined) || [])
          : null;
        sections.push(
          <div key={key}>
            <h3 className="text-sm font-semibold text-muted-foreground">{heading}</h3>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {arr.map((p, i) => {
                const marked = prioritized?.has(p);
                return (
                  <li key={i} className={marked ? "font-semibold" : undefined}>
                    {marked && (
                      <span aria-hidden style={{ color: "var(--bw-orange)" }} className="mr-1">★</span>
                    )}
                    <span style={marked ? { color: "var(--bw-orange)" } : undefined}>{p}</span>
                    {marked && (
                      <span className="ml-2 rounded bg-[var(--bw-orange)]/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--bw-orange)]">
                        Top {step.prioritize?.selectExactly ?? ""}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      }
    } else if (w === "text_select") {
      const arr = (responses as any)[key] as Array<{ text: string; author: string | null; description: string }> | undefined;
      if (Array.isArray(arr) && arr.length > 0) {
        rendered.add(key);
        sections.push(
          <div key={key} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">{heading}</h3>
            {arr.map((s, i) => (
              <div key={i} className="space-y-1">
                <blockquote className="border-l-2 pl-3 text-sm italic">{s.text}</blockquote>
                {s.author && (
                  <p className="text-xs text-muted-foreground">— {s.author}</p>
                )}
                {s.description && (
                  <p className="text-sm">{s.description}</p>
                )}
              </div>
            ))}
          </div>
        );
      }
    } else if (w === "risk_blocks") {
      if (!(step.subfields && step.subfields.length > 0)) continue;
      const arr = (responses as any)[key] as Negative[] | undefined;
      if (Array.isArray(arr) && arr.length > 0) {
        rendered.add(key);
        const labels: Record<string, string> = { ...defaultRiskLabels, ...(step.subfieldLabels || {}) };
        sections.push(
          <div key={key} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">{heading}</h3>
            {arr.map((n, i) => (
              <Card key={i}>
                <CardHeader className="pb-2"><CardTitle className="text-base">{n.text}</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(step.subfields as string[]).map((sf) =>
                    (n as any)[sf] ? (
                      <div key={sf}><span className="font-medium">{labels[sf] || sf}: </span>{(n as any)[sf]}</div>
                    ) : null
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );
      }
    }
  }
  if (sections.length === 0) return null;
  return <div className="space-y-6">{sections}</div>;
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
