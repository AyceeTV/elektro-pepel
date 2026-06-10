from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, extract
from datetime import date, datetime, timezone
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import User, Zeiteintrag, Baustelle, AuditLog, Rolle

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class EinstempelnRequest(BaseModel):
    baustelle_id: Optional[int] = None
    taetigkeit: Optional[str] = None

class AusstempelnRequest(BaseModel):
    pause_minuten: int = 0
    taetigkeit: Optional[str] = None
    materialien: Optional[list] = None
    notizen: Optional[str] = None

class KorrekturRequest(BaseModel):
    beginn: Optional[datetime] = None
    ende: Optional[datetime] = None
    pause_minuten: Optional[int] = None
    taetigkeit: Optional[str] = None
    materialien: Optional[list] = None
    grund: str

class ZeiteintragOut(BaseModel):
    id: int
    datum: date
    beginn: datetime
    ende: Optional[datetime]
    pause_minuten: int
    arbeitsstunden: Optional[float]
    taetigkeit: Optional[str]
    materialien: Optional[list]
    notizen: Optional[str]
    korrigiert: bool
    baustelle_id: Optional[int]
    baustelle_name: Optional[str] = None
    mitarbeiter_name: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Helpers ──────────────────────────────────────────────────────────────────

def berechne_stunden(beginn: datetime, ende: datetime, pause_min: int) -> float:
    delta = (ende - beginn).total_seconds() / 3600
    return round(max(0, delta - pause_min / 60), 2)


# ─── Endpunkte ────────────────────────────────────────────────────────────────

@router.post("/einstempeln")
def einstempeln(
    req: EinstempelnRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Prüfen: Läuft bereits ein offener Eintrag?
    offen = db.query(Zeiteintrag).filter(
        Zeiteintrag.user_id == current_user.id,
        Zeiteintrag.ende == None
    ).first()
    if offen:
        raise HTTPException(status_code=400, detail="Du bist bereits eingestempelt")

    # Baustelle prüfen
    if req.baustelle_id:
        bs = db.query(Baustelle).filter(Baustelle.id == req.baustelle_id).first()
        if not bs:
            raise HTTPException(status_code=404, detail="Baustelle nicht gefunden")

    jetzt = datetime.now(timezone.utc)
    eintrag = Zeiteintrag(
        user_id=current_user.id,
        baustelle_id=req.baustelle_id,
        datum=jetzt.date(),
        beginn=jetzt,
        taetigkeit=req.taetigkeit,
    )
    db.add(eintrag)
    db.commit()
    db.refresh(eintrag)
    return {"message": "Eingestempelt", "beginn": eintrag.beginn, "id": eintrag.id}


@router.post("/ausstempeln")
def ausstempeln(
    req: AusstempelnRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    eintrag = db.query(Zeiteintrag).filter(
        Zeiteintrag.user_id == current_user.id,
        Zeiteintrag.ende == None
    ).first()
    if not eintrag:
        raise HTTPException(status_code=400, detail="Kein offener Eintrag gefunden")

    jetzt = datetime.now(timezone.utc)
    eintrag.ende = jetzt
    eintrag.pause_minuten = req.pause_minuten
    eintrag.arbeitsstunden = berechne_stunden(eintrag.beginn, jetzt, req.pause_minuten)
    if req.taetigkeit:
        eintrag.taetigkeit = req.taetigkeit
    if req.materialien:
        eintrag.materialien = req.materialien
    if req.notizen:
        eintrag.notizen = req.notizen

    db.commit()
    return {
        "message": "Ausgestempelt",
        "arbeitsstunden": eintrag.arbeitsstunden,
        "ende": eintrag.ende,
    }


@router.get("/status")
def aktueller_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Ist der Mitarbeiter gerade eingestempelt?"""
    offen = db.query(Zeiteintrag).filter(
        Zeiteintrag.user_id == current_user.id,
        Zeiteintrag.ende == None
    ).first()
    if offen:
        return {"eingestempelt": True, "beginn": offen.beginn, "eintrag_id": offen.id, "baustelle_id": offen.baustelle_id}
    return {"eingestempelt": False}


@router.get("/meine", response_model=List[ZeiteintragOut])
def meine_eintraege(
    monat: Optional[int] = None,
    jahr: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eigene Zeiteinträge, optional gefiltert nach Monat/Jahr"""
    jetzt = datetime.now()
    m = monat or jetzt.month
    j = jahr or jetzt.year

    eintraege = db.query(Zeiteintrag).filter(
        Zeiteintrag.user_id == current_user.id,
        extract("month", Zeiteintrag.datum) == m,
        extract("year", Zeiteintrag.datum) == j,
    ).order_by(Zeiteintrag.datum.desc()).all()

    result = []
    for e in eintraege:
        out = ZeiteintragOut(
            id=e.id, datum=e.datum, beginn=e.beginn, ende=e.ende,
            pause_minuten=e.pause_minuten, arbeitsstunden=e.arbeitsstunden,
            taetigkeit=e.taetigkeit, materialien=e.materialien, notizen=e.notizen,
            korrigiert=e.korrigiert, baustelle_id=e.baustelle_id,
            baustelle_name=e.baustelle.name if e.baustelle else None,
        )
        result.append(out)
    return result


@router.get("/team", response_model=List[ZeiteintragOut])
def team_eintraege(
    monat: Optional[int] = None,
    jahr: Optional[int] = None,
    baustelle_id: Optional[int] = None,
    user_id: Optional[int] = None,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter, Rolle.bauleiter)),
    db: Session = Depends(get_db)
):
    """Alle Zeiteinträge des Teams (nur für Bauleiter/Vorgesetzter/Admin)"""
    jetzt = datetime.now()
    m = monat or jetzt.month
    j = jahr or jetzt.year

    query = db.query(Zeiteintrag).filter(
        extract("month", Zeiteintrag.datum) == m,
        extract("year", Zeiteintrag.datum) == j,
    )
    if baustelle_id:
        query = query.filter(Zeiteintrag.baustelle_id == baustelle_id)
    if user_id:
        query = query.filter(Zeiteintrag.user_id == user_id)

    eintraege = query.order_by(Zeiteintrag.datum.desc()).all()
    result = []
    for e in eintraege:
        out = ZeiteintragOut(
            id=e.id, datum=e.datum, beginn=e.beginn, ende=e.ende,
            pause_minuten=e.pause_minuten, arbeitsstunden=e.arbeitsstunden,
            taetigkeit=e.taetigkeit, materialien=e.materialien, notizen=e.notizen,
            korrigiert=e.korrigiert, baustelle_id=e.baustelle_id,
            baustelle_name=e.baustelle.name if e.baustelle else None,
            mitarbeiter_name=e.user.vollname if e.user else None,
        )
        result.append(out)
    return result


@router.put("/{eintrag_id}/korrektur")
def korrektur(
    eintrag_id: int,
    req: KorrekturRequest,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter, Rolle.bauleiter)),
    db: Session = Depends(get_db)
):
    """Zeiteintrag nachträglich korrigieren (mit Protokoll)"""
    eintrag = db.query(Zeiteintrag).filter(Zeiteintrag.id == eintrag_id).first()
    if not eintrag:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")

    alt = {"beginn": str(eintrag.beginn), "ende": str(eintrag.ende), "pause": eintrag.pause_minuten}

    if req.beginn: eintrag.beginn = req.beginn
    if req.ende:   eintrag.ende = req.ende
    if req.pause_minuten is not None: eintrag.pause_minuten = req.pause_minuten
    if req.taetigkeit: eintrag.taetigkeit = req.taetigkeit
    if req.materialien is not None: eintrag.materialien = req.materialien

    if eintrag.beginn and eintrag.ende:
        eintrag.arbeitsstunden = berechne_stunden(eintrag.beginn, eintrag.ende, eintrag.pause_minuten)

    eintrag.korrigiert = True
    eintrag.korrigiert_von_id = current_user.id
    eintrag.korrigiert_am = datetime.now(timezone.utc)
    eintrag.korrektur_grund = req.grund

    # Audit-Log
    log = AuditLog(
        user_id=current_user.id, aktion="zeiteintrag_korrigiert",
        tabelle="zeiteintraege", datensatz_id=eintrag_id,
        details={"alt": alt, "grund": req.grund, "geaendert_von": current_user.vollname}
    )
    db.add(log)
    db.commit()
    return {"message": "Korrektur gespeichert", "arbeitsstunden": eintrag.arbeitsstunden}


@router.post("/manuell")
def manueller_eintrag(
    datum: str,
    arbeitsstunden: float,
    baustelle_id: int = None,
    taetigkeit: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manueller Zeiteintrag — Mitarbeiter trägt Stunden nachträglich ein"""
    from datetime import date as date_type
    from pydantic import BaseModel

    try:
        d = date_type.fromisoformat(datum)
    except:
        raise HTTPException(status_code=400, detail="Ungültiges Datum")

    if arbeitsstunden <= 0 or arbeitsstunden > 24:
        raise HTTPException(status_code=400, detail="Ungültige Stundenanzahl")

    from datetime import datetime, timezone, timedelta
    beginn = datetime(d.year, d.month, d.day, 7, 0, tzinfo=timezone.utc)
    ende   = beginn + timedelta(hours=arbeitsstunden)

    eintrag = Zeiteintrag(
        user_id=current_user.id,
        baustelle_id=baustelle_id,
        datum=d,
        beginn=beginn,
        ende=ende,
        pause_minuten=0,
        arbeitsstunden=round(arbeitsstunden, 2),
        taetigkeit=taetigkeit,
    )
    db.add(eintrag)
    db.commit()
    return {"message": "Eintrag gespeichert", "arbeitsstunden": arbeitsstunden}