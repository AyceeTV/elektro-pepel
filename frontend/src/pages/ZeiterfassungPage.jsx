import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Karte, GrosserButton, KleinerButton, Auswahl, Textarea, Seitenheader, Lader, Modal } from "../components/ui/UI";

export default function ZeiterfassungPage() {
  const { t, apiFetch, showToast, user } = useApp();
  const [status, setStatus] = useState(null);       // { eingestempelt, beginn, eintrag_id }
  const [uhr, setUhr] = useState(new Date());
  const [baustellen, setBaustellen] = useState([]);
  const [eintraege, setEintraege] = useState([]);
  const [laden, setLaden] = useState(true);

  // Ausstempeln-Modal
  const [ausModal, setAusModal] = useState(false);
  const [pause, setPause] = useState("0");
  const [taetigkeit, setTaetigkeit] = useState("");
  const [materialModal, setMaterialModal] = useState(false);
  const [materialien, setMaterialien] = useState([]);
  const [matBez, setMatBez] = useState("");
  const [matMenge, setMatMenge] = useState("");
  const [gewaehlteBaustelle, setGewaehlteBaustelle] = useState("");
  const [einstempelTaetigkeit, setEinstempelTaetigkeit] = useState("");
  const [einstempelModal, setEinstempelModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setUhr(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { ladeAlles(); }, []);

  async function ladeAlles() {
    setLaden(true);
    try {
      const [sRes, bRes, zRes] = await Promise.all([
        apiFetch("/api/zeiterfassung/status"),
        apiFetch("/api/baustellen/"),
        apiFetch("/api/zeiterfassung/meine"),
      ]);
      if (sRes?.ok) setStatus(await sRes.json());
      if (bRes?.ok) setBaustellen(await bRes.json());
      if (zRes?.ok) setEintraege(await zRes.json());
    } finally {
      setLaden(false);
    }
  }

  async function einstempeln() {
    const res = await apiFetch("/api/zeiterfassung/einstempeln", {
      method: "POST",
      body: JSON.stringify({ baustelle_id: gewaehlteBaustelle ? Number(gewaehlteBaustelle) : null, taetigkeit: einstempelTaetigkeit || null }),
    });
    if (res?.ok) {
      showToast(t("msg_einstempeln_ok"), "ok");
      setEinstempelModal(false);
      setEinstempelTaetigkeit("");
      ladeAlles();
    } else showToast(t("msg_fehler"), "err");
  }

  async function ausstempeln() {
    const res = await apiFetch("/api/zeiterfassung/ausstempeln", {
      method: "POST",
      body: JSON.stringify({ pause_minuten: Number(pause), taetigkeit: taetigkeit || null, materialien }),
    });
    if (res?.ok) {
      const d = await res.json();
      showToast(`${t("msg_ausstempeln_ok")} ${d.arbeitsstunden}h`, "ok");
      setAusModal(false);
      setPause("0"); setTaetigkeit(""); setMaterialien([]);
      ladeAlles();
    } else showToast(t("msg_fehler"), "err");
  }

  function addMaterial() {
    if (!matBez) return;
    setMaterialien([...materialien, { bezeichnung: matBez, menge: matMenge }]);
    setMatBez(""); setMatMenge("");
  }

  // Laufzeit berechnen
  const laufzeitSek = status?.eingestempelt
    ? Math.floor((uhr - new Date(status.beginn)) / 1000)
    : 0;
  const laufzeitStr = `${String(Math.floor(laufzeitSek / 3600)).padStart(2,"0")}:${String(Math.floor((laufzeitSek % 3600) / 60)).padStart(2,"0")}:${String(laufzeitSek % 60).padStart(2,"0")}`;

  const stundenHeute = eintraege
    .filter(e => e.datum === uhr.toISOString().slice(0,10))
    .reduce((s, e) => s + (e.arbeitsstunden || 0), 0);
  const stundenMonat = eintraege.reduce((s, e) => s + (e.arbeitsstunden || 0), 0);

  if (laden) return <Lader />;

  return (
    <div style={{ padding: "0 16px 16px" }}>
      <Seitenheader titel={t("nav_zeiterfassung")} untertitel={uhr.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })} />

      {/* ── Große Uhr ── */}
      <Karte style={{ textAlign: "center", margin: "12px 0", background: "#1a3d6e", color: "white" }}>
        <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: 2, fontVariantNumeric: "tabular-nums" }}>
          {uhr.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>
          {uhr.toLocaleTimeString("de-DE", { second: "2-digit" }).slice(-2)}s
        </div>

        {status?.eingestempelt ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "8px 16px", display: "inline-block" }}>
              <span style={{ fontSize: 13, opacity: 0.8 }}>{t("status_eingestempelt")} </span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{laufzeitStr}</span>
            </div>
            {status.baustelle_id && (
              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>
                🏗 {baustellen.find(b => b.id === status.baustelle_id)?.name || "—"}
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 12, fontSize: 14, opacity: 0.6 }}>
            {t("status_nicht_eingestempelt")}
          </div>
        )}
      </Karte>

      {/* ── Haupt-Button ── */}
      {status?.eingestempelt ? (
        <GrosserButton
          farbe="#dc2626"
          onClick={() => setAusModal(true)}
          icon="⏹"
          style={{ marginBottom: 12 }}
        >
          {t("btn_ausstempeln")}
        </GrosserButton>
      ) : (
        <GrosserButton
          farbe="#16a34a"
          onClick={() => setEinstempelModal(true)}
          icon="▶"
          style={{ marginBottom: 12 }}
        >
          {t("btn_einstempeln")}
        </GrosserButton>
      )}

      {/* ── Statistik ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <Karte style={{ textAlign: "center", padding: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1a3d6e" }}>{stundenHeute.toFixed(1)}h</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{t("lbl_heute")}</div>
        </Karte>
        <Karte style={{ textAlign: "center", padding: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1a3d6e" }}>{stundenMonat.toFixed(1)}h</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{t("lbl_monat")}</div>
        </Karte>
      </div>

      {/* ── Letzte Einträge ── */}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a3d6e", margin: "0 0 10px" }}>
        Letzte Einträge
      </h3>
      {eintraege.slice(0, 7).map(e => (
        <Karte key={e.id} style={{ marginBottom: 8, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>
                {new Date(e.datum).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                {e.beginn ? new Date(e.beginn).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "—"}
                {" – "}
                {e.ende ? new Date(e.ende).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "läuft"}
              </div>
              {e.taetigkeit && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>📝 {e.taetigkeit}</div>}
              {e.baustelle_name && <div style={{ fontSize: 12, color: "#94a3b8" }}>🏗 {e.baustelle_name}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1a3d6e" }}>
                {e.arbeitsstunden?.toFixed(1) ?? "—"}h
              </div>
              {e.korrigiert && <div style={{ fontSize: 10, color: "#f59e0b" }}>✏ korrigiert</div>}
            </div>
          </div>
        </Karte>
      ))}

      {/* ── Einstempeln Modal ── */}
      <Modal offen={einstempelModal} onClose={() => setEinstempelModal(false)} titel={t("btn_einstempeln")}>
        <Auswahl
          label={t("label_baustelle")}
          value={gewaehlteBaustelle}
          onChange={setGewaehlteBaustelle}
          optionen={[
            { value: "", label: "— Keine Baustelle —" },
            ...baustellen.map(b => ({ value: b.id, label: b.name }))
          ]}
        />
        <Textarea
          label={t("label_taetigkeit")}
          value={einstempelTaetigkeit}
          onChange={setEinstempelTaetigkeit}
          placeholder={t("placeholder_taetigkeit")}
          rows={2}
        />
        <GrosserButton farbe="#16a34a" onClick={einstempeln} icon="▶">
          {t("btn_einstempeln")}
        </GrosserButton>
      </Modal>

      {/* ── Ausstempeln Modal ── */}
      <Modal offen={ausModal} onClose={() => setAusModal(false)} titel={t("btn_ausstempeln")}>
        <Auswahl
          label={`${t("label_pause")} (Minuten)`}
          value={pause}
          onChange={setPause}
          optionen={[
            { value: "0", label: "0 Min" },
            { value: "15", label: "15 Min" },
            { value: "30", label: "30 Min" },
            { value: "45", label: "45 Min" },
            { value: "60", label: "60 Min" },
          ]}
        />
        <Textarea
          label={t("label_taetigkeit")}
          value={taetigkeit}
          onChange={setTaetigkeit}
          placeholder={t("placeholder_taetigkeit")}
        />

        {/* Materialien */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
            {t("label_materialien")}
          </div>
          {materialien.map((m, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "#f8fafc", borderRadius: 8, padding: "8px 12px", marginBottom: 4
            }}>
              <span style={{ fontSize: 14 }}>📦 {m.bezeichnung} — {m.menge}</span>
              <button onClick={() => setMaterialien(materialien.filter((_,j) => j !== i))}
                style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <input value={matBez} onChange={e => setMatBez(e.target.value)}
              placeholder={t("placeholder_material")}
              style={{ flex: 2, padding: "10px 12px", borderRadius: 10, border: "2px solid #e2e8f0", fontSize: 14 }}
            />
            <input value={matMenge} onChange={e => setMatMenge(e.target.value)}
              placeholder={t("placeholder_menge")}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "2px solid #e2e8f0", fontSize: 14 }}
            />
            <button onClick={addMaterial} style={{
              padding: "10px 14px", background: "#1a3d6e", color: "white",
              borderRadius: 10, border: "none", cursor: "pointer", fontSize: 18
            }}>+</button>
          </div>
        </div>

        <GrosserButton farbe="#dc2626" onClick={ausstempeln} icon="⏹">
          {t("btn_ausstempeln")}
        </GrosserButton>
      </Modal>
    </div>
  );
}
