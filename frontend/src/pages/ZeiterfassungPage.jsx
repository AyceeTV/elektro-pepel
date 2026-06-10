import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Lader } from "../components/ui/UI";

const MONATE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const WOCHENTAGE = ["Mo","Di","Mi","Do","Fr","Sa","So"];

// Tag-Typen mit Farben
const TAG_TYPEN = {
  arbeit_genehmigt:  { bg:"#dcfce7", text:"#15803d", punkt:"#16a34a",  label:"Genehmigt" },
  arbeit_ausstehend: { bg:"#fef9c3", text:"#92400e", punkt:"#f59e0b",  label:"Ausstehend" },
  arbeit_abgelehnt:  { bg:"#fee2e2", text:"#991b1b", punkt:"#dc2626",  label:"Abgelehnt" },
  urlaub_ausstehend: { bg:"#e0f2fe", text:"#075985", punkt:"#0ea5e9",  label:"Urlaub ⏳" },
  urlaub_genehmigt:  { bg:"#bfdbfe", text:"#1e3a8a", punkt:"#3b82f6",  label:"Urlaub ✓" },
  krank:             { bg:"#fce7f3", text:"#9d174d", punkt:"#ec4899",  label:"Krank" },
  fortbildung_ausstehend: { bg:"#ede9fe", text:"#4c1d95", punkt:"#8b5cf6", label:"Fortbildung ⏳" },
  fortbildung_genehmigt:  { bg:"#ddd6fe", text:"#3b0764", punkt:"#7c3aed",  label:"Fortbildung ✓" },
  feiertag:          { bg:"#f1f5f9", text:"#475569", punkt:"#94a3b8",  label:"Feiertag" },
};

// Automatische Pausen-Berechnung
function berechneZeiten(gesamtStunden) {
  const START = 7 * 60;
  let pausen = [], pausenMinuten = 0;
  if (gesamtStunden >= 8.25) {
    pausen = [{ von:"09:00", bis:"09:30" }, { von:"12:00", bis:"12:30" }];
    pausenMinuten = 60;
  } else if (gesamtStunden >= 6) {
    pausen = [{ von:"12:00", bis:"12:30" }];
    pausenMinuten = 30;
  }
  const endeMin = START + gesamtStunden * 60 + pausenMinuten;
  const endeStr = `${String(Math.floor(endeMin/60)).padStart(2,"0")}:${String(Math.round(endeMin%60)).padStart(2,"0")}`;
  return { beginn:"07:00", ende:endeStr, pausen, pausenMinuten };
}

// Bestimmt Typ + Farbe eines Tages
function tagStatus(tag, eintraege, abwesenheiten) {
  const abw = abwesenheiten.find(a => {
    const v = new Date(a.von_datum), b = new Date(a.bis_datum);
    return tag >= v && tag <= b;
  });
  if (abw) {
    if (abw.typ === "krank") return "krank";
    if (abw.typ === "urlaub") return abw.status === "genehmigt" ? "urlaub_genehmigt" : "urlaub_ausstehend";
    if (abw.typ === "fortbildung") return abw.status === "genehmigt" ? "fortbildung_genehmigt" : "fortbildung_ausstehend";
  }
  const e = eintraege.find(e => {
    const d = new Date(e.datum); return d.getDate()===tag.getDate()&&d.getMonth()===tag.getMonth();
  });
  if (!e) return null;
  const gen = (e.materialien||{}).genehmigt;
  if (gen === true) return "arbeit_genehmigt";
  if (gen === false) return "arbeit_abgelehnt";
  return "arbeit_ausstehend";
}

export default function ZeiterfassungPage() {
  const { apiFetch, showToast, user } = useApp();
  const heute = new Date();
  const [monat, setMonat] = useState(heute.getMonth());
  const [jahr, setJahr] = useState(heute.getFullYear());
  const [gewTag, setGewTag] = useState(null);
  const [eintraege, setEintraege] = useState([]);
  const [abwesenheiten, setAbwesenheiten] = useState([]);
  const [baustellen, setBaustellen] = useState([]);
  const [ueberstunden, setUeberstunden] = useState(0);
  const [offeneGenehmigungen, setOffeneGenehmigungen] = useState([]);
  const [offeneAbwesenheiten, setOffeneAbwesenheiten] = useState([]);
  const [laden, setLaden] = useState(true);
  const [speichern, setSpeichern] = useState(false);
  const [ansicht, setAnsicht] = useState("kalender");
  const [tagModus, setTagModus] = useState("arbeit"); // "arbeit"|"abwesenheit"

  // Formular Arbeit
  const [positionen, setPositionen] = useState([{baustelle_id:"",stunden:"",taetigkeit:""}]);
  const [uebExtra, setUebExtra] = useState("");
  const [freizeit, setFreizeit] = useState("");

  // Formular Abwesenheit
  const [abwTyp, setAbwTyp] = useState("urlaub");
  const [abwVon, setAbwVon] = useState("");
  const [abwBis, setAbwBis] = useState("");
  const [abwNotiz, setAbwNotiz] = useState("");

  const istVerwaltung = ["admin","verwaltung"].includes(user.rolle);
  const istVorgesetzter = ["admin","verwaltung","vorgesetzter","bauleiter"].includes(user.rolle);

  const gesamtStunden = positionen.reduce((s,p) => s+(Number(p.stunden)||0), 0);
  const { beginn, ende, pausen } = berechneZeiten(gesamtStunden);

  useEffect(() => { ladeAlles(); }, [monat, jahr]);

  async function ladeAlles() {
    setLaden(true);
    const calls = [
      apiFetch(`/api/zeiterfassung/meine?monat=${monat+1}&jahr=${jahr}`),
      apiFetch("/api/baustellen/"),
      apiFetch("/api/zeiterfassung/ueberstunden"),
      apiFetch("/api/urlaub/meine"),
    ];
    if (istVorgesetzter) {
      calls.push(apiFetch("/api/zeiterfassung/genehmigung/offen"));
      calls.push(apiFetch("/api/urlaub/team?status=beantragt"));
    }
    const [eRes, bRes, uRes, aRes, gRes, gaRes] = await Promise.all(calls);
    if (eRes?.ok) setEintraege(await eRes.json());
    if (bRes?.ok) setBaustellen(await bRes.json());
    if (uRes?.ok) { const d=await uRes.json(); setUeberstunden(d.gesamt_ueberstunden); }
    if (aRes?.ok) setAbwesenheiten(await aRes.json());
    if (gRes?.ok) setOffeneGenehmigungen(await gRes.json());
    if (gaRes?.ok) setOffeneAbwesenheiten(await gaRes.json());
    setLaden(false);
  }

  function tagAnklicken(tag) {
    const d = new Date(jahr, monat, tag);
    // Vorhandene Einträge laden
    const eintrag = eintraege.find(e => new Date(e.datum).getDate()===tag);
    if (eintrag) {
      const mat = eintrag.materialien||{};
      setPositionen(mat.positionen?.length>0 ? mat.positionen.map(p=>({baustelle_id:String(p.baustelle_id||""),stunden:String(p.stunden||""),taetigkeit:p.taetigkeit||""})) : [{baustelle_id:"",stunden:"",taetigkeit:""}]);
      setUebExtra(String(mat.ueberstunden_extra||""));
      setFreizeit(String(mat.freizeit_genommen||""));
    } else {
      setPositionen([{baustelle_id:"",stunden:"",taetigkeit:""}]);
      setUebExtra(""); setFreizeit("");
    }
    // Abwesenheit vorausfüllen
    const datumStr = `${jahr}-${String(monat+1).padStart(2,"0")}-${String(tag).padStart(2,"0")}`;
    setAbwVon(datumStr); setAbwBis(datumStr);
    setTagModus("arbeit");
    setGewTag(tag);
    setAnsicht("tag");
  }

  async function arbeitSpeichern() {
    if (gesamtStunden <= 0) { showToast("Bitte Stunden eingeben","err"); return; }
    setSpeichern(true);
    const datum = `${jahr}-${String(monat+1).padStart(2,"0")}-${String(gewTag).padStart(2,"0")}`;
    const res = await apiFetch("/api/zeiterfassung/manuell", {
      method:"POST",
      body: JSON.stringify({
        datum, beginn_uhr:beginn, ende_uhr:ende, pausen,
        positionen: positionen.filter(p=>p.stunden).map(p=>({
          baustelle_id: p.baustelle_id?Number(p.baustelle_id):null,
          stunden:Number(p.stunden), taetigkeit:p.taetigkeit||null,
        })),
        ueberstunden_extra:Number(uebExtra)||0,
        freizeit_genommen:Number(freizeit)||0,
      }),
    });
    if (res?.ok) {
      const d=await res.json();
      showToast(d.wartet_auf_genehmigung?"✓ Gespeichert — wartet auf Genehmigung":`✓ ${d.netto_stunden}h gespeichert`);
      ladeAlles(); setAnsicht("kalender"); setGewTag(null);
    } else { const err=await res?.json().catch(()=>({}))); showToast(err?.detail||"Fehler","err"); }
    setSpeichern(false);
  }

  async function abwesenheitSpeichern() {
    if (!abwVon||!abwBis) { showToast("Bitte Zeitraum wählen","err"); return; }
    setSpeichern(true);
    const res = await apiFetch("/api/urlaub/antrag", {
      method:"POST",
      body: JSON.stringify({typ:abwTyp, von_datum:abwVon, bis_datum:abwBis, notiz:abwNotiz||null}),
    });
    if (res?.ok) {
      showToast("✓ Antrag gestellt — wartet auf Freischaltung durch Verwaltung");
      ladeAlles(); setAnsicht("kalender"); setGewTag(null);
    } else { const err=await res?.json().catch(()=>({}))); showToast(err?.detail||"Fehler","err"); }
    setSpeichern(false);
  }

  async function genehmigenFn(id) {
    const res = await apiFetch(`/api/zeiterfassung/${id}/genehmigen`,{method:"PUT"});
    if (res?.ok) { showToast("✓ Genehmigt"); ladeAlles(); } else showToast("Fehler","err");
  }
  async function ablehnenFn(id) {
    const grund = prompt("Ablehnungsgrund:");
    if (grund===null) return;
    const res = await apiFetch(`/api/zeiterfassung/${id}/ablehnen?grund=${encodeURIComponent(grund)}`,{method:"PUT"});
    if (res?.ok) { showToast("Abgelehnt"); ladeAlles(); }
  }
  async function abwGenehmigen(id) {
    const res = await apiFetch(`/api/urlaub/${id}/genehmigen`,{method:"PUT"});
    if (res?.ok) { showToast("✓ Genehmigt"); ladeAlles(); } else showToast("Fehler","err");
  }
  async function abwAblehnen(id) {
    const grund = prompt("Ablehnungsgrund:");
    if (grund===null) return;
    const res = await apiFetch(`/api/urlaub/${id}/ablehnen?grund=${encodeURIComponent(grund)}`,{method:"PUT"});
    if (res?.ok) { showToast("Abgelehnt"); ladeAlles(); }
  }

  // Kalender
  const erster = new Date(jahr,monat,1).getDay();
  const wt = erster===0?6:erster-1;
  const tage = new Date(jahr,monat+1,0).getDate();
  const stdProTag = {};
  eintraege.forEach(e=>{const t=new Date(e.datum).getDate();stdProTag[t]=(stdProTag[t]||0)+(e.arbeitsstunden||0);});
  const gesamtMonat = Object.values(stdProTag).reduce((s,h)=>s+h,0);
  const tagEintraege = gewTag?eintraege.filter(e=>new Date(e.datum).getDate()===gewTag):[];
  const kw = gewTag?Math.ceil((new Date(jahr,monat,gewTag).getTime()-new Date(jahr,0,1).getTime())/(7*24*3600000))+1:0;
  const tagName = gewTag?new Date(jahr,monat,gewTag).toLocaleDateString("de-DE",{weekday:"long"}):"";
  const offeneGesamt = offeneGenehmigungen.length + offeneAbwesenheiten.length;

  if (laden) return <Lader />;

  // ── GENEHMIGUNGEN (Verwaltung/Vorgesetzter) ────────────────────────────────
  if (ansicht==="genehmigungen") return (
    <div style={{maxWidth:520,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={()=>setAnsicht("kalender")} style={{width:40,height:40,border:"1.5px solid #e8edf2",borderRadius:10,background:"white",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"#94a3b8"}}>{istVerwaltung?"VERWALTUNG":"BAULEITER"}</div>
          <div style={{fontSize:20,fontWeight:800,color:"#0f1923"}}>Freigaben</div>
        </div>
      </div>

      {/* Stundenzettel */}
      {offeneGenehmigungen.length>0&&<>
        <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:8,letterSpacing:"0.06em"}}>STUNDENZETTEL ({offeneGenehmigungen.length})</div>
        {offeneGenehmigungen.map(e=>(
          <div key={e.id} style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:18,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div>
                <div style={{fontSize:15,fontWeight:800}}>{e.mitarbeiter}</div>
                <div style={{fontSize:13,color:"#64748b"}}>{new Date(e.datum).toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"short"})}</div>
              </div>
              <div style={{background:"#fef3c7",borderRadius:8,padding:"4px 14px",fontSize:15,fontWeight:800,color:"#92400e",alignSelf:"flex-start"}}>{e.arbeitsstunden?.toFixed(2)}h</div>
            </div>
            <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center",marginBottom:e.pausen?.length>0?10:0}}>
                <div><div style={{fontSize:10,fontWeight:700,color:"#94a3b8",marginBottom:2}}>VON</div><div style={{fontWeight:800}}>{new Date(e.beginn).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}</div></div>
                <div><div style={{fontSize:10,fontWeight:700,color:"#94a3b8",marginBottom:2}}>BIS</div><div style={{fontWeight:800}}>{e.ende?new Date(e.ende).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}):"—"}</div></div>
                <div><div style={{fontSize:10,fontWeight:700,color:"#94a3b8",marginBottom:2}}>PAUSE</div><div style={{fontWeight:800}}>{e.pause_minuten}min</div></div>
              </div>
              {e.pausen?.length>0&&<div style={{fontSize:12,color:"#64748b",borderTop:"1px solid #e8edf2",paddingTop:8}}>Pausen: {e.pausen.map(p=>`${p.von}–${p.bis}`).join(", ")} Uhr</div>}
              {e.positionen?.length>0&&<div style={{borderTop:"1px solid #e8edf2",paddingTop:8,marginTop:8}}>{e.positionen.map((p,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span>🏗 {baustellen.find(b=>b.id===p.baustelle_id)?.name||e.baustelle}</span><span style={{fontWeight:700}}>{p.stunden}h</span></div>)}</div>}
              {e.taetigkeit&&<div style={{fontSize:12,color:"#475569",marginTop:6}}>📝 {e.taetigkeit}</div>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button onClick={()=>genehmigenFn(e.id)} style={{padding:"12px",background:"#16a34a",border:"none",borderRadius:10,color:"white",fontSize:14,fontWeight:800,cursor:"pointer"}}>✓ Genehmigen</button>
              <button onClick={()=>ablehnenFn(e.id)} style={{padding:"12px",background:"white",border:"1.5px solid #dc2626",borderRadius:10,color:"#dc2626",fontSize:14,fontWeight:800,cursor:"pointer"}}>✕ Ablehnen</button>
            </div>
          </div>
        ))}
      </>}

      {/* Abwesenheiten */}
      {offeneAbwesenheiten.length>0&&<>
        <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",margin:"16px 0 8px",letterSpacing:"0.06em"}}>ABWESENHEITEN ({offeneAbwesenheiten.length})</div>
        {offeneAbwesenheiten.map(a=>{
          const typFarben={urlaub:{bg:"#bfdbfe",c:"#1e3a8a",icon:"🌴"},krank:{bg:"#fce7f3",c:"#9d174d",icon:"🤒"},fortbildung:{bg:"#ede9fe",c:"#4c1d95",icon:"📚"},sonderurlaub:{bg:"#fef9c3",c:"#92400e",icon:"📅"}};
          const f=typFarben[a.typ]||typFarben.urlaub;
          return (
            <div key={a.id} style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:18,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:15,fontWeight:800}}>{a.mitarbeiter_name}</div>
                  <div style={{display:"inline-flex",alignItems:"center",gap:6,background:f.bg,borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:700,color:f.c,marginTop:4}}>{f.icon} {a.typ.charAt(0).toUpperCase()+a.typ.slice(1)}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:13,fontWeight:700}}>{new Date(a.von_datum).toLocaleDateString("de-DE",{day:"numeric",month:"short"})}</div>
                  <div style={{fontSize:12,color:"#64748b"}}>bis {new Date(a.bis_datum).toLocaleDateString("de-DE",{day:"numeric",month:"short"})}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#0f1923"}}>{a.arbeitstage} Tage</div>
                </div>
              </div>
              {a.notiz&&<div style={{fontSize:13,color:"#475569",marginBottom:10,background:"#f8fafc",borderRadius:8,padding:"8px 12px"}}>💬 {a.notiz}</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <button onClick={()=>abwGenehmigen(a.id)} style={{padding:"12px",background:"#16a34a",border:"none",borderRadius:10,color:"white",fontSize:14,fontWeight:800,cursor:"pointer"}}>✓ Freigeben</button>
                <button onClick={()=>abwAblehnen(a.id)} style={{padding:"12px",background:"white",border:"1.5px solid #dc2626",borderRadius:10,color:"#dc2626",fontSize:14,fontWeight:800,cursor:"pointer"}}>✕ Ablehnen</button>
              </div>
            </div>
          );
        })}
      </>}

      {offeneGesamt===0&&(
        <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:40,textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:12}}>✅</div>
          <div style={{color:"#64748b",fontSize:15}}>Alles freigegeben</div>
        </div>
      )}
    </div>
  );

  // ── TAGESFORMULAR ──────────────────────────────────────────────────────────
  if (ansicht==="tag") {
    const datum = `${jahr}-${String(monat+1).padStart(2,"0")}-${String(gewTag).padStart(2,"0")}`;
    const tTyp = tagStatus(new Date(jahr,monat,gewTag), eintraege, abwesenheiten);
    const tFarbe = tTyp ? TAG_TYPEN[tTyp] : null;
    return (
      <div style={{maxWidth:520,margin:"0 auto"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <button onClick={()=>{setAnsicht("kalender");setGewTag(null);}} style={{width:40,height:40,border:"1.5px solid #e8edf2",borderRadius:10,background:"white",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>←</button>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8"}}>KW{kw}</div>
            <div style={{fontSize:18,fontWeight:800,color:"#0f1923"}}>{tagName}, {String(gewTag).padStart(2,"0")}. {MONATE[monat]}</div>
          </div>
          {tFarbe&&<div style={{background:tFarbe.bg,color:tFarbe.text,borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:700,flexShrink:0}}>{tFarbe.label}</div>}
        </div>

        {/* Modus Umschalter */}
        <div style={{display:"flex",background:"#f1f5f9",borderRadius:10,padding:4,marginBottom:16}}>
          {[["arbeit","⏱ Arbeitszeit"],["abwesenheit","📅 Abwesenheit"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTagModus(k)} style={{flex:1,padding:"10px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:tagModus===k?800:500,background:tagModus===k?"white":"transparent",color:tagModus===k?"#0f1923":"#64748b",boxShadow:tagModus===k?"0 1px 4px rgba(0,0,0,0.1)":"none"}}>{l}</button>
          ))}
        </div>

        {tagModus==="arbeit" ? (<>
          {/* Baustellen */}
          <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:20,marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:800,color:"#0f1923",marginBottom:16}}>🏗 Baustellen & Stunden</div>
            {positionen.map((pos,i)=>(
              <div key={i} style={{marginBottom:14,paddingBottom:14,borderBottom:i<positionen.length-1?"1px solid #f1f5f9":"none"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 90px",gap:10,marginBottom:8}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>BAUSTELLE</div>
                    <select value={pos.baustelle_id} onChange={e=>{const n=[...positionen];n[i]={...n[i],baustelle_id:e.target.value};setPositionen(n);}} style={{width:"100%",padding:"11px 12px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,background:"white",outline:"none"}}>
                      <option value="">— wählen —</option>
                      {baustellen.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>STD.</div>
                    <input type="number" step="0.25" min="0" max="12" value={pos.stunden} onChange={e=>{const n=[...positionen];n[i]={...n[i],stunden:e.target.value};setPositionen(n);}} placeholder="h"
                      style={{width:"100%",padding:"11px 8px",fontSize:16,fontWeight:700,border:"2px solid #f59e0b",borderRadius:8,boxSizing:"border-box",textAlign:"center",outline:"none"}}/>
                  </div>
                </div>
                <input value={pos.taetigkeit} onChange={e=>{const n=[...positionen];n[i]={...n[i],taetigkeit:e.target.value};setPositionen(n);}} placeholder="Was wurde gemacht?"
                  style={{width:"100%",padding:"10px 12px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,boxSizing:"border-box",outline:"none"}}/>
                {positionen.length>1&&<button onClick={()=>setPositionen(positionen.filter((_,j)=>j!==i))} style={{marginTop:8,background:"#fee2e2",border:"none",borderRadius:6,padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer",color:"#dc2626"}}>Entfernen</button>}
              </div>
            ))}
            <button onClick={()=>setPositionen([...positionen,{baustelle_id:"",stunden:"",taetigkeit:""}])} style={{width:"100%",padding:"10px",background:"#f8fafc",border:"1.5px dashed #e8edf2",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",color:"#64748b"}}>+ Weitere Baustelle</button>
          </div>

          {/* Auto-Zeiten */}
          {gesamtStunden>0&&(
            <div style={{background:"#0f1923",borderRadius:12,padding:18,marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.4)",marginBottom:12,letterSpacing:"0.08em"}}>AUTOMATISCH BERECHNET</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,textAlign:"center",marginBottom:pausen.length>0?14:0}}>
                <div><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:700,marginBottom:4}}>BEGINN</div><div style={{fontSize:20,fontWeight:800,color:"white"}}>{beginn}</div></div>
                <div><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:700,marginBottom:4}}>ENDE</div><div style={{fontSize:20,fontWeight:800,color:"#f59e0b"}}>{ende}</div></div>
                <div><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:700,marginBottom:4}}>STUNDEN</div><div style={{fontSize:20,fontWeight:800,color:"#f59e0b"}}>{gesamtStunden.toFixed(2)}h</div></div>
              </div>
              {pausen.length>0&&(
                <div style={{borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:12}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:700,marginBottom:8}}>PAUSEN (AUTOMATISCH)</div>
                  {pausen.map((p,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"rgba(255,255,255,0.7)",padding:"3px 0"}}><span>Pause {i+1}</span><span style={{fontWeight:600,color:"white"}}>{p.von} – {p.bis} Uhr</span></div>)}
                </div>
              )}
            </div>
          )}

          {/* Überstunden */}
          <details style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,marginBottom:14,overflow:"hidden"}}>
            <summary style={{padding:"14px 20px",fontSize:13,fontWeight:700,cursor:"pointer",color:"#475569",listStyle:"none",display:"flex",justifyContent:"space-between"}}>
              <span>⚡ Überstunden / Freizeit (optional)</span><span style={{fontSize:11,color:"#94a3b8"}}>▾</span>
            </summary>
            <div style={{padding:"0 20px 20px",borderTop:"1px solid #f1f5f9"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:14}}>
                <div><div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>+ ÜBERSTUNDEN</div><input type="number" step="0.25" value={uebExtra} onChange={e=>setUebExtra(e.target.value)} placeholder="0.0 h" style={{width:"100%",padding:"10px 12px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,boxSizing:"border-box",outline:"none"}}/><div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>Werden addiert</div></div>
                <div><div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>- FREIZEIT</div><input type="number" step="0.25" value={freizeit} onChange={e=>setFreizeit(e.target.value)} placeholder="0.0 h" style={{width:"100%",padding:"10px 12px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,boxSizing:"border-box",outline:"none"}}/><div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>Vom Konto</div></div>
              </div>
            </div>
          </details>

          <button onClick={arbeitSpeichern} disabled={speichern} style={{width:"100%",padding:"16px",background:speichern?"#94a3b8":"#f59e0b",border:"none",borderRadius:12,fontSize:16,fontWeight:800,cursor:speichern?"not-allowed":"pointer",marginBottom:12,color:"#0f1923"}}>
            {speichern?"⏳ Wird gespeichert...":"✓ Eintrag speichern"}
          </button>
        </>) : (<>
          {/* ABWESENHEIT FORMULAR */}
          <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:20,marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:800,color:"#0f1923",marginBottom:16}}>📅 Abwesenheit melden</div>

            {/* Typ Auswahl */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:10}}>ART</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[["urlaub","🌴","Urlaub","#bfdbfe","#1e3a8a"],["krank","🤒","Krankmeldung","#fce7f3","#9d174d"],["fortbildung","📚","Fortbildung","#ede9fe","#4c1d95"],["sonderurlaub","📅","Sonderurlaub","#fef9c3","#92400e"]].map(([k,icon,label,bg,c])=>(
                  <button key={k} onClick={()=>setAbwTyp(k)} style={{padding:"12px 8px",border:`2px solid ${abwTyp===k?c:"#e8edf2"}`,borderRadius:10,background:abwTyp===k?bg:"white",cursor:"pointer",textAlign:"center"}}>
                    <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
                    <div style={{fontSize:12,fontWeight:700,color:abwTyp===k?c:"#475569"}}>{label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div><div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>VON</div><input type="date" value={abwVon} onChange={e=>setAbwVon(e.target.value)} style={{width:"100%",padding:"10px 12px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,boxSizing:"border-box",outline:"none"}}/></div>
              <div><div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>BIS</div><input type="date" value={abwBis} onChange={e=>setAbwBis(e.target.value)} style={{width:"100%",padding:"10px 12px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,boxSizing:"border-box",outline:"none"}}/></div>
            </div>

            <div><div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>NOTIZ (OPTIONAL)</div>
            <textarea value={abwNotiz} onChange={e=>setAbwNotiz(e.target.value)} placeholder="z.B. Arzttermin, Weiterbildung..." rows={2} style={{width:"100%",padding:"10px 12px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,boxSizing:"border-box",resize:"none",outline:"none",fontFamily:"inherit"}}/></div>
          </div>

          <div style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#92400e",display:"flex",gap:8,alignItems:"center"}}>
            <span>ℹ️</span> Abwesenheiten müssen von der Verwaltung freigegeben werden bevor sie zählen.
          </div>

          <button onClick={abwesenheitSpeichern} disabled={speichern} style={{width:"100%",padding:"16px",background:speichern?"#94a3b8":"#0f1923",border:"none",borderRadius:12,fontSize:16,fontWeight:800,cursor:speichern?"not-allowed":"pointer",color:"white"}}>
            {speichern?"⏳ ...":"📅 Abwesenheit melden"}
          </button>
        </>)}

        {/* Gespeicherte Einträge */}
        {tagEintraege.length>0&&(
          <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:16,marginTop:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:10}}>GESPEICHERTE EINTRÄGE</div>
            {tagEintraege.map(e=>{const mat=e.materialien||{};const gen=mat.genehmigt;return(
              <div key={e.id} style={{paddingBottom:10,borderBottom:"1px solid #f1f5f9",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                  <div style={{fontSize:14,fontWeight:700}}>{new Date(e.beginn).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})} – {e.ende?new Date(e.ende).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}):"—"}</div>
                  <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:6,background:gen===true?"#dcfce7":gen===false?"#fee2e2":"#fef9c3",color:gen===true?"#15803d":gen===false?"#991b1b":"#92400e"}}>
                    {gen===true?"✓ Genehmigt":gen===false?"✕ Abgelehnt":"⏳ Ausstehend"}
                  </span>
                </div>
                <div style={{fontSize:12,color:"#64748b"}}>{e.pause_minuten}min Pause · {gen===true?(e.arbeitsstunden?.toFixed(2)+"h"):"—"}</div>
                {mat.positionen?.map((p,i)=><div key={i} style={{fontSize:12,color:"#475569"}}>🏗 {baustellen.find(b=>b.id===p.baustelle_id)?.name||"—"} — {p.stunden}h {p.taetigkeit?`· ${p.taetigkeit}`:""}</div>)}
                <button onClick={async()=>{if(confirm("Löschen?")){await apiFetch(`/api/zeiterfassung/${e.id}`,{method:"DELETE"});showToast("Gelöscht");ladeAlles();setAnsicht("kalender");setGewTag(null);}}} style={{marginTop:6,background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:12,fontWeight:600,padding:0}}>🗑 Löschen</button>
              </div>
            );})}
          </div>
        )}
        <div style={{height:24}}/>
      </div>
    );
  }

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
        <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:10,padding:"12px 16px",cursor:istVorgesetzter&&offeneGesamt>0?"pointer":"default"}} onClick={()=>istVorgesetzter&&offeneGesamt>0&&setAnsicht("genehmigungen")}>
          <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:4}}>{istVorgesetzter?"Offene Freigaben":"Überstundenkonto"}</div>
          <div style={{fontSize:22,fontWeight:800,color:istVorgesetzter?(offeneGesamt>0?"#dc2626":"#16a34a"):(ueberstunden>=0?"#16a34a":"#dc2626")}}>
            {istVorgesetzter?(offeneGesamt>0?`${offeneGesamt} offen`:"Alle OK"):`${ueberstunden>0?"+":""}${ueberstunden.toFixed(1)} h`}
          </div>
          {istVorgesetzter&&offeneGesamt>0&&<div style={{fontSize:11,color:"#64748b",marginTop:2}}>Tippen zum Freigeben →</div>}
        </div>
      </div>

      <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderBottom:"1px solid #f1f5f9"}}>
          <button onClick={()=>{if(monat===0){setMonat(11);setJahr(y=>y-1);}else setMonat(m=>m-1);}} style={{width:36,height:36,border:"1.5px solid #e8edf2",borderRadius:8,background:"white",cursor:"pointer",fontSize:18,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <span style={{fontSize:16,fontWeight:700}}>{MONATE[monat]} {jahr}</span>
          <button onClick={()=>{if(monat===11){setMonat(0);setJahr(y=>y+1);}else setMonat(m=>m+1);}} style={{width:36,height:36,border:"1.5px solid #e8edf2",borderRadius:8,background:"white",cursor:"pointer",fontSize:18,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:"#f8fafc"}}>
          {WOCHENTAGE.map(w=><div key={w} style={{textAlign:"center",padding:"8px 0",fontSize:11,fontWeight:700,color:w==="Sa"||w==="So"?"#94a3b8":"#475569"}}>{w}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
          {Array.from({length:wt}).map((_,i)=><div key={`l${i}`}/>)}
          {Array.from({length:tage}).map((_,i)=>{
            const tag=i+1;
            const d=new Date(jahr,monat,tag);
            const typ=tagStatus(d,eintraege,abwesenheiten);
            const farbe=typ?TAG_TYPEN[typ]:null;
            const istHeuteFlag=tag===heute.getDate()&&monat===heute.getMonth()&&jahr===heute.getFullYear();
            const wochentag=d.getDay();
            const istWE=wochentag===0||wochentag===6;
            const stdH=stdProTag[tag];
            return (
              <div key={tag} onClick={()=>tagAnklicken(tag)}
                style={{padding:"8px 4px 6px",textAlign:"center",cursor:"pointer",borderTop:"1px solid #f1f5f9",
                  background:farbe?farbe.bg:istHeuteFlag?"#0f1923":"white",
                  position:"relative",transition:"opacity 0.1s",minHeight:52}}
                onMouseEnter={e=>{if(!istHeuteFlag)e.currentTarget.style.opacity="0.8";}}
                onMouseLeave={e=>{e.currentTarget.style.opacity="1";}}>
                <div style={{fontSize:14,fontWeight:istHeuteFlag?800:500,color:farbe?farbe.text:istHeuteFlag?"white":istWE?"#94a3b8":"#0f1923",lineHeight:1.2}}>{tag}</div>
                {stdH>0&&!farbe&&<div style={{fontSize:9,fontWeight:700,color:"#f59e0b",marginTop:1}}>{stdH.toFixed(1)}h</div>}
                {farbe&&<div style={{fontSize:9,fontWeight:700,color:farbe.text,marginTop:1,lineHeight:1.1}}>{farbe.label.replace("⏳","").replace("✓","").trim()}</div>}
                {typ&&<div style={{width:5,height:5,borderRadius:"50%",margin:"2px auto 0",background:farbe?.punkt}}/>}
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
      <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:10,padding:"12px 16px",marginTop:12}}>
        <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:10}}>LEGENDE</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {[["#dcfce7","#15803d","✓ Genehmigt"],["#fef9c3","#92400e","⏳ Ausstehend"],["#fee2e2","#991b1b","✕ Abgelehnt"],["#bfdbfe","#1e3a8a","🌴 Urlaub"],["#fce7f3","#9d174d","🤒 Krank"],["#ddd6fe","#3b0764","📚 Fortbildung"]].map(([bg,c,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
              <div style={{width:14,height:14,borderRadius:3,background:bg,flexShrink:0}}/>
              <span style={{color:c,fontWeight:600}}>{l}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{height:16}}/>
    </div>
  );
}