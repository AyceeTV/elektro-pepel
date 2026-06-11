import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Seite, Btn, Input, Select, Textarea, Modal, Lader } from "../components/ui/UI";

const KAT = [
  {value:"material",   label:"🔩 Material",      bg:"#dbeafe",c:"#1e40af"},
  {value:"arbeitszeit",label:"⏱ Arbeitszeit",    bg:"#dcfce7",c:"#15803d"},
  {value:"anfahrt",    label:"🚗 Anfahrt",        bg:"#fef9c3",c:"#92400e"},
  {value:"pauschale",  label:"📋 Pauschale",      bg:"#ede9fe",c:"#4c1d95"},
  {value:"sonstiges",  label:"📦 Sonstiges",      bg:"#f1f5f9",c:"#475569"},
];
const EINHEITEN = ["Stk","m","m²","m³","kg","L","Pkg","Std","Pauschale","Set"];
const ROLLEN = [
  {value:"mitarbeiter",  label:"👷 Monteur"},
  {value:"bauleiter",    label:"🦺 Bauleiter"},
  {value:"vorgesetzter", label:"📋 Vorgesetzter"},
  {value:"verwaltung",   label:"🏢 Verwaltung"},
];

function katFarbe(k) { return KAT.find(x=>x.value===k)||KAT[4]; }

export default function VerwaltungPage() {
  const { apiFetch, showToast } = useApp();
  const [tab, setTab] = useState("produkte");
  const [produkte, setProdukte] = useState([]);
  const [azPreise, setAzPreise] = useState([]);
  const [anfahrt, setAnfahrt] = useState([]);
  const [laden, setLaden] = useState(true);
  const [suche, setSuche] = useState("");
  const [katFilter, setKatFilter] = useState("");
  const [modal, setModal] = useState(null); // null | "produkt" | "az" | "anfahrt"
  const [editItem, setEditItem] = useState(null);

  // Formulare
  const leerProdukt = {artikelnummer:"",bezeichnung:"",beschreibung:"",kategorie:"material",einheit:"Stk",preis:""};
  const leerAz = {rolle:"mitarbeiter",bezeichnung:"Monteur",preis_stunde:""};
  const leerAnfahrt = {bezeichnung:"",preis:"",beschreibung:""};
  const [pForm, setPForm] = useState(leerProdukt);
  const [azForm, setAzForm] = useState(leerAz);
  const [afForm, setAfForm] = useState(leerAnfahrt);

  useEffect(() => { ladeAlles(); }, []);

  async function ladeAlles() {
    setLaden(true);
    const [pRes, azRes, afRes] = await Promise.all([
      apiFetch("/api/katalog/produkte"),
      apiFetch("/api/katalog/arbeitszeitpreise"),
      apiFetch("/api/katalog/anfahrt"),
    ]);
    if (pRes?.ok) setProdukte(await pRes.json());
    if (azRes?.ok) setAzPreise(await azRes.json());
    if (afRes?.ok) setAnfahrt(await afRes.json());
    setLaden(false);
  }

  function oeffneProdukt(item=null) {
    setPForm(item ? {...item, preis:String(item.preis)} : leerProdukt);
    setEditItem(item);
    setModal("produkt");
  }

  function oeffneAz(item=null) {
    setAzForm(item ? {...item, preis_stunde:String(item.preis_stunde)} : leerAz);
    setEditItem(item);
    setModal("az");
  }

  function oeffneAnfahrt(item=null) {
    setAfForm(item ? {...item, preis:String(item.preis)} : leerAnfahrt);
    setEditItem(item);
    setModal("anfahrt");
  }

  async function produktSpeichern() {
    if (!pForm.bezeichnung) { showToast("Bezeichnung fehlt","err"); return; }
    const body = {...pForm, preis:parseFloat(pForm.preis)||0};
    const res = editItem
      ? await apiFetch(`/api/katalog/produkte/${editItem.id}`, {method:"PUT", body:JSON.stringify(body)})
      : await apiFetch("/api/katalog/produkte", {method:"POST", body:JSON.stringify(body)});
    if (res?.ok) { showToast(editItem?"✓ Gespeichert":"✓ Produkt erstellt"); setModal(null); ladeAlles(); }
    else showToast("Fehler","err");
  }

  async function azSpeichern() {
    if (!azForm.bezeichnung||!azForm.preis_stunde) { showToast("Alle Felder ausfüllen","err"); return; }
    const body = {...azForm, preis_stunde:parseFloat(azForm.preis_stunde)||0};
    const res = editItem
      ? await apiFetch(`/api/katalog/arbeitszeitpreise/${editItem.id}`, {method:"PUT", body:JSON.stringify(body)})
      : await apiFetch("/api/katalog/arbeitszeitpreise", {method:"POST", body:JSON.stringify(body)});
    if (res?.ok) { showToast("✓ Gespeichert"); setModal(null); ladeAlles(); }
    else showToast("Fehler","err");
  }

  async function anfahrtSpeichern() {
    if (!afForm.bezeichnung||!afForm.preis) { showToast("Pflichtfelder fehlen","err"); return; }
    const body = {...afForm, preis:parseFloat(afForm.preis)||0};
    const res = editItem
      ? await apiFetch(`/api/katalog/anfahrt/${editItem.id}`, {method:"PUT", body:JSON.stringify(body)})
      : await apiFetch("/api/katalog/anfahrt", {method:"POST", body:JSON.stringify(body)});
    if (res?.ok) { showToast("✓ Gespeichert"); setModal(null); ladeAlles(); }
    else showToast("Fehler","err");
  }

  async function loeschen(typ, id) {
    if (!confirm("Wirklich löschen?")) return;
    await apiFetch(`/api/katalog/${typ}/${id}`, {method:"DELETE"});
    showToast("Gelöscht"); ladeAlles();
  }

  const gefilterteProdukte = produkte.filter(p => {
    const q = suche.toLowerCase();
    const matchSuche = !q || p.bezeichnung.toLowerCase().includes(q) || p.artikelnummer?.toLowerCase().includes(q);
    const matchKat = !katFilter || p.kategorie === katFilter;
    return matchSuche && matchKat;
  });

  if (laden) return <Lader />;

  return (
    <Seite titel="⚙️ Verwaltung" untertitel="Produktkatalog, Preise & Pauschalen">

      {/* Tabs */}
      <div style={{display:"flex",background:"#f1f5f9",borderRadius:10,padding:4,marginBottom:24,maxWidth:500}}>
        {[["produkte","🔩 Produkte & Material"],["arbeitszeit","⏱ Arbeitszeitpreise"],["anfahrt","🚗 Anfahrtspauschalen"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{
            flex:1,padding:"9px 8px",borderRadius:8,border:"none",cursor:"pointer",
            fontSize:12,fontWeight:tab===k?700:500,whiteSpace:"nowrap",
            background:tab===k?"white":"transparent",
            color:tab===k?"#0f1923":"#64748b",
            boxShadow:tab===k?"0 1px 4px rgba(0,0,0,0.1)":"none",
          }}>{l}</button>
        ))}
      </div>

      {/* ── PRODUKTE ── */}
      {tab==="produkte"&&(
        <div>
          {/* Suche + Filter + Button */}
          <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{position:"relative",flex:1,minWidth:200}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#94a3b8"}}>🔍</span>
              <input value={suche} onChange={e=>setSuche(e.target.value)} placeholder="Artikel suchen..."
                style={{width:"100%",padding:"9px 12px 9px 36px",fontSize:14,border:"1.5px solid #e2e8f0",borderRadius:8,boxSizing:"border-box",outline:"none"}}/>
            </div>
            <select value={katFilter} onChange={e=>setKatFilter(e.target.value)} style={{padding:"9px 12px",fontSize:13,border:"1.5px solid #e2e8f0",borderRadius:8,background:"white",outline:"none",cursor:"pointer"}}>
              <option value="">Alle Kategorien</option>
              {KAT.map(k=><option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
            <Btn onClick={()=>oeffneProdukt()} variant="primary">+ Neues Produkt</Btn>
          </div>

          <div style={{fontSize:12,color:"#94a3b8",marginBottom:8}}>{gefilterteProdukte.length} Artikel</div>

          {/* Tabelle */}
          <div style={{background:"white",border:"1.5px solid #e2e8f0",borderRadius:12,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"#f8fafc",borderBottom:"2px solid #e2e8f0"}}>
                  {["Art.-Nr.","Bezeichnung","Kategorie","Einheit","Preis (Netto)",""].map(h=>(
                    <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.04em",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gefilterteProdukte.length===0?(
                  <tr><td colSpan={6} style={{textAlign:"center",padding:40,color:"#94a3b8"}}>
                    {suche?"Keine Artikel gefunden":"Noch keine Produkte — füge deinen ersten Artikel hinzu"}
                  </td></tr>
                ):gefilterteProdukte.map((p,i)=>{
                  const kf = katFarbe(p.kategorie);
                  return (
                    <tr key={p.id} style={{borderBottom:"1px solid #f1f5f9",background:i%2===0?"white":"#fafafa"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#f0f7ff"}
                      onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"white":"#fafafa"}>
                      <td style={{padding:"10px 14px",color:"#64748b",fontFamily:"monospace",fontSize:12}}>{p.artikelnummer||"—"}</td>
                      <td style={{padding:"10px 14px"}}>
                        <div style={{fontWeight:600,color:"#0f1923"}}>{p.bezeichnung}</div>
                        {p.beschreibung&&<div style={{fontSize:11,color:"#94a3b8",marginTop:1}}>{p.beschreibung.slice(0,60)}</div>}
                      </td>
                      <td style={{padding:"10px 14px"}}>
                        <span style={{background:kf.bg,color:kf.c,borderRadius:6,padding:"2px 10px",fontSize:11,fontWeight:600}}>{kf.label}</span>
                      </td>
                      <td style={{padding:"10px 14px",color:"#475569"}}>{p.einheit}</td>
                      <td style={{padding:"10px 14px",fontWeight:700,color:"#0f1923"}}>{p.preis.toFixed(2)} €</td>
                      <td style={{padding:"10px 14px"}}>
                        <div style={{display:"flex",gap:6}}>
                          <Btn onClick={()=>oeffneProdukt(p)} variant="ghost" size="sm">✏️</Btn>
                          <Btn onClick={()=>loeschen("produkte",p.id)} variant="ghost" size="sm" style={{color:"#dc2626"}}>🗑</Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ARBEITSZEITPREISE ── */}
      {tab==="arbeitszeit"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <p style={{fontSize:13,color:"#64748b",margin:0}}>Stundensätze je Rolle — werden automatisch im Regiezettel berechnet</p>
            <Btn onClick={()=>oeffneAz()} variant="primary">+ Neuer Satz</Btn>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
            {azPreise.map(az=>{
              const rolle = ROLLEN.find(r=>r.value===az.rolle)||{label:az.rolle};
              return (
                <div key={az.id} style={{background:"white",border:"1.5px solid #e2e8f0",borderRadius:12,padding:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#94a3b8",marginBottom:4}}>{rolle.label}</div>
                      <div style={{fontSize:16,fontWeight:800,color:"#0f1923"}}>{az.bezeichnung}</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <Btn onClick={()=>oeffneAz(az)} variant="ghost" size="sm">✏️</Btn>
                    </div>
                  </div>
                  <div style={{background:"#f59e0b",borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#92400e",marginBottom:2}}>STUNDENSATZ</div>
                    <div style={{fontSize:28,fontWeight:800,color:"#0f1923"}}>{az.preis_stunde.toFixed(2)} €</div>
                    <div style={{fontSize:11,color:"#92400e"}}>pro Stunde (Netto)</div>
                  </div>
                </div>
              );
            })}
            {azPreise.length===0&&(
              <div style={{background:"white",border:"1.5px solid #e2e8f0",borderRadius:12,padding:40,textAlign:"center",color:"#94a3b8",gridColumn:"1/-1"}}>
                Noch keine Stundensätze — füge deinen ersten hinzu
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ANFAHRTSPAUSCHALEN ── */}
      {tab==="anfahrt"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <p style={{fontSize:13,color:"#64748b",margin:0}}>Vordefinierte Anfahrtspauschalen — im Regiezettel auswählbar</p>
            <Btn onClick={()=>oeffneAnfahrt()} variant="primary">+ Neue Pauschale</Btn>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
            {anfahrt.map(af=>(
              <div key={af.id} style={{background:"white",border:"1.5px solid #e2e8f0",borderRadius:12,padding:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:800,color:"#0f1923",marginBottom:4}}>🚗 {af.bezeichnung}</div>
                    {af.beschreibung&&<div style={{fontSize:12,color:"#64748b"}}>{af.beschreibung}</div>}
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <Btn onClick={()=>oeffneAnfahrt(af)} variant="ghost" size="sm">✏️</Btn>
                    <Btn onClick={()=>loeschen("anfahrt",af.id)} variant="ghost" size="sm" style={{color:"#dc2626"}}>🗑</Btn>
                  </div>
                </div>
                <div style={{background:"#f1f5f9",borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
                  <div style={{fontSize:24,fontWeight:800,color:"#0f1923"}}>{af.preis.toFixed(2)} €</div>
                  <div style={{fontSize:11,color:"#64748b"}}>Pauschale (Netto)</div>
                </div>
              </div>
            ))}
            {anfahrt.length===0&&(
              <div style={{background:"white",border:"1.5px solid #e2e8f0",borderRadius:12,padding:40,textAlign:"center",color:"#94a3b8",gridColumn:"1/-1"}}>
                Noch keine Anfahrtspauschalen
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: Produkt ── */}
      <Modal offen={modal==="produkt"} onClose={()=>setModal(null)} titel={editItem?"Produkt bearbeiten":"Neues Produkt"} breite={520}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <Input label="Artikelnummer" value={pForm.artikelnummer} onChange={v=>setPForm({...pForm,artikelnummer:v})} placeholder="z.B. 0473089"/>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:"#475569",marginBottom:6}}>Kategorie</div>
            <select value={pForm.kategorie} onChange={e=>setPForm({...pForm,kategorie:e.target.value})}
              style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e2e8f0",borderRadius:8,background:"white",outline:"none",marginBottom:14}}>
              {KAT.map(k=><option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <Input label="Bezeichnung *" value={pForm.bezeichnung} onChange={v=>setPForm({...pForm,bezeichnung:v})} required placeholder="z.B. Schalterdose UP"/>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <Input label="Beschreibung (optional)" value={pForm.beschreibung} onChange={v=>setPForm({...pForm,beschreibung:v})} placeholder="Details, Hersteller..."/>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:"#475569",marginBottom:6}}>Einheit</div>
            <select value={pForm.einheit} onChange={e=>setPForm({...pForm,einheit:e.target.value})}
              style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e2e8f0",borderRadius:8,background:"white",outline:"none",marginBottom:14}}>
              {EINHEITEN.map(e=><option key={e}>{e}</option>)}
            </select>
          </div>
          <Input label="Preis (Netto, €) *" type="number" value={pForm.preis} onChange={v=>setPForm({...pForm,preis:v})} placeholder="0.00" required/>
        </div>
        <Btn onClick={produktSpeichern} variant="primary" size="lg" style={{width:"100%"}}>
          {editItem?"✓ Änderungen speichern":"✓ Produkt erstellen"}
        </Btn>
      </Modal>

      {/* ── MODAL: Arbeitszeitpreis ── */}
      <Modal offen={modal==="az"} onClose={()=>setModal(null)} titel={editItem?"Stundensatz bearbeiten":"Neuer Stundensatz"}>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:"#475569",marginBottom:6}}>Rolle</div>
          <select value={azForm.rolle} onChange={e=>setAzForm({...azForm,rolle:e.target.value})}
            style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e2e8f0",borderRadius:8,background:"white",outline:"none",marginBottom:14}}>
            {ROLLEN.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <Input label="Bezeichnung" value={azForm.bezeichnung} onChange={v=>setAzForm({...azForm,bezeichnung:v})} placeholder="z.B. Monteur"/>
          <Input label="Stundensatz (€/h, Netto) *" type="number" value={azForm.preis_stunde} onChange={v=>setAzForm({...azForm,preis_stunde:v})} placeholder="65.00" required/>
        </div>
        <Btn onClick={azSpeichern} variant="primary" size="lg" style={{width:"100%"}}>✓ Speichern</Btn>
      </Modal>

      {/* ── MODAL: Anfahrtspauschale ── */}
      <Modal offen={modal==="anfahrt"} onClose={()=>setModal(null)} titel={editItem?"Pauschale bearbeiten":"Neue Anfahrtspauschale"}>
        <Input label="Bezeichnung *" value={afForm.bezeichnung} onChange={v=>setAfForm({...afForm,bezeichnung:v})} placeholder="z.B. Anfahrt Zone 1 (0–20 km)" required/>
        <Input label="Preis (€, Netto) *" type="number" value={afForm.preis} onChange={v=>setAfForm({...afForm,preis:v})} placeholder="25.00" required/>
        <Textarea label="Beschreibung (optional)" value={afForm.beschreibung} onChange={v=>setAfForm({...afForm,beschreibung:v})} rows={2} placeholder="z.B. Gilt für Fahrten bis 20 km vom Betrieb"/>
        <Btn onClick={anfahrtSpeichern} variant="primary" size="lg" style={{width:"100%"}}>✓ Speichern</Btn>
      </Modal>
    </Seite>
  );
}