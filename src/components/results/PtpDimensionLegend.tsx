import { PTP_DIMENSION_COLORS } from "@/lib/ptpDimensionColors";

const PTP_LEGEND_NAMES: Record<string, string> = {
  "DIM-PTP-01": "Protection",
  "DIM-PTP-02": "Participation",
  "DIM-PTP-03": "Prediction",
  "DIM-PTP-04": "Purpose",
  "DIM-PTP-05": "Pleasure",
};
const PTP_DIM_ORDER = ["DIM-PTP-01", "DIM-PTP-02", "DIM-PTP-03", "DIM-PTP-04", "DIM-PTP-05"];

export function PtpDimensionLegend({ dimensionIds }: { dimensionIds?: string[] }) {
  const ids =
    dimensionIds && dimensionIds.length
      ? PTP_DIM_ORDER.filter((d) => dimensionIds.includes(d))
      : PTP_DIM_ORDER;
  if (ids.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 14px",
        margin: "8px 0 12px",
      }}
    >
      {ids.map((d) => (
        <div key={d} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: PTP_DIMENSION_COLORS[d] ?? "#021F36",
            }}
          />
          <span style={{ fontSize: 11, color: "var(--fg-2)" }}>
            {PTP_LEGEND_NAMES[d] ?? d}
          </span>
        </div>
      ))}
    </div>
  );
}
