import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Seite, Karte, Btn, Select, Modal, Lader, Badge } from "../components/ui/UI";

export default function ZeiterfassungPage() {
  const { apiFetch, showToast, user } = useApp();
  const [heute] = useState(new Date());
  const [monat, setMonat] = useState(new Date().getMonth());
  const [jahr, setJahr] = useState(new Date().getFullYear());
  const [gewaehlterTag, setGewaehlterTag] = useState(new Date().getDate());
  const [eintraege, setEintraege] = useState([]);
  const [baustellen, setBaustellen] = useState([]);
  const [laden, setLaden] = useState(true);
  const [speichern, setSpeichern] = useState(false);

  // Formular
  const [stunden, setStunden] = useState("");
  const [taetigkeit, setTaetigkeit] = useState("");
  const [baustelle, setBaustelle] = useState("");
  const [editId, setEditId] = useState(null);

  useEffect(() => { ladeAlles(); }, [monat, jahr]);

  async function ladeAlles() {
    setLaden(true);
    const [eRes, bRes] = await Promise.all([
      apiFetch(`/api/zeiterfassung/meine?monat=${monat + 1}&jahr=${jahr}`),
      apiFetch("/api/baustellen/"),
    ]);
    if (eRes?.ok) setEintraege(await eRes.json());
    if (bRes?.ok) setBaustellen(await bRes.json());
    setLaden(false);
  }

  async function eintragSpeichern() {
    if (!stunden || isNaN(Number(stunden))) { showToast("Bitte gültige Stundenzahl eingeben", "err"); return; }
    setSpeichern(true);

    const datum = `${jahr}-${String(monat + 1).padStart(2,"0")}-${String(gewaehlterTag).padStart(2,"0")}`;
    const beginDt = `${datum}T07:00:00`;
    const endDt   = `${datum}T${String(7 + Math.floor(Number(stunden))).padStart(2,"0")}:${String(Math.round((Number(stunden) % 1) * 60)).padStart(2,"0")}:00`;

    const res = await apiFetch("/api/zeiterfassung/einstempeln", {
      method: "POST",
      body: JSON.stringify({
        baustelle_id: baustelle ? Number(baustelle) : null,
        taetigkeit: taetigkeit || null,
        datum_manuell: datum,
      }),
    });

    // Da unser Backend Einstempeln/Ausstempeln nutzt, machen wir beides direkt
    if (res?.ok) {
      const d = await res.json();
      await apiFetch("/api/zeiterfassung/ausstempeln", {
        method: "POST",
        body: JSON.stringify({
          pause_minuten: 0,
          taetigkeit: taetigkeit || null,
          arbeitsstunden_manuell: Number(stunden),
        }),
      });
      showToast(`${stunden}h gespeichert`);
      setStunden(""); setTaetigkeit(""); setBaustelle("");
      ladeAlles();
    } else {
      // Fallback: direkt über einen neuen Endpunkt
      const res2 = await apiFetch("/api/zeiterfassung/manuell", {
        method: "POST",
        body: JSON.stringify({
          datum,
          arbeitsstunden: Number(stunden),
          baustelle_id: baustelle ? Number(baustelle) : null,
          taetigkeit: taetigkeit || null,
        }),
      });
      if (res2?.ok) {
        showToast(`${stunden}h gespeichert`);
        setStunden(""); setTaetigkeit(""); setBaustelle("");
        ladeAlles();
      } else {
        const err = await res2?.json();
        showToast(err?.detail || "Fehler", "err");
      }
    }
    setSpeichern(false);
  }

  // Kalender-Logik
  const ersterTagDesMonats = new Date(jahr, monat, 1).getDay(); // 0=So
  const wochentag = ersterTagDesMonats === 0 ? 6 : ersterTagDesMonats - 1; // Mo=0
  const tageImMonat = new Date(jahr, monat + 1, 0).getDate();

  const stundenProTag = {};
  eintraege.forEach(e => {
    const tag = new Date(e.datum).getDate();
    stundenProTag[tag] = (stundenProTag[tag] || 0) + (e.arbeitsstunden || 0);
  });

  const gesamtMonat = Object.values(stundenProTag).reduce((s, h) => s + h, 0);

  const tagEintraege = eintraege.filter(e => {
    const d = new Date(e.datum);
    return d.getDate() === gewaehlterTag && d.getMonth() === monat && d.getFullYear() === jahr;
  });

  const gewaehltesDatum = `${jahr}-${String(monat + 1).padStart(2,"0")}-${String(gewaehlterTag).padStart(2,"0")}`;

  function vorMonat() {
    if (monat === 0) { setMonat(11); setJahr(j => j - 1); } else setMonat(m => m - 1);
    setGewaehlterTag(1);
  }
  function nachMonat() {
    if (monat === 11) { setMonat(0); setJahr(j => j + 1); } else setMonat(m => m + 1);
    setGewaehlterTag(1);
  }

  const MONATE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
  const WOCHENTAGE = ["MO","DI","MI","DO","FR","SA","SO"];

  const istHeute = (tag) => tag === heute.getDate() && monat === heute.getMonth() && jahr === heute.getFullYear();
  const istGewählt = (tag) => tag === gewaehlterTag;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "inline-block", background: "#f59e0b", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6, width: "fit-content" }}>
          <span>📅</span> ZEITERFASSUNG
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0f1923", margin: "0 0 4px", letterSpacing: "-0.5px" }}>Arbeitszeiten</h1>
        <p style={{ color: "#64748b", fontSize: 15, margin: 0 }}>Tag im Kalender wählen, Stunden und Tätigkeit eintragen.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" }}>

        {/* ── Kalender ── */}
        <div style={{ background: "white", border: "2px solid #0f1923", borderRadius: 4 }}>
          {/* Kalender Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #e8edf2" }}>
            <button onClick={vorMonat} style={{ width: 36, height: 36, border: "2px solid #0f1923", borderRadius: 4, background: "white", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>‹</button>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{MONATE[monat]} {jahr}</h2>
            <button onClick={nachMonat} style={{ width: 36, height: 36, border: "2px solid #0f1923", borderRadius: 4, background: "white", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>›</button>
          </div>

          {/* Wochentage */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #e8edf2" }}>
            {WOCHENTAGE.map(w => (
              <div key={w} style={{ textAlign: "center", padding: "10px 0", fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em" }}>{w}</div>
            ))}
          </div>

          {/* Tage */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {/* Leere Felder vor dem 1. */}
            {Array.from({ length: wochentag }).map((_, i) => (
              <div key={`leer-${i}`} style={{ borderRight: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", minHeight: 64 }} />
            ))}
            {/* Tage */}
            {Array.from({ length: tageImMonat }).map((_, i) => {
              const tag = i + 1;
              const h = stundenProTag[tag];
              const heute_ = istHeute(tag);
              const gewaehlt = istGewählt(tag);
              return (
                <div key={tag} onClick={() => setGewaehlterTag(tag)} style={{
                  borderRight: "1px solid #e8edf2", borderBottom: "1px solid #e8edf2",
                  minHeight: 64, padding: "10px 8px", cursor: "pointer",
                  background: gewaehlt ? "#f59e0b" : heute_ ? "#0f1923" : "white",
                  transition: "background 0.1s",
                  position: "relative",
                }}
                  onMouseEnter={e => { if (!gewaehlt && !heute_) e.currentTarget.style.background = "#f8fafc"; }}
                  onMouseLeave={e => { if (!gewaehlt && !heute_) e.currentTarget.style.background = "white"; }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, color: gewaehlt ? "#0f1923" : heute_ ? "white" : "#0f1923" }}>{tag}</div>
                  {h > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: gewaehlt ? "#0f1923" : "#f59e0b", marginTop: 4 }}>{h.toFixed(1)}h</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px", borderTop: "2px solid #0f1923" }}>
            <span style={{ fontSize: 14, color: "#64748b" }}>Summe {MONATE[monat]}:</span>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{gesamtMonat.toFixed(1)} h</span>
          </div>
        </div>

        {/* ── Rechte Spalte ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Eingabe-Box */}
          <div style={{ background: "white", border: "2px solid #0f1923", borderRadius: 4, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em" }}>AUSGEWÄHLTER TAG</div>
              {tagEintraege.length > 0 && (
                <div style={{ background: "#f59e0b", borderRadius: 4, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
                  {tagEintraege.reduce((s,e) => s + (e.arbeitsstunden||0), 0).toFixed(1)} H
                </div>
              )}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: "#0f1923" }}>{gewaehltesDatum}</div>

            {/* Baustelle */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", marginBottom: 8 }}>BAUSTELLE</div>
              <select value={baustelle} onChange={e => setBaustelle(e.target.value)} style={{
                width: "100%", padding: "10px 12px", fontSize: 14, border: "2px solid #0f1923",
                borderRadius: 4, background: "white", outline: "none", cursor: "pointer"
              }}>
                <option value="">— wählen —</option>
                {baustellen.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {/* Stunden */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", marginBottom: 8 }}>STUNDEN</div>
              <input
                type="number" step="0.5" min="0.5" max="24"
                value={stunden} onChange={e => setStunden(e.target.value)}
                placeholder="z.B. 8"
                style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: "2px solid #0f1923", borderRadius: 4, boxSizing: "border-box", outline: "none" }}
              />
            </div>

            {/* Tätigkeit */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", marginBottom: 8 }}>WAS WURDE GEMACHT?</div>
              <textarea
                value={taetigkeit} onChange={e => setTaetigkeit(e.target.value)}
                placeholder="z.B. Verkabelung EG, Schalterdosen gesetzt"
                rows={3}
                style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: "2px solid #0f1923", borderRadius: 4, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", outline: "none" }}
              />
            </div>

            <button onClick={eintragSpeichern} disabled={speichern} style={{
              width: "100%", padding: "14px", background: speichern ? "#94a3b8" : "#f59e0b",
              border: "2px solid #0f1923", borderRadius: 4, fontSize: 16, fontWeight: 800,
              cursor: speichern ? "not-allowed" : "pointer", letterSpacing: "0.02em"
            }}>
              + Eintrag speichern
            </button>
          </div>

          {/* Einträge des gewählten Tages */}
          <div style={{ background: "white", border: "2px solid #0f1923", borderRadius: 4, padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800 }}>Einträge am {gewaehltesDatum}</h3>
            {tagEintraege.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>Noch keine Einträge.</p>
            ) : tagEintraege.map(e => (
              <div key={e.id} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{e.arbeitsstunden?.toFixed(1)} h</div>
                    {e.baustelle_name && <div style={{ fontSize: 13, color: "#64748b" }}>🏗 {e.baustelle_name}</div>}
                    {e.taetigkeit && <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>{e.taetigkeit}</div>}
                  </div>
                  {e.korrigiert && <span style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", borderRadius: 4, padding: "2px 8px", fontWeight: 600 }}>Korrigiert</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}