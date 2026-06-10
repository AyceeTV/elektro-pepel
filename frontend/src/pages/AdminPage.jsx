import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Seite, Karte, StatKarte, Tabelle, Lader, Badge } from "../components/ui/UI";

export default function AdminPage() {
  const { apiFetch } = useApp();
  const [statistik, setStatistik] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    Promise.all([apiFetch("/api/admin/statistik"), apiFetch("/api/admin/audit-log?limit=50")])
      .then(async ([sRes, aRes]) => {
        if (sRes?.ok) setStatistik(await sRes.json());
        if (aRes?.ok) setAuditLog(await aRes.json());
        setLaden(false);
      });
  }, []);

  if (laden) return <Lader />;

  return (
    <Seite titel="Verwaltung" untertitel="Elektro Pepel">
      <div style={{display:"flex",background:"#f1f5f9",borderRadius:10,padding:4,marginBottom:24,maxWidth:320}}>
        {[["dashboard","📊 Dashboard"],["auditlog","🔍 Protokoll"]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex:1,padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:tab===k?700:500,
            background:tab===k?"white":"transparent",color:tab===k?"#0f1923":"#64748b",
            boxShadow:tab===k?"0 1px 4px rgba(0,0,0,0.1)":"none",
          }}>{l}</button>
        ))}
      </div>

      {tab === "dashboard" && statistik && (
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16,marginBottom:24}}>
            <StatKarte zahl={statistik.mitarbeiter_aktiv} label="Aktive Mitarbeiter" icon="👷" />
            <StatKarte zahl={statistik.baustellen_aktiv} label="Baustellen" icon="🏗" farbe="#f59e0b" />
            <StatKarte zahl={`${Number(statistik.stunden_diesen_monat).toFixed(0)}h`} label="Stunden (Monat)" icon="⏱" farbe="#7c3aed" />
            <StatKarte zahl={statistik.offene_urlaubsantraege} label="Offene Anträge" icon="🌴" farbe="#16a34a" />
          </div>
          <Karte style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}>
            <h3 style={{fontSize:15,fontWeight:700,color:"#1e40af",margin:"0 0 16px"}}>🛡 Datenschutz-Status</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8}}>
              {["✓ Server in EU (Supabase + Render)","✓ Passwörter verschlüsselt (bcrypt)","✓ JWT-Authentifizierung aktiv","✓ Audit-Log läuft","✓ DSGVO Soft-Delete aktiviert","✓ Kundendaten zugriffsgeschützt"]
                .map(t => <div key={t} style={{fontSize:13,color:"#1e40af",padding:"4px 0"}}>{ t}</div>)}
            </div>
          </Karte>
        </>
      )}

      {tab === "auditlog" && (
        <Karte style={{padding:0}}>
          <Tabelle
            spalten={[
              {key:"zeit",label:"Zeit"},
              {key:"aktion",label:"Aktion"},
              {key:"user",label:"Benutzer"},
              {key:"ip",label:"IP"},
            ]}
            zeilen={auditLog.map(l => ({
              zeit: <span style={{fontSize:12,color:"#64748b",whiteSpace:"nowrap"}}>{new Date(l.erstellt_am).toLocaleString("de-DE",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>,
              aktion: <span style={{fontSize:13,fontWeight:500}}>{l.aktion}</span>,
              user: l.user || <span style={{color:"#94a3b8"}}>System</span>,
              ip: <span style={{fontSize:12,color:"#94a3b8"}}>{l.ip||"—"}</span>,
            }))}
            leer="Keine Protokolleinträge"
          />
        </Karte>
      )}
    </Seite>
  );
}
