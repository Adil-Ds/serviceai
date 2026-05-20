// app.jsx — Top-level router, tab bar, screen picker
/* global React, ReactDOM, T, Icon, IOSDevice, TweaksPanel, useTweaks, TweakSection, TweakSelect, TweakToggle, TweakButton, PHONE,
   SplashScreen, WelcomeScreen, LoginScreen, RegisterScreen,
   SearchScreen, ReasoningScreen, ResultsScreen, BookingScreen, ConfirmationScreen,
   UserDashboard, LiveSearchScreen, BookingHistoryScreen, ProfileScreen, SettingsSub,
   ProviderDashboard, BookingRequestsScreen, ProviderProfileScreen */
const { useState: useStateApp, useEffect: useEffectApp, useRef: useRefApp, useMemo: useMemoApp, useCallback: useCallbackApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "screen": "user-dashboard",
  "role": "user",
  "showTabBar": true,
  "autoFlow": false
}/*EDITMODE-END*/;

// ─────────────────────────────────────────────────────────────
// Screen registry — every named screen the prototype can show
// ─────────────────────────────────────────────────────────────
const SCREEN_OPTIONS = [
  { value: "splash",            label: "Splash" },
  { value: "welcome",           label: "Welcome" },
  { value: "login",             label: "Login" },
  { value: "register",          label: "Register" },
  { value: "user-dashboard",    label: "User · Dashboard" },
  { value: "user-search",       label: "User · Search Input" },
  { value: "user-reasoning",    label: "User · Agent Reasoning" },
  { value: "user-results",      label: "User · Results" },
  { value: "user-booking",      label: "User · Booking" },
  { value: "user-confirm",      label: "User · Confirmation" },
  { value: "user-live",         label: "User · Live Map Radar" },
  { value: "user-history",      label: "User · Bookings" },
  { value: "user-profile",      label: "User · Profile" },
  { value: "user-appearance",   label: "Setting · Appearance" },
  { value: "user-language",     label: "Setting · Language" },
  { value: "user-notifs",       label: "Setting · Notifications" },
  { value: "user-help",         label: "Setting · Help" },
  { value: "user-edit",         label: "Setting · Edit profile" },
  { value: "prov-dashboard",    label: "Provider · Dashboard" },
  { value: "prov-requests",     label: "Provider · Booking requests" },
  { value: "prov-profile",      label: "Provider · Profile" },
];

// ─────────────────────────────────────────────────────────────
// Tab bar (user / provider variants)
// ─────────────────────────────────────────────────────────────
function TabBar({ active, onTab, role }) {
  const userTabs = [
    { k: "home",    l: "Home",     i: "home",     screen: "user-dashboard" },
    { k: "live",    l: "Live",     i: "wifi",     screen: "user-live", accent: T.success },
    { k: "search",  l: "Ask AI",   i: "sparkles", screen: "user-search", hero: true },
    { k: "history", l: "Bookings", i: "ticket",   screen: "user-history" },
    { k: "me",      l: "Profile",  i: "user",     screen: "user-profile" },
  ];
  const provTabs = [
    { k: "home",    l: "Home",     i: "home",   screen: "prov-dashboard" },
    { k: "req",     l: "Requests", i: "bell",   screen: "prov-requests", accent: T.warning },
    { k: "me",      l: "Profile",  i: "user",   screen: "prov-profile" },
  ];
  const tabs = role === "user" ? userTabs : provTabs;

  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0,
      height: PHONE.tabH, paddingBottom: 14,
      background: "rgba(7,7,16,0.92)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderTop: `1px solid ${T.border}`,
      display: "flex", alignItems: "stretch", padding: `4px 10px ${14}px`,
      zIndex: 40,
    }}>
      {tabs.map(t => {
        const isActive = active === t.screen;
        if (t.hero) {
          // Hero center tab (Ask AI)
          return (
            <button key={t.k} onClick={() => onTab(t.screen)} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: "none", cursor: "pointer",
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 18,
                background: `linear-gradient(135deg, ${T.primary}, ${T.violet})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 10px 24px ${T.primary}77, 0 0 0 4px rgba(108,99,255,0.15)`,
                transform: isActive ? "translateY(-6px) scale(1.05)" : "translateY(-2px)",
                transition: "transform 240ms cubic-bezier(.34,1.56,.64,1)",
                animation: "heroPulse 3s ease-in-out infinite",
              }}>
                <Icon name="sparkles" size={22} color="#fff" />
              </div>
            </button>
          );
        }
        const c = t.accent || (isActive ? T.primary : T.textMuted);
        return (
          <button key={t.k} onClick={() => onTab(t.screen)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 2, background: "transparent", border: "none", cursor: "pointer",
            position: "relative",
          }}>
            <div style={{
              width: 36, height: 28, borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: isActive ? `${c}22` : "transparent",
              transform: isActive ? "scale(1.05)" : "scale(1)",
              transition: "transform 200ms cubic-bezier(.34,1.56,.64,1), background 200ms ease",
            }}>
              <Icon name={t.i} size={18} color={c} stroke={isActive ? 2.2 : 1.7} />
            </div>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: c, letterSpacing: 0.3 }}>{t.l}</span>
            {isActive && (
              <div style={{
                position: "absolute", top: -3, left: "50%", transform: "translateX(-50%)",
                width: 18, height: 3, borderRadius: 2, background: c,
                boxShadow: `0 0 8px ${c}`,
                animation: "tabDot 280ms cubic-bezier(.34,1.56,.64,1)",
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Status bar inside the iOS device (fake, since we make a custom one)
// ─────────────────────────────────────────────────────────────
function FakeStatusBar() {
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: PHONE.statusH,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 28px", paddingTop: 16, zIndex: 50,
      pointerEvents: "none", color: T.text, fontSize: 14, fontWeight: 700,
    }}>
      <span>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {/* Signal */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
          {[3,5,7,9].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, borderRadius: 1, background: T.text }} />
          ))}
        </div>
        <Icon name="wifi" size={14} color={T.text} />
        {/* Battery */}
        <div style={{
          width: 24, height: 11, borderRadius: 3,
          border: `1px solid ${T.text}`, position: "relative", padding: 1,
        }}>
          <div style={{ width: "70%", height: "100%", background: T.success, borderRadius: 1.5 }} />
          <div style={{
            position: "absolute", right: -3, top: 3, width: 2, height: 5,
            borderRadius: 1, background: T.text,
          }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useStateApp(tweaks.screen);
  const [role, setRole] = useStateApp(tweaks.role);
  const [selectedProvider, setSelectedProvider] = useStateApp(null);
  const [searchQuery, setSearchQuery] = useStateApp("Plumber for kitchen sink leak");
  const [history, setHistory] = useStateApp([tweaks.screen]);

  // Sync tweaks → state
  useEffectApp(() => { if (tweaks.screen !== screen) setScreen(tweaks.screen); }, [tweaks.screen]);
  useEffectApp(() => { if (tweaks.role !== role) setRole(tweaks.role); }, [tweaks.role]);

  // Sync state → tweaks (persist last viewed screen)
  const go = useCallbackApp((s) => {
    setScreen(s);
    setHistory(h => [...h, s]);
    setTweak("screen", s);
  }, [setTweak]);

  const back = () => {
    setHistory(h => {
      if (h.length <= 1) return h;
      const nh = h.slice(0, -1);
      const prev = nh[nh.length - 1];
      setScreen(prev);
      setTweak("screen", prev);
      return nh;
    });
  };

  const switchRole = (r) => {
    setRole(r);
    setTweak("role", r);
    if (r === "user") go("user-dashboard");
    else go("prov-dashboard");
  };

  // Which screens should show the tab bar?
  const tabbedScreens = ["user-dashboard","user-live","user-history","user-profile","prov-dashboard","prov-requests","prov-profile"];
  const showTabBar = tweaks.showTabBar && tabbedScreens.includes(screen);

  // Render the screen
  const renderScreen = () => {
    switch (screen) {
      case "splash":         return <SplashScreen onDone={() => go("welcome")} />;
      case "welcome":        return <WelcomeScreen onPickRole={(r) => { switchRole(r); go("login"); }} />;
      case "login":          return <LoginScreen role={role} onLogin={() => go(role === "user" ? "user-dashboard" : "prov-dashboard")} onGoRegister={() => go("register")} />;
      case "register":       return <RegisterScreen role={role} onDone={() => go(role === "user" ? "user-dashboard" : "prov-dashboard")} onGoLogin={() => go("login")} />;

      case "user-dashboard": return <UserDashboard
                                      onSearch={() => go("user-search")}
                                      onCategory={() => go("user-search")}
                                      onOpenLive={() => go("user-live")} />;
      case "user-search":    return <SearchScreen
                                      onBack={back}
                                      onSubmit={(q) => { setSearchQuery(q); go("user-reasoning"); }} />;
      case "user-reasoning": return <ReasoningScreen
                                      query={searchQuery}
                                      onBack={back}
                                      onDone={() => go("user-results")} />;
      case "user-results":   return <ResultsScreen
                                      onBack={back}
                                      onPick={(p) => { setSelectedProvider(p); go("user-booking"); }} />;
      case "user-booking":   return <BookingScreen
                                      provider={selectedProvider}
                                      onBack={back}
                                      onConfirm={() => go("user-confirm")} />;
      case "user-confirm":   return <ConfirmationScreen
                                      provider={selectedProvider}
                                      onHome={() => go("user-dashboard")} />;
      case "user-live":      return <LiveSearchScreen
                                      autoStart
                                      onBack={back}
                                      onPick={(p) => { setSelectedProvider(p); go("user-booking"); }} />;
      case "user-history":   return <BookingHistoryScreen onOpen={() => go("user-confirm")} />;
      case "user-profile":   return <ProfileScreen
                                      onSub={(k) => go(`user-${k === "notif" ? "notifs" : k === "lang" ? "language" : k === "appear" ? "appearance" : k === "help" ? "help" : "edit"}`)}
                                      onLogout={() => go("welcome")} />;
      case "user-appearance":return <SettingsSub kind="appear" onBack={back} />;
      case "user-language":  return <SettingsSub kind="lang" onBack={back} />;
      case "user-notifs":    return <SettingsSub kind="notif" onBack={back} />;
      case "user-help":      return <SettingsSub kind="help" onBack={back} />;
      case "user-edit":      return <SettingsSub kind="edit" onBack={back} />;

      case "prov-dashboard": return <ProviderDashboard onRequests={() => go("prov-requests")} onProfile={() => go("prov-profile")} onOpenRequest={() => go("prov-requests")} />;
      case "prov-requests":  return <BookingRequestsScreen onBack={back} />;
      case "prov-profile":   return <ProviderProfileScreen onBack={back} onLogout={() => go("welcome")} />;

      default: return <UserDashboard onSearch={() => go("user-search")} onCategory={() => go("user-search")} onOpenLive={() => go("user-live")} />;
    }
  };

  return (
    <div style={{
      width: "100vw", minHeight: "100vh", padding: 24,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#08080F",
      backgroundImage: "radial-gradient(circle at 20% 30%, rgba(108,99,255,0.10) 0%, transparent 55%), radial-gradient(circle at 80% 70%, rgba(16,217,160,0.08) 0%, transparent 55%)",
      fontFamily: '-apple-system, system-ui, "Segoe UI", sans-serif',
      color: T.text,
    }}>
      <IOSDevice width={PHONE.w} height={PHONE.h} dark={true}>
        <div style={{
          position: "relative", width: "100%", height: "100%",
          background: T.bg, overflow: "hidden",
        }}>
        <div key={screen} style={{
            width: "100%", height: "100%",
            animation: "screenIn 360ms cubic-bezier(.22,1,.36,1) both",
            paddingBottom: showTabBar ? PHONE.tabH : 0,
            boxSizing: "border-box",
          }}>
            {renderScreen()}
          </div>

          {showTabBar && <TabBar active={screen} onTab={go} role={role} />}
        </div>
      </IOSDevice>

      <TweaksPanel title="Prototype">
        <TweakSection label="Navigate">
          <TweakSelect label="Screen" value={screen} options={SCREEN_OPTIONS}
            onChange={(v) => { setTweak("screen", v); go(v); }} />
          <TweakSelect label="Role" value={role}
            options={[{ value: "user", label: "Service Seeker" }, { value: "provider", label: "Service Provider" }]}
            onChange={(v) => { setTweak("role", v); switchRole(v); }} />
        </TweakSection>
        <TweakSection label="Display">
          <TweakToggle label="Show tab bar" value={tweaks.showTabBar}
            onChange={(v) => setTweak("showTabBar", v)} />
        </TweakSection>
        <TweakSection label="Quick jumps">
          <TweakButton label="▶ Run full user flow" onClick={() => go("splash")} />
          <TweakButton label="↩ Back" onClick={back} secondary />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
