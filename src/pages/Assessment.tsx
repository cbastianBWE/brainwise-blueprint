import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import InstrumentSelection from "@/components/assessment/InstrumentSelection";
import AssessmentFlow from "@/components/assessment/AssessmentFlow";
import { Card, CardContent } from "@/components/ui/card";
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
  const [contextType, setContextType] = useState<'professional' | 'personal' | 'both' | null>(null);

  // Handle autostart from post-payment redirect
  useEffect(() => {
    const instrumentId = searchParams.get("instrument");
    const autostart = searchParams.get("autostart");
    if (!instrumentId || autostart !== "true") return;

    const shortName = INSTRUMENT_ID_TO_SHORT_NAME[instrumentId];
    const instrumentName = INSTRUMENT_ID_TO_NAME[instrumentId];
    if (!shortName || !instrumentName) return;

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

      setSearchParams({}, { replace: true });
    };
    init();
  }, [searchParams, setSearchParams]);

  if (selectedInstrument) {
    if (selectedInstrument.instrument_id === "INST-001" && contextType === null) {
      return <PTPContextSelection onSelect={setContextType} />;
    }
    return (
      <AssessmentFlow
        instrument={selectedInstrument}
        contextType={contextType}
        onExit={() => {
          setSelectedInstrument(null);
          setContextType(null);
        }}
      />
    );
  }

  return <InstrumentSelection onSelect={setSelectedInstrument} />;
}

function PTPContextSelection({
  onSelect,
}: {
  onSelect: (ctx: 'professional' | 'personal' | 'both') => void;
}) {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Personal Threat Profile</h1>
          <p className="text-muted-foreground">
            Before we begin, tell us which context you are completing this assessment for. You can complete the other half later.
          </p>
        </div>
        <div className="grid gap-4">
          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => onSelect('professional')}
          >
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-1">Corporate / Professional</h3>
              <p className="text-sm text-muted-foreground">
                Assess your threat responses in work and professional contexts.
              </p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => onSelect('personal')}
          >
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-1">Personal / Social</h3>
              <p className="text-sm text-muted-foreground">
                Assess your threat responses in personal and social contexts.
              </p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => onSelect('both')}
          >
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-1">Both</h3>
              <p className="text-sm text-muted-foreground">
                Complete the full 89-question assessment covering all contexts.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
