import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Karte, GrosserButton, KleinerButton, Eingabe, Auswahl, Seitenheader, Lader, Modal } from "../components/ui/UI";
import { kiUebersetzen, regiezettelUebersetzen } from "../i18n/translations";

export default function RegiezettelPage() {
  const { t, apiFetch, showToast, sprache } = useApp();
  const [baustellen, setBaustellen] = useState([]);
  const [gewaehlt, setGewaehlt] = useState("");
  const [liste, setListe] = useState([]);
  const [laden, setLaden] = useState(false);
  const [erstellModal, setErstellModal] = useState(false);
  const [uebersetzungLaeuft, setUebersetzungLaeuft] = useState(false);

  const [form, setForm] = useState({ datum_von: "", datum_bis: "", notizen: "" });

  useEffect(() => { ladeBaustellen(); }, []);
  useEffect(() => { if (gewaehlt) ladeListe(); }, [gewaehlt]);

  async function ladeBaustellen() {
    const res = await apiFetch("/api/baustellen/");
    if (res?.ok) {
      const data = await res.json();
      setBaustellen(data);
      if (data.length > 0) setGewaehlt(String(data[0].id));
    }
  }

  async function ladeListe() {
    setLaden(true);
    const res = await apiFetch(`/api/regiezettel/baustelle/${gewaehlt}`);
    if (res?.ok) setListe(await res.json());
    setLaden(false);
  }

  async function erstellen() {
    if (!form.datum_von || !form.datum_bis) { showToast("Bitte Zeitraum wählen", "err"); return; }
    const res = await apiFetch("/api/regiezettel/erstellen", {
      method: "POST",
      body: JSON.stringify({ baustelle_id: Number(gewaehlt), ...form, notizen: form.notizen || null }),
    });
    if (res?.ok) {
      const d = await res.json();
      showToast(t("msg_gespeichert"), "ok");
      setErstellModal(false);
      setForm({ datum_von:"", datum_bis:"", notizen:"" });
      ladeListe();
    } else {
      const err = await res?.json();
      showToast(err?.detail || t("msg_fehler"), "err");
    }
  }

  async function pdfHerunterladen(id, uebersetzen = false) {
    setUebersetzungLaeuft(uebersetzen);
    try {
      // Wenn Übersetzung gewünscht: erst Snapshot holen, übersetzen, dann neuen Regiezettel erstellen
      // Hier: direkter PDF-Download (Übersetzung im Backend via API-Parameter möglich)
      const url = uebersetzen
        ? `/api/regiezettel/${id}/pdf?sprache=${sprache}`
        : `/api/regiezettel/${id}/pdf`;

      const res = await apiFetch(url);
      if (!res?.ok) { showToast(t("msg_fehler"), "err"); return; }

      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Regiezettel_Elektro_Pepel_${id}.pdf`;
      link.click();
      showToast("PDF heruntergeladen", "ok");
    } finally {
      setUebersetzungLaeuft(false);
    }
  }

  return (
    <div style={{ padding: "0 16px 16px" }}>
      <Seitenheader titel={t("nav_regiezettel")} untertitel="Elektro Pepel" />

      {/* Baustelle wählen */}
      <Auswahl
        label={t("label_baustelle")}
        value={gewaehlt}
        onChange={setGewaehlt}
        optionen={baustellen.map(b => ({ value: b.id, label: b.name }))}
      />

      <GrosserButton farbe="#1a3d6e" onClick={() => setErstellModal(true)} icon="📋" style={{ marginBottom: 16 }}>
        {t("btn_regiezettel_erstellen")}
      </GrosserButton>

      {/* ── KI-Übersetzungs-Hinweis ── */}
      <Karte style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 16, padding: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 22 }}>🤖</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#15803d" }}>KI-Übersetzung aktiv</div>
            <div style={{ fontSize: 13, color: "#166534", marginTop: 3 }}>
              Tätigkeiten & Materialien auf Rumänisch werden automatisch ins Deutsche übersetzt.
              Beim PDF-Download kannst du die Sprache wählen.
            </div>
          </div>
        </div>
      </Karte>

      {/* ── Liste ── */}
      {laden ? <Lader /> : (
        <>
          {liste.length === 0 ? (
            <Karte style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
              <div style={{ fontSize: 40 }}>📋</div>
              <div style={{ marginTop: 8 }}>Noch keine Regiezettel für diese Baustelle</div>
            </Karte>
          ) : liste.map(r => (
            <Karte key={r.id} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", marginBottom: 6 }}>
                📋 {r.titel}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>
                📅 {new Date(r.datum_von).toLocaleDateString("de-DE")} – {new Date(r.datum_bis).toLocaleDateString("de-DE")}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
                Erstellt von {r.erstellt_von} · {new Date(r.erstellt_am).toLocaleDateString("de-DE")}
              </div>

              {/* Unterschriften-Status */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <span style={{
                  background: r.unterschrift_bauleiter ? "#dcfce7" : "#f1f5f9",
                  color: r.unterschrift_bauleiter ? "#16a34a" : "#94a3b8",
                  borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 600
                }}>
                  {r.unterschrift_bauleiter ? "✓" : "○"} Bauleiter
                </span>
                <span style={{
                  background: r.unterschrift_kunde ? "#dcfce7" : "#f1f5f9",
                  color: r.unterschrift_kunde ? "#16a34a" : "#94a3b8",
                  borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 600
                }}>
                  {r.unterschrift_kunde ? "✓" : "○"} Kunde
                </span>
              </div>

              {/* PDF Download Buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <KleinerButton
                  farbe="#1a3d6e"
                  onClick={() => pdfHerunterladen(r.id, false)}
                  style={{ flex: 1 }}
                >
                  🇩🇪 PDF (DE)
                </KleinerButton>
                <KleinerButton
                  farbe="#dc2626"
                  onClick={() => pdfHerunterladen(r.id, true)}
                  style={{ flex: 1 }}
                  outlined
                >
                  {uebersetzungLaeuft ? "⏳ ..." : "🇷🇴 PDF (RO)"}
                </KleinerButton>
              </div>
            </Karte>
          ))}
        </>
      )}

      {/* ── Erstellen Modal ── */}
      <Modal offen={erstellModal} onClose={() => setErstellModal(false)} titel={t("btn_regiezettel_erstellen")}>
        <div style={{ background: "#eff6ff", borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13, color: "#1e40af" }}>
          ℹ️ Alle Zeiteinträge im gewählten Zeitraum werden automatisch zusammengefasst.
          Tätigkeiten auf Rumänisch werden beim deutschen PDF automatisch übersetzt.
        </div>
        <Eingabe label={`${t("label_von")} *`} type="date" value={form.datum_von} onChange={v => setForm({...form, datum_von:v})} required />
        <Eingabe label={`${t("label_bis")} *`} type="date" value={form.datum_bis} onChange={v => setForm({...form, datum_bis:v})} required />
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
            Notizen (optional)
          </label>
          <textarea
            value={form.notizen} onChange={e => setForm({...form, notizen: e.target.value})}
            placeholder="Besonderheiten, Hinweise für den Kunden..."
            rows={3}
            style={{ width: "100%", padding: "14px 16px", fontSize: 15, borderRadius: 12, border: "2px solid #e2e8f0", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>
        <GrosserButton farbe="#1a3d6e" onClick={erstellen} icon="📋">
          {t("btn_regiezettel_erstellen")}
        </GrosserButton>
      </Modal>
    </div>
  );
}
