import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  valueHours: string;
  onChange: (v: string) => void;
  maxHours?: number;
};

const MINUTES = [0, 15, 30, 45];

export default function DurationPicker({ valueHours, onChange, maxHours = 12 }: Props) {
  const total = Number(valueHours);
  const snappedMin =
    Number.isFinite(total) && total > 0 ? Math.round((total * 60) / 15) * 15 : 0;
  const h = Math.floor(snappedMin / 60);
  const m = snappedMin % 60;

  useEffect(() => {
    if (!Number.isFinite(total) || total <= 0) return;
    const snappedDecimal = (Math.round((total * 60) / 15) * 15) / 60;
    if (snappedDecimal !== total) {
      onChange(String(snappedDecimal));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueHours]);

  const emit = (hh: number, mm: number) => onChange(String(hh + mm / 60));

  const hourOptions = Array.from({ length: maxHours + 1 }, (_, i) => i);

  return (
    <div className="grid grid-cols-2 gap-2">
      <Select value={String(h)} onValueChange={(v) => emit(Number(v), m)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hourOptions.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n} h
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(m)} onValueChange={(v) => emit(h, Number(v))}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((mm) => (
            <SelectItem key={mm} value={String(mm)}>
              {String(mm).padStart(2, "0")} m
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
