# ⚡ Elektro Pepel – Zeiterfassung

Vollständige Zeiterfassungs-App mit automatischer Regiezettel-PDF-Erstellung, Urlaubsverwaltung und KI-Übersetzung (Deutsch ↔ Rumänisch).

---

## 🚀 Schnellstart (lokal)

### Backend

```bash
cd backend

# Virtuelle Umgebung
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Pakete installieren
pip install -r requirements.txt

# Konfiguration
cp .env.example .env
# → .env öffnen und DATABASE_URL + SECRET_KEY anpassen

# Datenbank starten (PostgreSQL lokal oder SQLite für Tests)
# Für schnellen Test mit SQLite: DATABASE_URL=sqlite:///./elektro.db in .env

# Server starten
uvicorn app.main:app --reload
# → http://localhost:8000/api/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 👤 Rollen & Berechtigungen

| Rolle | Kann |
|---|---|
| **Admin** | Alles: User anlegen, löschen, alle Daten sehen |
| **Vorgesetzter** | Urlaub genehmigen, Team-Zeiten sehen, Regiezettel erstellen |
| **Bauleiter** | Zeiten seines Teams sehen, Regiezettel für seine Baustellen |
| **Mitarbeiter** | Nur eigene Zeiten + Urlaub |

---

## 🌍 KI-Übersetzung (Deutsch ↔ Rumänisch)

- Sprache oben rechts umschalten (🇩🇪 / 🇷🇴)
- Alle UI-Texte wechseln sofort
- Tätigkeiten & Materialien auf Rumänisch werden beim deutschen PDF automatisch via Claude API übersetzt
- Beim PDF-Download: „🇩🇪 PDF (DE)" oder „🇷🇴 PDF (RO)" wählen

---

## 📄 Regiezettel PDF

Enthält automatisch:
- **Elektro Pepel** Briefkopf
- Kundeninformationen & Baustelle
- Alle Zeiteinträge mit Mitarbeiter, Zeiten, Tätigkeit
- Materialauflistung
- Gesamtstunden
- Unterschriftsfelder (Bauleiter + Kunde)
- DSGVO-Fußzeile mit Aufbewahrungshinweis

---

## 🛡 Datenschutz / DSGVO

- ✅ Server in **Deutschland** (Hetzner Falkenstein/Nürnberg)
- ✅ Passwörter mit **bcrypt** gehasht
- ✅ **JWT-Token** mit 8h Ablauf (eine Schicht)
- ✅ **Audit-Log**: jede Änderung wird protokolliert
- ✅ **Soft-Delete**: gelöschte User werden anonymisiert, nicht gelöscht (Aufbewahrungspflicht)
- ✅ Mitarbeiter sehen **nur eigene Daten**
- ✅ Kundendaten nur für berechtigte Rollen sichtbar
- ✅ HTTPS erzwungen im Deployment

**Wichtig für Produktivbetrieb:**
- AVV (Auftragsverarbeitungsvertrag) mit Hetzner abschließen
- Datenschutzerklärung auf der App-Domain einbinden
- SECRET_KEY in .env durch langen Zufallsstring ersetzen

---

## 💰 Hosting (Empfehlung, ~15–25€/Monat)

| Dienst | Was | Kosten |
|---|---|---|
| [Hetzner](https://hetzner.com) | PostgreSQL DB, Deutschland | ~10–15€ |
| [Railway](https://railway.app) | Backend (EU West) | ~5–10€ |
| [Vercel](https://vercel.com) | Frontend | kostenlos |

---

## 📁 Projektstruktur

```
elektro-app/
├── backend/
│   ├── app/
│   │   ├── api/          # Alle API-Endpunkte
│   │   ├── core/         # DB, Config, Security
│   │   ├── models/       # Datenbankmodelle
│   │   └── services/     # PDF-Generierung
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── pages/        # Alle Seiten
│       ├── components/   # UI-Bausteine
│       └── i18n/         # Übersetzungen + KI
└── docs/
    └── DEPLOYMENT.md
```
