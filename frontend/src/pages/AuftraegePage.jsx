import { useState, useEffect, useRef } from "react";
import { useApp } from "../App";
import { Seite, Karte, Btn, Input, Select, Textarea, Modal, Lader } from "../components/ui/UI";

const TYP_FARBEN = {
  wartung:      { bg:"#dbeafe", c:"#1e40af", icon:"🔧" },
  kundendienst: { bg:"#dcfce7", c:"#15803d", icon:"👤" },
  installation: { bg:"#fef9c3", c:"#92400e", icon:"⚡" },
  reparatur:    { bg:"#fee2e2", c:"#991b1b", icon:"🛠" },
  inspektion:   { bg:"#ede9fe", c:"#4c1d95", icon:"🔍" },
  notfall:      { bg:"#fecaca", c:"#7f1d1d", icon:"🚨" },
  sonstiges:    { bg:"#f1f5f9", c:"#475569", icon:"📋" },
};
const STATUS_FARBEN = {
  offen:          { bg:"#fef9c3", c:"#92400e",  label:"Offen" },
  in_bearbeitung: { bg:"#dbeafe", c:"#1e40af",  label:"In Bearbeitung" },
  abgeschlossen:  { bg:"#dcfce7", c:"#15803d",  label:"Abgeschlossen" },
  storniert:      { bg:"#f1f5f9", c:"#475569",  label:"Storniert" },
};
const TYP_OPTIONEN = [
  {value:"kundendienst",label:"👤 Kundendienst"},
  {value:"wartung",label:"🔧 Wartung"},
  {value:"installation",label:"⚡ Installation"},
  {value:"reparatur",label:"🛠 Reparatur"},
  {value:"inspektion",label:"🔍 Inspektion"},
  {value:"notfall",label:"🚨 Notfall"},
  {value:"sonstiges",label:"📋 Sonstiges"},
];

// ── Adress-Autofill mit OpenStreetMap (Nominatim) — kostenlos, kein API Key ──
function AdressInput({ label, value, onChange, required }) {
  const [vorschlaege, setVorschlaege] = useState([]);
  const [offen, setOffen] = useState(false);
  const timerRef = useRef(null);

  async function suchen(v) {
    onChange(v);
    if (v.length < 3) { setVorschlaege([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v)}&format=json&addressdetails=1&limit=5&countrycodes=de,at,ch`,
          { headers: { "Accept-Language": "de" } }
        );
        const data = await res.json();
        setVorschlaege(data.map(d => d.display_name));
        setOffen(true);
      } catch { setVorschlaege([]); }
    }, 400);
  }

  return (
    <div style={{ position:"relative", marginBottom:16 }}>
      {label && <span style={{ display:"block", fontSize:13, fontWeight:600, color:"#0f1923", marginBottom:6 }}>
        {label}{required && <span style={{ color:"#dc2626" }}> *</span>}
      </span>}
      <input
        type="text" value={value} onChange={e => suchen(e.target.value)}
        onBlur={() => setTimeout(() => setOffen(false), 200)}
        onFocus={() => vorschlaege.length > 0 && setOffen(true)}
        placeholder="Adresse eingeben..."
        style={{ width:"100%", padding:"9px 12px", fontSize:14, borderRadius:8, border:"1.5px solid #e8edf2", boxSizing:"border-box", outline:"none" }}
        onFocus_={e => e.target.style.border="1.5px solid #0f1923"}
      />
      {offen && vorschlaege.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"white", border:"1.5px solid #e8edf2", borderRadius:8, zIndex:999, boxShadow:"0 4px 16px rgba(0,0,0,0.12)", maxHeight:220, overflowY:"auto" }}>
          {vorschlaege.map((v,i) => (
            <div key={i} onClick={() => { onChange(v); setOffen(false); setVorschlaege([]); }}
              style={{ padding:"10px 14px", fontSize:13, cursor:"pointer", borderBottom:"1px solid #f1f5f9", color:"#0f1923" }}
              onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background="white"}>
              📍 {v}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Maps öffnen ───────────────────────────────────────────────────────────────
function openMaps(adresse) {
  if (!adresse) return;
  const encoded = encodeURIComponent(adresse);
  // Auf iOS Apple Maps, sonst Google Maps
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const url = isIOS
    ? `maps://maps.apple.com/?q=${encoded}`
    : `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  window.open(url, "_blank");
}

export default function AuftraegePage() {
  const { apiFetch, showToast, user } = useApp();
  const [auftraege, setAuftraege] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [laden, setLaden] = useState(true);
  const [ansicht, setAnsicht] = useState("liste");
  const [gewaehlter, setGewaehlter] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [neuerModal, setNeuerModal] = useState(false);
  const [rzModal, setRzModal] = useState(false);
  const [pdfLaden, setPdfLaden] = useState(false);
  const [zeichneAktiv, setZeichneAktiv] = useState(false);
  const canvasRefMA = useRef(null);
  const canvasRefKU = useRef(null);

  const kannErstellen = ["admin","verwaltung","vorgesetzter"].includes(user.rolle);

  const [form, setForm] = useState({
    titel:"", typ:"kundendienst", beschreibung:"",
    kunde_name:"", kunde_adresse:"", kunde_telefon:"", kunde_email:"", kunde_notiz:"",
    termin_datum:"", termin_von:"", termin_bis:"", mitarbeiter_ids:[],
  });

  const [rz, setRz] = useState({
    datum: new Date().toISOString().slice(0,10),
    beginn_uhr:"07:00", ende_uhr:"16:00", pause_minuten:0,
    taetigkeit:"", notizen:"", materialien:[],
  });
  const [matZeile, setMatZeile] = useState({bezeichnung:"",menge:"",einheit:"Stk",preis:""});

  useEffect(() => { ladeAlles(); }, [statusFilter]);

  async function ladeAlles() {
    setLaden(true);
    const [aRes, mRes] = await Promise.all([
      apiFetch(`/api/auftraege/${statusFilter?"?status="+statusFilter:""}`),
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

  async function auftragErstellen() {
    if (!form.titel||!form.kunde_name) { showToast("Titel und Kundenname sind Pflicht","err"); return; }
    const res = await apiFetch("/api/auftraege/", { method:"POST", body:JSON.stringify(form) });
    if (res?.ok) {
      const d = await res.json();
      showToast(`✓ Auftrag ${d.auftragsnummer} erstellt`);
      setNeuerModal(false);
      setForm({titel:"",typ:"kundendienst",beschreibung:"",kunde_name:"",kunde_adresse:"",kunde_telefon:"",kunde_email:"",kunde_notiz:"",termin_datum:"",termin_von:"",termin_bis:"",mitarbeiter_ids:[]});
      ladeAlles();
    } else { const e=await res?.json().catch(()=>({})); showToast(e?.detail||"Fehler","err"); }
  }

  async function statusAendern(id, status) {
    await apiFetch(`/api/auftraege/${id}/status?neuer_status=${status}`,{method:"PUT"});
    ladeDetail(id); ladeAlles();
  }

  async function rzSpeichern() {
    if (!gewaehlter) return;
    const maData = canvasRefMA.current?.toDataURL("image/png") || "";
    const kuData = canvasRefKU.current?.toDataURL("image/png") || "";
    const res = await apiFetch(`/api/auftraege/${gewaehlter.id}/regiezettel`, {
      method:"POST",
      body: JSON.stringify({
        ...rz,
        pause_minuten: Number(rz.pause_minuten)||0,
        unterschrift_mitarbeiter: maData || null,
        unterschrift_kunde: kuData || null,
        mitarbeiter_namen: gewaehlter.mitarbeiter?.map(m=>m.name)||[],
      }),
    });
    if (res?.ok) {
      const d = await res.json();
      showToast("✓ Regiezettel gespeichert");
      setRzModal(false);
      ladeDetail(gewaehlter.id);
      setTimeout(() => pdfHerunterladen(gewaehlter.id, d.id), 600);
    } else { const e=await res?.json().catch(()=>({})); showToast(e?.detail||"Fehler","err"); }
  }

  async function pdfHerunterladen(auftragId, rzId) {
    setPdfLaden(true);
    const res = await apiFetch(`/api/auftraege/${auftragId}/regiezettel/${rzId}/pdf`);
    if (res?.ok) {
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Regiezettel_${gewaehlter?.auftragsnummer||auftragId}.pdf`;
      link.click();
      showToast("📄 PDF erstellt");
    } else showToast("Fehler beim PDF","err");
    setPdfLaden(false);
  }

  function canvasZeichnen(e, ref, touch=false) {
    if (!zeichneAktiv) return;
    const rect = ref.current.getBoundingClientRect();
    const scaleX = ref.current.width / rect.width;
    const scaleY = ref.current.height / rect.height;
    const clientX = touch ? e.touches[0].clientX : e.clientX;
    const clientY = touch ? e.touches[0].clientY : e.clientY;
    const ctx = ref.current.getContext("2d");
    ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.strokeStyle="#0f1923";
    ctx.lineTo((clientX-rect.left)*scaleX, (clientY-rect.top)*scaleY);
    ctx.stroke();
  }

  function canvasStart(e, ref, touch=false) {
    setZeichneAktiv(true);
    const rect = ref.current.getBoundingClientRect();
    const scaleX = ref.current.width / rect.width;
    const scaleY = ref.current.height / rect.height;
    const clientX = touch ? e.touches[0].clientX : e.clientX;
    const clientY = touch ? e.touches[0].clientY : e.clientY;
    const ctx = ref.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo((clientX-rect.left)*scaleX, (clientY-rect.top)*scaleY);
  }

  const rzStunden = (() => {
    try {
      const [bh,bm]=rz.beginn_uhr.split(":").map(Number);
      const [eh,em]=rz.ende_uhr.split(":").map(Number);
      return Math.max(0,((eh*60+em)-(bh*60+bm)-(Number(rz.pause_minuten)||0))/60);
    } catch { return 0; }
  })();

  if (laden) return <Lader />;

  // ── DETAIL ────────────────────────────────────────────────────────────────
  if (ansicht==="detail" && gewaehlter) {
    const typ = TYP_FARBEN[gewaehlter.typ]||TYP_FARBEN.sonstiges;
    const stat = STATUS_FARBEN[gewaehlter.status]||STATUS_FARBEN.offen;
    return (
      <div style={{maxWidth:700,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
          <button onClick={()=>setAnsicht("liste")} style={{width:40,height:40,border:"1.5px solid #e8edf2",borderRadius:10,background:"white",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>←</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,color:"#94a3b8",fontWeight:700}}>{gewaehlter.auftragsnummer}</div>
            <div style={{fontSize:18,fontWeight:800,color:"#0f1923",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{gewaehlter.titel}</div>
          </div>
          <span style={{background:typ.bg,color:typ.c,borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:700,flexShrink:0}}>{typ.icon} {gewaehlter.typ}</span>
          <span style={{background:stat.bg,color:stat.c,borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:700,flexShrink:0}}>{stat.label}</span>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12,marginBottom:12}}>
          {/* Kundendaten */}
          <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:18}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:12,letterSpacing:"0.06em"}}>KUNDENDATEN</div>
            <div style={{fontSize:15,fontWeight:800,marginBottom:8}}>{gewaehlter.kunde_name}</div>
            {gewaehlter.kunde_adresse && (
              <div style={{marginBottom:8}}>
                <div style={{fontSize:13,color:"#475569",marginBottom:6}}>📍 {gewaehlter.kunde_adresse}</div>
                {/* Maps Button */}
                <button onClick={()=>openMaps(gewaehlter.kunde_adresse)} style={{
                  display:"flex",alignItems:"center",gap:6,background:"#0f1923",color:"white",
                  border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:700,
                  cursor:"pointer",width:"100%",justifyContent:"center"
                }}>
                  🗺 In Maps öffnen
                </button>
              </div>
            )}
            {gewaehlter.kunde_telefon&&(
              <a href={`tel:${gewaehlter.kunde_telefon}`} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#dcfce7",borderRadius:8,textDecoration:"none",marginBottom:6}}>
                <span style={{fontSize:16}}>📞</span>
                <span style={{fontSize:14,fontWeight:700,color:"#15803d"}}>{gewaehlter.kunde_telefon}</span>
              </a>
            )}
            {gewaehlter.kunde_email&&(
              <a href={`mailto:${gewaehlter.kunde_email}`} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#dbeafe",borderRadius:8,textDecoration:"none",marginBottom:6}}>
                <span style={{fontSize:16}}>✉️</span>
                <span style={{fontSize:13,fontWeight:600,color:"#1e40af"}}>{gewaehlter.kunde_email}</span>
              </a>
            )}
            {gewaehlter.kunde_notiz&&<div style={{fontSize:13,color:"#64748b",background:"#f8fafc",borderRadius:8,padding:"8px 10px",marginTop:4}}>💬 {gewaehlter.kunde_notiz}</div>}
          </div>

          {/* Termin & Team */}
          <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:18}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:12,letterSpacing:"0.06em"}}>TERMIN & TEAM</div>
            {gewaehlter.termin_datum&&(
              <div style={{background:"#fef9c3",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:800}}>
                  📅 {new Date(gewaehlter.termin_datum).toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"})}
                </div>
                {gewaehlter.termin_von&&<div style={{fontSize:13,color:"#475569",marginTop:2}}>
                  ⏰ {gewaehlter.termin_von}{gewaehlter.termin_bis?` – ${gewaehlter.termin_bis} Uhr`:" Uhr"}
                </div>}
              </div>
            )}
            {gewaehlter.mitarbeiter?.map(m=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #f1f5f9",fontSize:14}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:"#dbeafe",color:"#1e40af",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0}}>{m.name.charAt(0)}</div>
                {m.name}
              </div>
            ))}
          </div>
        </div>

        {gewaehlter.beschreibung&&(
          <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:18,marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:8}}>AUFTRAGSBESCHREIBUNG</div>
            <p style={{fontSize:14,color:"#334155",margin:0,lineHeight:1.6}}>{gewaehlter.beschreibung}</p>
          </div>
        )}

        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
          {gewaehlter.status==="offen"&&<Btn onClick={()=>statusAendern(gewaehlter.id,"in_bearbeitung")} variant="primary">▶ In Bearbeitung</Btn>}
          {gewaehlter.status==="in_bearbeitung"&&<Btn onClick={()=>statusAendern(gewaehlter.id,"abgeschlossen")} variant="primary">✓ Abschließen</Btn>}
          <Btn onClick={()=>{setRz({datum:new Date().toISOString().slice(0,10),beginn_uhr:"07:00",ende_uhr:"16:00",pause_minuten:0,taetigkeit:"",notizen:"",materialien:[]});setRzModal(true);}} variant="amber">📋 Regiezettel erfassen</Btn>
        </div>

        {gewaehlter.regiezettel?.length>0&&(
          <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:18}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:12}}>REGIEZETTEL ({gewaehlter.regiezettel.length})</div>
            {gewaehlter.regiezettel.map(r=>(
              <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700}}>{new Date(r.datum).toLocaleDateString("de-DE",{day:"numeric",month:"short",year:"numeric"})}</div>
                  <div style={{fontSize:12,color:"#64748b"}}>{r.arbeitsstunden?.toFixed(2)}h · {r.taetigkeit?.slice(0,40)||"—"}</div>
                  <div style={{display:"flex",gap:6,marginTop:4}}>
                    <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:r.unterschrift_mitarbeiter?"#dcfce7":"#f1f5f9",color:r.unterschrift_mitarbeiter?"#15803d":"#94a3b8"}}>👤 MA</span>
                    <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:r.unterschrift_kunde?"#dcfce7":"#f1f5f9",color:r.unterschrift_kunde?"#15803d":"#94a3b8"}}>🏢 Kunde</span>
                    {r.pdf_erstellt_am&&<span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:"#dbeafe",color:"#1e40af"}}>📄 PDF</span>}
                  </div>
                </div>
                <Btn onClick={()=>pdfHerunterladen(gewaehlter.id,r.id)} variant="ghost" size="sm">{pdfLaden?"⏳":"📄 PDF"}</Btn>
              </div>
            ))}
          </div>
        )}

        {/* Regiezettel Modal */}
        <Modal offen={rzModal} onClose={()=>setRzModal(false)} titel="Regiezettel erfassen" breite={560}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
            <div><div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>DATUM</div>
              <input type="date" value={rz.datum} onChange={e=>setRz({...rz,datum:e.target.value})} style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,boxSizing:"border-box",outline:"none"}}/></div>
            <div><div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>VON</div>
              <input type="time" value={rz.beginn_uhr} onChange={e=>setRz({...rz,beginn_uhr:e.target.value})} style={{width:"100%",padding:"9px 12px",fontSize:14,border:"2px solid #f59e0b",borderRadius:8,boxSizing:"border-box",outline:"none"}}/></div>
            <div><div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>BIS</div>
              <input type="time" value={rz.ende_uhr} onChange={e=>setRz({...rz,ende_uhr:e.target.value})} style={{width:"100%",padding:"9px 12px",fontSize:14,border:"2px solid #f59e0b",borderRadius:8,boxSizing:"border-box",outline:"none"}}/></div>
          </div>

          <div style={{background:"#0f1923",borderRadius:8,padding:"10px 16px",marginBottom:14,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:13,color:"rgba(255,255,255,0.5)"}}>Nettostunden</span>
            <span style={{fontSize:16,fontWeight:800,color:"#f59e0b"}}>{rzStunden.toFixed(2)} h</span>
          </div>

          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>DURCHGEFÜHRTE ARBEITEN *</div>
            <textarea value={rz.taetigkeit} onChange={e=>setRz({...rz,taetigkeit:e.target.value})} rows={3}
              placeholder="Was wurde gemacht?"
              style={{width:"100%",padding:"10px 12px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,boxSizing:"border-box",resize:"none",outline:"none",fontFamily:"inherit"}}/>
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
              <input value={matZeile.bezeichnung} onChange={e=>setMatZeile({...matZeile,bezeichnung:e.target.value})} placeholder="Bezeichnung" style={{padding:"8px 10px",fontSize:13,border:"1.5px solid #e8edf2",borderRadius:6,outline:"none"}}/>
              <input value={matZeile.menge} onChange={e=>setMatZeile({...matZeile,menge:e.target.value})} placeholder="Menge" style={{padding:"8px 6px",fontSize:13,border:"1.5px solid #e8edf2",borderRadius:6,outline:"none",textAlign:"center"}}/>
              <select value={matZeile.einheit} onChange={e=>setMatZeile({...matZeile,einheit:e.target.value})} style={{padding:"8px 4px",fontSize:12,border:"1.5px solid #e8edf2",borderRadius:6,outline:"none"}}>
                {["Stk","m","m²","kg","L","Pkg","Std"].map(e=><option key={e}>{e}</option>)}
              </select>
              <input value={matZeile.preis} onChange={e=>setMatZeile({...matZeile,preis:e.target.value})} placeholder="€" style={{padding:"8px 6px",fontSize:13,border:"1.5px solid #e8edf2",borderRadius:6,outline:"none",textAlign:"center"}}/>
              <button onClick={()=>{if(!matZeile.bezeichnung)return;setRz({...rz,materialien:[...rz.materialien,{...matZeile}]});setMatZeile({bezeichnung:"",menge:"",einheit:"Stk",preis:""}); }}
                style={{width:34,height:34,background:"#0f1923",border:"none",borderRadius:6,color:"white",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>
          </div>

          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>NOTIZEN</div>
            <textarea value={rz.notizen} onChange={e=>setRz({...rz,notizen:e.target.value})} rows={2}
              placeholder="Empfehlungen, Besonderheiten..."
              style={{width:"100%",padding:"10px 12px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,boxSizing:"border-box",resize:"none",outline:"none",fontFamily:"inherit"}}/>
          </div>

          <div style={{borderTop:"1px solid #f1f5f9",paddingTop:14,marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:12}}>UNTERSCHRIFTEN (mit Finger unterschreiben)</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["ma","👤 Mitarbeiter",canvasRefMA],["ku","🏢 Kunde",canvasRefKU]].map(([typ,label,ref])=>(
                <div key={typ}>
                  <div style={{fontSize:12,fontWeight:700,color:"#475569",marginBottom:6}}>{label}</div>
                  <canvas ref={ref} width={220} height={90}
                    style={{border:"1.5px solid #e8edf2",borderRadius:8,width:"100%",height:80,cursor:"crosshair",touchAction:"none",background:"white"}}
                    onMouseDown={e=>canvasStart(e,ref)}
                    onMouseMove={e=>canvasZeichnen(e,ref)}
                    onMouseUp={()=>setZeichneAktiv(false)}
                    onMouseLeave={()=>setZeichneAktiv(false)}
                    onTouchStart={e=>{e.preventDefault();canvasStart(e,ref,true);}}
                    onTouchMove={e=>{e.preventDefault();canvasZeichnen(e,ref,true);}}
                    onTouchEnd={()=>setZeichneAktiv(false)}
                  />
                  <button onClick={()=>{const ctx=ref.current?.getContext("2d");ctx?.clearRect(0,0,ref.current.width,ref.current.height);}}
                    style={{marginTop:4,background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:12,padding:0}}>✕ Löschen</button>
                </div>
              ))}
            </div>
          </div>

          <Btn onClick={rzSpeichern} variant="amber" size="lg" style={{width:"100%"}}>
            📋 Speichern & PDF erstellen
          </Btn>
        </Modal>
      </div>
    );
  }

  // ── LISTE ─────────────────────────────────────────────────────────────────
  return (
    <Seite titel="Aufträge" untertitel={`${auftraege.length} Aufträge`}
      aktion={kannErstellen&&<Btn onClick={()=>setNeuerModal(true)} variant="primary">+ Neuer Auftrag</Btn>}>

      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {[["","Alle"],["offen","Offen"],["in_bearbeitung","In Bearbeitung"],["abgeschlossen","Abgeschlossen"]].map(([k,l])=>(
          <button key={k} onClick={()=>setStatusFilter(k)} style={{
            padding:"7px 16px",borderRadius:20,border:"1.5px solid",fontSize:13,fontWeight:600,cursor:"pointer",
            background:statusFilter===k?"#0f1923":"white",
            color:statusFilter===k?"white":"#64748b",
            borderColor:statusFilter===k?"#0f1923":"#e8edf2",
          }}>{l}</button>
        ))}
      </div>

      {auftraege.length===0?(
        <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:60,textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:12}}>📋</div>
          <div style={{color:"#64748b",fontSize:15}}>Noch keine Aufträge{!kannErstellen?" — das Büro legt Aufträge für dich an":""}</div>
        </div>
      ):(
        <div style={{display:"grid",gap:10}}>
          {auftraege.map(a=>{
            const typ=TYP_FARBEN[a.typ]||TYP_FARBEN.sonstiges;
            const stat=STATUS_FARBEN[a.status]||STATUS_FARBEN.offen;
            return (
              <div key={a.id} onClick={()=>ladeDetail(a.id)} style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:16,cursor:"pointer"}}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.08)";e.currentTarget.style.borderColor="#c8d4e0";}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor="#e8edf2";}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                      <span style={{background:typ.bg,color:typ.c,borderRadius:6,padding:"2px 10px",fontSize:11,fontWeight:700,flexShrink:0}}>{typ.icon} {a.typ}</span>
                      <span style={{fontSize:11,color:"#94a3b8",fontWeight:600,flexShrink:0}}>{a.auftragsnummer}</span>
                    </div>
                    <div style={{fontSize:15,fontWeight:800,color:"#0f1923",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.titel}</div>
                    <div style={{fontSize:13,color:"#64748b",marginTop:2}}>👤 {a.kunde_name}</div>
                    {a.kunde_adresse&&(
                      <div style={{fontSize:12,color:"#94a3b8",display:"flex",alignItems:"center",gap:4}}>
                        📍 {a.kunde_adresse.slice(0,50)}{a.kunde_adresse.length>50?"...":""}
                      </div>
                    )}
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <span style={{background:stat.bg,color:stat.c,borderRadius:8,padding:"3px 10px",fontSize:11,fontWeight:700,display:"block",marginBottom:4}}>{stat.label}</span>
                    {a.termin_datum&&<div style={{fontSize:12,fontWeight:700,color:"#0f1923",whiteSpace:"nowrap"}}>
                      📅 {new Date(a.termin_datum).toLocaleDateString("de-DE",{day:"numeric",month:"short"})}
                      {a.termin_von&&` · ${a.termin_von}`}
                    </div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {a.mitarbeiter?.slice(0,3).map((m,i)=><span key={i} style={{fontSize:11,background:"#f1f5f9",borderRadius:20,padding:"2px 10px",color:"#475569"}}>👷 {m}</span>)}
                  {a.regiezettel_count>0&&<span style={{fontSize:11,background:"#dbeafe",borderRadius:20,padding:"2px 10px",color:"#1e40af",fontWeight:600}}>📋 {a.regiezettel_count} Regiezettel</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Neuer Auftrag Modal */}
      <Modal offen={neuerModal} onClose={()=>setNeuerModal(false)} titel="Neuer Auftrag" breite={580}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <div style={{gridColumn:"1/-1"}}>
            <Input label="Auftragsbezeichnung *" value={form.titel} onChange={v=>setForm({...form,titel:v})} required />
          </div>
          <Select label="Auftragstyp" value={form.typ} onChange={v=>setForm({...form,typ:v})} optionen={TYP_OPTIONEN} />
          <Input label="Termin (Datum)" type="date" value={form.termin_datum} onChange={v=>setForm({...form,termin_datum:v})} />
          <Input label="Von" type="time" value={form.termin_von} onChange={v=>setForm({...form,termin_von:v})} />
          <Input label="Bis" type="time" value={form.termin_bis} onChange={v=>setForm({...form,termin_bis:v})} />

          <div style={{gridColumn:"1/-1",borderTop:"1px solid #f1f5f9",paddingTop:12,marginTop:4,marginBottom:4}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:8}}>KUNDENDATEN</div>
          </div>
          <Input label="Kundenname *" value={form.kunde_name} onChange={v=>setForm({...form,kunde_name:v})} required />
          <Input label="Telefon" value={form.kunde_telefon} onChange={v=>setForm({...form,kunde_telefon:v})} />
          <div style={{gridColumn:"1/-1"}}>
            <AdressInput label="Adresse" value={form.kunde_adresse} onChange={v=>setForm({...form,kunde_adresse:v})} />
          </div>
          <Input label="E-Mail" type="email" value={form.kunde_email} onChange={v=>setForm({...form,kunde_email:v})} />
          <div style={{gridColumn:"1/-1"}}>
            <Textarea label="Auftragsbeschreibung" value={form.beschreibung} onChange={v=>setForm({...form,beschreibung:v})} rows={3} placeholder="Was soll gemacht werden?" />
          </div>

          {kannErstellen&&mitarbeiter.length>0&&(
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:8}}>MITARBEITER ZUWEISEN</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {mitarbeiter.filter(m=>["mitarbeiter","bauleiter"].includes(m.rolle)).map(m=>{
                  const sel=form.mitarbeiter_ids.includes(m.id);
                  return (
                    <button key={m.id} onClick={()=>setForm({...form,mitarbeiter_ids:sel?form.mitarbeiter_ids.filter(id=>id!==m.id):[...form.mitarbeiter_ids,m.id]})}
                      style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${sel?"#0f1923":"#e8edf2"}`,background:sel?"#0f1923":"white",color:sel?"white":"#475569",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                      👷 {m.vorname} {m.nachname}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div style={{marginTop:16}}>
          <Btn onClick={auftragErstellen} variant="primary" size="lg" style={{width:"100%"}}>✓ Auftrag erstellen</Btn>
        </div>
      </Modal>
    </Seite>
  );
}