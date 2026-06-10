import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Seite, Karte, StatKarte, Btn, Input, Select, Textarea, Tabelle, Modal, Lader, Badge } from "../components/ui/UI";

export default function UrlaubPage() {
  const { t, apiFetch, showToast, user } = useApp();
  const [antraege, setAntraege] = useState([]);
  const [teamAntraege, setTeamAntraege] = useState([]);
  const [resturlaub, setResturlaub] = useState(null);
  const [laden, setLaden] = useState(true);
  const [modal, setModal] = useState(false);
  const [tab, setTab] = useState("meine");
  const [typ, setTyp] = useState("urlaub");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [notiz, setNotiz] = useState("");
  const istVorgesetzter = ["admin","vorgesetzter"].includes(user.rolle);

  useEffect(() => { ladeAlles(); }, []);

  async function ladeAlles() {
    setLaden(true);
    const [aRes, rRes] = await Promise.all([apiFetch("/api/urlaub/meine"), apiFetch("/api/urlaub/resturlaub")]);
    if (aRes?.ok) setAntraege(await aRes.json());
    if (rRes?.ok) setResturlaub(await rRes.json());
    if (istVorgesetzter) {
      const tRes = await apiFetch("/api/urlaub/team?status=beantragt");
      if (tRes?.ok) setTeamAntraege(await tRes.json());
    }
    setLaden(false);
  }

  async function antragStellen() {
    if (!von || !bis) { showToast("Bitte Datum wählen", "err"); return; }
    const res = await apiFetch("/api/urlaub/antrag", { method:"POST", body: JSON.stringify({ typ, von_datum:von, bis_datum:bis, notiz: notiz||null }) });
    if (res?.ok) {
      const d = await res.json();
      showToast(`Antrag gestellt — ${d.arbeitstage} Arbeitstage`);
      setModal(false); setVon(""); setBis(""); setNotiz(""); ladeAlles();
    } else { const e = await res?.json(); showToast(e?.detail || t("msg_fehler"), "err"); }
  }

  async function entscheiden(id, aktion) {
    const grund = aktion === "ablehnen" ? (prompt("Ablehnungsgrund:") || "") : "";
    const pfad = aktion === "genehmigen" ? `/api/urlaub/${id}/genehmigen` : `/api/urlaub/${id}/ablehnen?grund=${encodeURIComponent(grund)}`;
    const res = await apiFetch(pfad, { method:"PUT" });
    if (res?.ok) { showToast(aktion === "genehmigen" ? "Genehmigt ✓" : "Abgelehnt"); ladeAlles(); }
  }

  const statusBadge = s => ({ beantragt:"warning", genehmigt:"success", abgelehnt:"danger", storniert:"default" })[s] || "default";

  if (laden) return <Lader />;

  return (
    <Seite titel={t("nav_urlaub")} aktion={<Btn onClick={() => setModal(true)} variant="primary">+ Urlaub beantragen</Btn>}>

      {resturlaub && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:16, marginBottom:24 }}>
          <StatKarte zahl={resturlaub.anspruch} label="Jahresanspruch" icon="📅" />
          <StatKarte zahl={resturlaub.verbraucht} label="Genommen" icon="✓" farbe="#f59e0b" />
          <StatKarte zahl={resturlaub.rest} label="Verbleibend" icon="🌴" farbe="#16a34a" />
          {istVorgesetzter && <StatKarte zahl={teamAntraege.length} label="Offene Anträge" icon="⏳" farbe="#7c3aed" />}
        </div>
      )}

      {istVorgesetzter && (
        <div style={{ display:"flex", background:"#f1f5f9", borderRadius:10, padding:4, marginBottom:20, maxWidth:320 }}>
          {[["meine","Meine Anträge"],["team",`Team (${teamAntraege.length})`]].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex:1, padding:"8px 16px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:tab===k?700:500,
              background: tab===k?"white":"transparent", color: tab===k?"#0f1923":"#64748b",
              boxShadow: tab===k?"0 1px 4px rgba(0,0,0,0.1)":"none",
            }}>{l}</button>
          ))}
        </div>
      )}

      <Karte style={{ padding:0 }}>
        {tab === "meine" ? (
          <Tabelle
            spalten={[
              { key:"typ_cell", label:"Art" },
              { key:"zeitraum", label:"Zeitraum" },
              { key:"tage", label:"Tage" },
              { key:"status_cell", label:"Status" },
              { key:"notiz_cell", label:"Notiz" },
            ]}
            zeilen={antraege.map(a => ({
              typ_cell: <span style={{fontSize:14}}>{ a.typ==="urlaub"?"🌴 Urlaub": a.typ==="krank"?"🤒 Krank":"📅 Sonderurlaub"}</span>,
              zeitraum: `${new Date(a.von_datum).toLocaleDateString("de-DE")} – ${new Date(a.bis_datum).toLocaleDateString("de-DE")}`,
              tage: `${a.arbeitstage} AT`,
              status_cell: <Badge label={a.status} typ={statusBadge(a.status)} />,
              notiz_cell: a.ablehnungsgrund ? <span style={{color:"#dc2626",fontSize:13}}>{a.ablehnungsgrund}</span> : <span style={{color:"#94a3b8",fontSize:13}}>{a.notiz||"—"}</span>,
            }))}
            leer="Noch keine Urlaubsanträge"
          />
        ) : (
          <Tabelle
            spalten={[
              { key:"ma", label:"Mitarbeiter" },
              { key:"typ_cell", label:"Art" },
              { key:"zeitraum", label:"Zeitraum" },
              { key:"tage", label:"Tage" },
              { key:"aktionen", label:"Aktion" },
            ]}
            zeilen={teamAntraege.map(a => ({
              ma: <strong>{a.mitarbeiter_name}</strong>,
              typ_cell: a.typ==="urlaub"?"🌴 Urlaub": a.typ==="krank"?"🤒 Krank":"📅 Sonder",
              zeitraum: `${new Date(a.von_datum).toLocaleDateString("de-DE")} – ${new Date(a.bis_datum).toLocaleDateString("de-DE")}`,
              tage: `${a.arbeitstage} AT`,
              aktionen: (
                <div style={{display:"flex",gap:6}}>
                  <Btn onClick={() => entscheiden(a.id,"genehmigen")} variant="primary" size="sm">✓ OK</Btn>
                  <Btn onClick={() => entscheiden(a.id,"ablehnen")} variant="danger" size="sm">✕</Btn>
                </div>
              ),
            }))}
            leer="Keine offenen Anträge"
          />
        )}
      </Karte>

      <Modal offen={modal} onClose={() => setModal(false)} titel="Urlaub beantragen">
        <Select label="Art" value={typ} onChange={setTyp} optionen={[{value:"urlaub",label:"🌴 Urlaub"},{value:"krank",label:"🤒 Krankmeldung"},{value:"sonderurlaub",label:"📅 Sonderurlaub"}]} />
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <Input label="Von *" type="date" value={von} onChange={setVon} required />
          <Input label="Bis *" type="date" value={bis} onChange={setBis} required />
        </div>
        <Textarea label="Notiz (optional)" value={notiz} onChange={setNotiz} rows={2} />
        <Btn onClick={antragStellen} variant="primary" size="lg" style={{width:"100%"}}>Antrag stellen</Btn>
      </Modal>
    </Seite>
  );
}
