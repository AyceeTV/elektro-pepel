from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import extract, and_
from datetime import date, datetime, timezone
from typing import Optional, List
from pydantic import BaseModel
import holidays

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import User, Urlaubsantrag, UrlaubStatus, AbwesenheitTyp, AuditLog, Rolle

router = APIRouter()

DE_HOLIDAYS = holidays.Germany(prov="NW")  # Bundesland anpassen

def berechne_arbeitstage(von: date, bis: date) -> int:
    """Zählt Arbeitstage (Mo-Fr) ohne Feiertage"""
    from datetime import timedelta
    tage = 0
    aktuell = von
    while aktuell <= bis:
        if aktuell.weekday() < 5 and aktuell not in DE_HOLIDAYS:
            tage += 1
        aktuell += timedelta(days=1)
    return tage

def resturlaub(user: User, jahr: int, db: Session) -> int:
    genehmigte = db.query(Urlaubsantrag).filter(
        Urlaubsantrag.user_id == user.id,
        Urlaubsantrag.typ == AbwesenheitTyp.urlaub,
        Urlaubsantrag.status == UrlaubStatus.genehmigt,
        extract("year", Urlaubsantrag.von_datum) == jahr,
    ).all()
    verbraucht = sum(a.arbeitstage for a in genehmigte)
    return user.urlaubstage_jahr - verbraucht


class AntragCreate(BaseModel):
    typ: AbwesenheitTyp = AbwesenheitTyp.urlaub
    von_datum: date
    bis_datum: date
    notiz: Optional[str] = None

class AntragOut(BaseModel):
    id: int
    typ: str
    status: str
    von_datum: date
    bis_datum: date
    arbeitstage: int
    notiz: Optional[str]
    ablehnungsgrund: Optional[str]
    mitarbeiter_name: Optional[str] = None
    class Config:
        from_attributes = True


@router.post("/antrag")
def antrag_stellen(req: AntragCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.bis_datum < req.von_datum:
        raise HTTPException(status_code=400, detail="Enddatum vor Startdatum")

    tage = berechne_arbeitstage(req.von_datum, req.bis_datum)
    if tage == 0:
        raise HTTPException(status_code=400, detail="Kein Arbeitstag im gewählten Zeitraum")

    # Resturlaub prüfen
    if req.typ == AbwesenheitTyp.urlaub:
        rest = resturlaub(current_user, req.von_datum.year, db)
        if tage > rest:
            raise HTTPException(status_code=400, detail=f"Nicht genug Resturlaub ({rest} Tage verbleibend)")

    # Überschneidung prüfen
    konflikt = db.query(Urlaubsantrag).filter(
        Urlaubsantrag.user_id == current_user.id,
        Urlaubsantrag.status.in_([UrlaubStatus.beantragt, UrlaubStatus.genehmigt]),
        Urlaubsantrag.von_datum <= req.bis_datum,
        Urlaubsantrag.bis_datum >= req.von_datum,
    ).first()
    if konflikt:
        raise HTTPException(status_code=400, detail="Zeitraum überschneidet sich mit bestehendem Antrag")

    antrag = Urlaubsantrag(
        user_id=current_user.id, typ=req.typ,
        von_datum=req.von_datum, bis_datum=req.bis_datum,
        arbeitstage=tage, notiz=req.notiz,
    )
    db.add(antrag)
    db.commit()
    db.refresh(antrag)
    return {"message": "Antrag gestellt", "id": antrag.id, "arbeitstage": tage}


@router.get("/meine", response_model=List[AntragOut])
def meine_antraege(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Urlaubsantrag).filter(Urlaubsantrag.user_id == current_user.id).order_by(Urlaubsantrag.von_datum.desc()).all()


@router.get("/resturlaub")
def get_resturlaub(jahr: Optional[int] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    j = jahr or datetime.now().year
    return {
        "jahr": j,
        "anspruch": current_user.urlaubstage_jahr,
        "verbraucht": current_user.urlaubstage_jahr - resturlaub(current_user, j, db),
        "rest": resturlaub(current_user, j, db),
    }


@router.get("/team", response_model=List[AntragOut])
def team_antraege(
    status: Optional[str] = None,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter, Rolle.bauleiter)),
    db: Session = Depends(get_db)
):
    query = db.query(Urlaubsantrag)
    if status:
        query = query.filter(Urlaubsantrag.status == status)
    antraege = query.order_by(Urlaubsantrag.von_datum.desc()).all()
    result = []
    for a in antraege:
        out = AntragOut(
            id=a.id, typ=a.typ, status=a.status, von_datum=a.von_datum,
            bis_datum=a.bis_datum, arbeitstage=a.arbeitstage, notiz=a.notiz,
            ablehnungsgrund=a.ablehnungsgrund, mitarbeiter_name=a.user.vollname
        )
        result.append(out)
    return result


@router.put("/{antrag_id}/genehmigen")
def genehmigen(
    antrag_id: int,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter)),
    db: Session = Depends(get_db)
):
    antrag = db.query(Urlaubsantrag).filter(Urlaubsantrag.id == antrag_id).first()
    if not antrag:
        raise HTTPException(status_code=404, detail="Antrag nicht gefunden")
    if antrag.status != UrlaubStatus.beantragt:
        raise HTTPException(status_code=400, detail="Antrag wurde bereits bearbeitet")
    antrag.status = UrlaubStatus.genehmigt
    antrag.genehmigt_von_id = current_user.id
    antrag.genehmigt_am = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Urlaub genehmigt"}


@router.put("/{antrag_id}/ablehnen")
def ablehnen(
    antrag_id: int,
    grund: str,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter)),
    db: Session = Depends(get_db)
):
    antrag = db.query(Urlaubsantrag).filter(Urlaubsantrag.id == antrag_id).first()
    if not antrag:
        raise HTTPException(status_code=404, detail="Antrag nicht gefunden")
    antrag.status = UrlaubStatus.abgelehnt
    antrag.genehmigt_von_id = current_user.id
    antrag.genehmigt_am = datetime.now(timezone.utc)
    antrag.ablehnungsgrund = grund
    db.commit()
    return {"message": "Urlaub abgelehnt"}
