import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Lader } from "../components/ui/UI";

const MONATE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const WOCHENTAGE = ["Mo","Di","Mi","Do","Fr","Sa","So"];

export default function ZeiterfassungPage() {
  const { apiFetch, showToast } = useApp();
  const heute = new Date();
  const [monat, setMonat] = useState(heute.getMonth());
  const [jahr, setJahr] = useState(heute.getFullYear());
  const [gewTag, setGewTag] = useState(null); // null = Kalender-Ansicht
  const [eintraege, setEintraege] = useState([]);
  const [baustellen, setBaustellen] = useState([]);
  const [ueberstunden, setUeberstunden] = useState(0);
  const [laden, setLaden] = useState(true);
  const [speichern, setSpeichern] = useState(false);

  // Formular
  const [beginnUhr, setBeginnUhr] = useState("07:00");
  const [endeUhr, setEndeUhr] = useState("16:00");
  const [pausen, setPausen] = useState([]);
  const [positionen, setPositionen] = useState([{ baustelle_id:"", stunden:"", taetigkeit:"" }]);
  const [uebExtra, setUebExtra] = useState("");
  const [freizeit, setFreizeit] = useState("");

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

  function tagAnklicken(tag) {
    setGewTag(tag);
    // Vorhandene Einträge laden falls vorhanden
    const vorhandene = eintraege.filter(e => new Date(e.datum).getDate() === tag);
    if (vorhandene.length > 0) {
      const e = vorhandene[0];
      setBeginnUhr(new Date(e.beginn).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}));
      if (e.ende) setEndeUhr(new Date(e.ende).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}));
      const mat = e.materialien;
      if (mat?.pausen) setPausen(mat.pausen);
      if (mat?.positionen?.length > 0) setPositionen(mat.positionen.map(p => ({
        baustelle_id: String(p.baustelle_id || ""),
        stunden: String(p.stunden || ""),
        taetigkeit: p.taetigkeit || "",
      })));
    } else {
      setBeginnUhr("07:00"); setEndeUhr("16:00");
      setPausen([]); setPositionen([{baustelle_id:"",stunden:"",taetigkeit:""}]);
      setUebExtra(""); setFreizeit("");
    }
  }

  // Berechnung
  const berechne = () => {
    try {
      const [bh,bm] = beginnUhr.split(":").map(Number);
      const [eh,em] = endeUhr.split(":").map(Number);
      let pauseMin = 0;
      pausen.forEach(p => {
        if (p.von && p.bis) {
          const [ph,pm] = p.von.split(":").map(Number);
          const [qh,qm] = p.bis.split(":").map(Number);
          pauseMin += Math.max(0,(qh*60+qm)-(ph*60+pm));
        }
      });
      const bruttoMin = (eh*60+em)-(bh*60+bm);
      const nettoMin = Math.max(0, bruttoMin - pauseMin);
      return { brutto: bruttoMin/60, pause: pauseMin, netto: nettoMin/60 };
    } catch { return { brutto:0, pause:0, netto:0 }; }
  };
  const { brutto, pause, netto } = berechne();

  async function speichernFn() {
    if (netto <= 0) { showToast("Bitte Arbeitszeit eingeben", "err"); return; }
    setSpeichern(true);
    const datum = `${jahr}-${String(monat+1).padStart(2,"0")}-${String(gewTag).padStart(2,"0")}`;
    const res = await apiFetch("/api/zeiterfassung/manuell", {
      method: "POST",
      body: JSON.stringify({
        datum, beginn_uhr: beginnUhr, ende_uhr: endeUhr,
        pausen: pausen.filter(p => p.von && p.bis),
        positionen: positionen.filter(p => p.stunden).map(p => ({
          baustelle_id: p.baustelle_id ? Number(p.baustelle_id) : null,
          stunden: Number(p.stunden),
          taetigkeit: p.taetigkeit || null,
        })),
        ueberstunden_extra: Number(uebExtra)||0,
        freizeit_genommen: Number(freizeit)||0,
      }),
    });
    if (res?.ok) {
      const d = await res.json();
      showToast(`✓ ${d.netto_stunden}h gespeichert`);
      ladeAlles();
      setGewTag(null);
    } else {
      const err = await res?.json().catch(()=>({}));
      showToast(err?.detail || "Fehler", "err");
    }
    setSpeichern(false);
  }

  // Kalender
  const erster = new Date(jahr, monat, 1).getDay();
  const wt = erster === 0 ? 6 : erster-1;
  const tage = new Date(jahr, monat+1, 0).getDate();
  const stdProTag = {};
  eintraege.forEach(e => {
    const t = new Date(e.datum).getDate();
    stdProTag[t] = (stdProTag[t]||0) + (e.arbeitsstunden||0);
  });
  const gesamtMonat = Object.values(stdProTag).reduce((s,h)=>s+h,0);
  const tagEintraege = gewTag ? eintraege.filter(e => new Date(e.datum).getDate()===gewTag) : [];
  const datum = gewTag ? `${jahr}-${String(monat+1).padStart(2,"0")}-${String(gewTag).padStart(2,"0")}` : "";
  const kw = gewTag ? Math.ceil((new Date(jahr,monat,gewTag).getTime()-new Date(jahr,0,1).getTime())/(7*24*3600000))+1 : 0;
  const tagName = gewTag ? new Date(jahr,monat,gewTag).toLocaleDateString("de-DE",{weekday:"long"}) : "";

  if (laden) return <Lader />;

  // ── ANSICHT 1: Kalender ──────────────────────────────────────────────────────
  if (!gewTag) return (
    <div style={{ maxWidth:520, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#f59e0b", borderRadius:6, padding:"4px 12px", fontSize:11, fontWeight:800, marginBottom:10 }}>
          📅 ZEITERFASSUNG
        </div>
        <h1 style={{ fontSize:26, fontWeight:800, color:"#0f1923", margin:"0 0 2px" }}>Arbeitszeiten</h1>
        <p style={{ color:"#64748b", fontSize:13, margin:0 }}>Tag antippen zum Eintragen</p>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        <div style={{ background:"white", border:"1.5px solid #e8edf2", borderRadius:10, padding:"12px 16px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:4 }}>Stunden {MONATE[monat]}</div>
          <div style={{ fontSize:22, fontWeight:800, color:"#0f1923" }}>{gesamtMonat.toFixed(1)} h</div>
        </div>
        <div style={{ background:"white", border:"1.5px solid #e8edf2", borderRadius:10, padding:"12px 16px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:4 }}>Überstundenkonto</div>
          <div style={{ fontSize:22, fontWeight:800, color: ueberstunden>=0?"#16a34a":"#dc2626" }}>
            {ueberstunden>0?"+":""}{ueberstunden.toFixed(1)} h
          </div>
        </div>
      </div>

      {/* Kalender */}
      <div style={{ background:"white", border:"1.5px solid #e8edf2", borderRadius:12, overflow:"hidden" }}>
        {/* Monat Navigation */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", borderBottom:"1px solid #f1f5f9" }}>
          <button onClick={() => { if(monat===0){setMonat(11);setJahr(y=>y-1);}else setMonat(m=>m-1); }}
            style={{ width:36,height:36,border:"1.5px solid #e8edf2",borderRadius:8,background:"white",cursor:"pointer",fontSize:18,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
          <span style={{ fontSize:16, fontWeight:700 }}>{MONATE[monat]} {jahr}</span>
          <button onClick={() => { if(monat===11){setMonat(0);setJahr(y=>y+1);}else setMonat(m=>m+1); }}
            style={{ width:36,height:36,border:"1.5px solid #e8edf2",borderRadius:8,background:"white",cursor:"pointer",fontSize:18,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center" }}>›</button>
        </div>

        {/* Wochentage */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", background:"#f8fafc" }}>
          {WOCHENTAGE.map(w => (
            <div key={w} style={{ textAlign:"center", padding:"8px 0", fontSize:11, fontWeight:700, color: w==="Sa"||w==="So" ? "#94a3b8" : "#475569" }}>{w}</div>
          ))}
        </div>

        {/* Tage */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
          {Array.from({length:wt}).map((_,i)=><div key={`l${i}`} />)}
          {Array.from({length:tage}).map((_,i)=>{
            const tag=i+1;
            const h=stdProTag[tag];
            const istHeuteFlag=tag===heute.getDate()&&monat===heute.getMonth()&&jahr===heute.getFullYear();
            const hatEintrag=h>0;
            const wochentag=new Date(jahr,monat,tag).getDay();
            const istWE=wochentag===0||wochentag===6;
            return (
              <div key={tag} onClick={() => tagAnklicken(tag)}
                style={{
                  padding:"10px 4px 8px", textAlign:"center", cursor:"pointer",
                  borderTop:"1px solid #f1f5f9",
                  background: istHeuteFlag ? "#0f1923" : "white",
                  position:"relative", transition:"background 0.1s",
                }}
                onMouseEnter={e=>{ if(!istHeuteFlag) e.currentTarget.style.background="#fef9c3"; }}
                onMouseLeave={e=>{ if(!istHeuteFlag) e.currentTarget.style.background="white"; }}
              >
                <div style={{ fontSize:15, fontWeight: istHeuteFlag?800:500, color: istHeuteFlag?"white": istWE?"#94a3b8":"#0f1923" }}>{tag}</div>
                {hatEintrag && (
                  <div style={{ fontSize:10, fontWeight:700, color: istHeuteFlag?"#f59e0b":"#f59e0b", marginTop:2 }}>{h.toFixed(1)}h</div>
                )}
                {hatEintrag && (
                  <div style={{ width:4, height:4, background:"#f59e0b", borderRadius:"50%", margin:"3px auto 0" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 16px", borderTop:"1px solid #f1f5f9", background:"#f8fafc" }}>
          <span style={{ fontSize:13, color:"#64748b" }}>Gesamt {MONATE[monat]}</span>
          <span style={{ fontSize:15, fontWeight:800 }}>{gesamtMonat.toFixed(1)} h</span>
        </div>
      </div>
    </div>
  );

  // ── ANSICHT 2: Tagesformular ─────────────────────────────────────────────────
  return (
    <div style={{ maxWidth:520, margin:"0 auto" }}>

      {/* Back + Datum Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={() => setGewTag(null)} style={{
          width:40, height:40, border:"1.5px solid #e8edf2", borderRadius:10,
          background:"white", cursor:"pointer", fontSize:20, display:"flex",
          alignItems:"center", justifyContent:"center", flexShrink:0
        }}>←</button>
        <div>
          <div style={{ fontSize:13, color:"#94a3b8", fontWeight:600 }}>KW{kw}</div>
          <div style={{ fontSize:20, fontWeight:800, color:"#0f1923" }}>{tagName}, {String(gewTag).padStart(2,"0")}. {MONATE[monat]} {jahr}</div>
        </div>
        {tagEintraege.length > 0 && (
          <div style={{ marginLeft:"auto", background:"#f59e0b", borderRadius:8, padding:"4px 12px", fontSize:13, fontWeight:800 }}>
            {tagEintraege.reduce((s,e)=>s+(e.arbeitsstunden||0),0).toFixed(1)} h
          </div>
        )}
      </div>

      {/* ── Block 1: Arbeitszeit ── */}
      <div style={{ background:"white", border:"1.5px solid #e8edf2", borderRadius:12, padding:20, marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:800, color:"#0f1923", marginBottom:14 }}>⏰ Arbeitszeit</div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:6 }}>VON</div>
            <input type="time" value={beginnUhr} onChange={e=>setBeginnUhr(e.target.value)} style={{
              width:"100%", padding:"12px", fontSize:18, fontWeight:700, border:"2px solid #f59e0b",
              borderRadius:8, boxSizing:"border-box", outline:"none", textAlign:"center"
            }}/>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:6 }}>BIS</div>
            <input type="time" value={endeUhr} onChange={e=>setEndeUhr(e.target.value)} style={{
              width:"100%", padding:"12px", fontSize:18, fontWeight:700, border:"2px solid #f59e0b",
              borderRadius:8, boxSizing:"border-box", outline:"none", textAlign:"center"
            }}/>
          </div>
        </div>

        {/* Pausen */}
        <div style={{ borderTop:"1px solid #f1f5f9", paddingTop:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#64748b" }}>PAUSEN</div>
            <button onClick={()=>setPausen([...pausen,{von:"",bis:""}])} style={{
              background:"#f8fafc", border:"1px solid #e8edf2", borderRadius:6,
              padding:"4px 10px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#475569"
            }}>+ Pause</button>
          </div>
          {pausen.length === 0 && (
            <div style={{ fontSize:13, color:"#94a3b8", fontStyle:"italic" }}>Keine Pause eingetragen</div>
          )}
          {pausen.map((p,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <input type="time" value={p.von} onChange={e=>{const n=[...pausen];n[i]={...n[i],von:e.target.value};setPausen(n);}}
                style={{ flex:1, padding:"9px", fontSize:14, border:"1.5px solid #e8edf2", borderRadius:8, outline:"none", textAlign:"center" }}/>
              <span style={{ color:"#94a3b8", fontWeight:700 }}>–</span>
              <input type="time" value={p.bis} onChange={e=>{const n=[...pausen];n[i]={...n[i],bis:e.target.value};setPausen(n);}}
                style={{ flex:1, padding:"9px", fontSize:14, border:"1.5px solid #e8edf2", borderRadius:8, outline:"none", textAlign:"center" }}/>
              <button onClick={()=>setPausen(pausen.filter((_,j)=>j!==i))} style={{ background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:18,padding:"0 4px" }}>✕</button>
            </div>
          ))}
        </div>

        {/* Automatische Berechnung */}
        <div style={{ background:"#f8fafc", borderRadius:8, padding:"10px 14px", marginTop:14, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, textAlign:"center" }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", marginBottom:2 }}>BRUTTO</div>
            <div style={{ fontSize:16, fontWeight:800 }}>{brutto.toFixed(2)}h</div>
          </div>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", marginBottom:2 }}>PAUSE</div>
            <div style={{ fontSize:16, fontWeight:800 }}>{pause}min</div>
          </div>
          <div style={{ background:"#f59e0b", borderRadius:6, padding:"4px 0" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#92400e", marginBottom:2 }}>NETTO</div>
            <div style={{ fontSize:16, fontWeight:800 }}>{netto.toFixed(2)}h</div>
          </div>
        </div>
      </div>

      {/* ── Block 2: Baustellen ── */}
      <div style={{ background:"white", border:"1.5px solid #e8edf2", borderRadius:12, padding:20, marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:800, color:"#0f1923", marginBottom:14 }}>🏗 Baustellen & Tätigkeiten</div>
        {positionen.map((pos,i)=>(
          <div key={i} style={{ marginBottom:16, paddingBottom:16, borderBottom: i<positionen.length-1?"1px solid #f1f5f9":"none" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, marginBottom:8, alignItems:"flex-end" }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:6 }}>BAUSTELLE</div>
                <select value={pos.baustelle_id} onChange={e=>{const n=[...positionen];n[i]={...n[i],baustelle_id:e.target.value};setPositionen(n);}}
                  style={{ width:"100%", padding:"10px 12px", fontSize:14, border:"1.5px solid #e8edf2", borderRadius:8, background:"white", outline:"none" }}>
                  <option value="">— wählen —</option>
                  {baustellen.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div style={{ width:80 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:6 }}>STUNDEN</div>
                <input type="number" step="0.25" min="0" value={pos.stunden}
                  onChange={e=>{const n=[...positionen];n[i]={...n[i],stunden:e.target.value};setPositionen(n);}}
                  placeholder="h" style={{ width:"100%", padding:"10px 8px", fontSize:14, border:"1.5px solid #e8edf2", borderRadius:8, boxSizing:"border-box", textAlign:"center", outline:"none" }}/>
              </div>
            </div>
            <div style={{ marginBottom: positionen.length>1?8:0 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:6 }}>TÄTIGKEIT</div>
              <input value={pos.taetigkeit}
                onChange={e=>{const n=[...positionen];n[i]={...n[i],taetigkeit:e.target.value};setPositionen(n);}}
                placeholder="z.B. Verkabelung EG, Schalterdosen gesetzt"
                style={{ width:"100%", padding:"10px 12px", fontSize:14, border:"1.5px solid #e8edf2", borderRadius:8, boxSizing:"border-box", outline:"none" }}/>
            </div>
            {positionen.length>1 && (
              <button onClick={()=>setPositionen(positionen.filter((_,j)=>j!==i))}
                style={{ background:"#fee2e2", border:"none", borderRadius:6, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#dc2626" }}>
                Entfernen
              </button>
            )}
          </div>
        ))}
        <button onClick={()=>setPositionen([...positionen,{baustelle_id:"",stunden:"",taetigkeit:""}])}
          style={{ width:"100%", padding:"10px", background:"#f8fafc", border:"1.5px dashed #e8edf2", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", color:"#64748b" }}>
          + Weitere Baustelle
        </button>
      </div>

      {/* ── Block 3: Überstunden (ausklappbar) ── */}
      <details style={{ background:"white", border:"1.5px solid #e8edf2", borderRadius:12, marginBottom:16, overflow:"hidden" }}>
        <summary style={{ padding:"14px 20px", fontSize:13, fontWeight:700, cursor:"pointer", color:"#475569", listStyle:"none", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>⚡ Überstunden / Freizeit (optional)</span>
          <span style={{ fontSize:11, color:"#94a3b8" }}>Tippen zum Öffnen</span>
        </summary>
        <div style={{ padding:"0 20px 20px", borderTop:"1px solid #f1f5f9" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:14 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:6 }}>+ ÜBERSTUNDEN</div>
              <input type="number" step="0.25" value={uebExtra} onChange={e=>setUebExtra(e.target.value)}
                placeholder="0.0 h" style={{ width:"100%", padding:"10px 12px", fontSize:14, border:"1.5px solid #e8edf2", borderRadius:8, boxSizing:"border-box", outline:"none" }}/>
              <div style={{ fontSize:11, color:"#94a3b8", marginTop:4 }}>Werden addiert</div>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:6 }}>- FREIZEIT</div>
              <input type="number" step="0.25" value={freizeit} onChange={e=>setFreizeit(e.target.value)}
                placeholder="0.0 h" style={{ width:"100%", padding:"10px 12px", fontSize:14, border:"1.5px solid #e8edf2", borderRadius:8, boxSizing:"border-box", outline:"none" }}/>
              <div style={{ fontSize:11, color:"#94a3b8", marginTop:4 }}>Vom Konto abgezogen</div>
            </div>
          </div>
        </div>
      </details>

      {/* ── Speichern Buttons ── */}
      <button onClick={speichernFn} disabled={speichern} style={{
        width:"100%", padding:"16px", background: speichern?"#94a3b8":"#f59e0b",
        border:"none", borderRadius:12, fontSize:16, fontWeight:800,
        cursor: speichern?"not-allowed":"pointer", marginBottom:10, color:"#0f1923"
      }}>
        {speichern ? "⏳ Wird gespeichert..." : "✓ Eintrag speichern"}
      </button>

      {/* Vorhandene Einträge */}
      {tagEintraege.length > 0 && (
        <div style={{ background:"white", border:"1.5px solid #e8edf2", borderRadius:12, padding:16, marginTop:8 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", marginBottom:10 }}>GESPEICHERTE EINTRÄGE</div>
          {tagEintraege.map(e=>(
            <div key={e.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #f1f5f9" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700 }}>
                  {new Date(e.beginn).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})} – {e.ende?new Date(e.ende).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}):"—"} Uhr
                </div>
                <div style={{ fontSize:12, color:"#64748b" }}>
                  {e.pause_minuten}min Pause · {e.arbeitsstunden?.toFixed(2)}h netto
                  {e.ueberstunden!==0&&<span style={{color:e.ueberstunden>0?"#16a34a":"#dc2626"}}> · {e.ueberstunden>0?"+":""}{e.ueberstunden?.toFixed(2)}h ÜS</span>}
                </div>
                {e.baustelle_name&&<div style={{fontSize:12,color:"#475569"}}>🏗 {e.baustelle_name}</div>}
                {e.taetigkeit&&<div style={{fontSize:12,color:"#475569"}}>{e.taetigkeit}</div>}
              </div>
              <button onClick={async()=>{ if(confirm("Löschen?")){ await apiFetch(`/api/zeiterfassung/${e.id}`,{method:"DELETE"}); showToast("Gelöscht"); ladeAlles(); setGewTag(null); }}}
                style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:20,padding:"0 4px"}}>🗑</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ height:20 }} />
    </div>
  );
}