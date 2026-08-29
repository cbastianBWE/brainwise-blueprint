import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { localDate, tomorrowDate } from "./bdoShared";

export function MoveDatePopover({
  onPick,
  disabled,
  label = "Move",
}: {
  onPick: (isoDate: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });

  const today = localDate();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <CalendarIcon className="h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (!d) return;
            setSelected(d);
            const iso = localDate(d);
            if (iso <= today) return;
            setOpen(false);
            onPick(iso);
          }}
          disabled={(d) => localDate(d) <= today}
          initialFocus
          className="p-3 pointer-events-auto"
        />
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              setOpen(false);
              onPick(tomorrowDate());
            }}
          >
            Tomorrow
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
