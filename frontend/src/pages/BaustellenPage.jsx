import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Karte, GrosserButton, KleinerButton, Eingabe, Auswahl, Textarea, Seitenheader, StatusBadge, Lader, Modal } from "../components/ui/UI";

export default function BaustellenPage() {
  const { t, apiFetch, showToast, user } = useApp();
  const [baustellen, setBaustellen] = useState([]);
  const [detail, setDetail] = useState(null);
  const [laden, setLaden] = useState(true);
  const [modal, setModal] = useState(false);
  const kannAnlegen = ["admin","vorgesetzter"].includes(user.rolle);

  const [form, setForm] = useState({ name:"", kunde_name:"", kunde_adresse:"", baustelle_adresse:"", auftragsnummer:"", beschreibung:"" });

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
    const res = await apiFetch("/api/baustellen/", {
      method: "POST",
      body: JSON.stringify(form),
    });
    if (res?.ok) {
      showToast(t("msg_gespeichert"), "ok");
      setModal(false);
      setForm({ name:"", kunde_name:"", kunde_adresse:"", baustelle_adresse:"", auftragsnummer:"", beschreibung:"" });
      ladeBaustellen();
    } else showToast(t("msg_fehler"), "err");
  }

  if (laden) return <Lader />;

  // Detail-Ansicht
  if (detail) return (
    <div style={{ padding: "0 16px 16px" }}>
      <button onClick={() => setDetail(null)} style={{
        background: "none", border: "none", color: "#2563eb", fontSize: 15,
        cursor: "pointer", padding: "16px 0", fontWeight: 600, display: "flex", alignItems: "center", gap: 6
      }}>← Zurück</button>

      <Karte style={{ marginBottom: 12, background: "#1a3d6e", color: "white" }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🏗 {detail.name}</div>
        <StatusBadge status={detail.status} />
        {detail.auftragsnummer && <div style={{ fontSize: 13, opacity: 0.75, marginTop: 8 }}>Auftrag: {detail.auftragsnummer}</div>}
      </Karte>

      <Karte style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a3d6e", marginBottom: 10 }}>Kundeninformationen</div>
        <InfoZeile icon="👤" label="Kunde" wert={detail.kunde_name} />
        {detail.baustelle_adresse && <InfoZeile icon="📍" label="Baustelle" wert={detail.baustelle_adresse} />}
        {detail.bauleiter && <InfoZeile icon="👷" label="Bauleiter" wert={detail.bauleiter} />}
      </Karte>

      <Karte style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a3d6e", marginBottom: 10 }}>Team ({detail.mitarbeiter?.length || 0})</div>
        {detail.mitarbeiter?.map(m => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#1a3d6e", fontSize: 14 }}>
              {m.name.charAt(0)}
            </div>
            <span style={{ fontSize: 15, color: "#1e293b" }}>{m.name}</span>
          </div>
        ))}
      </Karte>
    </div>
  );

  return (
    <div style={{ padding: "0 16px 16px" }}>
      <Seitenheader titel={t("nav_baustellen")} untertitel={`${baustellen.length} aktive Baustellen`} />

      {kannAnlegen && (
        <GrosserButton farbe="#1a3d6e" onClick={() => setModal(true)} icon="+" style={{ marginBottom: 16 }}>
          {t("btn_neue_baustelle")}
        </GrosserButton>
      )}

      {baustellen.length === 0 ? (
        <Karte style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
          <div style={{ fontSize: 40 }}>🏗</div>
          <div style={{ marginTop: 8 }}>Noch keine Baustellen</div>
        </Karte>
      ) : baustellen.map(b => (
        <Karte key={b.id} style={{ marginBottom: 10, cursor: "pointer" }} onClick={() => ladeDetail(b.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>🏗 {b.name}</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>👤 {b.kunde_name}</div>
              {b.baustelle_adresse && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>📍 {b.baustelle_adresse}</div>}
              {b.bauleiter_name && <div style={{ fontSize: 12, color: "#94a3b8" }}>👷 {b.bauleiter_name}</div>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <StatusBadge status={b.status} />
              <span style={{ fontSize: 12, color: "#94a3b8" }}>›</span>
            </div>
          </div>
        </Karte>
      ))}

      <Modal offen={modal} onClose={() => setModal(false)} titel={t("btn_neue_baustelle")}>
        <Eingabe label="Baustellen-Name *" value={form.name} onChange={v => setForm({...form, name:v})} required />
        <Eingabe label={`${t("label_kundenname")} *`} value={form.kunde_name} onChange={v => setForm({...form, kunde_name:v})} required />
        <Eingabe label={t("label_adresse") + " (Baustelle)"} value={form.baustelle_adresse} onChange={v => setForm({...form, baustelle_adresse:v})} />
        <Eingabe label="Kunden-Adresse" value={form.kunde_adresse} onChange={v => setForm({...form, kunde_adresse:v})} />
        <Eingabe label={t("label_auftragsnr")} value={form.auftragsnummer} onChange={v => setForm({...form, auftragsnummer:v})} />
        <Textarea label="Beschreibung" value={form.beschreibung} onChange={v => setForm({...form, beschreibung:v})} rows={2} />
        <GrosserButton farbe="#1a3d6e" onClick={erstellen} icon="🏗">
          {t("btn_speichern")}
        </GrosserButton>
      </Modal>
    </div>
  );
}

function InfoZeile({ icon, label, wert }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 500 }}>{wert}</div>
      </div>
    </div>
  );
}
