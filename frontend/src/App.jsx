import { useState, useEffect, createContext, useContext } from "react";
import { translations } from "./i18n/translations";
import LoginPage from "./pages/LoginPage";
import ZeiterfassungPage from "./pages/ZeiterfassungPage";
import BaustellenPage from "./pages/BaustellenPage";
import UrlaubPage from "./pages/UrlaubPage";
import RegiezettelPage from "./pages/RegiezettelPage";
import TeamPage from "./pages/TeamPage";
import AdminPage from "./pages/AdminPage";

// ─── Context ──────────────────────────────────────────────────────────────────
export const AppContext = createContext();
export const useApp = () => useContext(AppContext);

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [sprache, setSprache] = useState(localStorage.getItem("sprache") || "de");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [seite, setSeite] = useState("zeiterfassung");
  const [toast, setToast] = useState(null);

  const t = (key) => translations[sprache]?.[key] || translations.de[key] || key;

  const spracheWechseln = (lang) => {
    setSprache(lang);
    localStorage.setItem("sprache", lang);
  };

  const showToast = (msg, typ = "ok") => {
    setToast({ msg, typ });
    setTimeout(() => setToast(null), 3000);
  };

  const apiFetch = async (pfad, optionen = {}) => {
    const res = await fetch(`${API}${pfad}`, {
      ...optionen,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(optionen.headers || {}),
      },
    });
    if (res.status === 401) { abmelden(); return null; }
    return res;
  };

  const abmelden = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
  };

  const ctx = { t, sprache, spracheWechseln, user, token, apiFetch, showToast, abmelden, seite, setSeite, API };

  if (!user) return (
    <AppContext.Provider value={ctx}>
      <LoginPage onLogin={(u, tk) => {
        setUser(u); setToken(tk);
        localStorage.setItem("user", JSON.stringify(u));
        localStorage.setItem("token", tk);
      }} />
    </AppContext.Provider>
  );

  const seiten = {
    zeiterfassung: <ZeiterfassungPage />,
    baustellen: <BaustellenPage />,
    urlaub: <UrlaubPage />,
    regiezettel: <RegiezettelPage />,
    team: <TeamPage />,
    admin: <AdminPage />,
  };

  const navItems = [
    { key: "zeiterfassung", icon: "⏱", label: t("nav_zeiterfassung") },
    { key: "baustellen",    icon: "🏗", label: t("nav_baustellen") },
    { key: "urlaub",        icon: "🌴", label: t("nav_urlaub") },
    { key: "regiezettel",   icon: "📋", label: t("nav_regiezettel"), roles: ["admin","vorgesetzter","bauleiter"] },
    { key: "team",          icon: "👷", label: t("nav_team"),        roles: ["admin","vorgesetzter","bauleiter"] },
    { key: "admin",         icon: "⚙️", label: t("nav_admin"),       roles: ["admin"] },
  ].filter(n => !n.roles || n.roles.includes(user.rolle));

  return (
    <AppContext.Provider value={ctx}>
      <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "'Inter', system-ui, sans-serif" }}>

        {/* ── Header ── */}
        <header style={{
          background: "#1a3d6e", color: "white", padding: "0 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 56, position: "sticky", top: 0, zIndex: 100,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>⚡</span>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{t("lbl_firma")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Sprachumschalter */}
            <button
              onClick={() => spracheWechseln(sprache === "de" ? "ro" : "de")}
              style={{
                background: "rgba(255,255,255,0.15)", border: "none", color: "white",
                borderRadius: 20, padding: "5px 12px", cursor: "pointer", fontSize: 13,
                fontWeight: 600, display: "flex", alignItems: "center", gap: 5
              }}
            >
              {sprache === "de" ? "🇷🇴 RO" : "🇩🇪 DE"}
            </button>
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              {user.vorname}
            </div>
          </div>
        </header>

        {/* ── Seiteninhalt ── */}
        <main style={{ paddingBottom: 80, minHeight: "calc(100vh - 136px)" }}>
          {seiten[seite] || <ZeiterfassungPage />}
        </main>

        {/* ── Bottom Navigation (Handy) ── */}
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "white", borderTop: "1px solid #e2e8f0",
          display: "flex", justifyContent: "space-around", padding: "8px 0 10px",
          zIndex: 100, boxShadow: "0 -2px 10px rgba(0,0,0,0.08)"
        }}>
          {navItems.map(n => (
            <button key={n.key} onClick={() => setSeite(n.key)} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, background: "none", border: "none", cursor: "pointer",
              color: seite === n.key ? "#1a3d6e" : "#94a3b8",
              fontWeight: seite === n.key ? 700 : 400, minWidth: 52,
              transition: "color 0.15s",
            }}>
              <span style={{ fontSize: 20 }}>{n.icon}</span>
              <span style={{ fontSize: 10, whiteSpace: "nowrap" }}>{n.label}</span>
            </button>
          ))}
        </nav>

        {/* ── Toast ── */}
        {toast && (
          <div style={{
            position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
            background: toast.typ === "ok" ? "#1a3d6e" : "#dc2626",
            color: "white", borderRadius: 12, padding: "12px 24px",
            fontSize: 15, fontWeight: 500, zIndex: 999,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)", whiteSpace: "nowrap"
          }}>
            {toast.typ === "ok" ? "✓ " : "✕ "}{toast.msg}
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
