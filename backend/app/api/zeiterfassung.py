from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import extract
from datetime import date, datetime, timezone, timedelta
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import User, Zeiteintrag, Baustelle, AuditLog, Rolle

router = APIRouter()

MAX_STUNDEN = 8.25
PAUSE_AB_STUNDEN = 6.0
PFLICHT_PAUSE_MIN = 30

class ManuellerEintrag(BaseModel):
    datum: str
    beginn_uhr: str
    ende_uhr: str
    pausen: Optional[list] = []
    positionen: Optional[list] = []
    ueberstunden_extra: Optional[float] = 0.0
    freizeit_genommen: Optional[float] = 0.0
    notizen: Optional[str] = None

class KorrekturRequest(BaseModel):
    beginn: Optional[datetime] = None
    ende: Optional[datetime] = None
    pause_minuten: Optional[int] = None
    taetigkeit: Optional[str] = None
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
    notizen: Optional[str]
    korrigiert: bool
    genehmigt: Optional[bool]
    genehmigt_von_name: Optional[str] = None
    baustelle_id: Optional[int]
    baustelle_name: Optional[str] = None
    mitarbeiter_name: Optional[str] = None
    pausen_data: Optional[list] = None
    positionen_data: Optional[list] = None
    freizeit_genommen: Optional[float] = None
    class Config:
        from_attributes = True


def parse_uhr(datum_str: str, uhr_str: str) -> datetime:
    d = date.fromisoformat(datum_str)
    h, m = map(int, uhr_str.split(":"))
    return datetime(d.year, d.month, d.day, h, m, tzinfo=timezone.utc)


def berechne_nettozeit(beginn: datetime, ende: datetime, pausen: list):
    brutto_min = (ende - beginn).total_seconds() / 60
    pause_min = 0
    for p in pausen:
        try:
            pv = datetime.strptime(p["von"], "%H:%M").replace(
                year=beginn.year, month=beginn.month, day=beginn.day, tzinfo=timezone.utc)
            pb = datetime.strptime(p["bis"], "%H:%M").replace(
                year=beginn.year, month=beginn.month, day=beginn.day, tzinfo=timezone.utc)
            pause_min += max(0, (pb - pv).total_seconds() / 60)
        except:
            pass
    netto_min = max(0, brutto_min - pause_min)
    return brutto_min, pause_min, netto_min


@router.post("/manuell")
def manueller_eintrag(
    req: ManuellerEintrag,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        beginn = parse_uhr(req.datum, req.beginn_uhr)
        ende   = parse_uhr(req.datum, req.ende_uhr)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ungültige Zeitangabe: {e}")

    if ende <= beginn:
        raise HTTPException(status_code=400, detail="Ende muss nach Beginn liegen")

    brutto_min, pause_min, netto_min = berechne_nettozeit(beginn, ende, req.pausen or [])
    netto_std = netto_min / 60

    # ── Regel 1: Pflichtpause ab 6h Arbeitszeit ──────────────────────────────
    if netto_std >= PAUSE_AB_STUNDEN and pause_min < PFLICHT_PAUSE_MIN:
        raise HTTPException(
            status_code=400,
            detail=f"Ab {PAUSE_AB_STUNDEN}h Arbeitszeit ist eine Pause von mindestens {PFLICHT_PAUSE_MIN} Minuten Pflicht."
        )

    # ── Regel 2: Maximum 8,25h Nettostunden (ohne Überstunden) ───────────────
    normale_stunden = min(netto_std, MAX_STUNDEN)
    if netto_std > MAX_STUNDEN and (req.ueberstunden_extra or 0) == 0:
        raise HTTPException(
            status_code=400,
            detail=f"Maximale Arbeitszeit: {MAX_STUNDEN}h. Mehrarbeit bitte als Überstunden eintragen."
        )

    ueberstunden = round(
        (netto_std - MAX_STUNDEN) +
        (req.ueberstunden_extra or 0) -
        (req.freizeit_genommen or 0),
        2
    )

    haupt_baustelle = None
    haupt_taetigkeit = None
    if req.positionen:
        haupt_baustelle = req.positionen[0].get("baustelle_id")
        haupt_taetigkeit = req.positionen[0].get("taetigkeit")

    # Genehmigung nötig wenn Baustelle angegeben
    braucht_genehmigung = haupt_baustelle is not None

    eintrag = Zeiteintrag(
        user_id=current_user.id,
        baustelle_id=haupt_baustelle,
        datum=date.fromisoformat(req.datum),
        beginn=beginn,
        ende=ende,
        pause_minuten=int(pause_min),
        arbeitsstunden=round(normale_stunden, 2),
        ueberstunden=ueberstunden,
        taetigkeit=haupt_taetigkeit,
        notizen=req.notizen,
        # Genehmigung: None=ausstehend, True=genehmigt, False=abgelehnt
        # Wir speichern im korrektur_grund Feld ob genehmigt (temporär bis Migration)
        korrektur_grund="ausstehend" if braucht_genehmigung else "keine_baustelle",
        materialien={
            "pausen": req.pausen or [],
            "positionen": req.positionen or [],
            "ueberstunden_extra": req.ueberstunden_extra or 0,
            "freizeit_genommen": req.freizeit_genommen or 0,
            "genehmigt": None if braucht_genehmigung else True,
        },
    )
    db.add(eintrag)
    db.commit()
    db.refresh(eintrag)

    return {
        "message": "Eintrag gespeichert" + (" — wartet auf Genehmigung durch Bauleiter" if braucht_genehmigung else ""),
        "id": eintrag.id,
        "netto_stunden": round(normale_stunden, 2),
        "pause_minuten": int(pause_min),
        "ueberstunden": ueberstunden,
        "wartet_auf_genehmigung": braucht_genehmigung,
    }


@router.get("/genehmigung/offen")
def offene_genehmigungen(
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter, Rolle.bauleiter)),
    db: Session = Depends(get_db)
):
    """Alle Zeiteinträge die auf Genehmigung warten — gefiltert nach Baustellen des Bauleiters"""
    query = db.query(Zeiteintrag).filter(
        Zeiteintrag.korrektur_grund == "ausstehend",
        Zeiteintrag.ende != None,
    )

    # Bauleiter sieht nur seine Baustellen
    if current_user.rolle == Rolle.bauleiter:
        meine_baustellen = db.query(Baustelle).filter(
            Baustelle.bauleiter_id == current_user.id
        ).all()
        ids = [b.id for b in meine_baustellen]
        query = query.filter(Zeiteintrag.baustelle_id.in_(ids))

    eintraege = query.order_by(Zeiteintrag.datum.desc()).all()
    result = []
    for e in eintraege:
        mat = e.materialien or {}
        result.append({
            "id": e.id,
            "datum": e.datum,
            "mitarbeiter": e.user.vollname if e.user else "—",
            "baustelle": e.baustelle.name if e.baustelle else "—",
            "beginn": e.beginn,
            "ende": e.ende,
            "pause_minuten": e.pause_minuten,
            "arbeitsstunden": e.arbeitsstunden,
            "taetigkeit": e.taetigkeit,
            "positionen": mat.get("positionen", []),
            "pausen": mat.get("pausen", []),
        })
    return result


@router.put("/{eintrag_id}/genehmigen")
def genehmigen(
    eintrag_id: int,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter, Rolle.bauleiter)),
    db: Session = Depends(get_db)
):
    eintrag = db.query(Zeiteintrag).filter(Zeiteintrag.id == eintrag_id).first()
    if not eintrag:
        raise HTTPException(status_code=404, detail="Nicht gefunden")

    # Bauleiter darf nur seine Baustellen genehmigen
    if current_user.rolle == Rolle.bauleiter and eintrag.baustelle_id:
        bs = db.query(Baustelle).filter(Baustelle.id == eintrag.baustelle_id).first()
        if bs and bs.bauleiter_id != current_user.id:
            raise HTTPException(status_code=403, detail="Nur der zuständige Bauleiter kann genehmigen")

    eintrag.korrektur_grund = "genehmigt"
    eintrag.korrigiert_von_id = current_user.id
    eintrag.korrigiert_am = datetime.now(timezone.utc)
    mat = dict(eintrag.materialien or {})
    mat["genehmigt"] = True
    mat["genehmigt_von"] = current_user.vollname
    eintrag.materialien = mat

    log = AuditLog(user_id=current_user.id, aktion="zeiteintrag_genehmigt",
                   tabelle="zeiteintraege", datensatz_id=eintrag_id)
    db.add(log)
    db.commit()
    return {"message": "Genehmigt"}


@router.put("/{eintrag_id}/ablehnen")
def ablehnen(
    eintrag_id: int,
    grund: str = "",
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter, Rolle.bauleiter)),
    db: Session = Depends(get_db)
):
    eintrag = db.query(Zeiteintrag).filter(Zeiteintrag.id == eintrag_id).first()
    if not eintrag:
        raise HTTPException(status_code=404, detail="Nicht gefunden")

    eintrag.korrektur_grund = f"abgelehnt: {grund}"
    eintrag.korrigiert_von_id = current_user.id
    eintrag.korrigiert_am = datetime.now(timezone.utc)
    mat = dict(eintrag.materialien or {})
    mat["genehmigt"] = False
    mat["ablehnungsgrund"] = grund
    eintrag.materialien = mat

    log = AuditLog(user_id=current_user.id, aktion="zeiteintrag_abgelehnt",
                   tabelle="zeiteintraege", datensatz_id=eintrag_id,
                   details={"grund": grund})
    db.add(log)
    db.commit()
    return {"message": "Abgelehnt"}


@router.get("/status")
def aktueller_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
        genehmigt_val = mat.get("genehmigt") if isinstance(mat, dict) else None
        if e.korrektur_grund == "keine_baustelle":
            genehmigt_val = True
        result.append(ZeiteintragOut(
            id=e.id, datum=e.datum, beginn=e.beginn, ende=e.ende,
            pause_minuten=e.pause_minuten or 0,
            arbeitsstunden=e.arbeitsstunden if genehmigt_val else None,
            ueberstunden=e.ueberstunden if genehmigt_val else None,
            taetigkeit=e.taetigkeit, notizen=e.notizen,
            korrigiert=e.korrigiert,
            genehmigt=genehmigt_val,
            genehmigt_von_name=mat.get("genehmigt_von") if isinstance(mat, dict) else None,
            baustelle_id=e.baustelle_id,
            baustelle_name=e.baustelle.name if e.baustelle else None,
            pausen_data=mat.get("pausen", []) if isinstance(mat, dict) else [],
            positionen_data=mat.get("positionen", []) if isinstance(mat, dict) else [],
            freizeit_genommen=mat.get("freizeit_genommen", 0) if isinstance(mat, dict) else 0,
        ))
    return result


@router.get("/ueberstunden")
def ueberstunden_konto(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    eintraege = db.query(Zeiteintrag).filter(
        Zeiteintrag.user_id == current_user.id,
        Zeiteintrag.ende != None,
        Zeiteintrag.korrektur_grund.in_(["genehmigt", "keine_baustelle"]),
    ).all()
    gesamt = sum(e.ueberstunden or 0 for e in eintraege)
    return {"gesamt_ueberstunden": round(gesamt, 2)}


@router.get("/team")
def team_eintraege(
    monat: Optional[int] = None,
    jahr: Optional[int] = None,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter, Rolle.bauleiter)),
    db: Session = Depends(get_db)
):
    jetzt = datetime.now()
    m = monat or jetzt.month
    j = jahr or jetzt.year
    eintraege = db.query(Zeiteintrag).filter(
        extract("month", Zeiteintrag.datum) == m,
        extract("year", Zeiteintrag.datum) == j,
    ).order_by(Zeiteintrag.datum.desc()).all()
    return [{"id":e.id,"datum":e.datum,"mitarbeiter":e.user.vollname if e.user else "—",
             "baustelle":e.baustelle.name if e.baustelle else "—",
             "arbeitsstunden":e.arbeitsstunden,"ueberstunden":e.ueberstunden,
             "genehmigt":(e.materialien or {}).get("genehmigt")} for e in eintraege]


@router.put("/{eintrag_id}/korrektur")
def korrektur(
    eintrag_id: int, req: KorrekturRequest,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter, Rolle.bauleiter)),
    db: Session = Depends(get_db)
):
    eintrag = db.query(Zeiteintrag).filter(Zeiteintrag.id == eintrag_id).first()
    if not eintrag:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    if req.beginn: eintrag.beginn = req.beginn
    if req.ende: eintrag.ende = req.ende
    if req.pause_minuten is not None: eintrag.pause_minuten = req.pause_minuten
    if req.taetigkeit: eintrag.taetigkeit = req.taetigkeit
    if eintrag.beginn and eintrag.ende:
        netto = (eintrag.ende - eintrag.beginn).total_seconds()/3600 - (eintrag.pause_minuten or 0)/60
        eintrag.arbeitsstunden = round(max(0, netto), 2)
    eintrag.korrigiert = True
    eintrag.korrigiert_von_id = current_user.id
    eintrag.korrigiert_am = datetime.now(timezone.utc)
    db.add(AuditLog(user_id=current_user.id, aktion="zeiteintrag_korrigiert",
                    tabelle="zeiteintraege", datensatz_id=eintrag_id, details={"grund": req.grund}))
    db.commit()
    return {"message": "Korrektur gespeichert"}


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