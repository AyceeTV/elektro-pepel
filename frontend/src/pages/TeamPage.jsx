import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Karte, GrosserButton, Eingabe, Auswahl, Seitenheader, StatusBadge, Lader, Modal } from "../components/ui/UI";

const ROLLEN = [
  { value: "mitarbeiter",  label: "👷 Mitarbeiter" },
  { value: "bauleiter",    label: "🦺 Bauleiter" },
  { value: "vorgesetzter", label: "📋 Vorgesetzter" },
  { value: "admin",        label: "⚙️ Admin" },
];

const ROLLEFARBEN = {
  admin:        { bg: "#fef3c7", color: "#b45309" },
  vorgesetzter: { bg: "#ede9fe", color: "#7c3aed" },
  bauleiter:    { bg: "#dbeafe", color: "#1d4ed8" },
  mitarbeiter:  { bg: "#f1f5f9", color: "#475569" },
};

export default function TeamPage() {
  const { t, apiFetch, showToast } = useApp();
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [laden, setLaden] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ vorname:"", nachname:"", email:"", passwort:"", rolle:"mitarbeiter", urlaubstage_jahr:30, telefon:"" });
  const [senden, setSenden] = useState(false);

  useEffect(() => { ladeMitarbeiter(); }, []);

  async function ladeMitarbeiter() {
    setLaden(true);
    const res = await apiFetch("/api/users/");
    if (res?.ok) setMitarbeiter(await res.json());
    setLaden(false);
  }

  async function erstellen() {
    if (!form.vorname || !form.nachname || !form.email || !form.passwort) {
      showToast("Alle Pflichtfelder ausfüllen", "err"); return;
    }
    setSenden(true);
    const res = await apiFetch("/api/users/", {
      method: "POST",
      body: JSON.stringify({ ...form, urlaubstage_jahr: Number(form.urlaubstage_jahr) }),
    });
    setSenden(false);
    if (res?.ok) {
      showToast(`${form.vorname} ${form.nachname} hinzugefügt`, "ok");
      setModal(false);
      setForm({ vorname:"", nachname:"", email:"", passwort:"", rolle:"mitarbeiter", urlaubstage_jahr:30, telefon:"" });
      ladeMitarbeiter();
    } else {
      const err = await res?.json();
      showToast(err?.detail || t("msg_fehler"), "err");
    }
  }

  if (laden) return <Lader />;

  return (
    <div style={{ padding: "0 16px 16px" }}>
      <Seitenheader titel={t("nav_team")} untertitel={`${mitarbeiter.length} Mitarbeiter`} />

      <GrosserButton farbe="#1a3d6e" onClick={() => setModal(true)} icon="👷" style={{ marginBottom: 16 }}>
        Mitarbeiter hinzufügen
      </GrosserButton>

      {mitarbeiter.map(m => {
        const rf = ROLLEFARBEN[m.rolle] || ROLLEFARBEN.mitarbeiter;
        return (
          <Karte key={m.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Avatar */}
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: rf.bg, color: rf.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 800, flexShrink: 0
              }}>
                {m.vorname.charAt(0)}{m.nachname.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>
                  {m.vorname} {m.nachname}
                </div>
                <div style={{ fontSize: 13, color: "#64748b" }}>{m.email}</div>
                <div style={{ marginTop: 4 }}>
                  <span style={{
                    background: rf.bg, color: rf.color,
                    borderRadius: 8, padding: "2px 10px", fontSize: 11, fontWeight: 600
                  }}>
                    {ROLLEN.find(r => r.value === m.rolle)?.label || m.rolle}
                  </span>
                  <span style={{ marginLeft: 8, fontSize: 12, color: "#94a3b8" }}>
                    🌴 {m.urlaubstage_jahr} Tage/Jahr
                  </span>
                </div>
              </div>
            </div>
          </Karte>
        );
      })}

      <Modal offen={modal} onClose={() => setModal(false)} titel="Neuer Mitarbeiter">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Eingabe label="Vorname *" value={form.vorname} onChange={v => setForm({...form, vorname:v})} required />
          <Eingabe label="Nachname *" value={form.nachname} onChange={v => setForm({...form, nachname:v})} required />
        </div>
        <Eingabe label="E-Mail *" type="email" value={form.email} onChange={v => setForm({...form, email:v})} required />
        <Eingabe label="Telefon" value={form.telefon} onChange={v => setForm({...form, telefon:v})} />
        <Eingabe label="Passwort *" type="password" value={form.passwort} onChange={v => setForm({...form, passwort:v})} required />
        <Auswahl label="Rolle" value={form.rolle} onChange={v => setForm({...form, rolle:v})} optionen={ROLLEN} />
        <Eingabe label="Urlaubstage/Jahr" type="number" value={String(form.urlaubstage_jahr)} onChange={v => setForm({...form, urlaubstage_jahr:v})} />
        <GrosserButton farbe="#1a3d6e" onClick={erstellen} disabled={senden} icon="👷">
          {senden ? "⏳ ..." : "Mitarbeiter anlegen"}
        </GrosserButton>
      </Modal>
    </div>
  );
}
