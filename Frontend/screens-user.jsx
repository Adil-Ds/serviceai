// screens-user.jsx — UserDashboard, LiveSearchScreen, BookingHistory, Profile, settings
/* global React, T, Icon, GlassCard, PressButton, Pill, StatusBadge, LiveDot, Avatar, SectionTitle, TopBar, MapCanvas, RadarOverlay, PHONE, SERVICES, BOOKINGS */
const { useState: useStateU, useEffect: useEffectU, useRef: useRefU, useMemo: useMemoU } = React;

// ═══════════════════════════════════════════════════════════════
// USER DASHBOARD — Bento stats + categories + quick queries
// ═══════════════════════════════════════════════════════════════
function UserDashboard({ onSearch, onCategory, onOpenLive }) {
  const [count, setCount] = useStateU(0);
  useEffectU(() => {
    let n = 0;
    const id = setInterval(() => { n += 1; setCount(n); if (n >= 47) clearInterval(id); }, 25);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ height: "100%", overflow: "auto", background: T.bg, position: "relative" }}>
      {/* Ambient bg */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(circle at 0% 0%, rgba(108,99,255,0.18), transparent 50%), radial-gradient(circle at 100% 50%, rgba(16,217,160,0.10), transparent 50%)",
        pointerEvents: "none",
      }} />
      <div style={{ height: PHONE.statusH, position: "relative" }} />

      {/* Header */}
      <div style={{ padding: "8px 20px 0", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name="Asad Khan" size={42} color={T.primary} color2={T.violet} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: T.textSecondary }}>Good afternoon</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text, letterSpacing: -0.3 }}>Asad Khan</div>
          </div>
          <button style={iconButton}><Icon name="bell" size={16} color={T.text} /></button>
          <button style={iconButton}><Icon name="settings" size={16} color={T.text} /></button>
        </div>

        {/* Search hero */}
        <button onClick={onSearch} style={{
          width: "100%", marginTop: 16, padding: 2, border: "none", borderRadius: 18, cursor: "pointer",
          background: `linear-gradient(135deg, ${T.primary}, ${T.violet}, ${T.pink})`,
          backgroundSize: "200% 200%",
          animation: "gradientShift 5s ease infinite",
          boxShadow: `0 18px 36px ${T.primary}44`,
        }}>
          <div style={{
            background: T.card, borderRadius: 16, padding: "14px 14px",
            display: "flex", alignItems: "center", gap: 10, textAlign: "left",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${T.primary}, ${T.violet})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 6px 14px ${T.primary}55`,
            }}>
              <Icon name="sparkles" size={18} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Tell AI what you need</div>
              <div style={{ fontSize: 10.5, color: T.textSecondary, marginTop: 2 }}>5 agents · Urdu/English · 60s</div>
            </div>
            <Icon name="mic" size={16} color={T.textSecondary} />
            <Icon name="arrow" size={16} color={T.textSecondary} />
          </div>
        </button>

        {/* Bento stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gridTemplateRows: "auto auto", gap: 8, marginTop: 14 }}>
          {/* Big — services found */}
          <div style={{
            gridRow: "span 2",
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 16, padding: 14,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: 40,
              background: `radial-gradient(circle, ${T.success}55, transparent 70%)`,
              filter: "blur(6px)",
            }} />
            <Pill color={T.success} icon="trend" size="sm">+12 TODAY</Pill>
            <div style={{ fontSize: 32, fontWeight: 900, color: T.text, marginTop: 8, fontVariantNumeric: "tabular-nums", letterSpacing: -1 }}>
              {count}
            </div>
            <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 2 }}>Providers near you</div>
            {/* Sparkline */}
            <svg width="100%" height="40" viewBox="0 0 120 40" style={{ marginTop: 8 }}>
              <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.success} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={T.success} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 30 Q15 25, 25 22 T50 18 T75 15 T100 8 T120 12 L120 40 L0 40 Z" fill="url(#sparkFill)" />
              <path d="M0 30 Q15 25, 25 22 T50 18 T75 15 T100 8 T120 12" fill="none" stroke={T.success} strokeWidth="2" strokeLinecap="round" />
              {[[0,30],[25,22],[50,18],[75,15],[100,8],[120,12]].map(([x,y],i) => (
                <circle key={i} cx={x} cy={y} r="2.5" fill={T.success} />
              ))}
            </svg>
          </div>

          <BentoStat label="Bookings"  value="3" color={T.primary} icon="ticket" />
          <BentoStat label="Saved" value="₨12.4K" color={T.warning} icon="cash" />
        </div>

        {/* Live map preview button */}
        <button onClick={onOpenLive} style={{
          width: "100%", marginTop: 8, borderRadius: 16, border: `1px solid ${T.border}`,
          background: T.card, padding: 0, cursor: "pointer", overflow: "hidden", position: "relative", height: 96,
        }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <MapCanvas w={350} h={96} style="neon" animate={false} />
          </div>
          <div style={{
            position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(7,7,16,0.85) 0%, rgba(7,7,16,0.3) 100%)",
          }} />
          <div style={{ position: "absolute", inset: 0, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `${T.success}22`, border: `1px solid ${T.success}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 24px ${T.success}55`,
            }}><Icon name="wifi" size={18} color={T.success} /></div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <LiveDot color={T.success} />
                <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>Live Search Radar</span>
              </div>
              <div style={{ fontSize: 10.5, color: T.textSecondary, marginTop: 2 }}>See providers on a real-time map</div>
            </div>
            <Icon name="chevR" size={16} color={T.textSecondary} />
          </div>
        </button>
      </div>

      <SectionTitleLocal title="Categories" />
      <div style={{ display: "flex", overflowX: "auto", gap: 8, padding: "0 20px 4px", scrollbarWidth: "none" }}>
        {SERVICES.map(s => (
          <button key={s.key} onClick={() => onCategory(s)} style={{
            flexShrink: 0,
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: "10px 12px",
            display: "flex", alignItems: "center", gap: 7, cursor: "pointer",
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 7,
              background: `${s.color}22`, border: `1px solid ${s.color}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><Icon name={s.icon} size={13} color={s.color} /></div>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{s.label}</span>
          </button>
        ))}
      </div>

      <SectionTitleLocal title="Demo queries" />
      <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { text: "My AC is making a weird noise, please send someone today",   icon: "snow", color: T.info },
          { text: "Need a doctor for my mother, she has fever",                 icon: "medkit", color: T.danger },
          { text: "Math tutor for class 9, near Saba Avenue",                   icon: "book", color: T.success },
        ].map((q, i) => (
          <button key={i} onClick={onSearch} style={{
            display: "flex", gap: 10, padding: 12, borderRadius: 14,
            background: T.card, border: `1px solid ${T.border}`,
            cursor: "pointer", textAlign: "left",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: `${q.color}22`, border: `1px solid ${q.color}44`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}><Icon name={q.icon} size={14} color={q.color} /></div>
            <span style={{ fontSize: 12, color: T.textSecondary, flex: 1, lineHeight: 1.5 }}>"{q.text}"</span>
            <Icon name="chevR" size={14} color={T.textMuted} />
          </button>
        ))}
      </div>
    </div>
  );
}

const iconButton = {
  width: 36, height: 36, borderRadius: 12,
  background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
};

function BentoStat({ label, value, color, icon }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 16, padding: 12, position: "relative", overflow: "hidden",
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8,
        background: `${color}22`, border: `1px solid ${color}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}><Icon name={icon} size={13} color={color} /></div>
      <div style={{ fontSize: 18, fontWeight: 900, color: T.text, marginTop: 8, fontVariantNumeric: "tabular-nums", letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontSize: 10, color: T.textSecondary, marginTop: 1 }}>{label}</div>
    </div>
  );
}

function SectionTitleLocal({ title }) {
  return <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, letterSpacing: 1.4, padding: "20px 20px 10px" }}>{title}</div>;
}

// ═══════════════════════════════════════════════════════════════
// LIVE SEARCH RADAR — On the real-feeling map
// ═══════════════════════════════════════════════════════════════
const MAP_SHOPS = [
  { name: "Ali Plumbing Works",       address: "DHA Phase 6",     phone: "+92 300 1234567", rating: 4.8, reviews: 142, x: 0.32,  y: -0.20, dist: 0.7 },
  { name: "QuickFix Pipes & Drains",  address: "Bukhari Comm.",   phone: "+92 321 7654321", rating: 4.6, reviews: 98,  x: -0.40, y: 0.10,  dist: 1.1 },
  { name: "Karachi Pipe Masters",     address: "Tauheed Comm.",   phone: "+92 333 9991122", rating: 4.7, reviews: 211, x: 0.18,  y: 0.30,  dist: 1.4 },
  { name: "Hassan Sanitary",          address: "Saba Avenue",     phone: "+92 345 4567890", rating: 4.4, reviews: 67,  x: -0.55, y: -0.30, dist: 1.9 },
  { name: "24/7 Emergency Plumber",   address: "Zamzama Blvd",    phone: "+92 311 8881234", rating: 4.9, reviews: 304, x: 0.52,  y: 0.15,  dist: 2.2 },
  { name: "Rahim Pipe & Tile",        address: "Badar Comm.",     phone: "+92 300 2223344", rating: 4.3, reviews: 51,  x: -0.18, y: 0.45,  dist: 2.6 },
  { name: "Pro Drain Solutions",      address: "Khy-e-Ittehad",   phone: "+92 322 5556677", rating: 4.5, reviews: 128, x: 0.65,  y: -0.40, dist: 3.1 },
];

function LiveSearchScreen({ onBack, onPick, autoStart = true }) {
  const [phase, setPhase] = useStateU(autoStart ? "scanning" : "idle"); // idle | scanning | results
  const [found, setFound] = useStateU(0);
  const [sheetOpen, setSheetOpen] = useStateU(false);
  const [activePin, setActivePin] = useStateU(null);
  const [beams, setBeams] = useStateU([]);
  const timersRef = useRefU([]);
  const prevFoundRef = useRefU(0);

  const W = PHONE.w, H = PHONE.h - PHONE.statusH - PHONE.tabH;
  const cx = W / 2, cy = H / 2 - 50;
  const maxR = Math.min(W, H) * 0.48;
  const radius = Math.min(W, H) * 0.40;

  const pins = MAP_SHOPS.map(s => ({ ...s, px: cx + s.x * radius, py: cy + s.y * radius }));

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };

  const start = () => {
    clearTimers();
    setPhase("scanning"); setFound(0); setSheetOpen(false); setActivePin(null);
    const pace = 520;
    for (let i = 1; i <= MAP_SHOPS.length; i++) {
      timersRef.current.push(setTimeout(() => {
        setFound(i);
        if (i === 3) setSheetOpen(true);
        if (i === MAP_SHOPS.length) setPhase("results");
      }, i * pace));
    }
  };

  useEffectU(() => { if (autoStart) start(); return () => clearTimers(); }, []);

  // Beams
  useEffectU(() => {
    if (found > prevFoundRef.current) {
      const pin = pins[found - 1];
      if (pin) {
        const id = Math.random();
        setBeams(b => [...b, { id, x: pin.px, y: pin.py }]);
        setTimeout(() => setBeams(b => b.filter(x => x.id !== id)), 800);
      }
    }
    prevFoundRef.current = found;
  }, [found]);

  return (
    <div style={{ height: "100%", background: T.bg, position: "relative", overflow: "hidden" }}>
      {/* Map */}
      <div style={{ position: "absolute", top: PHONE.statusH, left: 0, right: 0, bottom: 0 }}>
        <MapCanvas w={W} h={H} style="neon" animate />

        <RadarOverlay cx={cx} cy={cy} maxR={maxR} color={T.success} active />

        {/* Discovery beams */}
        {beams.map(b => {
          const dx = b.x - cx, dy = b.y - cy;
          const len = Math.sqrt(dx*dx + dy*dy);
          const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <div key={b.id} style={{
              position: "absolute", left: cx, top: cy,
              width: len, height: 2,
              transformOrigin: "0 50%",
              transform: `rotate(${ang}deg)`,
              background: `linear-gradient(90deg, ${T.success}00 0%, ${T.success}cc 60%, ${T.success} 100%)`,
              animation: "beamFade 800ms ease-out forwards",
              filter: `drop-shadow(0 0 6px ${T.success})`,
              pointerEvents: "none",
            }} />
          );
        })}

        {/* User pin */}
        <UserPin x={cx} y={cy} />

        {/* Shop pins */}
        {pins.slice(0, found).map((s, i) => (
          <ShopPin key={i} x={s.px} y={s.py} index={i} label={s.name} dist={s.dist}
            active={activePin === i}
            onClick={() => { setActivePin(i); setSheetOpen(true); }} />
        ))}

        {/* Map controls */}
        <div style={{ position: "absolute", top: 64, right: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <button className="mapBtn" style={mapBtnStyle}><Icon name="nav" size={14} color={T.text} /></button>
          <button className="mapBtn" style={mapBtnStyle}><Icon name="layers" size={14} color={T.text} /></button>
          <button className="mapBtn" style={mapBtnStyle}><Icon name="plus" size={14} color={T.text} /></button>
          <button className="mapBtn" style={mapBtnStyle}><Icon name="minus" size={14} color={T.text} /></button>
        </div>

        {/* Compass */}
        <div style={{
          position: "absolute", top: 64, left: 12,
          width: 40, height: 40, borderRadius: 20,
          background: "rgba(13,13,28,0.85)", backdropFilter: "blur(10px)",
          border: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ position: "relative", width: 28, height: 28 }}>
            <div style={{ position: "absolute", left: 13, top: 1, width: 2, height: 12, background: T.danger, borderRadius: 1 }} />
            <div style={{ position: "absolute", left: 13, bottom: 1, width: 2, height: 12, background: T.text, borderRadius: 1, opacity: 0.5 }} />
            <div style={{ position: "absolute", left: "50%", top: "50%", width: 4, height: 4, borderRadius: 2, background: T.text, transform: "translate(-50%,-50%)" }} />
            <div style={{ position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)", fontSize: 7, color: T.danger, fontWeight: 900 }}>N</div>
          </div>
        </div>

        {/* Scale */}
        <div style={{
          position: "absolute", bottom: 12, left: 12,
          background: "rgba(13,13,28,0.7)", border: `1px solid ${T.border}`,
          borderRadius: 6, padding: "3px 6px",
          fontSize: 9, color: T.textSecondary, fontWeight: 700, letterSpacing: 0.4,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <div style={{ width: 30, height: 2, background: T.textSecondary }} />
          500 m
        </div>
      </div>

      {/* Header */}
      <div style={{ position: "absolute", top: PHONE.statusH, left: 0, right: 0, padding: "10px 16px", zIndex: 30 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(13,13,28,0.85)", backdropFilter: "blur(14px)",
          border: `1px solid ${T.border}`, borderRadius: 14, padding: "8px 10px",
          boxShadow: "0 12px 28px rgba(0,0,0,0.55)",
        }}>
          <button onClick={onBack} style={iconButtonSmall}>
            <Icon name="back" size={14} color={T.text} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: T.text }}>Plumbers · DHA Phase 6</div>
            <div style={{ fontSize: 9.5, color: T.textSecondary, marginTop: 1, display: "flex", alignItems: "center", gap: 5 }}>
              {phase === "scanning"
                ? <><LiveDot color={T.success} size={6} /> Scanning · {found} found</>
                : <><Icon name="check" size={10} color={T.success} /> {found} live providers near you</>}
            </div>
          </div>
          <button onClick={start} style={{
            height: 30, padding: "0 10px", borderRadius: 9,
            background: T.primaryGlow, border: `1px solid ${T.primary}66`,
            color: T.primaryLight, fontSize: 10, fontWeight: 700, cursor: "pointer",
          }}>Re-scan</button>
        </div>
      </div>

      {/* Bottom sheet */}
      <ShopBottomSheet
        open={sheetOpen} found={found} pins={pins}
        onClose={() => setSheetOpen(false)}
        active={activePin} setActive={setActivePin}
        onPick={onPick}
      />

      {/* Floating view-results pill */}
      {!sheetOpen && found > 0 && (
        <button onClick={() => setSheetOpen(true)} style={{
          position: "absolute", left: "50%", bottom: 20, transform: "translateX(-50%)",
          background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
          color: "#fff", border: "none", borderRadius: 999, padding: "10px 18px",
          fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 8,
          boxShadow: `0 14px 32px ${T.primary}55`, cursor: "pointer", zIndex: 35,
          animation: "fadeUpIn 320ms cubic-bezier(.22,1,.36,1)",
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: T.danger, boxShadow: `0 0 10px ${T.danger}` }} />
          View {found} results
        </button>
      )}
    </div>
  );
}

const mapBtnStyle = {
  width: 32, height: 32, borderRadius: 10,
  background: "rgba(13,13,28,0.85)", backdropFilter: "blur(10px)",
  border: `1px solid ${T.border}`, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  boxShadow: "0 6px 16px rgba(0,0,0,0.5)",
};
const iconButtonSmall = {
  width: 30, height: 30, borderRadius: 9,
  background: T.surface, border: `1px solid ${T.border}`, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

function UserPin({ x, y }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", zIndex: 6 }}>
      <div style={{ position: "absolute", inset: -22, borderRadius: "50%",
        background: `radial-gradient(circle, ${T.primary}55 0%, ${T.primary}00 65%)`,
        animation: "userHalo 1.6s ease-in-out infinite" }} />
      <div style={{ width: 28, height: 28, borderRadius: 14,
        border: `3px solid ${T.primary}`, background: "rgba(7,7,16,0.5)",
        boxShadow: `0 0 0 4px rgba(7,7,16,0.9), 0 0 22px ${T.primary}99` }} />
      <div style={{ position: "absolute", top: 8, left: 8, width: 12, height: 12,
        borderRadius: 6, background: T.primary, boxShadow: `0 0 12px ${T.primary}` }} />
    </div>
  );
}

function ShopPin({ x, y, index, label, dist, active, onClick }) {
  return (
    <button onClick={onClick} className="shopPinBtn" style={{
      position: "absolute", left: x, top: y,
      transform: "translate(-50%, -100%)",
      zIndex: 10 + index,
      animation: "pinDrop 540ms cubic-bezier(.34,1.56,.64,1) both",
      background: "transparent", border: "none", padding: 0, cursor: "pointer",
    }}>
      <div style={{ position: "absolute", left: "50%", bottom: -4, width: 18, height: 5,
        transform: "translateX(-50%)", borderRadius: 9, background: "rgba(0,0,0,0.6)", filter: "blur(2px)" }} />
      <svg width="34" height="42" viewBox="0 0 34 42">
        <defs>
          <linearGradient id={`pingrad${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={T.danger} />
            <stop offset="100%" stopColor="#7a1d1d" />
          </linearGradient>
        </defs>
        <path d="M17 0 C26 0 33 7 33 16 C33 26 17 41 17 41 C17 41 1 26 1 16 C1 7 8 0 17 0 Z" fill={T.danger} opacity="0.25" />
        <path d="M17 1.5 C25 1.5 31.5 8 31.5 16 C31.5 25 17 39.5 17 39.5 C17 39.5 2.5 25 2.5 16 C2.5 8 9 1.5 17 1.5 Z" fill={`url(#pingrad${index})`} stroke="#fff" strokeWidth="1.5" strokeOpacity="0.7" />
        <circle cx="17" cy="15.5" r="5" fill="#fff" />
        <text x="17" y="18.6" textAnchor="middle" fontSize="8.5" fontWeight="800" fill={T.danger}>{index + 1}</text>
      </svg>
      <div style={{ position: "absolute", left: "50%", top: "37%",
        transform: "translate(-50%,-50%)", borderRadius: "50%",
        border: `2px solid ${T.danger}`, animation: "pinPulse 1.2s ease-out 1" }} />
      <div className={`pinLabel ${active ? "active" : ""}`} style={{
        position: "absolute", left: "50%", bottom: 50,
        transform: "translateX(-50%)",
        background: "rgba(7,7,16,0.92)", border: `1px solid ${T.border}`,
        borderRadius: 10, padding: "6px 9px", whiteSpace: "nowrap",
        color: T.text, fontSize: 10, fontWeight: 700,
        boxShadow: "0 8px 24px rgba(0,0,0,0.6)", pointerEvents: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: T.danger }} />
          {label}
        </div>
        <div style={{ fontSize: 9, color: T.textSecondary, fontWeight: 500, marginTop: 1 }}>{dist} km away</div>
      </div>
    </button>
  );
}

function ShopBottomSheet({ open, found, pins, onClose, active, setActive, onPick }) {
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      background: "rgba(13,13,28,0.95)", backdropFilter: "blur(20px)",
      borderTop: `1px solid ${T.borderLight}`,
      boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
      transform: open ? "translateY(0)" : "translateY(100%)",
      transition: "transform 480ms cubic-bezier(.22,1,.36,1)",
      zIndex: 30, paddingBottom: 28, maxHeight: "60%",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: T.borderLight }} />
      </div>
      <div style={{ padding: "10px 18px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: T.text, fontVariantNumeric: "tabular-nums", letterSpacing: -0.8 }}>
            <span key={found} style={{ display: "inline-block", animation: "countPop 320ms cubic-bezier(.34,1.56,.64,1)" }}>{found}</span>
            <span style={{ fontSize: 12, color: T.textSecondary, fontWeight: 600, marginLeft: 6 }}>of {MAP_SHOPS.length} found</span>
          </div>
          <div style={{ fontSize: 10.5, color: T.textSecondary, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="location" size={10} color={T.success} /> DHA Phase 6 · Sorted by distance
          </div>
        </div>
        <button onClick={onClose} style={iconButtonSmall}><Icon name="close" size={14} color={T.textSecondary} /></button>
      </div>
      <div style={{ overflowY: "auto", padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {pins.slice(0, found).map((s, i) => (
          <button key={i} onClick={() => { setActive(i); onPick && onPick({ ...s, id: i, category: "Plumber" }); }} style={{
            textAlign: "left", padding: 12, borderRadius: 14,
            background: active === i ? T.primaryGlow : T.card,
            border: `1px solid ${active === i ? T.primary : T.border}`,
            cursor: "pointer", display: "flex", gap: 10,
            animation: `cardIn 380ms cubic-bezier(.22,1,.36,1) both`,
            animationDelay: `${i * 60}ms`,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 10, background: T.danger,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 900, color: "#fff",
              boxShadow: `0 4px 12px ${T.danger}66`, flexShrink: 0,
            }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{s.name}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 3, color: T.warning, fontSize: 11, fontWeight: 700 }}>
                  <Icon name="star" size={11} color={T.warning} fill /> {s.rating}
                </span>
              </div>
              <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 3 }}>{s.address}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                <span style={{ fontSize: 10, color: T.success, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                  <Icon name="nav" size={10} color={T.success} /> {s.dist} km
                </span>
                <span style={{ fontSize: 10, color: T.textMuted }}>{s.reviews} reviews</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
                  <div style={{ background: T.success, borderRadius: 8, padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="phone" size={9} color="#fff" />
                    <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>Call</span>
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BOOKING HISTORY
// ═══════════════════════════════════════════════════════════════
function BookingHistoryScreen({ onBack, onOpen }) {
  const [filter, setFilter] = useStateU("all");
  const filters = [
    { k: "all",       l: "All",       n: BOOKINGS.length },
    { k: "pending",   l: "Pending",   n: BOOKINGS.filter(b => b.status === "pending").length },
    { k: "confirmed", l: "Confirmed", n: BOOKINGS.filter(b => b.status === "confirmed").length },
    { k: "completed", l: "Done",      n: BOOKINGS.filter(b => b.status === "completed").length },
  ];
  const shown = filter === "all" ? BOOKINGS : BOOKINGS.filter(b => b.status === filter);

  return (
    <div style={{ height: "100%", background: T.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ height: PHONE.statusH }} />
      <TopBar title="Your bookings" subtitle={`${BOOKINGS.length} total`} />
      <div style={{ padding: "8px 16px 0", display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
        {filters.map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{
            flexShrink: 0, padding: "8px 14px", borderRadius: 999,
            background: filter === f.k ? T.primary : T.card,
            color: filter === f.k ? "#fff" : T.textSecondary,
            border: `1px solid ${filter === f.k ? T.primary : T.border}`,
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {f.l}
            <span style={{
              background: filter === f.k ? "rgba(255,255,255,0.25)" : T.surface,
              padding: "1px 6px", borderRadius: 7, fontSize: 10, fontWeight: 800,
            }}>{f.n}</span>
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "14px 16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.map((b, i) => (
          <button key={b.id} onClick={() => onOpen && onOpen(b)} style={{
            textAlign: "left", padding: 14, borderRadius: 16,
            background: T.card, border: `1px solid ${T.border}`,
            display: "flex", gap: 12, cursor: "pointer",
            animation: `slideInLeft 400ms cubic-bezier(.22,1,.36,1) both`,
            animationDelay: `${i * 60}ms`,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: T.surface, border: `1px solid ${T.border}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, letterSpacing: 0.4 }}>
                {b.date.split(" ")[0].toUpperCase()}
              </div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.text }}>
                {b.date.includes("Today") ? "Today" : b.date.includes("Tomorrow") ? "Tmrw" : b.date.split(" ")[1]}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{b.provider}</span>
                <StatusBadge status={b.status} />
              </div>
              <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 4 }}>{b.category} · {b.time}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 10, color: T.textMuted, fontFamily: "ui-monospace, Menlo, monospace" }}>{b.id}</span>
                <span style={{ fontSize: 12, color: T.success, fontWeight: 800 }}>₨{b.price}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════
function ProfileScreen({ onSub, onLogout }) {
  return (
    <div style={{ height: "100%", overflow: "auto", background: T.bg }}>
      <div style={{ height: PHONE.statusH }} />
      <TopBar title="Profile" transparent />

      <div style={{ padding: "0 18px 24px" }}>
        {/* Hero card */}
        <GlassCard glow={T.primary} style={{ marginTop: 6, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <Avatar name="Asad Khan" size={72} color={T.primary} color2={T.violet} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>Asad Khan</div>
          <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 2 }}>asad.khan@gmail.com</div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "center" }}>
            <Pill color={T.success} icon="check" size="sm">VERIFIED</Pill>
            <Pill color={T.warning} icon="star" size="sm">PRO MEMBER</Pill>
          </div>
          {/* Stat row */}
          <div style={{ display: "flex", marginTop: 16, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
            {[
              { v: "12",     l: "Bookings" },
              { v: "₨18.4K", l: "Spent" },
              { v: "4.9",    l: "Rating" },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", borderLeft: i ? `1px solid ${T.border}` : "none" }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: T.text, fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
                <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, letterSpacing: 0.8, marginTop: 2 }}>{s.l.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* AI Infrastructure card */}
        <GlassCard accent={T.violet + "44"} style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Icon name="cpu" size={16} color={T.violet} />
            <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>Your AI Infrastructure</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { l: "Gemini-2.5-flash · agent orchestrator", color: T.violet },
              { l: "5 specialized AI agents working for you", color: T.primary },
              { l: "Auto-translates Urdu ↔ English",         color: T.success },
              { l: "Smart follow-ups & reminders",           color: T.warning },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.textSecondary }}>
                <div style={{ width: 5, height: 5, borderRadius: 3, background: f.color, boxShadow: `0 0 8px ${f.color}` }} />
                {f.l}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Settings list */}
        <SectionTitleLocal title="Settings" />
        <GlassCard padding={0}>
          {[
            { i: "user",     l: "Edit profile",  k: "edit" },
            { i: "bell",     l: "Notifications", k: "notif" },
            { i: "globe",    l: "Language",      k: "lang" },
            { i: "moon",     l: "Appearance",    k: "appear" },
            { i: "help",     l: "Help & support",k: "help" },
          ].map((r, i, arr) => (
            <button key={r.k} onClick={() => onSub(r.k)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "13px 14px", background: "transparent", border: "none", cursor: "pointer",
              borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: T.surface, display: "flex", alignItems: "center", justifyContent: "center",
              }}><Icon name={r.i} size={15} color={T.textSecondary} /></div>
              <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 600, color: T.text }}>{r.l}</span>
              <Icon name="chevR" size={14} color={T.textMuted} />
            </button>
          ))}
        </GlassCard>

        <button onClick={onLogout} style={{
          width: "100%", marginTop: 14, padding: 13, borderRadius: 14,
          background: T.dangerGlow, border: `1px solid ${T.danger}55`,
          color: T.danger, fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <Icon name="logout" size={15} color={T.danger} />
          Sign out
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS SUB-SCREENS
// ═══════════════════════════════════════════════════════════════
function SettingsSub({ kind, onBack }) {
  const meta = {
    appear: { title: "Appearance", desc: "Theme & display" },
    lang:   { title: "Language",   desc: "Choose your language" },
    notif:  { title: "Notifications", desc: "Manage push & email" },
    help:   { title: "Help & support", desc: "FAQ and contact" },
    edit:   { title: "Edit profile", desc: "Your information" },
  }[kind] || { title: "Settings" };

  return (
    <div style={{ height: "100%", background: T.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ height: PHONE.statusH }} />
      <TopBar title={meta.title} subtitle={meta.desc} onBack={onBack} />
      <div style={{ flex: 1, overflow: "auto", padding: "12px 18px 18px" }}>
        {kind === "appear" && <AppearancePanel />}
        {kind === "lang"   && <LanguagePanel />}
        {kind === "notif"  && <NotificationsPanel />}
        {kind === "help"   && <HelpPanel />}
        {kind === "edit"   && <EditProfilePanel />}
      </div>
    </div>
  );
}

function AppearancePanel() {
  const [theme, setTheme] = useStateU("dark");
  const [accent, setAccent] = useStateU(T.primary);
  return (
    <>
      <SectionTitle title="Theme" accent={T.primary} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[{k:"dark",l:"Dark",bg:"#070710"},{k:"midnight",l:"Midnight",bg:"#0F1729"},{k:"system",l:"System",bg:"linear-gradient(135deg,#070710,#fff)"}].map(t => (
          <button key={t.k} onClick={() => setTheme(t.k)} style={{
            padding: 0, borderRadius: 14, cursor: "pointer",
            background: T.card, border: `2px solid ${theme === t.k ? T.primary : T.border}`,
            overflow: "hidden",
          }}>
            <div style={{ height: 80, background: t.bg, borderBottom: `1px solid ${T.border}` }} />
            <div style={{ padding: "8px", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
              <Icon name={theme === t.k ? "check" : ""} size={12} color={T.primary} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{t.l}</span>
            </div>
          </button>
        ))}
      </div>
      <SectionTitle title="Accent color" accent={T.primary} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[T.primary, T.success, T.danger, T.warning, T.info, T.pink, T.violet].map(c => (
          <button key={c} onClick={() => setAccent(c)} style={{
            width: 36, height: 36, borderRadius: 18, background: c,
            border: accent === c ? "3px solid #fff" : "3px solid transparent",
            boxShadow: `0 4px 12px ${c}66`, cursor: "pointer",
          }} />
        ))}
      </div>
    </>
  );
}

function LanguagePanel() {
  const [lang, setLang] = useStateU("en");
  const langs = [
    { k: "en", l: "English",  s: "English (US)" },
    { k: "ur", l: "اردو",     s: "Urdu" },
    { k: "hi", l: "हिन्दी",     s: "Hindi" },
    { k: "ar", l: "العربية",   s: "Arabic" },
    { k: "pa", l: "ਪੰਜਾਬੀ",   s: "Punjabi" },
  ];
  return (
    <>
      {langs.map(l => (
        <button key={l.k} onClick={() => setLang(l.k)} style={{
          width: "100%", padding: 14, marginBottom: 8,
          background: lang === l.k ? T.primaryGlow : T.card,
          border: `1.5px solid ${lang === l.k ? T.primary : T.border}`,
          borderRadius: 14, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text, width: 60, textAlign: "center" }}>{l.l}</div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{l.s}</div>
            <div style={{ fontSize: 11, color: T.textMuted }}>{l.l}</div>
          </div>
          {lang === l.k && <Icon name="checkCircle" size={18} color={T.primary} fill />}
        </button>
      ))}
    </>
  );
}

function NotificationsPanel() {
  const items = [
    { k: "booking", l: "Booking confirmed",  s: "When your booking is accepted" },
    { k: "arrive",  l: "Provider arriving",  s: "When the provider is 10 min away" },
    { k: "rate",    l: "Rate experience",    s: "After service is complete" },
    { k: "promo",   l: "Promotions",         s: "Discounts & special offers" },
    { k: "weekly",  l: "Weekly digest",      s: "Service insights and tips" },
  ];
  const [state, setState] = useStateU({ booking: true, arrive: true, rate: true, promo: false, weekly: true });
  return (
    <>
      {items.map(it => (
        <div key={it.k} style={{
          display: "flex", alignItems: "center", padding: 14, marginBottom: 8,
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{it.l}</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{it.s}</div>
          </div>
          <Toggle on={state[it.k]} onChange={v => setState(s => ({ ...s, [it.k]: v }))} />
        </div>
      ))}
    </>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 44, height: 26, borderRadius: 13, position: "relative", cursor: "pointer",
      background: on ? T.success : T.surface,
      border: `1px solid ${on ? T.success : T.border}`,
      transition: "all 220ms ease",
    }}>
      <div style={{
        position: "absolute", top: 2, left: on ? 20 : 2,
        width: 20, height: 20, borderRadius: 10, background: "#fff",
        transition: "left 220ms cubic-bezier(.34,1.56,.64,1)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
      }} />
    </button>
  );
}

function HelpPanel() {
  return (
    <>
      <GlassCard glow={T.primary}>
        <Icon name="chat" size={28} color={T.primary} />
        <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginTop: 8 }}>Chat with us</div>
        <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 3 }}>Live chat support, replies in 2 min</div>
      </GlassCard>
      <SectionTitle title="FAQ" accent={T.info} />
      {[
        "How does the AI matching work?",
        "Can I cancel a booking?",
        "Are providers verified?",
        "How is pricing determined?",
        "Is my data private?",
      ].map((q, i) => (
        <button key={i} style={{
          width: "100%", textAlign: "left", padding: 14, marginBottom: 6,
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
          fontSize: 12.5, color: T.text, display: "flex", justifyContent: "space-between", alignItems: "center",
          cursor: "pointer",
        }}>
          {q}
          <Icon name="chevR" size={14} color={T.textMuted} />
        </button>
      ))}
    </>
  );
}

function EditProfilePanel() {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18, marginTop: 6 }}>
        <div style={{ position: "relative" }}>
          <Avatar name="Asad Khan" size={84} color={T.primary} color2={T.violet} />
          <button style={{
            position: "absolute", bottom: 0, right: 0,
            width: 28, height: 28, borderRadius: 14, background: T.primary,
            border: "2px solid #070710", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><Icon name="edit" size={12} color="#fff" /></button>
        </div>
      </div>
      {[
        { l: "Full name", v: "Asad Khan" },
        { l: "Email",     v: "asad.khan@gmail.com" },
        { l: "Phone",     v: "+92 300 1234567" },
        { l: "Address",   v: "DHA Phase 6, House 124-B, Karachi" },
      ].map((f, i) => (
        <div key={i} style={{
          padding: "12px 14px", marginBottom: 8, background: T.card,
          border: `1px solid ${T.border}`, borderRadius: 14,
        }}>
          <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, letterSpacing: 0.8 }}>{f.l.toUpperCase()}</div>
          <div style={{ fontSize: 13, color: T.text, fontWeight: 600, marginTop: 4 }}>{f.v}</div>
        </div>
      ))}
    </>
  );
}

Object.assign(window, { UserDashboard, LiveSearchScreen, BookingHistoryScreen, ProfileScreen, SettingsSub });
