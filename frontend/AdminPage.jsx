// ─── Sprachsystem mit Claude-KI-Übersetzung ───────────────────────────────
// Kernvokabular DE ↔ RO — alles was direkt in der UI steht

export const translations = {
  de: {
    // Navigation
    nav_zeiterfassung: "Zeiterfassung",
    nav_baustellen: "Baustellen",
    nav_urlaub: "Urlaub",
    nav_regiezettel: "Regiezettel",
    nav_team: "Team",
    nav_admin: "Verwaltung",
    nav_abmelden: "Abmelden",

    // Zeiterfassung
    btn_einstempeln: "Einstempeln",
    btn_ausstempeln: "Ausstempeln",
    label_baustelle: "Baustelle",
    label_taetigkeit: "Tätigkeit",
    label_pause: "Pause",
    label_stunden: "Stunden",
    label_beginn: "Beginn",
    label_ende: "Ende",
    label_datum: "Datum",
    label_materialien: "Materialien",
    label_notizen: "Notizen",
    placeholder_taetigkeit: "Was wurde gemacht? z.B. Kabel verlegen, Schaltschrank",
    placeholder_material: "Material, z.B. NYM-J 3x1.5mm²",
    placeholder_menge: "Menge, z.B. 10m",
    status_eingestempelt: "Eingestempelt seit",
    status_nicht_eingestempelt: "Noch nicht eingestempelt",
    msg_einstempeln_ok: "Erfolgreich eingestempelt!",
    msg_ausstempeln_ok: "Erfolgreich ausgestempelt!",
    lbl_arbeitsstunden: "Arbeitsstunden heute",
    lbl_woche: "Diese Woche",
    lbl_monat: "Diesen Monat",

    // Urlaub
    btn_urlaub_beantragen: "Urlaub beantragen",
    label_von: "Von",
    label_bis: "Bis",
    label_resturlaub: "Resturlaub",
    label_urlaubstage: "Urlaubstage",
    label_krank: "Krankmeldung",
    status_beantragt: "Beantragt",
    status_genehmigt: "Genehmigt",
    status_abgelehnt: "Abgelehnt",
    msg_antrag_ok: "Antrag wurde gestellt",
    lbl_arbeitstage: "Arbeitstage",

    // Baustellen
    btn_neue_baustelle: "Neue Baustelle",
    label_kundenname: "Kundenname",
    label_adresse: "Adresse",
    label_auftragsnr: "Auftrags-Nr.",
    label_bauleiter: "Bauleiter",
    label_status: "Status",
    status_aktiv: "Aktiv",
    status_abgeschlossen: "Abgeschlossen",

    // Regiezettel
    btn_regiezettel_erstellen: "Regiezettel erstellen",
    btn_pdf_download: "PDF herunterladen",
    label_zeitraum: "Zeitraum",
    label_unterschrift: "Unterschrift",

    // Allgemein
    btn_speichern: "Speichern",
    btn_abbrechen: "Abbrechen",
    btn_bearbeiten: "Bearbeiten",
    btn_loeschen: "Löschen",
    btn_genehmigen: "Genehmigen",
    btn_ablehnen: "Ablehnen",
    btn_hinzufuegen: "Hinzufügen",
    lbl_uhr: "Uhr",
    lbl_minuten: "Minuten",
    lbl_gesamt: "Gesamt",
    lbl_uebersicht: "Übersicht",
    lbl_heute: "Heute",
    msg_laden: "Wird geladen...",
    msg_fehler: "Fehler aufgetreten",
    msg_gespeichert: "Gespeichert",
    lbl_sprache: "Sprache",
    lbl_ki_uebersetzung: "KI-Übersetzung",

    // Login
    label_email: "E-Mail",
    label_passwort: "Passwort",
    btn_anmelden: "Anmelden",
    msg_willkommen: "Willkommen zurück",
    msg_login_fehler: "E-Mail oder Passwort falsch",
    lbl_firma: "Elektro Pepel",
  },

  ro: {
    nav_zeiterfassung: "Pontaj",
    nav_baustellen: "Șantiere",
    nav_urlaub: "Concediu",
    nav_regiezettel: "Bon de regie",
    nav_team: "Echipă",
    nav_admin: "Administrare",
    nav_abmelden: "Deconectare",

    btn_einstempeln: "Pontare intrare",
    btn_ausstempeln: "Pontare ieșire",
    label_baustelle: "Șantier",
    label_taetigkeit: "Activitate",
    label_pause: "Pauză",
    label_stunden: "Ore",
    label_beginn: "Început",
    label_ende: "Sfârșit",
    label_datum: "Data",
    label_materialien: "Materiale",
    label_notizen: "Notițe",
    placeholder_taetigkeit: "Ce s-a efectuat? ex. tras cabluri, tablou electric",
    placeholder_material: "Material, ex. cablu NYM-J 3x1.5mm²",
    placeholder_menge: "Cantitate, ex. 10m",
    status_eingestempelt: "Pontare intrare de la",
    status_nicht_eingestempelt: "Nu ești pontат",
    msg_einstempeln_ok: "Pontare intrare reușită!",
    msg_ausstempeln_ok: "Pontare ieșire reușită!",
    lbl_arbeitsstunden: "Ore lucrate azi",
    lbl_woche: "Săptămâna aceasta",
    lbl_monat: "Luna aceasta",

    btn_urlaub_beantragen: "Cerere concediu",
    label_von: "De la",
    label_bis: "Până la",
    label_resturlaub: "Zile rămase",
    label_urlaubstage: "Zile concediu",
    label_krank: "Concediu medical",
    status_beantragt: "Solicitată",
    status_genehmigt: "Aprobată",
    status_abgelehnt: "Respinsă",
    msg_antrag_ok: "Cererea a fost trimisă",
    lbl_arbeitstage: "Zile lucrătoare",

    btn_neue_baustelle: "Șantier nou",
    label_kundenname: "Nume client",
    label_adresse: "Adresă",
    label_auftragsnr: "Nr. comandă",
    label_bauleiter: "Șef șantier",
    label_status: "Status",
    status_aktiv: "Activ",
    status_abgeschlossen: "Finalizat",

    btn_regiezettel_erstellen: "Creare bon de regie",
    btn_pdf_download: "Descărcare PDF",
    label_zeitraum: "Perioadă",
    label_unterschrift: "Semnătură",

    btn_speichern: "Salvează",
    btn_abbrechen: "Anulează",
    btn_bearbeiten: "Editează",
    btn_loeschen: "Șterge",
    btn_genehmigen: "Aprobă",
    btn_ablehnen: "Respinge",
    btn_hinzufuegen: "Adaugă",
    lbl_uhr: "ora",
    lbl_minuten: "minute",
    lbl_gesamt: "Total",
    lbl_uebersicht: "Rezumat",
    lbl_heute: "Azi",
    msg_laden: "Se încarcă...",
    msg_fehler: "A apărut o eroare",
    msg_gespeichert: "Salvat",
    lbl_sprache: "Limbă",
    lbl_ki_uebersetzung: "Traducere AI",

    label_email: "E-mail",
    label_passwort: "Parolă",
    btn_anmelden: "Conectare",
    msg_willkommen: "Bun venit înapoi",
    msg_login_fehler: "E-mail sau parolă greșită",
    lbl_firma: "Elektro Pepel",
  }
};

// ─── KI-Übersetzung via Claude API ────────────────────────────────────────────
// Übersetzt freie Texte (Tätigkeiten, Materialien, Notizen) automatisch

export async function kiUebersetzen(text, vonSprache, nachSprache) {
  if (!text || text.trim() === "") return text;
  if (vonSprache === nachSprache) return text;

  const sprachNamen = { de: "Deutsch", ro: "Rumänisch" };

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Übersetze den folgenden Handwerker-Text aus dem ${sprachNamen[vonSprache]} ins ${sprachNamen[nachSprache]}.
Gib NUR die Übersetzung zurück, kein Kommentar, keine Erklärung.
Fachbegriffe aus dem Elektrohandwerk korrekt übersetzen.

Text: ${text}`
        }]
      })
    });
    const data = await response.json();
    return data.content?.[0]?.text?.trim() || text;
  } catch {
    return text; // Fallback: Originaltext
  }
}

// Ganzen Regiezettel-Snapshot übersetzen
export async function regiezettelUebersetzen(snapshot, nachSprache) {
  const uebersetzt = { ...snapshot };
  const vonSprache = nachSprache === "de" ? "ro" : "de";

  // Alle Tätigkeiten und Notizen übersetzen
  if (uebersetzt.eintraege) {
    uebersetzt.eintraege = await Promise.all(
      uebersetzt.eintraege.map(async (e) => ({
        ...e,
        taetigkeit: e.taetigkeit
          ? await kiUebersetzen(e.taetigkeit, vonSprache, nachSprache)
          : e.taetigkeit,
        materialien: e.materialien
          ? await Promise.all(e.materialien.map(async (m) => ({
              ...m,
              bezeichnung: await kiUebersetzen(m.bezeichnung, vonSprache, nachSprache)
            })))
          : e.materialien,
      }))
    );
  }
  return uebersetzt;
}
