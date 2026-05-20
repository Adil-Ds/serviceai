// map-canvas.jsx — Karachi-styled procedural map for the radar overlay
/* global React, T, Icon */

function MapCanvas({ w, h, style = "neon", animate = true }) {
  // Color palette
  const C = style === "neon"
    ? { land: "#070710", street: "#181834", streetLight: "#2A2A5E", main: "#3A3A7F", water: "#0A1A2A", waterEdge: "#1F3A56", park: "rgba(16,217,160,0.10)", parkStroke: "rgba(16,217,160,0.28)", building: "rgba(108,99,255,0.08)", buildingStroke: "rgba(108,99,255,0.15)", label: "#5A5A8E", labelMain: "#8B85FF", waterLabel: "#3A6F9E" }
    : { land: "#070710", street: "#151529", streetLight: "#1F1F45", main: "#28285A", water: "#0A1422", waterEdge: "#162938", park: "rgba(255,255,255,0.025)", parkStroke: "rgba(255,255,255,0.06)", building: "rgba(255,255,255,0.018)", buildingStroke: "rgba(255,255,255,0.04)", label: "#3F3F66", labelMain: "#6878A8", waterLabel: "#2D4F6E" };

  // Neighborhood polygons (relative coords 0..1)
  const hoods = [
    { name: "DHA PH 6",          color: T.info,    poly: "0.10,0.10 0.42,0.08 0.50,0.30 0.42,0.48 0.18,0.50 0.08,0.32", lx: 0.26, ly: 0.30 },
    { name: "BUKHARI COMM.",     color: T.violet,  poly: "0.42,0.08 0.78,0.07 0.85,0.20 0.78,0.32 0.50,0.30",             lx: 0.62, ly: 0.18 },
    { name: "ZAMZAMA",           color: T.warning, poly: "0.78,0.32 0.92,0.30 0.95,0.55 0.78,0.60 0.66,0.48",             lx: 0.83, ly: 0.45 },
    { name: "KHAYABAN-E-ITTEHAD",color: T.pink,    poly: "0.50,0.30 0.78,0.32 0.66,0.48 0.42,0.48",                       lx: 0.59, ly: 0.40 },
    { name: "SABA AVENUE",       color: T.success, poly: "0.05,0.50 0.42,0.48 0.50,0.62 0.30,0.74 0.08,0.74",             lx: 0.25, ly: 0.62 },
    { name: "TAUHEED COMM.",     color: T.primary, poly: "0.42,0.48 0.66,0.48 0.78,0.60 0.66,0.74 0.50,0.62",             lx: 0.58, ly: 0.61 },
  ];

  // Major boulevards (line strings, relative)
  const boulevards = [
    { name: "Khayaban-e-Shahbaz", pts: [[0.0, 0.20], [0.5, 0.30], [1.0, 0.30]], mid: 0.55 },
    { name: "Khayaban-e-Ittehad", pts: [[0.0, 0.55], [0.45, 0.50], [0.95, 0.58]], mid: 0.55 },
    { name: "Main Korangi Rd",    pts: [[0.5, 0.0], [0.55, 0.50], [0.7, 1.0]], mid: 0.5 },
    { name: "Sea View Rd",        pts: [[0.0, 0.83], [0.6, 0.86], [1.0, 0.82]], mid: 0.55 },
  ];

  // Water (coastline) polygon - bottom of map
  const coast = "0,0.78 0.12,0.80 0.28,0.83 0.45,0.86 0.62,0.85 0.78,0.87 1,0.84 1,1 0,1";

  // Parks
  const parks = [
    { name: "Bagh Ibne Qasim", x: 0.13, y: 0.16, w: 0.10, h: 0.08 },
    { name: "Hill Park",       x: 0.72, y: 0.13, w: 0.08, h: 0.06 },
    { name: "Beach Park",      x: 0.30, y: 0.74, w: 0.15, h: 0.05 },
  ];

  // Procedural building footprints (seeded random)
  const buildings = useMemo(() => {
    let s = 7;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const arr = [];
    for (let i = 0; i < 110; i++) {
      const x = r();
      const y = r() * 0.78; // keep above water
      // Avoid placing on water
      arr.push({
        x, y,
        w: 0.014 + r() * 0.04,
        h: 0.012 + r() * 0.032,
        rot: r() * 8 - 4,
      });
    }
    return arr;
  }, []);

  // Cross-streets (denser grid)
  const cross = useMemo(() => {
    const v = [];
    for (let i = 1; i < 18; i++) v.push(i / 18);
    return v;
  }, []);

  const pp = (s) => s.split(" ").map(p => p.split(",").map(parseFloat)).map(([x, y]) => `${x * w},${y * h}`).join(" ");
  const px = (x) => x * w, py = (y) => y * h;

  return (
    <svg width={w} height={h} style={{ position: "absolute", inset: 0, display: "block" }}>
      <defs>
        <radialGradient id="mapVig" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="rgba(0,0,0,0)" />
          <stop offset="78%" stopColor="rgba(7,7,16,0.35)" />
          <stop offset="100%" stopColor="rgba(7,7,16,0.92)" />
        </radialGradient>
        <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(7,7,16,0.92)" />
          <stop offset="100%" stopColor="rgba(7,7,16,0)" />
        </linearGradient>
        <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.waterEdge} />
          <stop offset="60%" stopColor={C.water} />
          <stop offset="100%" stopColor="#06101A" />
        </linearGradient>
        {animate && (
          <linearGradient id="waveStripe" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(56,189,248,0)" />
            <stop offset="50%" stopColor="rgba(56,189,248,0.18)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0)" />
          </linearGradient>
        )}
      </defs>

      {/* Base */}
      <rect width={w} height={h} fill={C.land} />

      {/* Neighborhood fills */}
      {hoods.map((nb, i) => (
        <polygon key={i} points={pp(nb.poly)}
          fill={`${nb.color}10`} stroke={`${nb.color}55`} strokeWidth="1" strokeDasharray="3 4" />
      ))}

      {/* Cross-street grid */}
      <g opacity="0.75">
        {cross.map((x, i) => (
          <line key={"v" + i} x1={px(x)} y1={0} x2={px(x)} y2={py(0.78)}
            stroke={C.street} strokeWidth={i % 3 === 0 ? 1.6 : 1} />
        ))}
        {cross.map((y, i) => (
          <line key={"h" + i} x1={0} y1={py(y * 0.78)} x2={w} y2={py(y * 0.78)}
            stroke={C.street} strokeWidth={i % 3 === 0 ? 1.6 : 1} />
        ))}
      </g>

      {/* Buildings */}
      {buildings.map((b, i) => (
        <rect key={i}
          x={px(b.x)} y={py(b.y)}
          width={px(b.w)} height={py(b.h)}
          rx={1.5}
          fill={C.building}
          stroke={C.buildingStroke}
          strokeWidth="0.5"
          transform={`rotate(${b.rot} ${px(b.x + b.w/2)} ${py(b.y + b.h/2)})`}
        />
      ))}

      {/* Parks */}
      {parks.map((p, i) => (
        <g key={i}>
          <rect x={px(p.x)} y={py(p.y)} width={px(p.w)} height={py(p.h)} rx={4}
            fill={C.park} stroke={C.parkStroke} strokeWidth="0.8" />
          <text x={px(p.x + p.w/2)} y={py(p.y + p.h/2) + 3}
            textAnchor="middle" fontSize="6" fill="rgba(16,217,160,0.55)" fontWeight="700" letterSpacing="0.4">
            {p.name.toUpperCase()}
          </text>
        </g>
      ))}

      {/* Boulevards */}
      {boulevards.map((b, i) => {
        const d = b.pts.map((p, j) => `${j === 0 ? "M" : "L"} ${px(p[0])} ${py(p[1])}`).join(" ");
        return (
          <g key={i}>
            <path d={d} stroke={C.main} strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d={d} stroke={C.streetLight} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d={d} stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" fill="none"
              strokeDasharray="6 8" strokeLinecap="round" />
          </g>
        );
      })}

      {/* Neighborhood labels */}
      {hoods.map((nb, i) => (
        <text key={i} x={px(nb.lx)} y={py(nb.ly)}
          textAnchor="middle" fontSize="7.5" fontWeight="800" letterSpacing="1.4"
          fill={nb.color} opacity="0.7">
          {nb.name}
        </text>
      ))}

      {/* Street name (one prominent boulevard) */}
      <text x={px(0.55)} y={py(0.27)} fontSize="6.5" fontWeight="700" letterSpacing="0.6"
            fill={C.labelMain} opacity="0.85" textAnchor="middle">
        KHAYABAN-E-SHAHBAZ
      </text>
      <text x={px(0.55)} y={py(0.52)} fontSize="6.5" fontWeight="700" letterSpacing="0.6"
            fill={C.labelMain} opacity="0.7" textAnchor="middle">
        KHAYABAN-E-ITTEHAD
      </text>

      {/* Coastline / water */}
      <polygon points={pp(coast)} fill="url(#waterGrad)" />
      <polyline points={pp("0,0.78 0.12,0.80 0.28,0.83 0.45,0.86 0.62,0.85 0.78,0.87 1,0.84")}
        stroke={C.waterEdge} strokeWidth="1.2" fill="none" opacity="0.7" />

      {/* Animated wave shimmer on water */}
      {animate && (
        <rect x="0" y={py(0.88)} width={w} height="2" fill="url(#waveStripe)">
          <animate attributeName="x" from={-w} to={w} dur="6s" repeatCount="indefinite" />
        </rect>
      )}

      {/* Water label */}
      <text x={px(0.5)} y={py(0.93)} textAnchor="middle"
        fontSize="9" fontWeight="700" letterSpacing="3.5" fill={C.waterLabel} opacity="0.9">
        ARABIAN  SEA
      </text>

      {/* Vignette */}
      <rect width={w} height={h} fill="url(#mapVig)" />
      <rect width={w} height={84} fill="url(#topFade)" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Radar overlay — concentric pulses + sweep cone + crosshair
// ─────────────────────────────────────────────────────────────
function RadarOverlay({ cx, cy, maxR, color, ringSpeed = 2.6, sweep = true, active = true }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {active && [0, 1, 2, 3].map(i => (
        <div key={i} style={{
          position: "absolute", left: cx, top: cy,
          width: 0, height: 0, borderRadius: "50%",
          border: `2px solid ${color}`,
          boxShadow: `0 0 16px ${color}66, inset 0 0 16px ${color}22`,
          transform: "translate(-50%, -50%)",
          animation: `radarPulse ${ringSpeed}s cubic-bezier(0.16, 0.84, 0.44, 1) infinite`,
          animationDelay: `${(i * ringSpeed) / 4}s`,
          ["--radar-max"]: `${maxR * 2}px`,
        }} />
      ))}

      {/* Static reference rings */}
      {active && [0.35, 0.7, 1].map((s, i) => (
        <div key={"r" + i} style={{
          position: "absolute", left: cx, top: cy,
          width: maxR * 2 * s, height: maxR * 2 * s,
          borderRadius: "50%",
          border: `1px dashed ${color}26`,
          transform: "translate(-50%, -50%)",
        }} />
      ))}

      {/* Crosshair */}
      {active && (
        <div style={{ position: "absolute", left: cx, top: cy, transform: "translate(-50%,-50%)", width: maxR * 2, height: maxR * 2 }}>
          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: `linear-gradient(180deg, transparent, ${color}22 50%, transparent)` }} />
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}22 50%, transparent)` }} />
        </div>
      )}

      {/* Sweep cone */}
      {active && sweep && (
        <div style={{
          position: "absolute", left: cx, top: cy,
          width: maxR * 2, height: maxR * 2,
          transform: "translate(-50%, -50%)",
          animation: "radarSweep 3.2s linear infinite",
          mixBlendMode: "screen",
        }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: `conic-gradient(from 0deg,
              ${color}00 0deg, ${color}00 280deg,
              ${color}22 320deg, ${color}88 355deg,
              ${color}ee 360deg, ${color}00 360deg)`,
            maskImage: "radial-gradient(circle, transparent 0%, black 18%, black 78%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 0%, black 18%, black 78%, transparent 100%)",
            opacity: 0.9,
          }} />
        </div>
      )}
    </div>
  );
}

Object.assign(window, { MapCanvas, RadarOverlay });
