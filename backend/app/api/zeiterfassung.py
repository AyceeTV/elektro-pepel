from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, extract
from datetime import date, datetime, timezone, timedelta
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import User, Zeiteintrag, Baustelle, AuditLog, Rolle

router = APIRouter()


class ManuellerEintrag(BaseModel):
    datum: str
    beginn_uhr: str        # "07:00"
    ende_uhr: str          # "16:00"
    pausen: Optional[list] = []   # [{"von":"09:00","bis":"09:30"}, ...]
    positionen: Optional[list] = []  # [{"baustelle_id":1,"stunden":4.0,"taetigkeit":"..."}]
    ueberstunden_extra: Optional[float] = 0.0
    freizeit_genommen: Optional[float] = 0.0
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
    ueberstunden: Optional[float]
    taetigkeit: Optional[str]
    materialien: Optional[list]
    notizen: Optional[str]
    korrigiert: bool
    baustelle_id: Optional[int]
    baustelle_name: Optional[str] = None
    mitarbeiter_name: Optional[str] = None
    pausen_data: Optional[list] = None
    positionen_data: Optional[list] = None
    freizeit_genommen: Optional[float] = None

    class Config:
        from_attributes = True


def parse_uhr(datum_str: str, uhr_str: str) -> datetime:
    """Kombiniert Datum + Uhrzeit zu datetime"""
    d = date.fromisoformat(datum_str)
    h, m = map(int, uhr_str.split(":"))
    return datetime(d.year, d.month, d.day, h, m, tzinfo=timezone.utc)


def berechne_nettozeit(beginn: datetime, ende: datetime, pausen: list) -> tuple:
    """Gibt (brutto_min, pause_min, netto_min) zurück"""
    brutto = (ende - beginn).total_seconds() / 60
    pause_min = 0
    for p in pausen:
        try:
            p_von = datetime.strptime(p["von"], "%H:%M").replace(
                year=beginn.year, month=beginn.month, day=beginn.day, tzinfo=timezone.utc)
            p_bis = datetime.strptime(p["bis"], "%H:%M").replace(
                year=beginn.year, month=beginn.month, day=beginn.day, tzinfo=timezone.utc)
            pause_min += max(0, (p_bis - p_von).total_seconds() / 60)
        except:
            pass
    netto = max(0, brutto - pause_min)
    return brutto, pause_min, netto


@router.post("/manuell")
def manueller_eintrag(
    req: ManuellerEintrag,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Tageseintrag mit Uhrzeiten, Pausen, mehreren Baustellen"""
    try:
        beginn = parse_uhr(req.datum, req.beginn_uhr)
        ende   = parse_uhr(req.datum, req.ende_uhr)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ungültige Zeitangabe: {e}")

    if ende <= beginn:
        raise HTTPException(status_code=400, detail="Ende muss nach Beginn liegen")

    brutto_min, pause_min, netto_min = berechne_nettozeit(beginn, ende, req.pausen or [])
    netto_std = round(netto_min / 60, 2)

    # Sollstunden (8h Standardarbeitstag)
    soll_std = 8.0
    ueberstunden = round(netto_std - soll_std + (req.ueberstunden_extra or 0) - (req.freizeit_genommen or 0), 2)

    # Bestimme Hauptbaustelle und Tätigkeit
    haupt_baustelle = None
    haupt_taetigkeit = None
    if req.positionen:
        haupt_baustelle = req.positionen[0].get("baustelle_id")
        haupt_taetigkeit = req.positionen[0].get("taetigkeit")

    eintrag = Zeiteintrag(
        user_id=current_user.id,
        baustelle_id=haupt_baustelle,
        datum=date.fromisoformat(req.datum),
        beginn=beginn,
        ende=ende,
        pause_minuten=int(pause_min),
        arbeitsstunden=netto_std,
        ueberstunden=ueberstunden,
        taetigkeit=haupt_taetigkeit,
        notizen=req.notizen,
        materialien={
            "pausen": req.pausen or [],
            "positionen": req.positionen or [],
            "ueberstunden_extra": req.ueberstunden_extra or 0,
            "freizeit_genommen": req.freizeit_genommen or 0,
        },
    )
    db.add(eintrag)
    db.commit()
    db.refresh(eintrag)

    return {
        "message": "Eintrag gespeichert",
        "id": eintrag.id,
        "netto_stunden": netto_std,
        "pause_minuten": int(pause_min),
        "ueberstunden": ueberstunden,
    }


@router.get("/status")
def aktueller_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
        mat = e.materialien or {}
        out = ZeiteintragOut(
            id=e.id, datum=e.datum, beginn=e.beginn, ende=e.ende,
            pause_minuten=e.pause_minuten or 0, arbeitsstunden=e.arbeitsstunden,
            ueberstunden=e.ueberstunden,
            taetigkeit=e.taetigkeit, materialien=None, notizen=e.notizen,
            korrigiert=e.korrigiert, baustelle_id=e.baustelle_id,
            baustelle_name=e.baustelle.name if e.baustelle else None,
            pausen_data=mat.get("pausen", []) if isinstance(mat, dict) else [],
            positionen_data=mat.get("positionen", []) if isinstance(mat, dict) else [],
            freizeit_genommen=mat.get("freizeit_genommen", 0) if isinstance(mat, dict) else 0,
        )
        result.append(out)
    return result


@router.get("/ueberstunden")
def ueberstunden_konto(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Überstundenkonto des Mitarbeiters"""
    eintraege = db.query(Zeiteintrag).filter(
        Zeiteintrag.user_id == current_user.id,
        Zeiteintrag.ende != None,
    ).all()
    gesamt = sum(e.ueberstunden or 0 for e in eintraege)
    return {
        "gesamt_ueberstunden": round(gesamt, 2),
        "positiv": gesamt > 0,
    }


@router.get("/team", response_model=List[ZeiteintragOut])
def team_eintraege(
    monat: Optional[int] = None,
    jahr: Optional[int] = None,
    baustelle_id: Optional[int] = None,
    user_id: Optional[int] = None,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter, Rolle.bauleiter)),
    db: Session = Depends(get_db)
):
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
            pause_minuten=e.pause_minuten or 0, arbeitsstunden=e.arbeitsstunden,
            ueberstunden=e.ueberstunden,
            taetigkeit=e.taetigkeit, materialien=None, notizen=e.notizen,
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
    eintrag = db.query(Zeiteintrag).filter(Zeiteintrag.id == eintrag_id).first()
    if not eintrag:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")

    alt = {"beginn": str(eintrag.beginn), "ende": str(eintrag.ende)}
    if req.beginn: eintrag.beginn = req.beginn
    if req.ende: eintrag.ende = req.ende
    if req.pause_minuten is not None: eintrag.pause_minuten = req.pause_minuten
    if req.taetigkeit: eintrag.taetigkeit = req.taetigkeit

    if eintrag.beginn and eintrag.ende:
        netto = (eintrag.ende - eintrag.beginn).total_seconds() / 3600 - (eintrag.pause_minuten or 0) / 60
        eintrag.arbeitsstunden = round(max(0, netto), 2)

    eintrag.korrigiert = True
    eintrag.korrigiert_von_id = current_user.id
    eintrag.korrigiert_am = datetime.now(timezone.utc)
    eintrag.korrektur_grund = req.grund

    log = AuditLog(
        user_id=current_user.id, aktion="zeiteintrag_korrigiert",
        tabelle="zeiteintraege", datensatz_id=eintrag_id,
        details={"alt": alt, "grund": req.grund}
    )
    db.add(log)
    db.commit()
    return {"message": "Korrektur gespeichert", "arbeitsstunden": eintrag.arbeitsstunden}


@router.delete("/{eintrag_id}")
def eintrag_loeschen(
    eintrag_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    eintrag = db.query(Zeiteintrag).filter(Zeiteintrag.id == eintrag_id).first()
    if not eintrag:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    if eintrag.user_id != current_user.id and current_user.rolle not in [Rolle.admin, Rolle.vorgesetzter]:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    db.delete(eintrag)
    db.commit()
    return {"message": "Gelöscht"}