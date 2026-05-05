import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp } from "lucide-react";
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

const PTP_DIMENSION_COLORS: Record<string, string> = {
  "DIM-PTP-01": "#021F36", // Protection — Navy
  "DIM-PTP-02": "#006D77", // Participation — Teal
  "DIM-PTP-03": "#6D6875", // Prediction — Gray
  "DIM-PTP-04": "#3C096C", // Purpose — Purple
  "DIM-PTP-05": "#2D6A4F", // Pleasure — Forest Green
};

const THREAT_DIMENSION_IDS = new Set(["DIM-PTP-01", "DIM-PTP-02", "DIM-PTP-03"]);
const REWARD_DIMENSION_IDS = new Set(["DIM-PTP-04", "DIM-PTP-05"]);

const PTP_ITEM_FACET_NAMES: Record<number, string> = {
  1: "Physical safety orientation",
  2: "Emotional safety (work)",
  3: "Financial security orientation",
  4: "Short-term loss aversion",
  5: "Status and standing vigilance",
  6: "Personal fairness sensitivity",
  7: "Equality and reciprocity need",
  8: "Resilience and recovery capacity",
  9: "Physical health vigilance",
  10: "Need to be trusted",
  11: "Need to trust others",
  12: "Similarity-based affiliation",
  13: "Group belonging need",
  14: "Need for individual differentiation",
  15: "Contrarian opinion drive",
  16: "Team orientation",
  17: "Self-esteem and self-respect",
  18: "Social comparison drive",
  19: "Recognition need",
  20: "Approval and respect need",
  21: "Power and influence need (work)",
  22: "Status and prestige need (work)",
  23: "Embarrassment avoidance",
  24: "Impostor sensitivity",
  25: "Future certainty need (work)",
  26: "Expectation clarity need (work)",
  27: "Evaluation criteria need",
  28: "Reward predictability need",
  29: "Autonomy and control need (work)",
  30: "Action orientation (work)",
  31: "Information and situational awareness",
  32: "Correctness need",
  33: "Perfectionism",
  34: "Status quo and stability need (work)",
  35: "Sense-making need (work)",
  36: "Consistency need",
  37: "Ambiguity tolerance (work)",
  38: "Surprise aversion (work)",
  39: "Conformity need",
  40: "Doubt tolerance",
  41: "Authenticity need",
  42: "Risk tolerance (work)",
  43: "Curiosity",
  44: "Voice and influence need",
  45: "Flexibility and flow capacity (work)",
  46: "Commitment reliability need (work)",
  47: "Well-being vigilance for close others",
  48: "Emotional safety (social)",
  49: "Financial loss aversion",
  50: "Environmental safety scanning",
  51: "Other-directed fairness sensitivity",
  52: "Animal welfare sensitivity",
  53: "Social equality vigilance",
  54: "Mental health vigilance",
  55: "Emotional health vigilance",
  56: "Spiritual health vigilance",
  57: "Power and influence need (social)",
  58: "Status and prestige need (social)",
  59: "Benevolence drive",
  60: "Future certainty need (social)",
  61: "Expectation clarity need (social)",
  62: "Autonomy and control need (social)",
  63: "Action orientation (social)",
  64: "Status quo and stability need (social)",
  65: "Sense-making need (social)",
  66: "Ambiguity tolerance (social)",
  67: "Surprise aversion (social)",
  68: "Risk tolerance (social)",
  69: "Self-directed independence need",
  70: "Tradition and ritual orientation",
  71: "Harmony and stability need",
  72: "Flexibility and flow capacity (social)",
  73: "Commitment reliability need (social)",
  74: "Mastery and craft orientation",
  75: "Self-development drive",
  76: "Mission and meaning orientation",
  77: "Values alignment (personal)",
  78: "Values alignment (organisational)",
  79: "Artistic and creative expression",
  80: "Spiritual orientation",
  81: "Passionate pursuit orientation",
  82: "Challenge and growth orientation",
  83: "Truth-seeking orientation",
  84: "Happiness pursuit",
  85: "Sensory and sensual gratification",
  86: "Instant gratification orientation",
  87: "Stimulation and excitement need",
  88: "Play orientation",
  89: "Love and attachment need",
};

interface FacetDataItem {
  itemNumber: number;
  facetName: string;
  itemText: string;
  score: number;
  dimensionId: string;
  contextType: string | null;
}

interface Props {
  assessmentId: string;
  additionalAssessmentId?: string;
  contextFilter?: "professional" | "personal";
  ptpContextTab: "professional" | "personal" | "combined" | null;
}

export default function PTPFullFacetCharts({
  assessmentId,
  additionalAssessmentId,
  contextFilter,
  ptpContextTab,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [allFacets, setAllFacets] = useState<FacetDataItem[]>([]);
  const [outerExpanded, setOuterExpanded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: responses, error } = await supabase
        .from("assessment_responses")
        .select("response_value_numeric, is_reverse_scored, item_id")
        .eq("assessment_id", assessmentId);

      if (error || !responses?.length) {
        setLoading(false);
        return;
      }

      let allResponses = responses ?? [];
      if (additionalAssessmentId) {
        const { data: additionalResponses } = await supabase
          .from("assessment_responses")
          .select("response_value_numeric, is_reverse_scored, item_id")
          .eq("assessment_id", additionalAssessmentId);
        if (additionalResponses?.length) {
          allResponses = [...allResponses, ...additionalResponses];
        }
      }

      const itemIds = allResponses.map((r) => r.item_id);
      const { data: items } = await supabase
        .from("items")
        .select("item_id, item_text, item_number, dimension_id, context_type")
        .in("item_id", itemIds);

      const itemMap = new Map((items ?? []).map((i) => [i.item_id, i]));

      let scored: FacetDataItem[] = allResponses.map((r) => {
        const item = itemMap.get(r.item_id);
        const raw = Number(r.response_value_numeric);
        const value = r.is_reverse_scored ? 100 - raw : raw;
        return {
          itemNumber: item?.item_number ?? 0,
          facetName:
            PTP_ITEM_FACET_NAMES[item?.item_number ?? 0] ??
            item?.item_text?.slice(0, 40) ??
            "",
          itemText: item?.item_text ?? "",
          score: Math.round(value),
          dimensionId: item?.dimension_id ?? "",
          contextType: item?.context_type ?? null,
        };
      });

      if (contextFilter) {
        const filtered = scored.filter((s) => s.contextType === contextFilter);
        if (filtered.length > 0) scored = filtered;
      }

      setAllFacets(scored);
      setLoading(false);
    };

    fetchData();
  }, [assessmentId, additionalAssessmentId, contextFilter]);

  const allSorted = useMemo(
    () => [...allFacets].sort((a, b) => b.score - a.score),
    [allFacets]
  );

  const threatSorted = useMemo(
    () =>
      allFacets
        .filter((f) => THREAT_DIMENSION_IDS.has(f.dimensionId))
        .sort((a, b) => b.score - a.score),
    [allFacets]
  );

  const rewardSorted = useMemo(
    () =>
      allFacets
        .filter((f) => REWARD_DIMENSION_IDS.has(f.dimensionId))
        .sort((a, b) => b.score - a.score),
    [allFacets]
  );

  const isProfessional = ptpContextTab === "professional";
  const showAll = allSorted.length > 0;
  const showThreat = !isProfessional && threatSorted.length > 0;
  const showReward = !isProfessional && rewardSorted.length > 0;

  if (loading) {
    return (
      <div
        style={{
          background: "var(--bw-white)",
          border: "1px solid var(--border-1)",
          borderRadius: "var(--r-md)",
          padding: "var(--s-4)",
          boxShadow: "var(--shadow-xs)",
          fontSize: 14,
          color: "var(--fg-3)",
        }}
      >
        Loading facet rankings...
      </div>
    );
  }

  if (allFacets.length === 0) {
    return null;
  }

  return (
    <div>
      <button
        onClick={() => setOuterExpanded((prev) => !prev)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bw-white)",
          border: "1px solid var(--border-1)",
          borderRadius: "var(--r-md)",
          padding: "var(--s-4)",
          boxShadow: "var(--shadow-xs)",
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "var(--font-display)",
          fontSize: 18,
          fontWeight: 600,
          color: "var(--fg-1)",
        }}
      >
        <span>All facet scores</span>
        {outerExpanded ? (
          <ChevronUp size={20} color="var(--fg-2)" />
        ) : (
          <ChevronDown size={20} color="var(--fg-2)" />
        )}
      </button>

      {outerExpanded && (
        <div style={{ marginTop: "var(--s-4)", display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
          {showAll && (
            <FacetSubChart
              title="All facets"
              subtitle={`${allSorted.length} items, ranked highest to lowest`}
              items={allSorted}
            />
          )}
          {showThreat && (
            <FacetSubChart
              title="Threat facets"
              subtitle={`${threatSorted.length} items across Protection, Participation, and Prediction`}
              items={threatSorted}
            />
          )}
          {showReward && (
            <FacetSubChart
              title="Reward facets"
              subtitle={`${rewardSorted.length} items across Purpose and Pleasure`}
              items={rewardSorted}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FacetSubChart({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: FacetDataItem[];
}) {
  const chartData = items.map((item) => ({
    name: truncate(item.facetName || `Q${item.itemNumber}`),
    fullText: item.facetName || item.itemText,
    itemText: item.itemText,
    value: item.score,
    color: PTP_DIMENSION_COLORS[item.dimensionId] ?? "#021F36",
    dimensionId: item.dimensionId,
  }));

  const chartHeight = Math.max(200, items.length * 28);

  return (
    <div
      style={{
        background: "var(--bw-white)",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--r-md)",
        padding: "var(--s-5)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ marginBottom: "var(--s-3)" }}>
        <h4
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--fg-1)",
            margin: 0,
          }}
        >
          {title}
        </h4>
        <p style={{ fontSize: 12, color: "var(--fg-3)", margin: 0, marginTop: 2 }}>{subtitle}</p>
      </div>

      <div style={{ width: "100%", height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 200, right: 50, top: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" width={190} tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bw-cream-200)" }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: number) => String(Math.round(v))}
                style={{ fontSize: 11, fill: "var(--fg-1)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { fullText, itemText, value, color } = payload[0].payload;
  return (
    <div
      style={{
        background: "var(--bw-white)",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--r-sm)",
        padding: "var(--s-3)",
        boxShadow: "var(--shadow-md)",
        maxWidth: 320,
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)", margin: 0, marginBottom: 4 }}>
        {fullText}
      </p>
      {itemText && itemText !== fullText && (
        <p style={{ fontSize: 12, color: "var(--fg-3)", margin: 0, marginBottom: 6 }}>{itemText}</p>
      )}
      <p style={{ fontSize: 13, fontWeight: 600, color, margin: 0 }}>Score: {value}</p>
    </div>
  );
}

function truncate(text: string, max = 50) {
  return text.length > max ? text.slice(0, max - 1) + "\u2026" : text;
}
