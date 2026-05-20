// screens-provider.jsx — ProviderDashboard, BookingRequests, ProviderProfile
/* global React, T, Icon, GlassCard, PressButton, Pill, StatusBadge, Avatar, SectionTitle, TopBar, PHONE */
const { useState: useStateP, useEffect: useEffectP } = React;

// ═══════════════════════════════════════════════════════════════
// PROVIDER DASHBOARD — Earnings glow orb + jobs overview
// ═══════════════════════════════════════════════════════════════
function ProviderDashboard({ onRequests, onProfile, onOpenRequest }) {
  const [count, setCount] = useStateP(0);
  useEffectP(() => {
    let n = 0;
    const target = 18420;
    const inc = target / 50;
    const id = setInterval(() => {
      n += inc;
      if (n >= target) { n = target; clearInterval(id); }
      setCount(Math.floor(n));
    }, 25);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ height: "100%", overflow: "auto", background: T.bg, position: "relative" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(circle at 100% 0%, rgba(245,158,11,0.18), transparent 55%)",
        pointerEvents: "none",
      }} />
      <div style={{ height: PHONE.statusH, position: "relative" }} />

      <div style={{ padding: "8px 18px 0", position: "relative" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name="Ali Plumbing" size={42} color={T.warning} color2="#D97706" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: T.textSecondary }}>Welcome back</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: -0.3 }}>Ali Plumbing Works</div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: T.successGlow, border: `1px solid ${T.success}55`,
            borderRadius: 999, padding: "5px 10px",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: T.success, boxShadow: `0 0 8px ${T.success}`, animation: "blink 1.4s infinite" }} />
            <span style={{ fontSize: 10, color: T.success, fontWeight: 700 }}>ONLINE</span>
          </div>
        </div>

        {/* Earnings hero with glow orb */}
        <div style={{
          marginTop: 14, position: "relative", overflow: "hidden", borderRadius: 22,
          background: `linear-gradient(135deg, ${T.elevated}, ${T.card})`,
          border: `1px solid ${T.warning}33`,
          padding: 18,
          boxShadow: `0 20px 50px ${T.warning}22`,
        }}>
          {/* Glow orb */}
          <div style={{
            position: "absolute", top: -40, right: -40,
            width: 200, height: 200, borderRadius: 100,
            background: `radial-gradient(circle, ${T.warning}88, ${T.warning}00 70%)`,
            filter: "blur(2px)",
            animation: "orbFloat 5s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", bottom: -40, left: -30,
            width: 140, height: 140, borderRadius: 70,
            background: `radial-gradient(circle, ${T.amber}44, transparent 70%)`,
            filter: "blur(2px)",
            animation: "orbFloat 6s ease-in-out infinite reverse",
          }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: T.warning, fontWeight: 700, letterSpacing: 1 }}>
              <Icon name="cash" size={12} color={T.warning} />
              EARNINGS THIS MONTH
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 14, color: T.textSecondary, fontWeight: 700 }}>₨</span>
              <span style={{ fontSize: 38, fontWeight: 900, color: T.text, fontVariantNumeric: "tabular-nums", letterSpacing: -1.4 }}>
                {count.toLocaleString()}
              </span>
              <span style={{ fontSize: 11, color: T.success, fontWeight: 700, marginLeft: 6 }}>
                <Icon name="trend" size={10} color={T.success} /> +24%
              </span>
            </div>
            <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 4 }}>vs ₨14,820 last month</div>

            {/* Mini bar chart */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginTop: 14, height: 36 }}>
              {[40, 65, 55, 80, 70, 90, 100, 75, 85, 95, 100, 88].map((h, i) => (
                <div key={i} style={{
                  flex: 1, height: `${h}%`, borderRadius: 3,
                  background: `linear-gradient(180deg, ${T.warning}, ${T.warning}55)`,
                  boxShadow: i === 6 ? `0 0 8px ${T.warning}` : "none",
                  animation: `barIn 600ms cubic-bezier(.34,1.56,.64,1) both`,
                  animationDelay: `${i * 30}ms`,
                }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 9, color: T.textMuted, fontWeight: 600 }}>
              <span>1</span><span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span>
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
          {[
            { v: "8",  l: "Pending",   c: T.warning, i: "clock"   },
            { v: "23", l: "Confirmed", c: T.success, i: "check"   },
            { v: "4.8",l: "Rating",    c: T.amber,   i: "star"    },
          ].map((s, i) => (
            <div key={i} style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 14, padding: 12,
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8,
                background: `${s.c}22`, border: `1px solid ${s.c}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}><Icon name={s.i} size={13} color={s.c} fill={s.i === "star"} /></div>
              <div style={{ fontSize: 20, fontWeight: 900, color: T.text, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
              <div style={{ fontSize: 10, color: T.textSecondary, marginTop: 1 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Live AI requests banner */}
        <button onClick={onRequests} style={{
          width: "100%", marginTop: 12, padding: 14, borderRadius: 16, cursor: "pointer",
          background: `linear-gradient(135deg, ${T.violet}22, ${T.primary}22)`,
          border: `1px solid ${T.violet}55`, color: T.text,
          display: "flex", alignItems: "center", gap: 12, textAlign: "left",
          boxShadow: `0 12px 28px ${T.violet}22`,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `linear-gradient(135deg, ${T.violet}, ${T.primary})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 8px 18px ${T.violet}66`,
          }}>
            <Icon name="sparkles" size={18} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>New AI matches</span>
              <span style={{
                background: T.danger, color: "#fff", padding: "1px 6px",
                borderRadius: 8, fontSize: 9, fontWeight: 900,
              }}>3 NEW</span>
            </div>
            <div style={{ fontSize: 10.5, color: T.textSecondary, marginTop: 2 }}>Tap to review pending requests</div>
          </div>
          <Icon name="chevR" size={16} color={T.text} />
        </button>

        {/* Today's jobs */}
        <SectionTitle title="Today's schedule" accent={T.warning} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { time: "10:30 AM", client: "Asad Khan",   addr: "DHA Phase 6 · House 124-B",  status: "confirmed", id: "BK-7A12-KHI" },
            { time: "1:30 PM",  client: "Sara M.",     addr: "Saba Avenue · Apt 4-C",       status: "confirmed", id: "BK-6B43-KHI" },
            { time: "4:00 PM",  client: "Hassan R.",   addr: "Tauheed Commercial · Shop 7", status: "pending",   id: "BK-5C88-KHI" },
          ].map((j, i) => (
            <button key={i} onClick={() => onOpenRequest && onOpenRequest(j)} style={{
              padding: 12, borderRadius: 14,
              background: T.card, border: `1px solid ${T.border}`,
              cursor: "pointer", textAlign: "left",
              display: "flex", gap: 10, alignItems: "center",
              animation: `slideInLeft 400ms cubic-bezier(.22,1,.36,1) both`,
              animationDelay: `${i * 80}ms`,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: T.surface, border: `1px solid ${T.border}`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, letterSpacing: 0.4 }}>
                  {j.time.split(" ")[1]}
                </div>
                <div style={{ fontSize: 11, fontWeight: 900, color: T.text }}>{j.time.split(" ")[0]}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{j.client}</div>
                <div style={{ fontSize: 10.5, color: T.textSecondary, marginTop: 2 }}>{j.addr}</div>
              </div>
              <StatusBadge status={j.status} />
            </button>
          ))}
        </div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BOOKING REQUESTS — Tabbed list with accept/decline
// ═══════════════════════════════════════════════════════════════
const REQUESTS = [
  { id: "BK-9F8A-KHI", client: "Asad Khan",     time: "Today · 3:00 PM",   service: "Emergency leak repair",   addr: "DHA Phase 6, House 124-B",   price: 1250, status: "pending",   score: 91, distance: 0.7 },
  { id: "BK-7C2D-KHI", client: "Sara Malik",    time: "Today · 5:30 PM",   service: "Bathroom sink fix",       addr: "Saba Avenue, Apt 4-C",       price: 950,  status: "pending",   score: 84, distance: 1.2 },
  { id: "BK-6E11-KHI", client: "Hassan Raza",   time: "Tomorrow · 9:00 AM",service: "Pipe replacement",        addr: "Tauheed Comm., Shop 7",      price: 2200, status: "pending",   score: 78, distance: 1.8 },
  { id: "BK-5A33-KHI", client: "Fatima B.",     time: "May 14 · 11:00 AM", service: "Drain cleaning",          addr: "Khy-e-Ittehad",              price: 1100, status: "confirmed", score: 88, distance: 1.0 },
  { id: "BK-4F22-KHI", client: "Omar K.",       time: "May 12 · 2:00 PM",  service: "Water heater install",    addr: "Zamzama",                    price: 3500, status: "cancelled", score: 65, distance: 2.5 },
];

function BookingRequestsScreen({ onBack, onOpen }) {
  const [tab, setTab] = useStateP("pending");
  const [actioning, setActioning] = useStateP({});
  const tabs = [
    { k: "all",       l: "All",       n: REQUESTS.length },
    { k: "pending",   l: "Pending",   n: REQUESTS.filter(r => r.status === "pending").length },
    { k: "confirmed", l: "Done",      n: REQUESTS.filter(r => r.status === "confirmed").length },
    { k: "cancelled", l: "Cancelled", n: REQUESTS.filter(r => r.status === "cancelled").length },
  ];
  const list = tab === "all" ? REQUESTS : REQUESTS.filter(r => r.status === tab);

  const act = (id, kind) => {
    setActioning(s => ({ ...s, [id]: kind }));
    setTimeout(() => setActioning(s => { const c = { ...s }; delete c[id]; return c; }), 1000);
  };

  return (
    <div style={{ height: "100%", background: T.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ height: PHONE.statusH }} />
      <TopBar title="Booking requests" subtitle={`${REQUESTS.length} total`} onBack={onBack}
        right={<Pill color={T.warning} icon="bell" size="sm">{REQUESTS.filter(r => r.status === "pending").length} NEW</Pill>} />

      {/* Tabs */}
      <div style={{ padding: "8px 16px 4px", display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            flexShrink: 0, padding: "8px 14px", borderRadius: 999,
            background: tab === t.k ? T.warning : T.card,
            color: tab === t.k ? "#1a1a1a" : T.textSecondary,
            border: `1px solid ${tab === t.k ? T.warning : T.border}`,
            fontSize: 12, fontWeight: 800, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {t.l}
            <span style={{
              background: tab === t.k ? "rgba(0,0,0,0.18)" : T.surface,
              padding: "1px 6px", borderRadius: 7, fontSize: 10, fontWeight: 800,
              color: tab === t.k ? "#1a1a1a" : T.text,
            }}>{t.n}</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "10px 16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((r, i) => {
          const action = actioning[r.id];
          return (
            <div key={r.id} style={{
              padding: 14, borderRadius: 16,
              background: T.card, border: `1px solid ${T.border}`,
              animation: `slideInLeft 400ms cubic-bezier(.22,1,.36,1) both`,
              animationDelay: `${i * 60}ms`,
              position: "relative", overflow: "hidden",
            }}>
              {/* AI score ribbon */}
              <div style={{
                position: "absolute", top: 0, left: 0,
                background: r.score > 88 ? `linear-gradient(135deg, ${T.success}, ${T.successDark})` :
                  r.score > 80 ? `linear-gradient(135deg, ${T.warning}, #D97706)` :
                  `linear-gradient(135deg, ${T.info}, #2196A4)`,
                color: "#fff", fontSize: 9, fontWeight: 900,
                padding: "3px 10px 3px 8px", borderBottomRightRadius: 10,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <Icon name="sparkle" size={9} color="#fff" /> AI MATCH · {r.score}%
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={r.client} size={36} color={T.primary} color2={T.violet} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{r.client}</div>
                    <div style={{ fontSize: 10.5, color: T.textSecondary, marginTop: 1 }}>{r.time}</div>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>

              <div style={{ marginTop: 10, padding: 10, background: T.surface, borderRadius: 10, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 12.5, color: T.text, fontWeight: 700 }}>{r.service}</div>
                <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="location" size={10} color={T.textMuted} /> {r.addr}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", marginTop: 10, gap: 12 }}>
                <span style={{ fontSize: 11, color: T.success, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  <Icon name="cash" size={11} color={T.success} /> ₨{r.price.toLocaleString()}
                </span>
                <span style={{ fontSize: 11, color: T.info, fontWeight: 700 }}>
                  <Icon name="nav" size={10} color={T.info} /> {r.distance}km
                </span>
                <span style={{ fontSize: 10, color: T.textMuted, fontFamily: "ui-monospace, Menlo, monospace", marginLeft: "auto" }}>{r.id}</span>
              </div>

              {r.status === "pending" && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => act(r.id, "decline")} disabled={!!action} style={{
                    flex: 1, height: 40, borderRadius: 12,
                    background: action === "decline" ? T.danger : T.surface,
                    border: `1px solid ${action === "decline" ? T.danger : T.border}`,
                    color: action === "decline" ? "#fff" : T.textSecondary,
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    transition: "all 200ms ease",
                  }}>
                    <Icon name="close" size={14} color="currentColor" /> {action === "decline" ? "Declined" : "Decline"}
                  </button>
                  <button onClick={() => act(r.id, "accept")} disabled={!!action} style={{
                    flex: 2, height: 40, borderRadius: 12,
                    background: action === "accept" ? `linear-gradient(135deg, ${T.success}, ${T.successDark})` : `linear-gradient(135deg, ${T.success}, ${T.successDark})`,
                    border: "none", color: "#fff",
                    fontSize: 12, fontWeight: 800, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    boxShadow: `0 8px 22px ${T.success}55`,
                    transform: action === "accept" ? "scale(0.98)" : "scale(1)",
                    transition: "all 200ms ease",
                  }}>
                    <Icon name="check" size={15} color="#fff" /> {action === "accept" ? "Accepted!" : "Accept booking"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER PROFILE — Hero with stats, reviews, availability
// ═══════════════════════════════════════════════════════════════
function ProviderProfileScreen({ onBack, onLogout }) {
  return (
    <div style={{ height: "100%", overflow: "auto", background: T.bg }}>
      <div style={{ height: PHONE.statusH }} />
      <TopBar title="Your profile" onBack={onBack} transparent
        right={<button style={iconBtnPro}><Icon name="edit" size={15} color={T.text} /></button>} />

      <div style={{ padding: "0 16px 28px" }}>
        {/* Hero card with gradient avatar */}
        <div style={{
          position: "relative", marginTop: 6, padding: 18, borderRadius: 20,
          background: `linear-gradient(135deg, ${T.warning}22, ${T.amber}10, ${T.card})`,
          border: `1px solid ${T.warning}44`, overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -50, right: -50,
            width: 180, height: 180, borderRadius: 90,
            background: `radial-gradient(circle, ${T.warning}55, transparent 70%)`,
            filter: "blur(4px)",
          }} />
          <div style={{ display: "flex", gap: 14, alignItems: "center", position: "relative" }}>
            <Avatar name="Ali Plumbing" size={72} color={T.warning} color2="#D97706" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: T.text }}>Ali Plumbing Works</div>
              <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 2 }}>Master plumber · 12 yrs experience</div>
              <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
                <Pill color={T.success} icon="check" size="sm">VERIFIED</Pill>
                <Pill color={T.amber} icon="star" size="sm">TOP RATED</Pill>
              </div>
            </div>
          </div>

          {/* Stat row */}
          <div style={{ display: "flex", marginTop: 16, paddingTop: 12, borderTop: `1px solid ${T.border}`, position: "relative" }}>
            {[
              { v: "432",  l: "Jobs done" },
              { v: "4.8",  l: "Rating" },
              { v: "98%",  l: "Acceptance" },
              { v: "12m",  l: "Avg ETA" },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", borderLeft: i ? `1px solid ${T.border}` : "none" }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: T.text, fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
                <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, letterSpacing: 0.6, marginTop: 2 }}>{s.l.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Services offered */}
        <SectionTitle title="Services" accent={T.warning} action={
          <button style={pillBtn}><Icon name="plus" size={11} color={T.warning} /> Add</button>
        } />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {["Pipe repair","Leak fixing","Drain cleaning","Water heater","Bathroom fitting","PVC install","Emergency 24/7"].map(s => (
            <span key={s} style={{
              background: T.card, border: `1px solid ${T.border}`,
              padding: "6px 11px", borderRadius: 999, fontSize: 11, color: T.text, fontWeight: 600,
            }}>{s}</span>
          ))}
        </div>

        {/* Availability schedule */}
        <SectionTitle title="Availability" accent={T.success} action={
          <span style={{ fontSize: 11, color: T.success, fontWeight: 700 }}><Icon name="check" size={11} color={T.success} /> Online now</span>
        } />
        <div style={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 16,
          padding: 14,
        }}>
          {[
            { d: "Mon", t: "9:00 AM – 8:00 PM", on: true },
            { d: "Tue", t: "9:00 AM – 8:00 PM", on: true },
            { d: "Wed", t: "9:00 AM – 8:00 PM", on: true },
            { d: "Thu", t: "9:00 AM – 8:00 PM", on: true },
            { d: "Fri", t: "Closed",            on: false },
            { d: "Sat", t: "10:00 AM – 6:00 PM",on: true },
            { d: "Sun", t: "Emergency only",     on: true, em: true },
          ].map((d, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", padding: "8px 0",
              borderTop: i ? `1px solid ${T.border}` : "none",
              fontSize: 12,
            }}>
              <span style={{ color: T.textSecondary, fontWeight: 700, width: 50 }}>{d.d}</span>
              <span style={{ color: d.on ? (d.em ? T.warning : T.text) : T.textMuted, fontWeight: 600 }}>{d.t}</span>
            </div>
          ))}
        </div>

        {/* Recent reviews */}
        <SectionTitle title="Recent reviews" accent={T.amber} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { name: "Asad K.", stars: 5, text: "Arrived in 15 min, fixed the leak quickly. Highly professional!", time: "2h ago" },
            { name: "Sara M.", stars: 5, text: "Best plumber in DHA. Polite and fairly priced.", time: "Yesterday" },
            { name: "Hassan R.", stars: 4, text: "Good work but took a bit longer than expected. Otherwise great.", time: "3 days ago" },
          ].map((r, i) => (
            <div key={i} style={{
              padding: 12, borderRadius: 14,
              background: T.card, border: `1px solid ${T.border}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar name={r.name} size={28} color={T.primary} color2={T.violet} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{r.name}</div>
                    <div style={{ fontSize: 10, color: T.textMuted }}>{r.time}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 1 }}>
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Icon key={k} name="star" size={11} color={k < r.stars ? T.amber : T.textDim} fill />
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: T.textSecondary, marginTop: 8, lineHeight: 1.5 }}>"{r.text}"</div>
            </div>
          ))}
        </div>

        <button onClick={onLogout} style={{
          width: "100%", marginTop: 18, padding: 13, borderRadius: 14,
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

const iconBtnPro = {
  width: 36, height: 36, borderRadius: 12,
  background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
};
const pillBtn = {
  display: "inline-flex", alignItems: "center", gap: 5,
  background: T.warningGlow, color: T.warning,
  border: `1px solid ${T.warning}55`,
  borderRadius: 999, padding: "4px 9px",
  fontSize: 10, fontWeight: 700, cursor: "pointer",
};

Object.assign(window, { ProviderDashboard, BookingRequestsScreen, ProviderProfileScreen });
