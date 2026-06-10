// ─── Wiederverwendbare UI-Bausteine ───────────────────────────────────────────

export function Karte({ children, style = {} }) {
  return (
    <div style={{
      background: "white", borderRadius: 20, padding: 20,
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)", ...style
    }}>
      {children}
    </div>
  );
}

export function GrosserButton({ onClick, children, farbe = "#1a3d6e", disabled = false, icon = null, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "18px 20px", background: disabled ? "#cbd5e1" : farbe,
      color: "white", fontSize: 18, fontWeight: 700, borderRadius: 16,
      border: "none", cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      boxShadow: disabled ? "none" : `0 4px 14px ${farbe}55`,
      transition: "transform 0.1s, box-shadow 0.1s",
      ...style
    }}
      onTouchStart={e => !disabled && (e.currentTarget.style.transform = "scale(0.97)")}
      onTouchEnd={e => !disabled && (e.currentTarget.style.transform = "scale(1)")}
    >
      {icon && <span style={{ fontSize: 22 }}>{icon}</span>}
      {children}
    </button>
  );
}

export function KleinerButton({ onClick, children, farbe = "#1a3d6e", outlined = false, style = {} }) {
  return (
    <button onClick={onClick} style={{
      padding: "10px 18px", background: outlined ? "white" : farbe,
      color: outlined ? farbe : "white",
      border: outlined ? `2px solid ${farbe}` : "none",
      borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer", ...style
    }}>
      {children}
    </button>
  );
}

export function Eingabe({ label, value, onChange, type = "text", placeholder = "", required = false, style = {} }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      {label && (
        <span style={{ fontSize: 14, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
          {label}{required && <span style={{ color: "#dc2626" }}> *</span>}
        </span>
      )}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "14px 16px", fontSize: 16, borderRadius: 12,
          border: "2px solid #e2e8f0", boxSizing: "border-box", outline: "none",
          background: "white", ...style
        }}
        onFocus={e => e.target.style.border = "2px solid #2563eb"}
        onBlur={e => e.target.style.border = "2px solid #e2e8f0"}
      />
    </label>
  );
}

export function Textarea({ label, value, onChange, placeholder = "", rows = 3 }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      {label && (
        <span style={{ fontSize: 14, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
          {label}
        </span>
      )}
      <textarea
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        style={{
          width: "100%", padding: "14px 16px", fontSize: 15, borderRadius: 12,
          border: "2px solid #e2e8f0", boxSizing: "border-box", outline: "none",
          resize: "vertical", fontFamily: "inherit", background: "white",
        }}
        onFocus={e => e.target.style.border = "2px solid #2563eb"}
        onBlur={e => e.target.style.border = "2px solid #e2e8f0"}
      />
    </label>
  );
}

export function Auswahl({ label, value, onChange, optionen = [], style = {} }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      {label && (
        <span style={{ fontSize: 14, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
          {label}
        </span>
      )}
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", padding: "14px 16px", fontSize: 16, borderRadius: 12,
          border: "2px solid #e2e8f0", boxSizing: "border-box", background: "white",
          outline: "none", ...style
        }}
        onFocus={e => e.target.style.border = "2px solid #2563eb"}
        onBlur={e => e.target.style.border = "2px solid #e2e8f0"}
      >
        {optionen.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function Seitenheader({ titel, untertitel }) {
  return (
    <div style={{ padding: "20px 16px 8px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a3d6e", margin: 0 }}>{titel}</h1>
      {untertitel && <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0" }}>{untertitel}</p>}
    </div>
  );
}

export function StatusBadge({ status }) {
  const farben = {
    genehmigt: { bg: "#dcfce7", color: "#16a34a" },
    beantragt: { bg: "#fef9c3", color: "#ca8a04" },
    abgelehnt: { bg: "#fee2e2", color: "#dc2626" },
    aktiv:     { bg: "#dbeafe", color: "#1d4ed8" },
    abgeschlossen: { bg: "#f1f5f9", color: "#64748b" },
  };
  const f = farben[status] || { bg: "#f1f5f9", color: "#64748b" };
  return (
    <span style={{
      background: f.bg, color: f.color, borderRadius: 8,
      padding: "3px 10px", fontSize: 12, fontWeight: 600
    }}>
      {status}
    </span>
  );
}

export function Lader() {
  return (
    <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 16 }}>
      ⏳ Wird geladen...
    </div>
  );
}

export function Modal({ offen, onClose, titel, children }) {
  if (!offen) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      zIndex: 500, display: "flex", alignItems: "flex-end",
    }} onClick={onClose}>
      <div style={{
        background: "white", borderRadius: "24px 24px 0 0", width: "100%",
        maxHeight: "90vh", overflow: "auto", padding: 24,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a3d6e" }}>{titel}</h2>
          <button onClick={onClose} style={{
            background: "#f1f5f9", border: "none", borderRadius: 50,
            width: 36, height: 36, fontSize: 18, cursor: "pointer"
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
