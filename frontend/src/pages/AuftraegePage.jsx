import { useState, useEffect, useRef } from "react";
import { useApp } from "../App";
import { Seite, Karte, Btn, Input, Select, Textarea, Modal, Lader, Badge } from "../components/ui/UI";

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
  {value:"wartung",     label:"🔧 Wartung"},
  {value:"installation",label:"⚡ Installation"},
  {value:"reparatur",   label:"🛠 Reparatur"},
  {value:"inspektion",  label:"🔍 Inspektion"},
  {value:"notfall",     label:"🚨 Notfall"},
  {value:"sonstiges",   label:"📋 Sonstiges"},
];

export default function AuftraegePage() {
  const { apiFetch, showToast, user } = useApp();
  const [auftraege, setAuftraege] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [laden, setLaden] = useState(true);
  const [ansicht, setAnsicht] = useState("liste"); // "liste"|"detail"|"regiezettel"
  const [gewaehlter, setGewaehlter] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [neuerModal, setNeuerModal] = useState(false);
  const [rzModal, setRzModal] = useState(false);

  const kannErstellen = ["admin","verwaltung","vorgesetzter"].includes(user.rolle);

  // Formular neuer Auftrag
  const [form, setForm] = useState({
    titel:"", typ:"kundendienst", beschreibung:"",
    kunde_name:"", kunde_adresse:"", kunde_telefon:"", kunde_email:"", kunde_notiz:"",
    termin_datum:"", termin_von:"", termin_bis:"",
    mitarbeiter_ids:[],
  });

  // Regiezettel Formular
  const [rz, setRz] = useState({
    datum: new Date().toISOString().slice(0,10),
    beginn_uhr:"07:00", ende_uhr:"16:00", pause_minuten:0,
    mitarbeiter_namen:[], taetigkeit:"", notizen:"",
    materialien:[],
    unterschrift_mitarbeiter:"", unterschrift_kunde:"",
    kunde_anwesend: false,
  });
  const [matZeile, setMatZeile] = useState({bezeichnung:"",menge:"",einheit:"Stk",preis:""});
  const [pdfLaden, setPdfLaden] = useState(false);
  const canvasRefMA = useRef(null);
  const canvasRefKU = useRef(null);
  const [zeichneModus, setZeichneModus] = useState(null); // "ma"|"ku"
  const [zeichneAktiv, setZeichneAktiv] = useState(false);

  useEffect(() => { ladeAlles(); }, [statusFilter]);

  async function ladeAlles() {
    setLaden(true);
    const [aRes, mRes] = await Promise.all([
      apiFetch(`/api/auftraege/${statusFilter ? "?status="+statusFilter : ""}`),
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
    if (!form.titel||!form.kunde_name) { showToast("Pflichtfelder ausfüllen","err"); return; }
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
    await apiFetch(`/api/auftraege/${id}/status?neuer_status=${status}`, {method:"PUT"});
    ladeDetail(id); ladeAlles();
  }

  async function rzSpeichern() {
    if (!gewaehlter) return;
    const res = await apiFetch(`/api/auftraege/${gewaehlter.id}/regiezettel`, {
      method:"POST",
      body: JSON.stringify({
        ...rz,
        pause_minuten: Number(rz.pause_minuten)||0,
        unterschrift_mitarbeiter: unterschriftHolen("ma") || null,
        unterschrift_kunde: unterschriftHolen("ku") || null,
        mitarbeiter_namen: gewaehlter.mitarbeiter?.map(m=>m.name) || [],
      }),
    });
    if (res?.ok) {
      const d = await res.json();
      showToast("✓ Regiezettel gespeichert");
      setRzModal(false);
      ladeDetail(gewaehlter.id);
      // PDF automatisch erstellen
      setTimeout(() => pdfHerunterladen(gewaehlter.id, d.id), 500);
    } else { const e=await res?.json().catch(()=>({})); showToast(e?.detail||"Fehler","err"); }
  }

  async function pdfHerunterladen(auftragId, rzId) {
    setPdfLaden(true);
    const res = await apiFetch(`/api/auftraege/${auftragId}/regiezettel/${rzId}/pdf`);
    if (res?.ok) {
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Regiezettel_${gewaehlter?.auftragsnummer||auftragId}_${rzId}.pdf`;
      link.click();
      showToast("📄 PDF erstellt und heruntergeladen");
    } else showToast("Fehler beim PDF","err");
    setPdfLaden(false);
  }

  // ── Unterschriften-Canvas ────────────────────────────────────────────────
  function startZeichnen(typ) {
    setZeichneModus(typ);
  }
  function unterschriftHolen(typ) {
    const ref = typ==="ma" ? canvasRefMA : canvasRefKU;
    return ref.current?.toDataURL("image/png") || "";
  }
  function canvasLeer(typ) {
    const ref = typ==="ma" ? canvasRefMA : canvasRefKU;
    if (ref.current) { const ctx=ref.current.getContext("2d"); ctx.clearRect(0,0,ref.current.width,ref.current.height); }
  }

  function handleCanvasMouseDown(e, typ) {
    setZeichneAktiv(true);
    const ref = typ==="ma" ? canvasRefMA : canvasRefKU;
    const rect = ref.current.getBoundingClientRect();
    const ctx = ref.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(e.clientX-rect.left, e.clientY-rect.top);
  }
  function handleCanvasMouseMove(e, typ) {
    if (!zeichneAktiv) return;
    const ref = typ==="ma" ? canvasRefMA : canvasRefKU;
    const rect = ref.current.getBoundingClientRect();
    const ctx = ref.current.getContext("2d");
    ctx.lineWidth=2; ctx.lineCap="round"; ctx.strokeStyle="#0f1923";
    ctx.lineTo(e.clientX-rect.left, e.clientY-rect.top);
    ctx.stroke();
  }

  // Stunden berechnen
  const rzStunden = (() => {
    try {
      const [bh,bm]=rz.beginn_uhr.split(":").map(Number);
      const [eh,em]=rz.ende_uhr.split(":").map(Number);
      return Math.max(0,((eh*60+em)-(bh*60+bm)-(Number(rz.pause_minuten)||0))/60);
    } catch { return 0; }
  })();

  if (laden) return <Lader />;

  // ── DETAIL-ANSICHT ────────────────────────────────────────────────────────
  if (ansicht==="detail" && gewaehlter) {
    const typ = TYP_FARBEN[gewaehlter.typ] || TYP_FARBEN.sonstiges;
    const stat = STATUS_FARBEN[gewaehlter.status] || STATUS_FARBEN.offen;
    return (
      <div style={{maxWidth:700, margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
          <button onClick={()=>setAnsicht("liste")} style={{width:40,height:40,border:"1.5px solid #e8edf2",borderRadius:10,background:"white",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>←</button>
          <div style={{flex:1}}>
            <div style={{fontSize:12,color:"#94a3b8",fontWeight:700}}>{gewaehlter.auftragsnummer}</div>
            <div style={{fontSize:20,fontWeight:800,color:"#0f1923"}}>{gewaehlter.titel}</div>
          </div>
          <span style={{background:typ.bg,color:typ.c,borderRadius:8,padding:"5px 14px",fontSize:13,fontWeight:700}}>{typ.icon} {gewaehlter.typ}</span>
          <span style={{background:stat.bg,color:stat.c,borderRadius:8,padding:"5px 14px",fontSize:13,fontWeight:700}}>{stat.label}</span>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14,marginBottom:14}}>
          {/* Kundendaten */}
          <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:20}}>
            <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:12,letterSpacing:"0.06em"}}>KUNDENDATEN</div>
            {[
              ["👤", gewaehlter.kunde_name],
              ["📍", gewaehlter.kunde_adresse],
              ["📞", gewaehlter.kunde_telefon ? <a href={`tel:${gewaehlter.kunde_telefon}`} style={{color:"#2563eb",textDecoration:"none"}}>{gewaehlter.kunde_telefon}</a> : null],
              ["✉️", gewaehlter.kunde_email ? <a href={`mailto:${gewaehlter.kunde_email}`} style={{color:"#2563eb",textDecoration:"none"}}>{gewaehlter.kunde_email}</a> : null],
            ].filter(([,v])=>v).map(([icon,val],i)=>(
              <div key={i} style={{display:"flex",gap:8,padding:"5px 0",borderBottom:"1px solid #f1f5f9",fontSize:14}}>
                <span style={{flexShrink:0}}>{icon}</span><span>{val}</span>
              </div>
            ))}
            {gewaehlter.kunde_notiz&&<div style={{marginTop:8,fontSize:13,color:"#64748b",background:"#f8fafc",borderRadius:8,padding:"8px 10px"}}>💬 {gewaehlter.kunde_notiz}</div>}
          </div>

          {/* Termin & Team */}
          <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:20}}>
            <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:12,letterSpacing:"0.06em"}}>TERMIN & TEAM</div>
            {gewaehlter.termin_datum&&(
              <div style={{background:"#fef9c3",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:800,color:"#0f1923"}}>
                  📅 {new Date(gewaehlter.termin_datum).toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
                </div>
                {gewaehlter.termin_von&&<div style={{fontSize:13,color:"#475569",marginTop:2}}>
                  ⏰ {gewaehlter.termin_von}{gewaehlter.termin_bis?` – ${gewaehlter.termin_bis} Uhr`:" Uhr"}
                </div>}
              </div>
            )}
            <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:8}}>MITARBEITER</div>
            {gewaehlter.mitarbeiter?.length===0?<div style={{fontSize:13,color:"#94a3b8"}}>Noch nicht zugewiesen</div>:
              gewaehlter.mitarbeiter?.map(m=>(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",fontSize:14}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:"#dbeafe",color:"#1e40af",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{m.name.charAt(0)}</div>
                  {m.name}
                </div>
              ))
            }
          </div>
        </div>

        {/* Beschreibung */}
        {gewaehlter.beschreibung&&(
          <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:20,marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:8}}>AUFTRAGSBESCHREIBUNG</div>
            <p style={{fontSize:14,color:"#334155",margin:0,lineHeight:1.6}}>{gewaehlter.beschreibung}</p>
          </div>
        )}

        {/* Status-Buttons */}
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          {gewaehlter.status==="offen"&&<Btn onClick={()=>statusAendern(gewaehlter.id,"in_bearbeitung")} variant="primary">▶ In Bearbeitung</Btn>}
          {gewaehlter.status==="in_bearbeitung"&&<Btn onClick={()=>statusAendern(gewaehlter.id,"abgeschlossen")} variant="primary">✓ Abschließen</Btn>}
          <Btn onClick={()=>{setRz({datum:new Date().toISOString().slice(0,10),beginn_uhr:"07:00",ende_uhr:"16:00",pause_minuten:0,mitarbeiter_namen:[],taetigkeit:"",notizen:"",materialien:[],unterschrift_mitarbeiter:"",unterschrift_kunde:"",kunde_anwesend:false});setRzModal(true);}} variant="amber">📋 Regiezettel erfassen</Btn>
        </div>

        {/* Regiezettel Liste */}
        {gewaehlter.regiezettel?.length>0&&(
          <div style={{background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:20}}>
            <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:12}}>REGIEZETTEL ({gewaehlter.regiezettel.length})</div>
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
                <Btn onClick={()=>pdfHerunterladen(gewaehlter.id,r.id)} variant="ghost" size="sm">
                  {pdfLaden?"⏳":"📄 PDF"}
                </Btn>
              </div>
            ))}
          </div>
        )}

        {/* ── Regiezettel Modal ── */}
        <Modal offen={rzModal} onClose={()=>setRzModal(false)} titel="Regiezettel erfassen" breite={560}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
            <div><div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>DATUM</div>
              <input type="date" value={rz.datum} onChange={e=>setRz({...rz,datum:e.target.value})} style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,boxSizing:"border-box",outline:"none"}}/></div>
            <div><div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>VON</div>
              <input type="time" value={rz.beginn_uhr} onChange={e=>setRz({...rz,beginn_uhr:e.target.value})} style={{width:"100%",padding:"9px 12px",fontSize:14,border:"2px solid #f59e0b",borderRadius:8,boxSizing:"border-box",outline:"none"}}/></div>
            <div><div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>BIS</div>
              <input type="time" value={rz.ende_uhr} onChange={e=>setRz({...rz,ende_uhr:e.target.value})} style={{width:"100%",padding:"9px 12px",fontSize:14,border:"2px solid #f59e0b",borderRadius:8,boxSizing:"border-box",outline:"none"}}/></div>
          </div>

          {/* Nettostunden Anzeige */}
          <div style={{background:"#0f1923",borderRadius:8,padding:"10px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,color:"rgba(255,255,255,0.6)"}}>Nettostunden (berechnet)</span>
            <span style={{fontSize:18,fontWeight:800,color:"#f59e0b"}}>{rzStunden.toFixed(2)} h</span>
          </div>

          {/* Tätigkeit */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>DURCHGEFÜHRTE ARBEITEN *</div>
            <textarea value={rz.taetigkeit} onChange={e=>setRz({...rz,taetigkeit:e.target.value})} rows={3}
              placeholder="Was wurde gemacht? z.B. Heizungsanlage gewartet, Filter gewechselt..."
              style={{width:"100%",padding:"10px 12px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,boxSizing:"border-box",resize:"none",outline:"none",fontFamily:"inherit"}}/>
          </div>

          {/* Materialien */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:8}}>MATERIALIEN</div>
            {rz.materialien.map((m,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 60px 60px 70px 30px",gap:6,marginBottom:6,alignItems:"center"}}>
                <div style={{fontSize:13,fontWeight:600,background:"#f8fafc",padding:"6px 10px",borderRadius:6}}>{m.bezeichnung}</div>
                <div style={{fontSize:12,color:"#64748b",textAlign:"center"}}>{m.menge}</div>
                <div style={{fontSize:12,color:"#64748b",textAlign:"center"}}>{m.einheit}</div>
                <div style={{fontSize:12,color:"#64748b",textAlign:"center"}}>{m.preis?`${m.preis}€`:"-"}</div>
                <button onClick={()=>setRz({...rz,materialien:rz.materialien.filter((_,j)=>j!==i)})} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:16}}>✕</button>
              </div>
            ))}
            <div style={{display:"grid",gridTemplateColumns:"2fr 60px 60px 70px 36px",gap:6,marginTop:8,alignItems:"center"}}>
              <input value={matZeile.bezeichnung} onChange={e=>setMatZeile({...matZeile,bezeichnung:e.target.value})} placeholder="Bezeichnung" style={{padding:"8px 10px",fontSize:13,border:"1.5px solid #e8edf2",borderRadius:6,outline:"none"}}/>
              <input value={matZeile.menge} onChange={e=>setMatZeile({...matZeile,menge:e.target.value})} placeholder="Menge" style={{padding:"8px 6px",fontSize:13,border:"1.5px solid #e8edf2",borderRadius:6,outline:"none",textAlign:"center"}}/>
              <select value={matZeile.einheit} onChange={e=>setMatZeile({...matZeile,einheit:e.target.value})} style={{padding:"8px 4px",fontSize:12,border:"1.5px solid #e8edf2",borderRadius:6,outline:"none"}}>
                {["Stk","m","m²","kg","L","Pkg","Std"].map(e=><option key={e}>{e}</option>)}
              </select>
              <input value={matZeile.preis} onChange={e=>setMatZeile({...matZeile,preis:e.target.value})} placeholder="€/Einh." style={{padding:"8px 6px",fontSize:13,border:"1.5px solid #e8edf2",borderRadius:6,outline:"none",textAlign:"center"}}/>
              <button onClick={()=>{if(!matZeile.bezeichnung)return;setRz({...rz,materialien:[...rz.materialien,{...matZeile}]});setMatZeile({bezeichnung:"",menge:"",einheit:"Stk",preis:""}); }}
                style={{width:36,height:36,background:"#0f1923",border:"none",borderRadius:6,color:"white",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>
          </div>

          {/* Notizen */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>NOTIZEN</div>
            <textarea value={rz.notizen} onChange={e=>setRz({...rz,notizen:e.target.value})} rows={2}
              placeholder="Besonderheiten, Empfehlungen..."
              style={{width:"100%",padding:"10px 12px",fontSize:14,border:"1.5px solid #e8edf2",borderRadius:8,boxSizing:"border-box",resize:"none",outline:"none",fontFamily:"inherit"}}/>
          </div>

          {/* Unterschriften */}
          <div style={{borderTop:"1px solid #f1f5f9",paddingTop:14,marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:12}}>UNTERSCHRIFTEN</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["ma","Mitarbeiter",canvasRefMA],["ku","Kunde",canvasRefKU]].map(([typ,label,ref])=>(
                <div key={typ}>
                  <div style={{fontSize:12,fontWeight:600,color:"#475569",marginBottom:6}}>{label}</div>
                  <canvas ref={ref} width={180} height={80}
                    style={{border:"1.5px solid #e8edf2",borderRadius:8,width:"100%",cursor:"crosshair",touchAction:"none"}}
                    onMouseDown={e=>handleCanvasMouseDown(e,typ)}
                    onMouseMove={e=>handleCanvasMouseMove(e,typ)}
                    onMouseUp={()=>setZeichneAktiv(false)}
                    onMouseLeave={()=>setZeichneAktiv(false)}
                    onTouchStart={e=>{const t=e.touches[0];handleCanvasMouseDown({clientX:t.clientX,clientY:t.clientY},typ);}}
                    onTouchMove={e=>{e.preventDefault();const t=e.touches[0];handleCanvasMouseMove({clientX:t.clientX,clientY:t.clientY},typ);}}
                    onTouchEnd={()=>setZeichneAktiv(false)}
                  />
                  <button onClick={()=>canvasLeer(typ)} style={{marginTop:4,background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:12}}>✕ Löschen</button>
                </div>
              ))}
            </div>
            <label style={{display:"flex",alignItems:"center",gap:8,marginTop:10,fontSize:13,cursor:"pointer"}}>
              <input type="checkbox" checked={rz.kunde_anwesend} onChange={e=>setRz({...rz,kunde_anwesend:e.target.checked})} style={{width:16,height:16}}/>
              Kunde war anwesend
            </label>
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
      aktion={kannErstellen && <Btn onClick={()=>setNeuerModal(true)} variant="primary">+ Neuer Auftrag</Btn>}>

      {/* Filter */}
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
          <div style={{color:"#64748b",fontSize:15}}>Noch keine Aufträge</div>
        </div>
      ):(
        <div style={{display:"grid",gap:10}}>
          {auftraege.map(a=>{
            const typ=TYP_FARBEN[a.typ]||TYP_FARBEN.sonstiges;
            const stat=STATUS_FARBEN[a.status]||STATUS_FARBEN.offen;
            return (
              <div key={a.id} onClick={()=>ladeDetail(a.id)} style={{
                background:"white",border:"1.5px solid #e8edf2",borderRadius:12,padding:18,
                cursor:"pointer",transition:"box-shadow 0.15s, border-color 0.15s",
              }}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.1)";e.currentTarget.style.borderColor="#c8d4e0";}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor="#e8edf2";}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,gap:8,flexWrap:"wrap"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{background:typ.bg,color:typ.c,borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:700}}>{typ.icon} {a.typ}</span>
                      <span style={{fontSize:12,color:"#94a3b8",fontWeight:600}}>{a.auftragsnummer}</span>
                    </div>
                    <div style={{fontSize:16,fontWeight:800,color:"#0f1923"}}>{a.titel}</div>
                    <div style={{fontSize:13,color:"#64748b",marginTop:2}}>👤 {a.kunde_name}</div>
                    {a.kunde_adresse&&<div style={{fontSize:12,color:"#94a3b8"}}>📍 {a.kunde_adresse}</div>}
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <span style={{background:stat.bg,color:stat.c,borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:700,display:"block",marginBottom:4}}>{stat.label}</span>
                    {a.termin_datum&&<div style={{fontSize:12,fontWeight:700,color:"#0f1923"}}>📅 {new Date(a.termin_datum).toLocaleDateString("de-DE",{day:"numeric",month:"short"})}{a.termin_von?` · ${a.termin_von}`:""}  Uhr</div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  {a.mitarbeiter?.slice(0,3).map((m,i)=>(
                    <span key={i} style={{fontSize:12,background:"#f1f5f9",borderRadius:20,padding:"3px 10px",color:"#475569",fontWeight:500}}>👷 {m}</span>
                  ))}
                  {a.regiezettel_count>0&&<span style={{fontSize:12,background:"#dbeafe",borderRadius:20,padding:"3px 10px",color:"#1e40af",fontWeight:600}}>📋 {a.regiezettel_count} Regiezettel</span>}
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
            <Input label="Titel *" value={form.titel} onChange={v=>setForm({...form,titel:v})} required />
          </div>
          <Select label="Auftragstyp" value={form.typ} onChange={v=>setForm({...form,typ:v})} optionen={TYP_OPTIONEN} />
          <Input label="Termin" type="date" value={form.termin_datum} onChange={v=>setForm({...form,termin_datum:v})} />
          <Input label="Von" type="time" value={form.termin_von} onChange={v=>setForm({...form,termin_von:v})} />
          <Input label="Bis" type="time" value={form.termin_bis} onChange={v=>setForm({...form,termin_bis:v})} />

          <div style={{gridColumn:"1/-1",borderTop:"1px solid #f1f5f9",paddingTop:14,marginBottom:4}}>
            <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:8}}>KUNDENDATEN</div>
          </div>
          <Input label="Kundenname *" value={form.kunde_name} onChange={v=>setForm({...form,kunde_name:v})} required />
          <Input label="Telefon" value={form.kunde_telefon} onChange={v=>setForm({...form,kunde_telefon:v})} />
          <div style={{gridColumn:"1/-1"}}>
            <Input label="Adresse" value={form.kunde_adresse} onChange={v=>setForm({...form,kunde_adresse:v})} />
          </div>
          <Input label="E-Mail" type="email" value={form.kunde_email} onChange={v=>setForm({...form,kunde_email:v})} />
          <div style={{gridColumn:"1/-1"}}>
            <Textarea label="Auftragsbeschreibung" value={form.beschreibung} onChange={v=>setForm({...form,beschreibung:v})} rows={3} placeholder="Was soll gemacht werden?" />
          </div>

          {kannErstellen && mitarbeiter.length>0 && (
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:8}}>MITARBEITER ZUWEISEN</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {mitarbeiter.filter(m=>m.rolle==="mitarbeiter"||m.rolle==="bauleiter").map(m=>{
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
          <Btn onClick={auftragErstellen} variant="primary" size="lg" style={{width:"100%"}}>Auftrag erstellen</Btn>
        </div>
      </Modal>
    </Seite>
  );
}