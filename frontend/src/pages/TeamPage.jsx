import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Seite, Karte, Btn, Input, Select, Tabelle, Modal, Lader, Badge } from "../components/ui/UI";

const ROLLEN = [{value:"mitarbeiter",label:"👷 Mitarbeiter"},{value:"bauleiter",label:"🦺 Bauleiter"},{value:"vorgesetzter",label:"📋 Vorgesetzter"},{value:"admin",label:"⚙️ Admin"}];
const ROLLEFARBE = { admin:{bg:"#fef3c7",c:"#92400e"}, vorgesetzter:{bg:"#ede9fe",c:"#5b21b6"}, bauleiter:{bg:"#dbeafe",c:"#1e40af"}, mitarbeiter:{bg:"#f1f5f9",c:"#475569"} };

export default function TeamPage() {
  const { apiFetch, showToast } = useApp();
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [laden, setLaden] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ vorname:"", nachname:"", email:"", passwort:"", rolle:"mitarbeiter", urlaubstage_jahr:30, telefon:"" });
  const f = v => ({ ...form, ...v });

  useEffect(() => { ladeMitarbeiter(); }, []);

  async function ladeMitarbeiter() {
    setLaden(true);
    const res = await apiFetch("/api/users/");
    if (res?.ok) setMitarbeiter(await res.json());
    setLaden(false);
  }

  async function erstellen() {
    if (!form.vorname || !form.nachname || !form.email || !form.passwort) { showToast("Alle Pflichtfelder ausfüllen", "err"); return; }
    const res = await apiFetch("/api/users/", { method:"POST", body: JSON.stringify({ ...form, urlaubstage_jahr: Number(form.urlaubstage_jahr) }) });
    if (res?.ok) { showToast(`${form.vorname} ${form.nachname} angelegt`); setModal(false); setForm({ vorname:"", nachname:"", email:"", passwort:"", rolle:"mitarbeiter", urlaubstage_jahr:30, telefon:"" }); ladeMitarbeiter(); }
    else { const e = await res?.json(); showToast(e?.detail || "Fehler", "err"); }
  }

  if (laden) return <Lader />;

  return (
    <Seite titel="Team" untertitel={`${mitarbeiter.length} Mitarbeiter`} aktion={<Btn onClick={() => setModal(true)} variant="primary">+ Mitarbeiter hinzufügen</Btn>}>
      <Karte style={{ padding:0 }}>
        <Tabelle
          spalten={[
            { key:"avatar_name", label:"Name" },
            { key:"email", label:"E-Mail" },
            { key:"rolle_badge", label:"Rolle" },
            { key:"urlaub", label:"Urlaub" },
          ]}
          zeilen={mitarbeiter.map(m => {
            const rf = ROLLEFARBE[m.rolle] || ROLLEFARBE.mitarbeiter;
            return {
              avatar_name: (
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{ width:36,height:36,borderRadius:"50%",background:rf.bg,color:rf.c,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,flexShrink:0 }}>
                    {m.vorname.charAt(0)}{m.nachname.charAt(0)}
                  </div>
                  <div>
                    <div style={{fontWeight:600,fontSize:14}}>{m.vorname} {m.nachname}</div>
                    {m.telefon && <div style={{fontSize:12,color:"#94a3b8"}}>{m.telefon}</div>}
                  </div>
                </div>
              ),
              email: <span style={{fontSize:13,color:"#475569"}}>{m.email}</span>,
              rolle_badge: <span style={{background:rf.bg,color:rf.c,borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:600}}>{ROLLEN.find(r=>r.value===m.rolle)?.label||m.rolle}</span>,
              urlaub: <span style={{fontSize:13,color:"#64748b"}}>🌴 {m.urlaubstage_jahr} Tage/Jahr</span>,
            };
          })}
          leer="Noch keine Mitarbeiter"
        />
      </Karte>

      <Modal offen={modal} onClose={() => setModal(false)} titel="Neuer Mitarbeiter" breite={520}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <Input label="Vorname *" value={form.vorname} onChange={v => setForm(f({vorname:v}))} required />
          <Input label="Nachname *" value={form.nachname} onChange={v => setForm(f({nachname:v}))} required />
          <div style={{gridColumn:"1/-1"}}><Input label="E-Mail *" type="email" value={form.email} onChange={v => setForm(f({email:v}))} required /></div>
          <Input label="Telefon" value={form.telefon} onChange={v => setForm(f({telefon:v}))} />
          <Input label="Passwort *" type="password" value={form.passwort} onChange={v => setForm(f({passwort:v}))} required />
          <Select label="Rolle" value={form.rolle} onChange={v => setForm(f({rolle:v}))} optionen={ROLLEN} />
          <Input label="Urlaubstage/Jahr" type="number" value={String(form.urlaubstage_jahr)} onChange={v => setForm(f({urlaubstage_jahr:v}))} />
        </div>
        <Btn onClick={erstellen} variant="primary" size="lg" style={{width:"100%"}}>Mitarbeiter anlegen</Btn>
      </Modal>
    </Seite>
  );
}
