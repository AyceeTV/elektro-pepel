import { useState, useEffect } from "react";
import { useApp } from "../App";
import { kiUebersetzen } from "../i18n/translations";

export default function HomePage() {
  const { user, apiFetch, setSeite, sprache, t } = useApp();
  const [stats, setStats] = useState(null);
  const [heuteAuftraege, setHeuteAuftraege] = useState([]);
  const [offeneGenehmigungen, setOffeneGenehmigungen] = useState(0);
  const [ueberstunden, setUeberstunden] = useState(0);
  const [uhrzeit, setUhrzeit] = useState(new Date());

  const istVorgesetzter = ["admin","verwaltung","vorgesetzter","bauleiter"].includes(user.rolle);
  const istAdmin = ["admin","verwaltung"].includes(user.rolle);

  useEffect(() => {
    const timer = setInterval(() => setUhrzeit(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    ladeStats();
  }, []);

  async function ladeStats() {
    const calls = [
      apiFetch("/api/zeiterfassung/ueberstunden"),
      apiFetch("/api/auftraege/heute"),
    ];
    if (istVorgesetzter) calls.push(apiFetch("/api/zeiterfassung/genehmigung/offen"));
    if (istAdmin) calls.push(apiFetch("/api/admin/statistik"));

    const [uRes, aRes, gRes, sRes] = await Promise.all(calls);
    if (uRes?.ok) { const d = await uRes.json(); setUeberstunden(d.gesamt_ueberstunden); }
    if (aRes?.ok) setHeuteAuftraege(await aRes.json());
    if (gRes?.ok) { const d = await gRes.json(); setOffeneGenehmigungen(d.length); }
    if (sRes?.ok) setStats(await sRes.json());
  }

  const stunde = uhrzeit.getHours();
  const gruss = sprache === "ro"
    ? (stunde < 12 ? "Bună dimineața" : stunde < 18 ? "Bună ziua" : "Bună seara")
    : (stunde < 12 ? "Guten Morgen" : stunde < 18 ? "Guten Tag" : "Guten Abend");

  const datum = uhrzeit.toLocaleDateString(sprache === "ro" ? "ro-RO" : "de-DE", {
    weekday:"long", day:"numeric", month:"long", year:"numeric"
  });

  // Nav-Kacheln je nach Rolle
  const kacheln = [
    { key:"zeiterfassung", icon:"⏱", label: sprache==="ro"?"Pontaj":"Zeiterfassung", farbe:"#1a3d6e", hell:"#dbeafe", desc: sprache==="ro"?"Înregistrează orele de lucru":"Stunden eintragen", immer:true },
    { key:"auftraege",     icon:"📋", label: sprache==="ro"?"Comenzi":"Aufträge",      farbe:"#f59e0b", hell:"#fef9c3", desc: sprache==="ro"?"Comenzile tale de azi":"Deine heutigen Aufträge", immer:true, badge: heuteAuftraege.length },
    { key:"baustellen",    icon:"🏗",  label: sprache==="ro"?"Șantiere":"Baustellen",  farbe:"#0f766e", hell:"#ccfbf1", desc: sprache==="ro"?"Șantierele tale":"Deine Baustellen", immer:true },
    { key:"urlaub",        icon:"🌴", label: sprache==="ro"?"Concediu":"Urlaub",       farbe:"#16a34a", hell:"#dcfce7", desc: sprache==="ro"?"Cerere concediu":"Urlaub beantragen", immer:true },
    { key:"regiezettel",   icon:"📝", label: sprache==="ro"?"Bon de regie":"Regiezettel", farbe:"#7c3aed", hell:"#ede9fe", desc: sprache==="ro"?"Creează bon de regie":"Regiezettel erstellen", roles:["admin","verwaltung","vorgesetzter","bauleiter"] },
    { key:"team",          icon:"👷", label: sprache==="ro"?"Echipă":"Team",           farbe:"#dc2626", hell:"#fee2e2", desc: sprache==="ro"?"Gestionează echipa":"Team verwalten", roles:["admin","verwaltung","vorgesetzter","bauleiter"] },
    { key:"buchhaltung",   icon:"📊", label: sprache==="ro"?"Contabilitate":"Buchhaltung", farbe:"#0369a1", hell:"#e0f2fe", desc: sprache==="ro"?"Toate bonurile":"Alle Regiezettel", roles:["admin","verwaltung"] },
    { key:"verwaltung_katalog", icon:"🗄", label: sprache==="ro"?"Catalog":"Katalog & Preise", farbe:"#475569", hell:"#f1f5f9", desc: sprache==="ro"?"Produse și prețuri":"Produkte & Preise", roles:["admin","verwaltung"] },
    { key:"admin",         icon:"⚙️", label: sprache==="ro"?"Administrare":"Admin",   farbe:"#374151", hell:"#f9fafb", desc: sprache==="ro"?"Setări sistem":"Systemeinstellungen", roles:["admin"] },
  ].filter(k => k.immer || k.roles?.includes(user.rolle));

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg, #0f1923 0%, #1a3d6e 50%, #0f1923 100%)", padding:"0" }}>

      {/* ── Hero Header ── */}
      <div style={{ padding:"32px 28px 24px", position:"relative", overflow:"hidden" }}>
        {/* Hintergrund Deko */}
        <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:"rgba(245,158,11,0.08)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:-40, left:-40, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }}/>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, position:"relative" }}>
          <div>
            <p style={{ color:"rgba(255,255,255,0.5)", fontSize:13, margin:"0 0 6px", fontWeight:500 }}>{datum}</p>
            <h1 style={{ color:"white", fontSize:"clamp(22px,4vw,32px)", fontWeight:800, margin:"0 0 4px", letterSpacing:"-0.5px" }}>
              {gruss}, {user.vorname}! 👋
            </h1>
            <p style={{ color:"rgba(255,255,255,0.6)", fontSize:14, margin:0 }}>
              ⚡ Elektro Pepel GmbH
            </p>
          </div>

          {/* Große Uhr */}
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:"clamp(28px,5vw,44px)", fontWeight:800, color:"#f59e0b", fontVariantNumeric:"tabular-nums", lineHeight:1 }}>
              {uhrzeit.toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit" })}
            </div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginTop:4 }}>
              {uhrzeit.toLocaleTimeString("de-DE", { second:"2-digit" }).slice(-2)}s
            </div>
          </div>
        </div>

        {/* Quick-Stats Leiste */}
        <div style={{ display:"flex", gap:12, marginTop:24, flexWrap:"wrap" }}>
          {[
            { label: sprache==="ro"?"Ore suplim.":"Überstunden", wert: `${ueberstunden>0?"+":""}${ueberstunden.toFixed(1)}h`, farbe: ueberstunden>=0?"#4ade80":"#f87171" },
            { label: sprache==="ro"?"Comenzi azi":"Aufträge heute", wert: heuteAuftraege.length, farbe:"#f59e0b" },
            ...(istVorgesetzter ? [{ label: sprache==="ro"?"Aprobări":"Freigaben", wert: offeneGenehmigungen > 0 ? `${offeneGenehmigungen} offen` : "✓", farbe: offeneGenehmigungen > 0 ? "#f87171" : "#4ade80" }] : []),
            ...(stats ? [{ label: sprache==="ro"?"Angajați":"Mitarbeiter", wert: stats.mitarbeiter_aktiv, farbe:"#60a5fa" }] : []),
          ].map(s => (
            <div key={s.label} style={{ background:"rgba(255,255,255,0.08)", borderRadius:10, padding:"8px 16px", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", fontWeight:700, marginBottom:2, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:s.farbe }}>{s.wert}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Aufträge heute (wenn vorhanden) ── */}
      {heuteAuftraege.length > 0 && (
        <div style={{ padding:"0 28px 20px" }}>
          <div style={{ background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:14, padding:"14px 18px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#f59e0b", marginBottom:10, letterSpacing:"0.06em" }}>
              📋 {sprache==="ro"?"COMENZI AZI":"AUFTRÄGE HEUTE"}
            </div>
            <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:4 }}>
              {heuteAuftraege.slice(0,4).map(a => (
                <div key={a.id} onClick={() => setSeite("auftraege")} style={{
                  background:"rgba(255,255,255,0.1)", borderRadius:10, padding:"10px 14px",
                  cursor:"pointer", flexShrink:0, minWidth:160, border:"1px solid rgba(255,255,255,0.1)"
                }}>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginBottom:3 }}>{a.termin_von||"—"} Uhr</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"white" }}>{a.titel.slice(0,30)}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:2 }}>👤 {a.kunde_name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Hauptkacheln ── */}
      <div style={{ padding:"0 28px 32px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.3)", marginBottom:16, letterSpacing:"0.08em" }}>
          {sprache==="ro"?"NAVIGARE RAPIDĂ":"SCHNELLNAVIGATION"}
        </div>

        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))",
          gap:12,
        }}>
          {kacheln.map((k, i) => (
            <button key={k.key} onClick={() => setSeite(k.key)} style={{
              background: i === 0
                ? `linear-gradient(135deg, ${k.farbe}, ${k.farbe}cc)`
                : "rgba(255,255,255,0.07)",
              border: i === 0
                ? "none"
                : "1px solid rgba(255,255,255,0.1)",
              borderRadius:16,
              padding:"20px 16px",
              cursor:"pointer",
              textAlign:"left",
              position:"relative",
              overflow:"hidden",
              transition:"transform 0.15s, background 0.15s",
              backdropFilter:"blur(10px)",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform="scale(1.03)"; if(i!==0) e.currentTarget.style.background="rgba(255,255,255,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; if(i!==0) e.currentTarget.style.background="rgba(255,255,255,0.07)"; }}
              onTouchStart={e => e.currentTarget.style.transform="scale(0.97)"}
              onTouchEnd={e => e.currentTarget.style.transform="scale(1)"}
            >
              {/* Badge */}
              {k.badge > 0 && (
                <div style={{ position:"absolute", top:10, right:10, background:"#dc2626", color:"white", borderRadius:"50%", width:20, height:20, fontSize:11, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {k.badge}
                </div>
              )}

              {/* Deko-Kreis */}
              <div style={{ position:"absolute", bottom:-20, right:-20, width:70, height:70, borderRadius:"50%", background:"rgba(255,255,255,0.06)", pointerEvents:"none" }}/>

              <div style={{ fontSize:28, marginBottom:10 }}>{k.icon}</div>
              <div style={{ fontSize:14, fontWeight:700, color:"white", marginBottom:4, lineHeight:1.2 }}>{k.label}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", lineHeight:1.3 }}>{k.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}