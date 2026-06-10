from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import date, datetime, timezone
from typing import Optional
from pydantic import BaseModel
import os, io

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import User, Regiezettel, Baustelle, Zeiteintrag, Rolle
from app.services.pdf_service import erstelle_regiezettel_pdf

router = APIRouter()


class RegiezettelCreate(BaseModel):
    baustelle_id: int
    datum_von: date
    datum_bis: date
    titel: Optional[str] = None
    notizen: Optional[str] = None


@router.post("/erstellen")
def erstellen(
    req: RegiezettelCreate,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter, Rolle.bauleiter)),
    db: Session = Depends(get_db)
):
    bs = db.query(Baustelle).filter(Baustelle.id == req.baustelle_id).first()
    if not bs:
        raise HTTPException(status_code=404, detail="Baustelle nicht gefunden")

    # Alle Zeiteinträge im Zeitraum laden
    eintraege = db.query(Zeiteintrag).filter(
        Zeiteintrag.baustelle_id == req.baustelle_id,
        Zeiteintrag.datum >= req.datum_von,
        Zeiteintrag.datum <= req.datum_bis,
        Zeiteintrag.ende != None,
    ).order_by(Zeiteintrag.datum, Zeiteintrag.beginn).all()

    if not eintraege:
        raise HTTPException(status_code=400, detail="Keine Zeiteinträge für diesen Zeitraum")

    # Snapshot für unveränderliche Dokumentation (DSGVO: Aufbewahrungspflicht)
    snapshot = {
        "baustelle": {
            "name": bs.name,
            "adresse": bs.baustelle_adresse,
            "kunde": bs.kunde_name,
            "kunde_adresse": bs.kunde_adresse,
            "auftragsnummer": bs.auftragsnummer,
        },
        "zeitraum": {"von": str(req.datum_von), "bis": str(req.datum_bis)},
        "eintraege": [
            {
                "datum": str(e.datum),
                "mitarbeiter": e.user.vollname,
                "beginn": e.beginn.strftime("%H:%M"),
                "ende": e.ende.strftime("%H:%M") if e.ende else "-",
                "pause_min": e.pause_minuten,
                "stunden": e.arbeitsstunden,
                "taetigkeit": e.taetigkeit,
                "materialien": e.materialien or [],
            }
            for e in eintraege
        ],
        "gesamt_stunden": round(sum(e.arbeitsstunden or 0 for e in eintraege), 2),
        "erstellt_von": current_user.vollname,
        "erstellt_am": datetime.now(timezone.utc).isoformat(),
    }

    rz = Regiezettel(
        baustelle_id=req.baustelle_id,
        erstellt_von_id=current_user.id,
        datum_von=req.datum_von,
        datum_bis=req.datum_bis,
        titel=req.titel or f"Regiezettel {bs.name} {req.datum_von} – {req.datum_bis}",
        daten_snapshot=snapshot,
        notizen=req.notizen,
    )
    db.add(rz)
    db.commit()
    db.refresh(rz)
    return {"message": "Regiezettel erstellt", "id": rz.id}


@router.get("/{rz_id}/pdf")
def pdf_download(
    rz_id: int,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter, Rolle.bauleiter)),
    db: Session = Depends(get_db)
):
    rz = db.query(Regiezettel).filter(Regiezettel.id == rz_id).first()
    if not rz:
        raise HTTPException(status_code=404, detail="Regiezettel nicht gefunden")

    pdf_bytes = erstelle_regiezettel_pdf(rz)

    from fastapi.responses import Response
    filename = f"Regiezettel_{rz_id}_{rz.datum_von}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/baustelle/{bs_id}")
def liste(
    bs_id: int,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter, Rolle.bauleiter)),
    db: Session = Depends(get_db)
):
    regiezettel = db.query(Regiezettel).filter(
        Regiezettel.baustelle_id == bs_id
    ).order_by(Regiezettel.erstellt_am.desc()).all()
    return [
        {
            "id": r.id, "titel": r.titel,
            "datum_von": r.datum_von, "datum_bis": r.datum_bis,
            "erstellt_am": r.erstellt_am,
            "erstellt_von": r.erstellt_von.vollname,
            "unterschrift_bauleiter": r.unterschrift_bauleiter,
            "unterschrift_kunde": r.unterschrift_kunde,
        }
        for r in regiezettel
    ]
