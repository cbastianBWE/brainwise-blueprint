import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MultimodalField, isMMRec, mmIsFilled, type MMValue } from "@/components/coaching/MultimodalField";
import { CoachingRecordingPlayer } from "@/components/coaching/CoachingViews";
import { allowedModes, type CoupleContext, type CoupleStep, substituteNames } from "../coupleShared";
import { CoupleImagePicker, PickedImageStrip, asPickedImages } from "./CoupleImagePicker";

type Rec = Record<string, unknown>;

type MediaAnswer = { mode: "audio" | "video"; media_id: string; transcript?: string };

function asMedia(v: unknown): MediaAnswer | null {
  return isMMRec(v) ? (v as MediaAnswer) : null;
}

const modeNoun = (m: "audio" | "video") => (m === "video" ? "by video" : "by voice");

/**
 * A partner's recording is never playable — the schema gives them no read on the media row.
 * They read the transcript, or they read nothing.
 */
function PartnerMedia({ media, otherFirstName }: { media: MediaAnswer; otherFirstName: string }) {
  if (!media.transcript) {
    return (
      <p className="text-sm text-muted-foreground">
        {otherFirstName} recorded this one. The words aren't ready yet.
      </p>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">
        {otherFirstName} answered {modeNoun(media.mode)}
      </p>
      <p className="text-sm whitespace-pre-wrap">{media.transcript}</p>
    </div>
  );
}

/** Render a captured value sensibly: paragraph, list, or definition list. Never JSON.stringify. */
function ValueBlock({
  val,
  empty = "Nothing here yet.",
  partner,
  otherFirstName,
}: {
  val: unknown;
  empty?: string;
  partner?: boolean;
  otherFirstName?: string;
}) {
  const media = asMedia(val);
  if (media) {
    if (partner) return <PartnerMedia media={media} otherFirstName={otherFirstName || "They"} />;
    return (
      <div className="rounded-md border bg-background p-2">
        <CoachingRecordingPlayer mediaId={media.media_id} />
      </div>
    );
  }
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
              <ValueBlock val={item} empty="—" partner={partner} otherFirstName={otherFirstName} />
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
  sessionId,
  activityCode,
}: {
  step: CoupleStep;
  couple: CoupleContext;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  sessionId: string;
  activityCode: string;
}) {
  const v = (value || {}) as Rec;
  const revealed = couple.barrierCleared && !!couple.partnerView;
  const summaryMode = revealed && couple.partnerView?.disclosure === "summary";
  // Once submitted, your own inputs lock — a guess you can edit after the reveal is not a guess.
  const locked = revealed || !!v.__submitted;
  const readOnly = locked;
  const modes = allowedModes(step);
  const stepKey = step.key || step.id || "step";

  const setGroup = (group: "self" | "read", key: string, next: MMValue) => {
    const g = { ...((v[group] as Rec) || {}) };
    g[key] = next;
    onChange({ ...v, [group]: g });
  };

  const setField = (key: string, next: MMValue) => onChange({ ...v, [key]: next });

  /**
   * Rendered as a function, not a nested component: a nested component would be a new type on
   * every render and would remount MultimodalField, losing the selected mode mid-recording.
   */
  const renderField = ({
    id,
    label,
    questionKey,
    val,
    onSet,
    helper,
  }: {
    id: string;
    label: string;
    questionKey: string;
    val: unknown;
    onSet: (s: MMValue) => void;
    helper?: string;
  }) => {
    const media = asMedia(val);
    return (
      <div key={id} className="space-y-1.5">
        <Label className="text-sm font-medium">{label}</Label>
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
        {readOnly ? (
          <div className="rounded-md border bg-muted/30 p-3">
            <ValueBlock val={val} empty="Nothing written." />
          </div>
        ) : (
          <MultimodalField
            value={media ? (media as MMValue) : typeof val === "string" ? val : ""}
            onChange={onSet}
            sessionId={sessionId}
            activityCode={activityCode}
            questionKey={questionKey}
            sessionKind="relationship"
            modes={modes}
            minRows={3}
          />
        )}
      </div>
    );
  };

  /** image_select questions: picker on the self/read pass, both sides once revealed. */
  const renderImageQuestion = (
    q: NonNullable<CoupleStep["questions"]>[number],
    group: "self" | "read",
  ) => {
    const own = asPickedImages(((v[group] as Rec) || {})[q.key]);
    const partnerGroup = (couple.partnerView?.responses as Rec | undefined)?.[group] as Rec | undefined;
    const partnerPicks = asPickedImages(partnerGroup?.[q.key]);
    const label = substituteNames(group === "self" ? q.self : q.read, couple);
    return (
      <div key={`${group}-${q.key}`} className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        {readOnly ? (
          revealed && !summaryMode ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">{couple.ownFirstName}</p>
                <PickedImageStrip picks={own} empty="Nothing picked." />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">{couple.otherFirstName}</p>
                <PickedImageStrip picks={partnerPicks} empty="Nothing picked." />
              </div>
            </div>
          ) : (
            <PickedImageStrip picks={own} empty="Nothing picked." />
          )
        ) : (
          <CoupleImagePicker
            library={q.source?.library}
            value={own}
            onChange={(next) => setGroup(group, q.key, next as unknown as MMValue)}
            pageSize={q.pageSize}
            selectMin={q.selectMin}
          />
        )}
      </div>
    );
  };

  const SummaryCard = () => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{couple.otherFirstName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ValueBlock
          val={(couple.partnerView?.responses as Rec)?.summary}
          partner
          otherFirstName={couple.otherFirstName}
        />
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
            q.type === "image_select"
              ? renderImageQuestion(q, "self")
              : renderField({
                  id: `self-${q.key}`,
                  label: substituteNames(q.self, couple),
                  questionKey: `${stepKey}.self.${q.key}`,
                  val: ((v.self as Rec) || {})[q.key],
                  onSet: (s) => setGroup("self", q.key, s),
                }),
          )}
        </section>

        <section className="space-y-4 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            {step.partnerReadIntro
              ? substituteNames(step.partnerReadIntro, couple)
              : `Now your read on ${couple.otherFirstName}.`}
          </p>
          {qs.map((q) =>
            q.type === "image_select"
              ? renderImageQuestion(q, "read")
              : renderField({
                  id: `read-${q.key}`,
                  label: substituteNames(q.read, couple),
                  questionKey: `${stepKey}.read.${q.key}`,
                  val: ((v.read as Rec) || {})[q.key],
                  onSet: (s) => setGroup("read", q.key, s),
                }),
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
        {(step.subfields || []).map((sf) =>
          renderField({
            id: `sf-${sf}`,
            label: substituteNames(step.subfieldLabels?.[sf] || sf, couple),
            questionKey: `${stepKey}.${sf}`,
            val: v[sf],
            onSet: (s) => setField(sf, s),
          }),
        )}
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
          {renderField({
            id: "own-rating",
            label: "How you'd rate this",
            questionKey: `${stepKey}.ownRating`,
            val: v.ownRating,
            onSet: (s) => setField("ownRating", s),
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">What you think theirs is</CardTitle>
        </CardHeader>
        <CardContent>
          {renderField({
            id: "read-rating",
            label: `How you think ${couple.otherFirstName} would rate it`,
            questionKey: `${stepKey}.readRating`,
            val: v.readRating,
            onSet: (s) => setField("readRating", s),
          })}
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
        {renderField({
          id: `guess-${key}`,
          label: step.title ? substituteNames(step.label || "Your guess", couple) : "Your guess",
          questionKey: `${stepKey}.guess`,
          helper: `You're guessing what ${couple.otherFirstName} put. You'll see their real answer once you've both finished.`,
          val: guessVal,
          onSet: (s) => setField(key, s),
        })}

        {!locked && (
          <Button onClick={() => onChange({ ...v, __submitted: true })} disabled={!mmIsFilled(guessVal)}>
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
                  <ValueBlock
                    val={(couple.partnerView?.responses as Rec)?.[step.guessOf || ""]}
                    partner
                    otherFirstName={couple.otherFirstName}
                  />
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
              <ValueBlock
                val={(couple.partnerView?.responses as Rec)?.[step.comparesKey || ""]}
                partner
                otherFirstName={couple.otherFirstName}
              />
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
                  {flatten(v).map(({ key, value: entry }) => (
                    <div key={key}>
                      <p className="text-xs text-muted-foreground">{key}</p>
                      <ValueBlock val={entry} empty="—" />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{couple.otherFirstName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {flatten((couple.partnerView?.responses || {}) as Rec).map(({ key, value: entry }) => (
                    <div key={key}>
                      <p className="text-xs text-muted-foreground">{key}</p>
                      <ValueBlock val={entry} partner otherFirstName={couple.otherFirstName} empty="—" />
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

/** Flatten nested answers to leaf entries, keeping recordings intact so they render by the rules above. */
function flatten(obj: Rec, prefix = ""): Array<{ key: string; value: unknown }> {
  const out: Array<{ key: string; value: unknown }> = [];
  for (const [k, val] of Object.entries(obj || {})) {
    if (k.startsWith("__")) continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (isMMRec(val)) {
      out.push({ key, value: val });
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      out.push(...flatten(val as Rec, key));
    } else if (val !== undefined && val !== null && val !== "") {
      out.push({ key, value: Array.isArray(val) ? val.join(", ") : String(val) });
    }
  }
  return out;
}
