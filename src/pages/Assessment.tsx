import { useState } from "react";
import InstrumentSelection from "@/components/assessment/InstrumentSelection";
import AssessmentFlow from "@/components/assessment/AssessmentFlow";

export default function Assessment() {
  const [selectedInstrument, setSelectedInstrument] = useState<{
    instrument_id: string;
    instrument_name: string;
    instrument_version: string;
    short_name: string;
  } | null>(null);

  if (selectedInstrument) {
    return (
      <AssessmentFlow
        instrument={selectedInstrument}
        onExit={() => setSelectedInstrument(null)}
      />
    );
  }

  return <InstrumentSelection onSelect={setSelectedInstrument} />;
}
