/**
 * TransitionMap
 * Responsive SVG recreation of the "My BrainWise Transition Map".
 * Eight labeled regions, each a <g data-group="..."> for future interaction.
 */
export default function TransitionMap({ className }: { className?: string }) {
  // Palette approximates the reference image
  const PURPOSE = "#F5A96A";        // soft orange background cloud
  const PURPOSE_STROKE = "#E9995A";
  const FUTURE = "#C7ECBF";         // soft green cloud
  const FUTURE_STROKE = "#5FB56A";
  const PRESENT = "#1A9BC7";        // teal blue square
  const PAST = "#3B4A61";           // dark slate spiral
  const PAST_INNER = "#0F1622";     // near-black inner circle
  const TOOLS = "#E9995A";          // small orange circle at arrow base
  const PATHWAY_FILL = "#FFFFFF";
  const PATHWAY_STROKE = "#F07A2E"; // vivid orange stroke on arrow
  const CHANNEL_FILL = "#FFFFFF";
  const CHANNEL_STROKE = "#3B4A61";
  const TEXT_DARK = "#1F2937";
  const TEXT_ORANGE = "#F07A2E";
  const TEXT_GREEN = "#3E9B4F";
  const TEXT_TEAL = "#1A9BC7";

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
          fill={PURPOSE}
          stroke={PURPOSE_STROKE}
          strokeWidth="2"
        />
        <text
          x="1280"
          y="200"
          fill={TEXT_TEAL}
          fontSize="34"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
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
          fill={FUTURE}
          stroke={FUTURE_STROKE}
          strokeWidth="3"
        />
        <text
          x="1260"
          y="360"
          fill={TEXT_GREEN}
          fontSize="30"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
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
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <text
          x="820"
          y="270"
          fill={TEXT_DARK}
          fontSize="24"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
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
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <text
          x="780"
          y="748"
          fill={TEXT_DARK}
          fontSize="24"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
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
          fill={PAST}
          fillRule="evenodd"
        />
        {/* inner circle */}
        <circle cx="300" cy="660" r="90" fill={PAST_INNER} />
        <text
          x="140"
          y="500"
          fill="#FFFFFF"
          fontSize="22"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          Past
        </text>
        <text
          x="230"
          y="668"
          fill="#FFFFFF"
          fontSize="18"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          Recent past
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
          fill={PRESENT}
        />
        <text
          x="330"
          y="340"
          fill="#FFFFFF"
          fontSize="26"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          Present state
        </text>
      </g>

      {/* ---------- PATHWAY: block arrow with layered tail ---------- */}
      <g data-group="Pathway">
        {/* layered tail bars */}
        <rect x="610" y="380" width="14" height="240" fill={PATHWAY_STROKE} />
        <rect x="632" y="380" width="14" height="240" fill={PATHWAY_STROKE} />
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
          x="720"
          y="510"
          fill={TEXT_ORANGE}
          fontSize="28"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          Pathway to get there
        </text>
      </g>

      {/* ---------- LIFE'S TOOLS: small circle at arrow base ---------- */}
      <g data-group="Life's Tools">
        <circle cx="600" cy="500" r="26" fill={TOOLS} stroke="#FFFFFF" strokeWidth="3" />
        <text
          x="470"
          y="470"
          fill={TEXT_DARK}
          fontSize="14"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          Life's Tools
        </text>
      </g>
    </svg>
  );
}
