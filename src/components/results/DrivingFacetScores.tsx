import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const PTP_DIMENSION_COLORS: Record<string, string> = {
  "DIM-PTP-01": "#1F4E79",
  "DIM-PTP-02": "#2E75B6",
  "DIM-PTP-03": "#4BACC6",
  "DIM-PTP-04": "#70AD47",
  "DIM-PTP-05": "#ED7D31",
};

interface FacetItem {
  item_text: string;
  value: number;
  dimension_id: string;
}

interface Props {
  assessmentId: string;
}

export default function DrivingFacetScores({ assessmentId }: Props) {
  const [loading, setLoading] = useState(true);
  const [elevated, setElevated] = useState<FacetItem[]>([]);
  const [suppressed, setSuppressed] = useState<FacetItem[]>([]);
  const [totalElevated, setTotalElevated] = useState(0);
  const [totalSuppressed, setTotalSuppressed] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);

      // Fetch responses with item details
      const { data: responses, error } = await supabase
        .from("assessment_responses")
        .select("response_value_numeric, is_reverse_scored, item_id")
        .eq("assessment_id", assessmentId);

      if (error || !responses?.length) {
        setLoading(false);
        return;
      }

      // Get item details
      const itemIds = responses.map((r) => r.item_id);
      const { data: items } = await supabase
        .from("items")
        .select("item_id, item_text, dimension_id")
        .in("item_id", itemIds);

      const itemMap = new Map(
        (items ?? []).map((i) => [i.item_id, i])
      );

      // Build scored values with reverse scoring applied
      const scoredItems = responses.map((r) => {
        const item = itemMap.get(r.item_id);
        const raw = Number(r.response_value_numeric);
        const value = r.is_reverse_scored ? 100 - raw : raw;
        return {
          item_text: item?.item_text ?? r.item_id,
          dimension_id: item?.dimension_id ?? "",
          value,
        };
      });

      // Calculate mean and std dev
      const values = scoredItems.map((s) => s.value);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
      const stdDev = Math.sqrt(variance);

      const upperThreshold = mean + stdDev;
      const lowerThreshold = mean - stdDev;

      const allElevated = scoredItems
        .filter((s) => s.value > upperThreshold)
        .sort((a, b) => (b.value - mean) - (a.value - mean));
      const allSuppressed = scoredItems
        .filter((s) => s.value < lowerThreshold)
        .sort((a, b) => (a.value - mean) - (b.value - mean));

      setElevated(allElevated.slice(0, 10));
      setSuppressed(allSuppressed.slice(0, 10));
      setTotalElevated(allElevated.length);
      setTotalSuppressed(allSuppressed.length);
      setLoading(false);
    };

    fetch();
  }, [assessmentId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Driving Facet Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40" />
        </CardContent>
      </Card>
    );
  }

  const noOutliers = elevated.length === 0 && suppressed.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Driving Facet Scores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {noOutliers ? (
          <p className="text-sm text-muted-foreground">
            Your scores are evenly distributed across all facets.
          </p>
        ) : (
          <>
            {elevated.length > 0 && (
              <FacetSection title="Elevated Facets" items={elevated} />
            )}
            {suppressed.length > 0 && (
              <FacetSection title="Suppressed Facets" items={suppressed} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function truncate(text: string, max = 50) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { fullText, value, color } = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover p-3 shadow-md max-w-xs">
      <p className="text-xs text-muted-foreground mb-1">{fullText}</p>
      <p className="text-sm font-semibold" style={{ color }}>
        Score: {value}
      </p>
    </div>
  );
}

function FacetSection({
  title,
  items,
}: {
  title: string;
  items: FacetItem[];
}) {
  const chartData = items.map((item) => ({
    name: truncate(item.item_text),
    fullText: item.item_text,
    value: Number(item.value.toFixed(1)),
    color: PTP_DIMENSION_COLORS[item.dimension_id] ?? "#8EA9C1",
  }));

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <ScrollArea className="w-full">
        <div
          style={{
            minWidth: 500,
            height: Math.max(200, items.length * 40),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 200, right: 50, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis
                dataKey="name"
                type="category"
                width={190}
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v: number) => v.toFixed(1)}
                  style={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
