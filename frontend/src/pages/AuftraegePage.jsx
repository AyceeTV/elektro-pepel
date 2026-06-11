// ── Regiezettel Karte (inline Vorschau) ──────────────────────────────────────
function RzKarte({ r, auftrag, pdfHerunterladen, pdfLaden }) {
  const [offen, setOffen] = useState(false);
  const mat = r.materialien || [];
  const gesamtPreis = mat.reduce((s,m) => s + (parseFloat(m.menge||0)*parseFloat(m.preis||0)), 0);

  return (
    <div style={{background:"white",border:"1.5px solid #e2e8f0",borderRadius:12,overflow:"hidden"}}>
      {/* Header — immer sichtbar */}
      <div style={{padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",cursor:"pointer",background:offen?"#f8fafc":"white"}}
        onClick={()=>setOffen(o=>!o)}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{fontSize:14,fontWeight:800,color:"#0f1923"}}>
              📋 {new Date(r.datum).toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"long",year:"numeric"})}
            </span>
            <span style={{fontSize:13,fontWeight:700,color:"#f59e0b"}}>{r.arbeitsstunden?.toFixed(2)} h</span>
            {r.unterschrift_mitarbeiter&&<span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:"#dcfce7",color:"#15803d"}}>✓ MA</span>}
            {r.unterschrift_kunde&&<span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:"#dcfce7",color:"#15803d"}}>✓ Kunde</span>}
            {r.pdf_erstellt_am&&<span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:"#dbeafe",color:"#1e40af"}}>📄 PDF</span>}
          </div>
          {r.taetigkeit&&<div style={{fontSize:12,color:"#64748b",marginTop:3}}>{r.taetigkeit.slice(0,80)}{r.taetigkeit.length>80?"...":""}</div>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <button onClick={e=>{e.stopPropagation();pdfHerunterladen(auftrag.id,r.id);}}
            style={{padding:"6px 12px",background:"#0f1923",color:"white",border:"none",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer"}}>
            {pdfLaden?"⏳":"📄 PDF"}
          </button>
          <span style={{fontSize:18,color:"#94a3b8",transition:"transform 0.2s",transform:offen?"rotate(180deg)":"rotate(0deg)"}}>⌄</span>
        </div>
      </div>

      {/* Ausgeklappter Inhalt */}
      {offen&&(
        <div style={{borderTop:"1px solid #e2e8f0"}}>

          {/* Arbeitszeit */}
          <div style={{padding:"14px 18px",borderBottom:"1px solid #f1f5f9"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:10,letterSpacing:"0.06em"}}>ARBEITSZEIT</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:10}}>
              {[
                ["Beginn",r.beginn_uhr||"—"],
                ["Ende",r.ende_uhr||"—"],
                ["Pause",r.pause_minuten?(r.pause_minuten+" min"):"—"],
                ["Netto",r.arbeitsstunden?.toFixed(2)+" h"],
              ].map(([label,wert])=>(
                <div key={label} style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",marginBottom:4}}>{label}</div>
                  <div style={{fontSize:16,fontWeight:800,color:"#0f1923"}}>{wert}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tätigkeit */}
          {r.taetigkeit&&(
            <div style={{padding:"14px 18px",borderBottom:"1px solid #f1f5f9"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:8,letterSpacing:"0.06em"}}>DURCHGEFÜHRTE ARBEITEN</div>
              <p style={{fontSize:14,color:"#334155",margin:0,lineHeight:1.7,background:"#f8fafc",borderRadius:8,padding:"10px 14px"}}>{r.taetigkeit}</p>
            </div>
          )}

          {/* Materialien */}
          {mat.length>0&&(
            <div style={{padding:"14px 18px",borderBottom:"1px solid #f1f5f9"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:10,letterSpacing:"0.06em"}}>MATERIALIEN</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{background:"#f8fafc"}}>
                    {["Bezeichnung","Menge","Einheit","Preis/Einh.","Gesamt"].map(h=>(
                      <th key={h} style={{padding:"7px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:"#64748b",borderBottom:"1px solid #e2e8f0"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mat.map((m,i)=>{
                    const g = parseFloat(m.menge||0)*parseFloat(m.preis||0);
                    return (
                      <tr key={i} style={{borderBottom:"1px solid #f1f5f9"}}>
                        <td style={{padding:"7px 10px",fontWeight:600}}>{m.bezeichnung}</td>
                        <td style={{padding:"7px 10px",color:"#475569"}}>{m.menge}</td>
                        <td style={{padding:"7px 10px",color:"#475569"}}>{m.einheit}</td>
                        <td style={{padding:"7px 10px",color:"#475569"}}>{m.preis?m.preis+" €":"—"}</td>
                        <td style={{padding:"7px 10px",fontWeight:600,color:"#15803d"}}>{g>0?g.toFixed(2)+" €":"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {gesamtPreis>0&&(
                  <tfoot>
                    <tr style={{background:"#fef9c3"}}>
                      <td colSpan={4} style={{padding:"8px 10px",fontWeight:700,fontSize:13}}>Materialgesamt</td>
                      <td style={{padding:"8px 10px",fontWeight:800,fontSize:14,color:"#0f1923"}}>{gesamtPreis.toFixed(2)} €</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Unterschriften */}
          <div style={{padding:"14px 18px",background:"#fafafa"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:10,letterSpacing:"0.06em"}}>UNTERSCHRIFTEN</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["👤 Mitarbeiter",r.unterschrift_mitarbeiter],["🏢 Kunde",r.unterschrift_kunde]].map(([label,sig])=>(
                <div key={label} style={{background:"white",border:"1.5px solid #e2e8f0",borderRadius:8,padding:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:8}}>{label}</div>
                  {sig ? (
                    <img src={sig} alt={label} style={{width:"100%",height:60,objectFit:"contain",border:"none"}}/>
                  ) : (
                    <div style={{height:60,display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",fontSize:12}}>Keine Unterschrift</div>
                  )}
                  <div style={{borderTop:"1px solid #e2e8f0",marginTop:8,paddingTop:4,fontSize:11,color:"#94a3b8",textAlign:"center"}}>
                    {sig?"✓ Unterschrieben":"Ausstehend"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notizen */}
          {r.notizen&&(
            <div style={{padding:"14px 18px",borderTop:"1px solid #f1f5f9"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6,letterSpacing:"0.06em"}}>NOTIZEN</div>
              <p style={{fontSize:13,color:"#64748b",margin:0,lineHeight:1.6}}>{r.notizen}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useApp } from "../App";
import { Btn, Input, Select, Textarea, Modal, Lader } from "../components/ui/UI";

const TYP = {
  wartung:      { bg:"#dbeafe", c:"#1e40af", icon:"🔧", label:"Wartung" },
  kundendienst: { bg:"#dcfce7", c:"#15803d", icon:"👤", label:"Kundendienst" },
  installation: { bg:"#fef9c3", c:"#92400e", icon:"⚡", label:"Installation" },
  reparatur:    { bg:"#fee2e2", c:"#991b1b", icon:"🛠", label:"Reparatur" },
  inspektion:   { bg:"#ede9fe", c:"#4c1d95", icon:"🔍", label:"Inspektion" },
  notfall:      { bg:"#fecaca", c:"#7f1d1d", icon:"🚨", label:"Notfall" },
  sonstiges:    { bg:"#f1f5f9", c:"#475569", icon:"📋", label:"Sonstiges" },
};
const STAT = {
  offen:          { bg:"#fef9c3", c:"#92400e", label:"Offen" },
  in_bearbeitung: { bg:"#dbeafe", c:"#1e40af", label:"In Bearbeitung" },
  abgeschlossen:  { bg:"#dcfce7", c:"#15803d", label:"Abgeschlossen" },
  storniert:      { bg:"#f1f5f9", c:"#475569", label:"Storniert" },
};
const TYP_OPTS = [
  {value:"kundendienst",label:"👤 Kundendienst"},
  {value:"wartung",label:"🔧 Wartung"},
  {value:"installation",label:"⚡ Installation"},
  {value:"reparatur",label:"🛠 Reparatur"},
  {value:"inspektion",label:"🔍 Inspektion"},
  {value:"notfall",label:"🚨 Notfall"},
  {value:"sonstiges",label:"📋 Sonstiges"},
];

// Adress-Autofill via OpenStreetMap
function AdressInput({ label, value, onChange }) {
  const [vorschlaege, setVorschlaege] = useState([]);
  const [offen, setOffen] = useState(false);
  const timer = useRef(null);
  async function suchen(v) {
    onChange(v);
    if (v.length < 3) { setVorschlaege([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v)}&format=json&limit=5&countrycodes=de,at,ch`, { headers:{"Accept-Language":"de"} });
        const d = await r.json();
        setVorschlaege(d.map(x => x.display_name));
        setOffen(true);
      } catch { setVorschlaege([]); }
    }, 400);
  }
  return (
    <div style={{position:"relative", marginBottom:14}}>
      {label && <div style={{fontSize:12,fontWeight:600,color:"#475569",marginBottom:5}}>{label}</div>}
      <input value={value} onChange={e=>suchen(e.target.value)}
        onBlur={()=>setTimeout(()=>setOffen(false),200)}
        placeholder="Adresse eingeben..."
        style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e2e8f0",borderRadius:8,boxSizing:"border-box",outline:"none"}}/>
      {offen && vorschlaege.length>0 && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:"white",border:"1.5px solid #e2e8f0",borderRadius:8,zIndex:999,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",maxHeight:200,overflowY:"auto"}}>
          {vorschlaege.map((v,i)=>(
            <div key={i} onClick={()=>{onChange(v);setOffen(false);}}
              style={{padding:"9px 14px",fontSize:13,cursor:"pointer",borderBottom:"1px solid #f1f5f9"}}
              onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
              onMouseLeave={e=>e.currentTarget.style.background="white"}>
              📍 {v}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function openMaps(adresse) {
  if (!adresse) return;
  const enc = encodeURIComponent(adresse);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  window.open(isIOS ? `maps://maps.apple.com/?q=${enc}` : `https://www.google.com/maps/search/?api=1&query=${enc}`, "_blank");
}

export default function AuftraegePage() {
  const { apiFetch, showToast, user } = useApp();
  const [auftraege, setAuftraege] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [laden, setLaden] = useState(true);
  const [ansicht, setAnsicht] = useState("liste");
  const [gewaehlter, setGewaehlter] = useState(null);
  const [suchbegriff, setSuchbegriff] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typFilter, setTypFilter] = useState("");
  const [neuerModal, setNeuerModal] = useState(false);
  const [rzModal, setRzModal] = useState(false);
  const [pdfLaden, setPdfLaden] = useState(false);
  const [zeichneAktiv, setZeichneAktiv] = useState(false);
  const canvasMA = useRef(null);
  const canvasKU = useRef(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const kannErstellen = ["admin","verwaltung","vorgesetzter"].includes(user.rolle);

  const leerForm = {titel:"",typ:"kundendienst",beschreibung:"",kunde_name:"",kunde_adresse:"",kunde_telefon:"",kunde_email:"",kunde_notiz:"",termin_datum:"",termin_von:"",termin_bis:"",mitarbeiter_ids:[]};
  const [form, setForm] = useState(leerForm);
  const [rz, setRz] = useState({datum:new Date().toISOString().slice(0,10),beginn_uhr:"07:00",ende_uhr:"16:00",pause_minuten:0,taetigkeit:"",notizen:"",materialien:[]});
  const [matZ, setMatZ] = useState({bezeichnung:"",menge:"",einheit:"Stk",preis:""});

  useEffect(() => { ladeAlles(); }, []);

  async function ladeAlles() {
    setLaden(true);
    const [aRes, mRes] = await Promise.all([
      apiFetch("/api/auftraege/"),
      kannErstellen ? apiFetch("/api/users/") : Promise.resolve(null),
    ]);
    if (aRes?.ok) setAuftraege(await aRes.json());
    if (mRes?.ok) setMitarbeiter(await mRes.json());
    setLaden(false);
  }

  async function ladeDetail(id) {
    const res = await apiFetch(`/api/auftraege/${id}`);
    if (res?.ok) { setGewaehlter(await res.json()); setAnsicht("detail"); }
  }

  async function erstellen() {
    if (!form.titel||!form.kunde_name) { showToast("Titel und Kundenname sind Pflicht","err"); return; }
    const res = await apiFetch("/api/auftraege/", {method:"POST",body:JSON.stringify(form)});
    if (res?.ok) {
      const d = await res.json();
      showToast(`✓ Auftrag ${d.auftragsnummer} erstellt`);
      setNeuerModal(false); setForm(leerForm); ladeAlles();
    } else { const e=await res?.json().catch(()=>({})); showToast(e?.detail||"Fehler","err"); }
  }

  async function statusAendern(id, s) {
    await apiFetch(`/api/auftraege/${id}/status?neuer_status=${s}`,{method:"PUT"});
    ladeDetail(id); ladeAlles();
  }

  async function rzSpeichern() {
    const maD = canvasMA.current?.toDataURL("image/png")||"";
    const kuD = canvasKU.current?.toDataURL("image/png")||"";
    const res = await apiFetch(`/api/auftraege/${gewaehlter.id}/regiezettel`, {
      method:"POST",
      body:JSON.stringify({...rz,pause_minuten:Number(rz.pause_minuten)||0,
        unterschrift_mitarbeiter:maD||null,unterschrift_kunde:kuD||null,
        mitarbeiter_namen:gewaehlter.mitarbeiter?.map(m=>m.name)||[]}),
    });
    if (res?.ok) {
      const d = await res.json();
      showToast("✓ Regiezettel gespeichert");
      setRzModal(false); ladeDetail(gewaehlter.id);
      setTimeout(()=>pdfHerunterladen(gewaehlter.id,d.id),600);
    } else { const e=await res?.json().catch(()=>({})); showToast(e?.detail||"Fehler","err"); }
  }

  async function pdfHerunterladen(aId, rId) {
    setPdfLaden(true);
    const res = await apiFetch(`/api/auftraege/${aId}/regiezettel/${rId}/pdf`);
    if (res?.ok) {
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Regiezettel_${gewaehlter?.auftragsnummer||aId}.pdf`;
      link.click();
      showToast("📄 PDF erstellt");
    } else showToast("Fehler beim PDF","err");
    setPdfLaden(false);
  }

  function canvasStart(e, ref, touch=false) {
    setZeichneAktiv(true);
    const rect = ref.current.getBoundingClientRect();
    const sx = ref.current.width/rect.width, sy = ref.current.height/rect.height;
    const cx = touch?e.touches[0].clientX:e.clientX;
    const cy = touch?e.touches[0].clientY:e.clientY;
    const ctx = ref.current.getContext("2d");
    ctx.beginPath(); ctx.moveTo((cx-rect.left)*sx,(cy-rect.top)*sy);
  }
  function canvasDraw(e, ref, touch=false) {
    if (!zeichneAktiv) return;
    const rect = ref.current.getBoundingClientRect();
    const sx = ref.current.width/rect.width, sy = ref.current.height/rect.height;
    const cx = touch?e.touches[0].clientX:e.clientX;
    const cy = touch?e.touches[0].clientY:e.clientY;
    const ctx = ref.current.getContext("2d");
    ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.strokeStyle="#0f1923";
    ctx.lineTo((cx-rect.left)*sx,(cy-rect.top)*sy); ctx.stroke();
  }

  const rzStd = (() => {
    try { const[bh,bm]=rz.beginn_uhr.split(":").map(Number),[eh,em]=rz.ende_uhr.split(":").map(Number);
      return Math.max(0,((eh*60+em)-(bh*60+bm)-(Number(rz.pause_minuten)||0))/60); } catch{return 0;}
  })();

  // Suchfilter
  const gefiltertAuftraege = auftraege.filter(a => {
    const q = suchbegriff.toLowerCase();
    const matchSuche = !q || a.titel?.toLowerCase().includes(q) ||
      a.kunde_name?.toLowerCase().includes(q) ||
      a.auftragsnummer?.toLowerCase().includes(q) ||
      a.kunde_adresse?.toLowerCase().includes(q);
    const matchStatus = !statusFilter || a.status === statusFilter;
    const matchTyp = !typFilter || a.typ === typFilter;
    return matchSuche && matchStatus && matchTyp;
  });

  if (laden) return <Lader />;

  // ── DETAIL ────────────────────────────────────────────────────────────────
  if (ansicht==="detail" && gewaehlter) {
    const typ = TYP[gewaehlter.typ]||TYP.sonstiges;
    const stat = STAT[gewaehlter.status]||STAT.offen;
    return (
      <div style={{maxWidth:800,margin:"0 auto",padding:isMobile?"0":"0"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
          <button onClick={()=>setAnsicht("liste")} style={{width:40,height:40,border:"1.5px solid #e2e8f0",borderRadius:10,background:"white",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>←</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",letterSpacing:"0.06em"}}>{gewaehlter.auftragsnummer}</div>
            <div style={{fontSize:isMobile?17:20,fontWeight:800,color:"#0f1923",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{gewaehlter.titel}</div>
          </div>
          <span style={{background:typ.bg,color:typ.c,borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:700,flexShrink:0}}>{typ.icon} {typ.label}</span>
          <span style={{background:stat.bg,color:stat.c,borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:700,flexShrink:0}}>{stat.label}</span>
        </div>

        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
          {/* Kundenkarte */}
          <div style={{background:"white",border:"1.5px solid #e2e8f0",borderRadius:12,padding:18}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:12,letterSpacing:"0.06em"}}>KUNDENDATEN</div>
            <div style={{fontSize:16,fontWeight:800,marginBottom:10}}>{gewaehlter.kunde_name}</div>
            {gewaehlter.kunde_adresse&&(
              <div style={{marginBottom:10}}>
                <div style={{fontSize:13,color:"#475569",marginBottom:6}}>📍 {gewaehlter.kunde_adresse}</div>
                <button onClick={()=>openMaps(gewaehlter.kunde_adresse)} style={{width:"100%",padding:"9px",background:"#0f1923",color:"white",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  🗺 In Maps öffnen
                </button>
              </div>
            )}
            {gewaehlter.kunde_telefon&&(
              <a href={`tel:${gewaehlter.kunde_telefon}`} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:"#dcfce7",borderRadius:8,textDecoration:"none",marginBottom:6}}>
                <span>📞</span><span style={{fontSize:14,fontWeight:700,color:"#15803d"}}>{gewaehlter.kunde_telefon}</span>
              </a>
            )}
            {gewaehlter.kunde_email&&(
              <a href={`mailto:${gewaehlter.kunde_email}`} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:"#dbeafe",borderRadius:8,textDecoration:"none"}}>
                <span>✉️</span><span style={{fontSize:13,fontWeight:600,color:"#1e40af"}}>{gewaehlter.kunde_email}</span>
              </a>
            )}
            {gewaehlter.kunde_notiz&&<div style={{fontSize:13,color:"#64748b",background:"#f8fafc",borderRadius:8,padding:"8px 10px",marginTop:8}}>💬 {gewaehlter.kunde_notiz}</div>}
          </div>

          {/* Termin & Team */}
          <div style={{background:"white",border:"1.5px solid #e2e8f0",borderRadius:12,padding:18}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:12,letterSpacing:"0.06em"}}>TERMIN & TEAM</div>
            {gewaehlter.termin_datum&&(
              <div style={{background:"#fef9c3",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
                <div style={{fontSize:14,fontWeight:800}}>📅 {new Date(gewaehlter.termin_datum).toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"})}</div>
                {gewaehlter.termin_von&&<div style={{fontSize:13,color:"#475569",marginTop:2}}>⏰ {gewaehlter.termin_von}{gewaehlter.termin_bis?` – ${gewaehlter.termin_bis} Uhr`:" Uhr"}</div>}
              </div>
            )}
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:8}}>ZUGEWIESENE MITARBEITER</div>
            {gewaehlter.mitarbeiter?.length===0?<div style={{fontSize:13,color:"#94a3b8"}}>Niemand zugewiesen</div>:
              gewaehlter.mitarbeiter?.map(m=>(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #f1f5f9",fontSize:14}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:"#dbeafe",color:"#1e40af",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0}}>{m.name.charAt(0)}</div>
                  {m.name}
                </div>
              ))
            }
          </div>
        </div>

        {gewaehlter.beschreibung&&(
          <div style={{background:"white",border:"1.5px solid #e2e8f0",borderRadius:12,padding:18,marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:8}}>AUFTRAGSBESCHREIBUNG</div>
            <p style={{fontSize:14,color:"#334155",margin:0,lineHeight:1.7}}>{gewaehlter.beschreibung}</p>
          </div>
        )}

        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
          {gewaehlter.status==="offen"&&<Btn onClick={()=>statusAendern(gewaehlter.id,"in_bearbeitung")} variant="primary">▶ In Bearbeitung</Btn>}
          {gewaehlter.status==="in_bearbeitung"&&<Btn onClick={()=>statusAendern(gewaehlter.id,"abgeschlossen")} variant="primary">✓ Abschließen</Btn>}
          <Btn onClick={()=>{setRz({datum:new Date().toISOString().slice(0,10),beginn_uhr:"07:00",ende_uhr:"16:00",pause_minuten:0,taetigkeit:"",notizen:"",materialien:[]});setRzModal(true);}} variant="amber">📋 Regiezettel erfassen</Btn>
        </div>

        {gewaehlter.regiezettel?.length>0&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",letterSpacing:"0.06em"}}>REGIEZETTEL ({gewaehlter.regiezettel.length})</div>
            {gewaehlter.regiezettel.map(r=>(
              <RzKarte key={r.id} r={r} auftrag={gewaehlter} pdfHerunterladen={pdfHerunterladen} pdfLaden={pdfLaden} />
            ))}
          </div>
        )}

        {/* RZ Modal */}
        <Modal offen={rzModal} onClose={()=>setRzModal(false)} titel="Regiezettel erfassen" breite={560}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
            <div><div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:5}}>DATUM</div>
              <input type="date" value={rz.datum} onChange={e=>setRz({...rz,datum:e.target.value})} style={{width:"100%",padding:"9px",fontSize:14,border:"1.5px solid #e2e8f0",borderRadius:8,boxSizing:"border-box",outline:"none"}}/></div>
            <div><div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:5}}>VON</div>
              <input type="time" value={rz.beginn_uhr} onChange={e=>setRz({...rz,beginn_uhr:e.target.value})} style={{width:"100%",padding:"9px",fontSize:14,border:"2px solid #f59e0b",borderRadius:8,boxSizing:"border-box",outline:"none"}}/></div>
            <div><div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:5}}>BIS</div>
              <input type="time" value={rz.ende_uhr} onChange={e=>setRz({...rz,ende_uhr:e.target.value})} style={{width:"100%",padding:"9px",fontSize:14,border:"2px solid #f59e0b",borderRadius:8,boxSizing:"border-box",outline:"none"}}/></div>
          </div>
          <div style={{background:"#0f1923",borderRadius:8,padding:"10px 16px",marginBottom:14,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:13,color:"rgba(255,255,255,0.5)"}}>Nettostunden</span>
            <span style={{fontSize:16,fontWeight:800,color:"#f59e0b"}}>{rzStd.toFixed(2)} h</span>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>DURCHGEFÜHRTE ARBEITEN</div>
            <textarea value={rz.taetigkeit} onChange={e=>setRz({...rz,taetigkeit:e.target.value})} rows={3} placeholder="Was wurde gemacht?" style={{width:"100%",padding:"10px 12px",fontSize:14,border:"1.5px solid #e2e8f0",borderRadius:8,boxSizing:"border-box",resize:"none",outline:"none",fontFamily:"inherit"}}/>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:8}}>MATERIALIEN</div>
            {rz.materialien.map((m,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,background:"#f8fafc",borderRadius:6,padding:"6px 10px",fontSize:13}}>
                <span style={{flex:1,fontWeight:600}}>{m.bezeichnung}</span>
                <span style={{color:"#64748b"}}>{m.menge} {m.einheit}</span>
                {m.preis&&<span style={{color:"#15803d",fontWeight:600}}>{m.preis}€</span>}
                <button onClick={()=>setRz({...rz,materialien:rz.materialien.filter((_,j)=>j!==i)})} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:16,padding:"0 2px"}}>✕</button>
              </div>
            ))}
            <div style={{display:"grid",gridTemplateColumns:"2fr 50px 55px 60px 34px",gap:6,marginTop:6}}>
              <input value={matZ.bezeichnung} onChange={e=>setMatZ({...matZ,bezeichnung:e.target.value})} placeholder="Bezeichnung" style={{padding:"8px 10px",fontSize:13,border:"1.5px solid #e2e8f0",borderRadius:6,outline:"none"}}/>
              <input value={matZ.menge} onChange={e=>setMatZ({...matZ,menge:e.target.value})} placeholder="Menge" style={{padding:"8px 6px",fontSize:13,border:"1.5px solid #e2e8f0",borderRadius:6,outline:"none",textAlign:"center"}}/>
              <select value={matZ.einheit} onChange={e=>setMatZ({...matZ,einheit:e.target.value})} style={{padding:"8px 4px",fontSize:12,border:"1.5px solid #e2e8f0",borderRadius:6,outline:"none"}}>
                {["Stk","m","m²","kg","L","Pkg","Std"].map(e=><option key={e}>{e}</option>)}
              </select>
              <input value={matZ.preis} onChange={e=>setMatZ({...matZ,preis:e.target.value})} placeholder="€" style={{padding:"8px 6px",fontSize:13,border:"1.5px solid #e2e8f0",borderRadius:6,outline:"none",textAlign:"center"}}/>
              <button onClick={()=>{if(!matZ.bezeichnung)return;setRz({...rz,materialien:[...rz.materialien,{...matZ}]});setMatZ({bezeichnung:"",menge:"",einheit:"Stk",preis:""}); }}
                style={{width:34,height:34,background:"#0f1923",border:"none",borderRadius:6,color:"white",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>NOTIZEN</div>
            <textarea value={rz.notizen} onChange={e=>setRz({...rz,notizen:e.target.value})} rows={2} placeholder="Besonderheiten..." style={{width:"100%",padding:"10px 12px",fontSize:14,border:"1.5px solid #e2e8f0",borderRadius:8,boxSizing:"border-box",resize:"none",outline:"none",fontFamily:"inherit"}}/>
          </div>
          <div style={{borderTop:"1px solid #f1f5f9",paddingTop:14,marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:10}}>UNTERSCHRIFTEN</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["👤 Mitarbeiter",canvasMA],["🏢 Kunde",canvasKU]].map(([label,ref])=>(
                <div key={label}>
                  <div style={{fontSize:12,fontWeight:700,color:"#475569",marginBottom:6}}>{label}</div>
                  <canvas ref={ref} width={220} height={80}
                    style={{border:"1.5px solid #e2e8f0",borderRadius:8,width:"100%",height:70,cursor:"crosshair",touchAction:"none",background:"white"}}
                    onMouseDown={e=>canvasStart(e,ref)}
                    onMouseMove={e=>canvasDraw(e,ref)}
                    onMouseUp={()=>setZeichneAktiv(false)}
                    onMouseLeave={()=>setZeichneAktiv(false)}
                    onTouchStart={e=>{e.preventDefault();canvasStart(e,ref,true);}}
                    onTouchMove={e=>{e.preventDefault();canvasDraw(e,ref,true);}}
                    onTouchEnd={()=>setZeichneAktiv(false)}
                  />
                  <button onClick={()=>{const ctx=ref.current?.getContext("2d");ctx?.clearRect(0,0,ref.current.width,ref.current.height);}} style={{marginTop:4,background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:11,padding:0}}>✕ Löschen</button>
                </div>
              ))}
            </div>
          </div>
          <Btn onClick={rzSpeichern} variant="amber" size="lg" style={{width:"100%"}}>📋 Speichern & PDF erstellen</Btn>
        </Modal>
      </div>
    );
  }

  // ── LISTE ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page Header */}
      <div style={{display:"flex",alignItems:isMobile?"flex-start":"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12,flexDirection:isMobile?"column":"row"}}>
        <div>
          <h1 style={{fontSize:isMobile?22:26,fontWeight:800,color:"#0f1923",margin:0}}>Aufträge</h1>
          <p style={{fontSize:13,color:"#64748b",margin:"4px 0 0"}}>{gefiltertAuftraege.length} von {auftraege.length} Aufträgen</p>
        </div>
        {kannErstellen && <Btn onClick={()=>setNeuerModal(true)} variant="primary">+ Neuer Auftrag</Btn>}
      </div>

      {/* ── PC: Suchleiste + Filter in einer Zeile ── */}
      {!isMobile && (
        <div style={{display:"flex",gap:10,marginBottom:16,alignItems:"center"}}>
          <div style={{position:"relative",flex:1}}>
            <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:16,color:"#94a3b8"}}>🔍</span>
            <input
              value={suchbegriff} onChange={e=>setSuchbegriff(e.target.value)}
              placeholder="Suche nach Auftrag, Kundenname oder Auftragsnummer..."
              style={{width:"100%",padding:"10px 14px 10px 40px",fontSize:14,border:"1.5px solid #e2e8f0",borderRadius:10,boxSizing:"border-box",outline:"none",background:"white"}}
            />
          </div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{padding:"10px 14px",fontSize:13,border:"1.5px solid #e2e8f0",borderRadius:10,background:"white",outline:"none",cursor:"pointer",minWidth:160}}>
            <option value="">Alle Status</option>
            <option value="offen">Offen</option>
            <option value="in_bearbeitung">In Bearbeitung</option>
            <option value="abgeschlossen">Abgeschlossen</option>
            <option value="storniert">Storniert</option>
          </select>
          <select value={typFilter} onChange={e=>setTypFilter(e.target.value)} style={{padding:"10px 14px",fontSize:13,border:"1.5px solid #e2e8f0",borderRadius:10,background:"white",outline:"none",cursor:"pointer",minWidth:160}}>
            <option value="">Alle Typen</option>
            {TYP_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}

      {/* ── Handy: Suche + Filter ── */}
      {isMobile && (
        <div style={{marginBottom:14}}>
          <div style={{position:"relative",marginBottom:8}}>
            <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"#94a3b8"}}>🔍</span>
            <input value={suchbegriff} onChange={e=>setSuchbegriff(e.target.value)}
              placeholder="Suchen..."
              style={{width:"100%",padding:"11px 14px 11px 38px",fontSize:15,border:"1.5px solid #e2e8f0",borderRadius:10,boxSizing:"border-box",outline:"none",background:"white"}}/>
          </div>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
            {[["","Alle"],["offen","Offen"],["in_bearbeitung","In Bearb."],["abgeschlossen","Erledigt"]].map(([k,l])=>(
              <button key={k} onClick={()=>setStatusFilter(k)} style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid",fontSize:12,fontWeight:600,cursor:"pointer",flexShrink:0,
                background:statusFilter===k?"#0f1923":"white",color:statusFilter===k?"white":"#64748b",borderColor:statusFilter===k?"#0f1923":"#e2e8f0"}}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── PC: Tabellen-Ansicht ── */}
      {!isMobile && (
        <div style={{background:"white",border:"1.5px solid #e2e8f0",borderRadius:14,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
            <thead>
              <tr style={{background:"#f8fafc",borderBottom:"2px solid #e2e8f0"}}>
                {["Auftragsnummer","Bezeichnung","Kunde","Termin","Typ","Status","Mitarbeiter",""].map(h=>(
                  <th key={h} style={{padding:"11px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gefiltertAuftraege.length===0?(
                <tr><td colSpan={8} style={{textAlign:"center",padding:48,color:"#94a3b8",fontSize:14}}>
                  {suchbegriff?"Keine Aufträge gefunden für \""+suchbegriff+"\"":"Noch keine Aufträge"}
                </td></tr>
              ):gefiltertAuftraege.map((a,i)=>{
                const typ=TYP[a.typ]||TYP.sonstiges;
                const stat=STAT[a.status]||STAT.offen;
                return (
                  <tr key={a.id} onClick={()=>ladeDetail(a.id)}
                    style={{borderBottom:"1px solid #f1f5f9",cursor:"pointer",transition:"background 0.1s",background:i%2===0?"white":"#fafafa"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#f0f7ff"}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"white":"#fafafa"}>
                    <td style={{padding:"12px 14px",fontWeight:700,color:"#1a3d6e",whiteSpace:"nowrap"}}>{a.auftragsnummer}</td>
                    <td style={{padding:"12px 14px"}}>
                      <div style={{fontWeight:600,color:"#0f1923",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.titel}</div>
                    </td>
                    <td style={{padding:"12px 14px"}}>
                      <div style={{fontWeight:500,color:"#334155"}}>{a.kunde_name}</div>
                      {a.kunde_adresse&&<div style={{fontSize:11,color:"#94a3b8",marginTop:1,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📍 {a.kunde_adresse}</div>}
                    </td>
                    <td style={{padding:"12px 14px",whiteSpace:"nowrap"}}>
                      {a.termin_datum?<>
                        <div style={{fontSize:13,fontWeight:600}}>{new Date(a.termin_datum).toLocaleDateString("de-DE",{day:"numeric",month:"short",year:"2-digit"})}</div>
                        {a.termin_von&&<div style={{fontSize:11,color:"#64748b"}}>{a.termin_von}{a.termin_bis?`–${a.termin_bis}`:""}</div>}
                      </>:<span style={{color:"#94a3b8",fontSize:12}}>—</span>}
                    </td>
                    <td style={{padding:"12px 14px"}}>
                      <span style={{background:typ.bg,color:typ.c,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{typ.icon} {typ.label}</span>
                    </td>
                    <td style={{padding:"12px 14px"}}>
                      <span style={{background:stat.bg,color:stat.c,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{stat.label}</span>
                    </td>
                    <td style={{padding:"12px 14px"}}>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,maxWidth:140}}>
                        {a.mitarbeiter?.slice(0,2).map((m,i)=>(
                          <span key={i} style={{fontSize:11,background:"#f1f5f9",borderRadius:20,padding:"2px 8px",color:"#475569",whiteSpace:"nowrap"}}>👷 {m.split(" ")[0]}</span>
                        ))}
                        {(a.mitarbeiter?.length||0)>2&&<span style={{fontSize:11,color:"#94a3b8"}}>+{a.mitarbeiter.length-2}</span>}
                      </div>
                    </td>
                    <td style={{padding:"12px 14px"}}>
                      {a.regiezettel_count>0&&<span style={{fontSize:11,background:"#dbeafe",borderRadius:6,padding:"3px 10px",color:"#1e40af",fontWeight:600,whiteSpace:"nowrap"}}>📋 {a.regiezettel_count}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Handy: Karten-Ansicht ── */}
      {isMobile && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {gefiltertAuftraege.length===0?(
            <div style={{background:"white",border:"1.5px solid #e2e8f0",borderRadius:12,padding:50,textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:10}}>📋</div>
              <div style={{color:"#64748b",fontSize:14}}>{suchbegriff?"Nichts gefunden":"Noch keine Aufträge"}</div>
            </div>
          ):gefiltertAuftraege.map(a=>{
            const typ=TYP[a.typ]||TYP.sonstiges;
            const stat=STAT[a.status]||STAT.offen;
            return (
              <div key={a.id} onClick={()=>ladeDetail(a.id)} style={{background:"white",border:"1.5px solid #e2e8f0",borderRadius:12,padding:16,cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6,gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:3}}>{a.auftragsnummer}</div>
                    <div style={{fontSize:15,fontWeight:800,color:"#0f1923",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.titel}</div>
                    <div style={{fontSize:13,color:"#64748b",marginTop:2}}>👤 {a.kunde_name}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                    <span style={{background:stat.bg,color:stat.c,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700}}>{stat.label}</span>
                    {a.termin_datum&&<div style={{fontSize:11,fontWeight:700,color:"#0f1923"}}>📅 {new Date(a.termin_datum).toLocaleDateString("de-DE",{day:"numeric",month:"short"})}{a.termin_von?` · ${a.termin_von}`:""}</div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <span style={{background:typ.bg,color:typ.c,borderRadius:6,padding:"2px 10px",fontSize:11,fontWeight:700}}>{typ.icon} {typ.label}</span>
                  {a.mitarbeiter?.slice(0,2).map((m,i)=><span key={i} style={{fontSize:11,background:"#f1f5f9",borderRadius:20,padding:"2px 8px",color:"#475569"}}>👷 {m.split(" ")[0]}</span>)}
                  {a.regiezettel_count>0&&<span style={{fontSize:11,background:"#dbeafe",borderRadius:20,padding:"2px 8px",color:"#1e40af",fontWeight:600}}>📋 {a.regiezettel_count}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Neuer Auftrag Modal */}
      <Modal offen={neuerModal} onClose={()=>setNeuerModal(false)} titel="Neuer Auftrag" breite={620}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <div style={{gridColumn:"1/-1"}}>
            <Input label="Auftragsbezeichnung *" value={form.titel} onChange={v=>setForm({...form,titel:v})} required/>
          </div>
          <Select label="Auftragstyp" value={form.typ} onChange={v=>setForm({...form,typ:v})} optionen={TYP_OPTS}/>
          <Input label="Termin (Datum)" type="date" value={form.termin_datum} onChange={v=>setForm({...form,termin_datum:v})}/>
          <Input label="Von" type="time" value={form.termin_von} onChange={v=>setForm({...form,termin_von:v})}/>
          <Input label="Bis" type="time" value={form.termin_bis} onChange={v=>setForm({...form,termin_bis:v})}/>
          <div style={{gridColumn:"1/-1",borderTop:"1px solid #f1f5f9",paddingTop:12,marginBottom:4}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:8}}>KUNDENDATEN</div>
          </div>
          <Input label="Kundenname *" value={form.kunde_name} onChange={v=>setForm({...form,kunde_name:v})} required/>
          <Input label="Telefon" value={form.kunde_telefon} onChange={v=>setForm({...form,kunde_telefon:v})}/>
          <div style={{gridColumn:"1/-1"}}>
            <AdressInput label="Adresse" value={form.kunde_adresse} onChange={v=>setForm({...form,kunde_adresse:v})}/>
          </div>
          <Input label="E-Mail" type="email" value={form.kunde_email} onChange={v=>setForm({...form,kunde_email:v})}/>
          <div style={{gridColumn:"1/-1"}}>
            <Textarea label="Auftragsbeschreibung" value={form.beschreibung} onChange={v=>setForm({...form,beschreibung:v})} rows={3} placeholder="Was soll gemacht werden?"/>
          </div>
          {kannErstellen&&mitarbeiter.filter(m=>["mitarbeiter","bauleiter"].includes(m.rolle)).length>0&&(
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:8}}>MITARBEITER ZUWEISEN</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {mitarbeiter.filter(m=>["mitarbeiter","bauleiter"].includes(m.rolle)).map(m=>{
                  const sel=form.mitarbeiter_ids.includes(m.id);
                  return (
                    <button key={m.id} onClick={()=>setForm({...form,mitarbeiter_ids:sel?form.mitarbeiter_ids.filter(id=>id!==m.id):[...form.mitarbeiter_ids,m.id]})}
                      style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${sel?"#0f1923":"#e2e8f0"}`,background:sel?"#0f1923":"white",color:sel?"white":"#475569",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                      👷 {m.vorname} {m.nachname}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div style={{marginTop:16}}>
          <Btn onClick={erstellen} variant="primary" size="lg" style={{width:"100%"}}>✓ Auftrag erstellen</Btn>
        </div>
      </Modal>
    </div>
  );
}