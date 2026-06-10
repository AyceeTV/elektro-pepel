import { useState, useEffect } from "react";
import { useApp } from "../App";
import { Seite, Karte, Lader, Btn } from "../components/ui/UI";

export default function BuchhaltungPage() {
  const { apiFetch, showToast } = useApp();
  const [auftraege, setAuftraege] = useState([]);
  const [laden, setLaden] = useState(true);
  const [pdfVorschau, setPdfVorschau] = useState(null); // {url, titel}
  const [filter, setFilter] = useState("alle"); // "alle"|"offen"|"abgeschlossen"

  useEffect(() => { ladeAlle(); }, []);

  async function ladeAlle() {
    setLaden(true);
    const res = await apiFetch("/api/auftraege/");
    if (res?.ok) setAuftraege(await res.json());
    setLaden(false);
  }

  async function pdfOeffnen(auftragId, rzId, titel) {
    const res = await apiFetch(`/api/auftraege/${auftragId}/regiezettel/${rzId}/pdf`);
    if (!res?.ok) { showToast("Fehler beim Laden des PDF","err"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    setPdfVorschau({ url, titel });
  }

  async function pdfHerunterladen(auftragId, rzId, nr) {
    const res = await apiFetch(`/api/auftraege/${auftragId}/regiezettel/${rzId}/pdf`);
    if (!res?.ok) { showToast("Fehler","err"); return; }
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Regiezettel_${nr}_${rzId}.pdf`;
    link.click();
  }

  // Alle Regiezettel aus allen Aufträgen sammeln
  const alleRz = auftraege.flatMap(a =>
    (a.regiezettel_count > 0 ? [] : []).concat(
      a.regiezettel ? a.regiezettel.map(r => ({ ...r, auftrag: a })) : []
    )
  );

  // Aufträge mit Regiezetteln filtern
  const gefilterteAuftraege = auftraege.filter(a => {
    if (filter === "offen") return a.status !== "abgeschlossen";
    if (filter === "abgeschlossen") return a.status === "abgeschlossen";
    return true;
  });

  const STATUS_FARBEN = {
    offen:          { bg:"#fef9c3", c:"#92400e",  label:"Offen" },
    in_bearbeitung: { bg:"#dbeafe", c:"#1e40af",  label:"In Bearbeitung" },
    abgeschlossen:  { bg:"#dcfce7", c:"#15803d",  label:"Abgeschlossen" },
    storniert:      { bg:"#f1f5f9", c:"#475569",  label:"Storniert" },
  };

  if (laden) return <Lader />;

  return (
    <div>
      {/* PDF Vorschau Modal */}
      {pdfVorschau && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.7)",
          zIndex:1000, display:"flex", flexDirection:"column"
        }}>
          <div style={{
            background:"#1a1a1a", padding:"12px 20px",
            display:"flex", justifyContent:"space-between", alignItems:"center"
          }}>
            <span style={{color:"white", fontWeight:700, fontSize:15}}>📄 {pdfVorschau.titel}</span>
            <div style={{display:"flex", gap:10}}>
              <a href={pdfVorschau.url} download style={{
                background:"#f59e0b", color:"#0f1923", border:"none",
                borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:700,
                cursor:"pointer", textDecoration:"none"
              }}>⬇ Herunterladen</a>
              <button onClick={() => { URL.revokeObjectURL(pdfVorschau.url); setPdfVorschau(null); }} style={{
                background:"#dc2626", color:"white", border:"none",
                borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer"
              }}>✕ Schließen</button>
            </div>
          </div>
          <iframe
            src={pdfVorschau.url}
            style={{flex:1, border:"none", width:"100%"}}
            title="PDF Vorschau"
          />
        </div>
      )}

      <Seite titel="📊 Buchhaltung" untertitel="Alle Regiezettel und Auftragsübersicht">

        {/* Statistiken */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:20}}>
          {[
            ["Aufträge gesamt", auftraege.length, "📋", "#0f1923"],
            ["Offen", auftraege.filter(a=>a.status==="offen").length, "🕐", "#f59e0b"],
            ["In Bearbeitung", auftraege.filter(a=>a.status==="in_bearbeitung").length, "⚙️", "#2563eb"],
            ["Abgeschlossen", auftraege.filter(a=>a.status==="abgeschlossen").length, "✓", "#16a34a"],
          ].map(([label, zahl, icon, farbe]) => (
            <div key={label} style={{background:"white", border:"1.5px solid #e8edf2", borderRadius:12, padding:"16px 18px"}}>
              <div style={{fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:6}}>{label}</div>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div style={{fontSize:26, fontWeight:800, color:farbe}}>{zahl}</div>
                <span style={{fontSize:24}}>{icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{display:"flex", gap:8, marginBottom:16, flexWrap:"wrap"}}>
          {[["alle","Alle Aufträge"],["offen","Offen / In Bearbeitung"],["abgeschlossen","Abgeschlossen"]].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding:"7px 16px", borderRadius:20, border:"1.5px solid", fontSize:13, fontWeight:600, cursor:"pointer",
              background:filter===k?"#0f1923":"white",
              color:filter===k?"white":"#64748b",
              borderColor:filter===k?"#0f1923":"#e8edf2",
            }}>{l}</button>
          ))}
        </div>

        {/* Aufträge Liste mit Regie Zetteln */}
        {gefilterteAuftraege.length === 0 ? (
          <div style={{background:"white", border:"1.5px solid #e8edf2", borderRadius:12, padding:40, textAlign:"center"}}>
            <div style={{fontSize:40, marginBottom:12}}>📊</div>
            <div style={{color:"#64748b"}}>Keine Aufträge gefunden</div>
          </div>
        ) : gefilterteAuftraege.map(a => {
          const stat = STATUS_FARBEN[a.status] || STATUS_FARBEN.offen;
          return (
            <div key={a.id} style={{background:"white", border:"1.5px solid #e8edf2", borderRadius:12, marginBottom:12, overflow:"hidden"}}>
              {/* Auftrag Header */}
              <div style={{
                padding:"14px 18px", borderBottom: a.regiezettel?.length > 0 ? "1px solid #f1f5f9" : "none",
                display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8
              }}>
                <div>
                  <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:4}}>
                    <span style={{fontSize:12, fontWeight:700, color:"#94a3b8"}}>{a.auftragsnummer}</span>
                    <span style={{background:stat.bg, color:stat.c, borderRadius:6, padding:"2px 10px", fontSize:11, fontWeight:700}}>{stat.label}</span>
                  </div>
                  <div style={{fontSize:15, fontWeight:800, color:"#0f1923"}}>{a.titel}</div>
                  <div style={{fontSize:13, color:"#64748b"}}>
                    👤 {a.kunde_name}
                    {a.termin_datum && <span style={{marginLeft:12}}>📅 {new Date(a.termin_datum).toLocaleDateString("de-DE")}</span>}
                    {a.mitarbeiter?.length > 0 && <span style={{marginLeft:12}}>👷 {a.mitarbeiter.join(", ")}</span>}
                  </div>
                </div>
                <div style={{fontSize:13, fontWeight:700, color:a.regiezettel_count>0?"#1e40af":"#94a3b8"}}>
                  {a.regiezettel_count > 0 ? `📋 ${a.regiezettel_count} Regiezettel` : "Noch kein Regiezettel"}
                </div>
              </div>

              {/* Regiezettel dieser Aufträge */}
              {a.regiezettel?.map(r => (
                <div key={r.id} style={{
                  padding:"12px 18px 12px 30px",
                  borderBottom:"1px solid #f8fafc",
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  background:"#fafafa", flexWrap:"wrap", gap:8
                }}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:4, flexWrap:"wrap"}}>
                      <span style={{fontSize:13, fontWeight:700}}>
                        {new Date(r.datum).toLocaleDateString("de-DE", {weekday:"short", day:"numeric", month:"short", year:"numeric"})}
                      </span>
                      <span style={{fontSize:13, fontWeight:700, color:"#0f1923"}}>{r.arbeitsstunden?.toFixed(2)}h</span>
                      {r.unterschrift_mitarbeiter && <span style={{fontSize:11, background:"#dcfce7", color:"#15803d", borderRadius:4, padding:"2px 8px", fontWeight:600}}>✓ MA</span>}
                      {r.unterschrift_kunde && <span style={{fontSize:11, background:"#dcfce7", color:"#15803d", borderRadius:4, padding:"2px 8px", fontWeight:600}}>✓ Kunde</span>}
                      {r.pdf_erstellt_am && <span style={{fontSize:11, background:"#dbeafe", color:"#1e40af", borderRadius:4, padding:"2px 8px", fontWeight:600}}>📄 PDF</span>}
                    </div>
                    {r.taetigkeit && <div style={{fontSize:12, color:"#64748b"}}>{r.taetigkeit.slice(0,80)}{r.taetigkeit.length>80?"...":""}</div>}
                  </div>
                  <div style={{display:"flex", gap:8}}>
                    <button onClick={() => pdfOeffnen(a.id, r.id, `${a.auftragsnummer} – ${a.titel}`)} style={{
                      padding:"7px 14px", background:"#0f1923", color:"white",
                      border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer"
                    }}>👁 Ansehen</button>
                    <button onClick={() => pdfHerunterladen(a.id, r.id, a.auftragsnummer)} style={{
                      padding:"7px 14px", background:"white", color:"#0f1923",
                      border:"1.5px solid #e8edf2", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer"
                    }}>⬇ PDF</button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </Seite>
    </div>
  );
}