import { useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DictateButton } from "@/components/coaching/MultimodalField";
import { renderBold } from "@/lib/renderBold";
import {
  fetchServerTranscript,
  fetchStepSections,
  focusReportSection,
  isGracefulEnd,
  readWalkthroughError,
  walkthroughErrorCopy,
  type WalkthroughMsg,
  type WalkthroughStepMeta,
} from "./ptpWalkthroughShared";

interface NextStep {
  id: string;
  title: string | null;
  widget?: string | null;
}

export default function PtpWalkthroughPanel({
  assessmentResultId,
  sessionId: initialSessionId,
  steps,
  open,
  onOpenChange,
}: {
  assessmentResultId: string;
  sessionId?: string;
  steps?: WalkthroughStepMeta[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [stepId, setStepId] = useState<string | null>(null);
  const [stepTitle, setStepTitle] = useState<string | null>(null);
  const [messages, setMessages] = useState<WalkthroughMsg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [nextStep, setNextStep] = useState<NextStep | null>(null);
  const [isGate, setIsGate] = useState(false);
  const [stepSections, setStepSections] = useState<Record<string, string | null>>({});
  const bootedRef = useRef(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const stepList = useMemo(() => steps ?? [], [steps]);
  const position = useMemo(() => {
    const i = stepList.findIndex((s) => s.id === stepId);
    return i >= 0 ? i + 1 : null;
  }, [stepList, stepId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (!open) return;
    fetchStepSections().then(setStepSections);
  }, [open]);

  // Scroll the real report behind the panel whenever the step changes.
  useEffect(() => {
    if (!open || !stepId) return;
    focusReportSection(stepSections[stepId]);
  }, [open, stepId, stepSections]);

  const invoke = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("ptp-walkthrough", { body });
    const err = readWalkthroughError(error, data);
    if (err) {
      setNotice(walkthroughErrorCopy(err));
      if (isGracefulEnd(err)) setEnded(true);
      return null;
    }
    return data as any;
  };

  const runTurn = async (message: string) => {
    if (!sessionId || !stepId) return;
    setBusy(true);
    const data = await invoke({ action: "turn", session_id: sessionId, step: stepId, message });
    setBusy(false);
    if (!data) return;
    setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "" }]);
    if (typeof data.exchanges_remaining === "number") setRemaining(data.exchanges_remaining);
    setIsGate(Boolean(data.is_gate));
    setNextStep(data.next_step ?? null);
    if (!data.next_step && !data.is_gate) {
      // The definition is finished: close it out as completed.
      await invoke({ action: "close", session_id: sessionId, status: "completed" });
      setEnded(true);
    }
  };

  // Boot: start a new run, or resume the one the server already has.
  useEffect(() => {
    if (!open || bootedRef.current) return;
    bootedRef.current = true;
    (async () => {
      setBusy(true);
      if (initialSessionId) {
        const order = stepList.map((s) => s.id);
        const { messages: prior, currentStep } = await fetchServerTranscript(
          initialSessionId,
          order,
        );
        setSessionId(initialSessionId);
        setMessages(prior);
        const resumedStep = currentStep ?? order[0] ?? null;
        setStepId(resumedStep);
        setStepTitle(stepList.find((s) => s.id === resumedStep)?.title ?? null);
        setBusy(false);
        // Nothing stored yet: let the step open itself. Otherwise wait for them.
        if (prior.length === 0 && resumedStep) {
          setStepId(resumedStep);
          setTimeout(() => void runTurnFor(resumedStep, ""), 0);
        }
        return;
      }
      const data = await invoke({
        action: "start",
        assessment_result_id: assessmentResultId,
        narrative_context: "combined",
      });
      setBusy(false);
      if (!data) return;
      setSessionId(data.session_id);
      setRemaining(
        typeof data.exchanges_remaining === "number" ? data.exchanges_remaining : null,
      );
      const first = data.step;
      setStepId(first?.id ?? null);
      setStepTitle(first?.title ?? null);
      if (first?.framing) {
        setMessages([{ role: "assistant", content: first.framing }]);
      }
      if (first?.id) setTimeout(() => void runTurnFor(first.id, "", data.session_id), 0);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A turn that does not depend on state having settled yet.
  const runTurnFor = async (step: string, message: string, sid?: string) => {
    const useSession = sid ?? sessionId;
    if (!useSession) return;
    setBusy(true);
    const data = await invoke({
      action: "turn",
      session_id: useSession,
      step,
      message,
    });
    setBusy(false);
    if (!data) return;
    setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "" }]);
    if (typeof data.exchanges_remaining === "number") setRemaining(data.exchanges_remaining);
    setIsGate(Boolean(data.is_gate));
    setNextStep(data.next_step ?? null);
  };

  const send = async () => {
    const t = text.trim();
    if (!t || busy || ended) return;
    setText("");
    setMessages((prev) => [...prev, { role: "user", content: t }]);
    setNotice(null);
    await runTurn(t);
  };

  const advance = async () => {
    if (!nextStep) return;
    setStepId(nextStep.id);
    setStepTitle(nextStep.title ?? null);
    const target = nextStep.id;
    setNextStep(null);
    setIsGate(false);
    await runTurnFor(target, "");
  };

  // On a gate the server may not hand us a successor. "Yes, keep going" then
  // simply re-issues a turn on the step we are on, rather than being dead.
  const keepGoing = async () => {
    if (nextStep) return advance();
    setIsGate(false);
    if (stepId) await runTurnFor(stepId, "");
  };

  const finish = async (status: "completed" | "abandoned") => {
    if (sessionId && !ended) {
      await invoke({ action: "close", session_id: sessionId, status });
    }
    setEnded(true);
    onOpenChange(false);
  };

  return (
    // Non-modal: no scroll lock, no overlay, so the report behind stays usable.
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          className="fixed inset-y-0 right-0 z-50 h-full w-full sm:max-w-md flex flex-col border-l border-border bg-background shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        >
          <div className="px-4 py-3 border-b border-border text-left pr-10">
            <DialogPrimitive.Title className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              {stepTitle ?? "Guided walkthrough"}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              {position && stepList.length
                ? `Step ${position} of ${stepList.length}. Your report stays open behind this panel.`
                : "Your report stays open behind this panel."}
            </DialogPrimitive.Description>
          </div>
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && !busy && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Getting your walkthrough ready…
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-lg px-3 py-2 text-sm bg-primary text-primary-foreground whitespace-pre-wrap"
                      : "max-w-[85%] rounded-lg px-3 py-2 text-sm bg-muted whitespace-pre-wrap"
                  }
                >
                  {m.role === "assistant" ? renderBold(m.content) : m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-lg px-3 py-2 bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {notice && <p className="px-4 pb-2 text-sm text-muted-foreground">{notice}</p>}

          <div className="border-t border-border p-3 space-y-2">
            {ended ? (
              <Button className="w-full" onClick={() => onOpenChange(false)}>
                Back to my report
              </Button>
            ) : isGate ? (
              <div className="flex flex-col gap-2">
                <Button onClick={keepGoing} disabled={busy}>
                  Yes, keep going
                </Button>
                <Button variant="outline" onClick={() => finish("completed")} disabled={busy}>
                  That's enough for now
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2 items-end">
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={busy}
                    placeholder="Type your answer…"
                    rows={2}
                    className="flex-1 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <div className="flex flex-col gap-1">
                    <Button onClick={send} disabled={busy || !text.trim()}>
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    <DictateButton
                      onFinal={(t) => setText((cur) => (cur ? cur + " " : "") + t)}
                    />
                  </div>
                </div>
                {nextStep && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-muted-foreground"
                    onClick={advance}
                    disabled={busy}
                  >
                    {nextStep.title ? `Skip ahead to ${nextStep.title}` : "Skip ahead"}
                  </Button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {remaining !== null ? `${remaining} exchanges left in this walkthrough` : ""}
              </p>
              {!ended && (
                <Button variant="ghost" size="sm" onClick={() => finish("abandoned")}>
                  Finish here
                </Button>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
