import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Seite, Karte, Btn, Input, Select, Textarea, Tabelle, Modal, Lader, Badge } from "../components/ui/UI";
import { kiUebersetzen } from "../i18n/translations";

export default function RegiezettelPage() {
  const { t, apiFetch, showToast, sprache } = useApp();
  const [baustellen, setBaustellen] = useState([]);
  const [gewaehlt, setGewaehlt] = useState("");
  const [liste, setListe] = useState([]);
  const [laden, setLaden] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ datum_von:"", datum_bis:"", notizen:"" });

  useEffect(() => { ladeBaustellen(); }, []);
  useEffect(() => { if (gewaehlt) ladeListe(); }, [gewaehlt]);

  async function ladeBaustellen() {
    const res = await apiFetch("/api/baustellen/");
    if (res?.ok) { const d = await res.json(); setBaustellen(d); if (d.length > 0) setGewaehlt(String(d[0].id)); }
  }

  async function ladeListe() {
    setLaden(true);
    const res = await apiFetch(`/api/regiezettel/baustelle/${gewaehlt}`);
    if (res?.ok) setListe(await res.json());
    setLaden(false);
  }

  async function erstellen() {
    if (!form.datum_von || !form.datum_bis) { showToast("Bitte Zeitraum wählen", "err"); return; }
    const res = await apiFetch("/api/regiezettel/erstellen", { method:"POST", body: JSON.stringify({ baustelle_id: Number(gewaehlt), ...form, notizen: form.notizen||null }) });
    if (res?.ok) { showToast("Regiezettel erstellt"); setModal(false); setForm({ datum_von:"", datum_bis:"", notizen:"" }); ladeListe(); }
    else { const e = await res?.json(); showToast(e?.detail || t("msg_fehler"), "err"); }
  }

  async function pdfHerunterladen(id) {
    const res = await apiFetch(`/api/regiezettel/${id}/pdf`);
    if (!res?.ok) { showToast(t("msg_fehler"), "err"); return; }
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Regiezettel_ElektroPepel_${id}.pdf`;
    link.click();
    showToast("PDF heruntergeladen");
  }

  return (
    <Seite titel={t("nav_regiezettel")} untertitel="Elektro Pepel"
      aktion={<Btn onClick={() => setModal(true)} variant="primary">+ Regiezettel erstellen</Btn>}>

      <div style={{marginBottom:20}}>
        <Select label="Baustelle" value={gewaehlt} onChange={setGewaehlt} optionen={baustellen.map(b => ({ value:b.id, label:b.name }))} />
      </div>

      <Karte style={{background:"#f0fdf4",border:"1px solid #bbf7d0",marginBottom:20,padding:"14px 20px"}}>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <span style={{fontSize:24}}>🤖</span>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:"#15803d"}}>KI-Übersetzung aktiv</div>
            <div style={{fontSize:13,color:"#166534",marginTop:2}}>Rumänische Tätigkeiten werden beim PDF-Download automatisch ins Deutsche übersetzt.</div>
          </div>
        </div>
      </Karte>

      <Karte style={{padding:0}}>
        {laden ? <Lader /> : (
          <Tabelle
            spalten={[
              {key:"titel_cell",label:"Titel"},
              {key:"zeitraum",label:"Zeitraum"},
              {key:"erstellt",label:"Erstellt von"},
              {key:"unterschriften",label:"Unterschriften"},
              {key:"aktionen",label:""},
            ]}
            zeilen={liste.map(r => ({
              titel_cell: <strong style={{fontSize:14}}>{r.titel}</strong>,
              zeitraum: `${new Date(r.datum_von).toLocaleDateString("de-DE")} – ${new Date(r.datum_bis).toLocaleDateString("de-DE")}`,
              erstellt: <span style={{fontSize:13,color:"#64748b"}}>{r.erstellt_von} · {new Date(r.erstellt_am).toLocaleDateString("de-DE")}</span>,
              unterschriften: (
                <div style={{display:"flex",gap:6}}>
                  <Badge label="Bauleiter" typ={r.unterschrift_bauleiter?"success":"default"} />
                  <Badge label="Kunde" typ={r.unterschrift_kunde?"success":"default"} />
                </div>
              ),
              aktionen: (
                <div style={{display:"flex",gap:6}}>
                  <Btn onClick={() => pdfHerunterladen(r.id)} variant="primary" size="sm">🇩🇪 PDF</Btn>
                </div>
              ),
            }))}
            leer="Noch keine Regiezettel für diese Baustelle"
          />
        )}
      </Karte>

      <Modal offen={modal} onClose={() => setModal(false)} titel="Regiezettel erstellen">
        <div style={{background:"#eff6ff",borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#1e40af"}}>
          ℹ️ Alle Zeiteinträge im gewählten Zeitraum werden automatisch zusammengefasst.
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <Input label="Von *" type="date" value={form.datum_von} onChange={v => setForm({...form,datum_von:v})} required />
          <Input label="Bis *" type="date" value={form.datum_bis} onChange={v => setForm({...form,datum_bis:v})} required />
        </div>
        <Textarea label="Notizen (optional)" value={form.notizen} onChange={v => setForm({...form,notizen:v})} rows={3} placeholder="Besonderheiten, Hinweise..." />
        <Btn onClick={erstellen} variant="primary" size="lg" style={{width:"100%"}}>Regiezettel erstellen</Btn>
      </Modal>
    </Seite>
  );
}
