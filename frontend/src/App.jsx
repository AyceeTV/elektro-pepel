import { useState, useEffect, createContext, useContext } from "react";
import { translations, kiUebersetzen } from "./i18n/translations";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ZeiterfassungPage from "./pages/ZeiterfassungPage";
import BaustellenPage from "./pages/BaustellenPage";
import UrlaubPage from "./pages/UrlaubPage";
import RegiezettelPage from "./pages/RegiezettelPage";
import TeamPage from "./pages/TeamPage";
import AdminPage from "./pages/AdminPage";
import AuftraegePage from "./pages/AuftraegePage";
import BuchhaltungPage from "./pages/BuchhaltungPage";
import VerwaltungPage from "./pages/VerwaltungPage";

export const AppContext = createContext();
export const useApp = () => useContext(AppContext);

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [sprache, setSprache] = useState(localStorage.getItem("sprache") || "de");
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw || raw === "undefined" || raw === "null") return null;
      return JSON.parse(raw);
    } catch { return null; }
  });
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [seite, setSeite] = useState("home");
  const [toast, setToast] = useState(null);
  const [sidebarOffen, setSidebarOffen] = useState(false);

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
    setToken(""); setUser(null);
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

  const navItems = [
    { key: "zeiterfassung", icon: "⏱", label: t("nav_zeiterfassung") },
    { key: "baustellen",    icon: "🏗", label: t("nav_baustellen") },
    { key: "urlaub",        icon: "🌴", label: t("nav_urlaub") },
    { key: "regiezettel",   icon: "📋", label: t("nav_regiezettel"), roles: ["admin","vorgesetzter","bauleiter"] },
    { key: "team",          icon: "👷", label: t("nav_team"),        roles: ["admin","vorgesetzter","bauleiter"] },
    { key: "auftraege",     icon: "📋", label: "Aufträge" },
    { key: "buchhaltung",       icon: "📊", label: "Buchhaltung",        roles: ["admin","verwaltung"] },
    { key: "verwaltung_katalog", icon: "🗄", label: "Katalog & Preise",   roles: ["admin","verwaltung"] },
    { key: "admin",         icon: "⚙️", label: t("nav_admin"),       roles: ["admin"] },
  ].filter(n => !n.roles || n.roles.includes(user.rolle));

  const seiten = {
    home: <HomePage />,
    zeiterfassung: <ZeiterfassungPage />,
    baustellen: <BaustellenPage />,
    urlaub: <UrlaubPage />,
    regiezettel: <RegiezettelPage />,
    team: <TeamPage />,
    admin: <AdminPage />,
    auftraege: <AuftraegePage />,
    buchhaltung: <BuchhaltungPage />,
    verwaltung_katalog: <VerwaltungPage />,
  };

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <AppContext.Provider value={ctx}>
      <div style={{ display: "flex", minHeight: "100vh", background: "#f4f6f9", fontFamily: "'Inter', system-ui, sans-serif" }}>

        {/* ── Sidebar Overlay (Mobile) ── */}
        {sidebarOffen && (
          <div onClick={() => setSidebarOffen(false)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200
          }} />
        )}

        {/* ── Sidebar ── */}
        <aside style={{
          width: 240, background: "#0f1923", color: "white",
          display: "flex", flexDirection: "column",
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 300,
          transform: isMobile ? (sidebarOffen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
          transition: "transform 0.25s ease",
          boxShadow: "2px 0 12px rgba(0,0,0,0.15)",
        }}>
          {/* Logo */}
          <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, background: "#f59e0b", borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 800
              }}>⚡</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Elektro Pepel</div>
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>Zeiterfassung</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
            {navItems.map(n => (
              <button key={n.key} onClick={() => { setSeite(n.key); setSidebarOffen(false); }} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                background: seite === n.key ? "rgba(245,158,11,0.15)" : "transparent",
                color: seite === n.key ? "#f59e0b" : "rgba(255,255,255,0.65)",
                fontWeight: seite === n.key ? 600 : 400, fontSize: 14,
                marginBottom: 2, transition: "all 0.15s", textAlign: "left",
              }}
                onMouseEnter={e => { if (seite !== n.key) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "white"; }}
                onMouseLeave={e => { if (seite !== n.key) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; } }}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{n.icon}</span>
                {n.label}
                {seite === n.key && <div style={{ marginLeft: "auto", width: 3, height: 16, background: "#f59e0b", borderRadius: 2 }} />}
              </button>
            ))}
          </nav>

          {/* User + Sprache */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", background: "#f59e0b",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "#0f1923"
              }}>
                {user.vorname?.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.vorname}</div>
                <div style={{ fontSize: 11, opacity: 0.5, textTransform: "capitalize" }}>{user.rolle}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => spracheWechseln(sprache === "de" ? "ro" : "de")} style={{
                flex: 1, background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.7)",
                borderRadius: 6, padding: "6px 0", fontSize: 12, cursor: "pointer"
              }}>
                {sprache === "de" ? "🇷🇴 Română" : "🇩🇪 Deutsch"}
              </button>
              <button onClick={abmelden} style={{
                background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.7)",
                borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer"
              }}>↩</button>
            </div>
          </div>
        </aside>

        {/* ── Hauptbereich ── */}
        <div style={{
          flex: 1, marginLeft: isMobile ? 0 : 240,
          display: "flex", flexDirection: "column", minHeight: "100vh"
        }}>
          {/* Mobile Header */}
          <header style={{
            display: isMobile ? "flex" : "none",
            background: "#0f1923", color: "white", padding: "12px 16px",
            alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100
          }}>
            <button onClick={() => setSidebarOffen(true)} style={{
              background: "none", border: "none", color: "white", fontSize: 22, cursor: "pointer", padding: 0
            }}>☰</button>
            <span style={{ fontWeight: 700, fontSize: 15 }}>⚡ Elektro Pepel</span>
          </header>

          <main style={{ flex: 1, padding: isMobile ? "16px" : "24px 28px", maxWidth: 1400, width: "100%" }}>
            {seiten[seite] || <ZeiterfassungPage />}
          </main>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 999,
            background: toast.typ === "ok" ? "#0f1923" : "#dc2626",
            color: "white", borderRadius: 10, padding: "12px 20px",
            fontSize: 14, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            display: "flex", alignItems: "center", gap: 8,
            animation: "slideIn 0.2s ease",
          }}>
            <span style={{ color: toast.typ === "ok" ? "#f59e0b" : "#fca5a5" }}>{toast.typ === "ok" ? "✓" : "✕"}</span>
            {toast.msg}
          </div>
        )}
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </AppContext.Provider>
  );
}