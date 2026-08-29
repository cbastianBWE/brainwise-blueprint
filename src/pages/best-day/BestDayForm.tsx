import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { MoveDatePopover } from "./MoveDatePopover";
import { type BdoCarryover, type FormField, type FormSpec, moveCountNote } from "./bdoShared";

type Values = Record<string, unknown>;

export default function BestDayForm({
  spec,
  carryover,
  busyIds,
  onTriageKeep,
  onTriageMove,
  onTriageDrop,
  onContinue,
  submitting,
}: {
  spec: FormSpec | null;
  carryover: BdoCarryover[];
  busyIds: Set<string>;
  onTriageKeep: (id: string) => void;
  onTriageMove: (id: string, date: string) => void;
  onTriageDrop: (id: string) => void;
  onContinue: (form: Values, todayTitles: string[]) => void;
  submitting: boolean;
}) {
  const fields = useMemo(() => spec?.fields ?? [], [spec]);

  const [values, setValues] = useState<Values>(() => {
    const init: Values = {};
    for (const f of fields) {
      if (f.type === "list") init[f.key] = [""];
      else if (f.type === "slider" || f.type === "scale") init[f.key] = f.min ?? 0;
      else if (f.type === "choice") init[f.key] = f.options?.[0] ?? "";
    }
    return init;
  });

  const set = (key: string, v: unknown) => setValues((p) => ({ ...p, [key]: v }));

  const listValue = (key: string): string[] => {
    const v = values[key];
    return Array.isArray(v) ? (v as string[]) : [""];
  };

  const todayField = fields.find((f) => f.type === "list" && f.key === "today");

  const handleContinue = () => {
    const form: Values = {};
    for (const f of fields) {
      if (f.type === "triage") continue;
      if (f.type === "list") {
        form[f.key] = listValue(f.key).map((s) => s.trim()).filter(Boolean);
      } else if (f.key in values) {
        form[f.key] = values[f.key];
      }
    }
    const titles = todayField
      ? listValue(todayField.key).map((s) => s.trim()).filter(Boolean)
      : [];
    onContinue(form, titles);
  };

  const renderField = (f: FormField) => {
    switch (f.type) {
      case "triage": {
        if (carryover.length === 0) return null;
        return (
          <div key={f.key} className="space-y-3">
            <div>
              <Label className="text-base">{f.label}</Label>
              {f.help && <p className="text-sm text-muted-foreground">{f.help}</p>}
            </div>
            <div className="space-y-2">
              {carryover.map((c) => {
                const note = moveCountNote(c.move_count);
                const busy = busyIds.has(c.id);
                return (
                  <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{c.title}</p>
                      {note && <p className="text-xs text-muted-foreground">{note}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => onTriageKeep(c.id)}>
                        Keep for today
                      </Button>
                      <MoveDatePopover disabled={busy} onPick={(d) => onTriageMove(c.id, d)} />
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => onTriageDrop(c.id)}>
                        Drop
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      case "list": {
        const rows = listValue(f.key);
        return (
          <div key={f.key} className="space-y-2">
            <Label className="text-base">
              {f.label}
              {f.optional && <span className="ml-2 text-xs font-normal text-muted-foreground">optional</span>}
            </Label>
            {f.help && <p className="text-sm text-muted-foreground">{f.help}</p>}
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={row}
                    placeholder={f.placeholder}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = e.target.value;
                      set(f.key, next);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        set(f.key, [...rows, ""]);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove"
                    onClick={() => set(f.key, rows.length === 1 ? [""] : rows.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => set(f.key, [...rows, ""])}>
              <Plus className="h-4 w-4" />
              Add another
            </Button>
          </div>
        );
      }
      case "slider": {
        const min = f.min ?? 0;
        const max = f.max ?? 10;
        const v = typeof values[f.key] === "number" ? (values[f.key] as number) : min;
        return (
          <div key={f.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base">{f.label}</Label>
              <span className="text-sm text-muted-foreground">
                {v} {f.suffix ?? ""}
              </span>
            </div>
            {f.help && <p className="text-sm text-muted-foreground">{f.help}</p>}
            <Slider
              value={[v]}
              min={min}
              max={max}
              step={f.step ?? 1}
              onValueChange={(arr) => set(f.key, arr[0])}
            />
          </div>
        );
      }
      case "scale": {
        const min = f.min ?? 1;
        const max = f.max ?? 5;
        const v = typeof values[f.key] === "number" ? (values[f.key] as number) : min;
        const opts = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        return (
          <div key={f.key} className="space-y-2">
            <Label className="text-base">{f.label}</Label>
            {f.help && <p className="text-sm text-muted-foreground">{f.help}</p>}
            <div className="flex flex-wrap items-center gap-2">
              {opts.map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={v === n ? "default" : "outline"}
                  onClick={() => set(f.key, n)}
                >
                  {n}
                </Button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{f.low_label}</span>
              <span>{f.high_label}</span>
            </div>
          </div>
        );
      }
      case "choice": {
        const v = values[f.key];
        return (
          <div key={f.key} className="space-y-2">
            <Label className="text-base">{f.label}</Label>
            {f.help && <p className="text-sm text-muted-foreground">{f.help}</p>}
            <div className="flex flex-wrap gap-2">
              {(f.options ?? []).map((o) => (
                <Button
                  key={o}
                  type="button"
                  size="sm"
                  variant={v === o ? "default" : "outline"}
                  onClick={() => set(f.key, o)}
                >
                  {o}
                </Button>
              ))}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>This morning</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {fields.map(renderField)}
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This morning's questions could not be loaded. Refresh the page to try again.
          </p>
        ) : (
          <div className="flex justify-end">
            <Button onClick={handleContinue} disabled={submitting}>
              Continue
            </Button>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
