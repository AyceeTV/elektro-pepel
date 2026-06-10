import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Seite, Karte, Btn, Input, Select, Textarea, Tabelle, Modal, Lader, Badge, Leer } from "../components/ui/UI";

export default function BaustellenPage() {
  const { t, apiFetch, showToast, user } = useApp();
  const [baustellen, setBaustellen] = useState([]);
  const [detail, setDetail] = useState(null);
  const [laden, setLaden] = useState(true);
  const [modal, setModal] = useState(false);
  const kannAnlegen = ["admin","vorgesetzter"].includes(user.rolle);
  const [form, setForm] = useState({ name:"", kunde_name:"", kunde_adresse:"", baustelle_adresse:"", auftragsnummer:"", beschreibung:"" });
  const f = v => ({ ...form, ...v });

  useEffect(() => { ladeBaustellen(); }, []);

  async function ladeBaustellen() {
    setLaden(true);
    const res = await apiFetch("/api/baustellen/");
    if (res?.ok) setBaustellen(await res.json());
    setLaden(false);
  }

  async function ladeDetail(id) {
    const res = await apiFetch(`/api/baustellen/${id}`);
    if (res?.ok) setDetail(await res.json());
  }

  async function erstellen() {
    if (!form.name || !form.kunde_name) { showToast("Pflichtfelder ausfüllen", "err"); return; }
    const res = await apiFetch("/api/baustellen/", { method:"POST", body: JSON.stringify(form) });
    if (res?.ok) { showToast("Baustelle angelegt"); setModal(false); setForm({ name:"", kunde_name:"", kunde_adresse:"", baustelle_adresse:"", auftragsnummer:"", beschreibung:"" }); ladeBaustellen(); }
    else showToast(t("msg_fehler"), "err");
  }

  if (laden) return <Lader />;

  if (detail) return (
    <Seite titel={detail.name} untertitel={detail.baustelle_adresse || "Keine Adresse"} aktion={
      <Btn onClick={() => setDetail(null)} variant="ghost">← Zurück</Btn>
    }>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <Karte>
          <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700 }}>Kundeninformationen</h3>
          {[
            ["Kunde", detail.kunde_name],
            ["Baustelle", detail.baustelle_adresse || "—"],
            ["Auftrag", detail.auftragsnummer || "—"],
            ["Bauleiter", detail.bauleiter || "—"],
            ["Status", detail.status],
          ].map(([k,v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #f1f5f9", fontSize:14 }}>
              <span style={{ color:"#64748b", fontWeight:500 }}>{k}</span>
              <span style={{ fontWeight:600 }}>{v}</span>
            </div>
          ))}
        </Karte>
        <Karte>
          <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700 }}>Team ({detail.mitarbeiter?.length || 0} Mitarbeiter)</h3>
          {detail.mitarbeiter?.length === 0 ? (
            <p style={{ color:"#94a3b8", fontSize:14 }}>Noch keine Mitarbeiter zugewiesen</p>
          ) : detail.mitarbeiter?.map(m => (
            <div key={m.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid #f1f5f9" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"#dbeafe", color:"#1e40af", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13 }}>
                {m.name.charAt(0)}
              </div>
              <span style={{ fontSize:14, fontWeight:500 }}>{m.name}</span>
            </div>
          ))}
        </Karte>
      </div>
    </Seite>
  );

  return (
    <Seite titel={t("nav_baustellen")} untertitel={`${baustellen.length} aktive Baustellen`}
      aktion={kannAnlegen && <Btn onClick={() => setModal(true)} variant="primary">+ Neue Baustelle</Btn>}>

      <Karte style={{ padding: 0 }}>
        <Tabelle
          spalten={[
            { key: "name_cell", label: "Baustelle" },
            { key: "kunde", label: "Kunde" },
            { key: "adresse", label: "Adresse" },
            { key: "bauleiter_name", label: "Bauleiter" },
            { key: "status_badge", label: "Status" },
            { key: "aktion", label: "" },
          ]}
          zeilen={baustellen.map(b => ({
            name_cell: <strong style={{ fontSize:14 }}>{b.name}</strong>,
            kunde: b.kunde_name,
            adresse: b.baustelle_adresse || <span style={{color:"#94a3b8"}}>—</span>,
            bauleiter_name: b.bauleiter_name || <span style={{color:"#94a3b8"}}>—</span>,
            status_badge: <Badge label={b.status} typ={b.status === "aktiv" ? "success" : "default"} />,
            aktion: <Btn onClick={() => ladeDetail(b.id)} variant="ghost" size="sm">Details →</Btn>,
          }))}
          leer="Noch keine Baustellen angelegt"
        />
      </Karte>

      <Modal offen={modal} onClose={() => setModal(false)} titel="Neue Baustelle">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <div style={{ gridColumn:"1/-1" }}><Input label="Baustellen-Name *" value={form.name} onChange={v => setForm(f({name:v}))} required /></div>
          <Input label="Kundenname *" value={form.kunde_name} onChange={v => setForm(f({kunde_name:v}))} required />
          <Input label="Auftragsnummer" value={form.auftragsnummer} onChange={v => setForm(f({auftragsnummer:v}))} />
          <Input label="Baustellen-Adresse" value={form.baustelle_adresse} onChange={v => setForm(f({baustelle_adresse:v}))} />
          <Input label="Kunden-Adresse" value={form.kunde_adresse} onChange={v => setForm(f({kunde_adresse:v}))} />
          <div style={{ gridColumn:"1/-1" }}><Textarea label="Beschreibung" value={form.beschreibung} onChange={v => setForm(f({beschreibung:v}))} rows={2} /></div>
        </div>
        <Btn onClick={erstellen} variant="primary" size="lg" style={{ width:"100%" }}>Baustelle anlegen</Btn>
      </Modal>
    </Seite>
  );
}
