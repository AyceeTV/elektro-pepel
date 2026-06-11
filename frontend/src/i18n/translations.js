// ─── Vollständiges Übersetzungssystem DE ↔ RO ────────────────────────────────

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

    // Login
    label_email: "E-Mail",
    label_passwort: "Passwort",
    btn_anmelden: "Anmelden",
    msg_willkommen: "Willkommen zurück",
    msg_login_fehler: "E-Mail oder Passwort falsch",
    lbl_firma: "Elektro Pepel",

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
    placeholder_taetigkeit: "Was wurde gemacht? z.B. Kabel verlegen",
    status_eingestempelt: "Eingestempelt seit",
    status_nicht_eingestempelt: "Noch nicht eingestempelt",
    msg_einstempeln_ok: "Erfolgreich eingestempelt!",
    msg_ausstempeln_ok: "Erfolgreich ausgestempelt!",
    lbl_arbeitsstunden: "Arbeitsstunden",
    lbl_woche: "Diese Woche",
    lbl_monat: "Diesen Monat",
    lbl_heute: "Heute",
    lbl_gesamt: "Gesamt",
    tag_antippen: "Tag antippen zum Eintragen",
    arbeitszeiten: "Arbeitszeiten",
    stunden_eingeben: "Stunden eingeben",
    baustellen_stunden: "Baustellen & Stunden",
    auto_berechnet: "Automatisch berechnet",
    pausen_auto: "Pausen (automatisch)",
    eintrag_speichern: "Eintrag speichern",
    gespeicherte_eintraege: "Gespeicherte Einträge",
    genehmigt: "Genehmigt",
    ausstehend: "Ausstehend",
    abgelehnt: "Abgelehnt",
    ueberstunden_konto: "Überstundenkonto",
    offene_freigaben: "Offene Freigaben",
    alle_ok: "Alle OK",
    tippen_freigeben: "Tippen zum Freigeben →",

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
    jahresanspruch: "Jahresanspruch",
    genommen: "Genommen",
    verbleibend: "Verbleibend",
    meine_antraege: "Meine Anträge",
    abwesenheit_melden: "Abwesenheit melden",
    art: "Art",
    urlaub_label: "Urlaub",
    krank_label: "Krankmeldung",
    sonderurlaub_label: "Sonderurlaub",
    antrag_stellen: "Antrag stellen",
    wartet_freischaltung: "Wartet auf Freischaltung durch Verwaltung",

    // Baustellen
    btn_neue_baustelle: "Neue Baustelle",
    label_kundenname: "Kundenname",
    label_adresse: "Adresse",
    label_auftragsnr: "Auftrags-Nr.",
    label_bauleiter: "Bauleiter",
    label_status: "Status",
    status_aktiv: "Aktiv",
    status_abgeschlossen: "Abgeschlossen",
    noch_keine_baustellen: "Noch keine Baustellen angelegt",
    baustellen_details: "Details",

    // Aufträge
    auftraege: "Aufträge",
    neuer_auftrag: "Neuer Auftrag",
    auftragsbezeichnung: "Auftragsbezeichnung",
    auftragstyp: "Auftragstyp",
    kundendaten: "Kundendaten",
    termin: "Termin",
    mitarbeiter_zuweisen: "Mitarbeiter zuweisen",
    auftrag_erstellen: "Auftrag erstellen",
    in_bearbeitung: "In Bearbeitung",
    offen: "Offen",
    abgeschlossen: "Abgeschlossen",
    storniert: "Storniert",
    regiezettel_erfassen: "Regiezettel erfassen",
    durchgefuehrte_arbeiten: "Durchgeführte Arbeiten",
    speichern_pdf: "Speichern & PDF erstellen",
    unterschriften: "Unterschriften",
    monteur: "Monteur",
    kunde: "Kunde",
    in_maps: "In Maps öffnen",
    regiezettel_count: "Regiezettel",

    // Regiezettel
    btn_regiezettel_erstellen: "Regiezettel erstellen",
    btn_pdf_download: "PDF herunterladen",
    label_zeitraum: "Zeitraum",
    nettostunden: "Nettostunden",
    materialien_positionen: "Materialien & Positionen",
    anfahrtspauschale: "Anfahrtspauschale",
    arbeitszeit_label: "Arbeitszeit",
    artikel_suchen: "Artikel suchen",
    gesamtsumme: "Gesamtsumme",

    // Team
    mitarbeiter_hinzufuegen: "Mitarbeiter hinzufügen",
    neuer_mitarbeiter: "Neuer Mitarbeiter",
    vorname: "Vorname",
    nachname: "Nachname",
    telefon: "Telefon",
    rolle: "Rolle",
    urlaubstage_jahr: "Urlaubstage/Jahr",
    mitarbeiter_anlegen: "Mitarbeiter anlegen",

    // Admin/Verwaltung
    verwaltung: "Verwaltung",
    dashboard: "Dashboard",
    protokoll: "Protokoll",
    aktive_mitarbeiter: "Aktive Mitarbeiter",
    baustellen_aktiv: "Aktive Baustellen",
    stunden_monat: "Stunden (Monat)",
    offene_antraege: "Offene Anträge",
    datenschutz_status: "Datenschutz-Status",

    // Buchhaltung
    buchhaltung: "Buchhaltung",
    alle_auftraege: "Alle Aufträge",
    ansehen: "Ansehen",
    pdf_download: "PDF",
    noch_kein_regiezettel: "Noch kein Regiezettel",

    // Katalog
    katalog_preise: "Katalog & Preise",
    produkte_material: "Produkte & Material",
    arbeitszeitpreise: "Arbeitszeitpreise",
    anfahrtspauschalen: "Anfahrtspauschalen",
    neues_produkt: "Neues Produkt",
    artikelnummer: "Artikelnummer",
    bezeichnung: "Bezeichnung",
    kategorie: "Kategorie",
    einheit: "Einheit",
    preis_netto: "Preis (Netto)",
    stundensatz: "Stundensatz",
    pro_stunde: "pro Stunde (Netto)",
    pauschale: "Pauschale (Netto)",
    neue_pauschale: "Neue Pauschale",
    neuer_stundensatz: "Neuer Stundensatz",

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
    msg_laden: "Wird geladen...",
    msg_fehler: "Fehler aufgetreten",
    msg_gespeichert: "Gespeichert",
    lbl_sprache: "Sprache",
    lbl_ki_uebersetzung: "KI-Übersetzung",
    zurueck: "Zurück",
    details: "Details",
    notiz: "Notiz",
    beschreibung: "Beschreibung",
    suchen: "Suchen...",
    alle: "Alle",
    keine_eintraege: "Keine Einträge",
    pflichtfelder: "Bitte alle Pflichtfelder ausfüllen",
  },

  ro: {
    // Navigare
    nav_zeiterfassung: "Pontaj",
    nav_baustellen: "Șantiere",
    nav_urlaub: "Concediu",
    nav_regiezettel: "Bon de regie",
    nav_team: "Echipă",
    nav_admin: "Administrare",
    nav_abmelden: "Deconectare",

    // Autentificare
    label_email: "E-mail",
    label_passwort: "Parolă",
    btn_anmelden: "Conectare",
    msg_willkommen: "Bun venit înapoi",
    msg_login_fehler: "E-mail sau parolă greșită",
    lbl_firma: "Elektro Pepel",

    // Pontaj
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
    placeholder_taetigkeit: "Ce s-a efectuat? ex. tras cabluri",
    status_eingestempelt: "Pontare intrare de la",
    status_nicht_eingestempelt: "Nu ești pontат",
    msg_einstempeln_ok: "Pontare intrare reușită!",
    msg_ausstempeln_ok: "Pontare ieșire reușită!",
    lbl_arbeitsstunden: "Ore lucrate",
    lbl_woche: "Săptămâna aceasta",
    lbl_monat: "Luna aceasta",
    lbl_heute: "Azi",
    lbl_gesamt: "Total",
    tag_antippen: "Apasă pe o zi pentru a înregistra",
    arbeitszeiten: "Ore de lucru",
    stunden_eingeben: "Introduceți orele",
    baustellen_stunden: "Șantiere & Ore",
    auto_berechnet: "Calculat automat",
    pausen_auto: "Pauze (automat)",
    eintrag_speichern: "Salvează înregistrarea",
    gespeicherte_eintraege: "Înregistrări salvate",
    genehmigt: "Aprobat",
    ausstehend: "În așteptare",
    abgelehnt: "Respins",
    ueberstunden_konto: "Cont ore suplimentare",
    offene_freigaben: "Aprobări în așteptare",
    alle_ok: "Totul aprobat",
    tippen_freigeben: "Apasă pentru aprobare →",

    // Concediu
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
    jahresanspruch: "Drept anual",
    genommen: "Utilizate",
    verbleibend: "Rămase",
    meine_antraege: "Cererile mele",
    abwesenheit_melden: "Raportează absența",
    art: "Tip",
    urlaub_label: "Concediu",
    krank_label: "Concediu medical",
    sonderurlaub_label: "Concediu special",
    antrag_stellen: "Trimite cererea",
    wartet_freischaltung: "Așteaptă aprobarea administrației",

    // Șantiere
    btn_neue_baustelle: "Șantier nou",
    label_kundenname: "Nume client",
    label_adresse: "Adresă",
    label_auftragsnr: "Nr. comandă",
    label_bauleiter: "Șef șantier",
    label_status: "Status",
    status_aktiv: "Activ",
    status_abgeschlossen: "Finalizat",
    noch_keine_baustellen: "Nu există șantiere",
    baustellen_details: "Detalii",

    // Comenzi
    auftraege: "Comenzi",
    neuer_auftrag: "Comandă nouă",
    auftragsbezeichnung: "Denumire comandă",
    auftragstyp: "Tip comandă",
    kundendaten: "Date client",
    termin: "Programare",
    mitarbeiter_zuweisen: "Atribuie angajați",
    auftrag_erstellen: "Creează comanda",
    in_bearbeitung: "În lucru",
    offen: "Deschis",
    abgeschlossen: "Finalizat",
    storniert: "Anulat",
    regiezettel_erfassen: "Completează bon de regie",
    durchgefuehrte_arbeiten: "Lucrări efectuate",
    speichern_pdf: "Salvează & creează PDF",
    unterschriften: "Semnături",
    monteur: "Monteur",
    kunde: "Client",
    in_maps: "Deschide în Maps",
    regiezettel_count: "Bon de regie",

    // Bon de regie
    btn_regiezettel_erstellen: "Creare bon de regie",
    btn_pdf_download: "Descărcare PDF",
    label_zeitraum: "Perioadă",
    nettostunden: "Ore nete",
    materialien_positionen: "Materiale & Poziții",
    anfahrtspauschale: "Taxă deplasare",
    arbeitszeit_label: "Timp de lucru",
    artikel_suchen: "Caută articol",
    gesamtsumme: "Total",

    // Echipă
    mitarbeiter_hinzufuegen: "Adaugă angajat",
    neuer_mitarbeiter: "Angajat nou",
    vorname: "Prenume",
    nachname: "Nume",
    telefon: "Telefon",
    rolle: "Rol",
    urlaubstage_jahr: "Zile concediu/an",
    mitarbeiter_anlegen: "Creează angajat",

    // Administrare
    verwaltung: "Administrare",
    dashboard: "Panou de control",
    protokoll: "Protocol",
    aktive_mitarbeiter: "Angajați activi",
    baustellen_aktiv: "Șantiere active",
    stunden_monat: "Ore (luna)",
    offene_antraege: "Cereri în așteptare",
    datenschutz_status: "Status protecție date",

    // Contabilitate
    buchhaltung: "Contabilitate",
    alle_auftraege: "Toate comenzile",
    ansehen: "Vizualizare",
    pdf_download: "PDF",
    noch_kein_regiezettel: "Niciun bon de regie",

    // Catalog
    katalog_preise: "Catalog & Prețuri",
    produkte_material: "Produse & Materiale",
    arbeitszeitpreise: "Tarife orare",
    anfahrtspauschalen: "Taxe deplasare",
    neues_produkt: "Produs nou",
    artikelnummer: "Nr. articol",
    bezeichnung: "Denumire",
    kategorie: "Categorie",
    einheit: "Unitate",
    preis_netto: "Preț (fără TVA)",
    stundensatz: "Tarif orar",
    pro_stunde: "pe oră (fără TVA)",
    pauschale: "Taxă forfetară (fără TVA)",
    neue_pauschale: "Taxă nouă",
    neuer_stundensatz: "Tarif orar nou",

    // General
    btn_speichern: "Salvează",
    btn_abbrechen: "Anulează",
    btn_bearbeiten: "Editează",
    btn_loeschen: "Șterge",
    btn_genehmigen: "Aprobă",
    btn_ablehnen: "Respinge",
    btn_hinzufuegen: "Adaugă",
    lbl_uhr: "ora",
    lbl_minuten: "minute",
    msg_laden: "Se încarcă...",
    msg_fehler: "A apărut o eroare",
    msg_gespeichert: "Salvat",
    lbl_sprache: "Limbă",
    lbl_ki_uebersetzung: "Traducere AI",
    zurueck: "Înapoi",
    details: "Detalii",
    notiz: "Notă",
    beschreibung: "Descriere",
    suchen: "Caută...",
    alle: "Toate",
    keine_eintraege: "Nicio înregistrare",
    pflichtfelder: "Completați toate câmpurile obligatorii",
  }
};

// ─── KI-Übersetzung via Claude API ────────────────────────────────────────────
export async function kiUebersetzen(text, vonSprache, nachSprache) {
  if (!text?.trim() || vonSprache === nachSprache) return text;
  const namen = { de: "Deutsch", ro: "Rumänisch" };
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `Übersetze diesen Elektrohandwerker-Text aus dem ${namen[vonSprache]} ins ${namen[nachSprache]}.
Gib NUR die Übersetzung zurück, kein Kommentar.
Fachbegriffe korrekt übersetzen.

Text: ${text}`
        }]
      })
    });
    const data = await response.json();
    return data.content?.[0]?.text?.trim() || text;
  } catch { return text; }
}

// Mehrere Texte auf einmal übersetzen (effizienter)
export async function kiMehrfachUebersetzen(texte, vonSprache, nachSprache) {
  if (vonSprache === nachSprache) return texte;
  const nichtLeer = texte.filter(t => t?.trim());
  if (nichtLeer.length === 0) return texte;
  const namen = { de: "Deutsch", ro: "Rumänisch" };
  try {
    const nummeriert = texte.map((t,i) => `${i+1}. ${t||""}`).join("\n");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Übersetze diese nummerierten Texte aus dem ${namen[vonSprache]} ins ${namen[nachSprache]}.
Antworte NUR mit den nummerierten Übersetzungen im gleichen Format.
Elektrohandwerker-Fachbegriffe korrekt übersetzen.

${nummeriert}`
        }]
      })
    });
    const data = await response.json();
    const result = data.content?.[0]?.text?.trim() || nummeriert;
    return result.split("\n").map(zeile => zeile.replace(/^\d+\.\s*/, ""));
  } catch { return texte; }
}

// Regiezettel-Snapshot übersetzen
export async function regiezettelUebersetzen(snapshot, nachSprache) {
  const vonSprache = nachSprache === "de" ? "ro" : "de";
  const uebersetzt = { ...snapshot };
  if (uebersetzt.eintraege) {
    uebersetzt.eintraege = await Promise.all(
      uebersetzt.eintraege.map(async (e) => ({
        ...e,
        taetigkeit: e.taetigkeit ? await kiUebersetzen(e.taetigkeit, vonSprache, nachSprache) : e.taetigkeit,
        materialien: e.materialien ? await Promise.all(
          e.materialien.map(async (m) => ({
            ...m,
            bezeichnung: await kiUebersetzen(m.bezeichnung, vonSprache, nachSprache)
          }))
        ) : e.materialien,
      }))
    );
  }
  return uebersetzt;
}