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
import { PTP_DIMENSION_COLORS } from "@/lib/ptpDimensionColors";
import { PtpDimensionLegend } from "@/components/results/PtpDimensionLegend";
import { selectDrivingFacets } from "@/lib/selectDrivingFacets";

interface FacetItem {
  item_text: string;
  value: number;
  dimension_id: string;
  facet_name: string;
  itemNumber: number;
}

interface Props {
  assessmentId: string;
  additionalAssessmentId?: string;
  contextFilter?: 'professional' | 'personal' | 'combined';
}

export default function DrivingFacetScores({ assessmentId, additionalAssessmentId, contextFilter }: Props) {
  const [loading, setLoading] = useState(true);
  const [elevated, setElevated] = useState<FacetItem[]>([]);
  const [suppressed, setSuppressed] = useState<FacetItem[]>([]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);

      // Fetch responses with item details
      const { data: responses, error } = await supabase
        .from("assessment_responses")
        .select("response_value_numeric, is_reverse_scored, item_id")
        .eq("assessment_id", assessmentId)
        .order("item_id");

      if (error || !responses?.length) {
        setLoading(false);
        return;
      }

      let allResponses = responses ?? [];
      if (additionalAssessmentId) {
        const { data: additionalResponses } = await supabase
          .from("assessment_responses")
          .select("response_value_numeric, is_reverse_scored, item_id")
          .eq("assessment_id", additionalAssessmentId)
          .order("item_id");
        if (additionalResponses?.length) {
          allResponses = [...allResponses, ...additionalResponses];
        }
      }

      // Get item details
      const itemIds = allResponses.map((r) => r.item_id);
      const { data: items } = await supabase
        .from("items_presentation")
        .select("item_id, item_text, item_number, dimension_id, facet_name")
        .in("item_id", itemIds);

      const itemMap = new Map(
        (items ?? []).map((i) => [i.item_id, i])
      );

      // Build scored values with reverse scoring applied
      const scoredItems: FacetItem[] = allResponses.map((r) => {
        const item = itemMap.get(r.item_id);
        const raw = Number(r.response_value_numeric);
        const value = r.is_reverse_scored ? 100 - raw : raw;
        return {
          item_text: item?.item_text ?? r.item_id,
          dimension_id: item?.dimension_id ?? "",
          facet_name: item?.facet_name ?? "",
          itemNumber: item?.item_number ?? 0,
          value,
        };
      });

      // Filter by context if specified (for 'both' assessments shown in split tab)
      let filteredItems = scoredItems;
      if (contextFilter && contextFilter !== 'combined') {
        const { data: contextItems } = await supabase
          .from("items_presentation")
          .select('item_id, context_type')
          .in('item_id', allResponses.map(r => r.item_id));
        const contextItemMap = new Map((contextItems ?? []).map(i => [i.item_id, i.context_type]));
        filteredItems = scoredItems.filter((_, i) => {
          const itemId = allResponses[i]?.item_id;
          return contextItemMap.get(itemId) === contextFilter;
        });
        if (!filteredItems.length) filteredItems = scoredItems;
      }

      const selection = selectDrivingFacets(filteredItems);

      setElevated(selection.elevated.items);
      setSuppressed(selection.suppressed.items);
      setLoading(false);
    };

    fetch();
  }, [assessmentId, additionalAssessmentId, contextFilter]);

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
              <FacetSection title="Highest Scoring Facets" items={elevated} />
            )}
            {suppressed.length > 0 && (
              <FacetSection title="Lowest Scoring Facets" items={suppressed} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function truncate(text: string, max = 60) {
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
    name: truncate(item.facet_name),
    fullText: item.item_text,
    value: Math.round(item.value),
    color: PTP_DIMENSION_COLORS[item.dimension_id] ?? "#8EA9C1",
  }));

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <PtpDimensionLegend dimensionIds={[...new Set(items.map((i) => i.dimension_id))]} />


      <ScrollArea className="w-full">
        <div
          style={{
            minWidth: 800,
            height: Math.max(200, items.length * 40),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 12, right: 50, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis
                dataKey="name"
                type="category"
                width={400}
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
                  formatter={(v: number) => String(Math.round(v))}
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
