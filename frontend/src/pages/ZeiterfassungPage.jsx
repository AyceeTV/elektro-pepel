import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Lader } from "../components/ui/UI";

const MONATE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const WOCHENTAGE = ["Mo","Di","Mi","Do","Fr","Sa","So"];
const MAX_STD = 8.25;
const PAUSE_AB = 6.0;
const PFLICHT_PAUSE = 30;

// Berechnet Netto aus Beginn, Ende, Pausen
function berechne(bUhr, eUhr, pausen) {
  try {
    const [bh,bm] = bUhr.split(":").map(Number);
    const [eh,em] = eUhr.split(":").map(Number);
    const bruttoMin = (eh*60+em)-(bh*60+bm);
    let pauseMin = 0;
    pausen.forEach(p => {
      if (p.von && p.bis) {
        const [ph,pm] = p.von.split(":").map(Number);
        const [qh,qm] = p.bis.split(":").map(Number);
        pauseMin += Math.max(0,(qh*60+qm)-(ph*60+pm));
      }
    });
    const nettoMin = Math.max(0, bruttoMin - pauseMin);
    return { brutto: bruttoMin/60, pause: pauseMin, netto: nettoMin/60, ok: bruttoMin > 0 };
  } catch { return { brutto:0, pause:0, netto:0, ok:false }; }
}

export default function ZeiterfassungPage() {
  const { apiFetch, showToast, user } = useApp();
  const heute = new Date();
  const [monat, setMonat] = useState(heute.getMonth());
  const [jahr, setJahr] = useState(heute.getFullYear());
  const [gewTag, setGewTag] = useState(null);
  const [eintraege, setEintraege] = useState([]);
  const [baustellen, setBaustellen] = useState([]);
  const [ueberstunden, setUeberstunden] = useState(0);
  const [offeneGenehmigungen, setOffeneGenehmigungen] = useState([]);
  const [laden, setLaden] = useState(true);
  const [speichern, setSpeichern] = useState(false);
  const [ansicht, setAnsicht] = useState("kalender"); // "kalender" | "tag" | "genehmigungen"

  // Formular
  const [beginnUhr, setBeginnUhr] = useState("07:00");
  const [endeUhr, setEndeUhr] = useState("16:00");
  const [pausen, setPausen] = useState([]);
  const [positionen, setPositionen] = useState([{baustelle_id:"",stunden:"",taetigkeit:""}]);
  const [uebExtra, setUebExtra] = useState("");
  const [freizeit, setFreizeit] = useState("");
  const [pauseWarnung, setPauseWarnung] = useState(false);

  const istVorgesetzter = ["admin","vorgesetzter","bauleiter"].includes(user.rolle);

  useEffect(() => { ladeAlles(); }, [monat, jahr]);

  // Automatische Pause wenn Netto >= 6h
  useEffect(() => {
    const { netto } = berechne(beginnUhr, endeUhr, pausen);
    if (netto >= PAUSE_AB && pausen.length === 0) {
      setPausen([{ von:"09:00", bis:"09:30" }]);
      setPauseWarnung(true);
    } else {
      setPauseWarnung(false);
    }
  }, [beginnUhr, endeUhr]);

  async function ladeAlles() {
    setLaden(true);
    const calls = [
      apiFetch(`/api/zeiterfassung/meine?monat=${monat+1}&jahr=${jahr}`),
      apiFetch("/api/baustellen/"),
      apiFetch("/api/zeiterfassung/ueberstunden"),
    ];
    if (istVorgesetzter) calls.push(apiFetch("/api/zeiterfassung/genehmigung/offen"));
    const [eRes, bRes, uRes, gRes] = await Promise.all(calls);
    if (eRes?.ok) setEintraege(await eRes.json());
    if (bRes?.ok) setBaustellen(await bRes.json());
    if (uRes?.ok) { const d = await uRes.json(); setUeberstunden(d.gesamt_ueberstunden); }
    if (gRes?.ok) setOffeneGenehmigungen(await gRes.json());
    setLaden(false);
  }

  function tagAnklicken(tag) {
    const vorh = eintraege.filter(e => new Date(e.datum).getDate()===tag);
    if (vorh.length > 0) {
      const e = vorh[0];
      setBeginnUhr(new Date(e.beginn).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}));
      if (e.ende) setEndeUhr(new Date(e.ende).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}));
      const mat = e.materialien || {};
      if (mat.pausen?.length > 0) setPausen(mat.pausen);
      else setPausen([]);
      if (mat.positionen?.length > 0) setPositionen(mat.positionen.map(p => ({
        baustelle_id: String(p.baustelle_id||""), stunden: String(p.stunden||""), taetigkeit: p.taetigkeit||"",
      })));
      else setPositionen([{baustelle_id:"",stunden:"",taetigkeit:""}]);
    } else {
      setBeginnUhr("07:00"); setEndeUhr("16:00");
      setPausen([]); setPositionen([{baustelle_id:"",stunden:"",taetigkeit:""}]);
      setUebExtra(""); setFreizeit("");
    }
    setGewTag(tag);
    setAnsicht("tag");
  }

  const { brutto, pause, netto } = berechne(beginnUhr, endeUhr, pausen);
  const nettoAnzeige = Math.min(netto, MAX_STD);
  const ueberstundenAktuell = Math.max(0, netto - MAX_STD) + (Number(uebExtra)||0) - (Number(freizeit)||0);

  // Validierung
  const validierung = () => {
    if (netto >= PAUSE_AB) {
      const pauseMin = berechne(beginnUhr, endeUhr, pausen).pause;
      if (pauseMin < PFLICHT_PAUSE) return `Ab ${PAUSE_AB}h Arbeitszeit sind ${PFLICHT_PAUSE} Min Pause Pflicht.`;
    }
    if (netto > MAX_STD && !uebExtra) return `Max. ${MAX_STD}h/Tag. Mehrarbeit als Überstunden eintragen.`;
    return null;
  };

  async function speichernFn() {
    const fehler = validierung();
    if (fehler) { showToast(fehler, "err"); return; }
    if (nettoAnzeige <= 0) { showToast("Bitte Arbeitszeit eingeben", "err"); return; }
    setSpeichern(true);
    const datum = `${jahr}-${String(monat+1).padStart(2,"0")}-${String(gewTag).padStart(2,"0")}`;
    const res = await apiFetch("/api/zeiterfassung/manuell", {
      method:"POST",
      body: JSON.stringify({
        datum, beginn_uhr:beginnUhr, ende_uhr:endeUhr,
        pausen: pausen.filter(p=>p.von&&p.bis),
        positionen: positionen.filter(p=>p.stunden).map(p=>({
          baustelle_id: p.baustelle_id?Number(p.baustelle_id):null,
          stunden: Number(p.stunden), taetigkeit: p.taetigkeit||null,
        })),
        ueberstunden_extra: Number(uebExtra)||0,
        freizeit_genommen: Number(freizeit)||0,
      }),
    });
    if (res?.ok) {
      const d = await res.json();
      showToast(d.wartet_auf_genehmigung ? "✓ Gespeichert — wartet auf Genehmigung" : `✓ ${d.netto_stunden}h gespeichert`);
      ladeAlles(); setAnsicht("kalender"); setGewTag(null);
    } else {
      const err = await res?.json().catch(()=>({}));
      showToast(err?.detail||"Fehler", "err");
    }
    setSpeichern(false);
  }

  async function genehmigenFn(id) {
    const res = await apiFetch(`/api/zeiterfassung/${id}/genehmigen`, {method:"PUT"});
    if (res?.ok) { showToast("✓ Genehmigt"); ladeAlles(); }
    else showToast("Fehler", "err");
  }

  async function ablehnenFn(id) {
    const grund = prompt("Ablehnungsgrund:");
    if (grund === null) return;
    const res = await apiFetch(`/api/zeiterfassung/${id}/ablehnen?grund=${encodeURIComponent(grund)}`, {method:"PUT"});
    if (res?.ok) { showToast("Abgelehnt"); ladeAlles(); }
  }

  // Kalender
  const erster = new Date(jahr,monat,1).getDay();
  const wt = erster===0?6:erster-1;
  const tage = new Date(jahr,monat+1,0).getDate();
  const stdProTag = {};
  eintraege.forEach(e => { const t=new Date(e.datum).getDate(); stdProTag[t]=(stdProTag[t]||0)+(e.arbeitsstunden||0); });
  const statusProTag = {};
  eintraege.forEach(e => { const t=new Date(e.datum).getDate(); const mat=e.materialien||{}; statusProTag[t]=mat.genehmigt; });
  const gesamtMonat = Object.values(stdProTag).reduce((s,h)=>s+h,0);
  const tagEintraege = gewTag ? eintraege.filter(e=>new Date(e.datum).getDate()===gewTag) : [];
  const datum = gewTag ? `${jahr}-${String(monat+1).padStart(2,"0")}-${String(gewTag).padStart(2,"0")}` : "";
  const kw = gewTag ? Math.ceil((new Date(jahr,monat,gewTag).getTime()-new Date(jahr,0,1).getTime())/(7*24*3600000))+1 : 0;
  const tagName = gewTag ? new Date(jahr,monat,gewTag).toLocaleDateString("de-DE",{weekday:"long"}) : "";

  if (laden) return <Lader />;

  // ── GENEHMIGUNGEN ──────────────────────────────────────────────────────────
  if (ansicht === "genehmigungen") return (
    <div style={{maxWidth:520,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={()=>setAnsicht("kalender")} style={{width:40,height:40,border:"1.5px solid #e8edf2",borderRadius:10,background:"white",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"#94a3b8"}}>BAULEITER</div>
          <div style={{fontSize:20,fontWeight:800,color:"#0f1923"}}>Stundenzettel genehmigen</div>
        </div>
      </div>

      {offeneGenehmigungen.length === 0 ? (
        <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:40,textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:12}}>✅</div>
          <div style={{color:"#64748b",fontSize:15}}>Alle Stundenzettel genehmigt</div>
        </div>
      ) : offeneGenehmigungen.map(e => (
        <div key={e.id} style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:20,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:"#0f1923"}}>{e.mitarbeiter}</div>
              <div style={{fontSize:13,color:"#64748b"}}>{new Date(e.datum).toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"})}</div>
            </div>
            <div style={{background:"#fef3c7",borderRadius:8,padding:"4px 12px",fontSize:13,fontWeight:700,color:"#92400e"}}>
              {e.arbeitsstunden?.toFixed(2)}h
            </div>
          </div>
          <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center",marginBottom:8}}>
              <div><div style={{color:"#94a3b8",fontSize:11,fontWeight:700}}>VON</div><div style={{fontWeight:700}}>{new Date(e.beginn).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}</div></div>
              <div><div style={{color:"#94a3b8",fontSize:11,fontWeight:700}}>BIS</div><div style={{fontWeight:700}}>{e.ende?new Date(e.ende).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}):"—"}</div></div>
              <div><div style={{color:"#94a3b8",fontSize:11,fontWeight:700}}>PAUSE</div><div style={{fontWeight:700}}>{e.pause_minuten}min</div></div>
            </div>
            <div style={{borderTop:"1px solid #e8edf2",paddingTop:8}}>
              <div style={{color:"#94a3b8",fontSize:11,fontWeight:700,marginBottom:4}}>BAUSTELLE</div>
              <div style={{fontWeight:600}}>🏗 {e.baustelle}</div>
            </div>
            {e.taetigkeit && <div style={{marginTop:6,color:"#475569"}}>📝 {e.taetigkeit}</div>}
            {e.pausen?.length>0 && <div style={{marginTop:6,color:"#64748b",fontSize:12}}>
              Pausen: {e.pausen.map(p=>`${p.von}–${p.bis}`).join(", ")}
            </div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <button onClick={()=>genehmigenFn(e.id)} style={{padding:"12px",background:"#16a34a",border:"none",borderRadius:10,color:"white",fontSize:14,fontWeight:800,cursor:"pointer"}}>
              ✓ Genehmigen
            </button>
            <button onClick={()=>ablehnenFn(e.id)} style={{padding:"12px",background:"white",border:"1.5px solid #dc2626",borderRadius:10,color:"#dc2626",fontSize:14,fontWeight:800,cursor:"pointer"}}>
              ✕ Ablehnen
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  // ── TAGESFORMULAR ──────────────────────────────────────────────────────────
  if (ansicht === "tag") return (
    <div style={{maxWidth:520,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={()=>{setAnsicht("kalender");setGewTag(null);}} style={{width:40,height:40,border:"1.5px solid #e8edf2",borderRadius:10,background:"white",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:700,color:"#94a3b8"}}>KW{kw}</div>
          <div style={{fontSize:18,fontWeight:800,color:"#0f1923"}}>{tagName}, {String(gewTag).padStart(2,"0")}. {MONATE[monat]}</div>
        </div>
        {tagEintraege.length>0 && (
          <div style={{background: (tagEintraege[0]?.materialien?.genehmigt===true||tagEintraege[0]?.materialien?.genehmigt===undefined&&tagEintraege[0]) ? "#dcfce7" : tagEintraege[0]?.materialien?.genehmigt===false?"#fee2e2":"#fef3c7", borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:700,color: tagEintraege[0]?.materialien?.genehmigt===true?"#15803d":tagEintraege[0]?.materialien?.genehmigt===false?"#991b1b":"#92400e"}}>
            {tagEintraege[0]?.materialien?.genehmigt===true?"✓ Genehmigt":tagEintraege[0]?.materialien?.genehmigt===false?"✕ Abgelehnt":"⏳ Ausstehend"}
          </div>
        )}
      </div>

      {/* Automatische Pause Hinweis */}
      {pauseWarnung && (
        <div style={{background:"#fffbeb",border:"1.5px solid #f59e0b",borderRadius:10,padding:"10px 16px",marginBottom:12,fontSize:13,color:"#92400e",display:"flex",gap:8,alignItems:"center"}}>
          <span>⚠️</span> Pause automatisch eingetragen (Pflicht ab {PAUSE_AB}h)
        </div>
      )}

      {/* Arbeitszeit Block */}
      <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:20,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:800,color:"#0f1923",marginBottom:14}}>⏰ Arbeitszeit</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>VON</div>
            <input type="time" value={beginnUhr} onChange={e=>setBeginnUhr(e.target.value)} style={{width:"100%",padding:"12px",fontSize:18,fontWeight:700,border:"2px solid #f59e0b",borderRadius:8,boxSizing:"border-box",outline:"none",textAlign:"center"}}/>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>BIS</div>
            <input type="time" value={endeUhr} onChange={e=>setEndeUhr(e.target.value)} style={{width:"100%",padding:"12px",fontSize:18,fontWeight:700,border:"2px solid #f59e0b",borderRadius:8,boxSizing:"border-box",outline:"none",textAlign:"center"}}/>
          </div>
        </div>

        {/* Pausen */}
        <div style={{borderTop:"1px solid #f1f5f9",paddingTop:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:700,color:"#64748b"}}>PAUSEN</div>
            <button onClick={()=>setPausen([...pausen,{von:"",bis:""}])} style={{background:"#f8fafc",border:"1px solid #e8edf2",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:600,cursor:"pointer",color:"#475569"}}>+ Pause</button>
          </div>
          {pausen.length===0&&<div style={{fontSize:13,color:"#94a3b8",fontStyle:"italic"}}>Keine Pause</div>}
          {pausen.map((p,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <input type="time" value={p.von} onChange={e=>{const n=[...pausen];n[i]={...n[i],von:e.target.value};setPausen(n);}}
                style={{flex:1,padding:"9px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,outline:"none",textAlign:"center"}}/>
              <span style={{color:"#94a3b8",fontWeight:700}}>–</span>
              <input type="time" value={p.bis} onChange={e=>{const n=[...pausen];n[i]={...n[i],bis:e.target.value};setPausen(n);}}
                style={{flex:1,padding:"9px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,outline:"none",textAlign:"center"}}/>
              <button onClick={()=>setPausen(pausen.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:18,padding:"0 4px"}}>✕</button>
            </div>
          ))}
        </div>

        {/* Live Berechnung */}
        <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 14px",marginTop:14,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center"}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",marginBottom:2}}>BRUTTO</div>
            <div style={{fontSize:16,fontWeight:800}}>{brutto.toFixed(2)}h</div>
          </div>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",marginBottom:2}}>PAUSE</div>
            <div style={{fontSize:16,fontWeight:800}}>{pause}min</div>
          </div>
          <div style={{background:"#f59e0b",borderRadius:6,padding:"4px 0"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#92400e",marginBottom:2}}>NETTO</div>
            <div style={{fontSize:16,fontWeight:800}}>{nettoAnzeige.toFixed(2)}h</div>
          </div>
        </div>

        {/* Warnung max Stunden */}
        {netto > MAX_STD && (
          <div style={{marginTop:10,background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#92400e"}}>
            ⚠️ {(netto-MAX_STD).toFixed(2)}h über dem Maximum ({MAX_STD}h) — bitte als Überstunden eintragen
          </div>
        )}
      </div>

      {/* Baustellen Block */}
      <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:20,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:800,color:"#0f1923",marginBottom:14}}>🏗 Baustellen & Tätigkeiten</div>
        {positionen.map((pos,i)=>(
          <div key={i} style={{marginBottom:16,paddingBottom:16,borderBottom:i<positionen.length-1?"1px solid #f1f5f9":"none"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 80px",gap:8,marginBottom:8,alignItems:"flex-end"}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>BAUSTELLE</div>
                <select value={pos.baustelle_id} onChange={e=>{const n=[...positionen];n[i]={...n[i],baustelle_id:e.target.value};setPositionen(n);}}
                  style={{width:"100%",padding:"10px 12px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,background:"white",outline:"none"}}>
                  <option value="">— wählen —</option>
                  {baustellen.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>STD.</div>
                <input type="number" step="0.25" min="0" value={pos.stunden}
                  onChange={e=>{const n=[...positionen];n[i]={...n[i],stunden:e.target.value};setPositionen(n);}}
                  placeholder="h" style={{width:"100%",padding:"10px 8px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,boxSizing:"border-box",textAlign:"center",outline:"none"}}/>
              </div>
            </div>
            <input value={pos.taetigkeit} onChange={e=>{const n=[...positionen];n[i]={...n[i],taetigkeit:e.target.value};setPositionen(n);}}
              placeholder="z.B. Verkabelung EG, Schalterdosen gesetzt"
              style={{width:"100%",padding:"10px 12px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,boxSizing:"border-box",outline:"none"}}/>
            {positionen.length>1&&<button onClick={()=>setPositionen(positionen.filter((_,j)=>j!==i))} style={{marginTop:8,background:"#fee2e2",border:"none",borderRadius:6,padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer",color:"#dc2626"}}>Entfernen</button>}
          </div>
        ))}
        <button onClick={()=>setPositionen([...positionen,{baustelle_id:"",stunden:"",taetigkeit:""}])}
          style={{width:"100%",padding:"10px",background:"#f8fafc",border:"1.5px dashed #e8edf2",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",color:"#64748b"}}>
          + Weitere Baustelle
        </button>
      </div>

      {/* Überstunden ausgeklappt */}
      <details style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,marginBottom:16,overflow:"hidden"}}>
        <summary style={{padding:"14px 20px",fontSize:13,fontWeight:700,cursor:"pointer",color:"#475569",listStyle:"none",display:"flex",justifyContent:"space-between"}}>
          <span>⚡ Überstunden / Freizeit (optional)</span>
          <span style={{fontSize:11,color:"#94a3b8"}}>▾</span>
        </summary>
        <div style={{padding:"0 20px 20px",borderTop:"1px solid #f1f5f9"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:14}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>+ ÜBERSTUNDEN</div>
              <input type="number" step="0.25" value={uebExtra} onChange={e=>setUebExtra(e.target.value)} placeholder="0.0 h"
                style={{width:"100%",padding:"10px 12px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,boxSizing:"border-box",outline:"none"}}/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>- FREIZEIT</div>
              <input type="number" step="0.25" value={freizeit} onChange={e=>setFreizeit(e.target.value)} placeholder="0.0 h"
                style={{width:"100%",padding:"10px 12px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,boxSizing:"border-box",outline:"none"}}/>
            </div>
          </div>
          {ueberstundenAktuell!==0&&<div style={{marginTop:10,textAlign:"center",fontSize:13,fontWeight:700,color:ueberstundenAktuell>0?"#16a34a":"#dc2626"}}>
            Überstunden heute: {ueberstundenAktuell>0?"+":""}{ueberstundenAktuell.toFixed(2)}h
          </div>}
        </div>
      </details>

      <button onClick={speichernFn} disabled={speichern} style={{width:"100%",padding:"16px",background:speichern?"#94a3b8":"#f59e0b",border:"none",borderRadius:12,fontSize:16,fontWeight:800,cursor:speichern?"not-allowed":"pointer",marginBottom:10,color:"#0f1923"}}>
        {speichern?"⏳ Wird gespeichert...":"✓ Eintrag speichern"}
      </button>

      {tagEintraege.length>0&&(
        <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:16,marginTop:4}}>
          <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:10}}>GESPEICHERTE EINTRÄGE</div>
          {tagEintraege.map(e=>{
            const mat=e.materialien||{};
            const gen=mat.genehmigt;
            return (
              <div key={e.id} style={{padding:"10px 0",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:700}}>{new Date(e.beginn).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})} – {e.ende?new Date(e.ende).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}):"—"}</span>
                    <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:6,background:gen===true?"#dcfce7":gen===false?"#fee2e2":"#fef3c7",color:gen===true?"#15803d":gen===false?"#991b1b":"#92400e"}}>
                      {gen===true?"✓ Genehmigt":gen===false?"✕ Abgelehnt":"⏳ Ausstehend"}
                    </span>
                  </div>
                  <div style={{fontSize:12,color:"#64748b"}}>{e.pause_minuten}min Pause · {gen===true?(e.arbeitsstunden?.toFixed(2)+"h"):"--.--h"} netto</div>
                  {e.baustelle_name&&<div style={{fontSize:12,color:"#475569"}}>🏗 {e.baustelle_name}</div>}
                  {gen===false&&mat.ablehnungsgrund&&<div style={{fontSize:12,color:"#dc2626",marginTop:2}}>Grund: {mat.ablehnungsgrund}</div>}
                </div>
                <button onClick={async()=>{if(confirm("Löschen?")){await apiFetch(`/api/zeiterfassung/${e.id}`,{method:"DELETE"});showToast("Gelöscht");ladeAlles();setAnsicht("kalender");setGewTag(null);}}}
                  style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:18,padding:"0 4px",flexShrink:0}}>🗑</button>
              </div>
            );
          })}
        </div>
      )}
      <div style={{height:20}}/>
    </div>
  );

  // ── KALENDER ──────────────────────────────────────────────────────────────
  return (
    <div style={{maxWidth:520,margin:"0 auto"}}>
      <div style={{marginBottom:20}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#f59e0b",borderRadius:6,padding:"4px 12px",fontSize:11,fontWeight:800,marginBottom:10}}>📅 ZEITERFASSUNG</div>
        <h1 style={{fontSize:26,fontWeight:800,color:"#0f1923",margin:"0 0 2px"}}>Arbeitszeiten</h1>
        <p style={{color:"#64748b",fontSize:13,margin:0}}>Tag antippen zum Eintragen</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:10,padding:"12px 16px"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:4}}>Stunden {MONATE[monat]}</div>
          <div style={{fontSize:22,fontWeight:800}}>{gesamtMonat.toFixed(1)} h</div>
        </div>
        <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:10,padding:"12px 16px",cursor:istVorgesetzter&&offeneGenehmigungen.length>0?"pointer":"default"}}
          onClick={()=>istVorgesetzter&&offeneGenehmigungen.length>0&&setAnsicht("genehmigungen")}>
          <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:4}}>
            {istVorgesetzter?"Offene Genehmigungen":"Überstundenkonto"}
          </div>
          <div style={{fontSize:22,fontWeight:800,color:istVorgesetzter?(offeneGenehmigungen.length>0?"#dc2626":"#16a34a"):(ueberstunden>=0?"#16a34a":"#dc2626")}}>
            {istVorgesetzter?(offeneGenehmigungen.length>0?`${offeneGenehmigungen.length} offen`:"Alle OK"):`${ueberstunden>0?"+":""}${ueberstunden.toFixed(1)} h`}
          </div>
          {istVorgesetzter&&offeneGenehmigungen.length>0&&<div style={{fontSize:11,color:"#64748b",marginTop:2}}>Tippen →</div>}
        </div>
      </div>

      <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderBottom:"1px solid #f1f5f9"}}>
          <button onClick={()=>{if(monat===0){setMonat(11);setJahr(y=>y-1);}else setMonat(m=>m-1);}}
            style={{width:36,height:36,border:"1.5px solid #e8edf2",borderRadius:8,background:"white",cursor:"pointer",fontSize:18,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <span style={{fontSize:16,fontWeight:700}}>{MONATE[monat]} {jahr}</span>
          <button onClick={()=>{if(monat===11){setMonat(0);setJahr(y=>y+1);}else setMonat(m=>m+1);}}
            style={{width:36,height:36,border:"1.5px solid #e8edf2",borderRadius:8,background:"white",cursor:"pointer",fontSize:18,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:"#f8fafc"}}>
          {WOCHENTAGE.map(w=><div key={w} style={{textAlign:"center",padding:"8px 0",fontSize:11,fontWeight:700,color:w==="Sa"||w==="So"?"#94a3b8":"#475569"}}>{w}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
          {Array.from({length:wt}).map((_,i)=><div key={`l${i}`}/>)}
          {Array.from({length:tage}).map((_,i)=>{
            const tag=i+1;
            const h=stdProTag[tag];
            const gen=statusProTag[tag];
            const istHeuteFlag=tag===heute.getDate()&&monat===heute.getMonth()&&jahr===heute.getFullYear();
            const wochentag=new Date(jahr,monat,tag).getDay();
            const istWE=wochentag===0||wochentag===6;
            return (
              <div key={tag} onClick={()=>tagAnklicken(tag)} style={{padding:"10px 4px 8px",textAlign:"center",cursor:"pointer",borderTop:"1px solid #f1f5f9",background:istHeuteFlag?"#0f1923":"white",position:"relative",transition:"background 0.1s"}}
                onMouseEnter={e=>{if(!istHeuteFlag)e.currentTarget.style.background="#fef9c3";}}
                onMouseLeave={e=>{if(!istHeuteFlag)e.currentTarget.style.background="white";}}>
                <div style={{fontSize:15,fontWeight:istHeuteFlag?800:500,color:istHeuteFlag?"white":istWE?"#94a3b8":"#0f1923"}}>{tag}</div>
                {h>0&&<div style={{fontSize:10,fontWeight:700,color:istHeuteFlag?"#f59e0b":"#f59e0b",marginTop:2}}>{h.toFixed(1)}h</div>}
                {h>0&&<div style={{width:6,height:6,borderRadius:"50%",margin:"2px auto 0",background:gen===true?"#16a34a":gen===false?"#dc2626":"#f59e0b"}}/>}
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"12px 16px",borderTop:"1px solid #f1f5f9",background:"#f8fafc"}}>
          <span style={{fontSize:13,color:"#64748b"}}>Gesamt {MONATE[monat]}</span>
          <span style={{fontSize:15,fontWeight:800}}>{gesamtMonat.toFixed(1)} h</span>
        </div>
      </div>

      {/* Legende */}
      <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:12,fontSize:12,color:"#64748b"}}>
        <span>🟢 Genehmigt</span>
        <span>🟡 Ausstehend</span>
        <span>🔴 Abgelehnt</span>
      </div>
    </div>
  );
}