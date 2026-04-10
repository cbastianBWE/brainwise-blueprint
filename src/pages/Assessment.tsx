import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import InstrumentSelection from "@/components/assessment/InstrumentSelection";
import AssessmentFlow from "@/components/assessment/AssessmentFlow";
import { supabase } from "@/integrations/supabase/client";

const INSTRUMENT_ID_TO_SHORT_NAME: Record<string, string> = {
  "INST-001": "PTP",
  "INST-002": "NAI",
  "INST-003": "AIRSA",
  "INST-004": "HSS",
};

const INSTRUMENT_ID_TO_NAME: Record<string, string> = {
  "INST-001": "Personal Threat Profile",
  "INST-002": "Neuroscience Adoption Index",
  "INST-003": "AI Readiness Skills Assessment",
  "INST-004": "Habit Stabilization Scorecard",
};

export default function Assessment() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedInstrument, setSelectedInstrument] = useState<{
    instrument_id: string;
    instrument_name: string;
    instrument_version: string;
    short_name: string;
  } | null>(null);

  // Handle autostart from post-payment redirect
  useEffect(() => {
    const instrumentId = searchParams.get("instrument");
    const autostart = searchParams.get("autostart");
    if (!instrumentId || autostart !== "true") return;

    const shortName = INSTRUMENT_ID_TO_SHORT_NAME[instrumentId];
    const instrumentName = INSTRUMENT_ID_TO_NAME[instrumentId];
    if (!shortName || !instrumentName) return;

    // Fetch platform version then auto-select
    const init = async () => {
      const { data } = await supabase
        .from("platform_versions")
        .select("version_string")
        .eq("is_active", true)
        .limit(1)
        .single();

      setSelectedInstrument({
        instrument_id: instrumentId,
        instrument_name: instrumentName,
        instrument_version: data?.version_string || "1.0",
        short_name: shortName,
      });

      // Clear the query params so refresh doesn't re-trigger
      setSearchParams({}, { replace: true });
    };
    init();
  }, [searchParams, setSearchParams]);

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
