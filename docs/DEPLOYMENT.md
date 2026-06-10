# Deployment-Anleitung: Elektro Zeiterfassung

## Schritt 1 – Datenbank auf Hetzner (Deutschland)

1. Account anlegen: https://hetzner.com (Standort: Falkenstein oder Nürnberg = Deutschland)
2. Cloud Console → Databases → PostgreSQL erstellen
   - Typ: CPX11 (günstigste, reicht für 11-30 MA)
   - Region: Falkenstein (Deutschland)
   - Name: elektro-zeiterfassung
3. Connection-String kopieren → in .env als DATABASE_URL eintragen

## Schritt 2 – Backend deployen (Railway mit EU-Server)

```bash
# 1. GitHub Repository erstellen und Code hochladen
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/DEIN-NAME/elektro-app.git
git push -u origin main
```

Auf https://railway.app:
- New Project → Deploy from GitHub
- Region: EU West (Frankfurt)
- Environment Variables aus .env.example eintragen
- Deploy!

Railway gibt dir eine URL wie: `https://elektro-api.railway.app`

## Schritt 3 – Frontend deployen (Vercel)

```bash
cd frontend
# npm run build
```

Auf https://vercel.com:
- New Project → Import von GitHub
- VITE_API_URL = https://elektro-api.railway.app
- Deploy!

## Schritt 4 – Datenbank initialisieren

```bash
# Nach dem ersten Deploy:
curl -X POST https://elektro-api.railway.app/api/auth/setup
```

Oder manuell im Railway-Terminal:
```python
from app.core.database import engine, Base
Base.metadata.create_all(bind=engine)
```

## Schritt 5 – Admin-Account anlegen

```bash
# Ersten Admin-User direkt in der DB anlegen:
# (danach über die App weitere User erstellen)
python scripts/create_admin.py --email admin@firma.de --passwort SICHERES_PW
```

## DSGVO-Checkliste

- [x] Server in Deutschland (Hetzner Falkenstein/Nürnberg)
- [x] HTTPS erzwungen (automatisch bei Railway/Vercel)
- [x] Passwörter gehasht (bcrypt)
- [x] JWT-Token mit 8h Ablauf
- [x] Audit-Log für alle Änderungen
- [x] Soft-Delete mit Anonymisierung
- [x] Datenschutzerklärung einbinden (im Frontend unter /datenschutz)
- [ ] Auftragsverarbeitungsvertrag mit Hetzner abschließen (AVV)
      → https://www.hetzner.com/rechtliches/auftragsverarbeitung
- [ ] Datenschutzerklärung auf Website ergänzen

## Kosten (monatlich, Stand 2025)

| Dienst         | Kosten    | Notizen                        |
|----------------|-----------|--------------------------------|
| Hetzner DB     | ~10–20€   | CX11, Deutschland              |
| Railway        | ~5–10€    | Starter Plan, EU               |
| Vercel         | 0€        | Hobby Plan, Frontend           |
| **Gesamt**     | ~15–30€   | Vs. Emergent: deutlich günstiger |
