// screens-flow.jsx — Search, Reasoning, Results, Booking, Confirmation
/* global React, T, Icon, GlassCard, PressButton, Pill, StatusBadge, Skeleton, LiveDot, Typewriter, ThinkingDots, ScoreBar, Avatar, SectionTitle, TopBar, PHONE, AGENTS, PROVIDERS */
const { useState: useStateF, useEffect: useEffectF, useRef: useRefF, useMemo: useMemoF } = React;

// ═══════════════════════════════════════════════════════════════
// SEARCH — Glowing AI-native textarea with language toggle
// ═══════════════════════════════════════════════════════════════
function SearchScreen({ onSubmit, onBack }) {
  const [query, setQuery] = useStateF("My kitchen sink is leaking badly and I need a plumber in DHA Phase 6 today");
  const [lang, setLang] = useStateF("EN");
  const [focus, setFocus] = useStateF(false);

  const suggestions = [
    "AC not cooling in living room, need urgent help",
    "Need a math tutor for class 9 algebra near Saba Avenue",
    "Pipe burst in bathroom, emergency plumber needed now",
    "Electrician for fan installation, weekend okay",
  ];

  return (
    <div style={{ height: "100%", background: T.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ height: PHONE.statusH }} />
      <TopBar title="Ask anything" subtitle="AI agents will find it" onBack={onBack}
        right={
          <button onClick={() => setLang(l => l === "EN" ? "UR" : "EN")} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: T.primaryGlow, border: `1px solid ${T.primary}55`,
            borderRadius: 999, padding: "5px 10px",
            cursor: "pointer", color: T.primary, fontSize: 11, fontWeight: 700,
          }}>
            <Icon name="globe" size={12} color={T.primary} />
            {lang === "EN" ? "EN · اردو" : "اردو · EN"}
          </button>
        }
      />

      <div style={{ padding: "8px 18px 0", flex: 1, overflow: "auto" }}>
        {/* AI hero textarea */}
        <div style={{
          position: "relative", marginTop: 6, padding: 2,
          borderRadius: 22,
          background: focus
            ? `linear-gradient(135deg, ${T.primary}, ${T.violet}, ${T.pink}, ${T.success})`
            : `linear-gradient(135deg, ${T.border}, ${T.borderLight})`,
          backgroundSize: "300% 300%",
          animation: focus ? "gradientShift 4s ease infinite" : "none",
          transition: "background 240ms ease",
          boxShadow: focus ? `0 20px 50px ${T.primary}44` : "0 10px 24px rgba(0,0,0,0.3)",
        }}>
          <div style={{
            background: T.card, borderRadius: 20, padding: "16px 14px 12px",
            position: "relative", overflow: "hidden",
          }}>
            {/* Sparkle decoration */}
            <div style={{
              position: "absolute", top: 12, right: 12,
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 9, color: T.violet, fontWeight: 700, letterSpacing: 1,
            }}>
              <Icon name="sparkle" size={11} color={T.violet} />
              AI-READY
            </div>

            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
              placeholder={lang === "EN" ? "Describe what you need..." : "اپنی ضرورت بتائیں..."}
              rows={4}
              style={{
                width: "100%", background: "transparent", border: "none", outline: "none",
                color: T.text, fontSize: 15, lineHeight: 1.5,
                resize: "none", fontFamily: "inherit",
                direction: lang === "UR" ? "rtl" : "ltr",
              }}
            />

            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
              <button style={iconBtn}><Icon name="mic" size={14} color={T.textSecondary} /></button>
              <button style={iconBtn}><Icon name="location" size={14} color={T.textSecondary} /></button>
              <button style={iconBtn}><Icon name="calendar" size={14} color={T.textSecondary} /></button>
              <div style={{ flex: 1, fontSize: 10, color: T.textMuted, marginLeft: 6 }}>
                {query.length} chars · Gemini ready
              </div>
              <button onClick={() => onSubmit(query)} disabled={!query.trim()} style={{
                height: 36, padding: "0 14px", borderRadius: 12, border: "none",
                background: query.trim() ? `linear-gradient(135deg, ${T.primary}, ${T.violet})` : T.surface,
                color: "#fff", fontSize: 12, fontWeight: 800, cursor: query.trim() ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: query.trim() ? `0 8px 18px ${T.primary}66` : "none",
              }}>
                <Icon name="arrow" size={13} color="#fff" />
                Ask AI
              </button>
            </div>
          </div>
        </div>

        {/* Quick-start */}
        <div style={{ marginTop: 22, fontSize: 10, color: T.textMuted, fontWeight: 700, letterSpacing: 1.4 }}>
          TRY ONE OF THESE
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => setQuery(s)} style={{
              textAlign: "left", padding: "12px 14px", borderRadius: 14,
              background: T.card, border: `1px solid ${T.border}`,
              color: T.text, fontSize: 12.5, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 10,
              animation: `slideInLeft 420ms cubic-bezier(.22,1,.36,1) both`,
              animationDelay: `${i * 70}ms`,
            }}>
              <Icon name="sparkle" size={13} color={T.primary} />
              <span style={{ flex: 1, color: T.textSecondary }}>{s}</span>
              <Icon name="chevR" size={14} color={T.textMuted} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const iconBtn = {
  width: 32, height: 32, borderRadius: 9,
  background: T.surface, border: "none", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

// ═══════════════════════════════════════════════════════════════
// REASONING — Agent pipeline (the hackathon hero)
// ═══════════════════════════════════════════════════════════════
function ReasoningScreen({ query, onDone, onBack }) {
  const [step, setStep] = useStateF(0);          // current agent (0..4)
  const [stepPhase, setStepPhase] = useStateF("active"); // active | done
  const [logLines, setLogLines] = useStateF([]);

  const intentJson = {
    service: "plumber",
    urgency: "high",
    location: "DHA Phase 6, Karachi",
    issue: "kitchen sink leak",
    budget_pkr: 1500,
    language: "en",
  };

  useEffectF(() => {
    // Drive the pipeline forward
    if (step >= AGENTS.length) {
      const t = setTimeout(() => onDone && onDone(), 700);
      return () => clearTimeout(t);
    }
    // each agent takes ~2.2s
    const t1 = setTimeout(() => setStepPhase("done"), 1700);
    const t2 = setTimeout(() => { setStep(s => s + 1); setStepPhase("active"); }, 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [step]);

  // Log lines
  useEffectF(() => {
    const lines = [
      "→ POST /api/analyze",
      "  payload: { text: \"My kitchen sink is leaking…\" }",
      "[gemini-2.5-flash] tool_call: parse_intent()",
      "  ↳ extracted 6 fields · confidence 0.94",
      "[gemini-2.5-flash] tool_call: search_providers(category=\"plumber\", area=\"DHA Phase 6\")",
      "  ↳ matched 12 / 50 providers",
      "[ranker] computing scores · weights (d:0.35, r:0.35, p:0.20, n:0.10)",
      "  ↳ top-3 selected (0.91, 0.87, 0.82)",
      "[gemini-2.5-flash] generating ai_reasons() · 3 calls",
      "  ↳ done · 142 tokens",
      "← 200 OK · 2.84s",
    ];
    const id = setInterval(() => {
      setLogLines(arr => arr.length >= lines.length ? arr : [...arr, lines[arr.length]]);
    }, 380);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ height: "100%", background: `radial-gradient(circle at 50% 0%, rgba(108,99,255,0.18), transparent 55%), ${T.bg}`, display: "flex", flexDirection: "column" }}>
      <div style={{ height: PHONE.statusH }} />
      <TopBar
        title="Agents at work"
        subtitle={`"${query?.slice(0, 38)}${query?.length > 38 ? '…' : ''}"`}
        onBack={onBack}
        right={<Pill color={T.success} icon="live" size="sm">LIVE</Pill>}
      />

      <div style={{ padding: "8px 18px 22px", flex: 1, overflow: "auto" }}>
        {/* Agent rail */}
        <div style={{ position: "relative", marginTop: 4 }}>
          {/* Vertical line */}
          <div style={{
            position: "absolute", left: 23, top: 24, bottom: 24, width: 2,
            background: T.border, borderRadius: 1,
          }} />
          {/* Progress fill */}
          <div style={{
            position: "absolute", left: 23, top: 24, width: 2,
            height: `calc((100% - 48px) * ${Math.min(1, step / (AGENTS.length - 1))})`,
            background: `linear-gradient(180deg, ${T.a1}, ${T.a2}, ${T.a3}, ${T.a4}, ${T.a5})`,
            borderRadius: 1, transition: "height 600ms cubic-bezier(.22,1,.36,1)",
            boxShadow: "0 0 10px rgba(108,99,255,0.6)",
          }} />

          {AGENTS.map((a, i) => {
            const state = i < step ? "done" : i === step ? stepPhase : "pending";
            return (
              <AgentRow key={a.n} agent={a} state={state} index={i}
                intentJson={i === 0 ? intentJson : null}
                showRanking={i === 2}
              />
            );
          })}
        </div>

        {/* Live console */}
        <GlassCard style={{ marginTop: 18, padding: 0, overflow: "hidden" }}>
          <div style={{
            padding: "8px 12px", display: "flex", alignItems: "center", gap: 8,
            background: T.surface, borderBottom: `1px solid ${T.border}`,
          }}>
            <div style={{ display: "flex", gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 5, background: "#FF5F57" }} />
              <span style={{ width: 9, height: 9, borderRadius: 5, background: "#FEBC2E" }} />
              <span style={{ width: 9, height: 9, borderRadius: 5, background: "#28C840" }} />
            </div>
            <span style={{ fontSize: 10, color: T.textMuted, fontFamily: "ui-monospace, Menlo, monospace", marginLeft: 4 }}>
              gemini-agent · tool-trace
            </span>
            <span style={{ marginLeft: "auto", fontSize: 9, color: T.success, fontWeight: 700, letterSpacing: 0.5 }}>● STREAMING</span>
          </div>
          <div style={{ padding: "10px 12px", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10.5, lineHeight: 1.65, color: T.textSecondary, minHeight: 130, maxHeight: 180, overflowY: "auto" }}>
            {logLines.map((l, i) => {
              const isCall = l.includes("tool_call:");
              const isRes = l.trim().startsWith("↳");
              const isHead = l.startsWith("→") || l.startsWith("←");
              return (
                <div key={i} style={{
                  color: isHead ? T.violet : isCall ? T.info : isRes ? T.success : T.textMuted,
                  whiteSpace: "pre-wrap",
                  animation: "fadeIn 240ms ease",
                }}>
                  {l}
                </div>
              );
            })}
            {logLines.length < 11 && <span style={{ color: T.primary }}>▎</span>}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function AgentRow({ agent, state, index, intentJson, showRanking }) {
  const isActive = state === "active";
  const isDone = state === "done";
  const isPending = state === "pending";

  return (
    <div style={{
      display: "flex", gap: 14, padding: "12px 0", position: "relative",
      animation: `slideInRight 420ms cubic-bezier(.22,1,.36,1) both`,
      animationDelay: `${index * 80}ms`,
    }}>
      {/* Marker */}
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: isPending ? T.card : `${agent.color}22`,
        border: `2px solid ${isPending ? T.border : agent.color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", zIndex: 2,
        boxShadow: isActive ? `0 0 0 6px ${agent.color}22, 0 0 24px ${agent.color}88` : "none",
        transition: "all 300ms ease",
      }}>
        {isDone
          ? <Icon name="check" size={20} color={agent.color} stroke={2.5} />
          : <span style={{ fontSize: 16, fontWeight: 900, color: isPending ? T.textMuted : agent.color }}>{agent.n}</span>}
        {isActive && (
          <div style={{
            position: "absolute", inset: -4, borderRadius: 16,
            border: `2px solid ${agent.color}`,
            animation: "pulseRing 1.4s ease-out infinite",
          }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: isPending ? T.textMuted : T.text }}>
            {agent.name}
          </span>
          <span style={{
            fontSize: 10, fontFamily: "ui-monospace, Menlo, monospace",
            color: isPending ? T.textDim : agent.color, fontWeight: 600,
            background: isPending ? "transparent" : `${agent.color}15`,
            padding: "2px 6px", borderRadius: 5,
          }}>{agent.tool}</span>
          {isDone && <Pill color={T.success} icon="check" size="sm">DONE</Pill>}
          {isActive && <Pill color={agent.color} size="sm">RUNNING</Pill>}
        </div>

        <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 5, lineHeight: 1.5, minHeight: 16 }}>
          {isActive
            ? <>{agent.desc} <ThinkingDots color={agent.color} /></>
            : isDone ? agent.desc : <span style={{ color: T.textDim }}>{agent.desc}</span>}
        </div>

        {/* Special outputs */}
        {agent.n === 1 && (isActive || isDone) && (
          <div style={{
            marginTop: 8, background: T.surface, borderRadius: 10, padding: 10,
            border: `1px solid ${T.border}`,
            fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10.5,
            color: T.textSecondary, lineHeight: 1.55,
          }}>
            <span style={{ color: T.textMuted }}>{`{`}</span>
            {Object.entries(intentJson || {}).map(([k, v], i) => (
              <div key={k} style={{ paddingLeft: 10 }}>
                <span style={{ color: T.a1 }}>"{k}"</span>:{" "}
                <span style={{ color: typeof v === "number" ? T.warning : T.success }}>
                  {typeof v === "string" ? `"${v}"` : v}
                </span>
                {i < Object.keys(intentJson).length - 1 ? "," : ""}
              </div>
            ))}
            <span style={{ color: T.textMuted }}>{`}`}</span>
          </div>
        )}

        {agent.n === 3 && (isActive || isDone) && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
            {[
              { label: "Distance · 0.7km",  value: 92, color: T.success },
              { label: "Rating · 4.8★",      value: 96, color: T.warning },
              { label: "Price · ₨1,200",     value: 78, color: T.info },
              { label: "Reviews · 142",      value: 85, color: T.violet },
            ].map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, color: T.textSecondary, width: 110, fontWeight: 600 }}>{m.label}</span>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: T.surface, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: isDone ? `${m.value}%` : "0%",
                    background: m.color, borderRadius: 2,
                    boxShadow: `0 0 6px ${m.color}66`,
                    transition: `width 700ms cubic-bezier(.22,1,.36,1) ${i * 100}ms`,
                  }} />
                </div>
                <span style={{ fontSize: 10, color: T.text, fontWeight: 700, width: 26, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{isDone ? m.value : 0}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RESULTS — Top-3 providers with score breakdown
// ═══════════════════════════════════════════════════════════════
function ResultsScreen({ onPick, onBack }) {
  const [expanded, setExpanded] = useStateF(0); // first card expanded by default
  const [sort, setSort] = useStateF("ai");

  return (
    <div style={{ height: "100%", background: T.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ height: PHONE.statusH }} />
      <TopBar title="Your top 3 matches" subtitle="Ranked by AI score" onBack={onBack}
        right={<Pill color={T.success} icon="check" size="sm">2.8s</Pill>} />

      <div style={{ padding: "8px 16px 18px", flex: 1, overflow: "auto" }}>
        {/* Sort chips */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {[{k:"ai",l:"AI Score"}, {k:"dist",l:"Distance"}, {k:"price",l:"Price"}, {k:"rating",l:"Rating"}].map(s => (
            <button key={s.k} onClick={() => setSort(s.k)} style={{
              padding: "6px 11px", borderRadius: 999, fontSize: 11, fontWeight: 700,
              background: sort === s.k ? T.primaryGlow : T.card,
              color: sort === s.k ? T.primaryLight : T.textSecondary,
              border: `1px solid ${sort === s.k ? T.primary + "66" : T.border}`,
              cursor: "pointer",
            }}>{s.l}</button>
          ))}
        </div>

        {PROVIDERS.map((p, i) => (
          <ProviderCard
            key={p.id} provider={p} rank={i + 1}
            expanded={expanded === i}
            onExpand={() => setExpanded(expanded === i ? -1 : i)}
            onBook={() => onPick(p)}
          />
        ))}

        {/* Inline AI reasoning footer */}
        <GlassCard accent={T.violet + "55"} style={{ marginTop: 14 }} glow={T.violet}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Icon name="sparkles" size={16} color={T.violet} />
            <span style={{ fontSize: 12, fontWeight: 800, color: T.violet, letterSpacing: 0.3 }}>WHY THIS ORDER?</span>
          </div>
          <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.6 }}>
            I weighted <b style={{ color: T.text }}>distance & rating most heavily</b> because your message indicated urgency.
            Ali Plumbing Works wins despite slightly higher price because it's <b style={{ color: T.success }}>0.7km away</b> and has the best emergency-response history nearby.
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function ProviderCard({ provider, rank, expanded, onExpand, onBook }) {
  const aiScore = rank === 1 ? 91 : rank === 2 ? 87 : 82;
  const isGold = rank === 1;
  return (
    <div style={{
      position: "relative", marginBottom: 10, borderRadius: 18,
      background: T.card, border: `1px solid ${isGold ? T.gold + "55" : T.border}`,
      boxShadow: isGold ? `0 18px 40px rgba(255,213,107,0.18)` : "0 10px 24px rgba(0,0,0,0.3)",
      overflow: "hidden",
      animation: `springIn 480ms cubic-bezier(.34,1.56,.64,1) both`,
      animationDelay: `${rank * 80}ms`,
    }}>
      {isGold && (
        // Shimmer overlay for gold
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `linear-gradient(115deg, transparent 30%, ${T.gold}28 50%, transparent 70%)`,
          backgroundSize: "200% 100%",
          animation: "shimmer 2.6s linear infinite",
        }} />
      )}

      <div style={{ padding: 12, display: "flex", gap: 12, position: "relative" }}>
        {/* Rank badge */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: isGold ? `linear-gradient(135deg, ${T.gold}, #C8A040)` : `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 900, color: "#1a1a1a",
            boxShadow: isGold ? `0 6px 16px ${T.gold}66` : `0 6px 16px ${T.primary}55`,
          }}>#{rank}</div>
          {isGold && <div style={{
            position: "absolute", top: -4, right: -4,
            width: 18, height: 18, borderRadius: 9,
            background: T.gold, display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #070710",
          }}><Icon name="sparkle" size={9} color="#1a1a1a" /></div>}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{provider.name}</span>
            {provider.verified && <Icon name="checkCircle" size={13} color={T.info} fill />}
          </div>
          <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name="location" size={10} color={T.textMuted} /> {provider.area} · {provider.distance}km away
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 3, color: T.warning, fontWeight: 700 }}>
              <Icon name="star" size={11} color={T.warning} fill /> {provider.rating}
              <span style={{ color: T.textMuted, fontWeight: 500 }}>({provider.reviews})</span>
            </span>
            <span style={{ color: T.success, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>₨{provider.price}</span>
            <span style={{ color: T.info, fontWeight: 700 }}>
              <Icon name="clock" size={10} color={T.info} /> {provider.eta}min
            </span>
          </div>
        </div>

        {/* AI score pill */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{
            position: "relative", width: 44, height: 44, borderRadius: 22,
            background: T.surface, display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${aiScore > 88 ? T.success : aiScore > 80 ? T.warning : T.info}`,
            boxShadow: `0 0 16px ${aiScore > 88 ? T.success : T.warning}33`,
          }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: T.text }}>{aiScore}</span>
          </div>
          <span style={{ fontSize: 8, color: T.textMuted, fontWeight: 700, letterSpacing: 0.8 }}>AI SCORE</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 12px 12px", animation: "slideDownExpand 320ms ease" }}>
          <div style={{ height: 1, background: T.border, marginBottom: 12 }} />
          <ScoreBar label="Distance"  value={92} color={T.success} delay={50} />
          <ScoreBar label="Rating"    value={96} color={T.warning} delay={120} />
          <ScoreBar label="Price"     value={78} color={T.info}    delay={190} />
          <ScoreBar label="Reviews"   value={85} color={T.violet}  delay={260} />

          <div style={{
            marginTop: 10, padding: 10, borderRadius: 12,
            background: `linear-gradient(135deg, ${T.violet}11, ${T.primary}11)`,
            border: `1px solid ${T.violet}33`,
            display: "flex", gap: 8,
          }}>
            <Icon name="sparkles" size={14} color={T.violet} />
            <div style={{ fontSize: 11.5, color: T.textSecondary, lineHeight: 1.5, flex: 1 }}>
              <b style={{ color: T.violet }}>AI says:</b> {provider.reason}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <PressButton variant="ghost" size="sm" icon="phone" fullWidth>Call</PressButton>
            <PressButton color={T.success} size="sm" icon="calendar" onClick={onBook} fullWidth>Book now</PressButton>
          </div>
        </div>
      )}

      <button onClick={onExpand} style={{
        width: "100%", padding: "8px", borderTop: `1px solid ${T.border}`,
        background: "transparent", border: "none", cursor: "pointer",
        color: T.textMuted, fontSize: 11, fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
      }}>
        {expanded ? "Hide breakdown" : "View AI breakdown"}
        <Icon name={expanded ? "chevU" : "chevD"} size={12} color={T.textMuted} />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BOOKING — 2x2 time slots + summary
// ═══════════════════════════════════════════════════════════════
function BookingScreen({ provider, onConfirm, onBack }) {
  const p = provider || PROVIDERS[0];
  const [slot, setSlot] = useStateF("Today · 3:00 PM");
  const slots = [
    "Today · 1:30 PM",
    "Today · 3:00 PM",
    "Today · 5:30 PM",
    "Tomorrow · 9:00 AM",
  ];
  const [notes, setNotes] = useStateF("Kitchen sink leak under cabinet");

  return (
    <div style={{ height: "100%", background: T.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ height: PHONE.statusH }} />
      <TopBar title="Confirm booking" onBack={onBack} />

      <div style={{ flex: 1, overflow: "auto", padding: "8px 18px 18px" }}>
        {/* Provider summary */}
        <GlassCard glow={T.primary}>
          <div style={{ display: "flex", gap: 12 }}>
            <Avatar name={p.name} size={52} color={T.primary} color2={T.violet} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{p.name}</div>
              <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 2 }}>{p.area} · {p.distance}km</div>
              <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 11 }}>
                <span style={{ color: T.warning, fontWeight: 700 }}>★ {p.rating}</span>
                <span style={{ color: T.info, fontWeight: 700 }}>{p.eta}min ETA</span>
                <span style={{ color: T.success, fontWeight: 700 }}>₨{p.price}</span>
              </div>
            </div>
          </div>
        </GlassCard>

        <SectionTitle title="Pick a time slot" accent={T.primary} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {slots.map(s => {
            const sel = slot === s;
            return (
              <button key={s} onClick={() => setSlot(s)} style={{
                padding: "12px 10px", borderRadius: 14,
                background: sel ? T.primaryGlow : T.card,
                border: `1.5px solid ${sel ? T.primary : T.border}`,
                color: sel ? T.primaryLight : T.text,
                fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                display: "flex", flexDirection: "column", gap: 4,
                boxShadow: sel ? `0 6px 18px ${T.primary}33` : "none",
                transition: "all 180ms",
              }}>
                <span style={{ fontSize: 10, color: sel ? T.primary : T.textMuted, fontWeight: 700, letterSpacing: 0.5 }}>
                  {s.split(" · ")[0].toUpperCase()}
                </span>
                <span>{s.split(" · ")[1]}</span>
              </button>
            );
          })}
        </div>

        <SectionTitle title="Issue notes" accent={T.info} />
        <div style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 14, padding: 12,
        }}>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            rows={3}
            style={{
              width: "100%", background: "transparent", border: "none", outline: "none",
              color: T.text, fontSize: 13, lineHeight: 1.5, resize: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        <SectionTitle title="Receipt" accent={T.success} />
        <GlassCard padding={0}>
          {[
            { l: "Service",         v: "Plumbing · Emergency" },
            { l: "Provider rate",   v: "₨1,200" },
            { l: "Platform fee",    v: "₨50" },
            { l: "Estimated arrival", v: `${p.eta} minutes` },
          ].map((r, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", padding: "12px 14px",
              borderBottom: i < 3 ? `1px solid ${T.border}` : "none",
              fontSize: 12,
            }}>
              <span style={{ color: T.textSecondary }}>{r.l}</span>
              <span style={{ color: T.text, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{r.v}</span>
            </div>
          ))}
          <div style={{
            display: "flex", justifyContent: "space-between", padding: "14px",
            background: T.surface, borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
            fontSize: 13,
          }}>
            <span style={{ color: T.text, fontWeight: 800 }}>Total</span>
            <span style={{ color: T.success, fontWeight: 900, fontSize: 16, fontVariantNumeric: "tabular-nums" }}>₨1,250</span>
          </div>
        </GlassCard>
      </div>

      <div style={{ padding: "12px 18px 14px", background: "rgba(7,7,16,0.94)", borderTop: `1px solid ${T.border}`, backdropFilter: "blur(14px)" }}>
        <PressButton color={T.success} icon="check" iconRight="arrow" onClick={() => onConfirm({ slot, notes })}>
          Confirm booking · ₨1,250
        </PressButton>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONFIRMATION — success animation + receipt + follow-ups
// ═══════════════════════════════════════════════════════════════
function ConfirmationScreen({ provider, onHome }) {
  const p = provider || PROVIDERS[0];
  const bookingId = "BK-7A3F-KHI";
  const followups = [
    { when: "10 min before arrival",      msg: "Your plumber is on the way. Ali is 8 mins away.",     icon: "bell" },
    { when: "After service complete",     msg: "How did it go? Tap to rate Ali Plumbing Works.",      icon: "star" },
    { when: "3 days later",               msg: "Hope the leak is sorted! Need a follow-up visit?",   icon: "chat" },
  ];
  const [confetti, setConfetti] = useStateF(true);
  useEffectF(() => { const t = setTimeout(() => setConfetti(false), 2500); return () => clearTimeout(t); }, []);

  return (
    <div style={{ height: "100%", background: `radial-gradient(circle at 50% 30%, rgba(16,217,160,0.20), transparent 55%), ${T.bg}`, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <div style={{ height: PHONE.statusH }} />

      {/* Confetti dots */}
      {confetti && Array.from({ length: 20 }).map((_, i) => {
        const colors = [T.success, T.primary, T.warning, T.info, T.violet];
        return <span key={i} style={{
          position: "absolute", left: `${(i / 20) * 100}%`, top: -10,
          width: 6, height: 8, background: colors[i % colors.length],
          borderRadius: 2, transform: `rotate(${i * 17}deg)`,
          animation: `confettiFall ${2 + (i % 4) * 0.3}s ease-in ${i * 60}ms forwards`,
        }} />;
      })}

      <div style={{ flex: 1, overflow: "auto", padding: "20px 22px" }}>
        {/* Success circle */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 92, height: 92, borderRadius: 46,
              background: `radial-gradient(circle, ${T.success}, ${T.successDark})`,
              boxShadow: `0 18px 40px ${T.success}66, 0 0 0 8px ${T.success}22`,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "springIn 700ms cubic-bezier(.34,1.56,.64,1)",
            }}>
              <Icon name="check" size={48} color="#fff" stroke={3} />
            </div>
            {/* Outer pulse rings */}
            {[0, 1].map(i => (
              <div key={i} style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                border: `2px solid ${T.success}`,
                animation: `pulseRing 2s ease-out ${i * 0.5}s infinite`,
              }} />
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: T.text, margin: 0, letterSpacing: -0.6 }}>Booking confirmed</h1>
          <p style={{ fontSize: 13, color: T.textSecondary, margin: "6px 0 0" }}>{p.name} will arrive in {p.eta} min</p>
        </div>

        {/* Digital receipt */}
        <GlassCard style={{ marginTop: 20 }} padding={0}>
          <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, letterSpacing: 1 }}>BOOKING ID</div>
              <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 14, fontWeight: 800, color: T.text, marginTop: 2 }}>
                {bookingId}
              </div>
            </div>
            <StatusBadge status="confirmed" />
          </div>
          {/* Perforation */}
          <div style={{
            display: "flex", padding: "0 6px", height: 14, alignItems: "center",
            position: "relative",
          }}>
            <div style={{ position: "absolute", left: -8, width: 16, height: 16, borderRadius: 8, background: T.bg }} />
            <div style={{ position: "absolute", right: -8, width: 16, height: 16, borderRadius: 8, background: T.bg }} />
            <div style={{ flex: 1, borderTop: `1px dashed ${T.borderLight}` }} />
          </div>

          <div style={{ padding: "10px 14px 14px" }}>
            {[
              { l: "Service",  v: "Emergency plumbing" },
              { l: "Provider", v: p.name },
              { l: "When",     v: "Today · 3:00 PM" },
              { l: "Address",  v: "DHA Phase 6, House 124-B" },
              { l: "Total",    v: "₨1,250" },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12 }}>
                <span style={{ color: T.textSecondary }}>{r.l}</span>
                <span style={{ color: T.text, fontWeight: 700 }}>{r.v}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* AI follow-ups */}
        <SectionTitle
          title="AI follow-ups scheduled"
          accent={T.violet}
          action={<Pill color={T.violet} icon="sparkle" size="sm">GEMINI</Pill>}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {followups.map((f, i) => (
            <div key={i} style={{
              display: "flex", gap: 10, padding: 12, borderRadius: 14,
              background: T.card, border: `1px solid ${T.border}`,
              animation: `slideInRight 460ms cubic-bezier(.22,1,.36,1) both`,
              animationDelay: `${600 + i * 100}ms`,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: `${T.violet}22`, border: `1px solid ${T.violet}55`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}><Icon name={f.icon} size={14} color={T.violet} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: T.violet, fontWeight: 700, letterSpacing: 0.6 }}>{f.when.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: T.text, marginTop: 2, lineHeight: 1.5 }}>{f.msg}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "12px 18px 14px", background: "rgba(7,7,16,0.94)", borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", gap: 8 }}>
          <PressButton variant="ghost" icon="phone" size="md">Call provider</PressButton>
          <PressButton color={T.primary} icon="home" onClick={onHome}>Done</PressButton>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SearchScreen, ReasoningScreen, ResultsScreen, BookingScreen, ConfirmationScreen });
