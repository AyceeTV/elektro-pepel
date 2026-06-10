// ─── Design System – Elektro Pepel ───────────────────────────────────────────
const C = {
  blue:    "#1a3d6e",
  amber:   "#f59e0b",
  bg:      "#f4f6f9",
  surface: "#ffffff",
  border:  "#e8edf2",
  text:    "#0f1923",
  muted:   "#64748b",
  success: "#16a34a",
  danger:  "#dc2626",
};

export function Seite({ titel, untertitel, aktion, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>{titel}</h1>
          {untertitel && <p style={{ fontSize: 14, color: C.muted, margin: "4px 0 0" }}>{untertitel}</p>}
        </div>
        {aktion && <div>{aktion}</div>}
      </div>
      {children}
    </div>
  );
}

export function Karte({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      cursor: onClick ? "pointer" : "default",
      transition: onClick ? "box-shadow 0.15s, border-color 0.15s" : "none",
      ...style
    }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"; e.currentTarget.style.borderColor = "#c8d4e0"; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; e.currentTarget.style.borderColor = C.border; } }}
    >
      {children}
    </div>
  );
}

export function StatKarte({ zahl, label, icon, farbe = C.blue, trend }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 8px", fontWeight: 500 }}>{label}</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: C.text, margin: 0 }}>{zahl}</p>
          {trend && <p style={{ fontSize: 12, color: C.success, margin: "4px 0 0" }}>{trend}</p>}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: farbe + "15", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 20
        }}>{icon}</div>
      </div>
    </div>
  );
}

export function Btn({ onClick, children, variant = "primary", size = "md", disabled = false, style = {} }) {
  const base = {
    border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6,
    transition: "all 0.15s", opacity: disabled ? 0.5 : 1,
    fontSize: size === "sm" ? 13 : size === "lg" ? 16 : 14,
    padding: size === "sm" ? "6px 12px" : size === "lg" ? "14px 24px" : "9px 16px",
  };
  const variants = {
    primary:   { background: C.blue,   color: "white" },
    amber:     { background: C.amber,  color: "#0f1923" },
    danger:    { background: C.danger, color: "white" },
    ghost:     { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
    secondary: { background: "#f1f5f9", color: C.text },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

export function Input({ label, value, onChange, type = "text", placeholder = "", required, style = {} }) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      {label && <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>
        {label}{required && <span style={{ color: C.danger }}> *</span>}
      </span>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: "100%", padding: "9px 12px", fontSize: 14, borderRadius: 8,
          border: `1px solid ${C.border}`, boxSizing: "border-box", background: "white",
          color: C.text, outline: "none", transition: "border-color 0.15s", ...style
        }}
        onFocus={e => e.target.style.borderColor = C.blue}
        onBlur={e => e.target.style.borderColor = C.border}
      />
    </label>
  );
}

export function Select({ label, value, onChange, optionen = [] }) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      {label && <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>{label}</span>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: "100%", padding: "9px 12px", fontSize: 14, borderRadius: 8,
        border: `1px solid ${C.border}`, background: "white", color: C.text,
        outline: "none", cursor: "pointer",
      }}
        onFocus={e => e.target.style.borderColor = C.blue}
        onBlur={e => e.target.style.borderColor = C.border}
      >
        {optionen.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      {label && <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>{label}</span>}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{
          width: "100%", padding: "9px 12px", fontSize: 14, borderRadius: 8,
          border: `1px solid ${C.border}`, boxSizing: "border-box", resize: "vertical",
          fontFamily: "inherit", background: "white", color: C.text, outline: "none",
        }}
        onFocus={e => e.target.style.borderColor = C.blue}
        onBlur={e => e.target.style.borderColor = C.border}
      />
    </label>
  );
}

export function Badge({ label, typ = "default" }) {
  const farben = {
    success:  { bg: "#dcfce7", color: "#15803d" },
    warning:  { bg: "#fef9c3", color: "#854d0e" },
    danger:   { bg: "#fee2e2", color: "#991b1b" },
    info:     { bg: "#dbeafe", color: "#1e40af" },
    default:  { bg: "#f1f5f9", color: "#475569" },
    amber:    { bg: "#fef3c7", color: "#92400e" },
  };
  const f = farben[typ] || farben.default;
  return (
    <span style={{
      background: f.bg, color: f.color, borderRadius: 6,
      padding: "3px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap"
    }}>{label}</span>
  );
}

export function Tabelle({ spalten, zeilen, leer = "Keine Einträge" }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${C.border}` }}>
            {spalten.map(s => (
              <th key={s.key} style={{
                textAlign: "left", padding: "10px 16px", fontSize: 12,
                fontWeight: 600, color: C.muted, textTransform: "uppercase",
                letterSpacing: "0.05em", whiteSpace: "nowrap"
              }}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {zeilen.length === 0 ? (
            <tr><td colSpan={spalten.length} style={{ textAlign: "center", padding: "40px 16px", color: C.muted, fontSize: 14 }}>{leer}</td></tr>
          ) : zeilen.map((z, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {spalten.map(s => (
                <td key={s.key} style={{ padding: "12px 16px", color: C.text }}>{z[s.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ offen, onClose, titel, breite = 480, children }) {
  if (!offen) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 500,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }} onClick={onClose}>
      <div style={{
        background: "white", borderRadius: 16, width: "100%", maxWidth: breite,
        maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>{titel}</h2>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: C.muted }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

export function Lader() {
  return <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", fontSize: 14 }}>Wird geladen…</div>;
}

export function Leer({ icon, text, aktion }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <p style={{ color: "#94a3b8", fontSize: 15, margin: "0 0 16px" }}>{text}</p>
      {aktion}
    </div>
  );
}
