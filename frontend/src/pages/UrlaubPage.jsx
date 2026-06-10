import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Karte, GrosserButton, KleinerButton, Eingabe, Auswahl, Textarea, Seitenheader, StatusBadge, Lader, Modal } from "../components/ui/UI";

export default function UrlaubPage() {
  const { t, apiFetch, showToast, user } = useApp();
  const [antraege, setAntraege] = useState([]);
  const [teamAntraege, setTeamAntraege] = useState([]);
  const [resturlaub, setResturlaub] = useState(null);
  const [laden, setLaden] = useState(true);
  const [modal, setModal] = useState(false);
  const [tab, setTab] = useState("meine"); // "meine" | "team"

  // Formular
  const [typ, setTyp] = useState("urlaub");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [notiz, setNotiz] = useState("");
  const [senden, setSenden] = useState(false);

  const istVorgesetzter = ["admin", "vorgesetzter"].includes(user.rolle);

  useEffect(() => { ladeAlles(); }, []);

  async function ladeAlles() {
    setLaden(true);
    try {
      const [aRes, rRes] = await Promise.all([
        apiFetch("/api/urlaub/meine"),
        apiFetch("/api/urlaub/resturlaub"),
      ]);
      if (aRes?.ok) setAntraege(await aRes.json());
      if (rRes?.ok) setResturlaub(await rRes.json());

      if (istVorgesetzter) {
        const tRes = await apiFetch("/api/urlaub/team?status=beantragt");
        if (tRes?.ok) setTeamAntraege(await tRes.json());
      }
    } finally { setLaden(false); }
  }

  async function antragStellen() {
    if (!von || !bis) { showToast("Bitte Datum wählen", "err"); return; }
    setSenden(true);
    const res = await apiFetch("/api/urlaub/antrag", {
      method: "POST",
      body: JSON.stringify({ typ, von_datum: von, bis_datum: bis, notiz: notiz || null }),
    });
    setSenden(false);
    if (res?.ok) {
      const d = await res.json();
      showToast(`${t("msg_antrag_ok")} — ${d.arbeitstage} ${t("lbl_arbeitstage")}`, "ok");
      setModal(false); setVon(""); setBis(""); setNotiz(""); setTyp("urlaub");
      ladeAlles();
    } else {
      const err = await res?.json();
      showToast(err?.detail || t("msg_fehler"), "err");
    }
  }

  async function entscheiden(id, aktion, grund = "") {
    const pfad = aktion === "genehmigen"
      ? `/api/urlaub/${id}/genehmigen`
      : `/api/urlaub/${id}/ablehnen?grund=${encodeURIComponent(grund)}`;
    const res = await apiFetch(pfad, { method: "PUT" });
    if (res?.ok) { showToast(aktion === "genehmigen" ? "✓ Genehmigt" : "✗ Abgelehnt", "ok"); ladeAlles(); }
    else showToast(t("msg_fehler"), "err");
  }

  if (laden) return <Lader />;

  return (
    <div style={{ padding: "0 16px 16px" }}>
      <Seitenheader titel={t("nav_urlaub")} />

      {/* ── Urlaubskonto ── */}
      {resturlaub && (
        <Karte style={{ marginBottom: 16, background: "linear-gradient(135deg, #1a3d6e, #2563eb)", color: "white" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800 }}>{resturlaub.anspruch}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Anspruch</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800 }}>{resturlaub.verbraucht}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Genutzt</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#86efac" }}>{resturlaub.rest}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{t("label_resturlaub")}</div>
            </div>
          </div>
        </Karte>
      )}

      {/* ── Antrag stellen ── */}
      <GrosserButton farbe="#1a3d6e" onClick={() => setModal(true)} icon="🌴" style={{ marginBottom: 16 }}>
        {t("btn_urlaub_beantragen")}
      </GrosserButton>

      {/* ── Tabs (wenn Vorgesetzter) ── */}
      {istVorgesetzter && (
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 12, padding: 4, marginBottom: 16 }}>
          {["meine", "team"].map(tb => (
            <button key={tb} onClick={() => setTab(tb)} style={{
              flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer",
              background: tab === tb ? "white" : "transparent",
              color: tab === tb ? "#1a3d6e" : "#64748b",
              fontWeight: tab === tb ? 700 : 500, fontSize: 14,
              boxShadow: tab === tb ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}>
              {tb === "meine" ? "Meine Anträge" : `Team ${teamAntraege.length > 0 ? `(${teamAntraege.length})` : ""}`}
            </button>
          ))}
        </div>
      )}

      {/* ── Meine Anträge ── */}
      {tab === "meine" && (
        <>
          {antraege.length === 0 ? (
            <Karte style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
              <div style={{ fontSize: 40 }}>🌴</div>
              <div style={{ marginTop: 8 }}>Noch keine Anträge</div>
            </Karte>
          ) : antraege.map(a => (
            <Karte key={a.id} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b", marginBottom: 4 }}>
                    {a.typ === "urlaub" ? "🌴" : a.typ === "krank" ? "🤒" : "📅"}{" "}
                    {new Date(a.von_datum).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                    {" – "}
                    {new Date(a.bis_datum).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>
                    {a.arbeitstage} {t("lbl_arbeitstage")}
                  </div>
                  {a.ablehnungsgrund && (
                    <div style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>✗ {a.ablehnungsgrund}</div>
                  )}
                </div>
                <StatusBadge status={a.status} />
              </div>
            </Karte>
          ))}
        </>
      )}

      {/* ── Team-Anträge (Vorgesetzter) ── */}
      {tab === "team" && (
        <>
          {teamAntraege.length === 0 ? (
            <Karte style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
              <div style={{ fontSize: 32 }}>✅</div>
              <div style={{ marginTop: 8 }}>Keine offenen Anträge</div>
            </Karte>
          ) : teamAntraege.map(a => (
            <Karte key={a.id} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", marginBottom: 4 }}>
                👷 {a.mitarbeiter_name}
              </div>
              <div style={{ fontSize: 14, color: "#475569", marginBottom: 4 }}>
                {new Date(a.von_datum).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                {" – "}
                {new Date(a.bis_datum).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                <span style={{ color: "#94a3b8" }}> · {a.arbeitstage} Tage</span>
              </div>
              {a.notiz && <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>💬 {a.notiz}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <KleinerButton farbe="#16a34a" onClick={() => entscheiden(a.id, "genehmigen")} style={{ flex: 1 }}>
                  ✓ {t("btn_genehmigen")}
                </KleinerButton>
                <KleinerButton
                  farbe="#dc2626"
                  onClick={() => {
                    const g = prompt("Ablehnungsgrund (optional):");
                    entscheiden(a.id, "ablehnen", g || "");
                  }}
                  style={{ flex: 1 }}
                >
                  ✗ {t("btn_ablehnen")}
                </KleinerButton>
              </div>
            </Karte>
          ))}
        </>
      )}

      {/* ── Modal: Antrag stellen ── */}
      <Modal offen={modal} onClose={() => setModal(false)} titel={t("btn_urlaub_beantragen")}>
        <Auswahl
          label="Art"
          value={typ}
          onChange={setTyp}
          optionen={[
            { value: "urlaub",      label: "🌴 Urlaub" },
            { value: "krank",       label: "🤒 Krank" },
            { value: "sonderurlaub", label: "📅 Sonderurlaub" },
          ]}
        />
        <Eingabe label={t("label_von")} type="date" value={von} onChange={setVon} required />
        <Eingabe label={t("label_bis")} type="date" value={bis} onChange={setBis} required />
        <Textarea label="Notiz (optional)" value={notiz} onChange={setNotiz} rows={2} placeholder="Grund oder Hinweis..." />
        <GrosserButton farbe="#1a3d6e" onClick={antragStellen} disabled={senden} icon="🌴">
          {senden ? "⏳ ..." : t("btn_urlaub_beantragen")}
        </GrosserButton>
      </Modal>
    </div>
  );
}
