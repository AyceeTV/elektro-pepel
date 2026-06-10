import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Lader } from "../components/ui/UI";

const MONATE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const WOCHENTAGE = ["MO","DI","MI","DO","FR","SA","SO"];
const S = {
  label: { fontSize:11, fontWeight:700, color:"#64748b", letterSpacing:"0.08em", marginBottom:6, display:"block" },
  input: { width:"100%", padding:"9px 12px", fontSize:14, border:"2px solid #0f1923", borderRadius:4, boxSizing:"border-box", outline:"none", fontFamily:"inherit" },
  select: { width:"100%", padding:"9px 12px", fontSize:14, border:"2px solid #0f1923", borderRadius:4, background:"white", outline:"none", cursor:"pointer" },
  card: { background:"white", border:"2px solid #0f1923", borderRadius:4, padding:20 },
  btn: (bg, color="#0f1923") => ({ width:"100%", padding:"13px", background:bg, border:"2px solid #0f1923", borderRadius:4, fontSize:15, fontWeight:800, cursor:"pointer", color, marginBottom:8, letterSpacing:"0.02em" }),
  btnSm: (bg) => ({ padding:"6px 12px", background:bg, border:"2px solid #0f1923", borderRadius:4, fontSize:13, fontWeight:700, cursor:"pointer" }),
};

export default function ZeiterfassungPage() {
  const { apiFetch, showToast } = useApp();
  const heute = new Date();
  const [monat, setMonat] = useState(heute.getMonth());
  const [jahr, setJahr] = useState(heute.getFullYear());
  const [gewTag, setGewTag] = useState(heute.getDate());
  const [eintraege, setEintraege] = useState([]);
  const [baustellen, setBaustellen] = useState([]);
  const [ueberstunden, setUeberstunden] = useState(0);
  const [laden, setLaden] = useState(true);
  const [speichern, setSpeichern] = useState(false);

  // Formular
  const [beginnUhr, setBeginnUhr] = useState("07:00");
  const [endeUhr, setEndeUhr] = useState("16:00");
  const [pausen, setPausen] = useState([{ von:"", bis:"" }]);
  const [positionen, setPositionen] = useState([{ baustelle_id:"", stunden:"", taetigkeit:"" }]);
  const [uebExtra, setUebExtra] = useState("");
  const [freizeit, setFreizeit] = useState("");
  const [notizen, setNotizen] = useState("");

  useEffect(() => { ladeAlles(); }, [monat, jahr]);

  async function ladeAlles() {
    setLaden(true);
    const [eRes, bRes, uRes] = await Promise.all([
      apiFetch(`/api/zeiterfassung/meine?monat=${monat+1}&jahr=${jahr}`),
      apiFetch("/api/baustellen/"),
      apiFetch("/api/zeiterfassung/ueberstunden"),
    ]);
    if (eRes?.ok) setEintraege(await eRes.json());
    if (bRes?.ok) setBaustellen(await bRes.json());
    if (uRes?.ok) { const d = await uRes.json(); setUeberstunden(d.gesamt_ueberstunden); }
    setLaden(false);
  }

  // Berechnung Soll/Ist
  const berechneSollIst = () => {
    try {
      const [bh, bm] = beginnUhr.split(":").map(Number);
      const [eh, em] = endeUhr.split(":").map(Number);
      const bruttoMin = (eh * 60 + em) - (bh * 60 + bm);
      let pauseMin = 0;
      pausen.forEach(p => {
        if (p.von && p.bis) {
          const [ph, pm2] = p.von.split(":").map(Number);
          const [qh, qm] = p.bis.split(":").map(Number);
          pauseMin += (qh * 60 + qm) - (ph * 60 + pm2);
        }
      });
      const netto = Math.max(0, bruttoMin - pauseMin) / 60;
      const soll = 8.0;
      return { soll: soll.toFixed(2), ist: netto.toFixed(2), netto };
    } catch { return { soll:"8,00", ist:"0,00", netto:0 }; }
  };

  const { soll, ist, netto } = berechneSollIst();

  async function eintragSpeichern(abgeben = false) {
    setSpeichern(true);
    const datum = `${jahr}-${String(monat+1).padStart(2,"0")}-${String(gewTag).padStart(2,"0")}`;
    const res = await apiFetch("/api/zeiterfassung/manuell", {
      method: "POST",
      body: JSON.stringify({
        datum,
        beginn_uhr: beginnUhr,
        ende_uhr: endeUhr,
        pausen: pausen.filter(p => p.von && p.bis),
        positionen: positionen.filter(p => p.stunden).map(p => ({
          baustelle_id: p.baustelle_id ? Number(p.baustelle_id) : null,
          stunden: Number(p.stunden),
          taetigkeit: p.taetigkeit || null,
        })),
        ueberstunden_extra: Number(uebExtra) || 0,
        freizeit_genommen: Number(freizeit) || 0,
        notizen: notizen || null,
      }),
    });
    if (res?.ok) {
      const d = await res.json();
      showToast(`✓ ${d.netto_stunden}h gespeichert (Überstunden: ${d.ueberstunden > 0 ? "+" : ""}${d.ueberstunden}h)`);
      setPausen([{von:"",bis:""}]);
      setPositionen([{baustelle_id:"",stunden:"",taetigkeit:""}]);
      setUebExtra(""); setFreizeit(""); setNotizen("");
      ladeAlles();
    } else {
      const err = await res?.json().catch(() => ({}));
      showToast(err?.detail || "Fehler beim Speichern", "err");
    }
    setSpeichern(false);
  }

  // Kalender
  const erster = new Date(jahr, monat, 1).getDay();
  const wochentag = erster === 0 ? 6 : erster - 1;
  const tageImMonat = new Date(jahr, monat+1, 0).getDate();
  const stundenProTag = {};
  eintraege.forEach(e => {
    const tag = new Date(e.datum).getDate();
    stundenProTag[tag] = (stundenProTag[tag] || 0) + (e.arbeitsstunden || 0);
  });
  const gesamtMonat = Object.values(stundenProTag).reduce((s,h) => s+h, 0);
  const tagEintraege = eintraege.filter(e => new Date(e.datum).getDate() === gewTag && new Date(e.datum).getMonth() === monat);
  const datum = `${jahr}-${String(monat+1).padStart(2,"0")}-${String(gewTag).padStart(2,"0")}`;
  const tagName = new Date(jahr, monat, gewTag).toLocaleDateString("de-DE", { weekday:"short" });
  const kw = Math.ceil((new Date(jahr, monat, gewTag).getTime() - new Date(jahr, 0, 1).getTime()) / (7 * 24 * 3600000)) + 1;

  function vorTag() { if (gewTag > 1) setGewTag(t => t-1); else { if (monat > 0) { setMonat(m=>m-1); setGewTag(new Date(jahr, monat, 0).getDate()); } else { setJahr(y=>y-1); setMonat(11); setGewTag(31); } } }
  function nachTag() { if (gewTag < tageImMonat) setGewTag(t => t+1); else { if (monat < 11) { setMonat(m=>m+1); setGewTag(1); } else { setJahr(y=>y+1); setMonat(0); setGewTag(1); } } }

  if (laden) return <Lader />;

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#f59e0b", borderRadius:4, padding:"4px 12px", fontSize:11, fontWeight:800, marginBottom:10 }}>
          📅 ZEITERFASSUNG
        </div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#0f1923", margin:"0 0 4px", letterSpacing:"-0.5px" }}>Arbeitszeiten</h1>
        <p style={{ color:"#64748b", fontSize:14, margin:0 }}>Tag wählen, Zeiten und Tätigkeiten eintragen.</p>
      </div>

      {/* Überstundenkonto */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:20 }}>
        {[
          ["Monat", MONATE[monat], "#f59e0b"],
          ["Stunden " + MONATE[monat], gesamtMonat.toFixed(1) + " h", "#0f1923"],
          ["Überstundenkonto", (ueberstunden > 0 ? "+" : "") + ueberstunden.toFixed(1) + " h", ueberstunden >= 0 ? "#16a34a" : "#dc2626"],
        ].map(([label, wert, farbe]) => (
          <div key={label} style={{ ...S.card, padding:"14px 18px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:20, fontWeight:800, color:farbe }}>{wert}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) 400px", gap:20, alignItems:"start" }}>

        {/* ── Kalender ── */}
        <div style={{ ...S.card, padding:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", borderBottom:"1px solid #e8edf2" }}>
            <button onClick={() => { if (monat===0){setMonat(11);setJahr(y=>y-1);}else setMonat(m=>m-1); setGewTag(1); }}
              style={{ width:34, height:34, border:"2px solid #0f1923", borderRadius:4, background:"white", cursor:"pointer", fontSize:16, fontWeight:700 }}>‹</button>
            <h2 style={{ fontSize:18, fontWeight:800, margin:0 }}>{MONATE[monat]} {jahr}</h2>
            <button onClick={() => { if (monat===11){setMonat(0);setJahr(y=>y+1);}else setMonat(m=>m+1); setGewTag(1); }}
              style={{ width:34, height:34, border:"2px solid #0f1923", borderRadius:4, background:"white", cursor:"pointer", fontSize:16, fontWeight:700 }}>›</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"1px solid #e8edf2" }}>
            {WOCHENTAGE.map(w => <div key={w} style={{ textAlign:"center", padding:"8px 0", fontSize:11, fontWeight:700, color:"#94a3b8" }}>{w}</div>)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
            {Array.from({length:wochentag}).map((_,i) => <div key={`l${i}`} style={{ borderRight:"1px solid #f1f5f9", borderBottom:"1px solid #f1f5f9", minHeight:56 }} />)}
            {Array.from({length:tageImMonat}).map((_,i) => {
              const tag = i+1;
              const h = stundenProTag[tag];
              const istHeute_ = tag===heute.getDate() && monat===heute.getMonth() && jahr===heute.getFullYear();
              const gew = tag===gewTag;
              return (
                <div key={tag} onClick={() => setGewTag(tag)} style={{
                  borderRight:"1px solid #e8edf2", borderBottom:"1px solid #e8edf2", minHeight:56,
                  padding:"8px 6px", cursor:"pointer",
                  background: gew ? "#f59e0b" : istHeute_ ? "#0f1923" : "white",
                }}
                  onMouseEnter={e => { if (!gew && !istHeute_) e.currentTarget.style.background="#fef9c3"; }}
                  onMouseLeave={e => { if (!gew && !istHeute_) e.currentTarget.style.background="white"; }}
                >
                  <div style={{ fontSize:15, fontWeight:700, color: gew||istHeute_ ? (gew?"#0f1923":"white") : "#0f1923" }}>{tag}</div>
                  {h > 0 && <div style={{ fontSize:10, fontWeight:700, color: gew?"#0f1923":"#f59e0b", marginTop:2 }}>{h.toFixed(1)}h</div>}
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 20px", borderTop:"2px solid #0f1923" }}>
            <span style={{ fontSize:13, color:"#64748b" }}>Summe {MONATE[monat]}:</span>
            <span style={{ fontSize:18, fontWeight:800 }}>{gesamtMonat.toFixed(1)} h</span>
          </div>
        </div>

        {/* ── Rechte Spalte: Eingabe ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Datum + KW */}
          <div style={{ ...S.card, padding:"14px 18px", textAlign:"center" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#0f1923" }}>
              {tagName}. {String(gewTag).padStart(2,"0")}.{String(monat+1).padStart(2,"0")}.{jahr} · KW{kw}
            </div>
          </div>

          {/* Arbeitszeit */}
          <div style={S.card}>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:12 }}>Täglicher Arbeitsbeginn / -ende:</div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <span style={{ fontSize:13, color:"#64748b", width:90 }}>Arbeitszeit:</span>
              <span style={{ fontSize:13 }}>von</span>
              <input type="time" value={beginnUhr} onChange={e => setBeginnUhr(e.target.value)}
                style={{ border:"2px solid #f59e0b", borderRadius:4, padding:"5px 8px", fontSize:14, outline:"none", width:90 }} />
              <span style={{ fontSize:13 }}>bis</span>
              <input type="time" value={endeUhr} onChange={e => setEndeUhr(e.target.value)}
                style={{ border:"2px solid #f59e0b", borderRadius:4, padding:"5px 8px", fontSize:14, outline:"none", width:90 }} />
              <span style={{ fontSize:13 }}>Uhr</span>
            </div>

            {/* Pausen */}
            <div style={{ fontSize:13, fontWeight:800, margin:"12px 0 8px" }}>Pausen:</div>
            {pausen.map((p, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:13, color:"#64748b", width:90 }}>Pause {i+1}:</span>
                <span style={{ fontSize:13 }}>von</span>
                <input type="time" value={p.von} onChange={e => { const n=[...pausen]; n[i]={...n[i],von:e.target.value}; setPausen(n); }}
                  style={{ border:"2px solid #e8edf2", borderRadius:4, padding:"5px 8px", fontSize:14, outline:"none", width:90 }} />
                <span style={{ fontSize:13 }}>bis</span>
                <input type="time" value={p.bis} onChange={e => { const n=[...pausen]; n[i]={...n[i],bis:e.target.value}; setPausen(n); }}
                  style={{ border:"2px solid #e8edf2", borderRadius:4, padding:"5px 8px", fontSize:14, outline:"none", width:90 }} />
                <span style={{ fontSize:13 }}>Uhr</span>
                {pausen.length > 1 && <button onClick={() => setPausen(pausen.filter((_,j)=>j!==i))} style={{ background:"none", border:"none", color:"#dc2626", cursor:"pointer", fontSize:16 }}>✕</button>}
              </div>
            ))}
            <button onClick={() => setPausen([...pausen,{von:"",bis:""}])}
              style={{ ...S.btnSm("white"), marginTop:4, fontSize:12 }}>+ Pause hinzufügen</button>
          </div>

          {/* Baustellen / Kostenstellen */}
          <div style={S.card}>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:12 }}>Kostenstellen:</div>
            {positionen.map((pos, i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 70px", gap:8, marginBottom:10 }}>
                <div>
                  <span style={S.label}>Baustelle</span>
                  <select value={pos.baustelle_id} onChange={e => { const n=[...positionen]; n[i]={...n[i],baustelle_id:e.target.value}; setPositionen(n); }} style={S.select}>
                    <option value="">— wählen —</option>
                    {baustellen.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <span style={S.label}>Std.</span>
                  <input type="number" step="0.25" min="0" value={pos.stunden}
                    onChange={e => { const n=[...positionen]; n[i]={...n[i],stunden:e.target.value}; setPositionen(n); }}
                    placeholder="Std." style={{ ...S.input, textAlign:"center" }} />
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <input value={pos.taetigkeit}
                    onChange={e => { const n=[...positionen]; n[i]={...n[i],taetigkeit:e.target.value}; setPositionen(n); }}
                    placeholder="Was wurde gemacht? z.B. Verkabelung EG"
                    style={{ ...S.input, fontSize:13 }} />
                </div>
                {positionen.length > 1 && (
                  <button onClick={() => setPositionen(positionen.filter((_,j)=>j!==i))}
                    style={{ gridColumn:"1/-1", ...S.btnSm("#fee2e2"), color:"#dc2626", fontSize:12 }}>Baustelle entfernen</button>
                )}
              </div>
            ))}
            <button onClick={() => setPositionen([...positionen,{baustelle_id:"",stunden:"",taetigkeit:""}])}
              style={{ ...S.btnSm("white"), fontSize:12 }}>+ Baustelle hinzufügen</button>

            {/* Soll/Ist Anzeige */}
            <div style={{ textAlign:"center", fontSize:13, color:"#64748b", marginTop:14, padding:"10px", background:"#f8fafc", borderRadius:4 }}>
              Summe Soll: <strong>{soll}</strong> · Summe Ist: <strong style={{ color: Number(ist) >= Number(soll) ? "#16a34a" : "#dc2626" }}>{ist}</strong>
            </div>
          </div>

          {/* Überstunden / Freizeit */}
          <div style={S.card}>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:12 }}>Überstunden / Freizeit:</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div>
                <span style={S.label}>+ Überstunden</span>
                <input type="number" step="0.25" min="0" value={uebExtra} onChange={e => setUebExtra(e.target.value)}
                  placeholder="0.0 h" style={S.input} />
                <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>Werden addiert</div>
              </div>
              <div>
                <span style={S.label}>- Freizeit genommen</span>
                <input type="number" step="0.25" min="0" value={freizeit} onChange={e => setFreizeit(e.target.value)}
                  placeholder="0.0 h" style={S.input} />
                <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>Vom Konto abgezogen</div>
              </div>
            </div>
          </div>

          {/* Notizen */}
          <div style={S.card}>
            <span style={S.label}>Notizen (optional)</span>
            <textarea value={notizen} onChange={e => setNotizen(e.target.value)}
              rows={2} placeholder="Besonderheiten..."
              style={{ ...S.input, resize:"vertical" }} />
          </div>

          {/* Buttons */}
          <div>
            <button onClick={() => eintragSpeichern(false)} disabled={speichern}
              style={S.btn("#f59e0b")}>
              {speichern ? "⏳ Wird gespeichert..." : "Zwischenspeichern"}
            </button>
            <button onClick={() => eintragSpeichern(true)} disabled={speichern}
              style={S.btn("#16a34a", "white")}>
              ✓ Verbindlich abgeben
            </button>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <button onClick={vorTag} style={S.btn("white")}>◀ vorheriger Tag</button>
              <button onClick={nachTag} style={S.btn("white")}>nächster Tag ▶</button>
            </div>
          </div>

          {/* Einträge des Tages */}
          {tagEintraege.length > 0 && (
            <div style={S.card}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:12 }}>Einträge am {datum}</div>
              {tagEintraege.map(e => (
                <div key={e.id} style={{ padding:"10px 0", borderBottom:"1px solid #f1f5f9" }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14 }}>
                        {new Date(e.beginn).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})} –{" "}
                        {e.ende ? new Date(e.ende).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}) : "—"} Uhr
                      </div>
                      <div style={{ fontSize:12, color:"#64748b" }}>
                        Pause: {e.pause_minuten} Min · Netto: {e.arbeitsstunden?.toFixed(2)} h
                        {e.ueberstunden !== 0 && <span style={{ color: e.ueberstunden > 0 ? "#16a34a" : "#dc2626" }}> · ÜS: {e.ueberstunden > 0 ? "+" : ""}{e.ueberstunden?.toFixed(2)}h</span>}
                      </div>
                      {e.baustelle_name && <div style={{ fontSize:12, color:"#475569" }}>🏗 {e.baustelle_name}</div>}
                      {e.taetigkeit && <div style={{ fontSize:12, color:"#475569" }}>{e.taetigkeit}</div>}
                    </div>
                    <button onClick={async () => {
                      if (confirm("Eintrag löschen?")) {
                        await apiFetch(`/api/zeiterfassung/${e.id}`, { method:"DELETE" });
                        showToast("Gelöscht"); ladeAlles();
                      }
                    }} style={{ background:"none", border:"none", color:"#dc2626", cursor:"pointer", fontSize:18 }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}