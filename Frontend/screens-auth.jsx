// screens-auth.jsx — Splash, Welcome, Login, Register
/* global React, T, Icon, GlassCard, PressButton, Pill, LiveDot, Avatar, PHONE */
const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;

// ═══════════════════════════════════════════════════════════════
// SPLASH — Ambient rings + breathing logo + loading dots
// ═══════════════════════════════════════════════════════════════
function SplashScreen({ onDone }) {
  useEffectA(() => {
    const t = setTimeout(() => onDone && onDone(), 2400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{
      width: "100%", height: "100%", background: T.bg, position: "relative",
      overflow: "hidden", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
    }}>
      {/* Ambient radial glows */}
      <div style={{ position: "absolute", inset: 0,
        background: "radial-gradient(circle at 50% 35%, rgba(108,99,255,0.20), transparent 55%), radial-gradient(circle at 60% 75%, rgba(16,217,160,0.12), transparent 55%)" }} />

      {/* Expanding rings */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: "absolute", left: "50%", top: "38%",
          width: 0, height: 0, borderRadius: "50%",
          border: `2px solid ${T.primary}`,
          transform: "translate(-50%,-50%)",
          animation: `splashRing 2.6s cubic-bezier(.16,.84,.44,1) infinite`,
          animationDelay: `${i * 0.6}s`,
        }} />
      ))}

      {/* Logo mark */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <div style={{
          width: 96, height: 96, borderRadius: 26,
          background: `linear-gradient(135deg, ${T.primary}, ${T.violet} 60%, ${T.pink})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 30px 70px ${T.primary}66, 0 0 0 1px rgba(255,255,255,0.1)`,
          animation: "logoBreathe 3s ease-in-out infinite",
        }}>
          <Icon name="sparkles" size={42} color="#fff" stroke={2.2} />
        </div>
        {/* Orbiting dots */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: "absolute", top: 48, left: 48,
            width: 8, height: 8, borderRadius: 4,
            background: i === 0 ? T.success : i === 1 ? T.info : T.warning,
            boxShadow: `0 0 12px currentColor`,
            transformOrigin: "0 0",
            animation: `orbit 3s linear infinite`,
            animationDelay: `${i * -1}s`,
            ["--orbit-r"]: "78px",
            color: i === 0 ? T.success : i === 1 ? T.info : T.warning,
          }} />
        ))}
      </div>

      <div style={{ marginTop: 28, textAlign: "center", zIndex: 2 }}>
        <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.8,
          background: `linear-gradient(135deg, #fff, ${T.primaryLight})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>ServiceAI</div>
        <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 6, letterSpacing: 2 }}>
          AGENT&nbsp;·&nbsp;BOOK&nbsp;·&nbsp;DONE
        </div>
      </div>

      {/* Loading bar */}
      <div style={{ position: "absolute", bottom: 64, left: 60, right: 60,
        height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: "40%",
          background: `linear-gradient(90deg, transparent, ${T.primary}, ${T.violet}, transparent)`,
          animation: "loadingBar 1.6s cubic-bezier(.4,0,.6,1) infinite",
        }} />
      </div>

      <Pill color={T.violet} icon="sparkle" style={{ position: "absolute", bottom: 30 }}>
        POWERED BY GEMINI
      </Pill>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WELCOME — Role picker w/ feature rows
// ═══════════════════════════════════════════════════════════════
function WelcomeScreen({ onPickRole }) {
  const features = [
    { icon: "sparkle",  text: "Describe needs in Urdu or English",  color: T.info },
    { icon: "cpu",      text: "5 AI agents find your perfect match", color: T.primary },
    { icon: "target",   text: "Booked & confirmed in under 60s",     color: T.success },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column",
      background: `radial-gradient(circle at 50% 0%, rgba(108,99,255,0.25), transparent 60%), ${T.bg}` }}>
      <div style={{ paddingTop: PHONE.statusH + 8, padding: `${PHONE.statusH + 8}px 24px 0` }}>
        <Pill color={T.success} icon="live" size="sm">REAL-TIME</Pill>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1.2, color: T.text, margin: "12px 0 8px", lineHeight: 1.05 }}>
          Find any service<br/>
          <span style={{
            background: `linear-gradient(135deg, ${T.primary}, ${T.violet}, ${T.pink})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>in seconds.</span>
        </h1>
        <p style={{ fontSize: 13, color: T.textSecondary, margin: 0, lineHeight: 1.5 }}>
          AI agents that listen, search, rank, and book — all from one message.
        </p>

        {/* Features */}
        <div style={{ marginTop: 22 }}>
          {features.map((f, i) => (
            <div key={i} className="featureRow" style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 14, marginBottom: 8,
              background: T.card, border: `1px solid ${T.border}`,
              animation: `slideInLeft 500ms cubic-bezier(.22,1,.36,1) both`,
              animationDelay: `${i * 80}ms`,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${f.color}22`, border: `1px solid ${f.color}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}><Icon name={f.icon} size={17} color={f.color} /></div>
              <div style={{ fontSize: 13, color: T.text, fontWeight: 600, flex: 1 }}>{f.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Role picker — springs in */}
      <div style={{ marginTop: "auto", padding: "24px 20px 28px" }}>
        <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 }}>
          I AM A...
        </div>
        {[
          { role: "user", title: "Service Seeker", sub: "Find plumbers, doctors, tutors near you", color: T.primary, icon: "user" },
          { role: "provider", title: "Service Provider", sub: "Get AI-matched bookings to your inbox", color: T.warning, icon: "wrench" },
        ].map((r, i) => (
          <button key={r.role} onClick={() => onPickRole(r.role)} style={{
            width: "100%", textAlign: "left", marginBottom: 10,
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 16, padding: 14, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 12,
            animation: `springIn 500ms cubic-bezier(.34,1.56,.64,1) both`,
            animationDelay: `${300 + i * 80}ms`,
            transition: "transform 180ms ease, border-color 200ms ease, box-shadow 200ms ease",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = r.color; e.currentTarget.style.boxShadow = `0 14px 32px ${r.color}33`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = ""; }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: `linear-gradient(135deg, ${r.color}, ${shade(r.color, -20)})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 8px 18px ${r.color}55`,
            }}><Icon name={r.icon} size={22} color="#fff" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{r.title}</div>
              <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 2 }}>{r.sub}</div>
            </div>
            <Icon name="chevR" size={18} color={T.textMuted} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOGIN — Premium glow inputs
// ═══════════════════════════════════════════════════════════════
function FocusInput({ icon, value, onChange, placeholder, type = "text", color = T.primary }) {
  const [focus, setFocus] = useStateA(false);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: T.card, borderRadius: 14,
      border: `1.5px solid ${focus ? color : T.border}`,
      padding: "13px 14px",
      boxShadow: focus ? `0 0 0 4px ${color}22, 0 8px 20px ${color}22` : "0 6px 14px rgba(0,0,0,0.18)",
      transition: "all 220ms ease",
    }}>
      <Icon name={icon} size={16} color={focus ? color : T.textMuted} />
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} type={type}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          flex: 1, background: "transparent", border: "none", outline: "none",
          color: T.text, fontSize: 14,
        }}
      />
    </div>
  );
}

function LoginScreen({ role = "user", onLogin, onGoRegister }) {
  const [email, setEmail] = useStateA("ali@karachi.pk");
  const [pass, setPass] = useStateA("•••••••••");
  const accent = role === "user" ? T.primary : T.warning;

  return (
    <div style={{ height: "100%", padding: `${PHONE.statusH + 16}px 22px 24px`, display: "flex", flexDirection: "column",
      background: `radial-gradient(circle at 0% 0%, ${accent}22, transparent 60%), ${T.bg}` }}>
      <Pill color={accent} icon={role === "user" ? "user" : "wrench"}>
        SIGNING IN AS {role === "user" ? "SEEKER" : "PROVIDER"}
      </Pill>
      <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.8, color: T.text, margin: "16px 0 6px" }}>
        Welcome back
      </h1>
      <p style={{ fontSize: 13, color: T.textSecondary, margin: 0 }}>Sign in to continue to ServiceAI.</p>

      <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 10 }}>
        <FocusInput icon="mail" value={email} onChange={setEmail} placeholder="Email" color={accent} />
        <FocusInput icon="lock" value={pass} onChange={setPass} placeholder="Password" type="password" color={accent} />
        <div style={{ textAlign: "right", marginTop: 2 }}>
          <a style={{ fontSize: 11, color: accent, fontWeight: 600 }}>Forgot password?</a>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <PressButton color={accent} icon="arrow" onClick={onLogin}>Sign in</PressButton>
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 14px" }}>
        <div style={{ flex: 1, height: 1, background: T.border }} />
        <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, letterSpacing: 1.2 }}>OR CONTINUE WITH</span>
        <div style={{ flex: 1, height: 1, background: T.border }} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {[{ i: "google", l: "Google" }, { i: "apple", l: "Apple" }, { i: "fb", l: "Meta" }].map(s => (
          <button key={s.i} style={{
            flex: 1, height: 48, borderRadius: 14,
            background: T.card, border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            cursor: "pointer",
          }}>
            <Icon name={s.i} size={18} color={T.text} />
            <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{s.l}</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: "auto", textAlign: "center", fontSize: 13, color: T.textSecondary }}>
        Don't have an account?{" "}
        <a onClick={onGoRegister} style={{ color: accent, fontWeight: 700, cursor: "pointer" }}>Sign up</a>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REGISTER — multi-input with strength meter
// ═══════════════════════════════════════════════════════════════
function RegisterScreen({ role = "user", onDone, onGoLogin }) {
  const [name, setName] = useStateA("Asad Khan");
  const [email, setEmail] = useStateA("");
  const [pass, setPass] = useStateA("");
  const accent = role === "user" ? T.primary : T.warning;
  const strength = Math.min(4, Math.floor(pass.length / 3));
  const strLabels = ["Too short", "Weak", "Okay", "Good", "Strong"];
  const strColors = [T.danger, T.danger, T.warning, T.info, T.success];

  return (
    <div style={{ height: "100%", padding: `${PHONE.statusH + 16}px 22px 24px`, display: "flex", flexDirection: "column",
      background: `radial-gradient(circle at 100% 0%, ${accent}22, transparent 55%), ${T.bg}` }}>
      <Pill color={accent} icon={role === "user" ? "user" : "wrench"}>
        SIGN UP AS {role === "user" ? "SEEKER" : "PROVIDER"}
      </Pill>
      <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.8, color: T.text, margin: "16px 0 6px" }}>
        Create account
      </h1>
      <p style={{ fontSize: 13, color: T.textSecondary, margin: 0 }}>One minute and you're in.</p>

      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
        <FocusInput icon="user" value={name} onChange={setName} placeholder="Full name" color={accent} />
        <FocusInput icon="mail" value={email} onChange={setEmail} placeholder="Email" color={accent} />
        <FocusInput icon="lock" value={pass} onChange={setPass} placeholder="Password" type="password" color={accent} />

        {/* Strength meter */}
        <div style={{ marginTop: 2 }}>
          <div style={{ display: "flex", gap: 3 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i < strength ? strColors[strength] : T.border,
                transition: "background 200ms ease",
              }} />
            ))}
          </div>
          <div style={{ fontSize: 10, color: pass ? strColors[strength] : T.textMuted, marginTop: 5, fontWeight: 600 }}>
            {pass ? strLabels[strength] : "Use 8+ chars, mix letters & numbers"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <PressButton color={accent} icon="check" onClick={onDone}>Create account</PressButton>
      </div>

      <div style={{ fontSize: 11, color: T.textMuted, marginTop: 14, textAlign: "center", lineHeight: 1.5 }}>
        By signing up you agree to our <span style={{ color: T.textSecondary }}>Terms</span> and <span style={{ color: T.textSecondary }}>Privacy Policy</span>.
      </div>

      <div style={{ marginTop: "auto", textAlign: "center", fontSize: 13, color: T.textSecondary }}>
        Already have one?{" "}
        <a onClick={onGoLogin} style={{ color: accent, fontWeight: 700, cursor: "pointer" }}>Sign in</a>
      </div>
    </div>
  );
}

function shade(hex, percent) {
  const n = parseInt(hex.replace("#", ""), 16);
  let r = (n >> 16) + Math.round(255 * percent / 100);
  let g = ((n >> 8) & 0xff) + Math.round(255 * percent / 100);
  let b = (n & 0xff) + Math.round(255 * percent / 100);
  r = Math.min(255, Math.max(0, r)); g = Math.min(255, Math.max(0, g)); b = Math.min(255, Math.max(0, b));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

Object.assign(window, { SplashScreen, WelcomeScreen, LoginScreen, RegisterScreen });
