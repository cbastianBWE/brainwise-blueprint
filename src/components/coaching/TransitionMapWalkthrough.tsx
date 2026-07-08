import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import TransitionMap from "./TransitionMap";

export interface TransitionMapBeat {
  group: string;
  label: string;
  body: string;
}

export interface TransitionMapStep {
  intro?: string;
  beats: TransitionMapBeat[];
}

export default function TransitionMapWalkthrough({ step }: { step: TransitionMapStep }) {
  const beats = step.beats || [];
  const [index, setIndex] = useState(0);
  const beat = beats[index];

  if (beats.length === 0) return null;

  return (
    <div className="space-y-4">
      {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}
      <TransitionMap
        className="w-full"
        activeGroup={beat?.group}
        onSelectGroup={(g) => {
          const i = beats.findIndex((b) => b.group === g);
          if (i >= 0) setIndex(i);
        }}
      />
      {beat && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{beat.label}</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{beat.body}</p>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          {index + 1} of {beats.length}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIndex((i) => Math.min(beats.length - 1, i + 1))}
          disabled={index === beats.length - 1}
        >
          Next <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
