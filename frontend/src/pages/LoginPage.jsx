import { useState } from "react";
import { useApp } from "../App";

export default function LoginPage({ onLogin }) {
  const { t, API } = useApp();
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState("");
  const [laden, setLaden] = useState(false);

  const anmelden = async () => {
    if (!email || !passwort) return;
    setLaden(true); setFehler("");
    try {
      const form = new FormData();
      form.append("username", email);
      form.append("password", passwort);
      const res = await fetch(`${API}/api/auth/login`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setFehler(t("msg_login_fehler")); return; }
      onLogin({ id: data.user_id, vorname: data.vorname, rolle: data.rolle }, data.access_token);
    } catch {
      setFehler(t("msg_fehler"));
    } finally {
      setLaden(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(160deg, #1a3d6e 0%, #2563eb 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>⚡</div>
        <h1 style={{ color: "white", fontSize: 28, fontWeight: 800, margin: 0 }}>
          Elektro Pepel
        </h1>
        <p style={{ color: "rgba(255,255,255,0.7)", marginTop: 6, fontSize: 15 }}>
          Zeiterfassung · Pontaj
        </p>
      </div>

      {/* Karte */}
      <div style={{
        background: "white", borderRadius: 24, padding: 32, width: "100%", maxWidth: 400,
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a3d6e", marginTop: 0, marginBottom: 24 }}>
          {t("msg_willkommen")}
        </h2>

        {/* E-Mail */}
        <label style={{ display: "block", marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
            {t("label_email")}
          </span>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && anmelden()}
            autoComplete="email"
            style={{
              width: "100%", padding: "14px 16px", fontSize: 16, borderRadius: 12,
              border: "2px solid #e2e8f0", boxSizing: "border-box",
              outline: "none", transition: "border 0.2s",
            }}
            onFocus={e => e.target.style.border = "2px solid #2563eb"}
            onBlur={e => e.target.style.border = "2px solid #e2e8f0"}
          />
        </label>

        {/* Passwort */}
        <label style={{ display: "block", marginBottom: 24 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
            {t("label_passwort")}
          </span>
          <input
            type="password" value={passwort} onChange={e => setPasswort(e.target.value)}
            onKeyDown={e => e.key === "Enter" && anmelden()}
            autoComplete="current-password"
            style={{
              width: "100%", padding: "14px 16px", fontSize: 16, borderRadius: 12,
              border: "2px solid #e2e8f0", boxSizing: "border-box",
              outline: "none", transition: "border 0.2s",
            }}
            onFocus={e => e.target.style.border = "2px solid #2563eb"}
            onBlur={e => e.target.style.border = "2px solid #e2e8f0"}
          />
        </label>

        {fehler && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
            padding: "10px 14px", color: "#dc2626", fontSize: 14, marginBottom: 16
          }}>
            ⚠️ {fehler}
          </div>
        )}

        <button
          onClick={anmelden} disabled={laden}
          style={{
            width: "100%", padding: "16px", background: laden ? "#93c5fd" : "#1a3d6e",
            color: "white", fontSize: 17, fontWeight: 700, borderRadius: 12,
            border: "none", cursor: laden ? "not-allowed" : "pointer",
            transition: "background 0.2s", letterSpacing: 0.5,
          }}
        >
          {laden ? "⏳ ..." : t("btn_anmelden")}
        </button>
      </div>
    </div>
  );
}
