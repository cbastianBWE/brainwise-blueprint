import { Coffee, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MoveDatePopover } from "./MoveDatePopover";
import { type BdoItem, type BdoPlanBody, moveCountNote } from "./bdoShared";

export default function BestDayPlan({
  body,
  items,
  busyIds,
  onToggleDone,
  onMove,
  onDrop,
  onReshape,
  reshaping,
  reshapesRemaining,
  reshapeNotice,
}: {
  body: BdoPlanBody;
  items: BdoItem[];
  busyIds: Set<string>;
  onToggleDone: (itemId: string, done: boolean) => void;
  onMove: (itemId: string, date: string) => void;
  onDrop: (itemId: string) => void;
  onReshape: () => void;
  reshaping: boolean;
  reshapesRemaining: number;
  reshapeNotice: string | null;
}) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const blocks = body.blocks ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          {body.headline || "Your day"}
        </h1>
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="outline"
            onClick={onReshape}
            disabled={reshaping || reshapesRemaining <= 0}
          >
            {reshaping ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Reshape my day
          </Button>
          {reshapesRemaining <= 0 && (
            <span className="text-xs text-muted-foreground">
              You have used all of today's reshapes.
            </span>
          )}
        </div>
      </div>

      {reshapeNotice && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
          {reshapeNotice}
        </div>
      )}

      {blocks.length === 0 ? (
        body.note ? (
          <Card>
            <CardContent className="p-4">
              <p className="whitespace-pre-wrap text-sm">{body.note}</p>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing planned yet.</p>
        )
      ) : (
        <ol className="space-y-2">
          {blocks.map((b, i) => {
            if (b.kind === "break") {
              return (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4"
                >
                  <Coffee className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{b.title}</p>
                    {b.detail && <p className="text-sm text-muted-foreground">{b.detail}</p>}
                  </div>
                  {b.minutes ? (
                    <span className="shrink-0 text-xs text-muted-foreground">{b.minutes} min</span>
                  ) : null}
                </li>
              );
            }

            const item = b.item_id ? byId.get(b.item_id) : undefined;
            const done = item?.status === "done";
            const dropped = item?.status === "dropped";
            const busy = b.item_id ? busyIds.has(b.item_id) : false;
            const note = item ? moveCountNote(item.move_count) : null;

            return (
              <li key={i} className="flex items-start gap-3 rounded-lg border bg-card p-4">
                {b.item_id ? (
                  <Checkbox
                    className="mt-1"
                    checked={done}
                    disabled={busy || dropped}
                    onCheckedChange={(v) => onToggleDone(b.item_id!, v === true)}
                    aria-label={`Mark ${b.title} done`}
                  />
                ) : (
                  <span className="mt-1 text-xs font-semibold text-muted-foreground">{i + 1}</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className={done || dropped ? "font-medium line-through text-muted-foreground" : "font-medium"}>
                    {b.title}
                  </p>
                  {b.detail && <p className="text-sm text-muted-foreground">{b.detail}</p>}
                  {note && <p className="text-xs text-muted-foreground">{note}</p>}
                  {dropped && <p className="text-xs text-muted-foreground">Dropped</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {b.minutes ? (
                    <span className="text-xs text-muted-foreground">{b.minutes} min</span>
                  ) : null}
                  {b.item_id && !dropped && (
                    <div className="flex items-center gap-2">
                      <MoveDatePopover disabled={busy} onPick={(d) => onMove(b.item_id!, d)} />
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => onDrop(b.item_id!)}>
                        Drop
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {blocks.length > 0 && body.note && (
        <Card>
          <CardContent className="p-4">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{body.note}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
