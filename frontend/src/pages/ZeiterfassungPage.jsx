import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Seite, Karte, StatKarte, Btn, Select, Textarea, Tabelle, Modal, Lader, Badge } from "../components/ui/UI";

export default function ZeiterfassungPage() {
  const { t, apiFetch, showToast, user } = useApp();
  const [status, setStatus] = useState(null);
  const [uhr, setUhr] = useState(new Date());
  const [baustellen, setBaustellen] = useState([]);
  const [eintraege, setEintraege] = useState([]);
  const [laden, setLaden] = useState(true);
  const [einModal, setEinModal] = useState(false);
  const [ausModal, setAusModal] = useState(false);
  const [pause, setPause] = useState("0");
  const [taetigkeit, setTaetigkeit] = useState("");
  const [materialien, setMaterialien] = useState([]);
  const [matBez, setMatBez] = useState("");
  const [matMenge, setMatMenge] = useState("");
  const [gewaehlteBaustelle, setGewaehlteBaustelle] = useState("");

  useEffect(() => { const t = setInterval(() => setUhr(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { ladeAlles(); }, []);

  async function ladeAlles() {
    setLaden(true);
    const [sRes, bRes, zRes] = await Promise.all([
      apiFetch("/api/zeiterfassung/status"),
      apiFetch("/api/baustellen/"),
      apiFetch("/api/zeiterfassung/meine"),
    ]);
    if (sRes?.ok) setStatus(await sRes.json());
    if (bRes?.ok) setBaustellen(await bRes.json());
    if (zRes?.ok) setEintraege(await zRes.json());
    setLaden(false);
  }

  async function einstempeln() {
    const res = await apiFetch("/api/zeiterfassung/einstempeln", {
      method: "POST",
      body: JSON.stringify({ baustelle_id: gewaehlteBaustelle ? Number(gewaehlteBaustelle) : null, taetigkeit: taetigkeit || null }),
    });
    if (res?.ok) { showToast(t("msg_einstempeln_ok")); setEinModal(false); setTaetigkeit(""); ladeAlles(); }
    else showToast(t("msg_fehler"), "err");
  }

  async function ausstempeln() {
    const res = await apiFetch("/api/zeiterfassung/ausstempeln", {
      method: "POST",
      body: JSON.stringify({ pause_minuten: Number(pause), taetigkeit: taetigkeit || null, materialien }),
    });
    if (res?.ok) {
      const d = await res.json();
      showToast(`${t("msg_ausstempeln_ok")} ${d.arbeitsstunden}h`);
      setAusModal(false); setPause("0"); setTaetigkeit(""); setMaterialien([]);
      ladeAlles();
    } else showToast(t("msg_fehler"), "err");
  }

  const laufSek = status?.eingestempelt ? Math.floor((uhr - new Date(status.beginn)) / 1000) : 0;
  const laufStr = `${String(Math.floor(laufSek / 3600)).padStart(2,"0")}:${String(Math.floor((laufSek % 3600) / 60)).padStart(2,"0")}:${String(laufSek % 60).padStart(2,"0")}`;
  const stundenHeute = eintraege.filter(e => e.datum === uhr.toISOString().slice(0,10)).reduce((s,e) => s + (e.arbeitsstunden||0), 0);
  const stundenMonat = eintraege.reduce((s,e) => s + (e.arbeitsstunden||0), 0);

  if (laden) return <Lader />;

  const bsName = status?.baustelle_id ? baustellen.find(b => b.id === status.baustelle_id)?.name : null;

  return (
    <Seite titel={t("nav_zeiterfassung")} untertitel={uhr.toLocaleDateString("de-DE", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}>

      {/* ── Top Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatKarte zahl={uhr.toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit" })} label="Aktuelle Uhrzeit" icon="🕐" />
        <StatKarte zahl={`${stundenHeute.toFixed(1)}h`} label="Heute gearbeitet" icon="⏱" farbe="#f59e0b" />
        <StatKarte zahl={`${stundenMonat.toFixed(1)}h`} label="Diesen Monat" icon="📅" farbe="#16a34a" />
        <StatKarte zahl={eintraege.length} label="Einträge gesamt" icon="📋" farbe="#7c3aed" />
      </div>

      {/* ── Status + Buttons ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Karte style={{ background: status?.eingestempelt ? "#0f1923" : "white", color: status?.eingestempelt ? "white" : "inherit" }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.6, margin: "0 0 8px" }}>Status</p>
            {status?.eingestempelt ? (
              <>
                <div style={{ fontSize: 36, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#f59e0b" }}>{laufStr}</div>
                <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>
                  Eingestempelt {new Date(status.beginn).toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit" })} Uhr
                  {bsName && <span> · 🏗 {bsName}</span>}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 18, fontWeight: 600, color: "#64748b" }}>Nicht eingestempelt</div>
            )}
          </div>
          {status?.eingestempelt
            ? <Btn onClick={() => setAusModal(true)} variant="danger" size="lg" style={{ width: "100%" }}>⏹ Ausstempeln</Btn>
            : <Btn onClick={() => setEinModal(true)} variant="amber" size="lg" style={{ width: "100%" }}>▶ Einstempeln</Btn>
          }
        </Karte>

        {/* Schnellinfo */}
        <Karte>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", margin: "0 0 16px" }}>Dieser Monat</p>
          {[
            ["Arbeitstage", eintraege.filter(e => e.arbeitsstunden).length + " Tage"],
            ["Gesamtstunden", stundenMonat.toFixed(1) + " h"],
            ["Ø pro Tag", eintraege.filter(e => e.arbeitsstunden).length > 0 ? (stundenMonat / eintraege.filter(e => e.arbeitsstunden).length).toFixed(1) + " h" : "—"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 14 }}>
              <span style={{ color: "#64748b" }}>{k}</span>
              <span style={{ fontWeight: 600, color: "#0f1923" }}>{v}</span>
            </div>
          ))}
        </Karte>
      </div>

      {/* ── Tabelle ── */}
      <Karte style={{ padding: 0 }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Zeiteinträge diesen Monat</h3>
        </div>
        <Tabelle
          spalten={[
            { key: "datum_fmt", label: "Datum" },
            { key: "zeit", label: "Zeit" },
            { key: "stunden", label: "Stunden" },
            { key: "baustelle", label: "Baustelle" },
            { key: "taetigkeit_fmt", label: "Tätigkeit" },
            { key: "status_badge", label: "Status" },
          ]}
          zeilen={eintraege.slice(0, 20).map(e => ({
            datum_fmt: new Date(e.datum).toLocaleDateString("de-DE", { weekday:"short", day:"numeric", month:"short" }),
            zeit: `${new Date(e.beginn).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})} – ${e.ende ? new Date(e.ende).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}) : "läuft…"}`,
            stunden: e.arbeitsstunden ? <strong>{e.arbeitsstunden.toFixed(1)} h</strong> : "—",
            baustelle: e.baustelle_name || <span style={{color:"#94a3b8"}}>—</span>,
            taetigkeit_fmt: e.taetigkeit ? <span style={{fontSize:13,color:"#475569"}}>{e.taetigkeit.slice(0,40)}</span> : <span style={{color:"#94a3b8"}}>—</span>,
            status_badge: e.korrigiert ? <Badge label="Korrigiert" typ="warning" /> : e.ende ? <Badge label="Abgeschlossen" typ="success" /> : <Badge label="Läuft" typ="info" />,
          }))}
          leer="Keine Einträge diesen Monat"
        />
      </Karte>

      {/* Einstempeln Modal */}
      <Modal offen={einModal} onClose={() => setEinModal(false)} titel="Einstempeln">
        <Select label="Baustelle (optional)" value={gewaehlteBaustelle} onChange={setGewaehlteBaustelle}
          optionen={[{ value: "", label: "— Keine Baustelle —" }, ...baustellen.map(b => ({ value: b.id, label: b.name }))]} />
        <Textarea label="Tätigkeit (optional)" value={taetigkeit} onChange={setTaetigkeit} placeholder="Was wird heute gemacht?" rows={2} />
        <Btn onClick={einstempeln} variant="amber" size="lg" style={{ width: "100%" }}>▶ Jetzt einstempeln</Btn>
      </Modal>

      {/* Ausstempeln Modal */}
      <Modal offen={ausModal} onClose={() => setAusModal(false)} titel="Ausstempeln">
        <Select label="Pause" value={pause} onChange={setPause}
          optionen={[{value:"0",label:"Keine Pause"},{value:"15",label:"15 Min"},{value:"30",label:"30 Min"},{value:"45",label:"45 Min"},{value:"60",label:"60 Min"}]} />
        <Textarea label="Tätigkeit" value={taetigkeit} onChange={setTaetigkeit} placeholder="Was wurde heute gemacht?" />
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0f1923", marginBottom: 8 }}>Materialien</label>
          {materialien.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", borderRadius: 6, padding: "6px 10px", marginBottom: 4, fontSize: 13 }}>
              <span>📦 {m.bezeichnung} — {m.menge}</span>
              <button onClick={() => setMaterialien(materialien.filter((_,j) => j!==i))} style={{ background:"none",border:"none",color:"#dc2626",cursor:"pointer" }}>✕</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input value={matBez} onChange={e => setMatBez(e.target.value)} placeholder="Material z.B. Kabel NYM" style={{ flex:2, padding:"8px 10px", borderRadius:6, border:"1px solid #e2e8f0", fontSize:13 }} />
            <input value={matMenge} onChange={e => setMatMenge(e.target.value)} placeholder="Menge" style={{ flex:1, padding:"8px 10px", borderRadius:6, border:"1px solid #e2e8f0", fontSize:13 }} />
            <button onClick={() => { if(matBez){ setMaterialien([...materialien,{bezeichnung:matBez,menge:matMenge}]); setMatBez(""); setMatMenge(""); }}}
              style={{ padding:"8px 14px", background:"#0f1923", color:"white", border:"none", borderRadius:6, cursor:"pointer", fontSize:16 }}>+</button>
          </div>
        </div>
        <Btn onClick={ausstempeln} variant="danger" size="lg" style={{ width: "100%" }}>⏹ Jetzt ausstempeln</Btn>
      </Modal>
    </Seite>
  );
}
