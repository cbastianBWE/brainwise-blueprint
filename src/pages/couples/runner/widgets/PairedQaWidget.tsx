import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { type CoupleContext, type CoupleStep, substituteNames } from "../coupleShared";

type Rec = Record<string, unknown>;

/** Render a captured value sensibly: paragraph, list, or definition list. Never JSON.stringify. */
function ValueBlock({ val, empty = "Nothing here yet." }: { val: unknown; empty?: string }) {
  if (val === undefined || val === null || val === "") {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  if (Array.isArray(val)) {
    return (
      <ul className="list-disc space-y-1 pl-5">
        {val.map((item, i) => (
          <li key={i} className="text-sm whitespace-pre-wrap">
            {String(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof val === "object") {
    const entries = Object.entries(val as Rec).filter(([k]) => !k.startsWith("__"));
    if (entries.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
    return (
      <dl className="space-y-2">
        {entries.map(([k, item]) => (
          <div key={k}>
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="text-sm whitespace-pre-wrap">
              {Array.isArray(item) ? item.join(", ") : String(item ?? "")}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return <p className="text-sm whitespace-pre-wrap">{String(val)}</p>;
}

export function PairedQaWidget({
  step,
  couple,
  value,
  onChange,
}: {
  step: CoupleStep;
  couple: CoupleContext;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const v = (value || {}) as Rec;
  const revealed = couple.barrierCleared && !!couple.partnerView;
  const summaryMode = revealed && couple.partnerView?.disclosure === "summary";
  // Once submitted, your own inputs lock — a guess you can edit after the reveal is not a guess.
  const locked = revealed || !!v.__submitted;
  const readOnly = locked;

  const setGroup = (group: "self" | "read", key: string, next: string) => {
    const g = { ...((v[group] as Rec) || {}) };
    g[key] = next;
    onChange({ ...v, [group]: g });
  };

  const setField = (key: string, next: string) => onChange({ ...v, [key]: next });

  const Field = ({
    id,
    label,
    val,
    onSet,
    helper,
  }: {
    id: string;
    label: string;
    val: unknown;
    onSet: (s: string) => void;
    helper?: string;
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      <Textarea
        id={id}
        value={typeof val === "string" ? val : ""}
        readOnly={readOnly}
        onChange={(e) => onSet(e.target.value)}
        rows={3}
      />
    </div>
  );

  const SummaryCard = () => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{couple.otherFirstName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm whitespace-pre-wrap">{String((couple.partnerView?.responses as Rec)?.summary ?? "")}</p>
        <p className="text-xs text-muted-foreground">
          {couple.otherFirstName} chose to share a summary of this one.
        </p>
      </CardContent>
    </Card>
  );

  // ---- shape a: two-pass questions ----
  const renderQuestions = () => {
    const qs = step.questions || [];
    return (
      <div className="space-y-6">
        <section className="space-y-4">
          {step.selfIntro && (
            <p className="text-sm text-muted-foreground">{substituteNames(step.selfIntro, couple)}</p>
          )}
          {qs.map((q) =>
            q.type === "image_select" ? (
              <Card key={`self-${q.key}`} className="border-dashed">
                <CardContent className="p-4">
                  <p className="text-sm font-medium">{substituteNames(q.self, couple)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Image picker, wired later</p>
                </CardContent>
              </Card>
            ) : (
              <Field
                key={`self-${q.key}`}
                id={`self-${q.key}`}
                label={substituteNames(q.self, couple)}
                val={((v.self as Rec) || {})[q.key]}
                onSet={(s) => setGroup("self", q.key, s)}
              />
            ),
          )}
        </section>

        <section className="space-y-4 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            {step.partnerReadIntro
              ? substituteNames(step.partnerReadIntro, couple)
              : `Now your read on ${couple.otherFirstName}.`}
          </p>
          {qs.map((q) =>
            q.type === "image_select" ? (
              <Card key={`read-${q.key}`} className="border-dashed">
                <CardContent className="p-4">
                  <p className="text-sm font-medium">{substituteNames(q.read, couple)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Image picker, wired later</p>
                </CardContent>
              </Card>
            ) : (
              <Field
                key={`read-${q.key}`}
                id={`read-${q.key}`}
                label={substituteNames(q.read, couple)}
                val={((v.read as Rec) || {})[q.key]}
                onSet={(s) => setGroup("read", q.key, s)}
              />
            ),
          )}
        </section>
      </div>
    );
  };

  // ---- shape b: subfield grid ----
  const renderSubfields = () => (
    <div className="space-y-4">
      {step.prefilledFrom && Object.keys(step.prefilledFrom).length > 0 && (
        <p className="text-xs text-muted-foreground">we can prefill this from your earlier work</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {(step.subfields || []).map((sf) => (
          <Field
            key={sf}
            id={`sf-${sf}`}
            label={substituteNames(step.subfieldLabels?.[sf] || sf, couple)}
            val={v[sf]}
            onSet={(s) => setField(sf, s)}
          />
        ))}
      </div>
    </div>
  );

  // ---- shape c: dual rater ----
  const renderDualRater = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your rating</CardTitle>
        </CardHeader>
        <CardContent>
          <Field id="own-rating" label="How you'd rate this" val={v.ownRating} onSet={(s) => setField("ownRating", s)} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">What you think theirs is</CardTitle>
        </CardHeader>
        <CardContent>
          <Field
            id="read-rating"
            label={`How you think ${couple.otherFirstName} would rate it`}
            val={v.readRating}
            onSet={(s) => setField("readRating", s)}
          />
        </CardContent>
      </Card>
    </div>
  );

  // ---- branch 1: reveals nothing. Partner content is never rendered here. ----
  const renderRevealsNothing = () => (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          You've both done this one on your own, and it stays that way. Nothing you wrote is shown to{" "}
          {couple.otherFirstName}, and nothing of theirs is shown to you. It's enough that you both did it.
        </p>
      </div>
      <Button onClick={() => onChange({ ...v, __submitted: true })} disabled={!!v.__submitted}>
        Continue
      </Button>
    </div>
  );

  // ---- branch 2: this step captures a prediction of the partner's answer ----
  const renderGuess = () => {
    const key = step.key || "guess";
    const guessVal = v[key];
    return (
      <div className="space-y-4">
        <Field
          id={`guess-${key}`}
          label={substituteNames(step.label || step.title || "Your guess", couple)}
          helper={`You're guessing what ${couple.otherFirstName} put. You'll see their real answer once you've both finished.`}
          val={guessVal}
          onSet={(s) => setField(key, s)}
        />

        {!locked && (
          <Button
            onClick={() => onChange({ ...v, __submitted: true })}
            disabled={typeof guessVal !== "string" || !guessVal.trim()}
          >
            Lock in my guess
          </Button>
        )}

        {revealed &&
          (summaryMode ? (
            <SummaryCard />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">What you guessed</CardTitle>
                </CardHeader>
                <CardContent>
                  <ValueBlock val={guessVal} empty="You didn't put a guess in." />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">What {couple.otherFirstName} actually put</CardTitle>
                </CardHeader>
                <CardContent>
                  <ValueBlock val={(couple.partnerView?.responses as Rec)?.[step.guessOf || ""]} />
                </CardContent>
              </Card>
              {step.comparesKey && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">What you put yourself</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ValueBlock val={v[step.comparesKey]} />
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
      </div>
    );
  };

  // ---- branch 3: captures nothing, compares an earlier answer ----
  const renderCompare = () => (
    <div className="space-y-4">
      {!revealed ? (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Nothing to write here. This puts what you each said earlier next to each other, and it waits until you've
            both finished.
          </p>
        </div>
      ) : summaryMode ? (
        <SummaryCard />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{couple.ownFirstName}</CardTitle>
            </CardHeader>
            <CardContent>
              <ValueBlock val={v[step.comparesKey || ""]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{couple.otherFirstName}</CardTitle>
            </CardHeader>
            <CardContent>
              <ValueBlock val={(couple.partnerView?.responses as Rec)?.[step.comparesKey || ""]} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  // ---- legacy fallback for steps with none of the above ----
  const renderPlain = () => (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          Nothing to write here. When you're both ready, you'll see the two sides together.
        </p>
      </div>
      <Button onClick={() => onChange({ ...v, __submitted: true })} disabled={readOnly}>
        Continue
      </Button>
    </div>
  );

  const isRevealsNothing = !!step.revealsNothing;
  const isGuess = !isRevealsNothing && !!step.guessOf;
  const isCompare = !isRevealsNothing && !isGuess && !!step.comparesKey && step.capturesHere === false;
  const handledLocally = isRevealsNothing || isGuess || isCompare;

  const body = isRevealsNothing
    ? renderRevealsNothing()
    : isGuess
      ? renderGuess()
      : isCompare
        ? renderCompare()
        : step.questions?.length
          ? renderQuestions()
          : step.subfields?.length && step.innerWidget
            ? renderSubfields()
            : step.dualRater
              ? renderDualRater()
              : renderPlain();

  return (
    <div className="space-y-6">
      {(step.title || step.label) && (
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{substituteNames(step.title || step.label || "", couple)}</h3>
        </div>
      )}

      {body}

      {/* State 2: submitted, waiting */}
      {!isRevealsNothing && !couple.partnerSubmitted && !revealed && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <Badge variant="secondary">Waiting</Badge>
          <p className="mt-2 text-sm text-muted-foreground">
            Your side is in. You'll see {couple.otherFirstName}'s once they've finished theirs.
          </p>
        </div>
      )}

      {/* State 3: revealed — guarded strictly on barrierCleared */}
      {revealed && !handledLocally && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Both sides</h4>
          {summaryMode ? (
            <SummaryCard />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{couple.ownFirstName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(flatten(v)).map(([k, text]) => (
                    <div key={k}>
                      <p className="text-xs text-muted-foreground">{k}</p>
                      <p className="text-sm whitespace-pre-wrap">{text}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{couple.otherFirstName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(flatten((couple.partnerView?.responses || {}) as Rec)).map(([k, text]) => (
                    <div key={k}>
                      <p className="text-xs text-muted-foreground">{k}</p>
                      <p className="text-sm whitespace-pre-wrap">{text}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function flatten(obj: Rec, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(obj || {})) {
    if (k.startsWith("__")) continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      Object.assign(out, flatten(val as Rec, key));
    } else if (val !== undefined && val !== null && val !== "") {
      out[key] = Array.isArray(val) ? val.join(", ") : String(val);
    }
  }
  return out;
}
