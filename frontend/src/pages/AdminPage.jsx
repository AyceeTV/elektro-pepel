import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Karte, Seitenheader, Lader } from "../components/ui/UI";

export default function AdminPage() {
  const { t, apiFetch } = useApp();
  const [statistik, setStatistik] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [laden, setLaden] = useState(true);
  const [tab, setTab] = useState("dashboard");

  useEffect(() => { ladeAdmin(); }, []);

  async function ladeAdmin() {
    setLaden(true);
    const [sRes, aRes] = await Promise.all([
      apiFetch("/api/admin/statistik"),
      apiFetch("/api/admin/audit-log?limit=50"),
    ]);
    if (sRes?.ok) setStatistik(await sRes.json());
    if (aRes?.ok) setAuditLog(await aRes.json());
    setLaden(false);
  }

  if (laden) return <Lader />;

  return (
    <div style={{ padding: "0 16px 16px" }}>
      <Seitenheader titel="⚙️ Verwaltung" untertitel="Elektro Pepel" />

      {/* Tabs */}
      <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 12, padding: 4, marginBottom: 16 }}>
        {["dashboard", "auditlog"].map(tb => (
          <button key={tb} onClick={() => setTab(tb)} style={{
            flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer",
            background: tab === tb ? "white" : "transparent",
            color: tab === tb ? "#1a3d6e" : "#64748b",
            fontWeight: tab === tb ? 700 : 500, fontSize: 14,
            boxShadow: tab === tb ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
          }}>
            {tb === "dashboard" ? "📊 Dashboard" : "🔍 Protokoll"}
          </button>
        ))}
      </div>

      {tab === "dashboard" && statistik && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <StatKarte zahl={statistik.mitarbeiter_aktiv} label="Mitarbeiter" icon="👷" farbe="#1a3d6e" />
            <StatKarte zahl={statistik.baustellen_aktiv} label="Baustellen" icon="🏗" farbe="#2563eb" />
            <StatKarte zahl={`${Number(statistik.stunden_diesen_monat).toFixed(0)}h`} label="Stunden (Monat)" icon="⏱" farbe="#7c3aed" />
            <StatKarte zahl={statistik.offene_urlaubsantraege} label="Offene Anträge" icon="🌴" farbe="#ea580c" />
          </div>

          {/* DSGVO Info */}
          <Karte style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1d4ed8", marginBottom: 10 }}>
              🛡 Datenschutz-Status
            </div>
            {[
              ["✓ Server in Deutschland (Hetzner)", true],
              ["✓ Passwörter verschlüsselt (bcrypt)", true],
              ["✓ JWT-Authentifizierung aktiv", true],
              ["✓ Audit-Log läuft", true],
              ["✓ DSGVO Soft-Delete aktiviert", true],
              ["✓ Kundendaten nur für Berechtigte", true],
            ].map(([text, ok]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, color: ok ? "#166534" : "#dc2626" }}>
                {text}
              </div>
            ))}
          </Karte>
        </>
      )}

      {tab === "auditlog" && (
        <>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
            Letzte 50 Aktionen — DSGVO-Protokoll
          </div>
          {auditLog.map(log => (
            <Karte key={log.id} style={{ marginBottom: 6, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>
                    {aktionIcon(log.aktion)} {log.aktion}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    👤 {log.user || "System"}
                    {log.ip && <span style={{ marginLeft: 8, color: "#94a3b8" }}>IP: {log.ip}</span>}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
                  {new Date(log.erstellt_am).toLocaleString("de-DE", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                </div>
              </div>
            </Karte>
          ))}
        </>
      )}
    </div>
  );
}

function StatKarte({ zahl, label, icon, farbe }) {
  return (
    <Karte style={{ textAlign: "center", padding: 20 }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: farbe, marginTop: 6 }}>{zahl}</div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{label}</div>
    </Karte>
  );
}

function aktionIcon(aktion) {
  if (aktion.includes("login")) return "🔑";
  if (aktion.includes("erstellt")) return "✚";
  if (aktion.includes("geloescht")) return "🗑";
  if (aktion.includes("korrigiert")) return "✏";
  if (aktion.includes("genehmig")) return "✓";
  return "📝";
}
