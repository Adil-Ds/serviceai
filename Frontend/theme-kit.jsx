// theme-kit.jsx — Shared theme tokens, icons, and reusable primitives
// All globals exported to window at bottom.
const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

const T = {
  bg:        "#070710",
  surface:   "#0D0D1C",
  card:      "#111127",
  cardAlt:   "#161630",
  elevated:  "#1A1A38",
  border:    "#1E1E40",
  borderLight: "#2A2A55",
  primary:   "#6C63FF",
  primaryDark: "#5549E8",
  primaryLight: "#8B85FF",
  primaryGlow: "rgba(108,99,255,0.18)",
  primaryGlowStrong: "rgba(108,99,255,0.32)",
  success:   "#10D9A0",
  successDark: "#0CB888",
  successGlow: "rgba(16,217,160,0.16)",
  warning:   "#F59E0B",
  warningGlow: "rgba(245,158,11,0.16)",
  danger:    "#EF4444",
  dangerGlow: "rgba(239,68,68,0.16)",
  info:      "#38BDF8",
  infoGlow:  "rgba(56,189,248,0.18)",
  violet:    "#A78BFA",
  pink:      "#EC4899",
  amber:     "#FFB020",
  gold:      "#FFD56B",
  provider:  "#F59E0B",
  text:      "#EEEEFF",
  textSecondary: "#A6A6CC",
  textMuted: "#7878A8",
  textDim:   "#404068",
  textInverse: "#070710",

  // Agent colors
  a1: "#38BDF8",  // intent
  a2: "#6C63FF",  // search
  a3: "#10D9A0",  // rank
  a4: "#F59E0B",  // book
  a5: "#A78BFA",  // followup
};

// ─────────────────────────────────────────────────────────────
// Icon — inline SVGs, sharp and consistent
// ─────────────────────────────────────────────────────────────
function Icon({ name, size = 18, color = "currentColor", stroke = 1.7, fill = false }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: fill ? color : "none", stroke: fill ? "none" : color, strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  const I = {
    search:    <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
    back:      <svg {...p}><path d="M15 18l-6-6 6-6"/></svg>,
    fwd:       <svg {...p}><path d="m9 6 6 6-6 6"/></svg>,
    close:     <svg {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>,
    home:      <svg {...p}><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></svg>,
    grid:      <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
    user:      <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></svg>,
    bell:      <svg {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 10H3c0-3 3-3 3-10"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>,
    clock:     <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
    calendar:  <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
    star:      <svg {...p} fill={fill ? color : "none"}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01z"/></svg>,
    bolt:      <svg {...p}><path d="M13 2 4 13h7l-1 9 9-11h-7z"/></svg>,
    sparkle:   <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>,
    sparkles:  <svg {...p}><path d="M12 2 13.5 8.5 20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z"/><path d="M19 3v3M19 16v3M3 19v2"/></svg>,
    location:  <svg {...p}><path d="M12 21s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>,
    phone:     <svg {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    nav:       <svg {...p}><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>,
    mic:       <svg {...p}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>,
    plumber:   <svg {...p}><path d="M9 3v5a3 3 0 0 0 3 3v0a3 3 0 0 0 3-3V3"/><path d="M7 3h10"/><path d="M12 11v10"/><path d="M9 21h6"/></svg>,
    medkit:    <svg {...p}><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/><path d="M12 11v6M9 14h6"/></svg>,
    book:      <svg {...p}><path d="M4 19.5V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2 2 2 0 0 1 2-2h13"/></svg>,
    snow:      <svg {...p}><path d="M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07 19.07 4.93"/></svg>,
    hammer:    <svg {...p}><path d="M15 12 7 4 3 8l8 8"/><path d="m11 16 6 6 5-5-6-6"/></svg>,
    broom:     <svg {...p}><path d="M19 4l-7 7M14 10l-9 9 4 1 6-6"/><path d="M5 19h6"/></svg>,
    paint:     <svg {...p}><path d="M19 11V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8"/><path d="M19 11h2v6h-6v-2a4 4 0 0 1 4-4z"/></svg>,
    wrench:    <svg {...p}><path d="M14.7 6.3a4 4 0 0 1 5 5L11 20a4.5 4.5 0 1 1-7-7l8.7-8.7"/></svg>,
    chef:      <svg {...p}><path d="M6 13a3 3 0 0 1-3-3 4 4 0 0 1 6-3.5 4 4 0 0 1 6 0A4 4 0 0 1 21 10a3 3 0 0 1-3 3"/><path d="M6 13v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/></svg>,
    shield:    <svg {...p}><path d="M12 2 4 5v6c0 5 3 9 8 11 5-2 8-6 8-11V5l-8-3z"/></svg>,
    bug:       <svg {...p}><rect x="8" y="6" width="8" height="14" rx="4"/><path d="M3 8l4 2M21 8l-4 2M3 16l4-2M21 16l-4-2M9 6V4M15 6V4"/></svg>,
    check:     <svg {...p}><path d="m5 12 5 5 9-11"/></svg>,
    checkCircle:<svg {...p}><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>,
    arrow:     <svg {...p}><path d="M5 12h14m-5-6 6 6-6 6"/></svg>,
    arrowDown: <svg {...p}><path d="M12 5v14m-6-6 6 6 6-6"/></svg>,
    arrowUp:   <svg {...p}><path d="M12 19V5m-6 6 6-6 6 6"/></svg>,
    chevR:     <svg {...p}><path d="m9 6 6 6-6 6"/></svg>,
    chevD:     <svg {...p}><path d="m6 9 6 6 6-6"/></svg>,
    chevU:     <svg {...p}><path d="m6 15 6-6 6 6"/></svg>,
    plus:      <svg {...p}><path d="M12 5v14M5 12h14"/></svg>,
    minus:     <svg {...p}><path d="M5 12h14"/></svg>,
    settings:  <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2.1-1.6-2-3.4-2.4 1A7 7 0 0 0 14 5.2L13.5 3h-3L10 5.2a7 7 0 0 0-2.5 1.6l-2.4-1-2 3.4 2.1 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2L3 14.8l2 3.4 2.4-1c.7.7 1.6 1.2 2.5 1.6l.5 2.2h3l.5-2.2c.9-.4 1.8-.9 2.5-1.6l2.4 1 2-3.4-2.1-1.6c.1-.4.1-.8.1-1.2z"/></svg>,
    moon:      <svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>,
    sun:       <svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>,
    globe:     <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>,
    info:      <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v5h1"/></svg>,
    help:      <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2l-1 1c-.5.5-.5 1-.5 1.5M12 17.5v.01"/></svg>,
    logout:    <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
    edit:      <svg {...p}><path d="M11 4H4v16h16v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>,
    cash:      <svg {...p}><rect x="3" y="7" width="18" height="11" rx="2"/><circle cx="12" cy="12.5" r="2.5"/><path d="M7 12h.01M17 12h.01"/></svg>,
    trend:     <svg {...p}><path d="m3 17 6-6 4 4 8-9M14 6h7v7"/></svg>,
    hash:      <svg {...p}><path d="M4 9h16M4 15h16M10 3l-2 18M16 3l-2 18"/></svg>,
    wifi:      <svg {...p}><path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1" fill={color} stroke="none"/></svg>,
    layers:    <svg {...p}><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
    filter:    <svg {...p}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></svg>,
    eye:       <svg {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>,
    lock:      <svg {...p}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>,
    mail:      <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/></svg>,
    google:    <svg viewBox="0 0 24 24" width={size} height={size}><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6.2c-.3 1.5-1.1 2.7-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.4z"/><path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.6-2-6.5-4.8H1.7v3C3.6 21.4 7.5 24 12 24z"/><path fill="#FBBC04" d="M5.5 14.6a7 7 0 0 1 0-5.2v-3H1.7a12 12 0 0 0 0 11.2l3.8-3z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.5 0 3.6 2.6 1.7 6.4l3.8 3C6.4 6.8 9 4.8 12 4.8z"/></svg>,
    apple:     <svg viewBox="0 0 24 24" width={size} height={size} fill={color}><path d="M17.6 12.7c0-2.6 2.1-3.8 2.2-3.9-1.2-1.7-3-2-3.7-2-1.6-.2-3 .9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.4 1-4.3 2.6-1.8 3.2-.5 7.9 1.3 10.5.9 1.3 1.9 2.7 3.3 2.6 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.2-2.5 1-1.5 1.4-2.9 1.4-3-.1 0-2.7-1-2.8-4.3zM15 4.8c.7-.9 1.2-2.1 1-3.4-1.1.1-2.3.7-3.1 1.6-.7.8-1.3 2-1.1 3.3 1.3.1 2.5-.6 3.2-1.5z"/></svg>,
    fb:        <svg viewBox="0 0 24 24" width={size} height={size} fill={color}><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/></svg>,
    fire:      <svg {...p}><path d="M12 22c-4 0-7-3-7-6 0-3 2-4 3-5 0-2 1-5 4-8 1 3 4 5 4 9 1-1 3-1 3 4 0 3-3 6-7 6z"/></svg>,
    rupee:     <svg {...p}><path d="M6 3h12M6 8h12M14 13c0 5-4 8-8 8l9-13M6 13h4"/></svg>,
    waveform:  <svg {...p}><path d="M3 12h2v0M7 8v8M11 5v14M15 9v6M19 11v2M21 12h0"/></svg>,
    flame:     <svg {...p} fill={color} stroke="none"><path d="M12 22a7 7 0 0 1-7-7c0-3 2-5 3-6 0 4 3 3 3-1 0-3-2-4-2-7 4 2 6 6 6 9 1-1 2-1 2 1 0 6-1 11-5 11z"/></svg>,
    activity:  <svg {...p}><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>,
    cpu:       <svg {...p}><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 9h6v6H9z"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg>,
    target:    <svg {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill={color} stroke="none"/></svg>,
    chat:      <svg {...p}><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2z"/></svg>,
    list:      <svg {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>,
    pin:       <svg {...p}><path d="M12 2v8M12 18v3M7 9h10l-2 4H9z"/></svg>,
    ticket:    <svg {...p}><path d="M3 7v4a2 2 0 0 1 0 2v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 0 1 0-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/><path d="M12 5v14"/></svg>,
    live:      <svg {...p} fill={color} stroke="none"><circle cx="12" cy="12" r="4"/></svg>,
    cancel:    <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6m0-6-6 6"/></svg>,
  };
  return I[name] || <svg {...p}><circle cx="12" cy="12" r="2"/></svg>;
}

// ─────────────────────────────────────────────────────────────
// Phone / safe area constants
// ─────────────────────────────────────────────────────────────
const PHONE = { w: 390, h: 844, statusH: 56, tabH: 76, homeH: 34 };

// ─────────────────────────────────────────────────────────────
// Primitive: GlassCard, PressButton, Pill, StatusBadge, Skeleton
// ─────────────────────────────────────────────────────────────
function GlassCard({ children, style, glow, accent, onClick, padding = 14, ...rest }) {
  return (
    <div onClick={onClick} style={{
      background: "rgba(17,17,39,0.85)",
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
      border: `1px solid ${accent || T.border}`,
      borderRadius: 18,
      padding,
      position: "relative",
      boxShadow: glow ? `0 14px 40px rgba(0,0,0,0.45), 0 0 0 1px ${glow}22, 0 0 30px ${glow}33` : "0 12px 32px rgba(0,0,0,0.4)",
      cursor: onClick ? "pointer" : undefined,
      ...style,
    }} {...rest}>{children}</div>
  );
}

function PressButton({ children, onClick, color = T.primary, variant = "solid", size = "md", style, disabled, glow = true, icon, iconRight, fullWidth = true }) {
  const [pressed, setPressed] = useState(false);
  const sizes = {
    sm: { h: 36, px: 14, fs: 12, r: 11 },
    md: { h: 48, px: 18, fs: 14, r: 14 },
    lg: { h: 56, px: 22, fs: 15, r: 16 },
  };
  const s = sizes[size];
  const bg = variant === "solid"
    ? `linear-gradient(135deg, ${color} 0%, ${shade(color, -15)} 100%)`
    : variant === "ghost" ? "transparent"
    : variant === "tonal" ? `${color}22`
    : T.card;
  const border = variant === "ghost" ? `1px solid ${T.border}` : variant === "tonal" ? `1px solid ${color}44` : "none";
  const txt = variant === "solid" ? "#fff" : color;
  return (
    <button onClick={onClick} disabled={disabled}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        height: s.h, padding: `0 ${s.px}px`, borderRadius: s.r,
        background: disabled ? T.card : bg,
        border: border,
        color: disabled ? T.textDim : txt,
        fontSize: s.fs, fontWeight: 700, letterSpacing: 0.2,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        width: fullWidth ? "100%" : undefined,
        boxShadow: !disabled && glow && variant === "solid" ? `0 10px 26px ${color}55` : "none",
        transform: pressed && !disabled ? "scale(0.97)" : "scale(1)",
        transition: "transform 120ms cubic-bezier(.34,1.56,.64,1), box-shadow 200ms ease",
        ...style,
      }}>
      {icon && <Icon name={icon} size={s.fs + 2} color="currentColor" />}
      {children}
      {iconRight && <Icon name={iconRight} size={s.fs + 2} color="currentColor" />}
    </button>
  );
}

function shade(hex, percent) {
  const n = parseInt(hex.replace("#", ""), 16);
  let r = (n >> 16) + Math.round(255 * percent / 100);
  let g = ((n >> 8) & 0xff) + Math.round(255 * percent / 100);
  let b = (n & 0xff) + Math.round(255 * percent / 100);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

function Pill({ children, color = T.primary, icon, size = "md", variant = "tonal", style }) {
  const fs = size === "sm" ? 9 : size === "lg" ? 12 : 10.5;
  const padY = size === "sm" ? 3 : 4;
  const padX = size === "sm" ? 7 : 9;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: variant === "solid" ? color : `${color}22`,
      border: variant === "solid" ? "none" : `1px solid ${color}55`,
      color: variant === "solid" ? "#fff" : color,
      fontSize: fs, fontWeight: 700, letterSpacing: 0.4,
      padding: `${padY}px ${padX}px`,
      borderRadius: 999,
      ...style,
    }}>
      {icon && <Icon name={icon} size={fs} color="currentColor" />}
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:   { color: T.warning, label: "Pending",   icon: "clock" },
    confirmed: { color: T.success, label: "Confirmed", icon: "check" },
    cancelled: { color: T.danger,  label: "Cancelled", icon: "cancel" },
    completed: { color: T.info,    label: "Completed", icon: "checkCircle" },
    live:      { color: T.success, label: "Live",      icon: "live" },
  };
  const s = map[status] || map.pending;
  return <Pill color={s.color} icon={s.icon}>{s.label}</Pill>;
}

function Skeleton({ width = "100%", height = 14, radius = 6, style }) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}

// ─────────────────────────────────────────────────────────────
// Live indicator dot (blinking)
// ─────────────────────────────────────────────────────────────
function LiveDot({ color = T.success, size = 8 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: size / 2, background: color,
      boxShadow: `0 0 ${size + 2}px ${color}`, display: "inline-block",
      animation: "blink 1.4s ease-in-out infinite",
    }} />
  );
}

// ─────────────────────────────────────────────────────────────
// Typewriter — character-by-character
// ─────────────────────────────────────────────────────────────
function Typewriter({ text, speed = 22, onDone, style, cursor = true }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setN(i);
      if (i >= text.length) {
        clearInterval(id);
        onDone && onDone();
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return (
    <span style={style}>
      {text.slice(0, n)}
      {cursor && n < text.length && <span style={{
        display: "inline-block", width: 1.5, height: "0.95em",
        background: "currentColor", marginLeft: 2, marginBottom: -2,
        animation: "blink 0.85s steps(1) infinite",
      }} />}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Thinking dots
// ─────────────────────────────────────────────────────────────
function ThinkingDots({ color = T.textSecondary, size = 5 }) {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center", verticalAlign: "middle" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: size, height: size, borderRadius: size / 2, background: color,
          animation: `thinkDot 1.2s ease-in-out ${i * 0.15}s infinite`,
        }} />
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Score bar — animated fill
// ─────────────────────────────────────────────────────────────
function ScoreBar({ label, value, max = 100, color = T.primary, delay = 0, suffix = "" }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11 }}>
        <span style={{ color: T.textSecondary, fontWeight: 600 }}>{label}</span>
        <span style={{ color: T.text, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}{suffix}</span>
      </div>
      <div style={{
        height: 6, background: T.surface, borderRadius: 3, overflow: "hidden",
        border: `1px solid ${T.border}`,
      }}>
        <div style={{
          height: "100%",
          width: `${(shown / max) * 100}%`,
          background: `linear-gradient(90deg, ${color}, ${shade(color, 15)})`,
          borderRadius: 3,
          boxShadow: `0 0 12px ${color}66`,
          transition: "width 900ms cubic-bezier(.22,1,.36,1)",
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Avatar — initials gradient
// ─────────────────────────────────────────────────────────────
function Avatar({ name = "AS", size = 44, color = T.primary, color2 }) {
  const initials = name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: `linear-gradient(135deg, ${color}, ${color2 || shade(color, -20)})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 800, color: "#fff",
      letterSpacing: -0.3,
      boxShadow: `0 6px 18px ${color}55, inset 0 1px 0 rgba(255,255,255,0.2)`,
    }}>{initials}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section header
// ─────────────────────────────────────────────────────────────
function SectionTitle({ title, action, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, marginBottom: 10 }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: -0.2, display: "flex", alignItems: "center", gap: 7 }}>
        {accent && <span style={{ width: 3, height: 14, borderRadius: 2, background: accent }} />}
        {title}
      </h3>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Top bar (custom nav bar inside screens)
// ─────────────────────────────────────────────────────────────
function TopBar({ title, subtitle, onBack, right, transparent }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 16px 12px",
      background: transparent ? "transparent" : "rgba(7,7,16,0.85)",
      backdropFilter: transparent ? "none" : "blur(14px)",
      WebkitBackdropFilter: transparent ? "none" : "blur(14px)",
      borderBottom: transparent ? "none" : `1px solid ${T.border}`,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: 12,
          background: T.card, border: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}><Icon name="back" size={16} color={T.text} /></button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontSize: 17, fontWeight: 800, color: T.text, letterSpacing: -0.3 }}>{title}</div>}
        {subtitle && <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 1 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────
const SERVICES = [
  { key: "plumber",     label: "Plumber",     icon: "plumber", color: T.info },
  { key: "electrician", label: "Electrician", icon: "bolt",    color: T.warning },
  { key: "doctor",      label: "Doctor",      icon: "medkit",  color: T.danger },
  { key: "tutor",       label: "Tutor",       icon: "book",    color: T.success },
  { key: "ac",          label: "AC Tech",     icon: "snow",    color: T.primaryLight },
  { key: "carpenter",   label: "Carpenter",   icon: "hammer",  color: "#D97706" },
  { key: "cleaner",     label: "Cleaner",     icon: "broom",   color: "#06B6D4" },
  { key: "painter",     label: "Painter",     icon: "paint",   color: T.pink },
  { key: "mechanic",    label: "Mechanic",    icon: "wrench",  color: "#64748B" },
  { key: "cook",        label: "Cook",        icon: "chef",    color: "#F97316" },
  { key: "security",    label: "Security",    icon: "shield",  color: T.violet },
  { key: "pest",        label: "Pest Ctrl",   icon: "bug",     color: "#84CC16" },
];

const PROVIDERS = [
  { id: 1, name: "Ali Plumbing Works", category: "Plumber", area: "DHA Phase 6", rating: 4.8, reviews: 142, price: 1200, distance: 0.7, eta: 18, verified: true, jobs: 432, reason: "Closest verified plumber, top-rated for emergency leak repairs in your area." },
  { id: 2, name: "QuickFix Pipes & Drains", category: "Plumber", area: "Bukhari Comm.", rating: 4.6, reviews: 98, price: 950, distance: 1.1, eta: 24, verified: true, jobs: 287, reason: "Best price-to-rating ratio among nearby providers; same-day response." },
  { id: 3, name: "Karachi Pipe Masters", category: "Plumber", area: "Tauheed Comm.", rating: 4.7, reviews: 211, price: 1350, distance: 1.4, eta: 31, verified: true, jobs: 612, reason: "Most reviewed plumber within 2km; specializes in PVC pipe work." },
];

const BOOKINGS = [
  { id: "BK-7A12-KHI", provider: "Ali Plumbing Works", category: "Plumber", date: "Tomorrow", time: "10:30 AM", status: "confirmed", price: 1200 },
  { id: "BK-6B43-KHI", provider: "QuickFix Pipes",      category: "Plumber", date: "Today",    time: "3:00 PM",  status: "pending",   price: 950 },
  { id: "BK-5F88-KHI", provider: "Hassan AC Service",   category: "AC Tech", date: "May 12",   time: "5:00 PM",  status: "completed", price: 2200 },
  { id: "BK-4C12-KHI", provider: "Rahim Painter",       category: "Painter", date: "May 10",   time: "11:00 AM", status: "cancelled", price: 3500 },
];

const AGENTS = [
  { n: 1, name: "Intent Parser",    tool: "parse_intent()",       color: T.a1, desc: "Extracting service, location, budget & urgency from your message" },
  { n: 2, name: "Provider Search",  tool: "search_providers()",   color: T.a2, desc: "Filtering 50 providers by category, city & area radius" },
  { n: 3, name: "Ranking Engine",   tool: "rank_by_score()",      color: T.a3, desc: "Scoring distance 35% · rating 35% · price 20% · reviews 10%" },
  { n: 4, name: "Booking Agent",    tool: "create_booking()",     color: T.a4, desc: "Writing booking to SQLite, generating BK-XXXX-KHI ID" },
  { n: 5, name: "Follow-Up Planner",tool: "schedule_followups()", color: T.a5, desc: "Generating 3 automated reminder messages" },
];

// ─────────────────────────────────────────────────────────────
// Export everything to window
// ─────────────────────────────────────────────────────────────
Object.assign(window, {
  T, Icon, PHONE, shade,
  GlassCard, PressButton, Pill, StatusBadge, Skeleton, LiveDot, Typewriter,
  ThinkingDots, ScoreBar, Avatar, SectionTitle, TopBar,
  SERVICES, PROVIDERS, BOOKINGS, AGENTS,
});
