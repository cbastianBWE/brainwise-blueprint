/**
 * TransitionMap
 * Responsive SVG recreation of the "My BrainWise Transition Map".
 * Eight labeled regions, each a <g data-group="..."> for future interaction.
 */
export default function TransitionMap({ className }: { className?: string }) {
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
  const RECENT_PAST_LABEL = "#3A3740";

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
      viewBox="0 0 1600 900"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BrainWise Transition Map"
    >
      {/* ---------- PURPOSE: background cloud ---------- */}
      <g data-group="Purpose">
        <path
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
          x="1360"
          y="150"
          fill={PURPOSE_LABEL}
          fontSize="46"
          fontWeight="700"
          fontFamily={FONT}
        >
          Purpose
        </text>
      </g>

      {/* ---------- FUTURE: right cloud ---------- */}
      <g data-group="Future">
        <path
          d="
            M 1150,340
            C 1120,280 1180,220 1250,240
            C 1280,190 1370,190 1400,250
            C 1470,220 1550,280 1530,350
            C 1590,380 1580,470 1520,490
            C 1550,560 1470,620 1400,600
            C 1370,660 1270,660 1240,600
            C 1170,630 1090,570 1120,500
            C 1060,470 1080,380 1150,340 Z
          "
          fill={FUTURE_FILL}
          stroke={FUTURE_STROKE}
          strokeWidth="3"
        />
        <text
          x="1340"
          y="280"
          fill={FUTURE_LABEL}
          fontSize="46"
          fontWeight="700"
          fontFamily={FONT}
          textAnchor="middle"
        >
          Ideal Future
        </text>
      </g>

      {/* ---------- RESOLVE: top channel ---------- */}
      <g data-group="Resolve">
        <path
          d="
            M 470,380
            L 470,240
            L 1330,240
            L 1330,330
            L 1370,330
            L 1310,380
            L 1250,330
            L 1290,330
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

      {/* ---------- SUPPORT: bottom channel ---------- */}
      <g data-group="Support">
        <path
          d="
            M 470,620
            L 470,760
            L 1330,760
            L 1330,660
            L 1370,660
            L 1310,610
            L 1250,660
            L 1290,660
            L 1290,720
            L 510,720
            L 510,620 Z
          "
          fill={CHANNEL_FILL}
          stroke={CHANNEL_STROKE}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <text
          x="780"
          y="748"
          fill={CHANNEL_LABEL}
          fontSize="34"
          fontWeight="700"
          fontFamily={FONT}
        >
          External support
        </text>
      </g>

      {/* ---------- PAST: spiral shell + inner circle ---------- */}
      <g data-group="Past">
        {/* outer disc with a wedge cut suggesting a spiral shell */}
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
        {/* inner circle */}
        <circle
          cx="300"
          cy="660"
          r="90"
          fill={PAST_INNER_FILL}
          stroke={PAST_STROKE}
          strokeWidth="3"
        />
        <text
          x="250"
          y="430"
          fill={PAST_LABEL}
          fontSize="40"
          fontWeight="700"
          fontFamily={FONT}
          textAnchor="middle"
        >
          Past
        </text>
        <text
          x="300"
          y="655"
          fill="#F5F3F7"
          fontSize="22"
          fontWeight="700"
          fontFamily={FONT}
          textAnchor="middle"
        >
          <tspan x="300" dy="0">Recent</tspan>
          <tspan x="300" dy="22">past</tspan>
        </text>
      </g>

      {/* ---------- PRESENT: rounded square ---------- */}
      <g data-group="Present">
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
      <g data-group="Pathway">
        {/* layered tail bars — flush with the arrow body's straight section */}
        <rect x="610" y="410" width="14" height="180" fill={PATHWAY_TAIL} />
        <rect x="632" y="410" width="14" height="180" fill={PATHWAY_TAIL} />
        {/* arrow body */}
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

      {/* ---------- LIFE'S TOOLS: small circle at arrow base ---------- */}
      <g data-group="Life's Tools">
        <circle
          cx="600"
          cy="500"
          r="50"
          fill={TOOLS_FILL}
          stroke={TOOLS_STROKE}
          strokeWidth="3"
        />
        <text
          x="600"
          y="495"
          fill={TOOLS_LABEL}
          fontSize="22"
          fontWeight="700"
          fontFamily={FONT}
          textAnchor="middle"
        >
          <tspan x="600" dy="0">Life's</tspan>
          <tspan x="600" dy="22">Tools</tspan>
        </text>
      </g>
    </svg>
  );
}
