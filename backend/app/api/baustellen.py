from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import User, Baustelle, BaustelleMitarbeiter, Zeiteintrag, BaustelleStatus, Rolle

router = APIRouter()


class BaustelleCreate(BaseModel):
    name: str
    kunde_name: str
    kunde_adresse: Optional[str] = None
    kunde_telefon: Optional[str] = None
    kunde_email: Optional[str] = None
    baustelle_adresse: Optional[str] = None
    auftragsnummer: Optional[str] = None
    beschreibung: Optional[str] = None
    bauleiter_id: Optional[int] = None

class BaustelleOut(BaseModel):
    id: int
    name: str
    status: str
    kunde_name: str
    baustelle_adresse: Optional[str]
    auftragsnummer: Optional[str]
    bauleiter_name: Optional[str] = None
    class Config:
        from_attributes = True


@router.post("/", response_model=BaustelleOut)
def erstellen(
    req: BaustelleCreate,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter)),
    db: Session = Depends(get_db)
):
    bs = Baustelle(**req.dict(), erstellt_von_id=current_user.id)
    db.add(bs)
    db.commit()
    db.refresh(bs)
    return BaustelleOut(
        id=bs.id, name=bs.name, status=bs.status,
        kunde_name=bs.kunde_name, baustelle_adresse=bs.baustelle_adresse,
        auftragsnummer=bs.auftragsnummer,
        bauleiter_name=bs.bauleiter.vollname if bs.bauleiter else None
    )


@router.get("/", response_model=List[BaustelleOut])
def liste(
    status: Optional[str] = "aktiv",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Baustelle)
    if status:
        query = query.filter(Baustelle.status == status)

    # Mitarbeiter sehen nur ihre zugewiesenen Baustellen
    if current_user.rolle == Rolle.mitarbeiter:
        baustellen_ids = [b.baustelle_id for b in current_user.baustellen_rel]
        query = query.filter(Baustelle.id.in_(baustellen_ids))

    baustellen = query.order_by(Baustelle.name).all()
    return [
        BaustelleOut(
            id=b.id, name=b.name, status=b.status, kunde_name=b.kunde_name,
            baustelle_adresse=b.baustelle_adresse, auftragsnummer=b.auftragsnummer,
            bauleiter_name=b.bauleiter.vollname if b.bauleiter else None
        ) for b in baustellen
    ]


@router.get("/{bs_id}")
def detail(bs_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bs = db.query(Baustelle).filter(Baustelle.id == bs_id).first()
    if not bs:
        raise HTTPException(status_code=404, detail="Baustelle nicht gefunden")

    # Mitarbeiter: nur Kundendaten zeigen wenn zugewiesen (DSGVO: Minimalprinzip)
    ist_zugewiesen = any(m.user_id == current_user.id for m in bs.mitarbeiter_rel)
    if current_user.rolle == Rolle.mitarbeiter and not ist_zugewiesen:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")

    return {
        "id": bs.id, "name": bs.name, "status": bs.status,
        "kunde_name": bs.kunde_name,
        "kunde_adresse": bs.kunde_adresse if current_user.rolle != Rolle.mitarbeiter else None,
        "baustelle_adresse": bs.baustelle_adresse,
        "auftragsnummer": bs.auftragsnummer,
        "beschreibung": bs.beschreibung,
        "bauleiter": bs.bauleiter.vollname if bs.bauleiter else None,
        "mitarbeiter": [{"id": m.user.id, "name": m.user.vollname} for m in bs.mitarbeiter_rel],
    }


@router.post("/{bs_id}/mitarbeiter/{user_id}")
def mitarbeiter_zuweisen(
    bs_id: int, user_id: int,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter, Rolle.bauleiter)),
    db: Session = Depends(get_db)
):
    bs = db.query(Baustelle).filter(Baustelle.id == bs_id).first()
    if not bs:
        raise HTTPException(status_code=404, detail="Baustelle nicht gefunden")
    bereits = db.query(BaustelleMitarbeiter).filter_by(baustelle_id=bs_id, user_id=user_id).first()
    if bereits:
        raise HTTPException(status_code=400, detail="Mitarbeiter bereits zugewiesen")
    db.add(BaustelleMitarbeiter(baustelle_id=bs_id, user_id=user_id))
    db.commit()
    return {"message": "Mitarbeiter zugewiesen"}


@router.get("/{bs_id}/auswertung")
def auswertung(
    bs_id: int,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter, Rolle.bauleiter)),
    db: Session = Depends(get_db)
):
    """Stunden-Auswertung je Baustelle"""
    eintraege = db.query(Zeiteintrag).filter(Zeiteintrag.baustelle_id == bs_id).all()
    gesamt = sum(e.arbeitsstunden or 0 for e in eintraege)
    pro_ma = {}
    for e in eintraege:
        name = e.user.vollname
        pro_ma[name] = round(pro_ma.get(name, 0) + (e.arbeitsstunden or 0), 2)
    return {"baustelle_id": bs_id, "gesamt_stunden": round(gesamt, 2), "pro_mitarbeiter": pro_ma}
