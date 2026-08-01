import { useCallback, useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import CoupleRoster from "./CoupleRoster";
import CoupleOverview from "./CoupleOverview";
import SafetyInbox from "./SafetyInbox";
import { fetchRoster, type RosterRow } from "./couplesShared";

/**
 * "My Relationship couples" — a view inside the existing coach client surface.
 * Everything renders from the content-blind coach RPCs.
 */
export default function CouplesTab() {
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRoster(await fetchRoster());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const couple = useMemo(
    () => (roster || []).find((r) => r.relationship_id === selected) ?? null,
    [roster, selected],
  );

  const openAlerts = (roster || []).reduce((n, r) => n + (r.open_alerts || 0), 0);

  if (roster === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (couple) {
    return (
      <CoupleOverview
        couple={couple}
        onBack={() => setSelected(null)}
        onChanged={load}
      />
    );
  }

  return (
    <Tabs defaultValue="roster">
      <TabsList>
        <TabsTrigger value="roster">Couples</TabsTrigger>
        <TabsTrigger value="safety">
          Safety inbox{openAlerts > 0 ? ` (${openAlerts})` : ""}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="roster" className="mt-4">
        <CoupleRoster rows={roster} onOpen={setSelected} />
      </TabsContent>
      <TabsContent value="safety" className="mt-4">
        <SafetyInbox onChanged={load} />
      </TabsContent>
    </Tabs>
  );
}
