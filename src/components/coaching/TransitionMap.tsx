import type React from "react";

/**
 * TransitionMap
 * Responsive SVG recreation of the "My BrainWise Transition Map".
 * Eight labeled regions, each a <g data-group="..."> for future interaction.
 *
 * Draw order (back → front): Purpose, Resolve, Support, Future, Present,
 * Pathway, Past, Life's Tools. Labels sit on top within their own group.
 */
export default function TransitionMap({ className, onSelectGroup, lockedGroups = [] }: { className?: string; onSelectGroup?: (group: string) => void; lockedGroups?: string[] }) {
  const groupProps = (name: string) => ({
    className: "tm-region",
    role: "button",
    tabIndex: 0,
    onClick: () => onSelectGroup?.(name),
    onKeyDown: (e: React.KeyboardEvent<SVGGElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelectGroup?.(name);
      }
    },
    "aria-label": `Open ${name} activities`,
  });
  // Region palette — light tints, dark brand strokes and labels
  const PURPOSE_FILL = "#ECE3F4";
  const PURPOSE_STROKE = "#3C096C";
  const PURPOSE_LABEL = "#3C096C";

  const FUTURE_FILL = "#D8E8DF";
  const FUTURE_STROKE = "#2D6A4F";
  const FUTURE_LABEL = "#2D6A4F";

  const PRESENT_FILL = "#CFE4E7";
  const PRESENT_STROKE = "#006D77";
  const PRESENT_LABEL = "#006D77";

  const PAST_OUTER_FILL = "#E3E1E6";
  const PAST_STROKE = "#6D6875";
  const PAST_INNER_FILL = "#C7C4CD";
  const PAST_LABEL = "#4A4653";
  const RECENT_PAST_LABEL = "#F5F3F7";

  const TOOLS_FILL = "#EBE1CC";
  const TOOLS_STROKE = "#7A5800";
  const TOOLS_LABEL = "#7A5800";

  const PATHWAY_FILL = "#CFD7DF";
  const PATHWAY_STROKE = "#021F36";
  const PATHWAY_LABEL = "#021F36";
  const PATHWAY_TAIL = "#021F36";

  const CHANNEL_FILL = "#F6F2E7";
  const CHANNEL_STROKE = "#C9C1AD";
  const CHANNEL_LABEL = "#4A4653";

  const FONT = "ui-sans-serif, system-ui, sans-serif";

  return (
    <svg
      className={className}
      viewBox="0 0 1600 980"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BrainWise Transition Map"
    >
      <style>{`
        .tm-region { cursor: pointer; transition: filter .15s ease; outline: none; }
        .tm-region:hover { filter: brightness(0.95); }
        .tm-region:focus-visible { filter: brightness(0.92) drop-shadow(0 0 3px rgba(2,31,54,0.45)); }
      `}</style>
      {/* ---------- PURPOSE: background cloud (back) ---------- */}
      <g data-group="Purpose" {...groupProps("Purpose")}>
        <path
          transform="translate(0 -45) scale(1 1.22)"
          d="
            M 260,240
            C 210,180 240,110 320,110
            C 340,70 420,60 470,100
            C 520,50 640,50 700,110
            C 760,60 900,70 940,140
            C 1010,90 1160,110 1200,190
            C 1300,150 1440,220 1450,320
            C 1540,340 1570,470 1500,540
            C 1560,620 1490,760 1380,750
            C 1340,830 1180,840 1120,780
            C 1040,830 900,820 860,750
            C 780,820 620,820 570,740
            C 490,800 340,790 300,700
            C 200,720 120,620 170,540
            C 90,480 110,340 200,320
            C 190,270 220,240 260,240 Z
          "
          fill={PURPOSE_FILL}
          stroke={PURPOSE_STROKE}
          strokeWidth="3"
        />
        <text
          x="1060"
          y="200"
          fill={PURPOSE_LABEL}
          fontSize="44"
          fontWeight="700"
          fontFamily={FONT}
          textAnchor="middle"
        >
          Purpose
        </text>
      </g>

      {/* ---------- FUTURE: right cloud (drawn before channels so arrowheads sit on top) ---------- */}
      <g data-group="Future" {...groupProps("Future")}>
        <path
          d="
            M 1220,430
            C 1190,380 1240,320 1310,340
            C 1340,290 1420,290 1450,350
            C 1520,320 1580,380 1560,440
            C 1600,470 1580,550 1520,570
            C 1550,620 1470,680 1400,660
            C 1370,710 1290,710 1260,660
            C 1200,690 1140,620 1170,560
            C 1120,530 1140,450 1220,430 Z
          "
          fill={FUTURE_FILL}
          stroke={FUTURE_STROKE}
          strokeWidth="3"
        />
        <text
          x="1380"
          y="440"
          fill={FUTURE_LABEL}
          fontSize="40"
          fontWeight="700"
          fontFamily={FONT}
          textAnchor="middle"
        >
          <tspan x="1380" dy="0">Ideal</tspan>
          <tspan x="1380" dy="44">Future</tspan>
        </text>
      </g>

      {/* ---------- RESOLVE: top channel (arrowhead into Future cloud) ---------- */}
      <g data-group="Resolve" {...groupProps("Resolve")}>
        <path
          d="
            M 470,380
            L 470,240
            L 1330,240
            L 1330,290
            L 1385,290
            L 1310,340
            L 1235,290
            L 1290,290
            L 1290,280
            L 510,280
            L 510,380 Z
          "

          fill={CHANNEL_FILL}
          stroke={CHANNEL_STROKE}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <text
          x="820"
          y="270"
          fill={CHANNEL_LABEL}
          fontSize="34"
          fontWeight="700"
          fontFamily={FONT}
        >
          Resolve
        </text>
      </g>

      {/* ---------- SUPPORT: bottom channel (arrowhead into Future cloud) ---------- */}
      <g data-group="Support" {...groupProps("Support")}>
        <path
          d="
            M 470,657
            L 470,797
            L 1330,797
            L 1330,747
            L 1385,747
            L 1310,697
            L 1235,747
            L 1290,747
            L 1290,757
            L 510,757
            L 510,657 Z
          "
          fill={CHANNEL_FILL}
          stroke={CHANNEL_STROKE}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <text
          x="780"
          y="787"

          fill={CHANNEL_LABEL}
          fontSize="34"
          fontWeight="700"
          fontFamily={FONT}
        >
          External support
        </text>
      </g>


      {/* ---------- PAST: spiral shell + inner circle (behind Present) ---------- */}
      <g data-group="Past" {...groupProps("Past")}>
        <path
          d="
            M 300,660
            m -220,0
            a 220,220 0 1,0 440,0
            a 220,220 0 1,0 -440,0
            Z
            M 300,660
            L 520,660
            A 220,220 0 0,0 300,440 Z
          "
          fill={PAST_OUTER_FILL}
          stroke={PAST_STROKE}
          strokeWidth="3"
          fillRule="evenodd"
        />
        <circle
          cx="300"
          cy="660"
          r="108"
          fill={PAST_INNER_FILL}
          stroke={PAST_STROKE}
          strokeWidth="3"
        />
        {/* "Past" sits just off the top edge of the outer ring */}
        <text
          x="200"
          y="545"

          fill={PAST_LABEL}
          fontSize="40"
          fontWeight="700"
          fontFamily={FONT}
          textAnchor="middle"
        >
          Past
        </text>
        {/* "Recent past" left-aligned inside the enlarged inner circle, two lines */}
        <text
          x="205"
          y="652"
          fill="#3A3740"
          fontSize="24"
          fontWeight="700"
          fontFamily={FONT}
          textAnchor="start"
        >
          <tspan x="205" dy="0">Recent</tspan>
          <tspan x="205" dy="26">past</tspan>
        </text>


      </g>

      {/* ---------- PRESENT: rounded square (in front of Past) ---------- */}
      <g data-group="Present" {...groupProps("Present")}>
        <rect
          x="290"
          y="290"
          width="410"
          height="410"
          rx="18"
          ry="18"
          fill={PRESENT_FILL}
          stroke={PRESENT_STROKE}
          strokeWidth="3"
        />
        <text
          x="330"
          y="350"
          fill={PRESENT_LABEL}
          fontSize="44"
          fontWeight="700"
          fontFamily={FONT}
        >
          Present state
        </text>
      </g>

      {/* ---------- PATHWAY: block arrow with layered tail ---------- */}
      <g data-group="Pathway" {...groupProps("Pathway")}>
        <rect x="610" y="410" width="14" height="180" fill={PATHWAY_TAIL} />
        <rect x="632" y="410" width="14" height="180" fill={PATHWAY_TAIL} />
        <path
          d="
            M 656,410
            L 1120,410
            L 1120,360
            L 1240,500
            L 1120,640
            L 1120,590
            L 656,590
            Z
          "
          fill={PATHWAY_FILL}
          stroke={PATHWAY_STROKE}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <text
          x="700"
          y="515"
          fill={PATHWAY_LABEL}
          fontSize="44"
          fontWeight="700"
          fontFamily={FONT}
        >
          Pathway to get there
        </text>
      </g>


      {/* ---------- LIFE'S TOOLS: small circle at arrow base (front) ---------- */}
      <g data-group="Life's Tools" {...groupProps("Life's Tools")}>
        <circle
          cx="548"
          cy="500"
          r="52"
          fill={TOOLS_FILL}
          stroke={TOOLS_STROKE}
          strokeWidth="3"
        />
        <text
          x="548"
          y="495"
          fill={TOOLS_LABEL}
          fontSize="22"
          fontWeight="700"
          fontFamily={FONT}
          textAnchor="middle"
        >
          <tspan x="548" dy="0">Life's</tspan>
          <tspan x="548" dy="24">Tools</tspan>
        </text>


      </g>

      {/* ---------- LOCK BADGES (drawn last, on top) ---------- */}
      {(() => {
        const LOCK_POSITIONS: Record<string, { x: number; y: number }> = {
          Purpose: { x: 1018, y: 186 },
          Future: { x: 1338, y: 400 },
          Present: { x: 300, y: 336 },
          Past: { x: 158, y: 531 },
          "Life's Tools": { x: 490, y: 500 },
          Pathway: { x: 660, y: 501 },
          Resolve: { x: 778, y: 256 },
          Support: { x: 738, y: 773 },
        };
        const ORANGE = "#F5741A";
        return lockedGroups
          .filter((g) => g in LOCK_POSITIONS)
          .map((g) => {
            const { x, y } = LOCK_POSITIONS[g];
            return (
              <g key={`lock-${g}`} data-lock={g} pointerEvents="none">
                <circle cx={x} cy={y} r={20} fill="#FFFFFF" stroke={ORANGE} strokeWidth={2.5} />
                {/* Shackle arc */}
                <path
                  d={`M ${x - 6} ${y - 2} v -4 a 6 6 0 0 1 12 0 v 4`}
                  fill="none"
                  stroke={ORANGE}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Body */}
                <rect
                  x={x - 8}
                  y={y - 2}
                  width={16}
                  height={12}
                  rx={2.5}
                  ry={2.5}
                  fill={ORANGE}
                />
              </g>
            );
          });
      })()}
    </svg>
  );
}
