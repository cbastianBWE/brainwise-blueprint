/**
 * Decorative terrain layers, ported verbatim from the design artifact
 * (terrain_desktop.svg / terrain_phone.svg).
 *
 * These carry no state. Nothing in here may ever encode progress, and the
 * opacities are deliberately low so the road stays the loudest thing on
 * screen. The cloud/dot animations run on omDrift / omDot, which sit under
 * the blanket prefers-reduced-motion rule in JourneyMap.
 */

export function TerrainDesktop() {
  return (
    <g aria-hidden>
      <ellipse cx="180" cy="500" rx="300" ry="170" fill="#006D77" fillOpacity="0.04" />
      <ellipse cx="920" cy="80" rx="300" ry="150" fill="#F5741A" fillOpacity="0.04" />

      <g stroke="#F5741A" strokeOpacity="0.34" strokeWidth="1.6" fill="none">
        <circle cx="74" cy="72" r="26" />
        <path d="M74 34v-11M74 121v-11M36 72h-11M123 72h-11M47 45l-8-8M101 99l8 8M101 45l8-8M47 99l-8 8" />
      </g>

      <path d="M736 470 L868 296 L960 400 L1064 284 L1210 470Z" fill="#021F36" fillOpacity="0.08" />
      <path d="M868 296 L896 336 L840 336Z" fill="#FDFCF8" fillOpacity="0.92" />
      <path d="M1064 284 L1092 326 L1036 326Z" fill="#FDFCF8" fillOpacity="0.92" />
      <path d="M640 470 L742 358 L826 470Z" fill="#006D77" fillOpacity="0.11" />
      <path d="M28 470 L142 318 L232 414 L300 350 L392 470Z" fill="#021F36" fillOpacity="0.07" />
      <path d="M142 318 L168 356 L116 356Z" fill="#FDFCF8" fillOpacity="0.92" />

      <path
        d="M0 512 C170 476 330 498 500 522 C670 546 830 500 1010 510 C1120 516 1190 530 1240 538 L1240 580 L0 580Z"
        fill="#2D6A4F"
        fillOpacity="0.09"
      />
      <path
        d="M0 548 C200 524 360 552 560 558 C760 564 940 540 1240 556 L1240 580 L0 580Z"
        fill="#2D6A4F"
        fillOpacity="0.07"
      />

      <g fill="#FFFFFF" fillOpacity="0.85" style={{ animation: "omDrift 26s ease-in-out infinite" }}>
        <circle cx="404" cy="76" r="15" />
        <circle cx="426" cy="66" r="21" />
        <circle cx="450" cy="77" r="13" />
        <rect x="390" y="78" width="74" height="13" rx="6.5" />
      </g>
      <g
        fill="#FFFFFF"
        fillOpacity="0.8"
        style={{ animation: "omDrift 30s ease-in-out infinite", animationDelay: "-10s" }}
      >
        <circle cx="676" cy="60" r="12" />
        <circle cx="695" cy="52" r="17" />
        <circle cx="715" cy="61" r="11" />
        <rect x="664" y="62" width="62" height="11" rx="5.5" />
      </g>
      <g
        fill="#FFFFFF"
        fillOpacity="0.78"
        style={{ animation: "omDrift 34s ease-in-out infinite", animationDelay: "-18s" }}
      >
        <circle cx="962" cy="112" r="11" />
        <circle cx="980" cy="104" r="15" />
        <circle cx="998" cy="113" r="10" />
        <rect x="951" y="114" width="57" height="10" rx="5" />
      </g>

      <g fill="#2D6A4F" fillOpacity="0.2">
        <path d="M318 448 L328 472 L308 472Z" />
        <path d="M338 456 L346 474 L330 474Z" />
        <path d="M300 460 L307 474 L293 474Z" />
        <path d="M600 462 L610 486 L590 486Z" />
        <path d="M620 470 L628 488 L612 488Z" />
        <path d="M944 500 L954 524 L934 524Z" />
        <path d="M964 508 L972 526 L956 526Z" />
        <path d="M926 510 L933 526 L919 526Z" />
      </g>

      <ellipse cx="252" cy="534" rx="116" ry="30" fill="#006D77" fillOpacity="0.12" />
      <g stroke="#006D77" strokeOpacity="0.22" strokeWidth="1.4" strokeLinecap="round">
        <path d="M204 528h52" />
        <path d="M232 544h50" />
      </g>

      <g stroke="#021F36" strokeOpacity="0.05" fill="none">
        <ellipse cx="330" cy="470" rx="210" ry="110" />
        <ellipse cx="330" cy="470" rx="150" ry="76" />
        <ellipse cx="1010" cy="90" rx="220" ry="110" />
        <ellipse cx="1010" cy="90" rx="152" ry="74" />
      </g>

      <g>
        <circle
          cx="66"
          cy="520"
          r="22"
          stroke="#8E8995"
          strokeOpacity="0.4"
          strokeWidth="1.2"
          fill="none"
        />
        <path d="M66 502 L72 520 L66 516 L60 520Z" fill="#F5741A" fillOpacity="0.6" />
        <path d="M66 538 L72 520 L66 524 L60 520Z" fill="#021F36" fillOpacity="0.22" />
        <text
          x="66"
          y="494"
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="8"
          fontWeight="600"
          letterSpacing="1"
          fill="#8E8995"
        >
          N
        </text>
      </g>

      <g fill="#F5741A" fillOpacity="0.16">
        <circle
          cx="1104"
          cy="516"
          r="14"
          style={{ animation: "omDot 3400ms ease-in-out infinite", animationDelay: "0ms" }}
        />
        <circle
          cx="1141"
          cy="533"
          r="12"
          style={{ animation: "omDot 3400ms ease-in-out infinite", animationDelay: "120ms" }}
        />
        <circle
          cx="1180"
          cy="542"
          r="10"
          style={{ animation: "omDot 3400ms ease-in-out infinite", animationDelay: "240ms" }}
        />
        <circle
          cx="1216"
          cy="545"
          r="8"
          style={{ animation: "omDot 3400ms ease-in-out infinite", animationDelay: "360ms" }}
        />
      </g>
    </g>
  );
}

export function TerrainPhone() {
  return (
    <g aria-hidden>
      <ellipse cx="20" cy="250" rx="150" ry="120" fill="#006D77" fillOpacity="0.04" />
      <ellipse cx="370" cy="620" rx="130" ry="150" fill="#3C096C" fillOpacity="0.035" />
      <ellipse cx="40" cy="990" rx="140" ry="130" fill="#2D6A4F" fillOpacity="0.04" />

      <g stroke="#F5741A" strokeOpacity="0.34" strokeWidth="1.5" fill="none">
        <circle cx="62" cy="152" r="20" />
        <path d="M62 122v-9M62 191v-9M32 152h-9M101 152h-9M41 131l-6-6M89 173l6 6M89 131l6-6M41 173l-6 6" />
      </g>

      <path d="M232 300 L296 214 L338 262 L378 206 L390 300Z" fill="#021F36" fillOpacity="0.07" />
      <path d="M296 214 L312 238 L280 238Z" fill="#FDFCF8" fillOpacity="0.9" />
      <path d="M378 206 L392 230 L364 230Z" fill="#FDFCF8" fillOpacity="0.9" />
      <path d="M196 300 L246 244 L288 300Z" fill="#006D77" fillOpacity="0.10" />

      <path d="M0 852 L58 764 L98 812 L146 736 L196 852Z" fill="#021F36" fillOpacity="0.07" />
      <path d="M146 736 L161 760 L131 760Z" fill="#FDFCF8" fillOpacity="0.9" />
      <path d="M58 764 L72 786 L44 786Z" fill="#FDFCF8" fillOpacity="0.9" />

      <path d="M262 1330 L318 1244 L356 1288 L390 1240 L390 1330Z" fill="#021F36" fillOpacity="0.06" />
      <path d="M318 1244 L332 1268 L304 1268Z" fill="#FDFCF8" fillOpacity="0.9" />

      <g fill="#FFFFFF" fillOpacity="0.82" style={{ animation: "omDrift 22s ease-in-out infinite" }}>
        <circle cx="86" cy="478" r="13" />
        <circle cx="105" cy="470" r="18" />
        <circle cx="126" cy="479" r="11" />
        <rect x="72" y="480" width="66" height="12" rx="6" />
      </g>
      <g
        fill="#FFFFFF"
        fillOpacity="0.78"
        style={{ animation: "omDrift 26s ease-in-out infinite", animationDelay: "-8s" }}
      >
        <circle cx="292" cy="672" r="11" />
        <circle cx="309" cy="665" r="15" />
        <circle cx="327" cy="673" r="9" />
        <rect x="280" y="674" width="56" height="10" rx="5" />
      </g>
      <g
        fill="#FFFFFF"
        fillOpacity="0.8"
        style={{ animation: "omDrift 24s ease-in-out infinite", animationDelay: "-14s" }}
      >
        <circle cx="60" cy="1012" r="11" />
        <circle cx="78" cy="1004" r="16" />
        <circle cx="97" cy="1013" r="10" />
        <rect x="48" y="1014" width="60" height="11" rx="5.5" />
      </g>

      <g fill="#2D6A4F" fillOpacity="0.22">
        <path d="M336 592 L346 616 L326 616Z" />
        <path d="M356 600 L364 618 L348 618Z" />
        <path d="M320 606 L327 620 L313 620Z" />
        <path d="M42 908 L52 932 L32 932Z" />
        <path d="M62 916 L70 934 L54 934Z" />
        <path d="M300 1128 L309 1150 L291 1150Z" />
        <path d="M320 1136 L327 1152 L313 1152Z" />
      </g>

      <ellipse cx="308" cy="1000" rx="72" ry="22" fill="#006D77" fillOpacity="0.12" />
      <g stroke="#006D77" strokeOpacity="0.22" strokeWidth="1.3" strokeLinecap="round">
        <path d="M280 995h34" />
        <path d="M296 1007h30" />
      </g>

      <g stroke="#021F36" strokeOpacity="0.055" fill="none">
        <ellipse cx="330" cy="180" rx="120" ry="80" />
        <ellipse cx="330" cy="180" rx="86" ry="56" />
        <ellipse cx="40" cy="560" rx="120" ry="86" />
        <ellipse cx="40" cy="560" rx="84" ry="58" />
      </g>

      <g fill="#F5741A" fillOpacity="0.18">
        <circle
          cx="132"
          cy="1178"
          r="12"
          style={{ animation: "omDot 3400ms ease-in-out infinite", animationDelay: "0ms" }}
        />
        <circle
          cx="106"
          cy="1210"
          r="10.5"
          style={{ animation: "omDot 3400ms ease-in-out infinite", animationDelay: "120ms" }}
        />
        <circle
          cx="76"
          cy="1233"
          r="9"
          style={{ animation: "omDot 3400ms ease-in-out infinite", animationDelay: "240ms" }}
        />
        <circle
          cx="42"
          cy="1246"
          r="7.5"
          style={{ animation: "omDot 3400ms ease-in-out infinite", animationDelay: "360ms" }}
        />
        <circle
          cx="8"
          cy="1251"
          r="6"
          style={{ animation: "omDot 3400ms ease-in-out infinite", animationDelay: "480ms" }}
        />
      </g>
    </g>
  );
}
